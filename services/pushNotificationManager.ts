import admin, { db } from '../api/lib/firebaseAdmin.js';
import { Participant, UserNotificationState, ParticipantSprint, Sprint, Notification } from '../types.js';

const processingNotifications = new Set<string>();

const NUDGE_TEMPLATES: Record<number, string> = {
  1: "Missing your momentum? Day {day} is waiting for you in '{title}'.",
  2: "Your growth cycle is stalling. Let's get back to it and finish Day {day} of '{title}'.",
  4: "Consistency is the only bridge to mastery. Resume '{title}' now to stay on track.",
  7: "It's been a week since your last win. Re-ignite your spark in '{title}' before it fades.",
  10: "The path is still there. One small win today changes everything for your '{title}' journey.",
  15: "Your '{title}' sprint is at high risk of abandonment. Your future self is counting on you to finish."
};

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
      const userName = userData.name || 'Unknown User';
      const userEmail = userData.email || 'No Email';
      const msgUrl = payload.url || '/';
      const msgTag = payload.tag || 'default';
      const title = payload.title;
      const body = payload.body;
      
      if (!userData.fcmToken || userData.notificationsDisabled) {
        console.log(`[PushManager] User ${userId} has no fcmToken or notifications disabled.`);
        console.log({
          userId,
          attempted: false,
          success: false,
          reason: !userData.fcmToken ? 'no fcmToken' : 'notifications disabled'
        });

        // Log skipped delivery
        await db.collection('push_delivery_logs').add({
          userId,
          userName,
          userEmail,
          title,
          body,
          url: msgUrl,
          tag: msgTag,
          sentAt: new Date().toISOString(),
          status: !userData.fcmToken ? 'unsubscribed' : 'disabled',
          errorMessage: !userData.fcmToken ? 'No FCM registration token registered' : 'User disabled push notifications'
        }).catch(err => console.error('Failed to log skipped push delivery:', err));

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

        await db.collection('push_delivery_logs').add({
          userId,
          userName,
          userEmail,
          title,
          body,
          url: msgUrl,
          tag: msgTag,
          sentAt: new Date().toISOString(),
          status: 'failed',
          errorMessage: 'Daily push notification cap (100) reached'
        }).catch(err => console.error('Failed to log capped push delivery:', err));

        return false;
      }

      const fcmToken = userData.fcmToken;
      
      // Create a log document in 'push_delivery_logs' with status 'sent' first
      let logId = '';
      let logRef: any = null;
      try {
        logRef = await db.collection('push_delivery_logs').add({
          userId,
          userName,
          userEmail,
          title,
          body,
          url: msgUrl,
          tag: msgTag,
          sentAt: new Date().toISOString(),
          status: 'sent', // Starts as 'sent'
          errorMessage: null
        });
        logId = logRef.id;
      } catch (err) {
        console.error('Failed to create push delivery log:', err);
      }

      try {
        const message = {
          token: fcmToken,
          notification: {
            title: title,
            body: body
          },
          data: {
            logId: logId, // Crucial for tracking actual client-side delivery!
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

        // Update existing log to failed status
        if (logRef) {
          await logRef.update({
            status: 'failed',
            errorMessage: errorMessage
          }).catch((err: any) => console.error('Failed to update failed push delivery log:', err));
        }
        
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
    
    const activeListeners = new Map<string, () => void>();

    db.collection('users')
      .where('fcmToken', '!=', null)
      .onSnapshot((usersSnapshot) => {
        usersSnapshot.docs.forEach((userDoc) => {
          const userId = userDoc.id;
          if (activeListeners.has(userId)) return;

          const unsubscribe = db.collection('users').doc(userId).collection('notifications')
            .where('pushSent', '==', false)
            .onSnapshot(async (snapshot) => {
              for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                  const notification = { id: change.doc.id, ...change.doc.data() } as Notification;
                  
                  const hasNotTriedOrFailed = !notification.pushFailed && (!notification.retryCount || notification.retryCount === 0);
                  if (!notification.pushSent && hasNotTriedOrFailed) {
                    if (processingNotifications.has(notification.id)) {
                      continue;
                    }
                    processingNotifications.add(notification.id);

                    console.log(`[PushManager] New subcollection notification detected for user ${userId}. Sending FCM push...`);
                    
                    const success = await pushNotificationManager.sendPush(userId, notification.data || {
                      title: notification.title,
                      body: notification.body,
                      url: notification.actionUrl || '/',
                      tag: notification.type
                    }, notification.bypassActiveCheck || false);

                    if (success) {
                      await change.doc.ref.update({
                        pushSent: true,
                        pushSentAt: new Date().toISOString(),
                        pushFailed: false
                      }).catch((e: any) => console.error('[PushManager] Failed to update pushSent:', e));
                    } else {
                      processingNotifications.delete(notification.id);
                      
                      const delay = Math.pow(2, 0) * 60 * 1000; // 1 minute
                      await change.doc.ref.update({
                        pushFailed: true,
                        lastPushError: 'First FCM push attempt returned false status or was skipped',
                        retryCount: 1,
                        nextRetryAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + delay))
                      }).catch((e: any) => console.error('[PushManager] Failed to update fail details:', e));
                    }
                  }
                }
              }
            }, (err) => {
              console.error(`[PushManager] Notification listener error for user ${userId}:`, err);
            });

          activeListeners.set(userId, unsubscribe);
        });

        const activeUserIds = new Set(usersSnapshot.docs.map(d => d.id));
        for (const [userId, unsubscribe] of activeListeners.entries()) {
          if (!activeUserIds.has(userId)) {
            unsubscribe();
            activeListeners.delete(userId);
          }
        }
      }, (error) => {
        console.error('[PushManager] User-based FCM push subscription setup error:', error);
      });
  },

  /**
   * Process and retry pending/failed notifications on a queue timer.
   */
  processPendingNotifications: async () => {
    try {
      const now = new Date();
      
      const usersSnap = await db.collection('users')
        .where('fcmToken', '!=', null)
        .get();

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        
        const snapshot = await db.collection('users').doc(userId).collection('notifications')
          .where('pushSent', '==', false)
          .get();

        const candidateDocs = snapshot.docs.filter(doc => {
          const data = doc.data();
          return data.pushFailed === true && (data.retryCount || 0) < 5;
        });

        for (const doc of candidateDocs) {
          const notification = { id: doc.id, ...doc.data() } as any;
          
          if (notification.isRead) continue;

          const nextRetryAt = notification.nextRetryAt ? notification.nextRetryAt.toDate() : null;
          if (nextRetryAt && nextRetryAt <= now) {
            console.log(`[PushManager] Re-transmitting FCM notification ${notification.id} for user ${userId} (Attempt #${notification.retryCount + 1})...`);
            
            const success = await pushNotificationManager.sendPush(userId, notification.data || {
              title: notification.title,
              body: notification.body,
              url: notification.actionUrl || '/',
              tag: notification.type
            }, notification.bypassActiveCheck || false);

            if (success) {
              await doc.ref.update({
                pushSent: true,
                pushSentAt: new Date().toISOString(),
                pushFailed: false
              });
            } else {
              const nextRetryCount = (notification.retryCount || 1) + 1;
              const delay = Math.pow(2, nextRetryCount - 1) * 60 * 1000; // backoff
              await doc.ref.update({
                pushFailed: true,
                lastPushError: `Retry effort ${nextRetryCount} unsuccessful under FCM`,
                retryCount: admin.firestore.FieldValue.increment(1),
                nextRetryAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + delay))
              });
            }
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
      const enrollmentsSnap = await db.collection('users').doc(user.id).collection('enrollments')
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (enrollmentsSnap.empty) continue;

      const enrollment = { id: enrollmentsSnap.docs[0].id, ...enrollmentsSnap.docs[0].data() } as ParticipantSprint;
      const sprintSnap = await db.collection('sprints').doc(enrollment.sprint_id).collection('sprintdetails').doc('info').get();
      const sprint = sprintSnap.exists ? sprintSnap.data() as Sprint : null;

      const lastActivity = user.lastActivityAt ? new Date(user.lastActivityAt) : new Date(user.createdAt);
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      const daysSinceActivity = Math.floor(hoursSinceActivity / 24);

      // Check if today's task is completed
      const currentDay = enrollment.progress.find(p => !p.completed)?.day || enrollment.progress.length;
      const todayProgress = enrollment.progress.find(p => p.day === currentDay);
      const isTaskCompleted = todayProgress?.completed || false;

      // Inactivity or Missed Days Nudges
      if (daysSinceActivity >= 1) {
        const milestones = [1, 2, 4, 7, 10, 15];
        const currentMilestone = [...milestones].reverse().find(m => daysSinceActivity >= m);
        
        if (currentMilestone) {
          const alreadyNudged = (enrollment.sentNudges || []).includes(currentMilestone);
          if (!alreadyNudged && !sentToday) {
            // Send exact drop-off template nudge
            const nextDay = enrollment.progress.findIndex(p => !p.completed) + 1 || 1;
            const template = NUDGE_TEMPLATES[currentMilestone];
            const message = template.replace('{day}', nextDay.toString()).replace('{title}', sprint?.title || 'your sprint');
            
            const success = await pushNotificationManager.sendPush(user.id, {
              title: 'Resume Sprint',
              body: message,
              url: `/participant/sprint/${enrollment.id}?day=${nextDay}`,
              tag: 'sprint_nudge'
            }, true); // bypass active check

            if (success) {
              const enrollRef = db.collection('users').doc(user.id).collection('enrollments').doc(enrollment.id);
              await enrollRef.update({
                sentNudges: admin.firestore.FieldValue.arrayUnion(currentMilestone)
              }).catch(e => console.error('[PushManager] Failed to update sentNudges:', e));
            }
            continue;
          }
        }
      }

      // Active Reminders (if task not completed)
      if (!isTaskCompleted) {
        const sprintTitle = sprint?.title || 'Gain Clarity First';
        const notifTitle = `⏰ Reminder: ${sprintTitle}`;
        const notifBody = `Ready to complete Day ${currentDay}? Click here to view task!`;

        // 8 AM - Task Unlocked
        if (currentHour === 8) {
          await pushNotificationManager.sendPush(user.id, {
            title: notifTitle,
            body: notifBody,
            url: `/participant/sprint/${enrollment.id}`,
            tag: 'daily-unlock'
          });
        }
        // 3 PM - Quick Check
        else if (currentHour === 15) {
          await pushNotificationManager.sendPush(user.id, {
            title: notifTitle,
            body: notifBody,
            url: `/participant/sprint/${enrollment.id}`,
            tag: 'midday-check'
          });
        }
        // 8 PM - Evening Reminder
        else if (currentHour === 20) {
          await pushNotificationManager.sendPush(user.id, {
            title: notifTitle,
            body: notifBody,
            url: `/participant/sprint/${enrollment.id}`,
            tag: 'evening-reminder'
          });
        }
      }
    }
  }
};
