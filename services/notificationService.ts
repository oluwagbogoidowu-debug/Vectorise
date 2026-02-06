
import { db } from './firebase';
import { collection, addDoc, query, where, updateDoc, doc, onSnapshot, limit } from 'firebase/firestore';
import { Notification, NotificationType, ParticipantSprint, Sprint } from '../types';
import { sanitizeData } from './userService';

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
      expiresInDays?: number 
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

      const rawNotification: Omit<Notification, 'id'> = {
        userId,
        type,
        title,
        body,
        actionUrl: options.actionUrl || null,
        context: options.context || null,
        isRead: false,
        readAt: null,
        createdAt: now.toISOString(),
        expiresAt: expiresAt
      };

      const colRef = collection(db, COLLECTION_NAME);
      const docRef = await addDoc(colRef, sanitizeData(rawNotification));
      
      return { id: docRef.id, ...rawNotification } as Notification;
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
        await notificationService.createNotification(
          enrollment.participantId, 
          'sprint_nudge',
          'Resume Sprint',
          message,
          { 
            actionUrl: `/participant/sprint/${enrollment.id}?day=${nextDay}`,
            context: { sprintId: sprint.id, day: nextDay }
          }
        );

        const enrollRef = doc(db, 'enrollments', enrollment.id);
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
  subscribeToNotifications: (userId: string, callback: (notifications: Notification[]) => void) => {
    if (!userId || typeof userId !== 'string') {
        callback([]);
        return () => {};
    }

    const colRef = collection(db, COLLECTION_NAME);
    const q = query(
      colRef,
      where("userId", "==", userId),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications: Notification[] = [];
      snapshot.forEach((doc) => {
        notifications.push(sanitizeData({ id: doc.id, ...doc.data() }) as Notification);
      });
      
      // Filter out expired notifications locally for safety
      const now = new Date().getTime();
      const validNotifications = notifications.filter(n => 
        !n.expiresAt || new Date(n.expiresAt).getTime() > now
      );

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
  markAsRead: async (notificationId: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, notificationId);
      await updateDoc(docRef, { 
        isRead: true,
        readAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }
};
