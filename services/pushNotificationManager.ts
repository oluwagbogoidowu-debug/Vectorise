
import webpush from 'web-push';
import { db } from './firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, limit } from 'firebase/firestore';
import { Participant, UserNotificationState, PushSubscriptionJSON } from '../types';
import { notificationEngine } from './notificationEngine';

// VAPID keys should be set in .env. For now, we'll use these placeholders
// In a real app, you'd generate them using web-push.generateVAPIDKeys()
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BHPoCpbFGBbD4uJ1SxIqVLg0Z1bGOKu_Z6huSrBlI7Z_c3MhvGI_BzaucmyeVRvUv0IBV2vWY_m5wkGSwFZn6ZY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '6lEE3qVWJ8f76DFEIcZFNG0JaAuyxBoYaQhPx8jKuCQ';
const GCM_API_KEY = process.env.GCM_API_KEY;

webpush.setVapidDetails(
  'mailto:support@vectorise.ai',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

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

      const lastActivity = user.lastActivityAt ? new Date(user.lastActivityAt) : new Date(user.createdAt);
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      const daysSinceActivity = hoursSinceActivity / 24;

      // Logic based on state and triggers
      
      // A. New User - Trigger: joins. Send immediately.
      if (user.notificationState === 'New') {
        await pushNotificationManager.sendPush(user.id, {
          title: 'Welcome in',
          body: 'Your first step is ready.',
          url: '/participant/discover',
          tag: 'welcome'
        });
        await updateDoc(userDoc.ref, { notificationState: 'Pending' });
        continue;
      }

      // B. Task Unlock (Daily) - Morning (7-9am)
      // Trigger: new day / next task available
      if (currentHour >= 7 && currentHour <= 9) {
        const lastSentAt = user.lastNotificationSentAt ? new Date(user.lastNotificationSentAt) : null;
        const sentToday = lastSentAt && lastSentAt.toDateString() === now.toDateString();
        
        if (!sentToday && (user.notificationState === 'Completed' || user.notificationState === 'Dormant')) {
          await pushNotificationManager.sendPush(user.id, {
            title: 'Today’s task is unlocked',
            body: 'Ready to take the next step?',
            url: '/participant/sprint',
            tag: 'daily-unlock'
          });
          await updateDoc(userDoc.ref, { notificationState: 'Pending' });
          continue;
        }
      }

      // C. Pending (hasn’t started) - 6-8 hours after unlock AND no activity
      if (user.notificationState === 'Pending' && hoursSinceActivity >= 6 && hoursSinceActivity <= 12) {
        const lastSentAt = user.lastNotificationSentAt ? new Date(user.lastNotificationSentAt) : null;
        const sentRecently = lastSentAt && (now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60) < 4;
        
        if (!sentRecently) {
          await pushNotificationManager.sendPush(user.id, {
            title: 'Don’t let today slip',
            body: 'Your step is waiting.',
            url: '/participant/sprint',
            tag: 'pending-reminder'
          });
          // Stay in Pending
        }
      }

      // D. Completed Task - Optional (later in day)
      if (user.notificationState === 'Completed') {
        const lastSentAt = user.lastNotificationSentAt ? new Date(user.lastNotificationSentAt) : null;
        const hoursSinceLastSent = lastSentAt ? (now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60) : 0;
        
        // If completed more than 6 hours ago and haven't sent another one today
        if (hoursSinceLastSent >= 6 && currentHour >= 16 && currentHour <= 20) {
          const lastSentDate = lastSentAt ? lastSentAt.toDateString() : '';
          const sentTwiceToday = lastSentDate === now.toDateString() && (user.notificationsSentToday || 0) >= 2;

          if (!sentTwiceToday) {
            await pushNotificationManager.sendPush(user.id, {
              title: 'Tomorrow, we go deeper',
              body: 'Rest well. We continue tomorrow.',
              url: '/participant/sprint',
              tag: 'daily-wrapup'
            });
            // Stay in Completed
          }
        }
      }

      // E. Missed Day - 24-36 hours, task not completed
      // Trigger: Next morning
      if (user.notificationState === 'Pending' && hoursSinceActivity >= 24 && hoursSinceActivity < 48) {
        if (currentHour >= 7 && currentHour <= 9) {
          const lastSentAt = user.lastNotificationSentAt ? new Date(user.lastNotificationSentAt) : null;
          const sentToday = lastSentAt && lastSentAt.toDateString() === now.toDateString();
          
          if (!sentToday) {
            await pushNotificationManager.sendPush(user.id, {
              title: 'You missed yesterday',
              body: 'Let’s continue.',
              url: '/participant/sprint',
              tag: 'missed-day'
            });
            // State stays Pending
          }
        }
      }

      // F. Inactive - 48 hours inactivity
      if (hoursSinceActivity >= 48 && hoursSinceActivity < 72 && user.notificationState !== 'Inactive') {
        await pushNotificationManager.sendPush(user.id, {
          title: 'Ready to continue?',
          body: 'You started this for a reason. Ready to continue?',
          url: '/participant/sprint',
          tag: 'inactive-nudge'
        });
        await updateDoc(userDoc.ref, { notificationState: 'Inactive' });
      }

      // G. Dormant - 72-120 hours inactivity
      if (hoursSinceActivity >= 72 && hoursSinceActivity <= 120 && user.notificationState !== 'Dormant') {
        await pushNotificationManager.sendPush(user.id, {
          title: 'Ready to continue?',
          body: 'You started this for a reason. Ready to continue?',
          url: '/participant/sprint',
          tag: 'dormant-nudge'
        });
        await updateDoc(userDoc.ref, { notificationState: 'Dormant' });
      }
    }
  }
};
