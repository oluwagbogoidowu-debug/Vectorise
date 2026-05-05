
import webpush from '../utils/webpush.js';
import { db } from '../api/lib/firebaseAdmin.js';
import { Participant, UserNotificationState, PushSubscriptionJSON, ParticipantSprint, Sprint, Notification } from '../types.js';
import { notificationEngine } from './notificationEngine.js';

const GCM_API_KEY = process.env.GCM_API_KEY;

if (GCM_API_KEY) {
  webpush.setGCMAPIKey(GCM_API_KEY);
}

export const pushNotificationManager = {
  /**
   * Save a push subscription for a user.
   */
  saveSubscription: async (userId: string, subscription: PushSubscriptionJSON) => {
    try {
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        pushSubscription: subscription,
        notificationsDisabled: false,
        lastActivityAt: new Date().toISOString()
      });
      console.log(`[PushManager] Saved subscription for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`[PushManager] Failed to save subscription for user ${userId}:`, error);
      return false;
    }
  },

  /**
   * Send a push notification to a specific user.
   */
  sendPush: async (userId: string, payload: { title: string; body: string; url?: string; tag?: string }, bypassActiveCheck: boolean = false) => {
    try {
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      
      if (!userSnap.exists) return false;
      
      const userData = userSnap.data() as Participant;
      
      if (!userData.pushSubscription || userData.notificationsDisabled) {
        console.log(`[PushManager] User ${userId} has no push subscription or notifications disabled.`);
        return false;
      }

      // Check if user is active right now (within last 3 minutes)
      if (!bypassActiveCheck) {
        const lastActivity = userData.lastActivityAt ? new Date(userData.lastActivityAt) : null;
        const now = new Date();
        if (lastActivity && (now.getTime() - lastActivity.getTime()) < 3 * 60 * 1000) {
          console.log(`[PushManager] User ${userId} is currently active. Skipping push.`);
          // We return true here to signal that the push was "handled" (skipped intentionally)
          return true; 
        }
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
          data: {
            title: payload.title,
            body: payload.body,
            url: payload.url || '/',
            tag: payload.tag || 'default'
          }
        })
      );

      // Update user notification stats
      await userRef.update({
        notificationsSentToday: sentToday + 1,
        lastNotificationSentAt: new Date().toISOString()
      });

      console.log(`[PushManager] Successfully sent push to user ${userId}: ${payload.title}`);
      return true;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = error.statusCode || (error.response && error.response.status);
      const errorBody = error.body || '';

      console.error(`[PushManager] Failed to send push to user ${userId}:`, {
        message: errorMessage,
        statusCode,
        body: errorBody.substring(0, 500) // Keep it manageable
      });
      
      // If subscription is invalid, remove it
      // 410 Gone: subscription has expired or is no longer valid
      // 404 Not Found: subscription is not found (similar to 410)
      if (statusCode === 410 || statusCode === 404) {
        console.log(`[PushManager] Removing invalid subscription for user ${userId}`);
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
          pushSubscription: null
        });
      }
      
      return false;
    }
  },

  /**
   * Start a listener on the notifications collection to send pushes for new notifications.
   */
  startNotificationListener: () => {
    console.log('[PushManager] Starting notification listener...');
    
    db.collection('notifications')
      .where('pushSent', '==', false)
      .onSnapshot(async (snapshot) => {
        const changes = snapshot.docChanges();
        
        for (const change of changes) {
          if (change.type === 'added') {
            const notification = { id: change.doc.id, ...change.doc.data() } as Notification;
            
            // Only push if it's unread and hasn't been pushed yet
            if (!notification.isRead && !notification.pushSent) {
              console.log(`[PushManager] New notification detected for user ${notification.userId}. Sending push...`);
              
              const success = await pushNotificationManager.sendPush(notification.userId, notification.data || {
                title: notification.title,
                body: notification.body,
                url: notification.actionUrl || '/',
                tag: notification.type
              }, notification.bypassActiveCheck || false);

              if (success) {
                await db.collection('notifications').doc(notification.id).update({
                  pushSent: true
                });
              }
            }
          }
        }
      }, (error) => {
        console.error('[PushManager] Notification listener error:', error);
      });
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
    }, true); // Bypass active check

    // Update state to Completed
    const userRef = db.collection('users').doc(userId);
    await userRef.update({ 
      notificationState: 'Completed',
      lastActivityAt: new Date().toISOString()
    });
  },

  /**
   * Trigger the "Register Update" notification immediately.
   */
  triggerUpdate: async (userId: string) => {
    console.log(`[PushManager] Triggering update notification for user ${userId}`);
    
    await pushNotificationManager.sendPush(userId, {
      title: 'Update Registered',
      body: 'Consistency is exactly how progress is made.',
      url: '/dashboard',
      tag: 'register-update'
    }, true); // Bypass active check

    const userRef = db.collection('users').doc(userId);
    await userRef.update({ 
      lastActivityAt: new Date().toISOString()
    });
  },

  /**
   * Update user notification state.
   */
  updateNotificationState: async (userId: string, state: UserNotificationState) => {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({ 
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
    const usersSnap = await db.collection('users')
      .where('pushSubscription', '!=', null)
      .get();
    
    console.log(`[PushManager] Found ${usersSnap.size} users with push subscriptions.`);

    for (const userDoc of usersSnap.docs) {
      const user = { id: userDoc.id, ...userDoc.data() } as Participant;
      
      if (user.notificationsDisabled) continue;

      // Check if already notified today for missed days (Rule: only 1 per day if missed 2+)
      const lastSentAt = user.lastNotificationSentAt ? new Date(user.lastNotificationSentAt) : null;
      const sentToday = lastSentAt && lastSentAt.toDateString() === now.toDateString();

      // Get active enrollment to know the sprint category
      const enrollmentsSnap = await db.collection('enrollments')
        .where('user_id', '==', user.id)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (enrollmentsSnap.empty) continue;

      const enrollment = { id: enrollmentsSnap.docs[0].id, ...enrollmentsSnap.docs[0].data() } as ParticipantSprint;
      const sprintSnap = await db.collection('sprints').doc(enrollment.sprint_id).get();
      const sprint = sprintSnap.exists ? sprintSnap.data() as Sprint : null;
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
