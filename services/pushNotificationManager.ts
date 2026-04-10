
import webpush from 'web-push';
import { db } from './firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, limit, orderBy } from 'firebase/firestore';
import { Participant, UserNotificationState, PushSubscriptionJSON, ParticipantSprint, Sprint } from '../types';
import { notificationEngine } from './notificationEngine';

// VAPID keys should be set in .env. For now, we'll use these placeholders
// In a real app, you'd generate them using web-push.generateVAPIDKeys()
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BPG4lkECd-HiF4W8WPANEjk6QswjHOFk4fnvdTceYYu_L4ORxw7PogMDAqANoL1DnPM0L27zEpqM6Zokn7ZJhdc';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'qP_xSYSgk0QqbBfgSqxuHsj3zeqWYnihR5ATHKtBw3Y';
const GCM_API_KEY = process.env.GCM_API_KEY;

try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:support@vectorise.ai',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    console.log('[PushManager] VAPID details set successfully');
  } else {
    console.warn('[PushManager] VAPID keys are missing. Push notifications will not work.');
  }
} catch (error) {
  console.error('[PushManager] Failed to set VAPID details:', error);
}

if (GCM_API_KEY) {
  webpush.setGCMAPIKey(GCM_API_KEY);
}

export const pushNotificationManager = {
  /**
   * Send a push notification to a specific user.
   */
  sendPush: async (userId: string, payload: { title: string; body: string; url?: string; tag?: string }) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return false;
      
      const userData = userSnap.data() as Participant;
      
      if (!userData.pushSubscription || userData.notificationsDisabled) {
        console.log(`[PushManager] User ${userId} has no push subscription or notifications disabled.`);
        return false;
      }

      // Check daily cap (Rule 3)
      const today = new Date().toISOString().split('T')[0];
      const lastSentAt = userData.lastNotificationSentAt || '';
      const lastSentDate = lastSentAt.split('T')[0];
      
      let sentToday = userData.notificationsSentToday || 0;
      if (lastSentDate !== today) {
        sentToday = 0;
      }

      if (sentToday >= 10) {
        console.log(`[PushManager] User ${userId} reached daily notification cap.`);
        return false;
      }

      const subscription = userData.pushSubscription as unknown as webpush.PushSubscription;
      
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url || '/',
          tag: payload.tag || 'default'
        })
      );

      // Update user notification stats
      await updateDoc(userRef, {
        notificationsSentToday: sentToday + 1,
        lastNotificationSentAt: new Date().toISOString()
      });

      console.log(`[PushManager] Successfully sent push to user ${userId}: ${payload.title}`);
      return true;
    } catch (error: any) {
      console.error(`[PushManager] Failed to send push to user ${userId}:`, error);
      
      // If subscription is invalid, remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`[PushManager] Removing invalid subscription for user ${userId}`);
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          pushSubscription: null
        });
      }
      
      return false;
    }
  },

  /**
   * Trigger the "Completed Task" notification immediately.
   */
  triggerCompleted: async (userId: string) => {
    console.log(`[PushManager] Triggering completed notification for user ${userId}`);
    
    // Send immediate "You showed up" message
    await pushNotificationManager.sendPush(userId, {
      title: 'You showed up today',
      body: 'That’s how clarity is built.',
      url: '/participant/sprint',
      tag: 'task-completed'
    });

    // Update state to Completed
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { 
      notificationState: 'Completed',
      lastActivityAt: new Date().toISOString()
    });
  },

  /**
   * Update user notification state.
   */
  updateNotificationState: async (userId: string, state: UserNotificationState) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { 
      notificationState: state,
      lastActivityAt: new Date().toISOString()
    });
  },

  /**
   * Process all users and check for notification triggers.
   * This should be called by a background job.
   */
  processTriggers: async () => {
    console.log('[PushManager] Processing notification triggers...');
    const now = new Date();
    const currentHour = now.getHours();
    
    // 1. Get all users with push subscriptions
    const usersQuery = query(
      collection(db, 'users'),
      where('pushSubscription', '!=', null)
    );
    
    const usersSnap = await getDocs(usersQuery);
    console.log(`[PushManager] Found ${usersSnap.size} users with push subscriptions.`);

    for (const userDoc of usersSnap.docs) {
      const user = { id: userDoc.id, ...userDoc.data() } as Participant;
      
      if (user.notificationsDisabled) continue;

      // Check if already notified today for missed days (Rule: only 1 per day if missed 2+)
      const lastSentAt = user.lastNotificationSentAt ? new Date(user.lastNotificationSentAt) : null;
      const sentToday = lastSentAt && lastSentAt.toDateString() === now.toDateString();

      // Get active enrollment to know the sprint category
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('user_id', '==', user.id),
        where('status', '==', 'active'),
        limit(1)
      );
      const enrollmentsSnap = await getDocs(enrollmentsQuery);
      if (enrollmentsSnap.empty) continue;

      const enrollment = { id: enrollmentsSnap.docs[0].id, ...enrollmentsSnap.docs[0].data() } as ParticipantSprint;
      const sprintSnap = await getDoc(doc(db, 'sprints', enrollment.sprint_id));
      const sprint = sprintSnap.exists() ? sprintSnap.data() as Sprint : null;
      const category = sprint?.category || 'Growth';

      const lastActivity = user.lastActivityAt ? new Date(user.lastActivityAt) : new Date(user.createdAt);
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      const daysSinceActivity = Math.floor(hoursSinceActivity / 24);

      // Check if today's task is completed
      const currentDay = enrollment.progress.find(p => !p.completed)?.day || enrollment.progress.length;
      const todayProgress = enrollment.progress.find(p => p.day === currentDay);
      const isTaskCompleted = todayProgress?.completed || false;

      // Logic for Missed Days (2+ days)
      if (daysSinceActivity >= 2) {
        if (sentToday) continue; // Only 1 per day if missed 2+

        // Trigger in the morning (8am)
        if (currentHour >= 8 && currentHour < 10) {
          if (daysSinceActivity >= 3) {
            await pushNotificationManager.sendPush(user.id, {
              title: 'Keep the Momentum',
              body: `Your ${category} Sprint is still in motion. Continue where you stopped.`,
              url: '/participant/sprint',
              tag: 'missed-long'
            });
          } else {
            await pushNotificationManager.sendPush(user.id, {
              title: 'Still in Motion',
              body: `Your ${category} Sprint is still in motion. This is going somewhere. Let’s keep it moving.`,
              url: '/participant/sprint',
              tag: 'missed-short'
            });
          }
        }
        continue; // Don't send active reminders if they are in "missed" state
      }

      // Active Reminders (if task not completed)
      if (!isTaskCompleted) {
        // 8 AM - Task Unlocked
        if (currentHour === 8) {
          await pushNotificationManager.sendPush(user.id, {
            title: 'Today’s task is unlocked',
            body: 'Your next step is ready',
            url: '/participant/sprint',
            tag: 'daily-unlock'
          });
        }
        // 3 PM - Quick Check
        else if (currentHour === 15) {
          await pushNotificationManager.sendPush(user.id, {
            title: 'Quick check',
            body: 'Quick check — have you completed today’s step?',
            url: '/participant/sprint',
            tag: 'midday-check'
          });
        }
        // 8 PM - Evening Reminder
        else if (currentHour === 20) {
          await pushNotificationManager.sendPush(user.id, {
            title: 'Don’t let today slip',
            body: 'Don’t let today slip. Your task is waiting.',
            url: '/participant/sprint',
            tag: 'evening-reminder'
          });
        }
      }
    }
  }
};
