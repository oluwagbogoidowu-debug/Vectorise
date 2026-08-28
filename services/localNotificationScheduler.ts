import { toast } from 'sonner';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { pushNotificationService } from './pushNotificationService';

export interface SprintReminderConfig {
  sprintId: string;
  sprintTitle: string;
  enabled: boolean;
  dailyTime: string; // e.g., "09:00"
  taskReminders: Record<number, string>; // dayNumber -> "HH:MM" e.g., { 1: "10:00", 2: "14:30" }
}

export interface FiredLogRecord {
  firedAt: string; // ISO timestamp
  sprintId: string;
  day: number;
  scheduledTime: string;
  deliveryType: 'in_app_active' | 'local_fallback' | 'task_override';
}

export interface NotificationTelemetryEvent {
  id: string;
  type: 'fired_local' | 'missed_local_window' | 'server_vs_client_sync';
  sprintId: string;
  scheduledTime: string;
  diffMinutes: number;
  timestamp: string; // ISO string
  hasFcmToken: boolean;
  notes?: string;
}

const STORAGE_KEY = 'vtr_local_sprint_reminders_v1';
const FIRED_LOG_KEY = 'vtr_reminders_fired_log_v1';
const TELEMETRY_KEY = 'vtr_notification_telemetry_v1';

export const localNotificationScheduler = {
  /**
   * Get all reminder configurations from local storage
   */
  getAllConfigs(): Record<string, SprintReminderConfig> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('[NotificationScheduler] Failed to load reminders from localStorage:', e);
      return {};
    }
  },

  /**
   * Keep config for a specific active sprint
   */
  getConfig(sprintId: string): SprintReminderConfig | null {
    const all = this.getAllConfigs();
    return all[sprintId] || null;
  },

  /**
   * Save reminder configuration for a specific sprint.
   * Saves to localStorage for fast client UI and syncs to backend/Firestore
   * so the background server trigger system knows when to send pushes while the user is away.
   */
  saveConfig(config: SprintReminderConfig, userId?: string, enrollmentId?: string): void {
    try {
      const all = this.getAllConfigs();
      all[config.sprintId] = config;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

      if (userId) {
        pushNotificationService.saveSprintReminderConfig(userId, config.sprintId, enrollmentId, config);
      }
    } catch (e) {
      console.error('[NotificationScheduler] Failed to save config to localStorage:', e);
    }
  },

  /**
   * Delete reminder config for a sprint
   */
  deleteConfig(sprintId: string): void {
    try {
      const all = this.getAllConfigs();
      delete all[sprintId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('[NotificationScheduler] Failed to delete config from localStorage:', e);
    }
  },

  /**
   * Request system notification permissions
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.error('[NotificationScheduler] Permission request failed:', e);
      return false;
    }
  },

  /**
   * Check if notifications are allowed
   */
  hasNotificationPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  /**
   * Trigger native system notification if allowed
   */
  triggerNativeNotification(title: string, body: string, actionUrl?: string) {
    if (this.hasNotificationPermission()) {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'sprint-reminder',
          requireInteraction: true
        });

        notif.onclick = () => {
          window.focus();
          if (actionUrl) {
            window.location.href = actionUrl;
          }
          notif.close();
        };
      } catch (e) {
        console.error('[NotificationScheduler] Error sending native notification:', e);
      }
    }
  },

  /**
   * Retrieve notification telemetry logs (client vs server delivery comparison)
   */
  getTelemetryLogs(): NotificationTelemetryEvent[] {
    try {
      const stored = localStorage.getItem(TELEMETRY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[NotificationScheduler] Failed to load telemetry logs:', e);
      return [];
    }
  },

  /**
   * Report telemetry for local notification scheduler (fired or missed windows)
   */
  reportTelemetry(event: Omit<NotificationTelemetryEvent, 'id' | 'timestamp'>): void {
    try {
      const logs = this.getTelemetryLogs();
      const newEntry: NotificationTelemetryEvent = {
        ...event,
        id: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString()
      };
      // Keep latest 100 telemetry events
      const updated = [newEntry, ...logs].slice(0, 100);
      localStorage.setItem(TELEMETRY_KEY, JSON.stringify(updated));
      console.log(`[NotificationScheduler Telemetry] ${event.type}:`, event);
    } catch (e) {
      console.error('[NotificationScheduler] Failed to save telemetry log:', e);
    }
  },

  /**
   * Minimal hardened client scheduler for in-app active reminders & local overrides.
   * Uses a tolerant 0-2 minute matching window and stores epoch ms timestamp logs.
   * Server push (FCM) remains the primary delivery mechanism when the app is closed.
   *
   * @param activeSprints - List of active enrollments with their linked sprint metadata.
   * @param userId - Optional string of the current user's ID.
   * @param userHasFcmToken - Whether user has an active FCM token registered for server push.
   */
  checkAndTriggerDueReminders(
    activeSprints: Array<{ id: string; title: string; currentDayNum?: number }>,
    userId?: string,
    userHasFcmToken: boolean = false
  ) {
    const allConfigs = this.getAllConfigs();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTotalMins = currentHour * 60 + currentMin;
    const dateStr = now.toISOString().split('T')[0];
    const nowMs = Date.now();

    // 1. Load logs of fired reminders
    let firedLogs: Record<string, number | any> = {};
    try {
      const storedLogs = localStorage.getItem(FIRED_LOG_KEY);
      firedLogs = storedLogs ? JSON.parse(storedLogs) : {};
    } catch (e) {
      console.error('[NotificationScheduler] Failed to load fired logs:', e);
    }

    // 2. Prune by comparing stored timestamp value against now - retentionMs (7 days)
    const retentionMs = 7 * 24 * 60 * 60 * 1000;
    const cutoffMs = nowMs - retentionMs;
    const cleanedLogs: Record<string, number | any> = {};
    Object.entries(firedLogs).forEach(([key, val]) => {
      let timestampMs = 0;
      if (typeof val === 'number') {
        timestampMs = val;
      } else if (typeof val === 'object' && val && val.firedAt) {
        timestampMs = new Date(val.firedAt).getTime();
      }
      if (timestampMs && timestampMs > cutoffMs) {
        cleanedLogs[key] = val;
      }
    });
    firedLogs = cleanedLogs;

    let hasUnsavedChanges = false;

    activeSprints.forEach(sprint => {
      const config = allConfigs[sprint.id];
      if (!config || !config.enabled) return;

      const currentDay = sprint.currentDayNum || 1;
      
      // Check for specific day assignment override first, then fallback to default daily time
      const scheduledTime = config.taskReminders[currentDay] || config.dailyTime;
      if (!scheduledTime) return;

      const [schedHourStr, schedMinStr] = scheduledTime.split(':');
      const schedHour = parseInt(schedHourStr, 10);
      const schedMin = parseInt(schedMinStr, 10);
      if (isNaN(schedHour) || isNaN(schedMin)) return;

      const formattedHour = String(schedHour).padStart(2, '0');
      const formattedMin = String(schedMin).padStart(2, '0');
      const schedTotalMins = schedHour * 60 + schedMin;
      let diffMinutes = currentTotalMins - schedTotalMins;
      if (diffMinutes < -1400) diffMinutes += 1440; // Handle midnight rollover

      // Key format: ${sprint.id}_${dateStr}_${schedHour}:${schedMin}_day${currentDay}
      const logKey = `${sprint.id}_${dateStr}_${formattedHour}:${formattedMin}_day${currentDay}`;

      // Cross-tab / atomic re-check before triggering
      let freshLogs: Record<string, any> = firedLogs;
      try {
        const latestStored = localStorage.getItem(FIRED_LOG_KEY);
        if (latestStored) freshLogs = JSON.parse(latestStored);
      } catch (e) {}

      // 1. Tolerant 0-2 minute window check
      if (diffMinutes >= 0 && diffMinutes <= 2) {
        if (!freshLogs[logKey]) {
          // Save immediately and atomically after marking with epoch ms
          firedLogs[logKey] = Date.now();
          freshLogs[logKey] = firedLogs[logKey];
          try {
            localStorage.setItem(FIRED_LOG_KEY, JSON.stringify(freshLogs));
          } catch (e) {
            console.error('[NotificationScheduler] Failed to write fired logs atomically:', e);
          }

          const notifTitle = `Today’s Focus: ${sprint.title}`;
          const notifBody = `Day ${currentDay} starts now. This step moves you forward. Start Task.`;
          const actionUrl = `/participant/sprint/${sprint.id}`;

          // Play haptic feedback for active user in app
          try {
            triggerHaptic(hapticPatterns.notification);
          } catch (hErr) {}

          // Show immediate in-app feedback toast for active user
          toast.info(notifTitle, {
            description: notifBody,
            duration: 4000
          });

          // Dispatch native browser notification if allowed and browser window is in focus
          this.triggerNativeNotification(notifTitle, notifBody, actionUrl);

          // Telemetry report for fired trigger
          this.reportTelemetry({
            type: 'fired_local',
            sprintId: sprint.id,
            scheduledTime,
            diffMinutes,
            hasFcmToken: userHasFcmToken,
            notes: `In-app active reminder displayed within ${diffMinutes}m matching window`
          });
        }
      }
      // 2. Detect missed local trigger if scheduler skipped the 0-2m window (e.g. browser tab was asleep)
      else if (diffMinutes > 2 && diffMinutes <= 60 && !freshLogs[logKey]) {
        const missedKey = `missed_${logKey}`;
        if (!freshLogs[missedKey]) {
          firedLogs[missedKey] = Date.now();
          freshLogs[missedKey] = firedLogs[missedKey];
          try {
            localStorage.setItem(FIRED_LOG_KEY, JSON.stringify(freshLogs));
          } catch (e) {}

          this.reportTelemetry({
            type: 'missed_local_window',
            sprintId: sprint.id,
            scheduledTime,
            diffMinutes,
            hasFcmToken: userHasFcmToken,
            notes: `Missed 0-2m window by ${diffMinutes}m (tab throttled). Server FCM handles closed delivery.`
          });
        }
      }
    });

    if (hasUnsavedChanges) {
      try {
        localStorage.setItem(FIRED_LOG_KEY, JSON.stringify(firedLogs));
      } catch (e) {
        console.error('[NotificationScheduler] Failed to write fired logs to localStorage:', e);
      }
    }
  }
};
