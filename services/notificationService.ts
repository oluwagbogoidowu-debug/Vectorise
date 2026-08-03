
import { db } from './firebase';
import { collection, addDoc, query, where, updateDoc, doc, onSnapshot, limit } from 'firebase/firestore';
import type { Notification as InAppNotification, NotificationType, ParticipantSprint, Sprint } from '../types';
import { sanitizeData } from './userService';
import { pushNotificationService } from './pushNotificationService';

const COLLECTION_NAME = 'notifications';

const NUDGE_TEMPLATES: Record<number, string> = {
    1: "Missing your momentum? Day {day} is waiting for you in '{title}'.",
    2: "Your growth cycle is stalling. Let's get back to it and finish Day {day} of '{title}'.",
    4: "Consistency is the only bridge to mastery. Resume '{title}' now to stay on track.",
    7: "It's been a week since your last win. Re-ignite your spark in '{title}' before it fades.",
    10: "The path is still there. One small win today changes everything for your '{title}' journey.",
    15: "Your '{title}' sprint is at high risk of abandonment. Your future self is counting on you to finish."
};

export const notificationService = {
  /**
   * Internal method to create a notification record.
   * This logic matches the requested database schema.
   */
  createNotification: async (
    userId: string, 
    type: NotificationType, 
    title: string, 
    body: string, 
    options: { 
      actionUrl?: string, 
      context?: any, 
      expiresInDays?: number,
      bypassActiveCheck?: boolean,
      pushOnly?: boolean,
      inAppDisabled?: boolean
    } = {}
  ) => {
    try {
      const now = new Date();
      let expiresAt: string | null = null;
      
      if (options.expiresInDays) {
        const expiryDate = new Date();
        expiryDate.setDate(now.getDate() + options.expiresInDays);
        expiresAt = expiryDate.toISOString();
      }

      // 1. Attempt immediate FCM push delivery first
      let pushSent = false;
      let pushSentAt: string | null = null;
      let pushFailed = false;
      let lastPushError: string | null = null;

      try {
        const sent = await pushNotificationService.sendPush(
          userId,
          title,
          body,
          options.actionUrl || '/',
          type === 'coach_message' ? 'coach-message' : type.replace(/_/g, '-'),
          options.bypassActiveCheck || false
        );
        if (sent) {
          pushSent = true;
          pushSentAt = new Date().toISOString();
        } else {
          pushFailed = true;
          lastPushError = 'Immediate FCM push returned false';
        }
      } catch (err: any) {
        pushFailed = true;
        lastPushError = err?.message || String(err);
        console.warn("[NotificationService] Immediate push failed (queued for retry):", err);
      }

      // 2. Build and save notification document with accurate pushSent status
      const rawNotification: Omit<InAppNotification, 'id'> = {
        userId,
        type,
        title,
        body,
        actionUrl: options.actionUrl || null,
        context: options.context || null,
        isRead: false,
        readAt: null,
        pushSent,
        pushFailed: pushSent ? false : pushFailed,
        lastPushError: pushSent ? undefined : (lastPushError || undefined),
        retryCount: pushSent ? 0 : 1,
        nextRetryAt: pushSent ? undefined : new Date(Date.now() + 60000).toISOString() as any,
        createdAt: now.toISOString(),
        expiresAt: expiresAt,
        bypassActiveCheck: options.bypassActiveCheck || false,
        pushOnly: options.pushOnly || false,
        inAppDisabled: options.inAppDisabled || false,
        data: {
          title,
          body,
          tag: type === 'coach_message' ? 'coach-message' : type.replace(/_/g, '-'),
          url: options.actionUrl || '/'
        }
      };

      const colRef = collection(db, 'users', userId, 'notifications');
      const docRef = await addDoc(colRef, sanitizeData(rawNotification));
      
      return { id: docRef.id, ...rawNotification } as InAppNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  },

  /**
   * Logic for drop-off nudges.
   */
  triggerDropOffNudge: async (enrollment: ParticipantSprint, sprint: Sprint, daysInactive: number) => {
    const milestones = [1, 2, 4, 7, 10, 15];
    const currentMilestone = milestones.reverse().find(m => daysInactive >= m);
    
    if (!currentMilestone) return;
    
    const alreadyNudged = (enrollment.sentNudges || []).includes(currentMilestone);
    if (alreadyNudged) return;

    const nextDay = enrollment.progress.findIndex(p => !p.completed) + 1;
    const template = NUDGE_TEMPLATES[currentMilestone];
    const message = template.replace('{day}', nextDay.toString()).replace('{title}', sprint.title);

    try {
        // Fix: Property 'participantId' replaced with 'user_id'
        await notificationService.createNotification(
          enrollment.user_id, 
          'sprint_nudge',
          'Resume Sprint',
          message,
          { 
            actionUrl: `/participant/sprint/${enrollment.id}?day=${nextDay}`,
            context: { sprintId: sprint.id, day: nextDay },
            pushOnly: true
          }
        );

        const enrollRef = doc(db, 'users', enrollment.user_id, 'enrollments', enrollment.id);
        await updateDoc(enrollRef, {
            sentNudges: [...(enrollment.sentNudges || []), currentMilestone]
        });
    } catch (err) {
        console.error("Failed to trigger nudge:", err);
    }
  },

  /**
   * Real-time subscription to user notifications.
   */
  subscribeToNotifications: (userId: string, callback: (notifications: InAppNotification[]) => void) => {
    if (!userId || typeof userId !== 'string') {
        callback([]);
        return () => {};
    }

    const colRef = collection(db, 'users', userId, 'notifications');
    const q = query(
      colRef,
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications: InAppNotification[] = [];
      snapshot.forEach((doc) => {
        notifications.push(sanitizeData({ id: doc.id, ...doc.data() }) as InAppNotification);
      });
      
      // Filter out expired and push-only/in-app-disabled notifications locally for safety
      const now = new Date().getTime();
      const validNotifications = notifications.filter(n => {
        const isExpired = n.expiresAt && new Date(n.expiresAt).getTime() <= now;
        const isPushOnly = n.pushOnly || n.inAppDisabled || n.type === 'sprint_day_unlocked' || n.type === 'sprint_nudge';
        return !isExpired && !isPushOnly;
      });

      const sorted = validNotifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      callback(sorted);
    }, (error) => {
      console.warn("Notification sync error:", error);
    });
  },

  /**
   * Mark a single notification as read.
   */
  markAsRead: async (userId: string, notificationId: string) => {
    try {
      const docRef = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(docRef, { 
        isRead: true,
        readAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }
};
