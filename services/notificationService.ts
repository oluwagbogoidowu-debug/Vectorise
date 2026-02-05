
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, onSnapshot, limit, arrayUnion } from 'firebase/firestore';
import { Notification, ParticipantSprint, Sprint } from '../types';
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
  createNotification: async (userId: string, notification: Omit<Notification, 'id'>) => {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const docRef = await addDoc(colRef, sanitizeData({
        ...notification,
        userId, 
      }));
      return { id: docRef.id, ...notification } as Notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  },

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
        await notificationService.createNotification(enrollment.participantId, {
            type: 'sprint_update',
            text: `📢 ${message}`,
            timestamp: new Date().toISOString(),
            read: false,
            link: `/participant/sprint/${enrollment.id}?day=${nextDay}`
        });

        const enrollRef = doc(db, 'enrollments', enrollment.id);
        await updateDoc(enrollRef, {
            sentNudges: arrayUnion(currentMilestone)
        });
    } catch (err) {
        console.error("Failed to trigger nudge:", err);
    }
  },

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
      
      const sorted = notifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      callback(sorted);
    }, (error) => {
      console.warn("Notification sync error:", error);
    });
  },

  markAsRead: async (notificationId: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, notificationId);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }
};
