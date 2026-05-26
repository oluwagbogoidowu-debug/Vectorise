import admin, { db } from '../api/lib/firebaseAdmin.js';
import { Participant, UserNotificationState, ParticipantSprint, Sprint, Notification } from '../types.js';

export const pushNotificationManager = {
  /**
   * Save an FCM registration token for a user.
   */
  saveSubscription: async (userId: string, fcmToken: string) => {
    try {
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        fcmToken: fcmToken,
        notificationsDisabled: false,
        lastActivityAt: new Date().toISOString(),
        pushSubscriptionInvalidCount: 0 // Reset any previous failures
      });
      console.log(`[PushManager] Saved FCM Token for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`[PushManager] Failed to save FCM Token for user ${userId}:`, error);
      return false;
    }
  },

  /**
   * Send a push notification to a specific user via FCM.
   */
  sendPush: async (userId: string, payload: { title: string; body: string; url?: string; tag?: string }, bypassActiveCheck: boolean = false) => {
    try {
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      
      if (!userSnap.exists) {
        console.log({
          userId,
          attempted: false,
          success: false,
          reason: 'user document not found in database'
        });
        return false;
      }
      
      const userData = userSnap.data() as Participant;
      
      if (!userData.fcmToken || userData.notificationsDisabled) {
        console.log(`[PushManager] User ${userId} has no fcmToken or notifications disabled.`);
        console.log({
          userId,
          attempted: false,
          success: false,
          reason: !userData.fcmToken ? 'no fcmToken' : 'notifications disabled'
        });
        return false;
      }

      // Check daily cap (Relaxed daily cap to 100)
      const today = new Date().toISOString().split('T')[0];
      const lastSentAt = userData.lastNotificationSentAt || '';
      const lastSentDate = lastSentAt.split('T')[0];
      
      let sentToday = userData.notificationsSentToday || 0;
      if (lastSentDate !== today) {
        sentToday = 0;
      }

      if (sentToday >= 100) {
        console.log(`[PushManager] User ${userId} reached daily notification cap of 100.`);
        console.log({
          userId,
          attempted: false,
          success: false,
          reason: 'daily notification cap of 100 exceeded'
        });
        return false;
      }

      const fcmToken = userData.fcmToken;
      
      try {
        const title = payload.title;
        const body = payload.body;
        const msgUrl = payload.url || '/';
        const msgTag = payload.tag || 'default';

        const message = {
          token: fcmToken,
          notification: {
            title: title,
            body: body
          },
          data: {
            url: msgUrl,
            tag: msgTag,
            title: title,
            body: body
          },
          webpush: {
            notification: {
              icon: 'https://img.icons8.com/fluency-systems-filled/96/0E7850/clock.png',
              badge: 'https://lh3.googleusercontent.com/d/1iPPiCUwdOmGZ-KScVrvOpOw0LiauXE7X',
              clickAction: msgUrl
            }
          }
        };

        const resultId = await admin.messaging().send(message);
        console.log(`[PushManager] Successfully sent FCM push: response ID = ${resultId}`);

        // Update user notification stats
        await userRef.update({
          notificationsSentToday: sentToday + 1,
          lastNotificationSentAt: new Date().toISOString(),
          pushSubscriptionInvalidCount: 0 // Reset invalid state
        });

        console.log({
          userId,
          attempted: true,
          success: true,
          reason: null
        });

        return true;
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorMsgLower = errorMessage.toLowerCase();

        console.error(`[PushManager] Failed to send fcm push to user ${userId}:`, errorMessage);
        
        console.log({
          userId,
          attempted: true,
          success: false,
          reason: `fcm error: ${errorMessage}`
        });
        
        // If the token is no longer unregistered, expired, or rejected, clear it
        if (
          errorMsgLower.includes('not-registered') ||
          errorMsgLower.includes('invalid-registration-token') ||
          errorMsgLower.includes('invalid-argument') ||
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-argument'
        ) {
          console.log(`[PushManager] Clearing invalid fcmToken for user ${userId}`);
          await userRef.update({
            fcmToken: null
          }).catch(err => console.error(`Failed to clear invalid fcmToken for user ${userId}:`, err));
        }
        
        return false;
      }
    } catch (outerError: any) {
      console.error(`[PushManager] Critical error in sendPush for user ${userId}:`, outerError);
      return false;
    }
  },

  /**
   * Start a listener on the notifications collection to send pushes for new notifications.
   */
  startNotificationListener: () => {
    console.log('[PushManager] Starting FCM notification listener...');
    
    db.collection('notifications')
      .where('pushSent', '==', false)
      .onSnapshot(async (snapshot) => {
        const changes = snapshot.docChanges();
        
        for (const change of changes) {
          if (change.type === 'added') {
            const notification = { id: change.doc.id, ...change.doc.data() } as Notification;
            
            const hasNotTriedOrFailed = !notification.pushFailed && (!notification.retryCount || notification.retryCount === 0);
            if (!notification.isRead && !notification.pushSent && hasNotTriedOrFailed) {
              console.log(`[PushManager] New notification detected for user ${notification.userId}. Sending FCM push...`);
              
              const success = await pushNotificationManager.sendPush(notification.userId, notification.data || {
                title: notification.title,
                body: notification.body,
                url: notification.actionUrl || '/',
                tag: notification.type
              }, notification.bypassActiveCheck || false);

              // Only mark pushSent on actual success
              if (success) {
                await db.collection('notifications').doc(notification.id).update({
                  pushSent: true,
                  pushSentAt: new Date().toISOString(),
                  pushFailed: false
                });
              } else {
                // Save first failure trace and set backoff timers
                const delay = Math.pow(2, 0) * 60 * 1000; // 1 minute
                await db.collection('notifications').doc(notification.id).update({
                  pushFailed: true,
                  lastPushError: 'First FCM push attempt returned false status or was skipped',
                  retryCount: 1,
                  nextRetryAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + delay))
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
   * Process and retry pending/failed notifications on a queue timer.
   */
  processPendingNotifications: async () => {
    try {
      console.log('[PushManager] Processing pending/failed notification retries...');
      const now = new Date();
      
      const snapshot = await db.collection('notifications')
        .where('pushSent', '==', false)
        .get();

      const candidateDocs = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.pushFailed === true && (data.retryCount || 0) < 5;
      });

      console.log(`[PushManager] Found ${candidateDocs.length} notifications marked for active FCM retry queue.`);

      for (const doc of candidateDocs) {
        const notification = { id: doc.id, ...doc.data() } as any;
        
        if (notification.isRead) continue;

        const nextRetryAt = notification.nextRetryAt ? notification.nextRetryAt.toDate() : null;
        if (nextRetryAt && nextRetryAt <= now) {
          console.log(`[PushManager] Retrying FCM notification ${notification.id} for user ${notification.userId} (Attempt #${notification.retryCount + 1})...`);
          
          const success = await pushNotificationManager.sendPush(notification.userId, notification.data || {
            title: notification.title,
            body: notification.body,
            url: notification.actionUrl || '/',
            tag: notification.type
          }, notification.bypassActiveCheck || false);

          if (success) {
            await db.collection('notifications').doc(notification.id).update({
              pushSent: true,
              pushSentAt: new Date().toISOString(),
              pushFailed: false
            });
          } else {
            const nextRetryCount = (notification.retryCount || 1) + 1;
            const delay = Math.pow(2, nextRetryCount - 1) * 60 * 1000; // backoff
            await db.collection('notifications').doc(notification.id).update({
              pushFailed: true,
              lastPushError: `Retry effort ${nextRetryCount} unsuccessful under FCM`,
              retryCount: admin.firestore.FieldValue.increment(1),
              nextRetryAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + delay))
            });
          }
        }
      }
    } catch (err) {
      console.error('[PushManager] Error in background queued notification worker:', err);
    }
  },

  /**
   * Trigger the "Completed Task" notification immediately.
   */
  triggerCompleted: async (userId: string) => {
    console.log(`[PushManager] Triggering completed notification for user ${userId}`);
    
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
   */
  processTriggers: async () => {
    console.log('[PushManager] Processing notification triggers...');
    const now = new Date();
    const currentHour = now.getHours();
    
    // 1. Get all users with FCM tokens
    const usersSnap = await db.collection('users')
      .where('fcmToken', '!=', null)
      .get();
    
    console.log(`[PushManager] Found ${usersSnap.size} users with active FCM tokens.`);

    for (const userDoc of usersSnap.docs) {
      const user = { id: userDoc.id, ...userDoc.data() } as Participant;
      
      if (user.notificationsDisabled) continue;

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
        continue;
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
