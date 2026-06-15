import { toast } from 'sonner';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

export interface SprintReminderConfig {
  sprintId: string;
  sprintTitle: string;
  enabled: boolean;
  dailyTime: string; // e.g., "09:00"
  taskReminders: Record<number, string>; // dayNumber -> "HH:MM" e.g., { 1: "10:00", 2: "14:30" }
}

const STORAGE_KEY = 'vtr_local_sprint_reminders_v1';
const FIRED_LOG_KEY = 'vtr_reminders_fired_log_v1';

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
   * Save reminder configuration for a specific sprint
   */
  saveConfig(config: SprintReminderConfig): void {
    try {
      const all = this.getAllConfigs();
      all[config.sprintId] = config;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
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
   * Check all active sprints for the participant and fire notifications if scheduled times are reached.
   * This is designed to be called periodically (e.g., once every 30-60 secs).
   * 
   * @param activeSprints - List of active enrollments with their linked sprint metadata.
   */
  checkAndTriggerDueReminders(activeSprints: Array<{ id: string; title: string; currentDayNum?: number }>) {
    const allConfigs = this.getAllConfigs();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    // Create a precise date string for logging: YYYY-MM-DD
    const dateStr = now.toISOString().split('T')[0];

    // Load logs of fired reminders to avoid duplication
    let firedLogs: Record<string, boolean> = {};
    try {
      const storedLogs = localStorage.getItem(FIRED_LOG_KEY);
      firedLogs = storedLogs ? JSON.parse(storedLogs) : {};
    } catch (e) {
      console.error('[NotificationScheduler] Failed to load fired logs:', e);
    }

    // Clean up ancient logs older than 7 days to conserve localStorage space
    const cleanedLogs: Record<string, boolean> = {};
    const sevenDaysAgoTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
    Object.keys(firedLogs).forEach(key => {
      // Key format: sprintId_dateStr_hour
      const parts = key.split('_');
      if (parts.length >= 3) {
        const logDate = new Date(parts[1]);
        if (logDate.getTime() > sevenDaysAgoTime) {
          cleanedLogs[key] = firedLogs[key];
        }
      }
    });
    firedLogs = cleanedLogs;

    let hasUnsavedChanges = false;

    activeSprints.forEach(sprint => {
      const config = allConfigs[sprint.id];
      if (!config || !config.enabled) return;

      const currentDay = sprint.currentDayNum || 1;
      
      // Determine what time is scheduled for today.
      // Checking for specific day assignment first, then matching default daily time.
      let scheduledTime = config.taskReminders[currentDay] || config.dailyTime;
      if (!scheduledTime) return;

      const [schedHourStr, schedMinStr] = scheduledTime.split(':');
      const schedHour = parseInt(schedHourStr, 10);
      const schedMin = parseInt(schedMinStr, 10);

      if (isNaN(schedHour) || isNaN(schedMin)) return;

      // Check if current time matches scheduled hour & minute
      if (currentHour === schedHour && currentMin === schedMin) {
        // Log key to ensure we fire exactly once per task/day/hour combo
        const logKey = `${sprint.id}_${dateStr}_${currentHour}_day${currentDay}`;

        if (!firedLogs[logKey]) {
          // Mark as fired immediately
          firedLogs[logKey] = true;
          hasUnsavedChanges = true;

          // Compile notification content
          const notifTitle = `⚡ Task Prep Reminder: ${sprint.title}`;
          const notifBody = `Day ${currentDay} task is scheduled and ready for you under your Consistency Dashboard! Let's build momentum now.`;
          const actionUrl = `/participant/sprint/${sprint.id}`;

          // 1. Play Completion/Review haptic
          try {
            triggerHaptic(hapticPatterns.notification);
          } catch (hErr) {}

          // 2. Play beautiful in-app toast notification with details
          toast.info(`⏰ Reminder: ${sprint.title}`, {
            description: `Ready to complete Day ${currentDay}? Click here to view task!`,
            duration: 10000,
            action: {
              label: 'Go To Task',
              onClick: () => {
                window.location.href = actionUrl;
              }
            }
          });

          // 3. Fire local OS/Browser notification
          this.triggerNativeNotification(notifTitle, notifBody, actionUrl);
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
