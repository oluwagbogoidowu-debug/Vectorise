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
   * Broadcast a push notification to multiple user IDs in real time.
   */
  broadcastPush: async (userIds: string[], payload: { title: string; body: string; url?: string; tag?: string }) => {
    let sentCount = 0;
    let failedCount = 0;
    const results = await Promise.all(
      userIds.map(async (userId) => {
        const ok = await pushNotificationManager.sendPush(userId, payload, true);
        if (ok) sentCount++;
        else failedCount++;
        return { userId, ok };
      })
    );
    return { sentCount, failedCount, total: userIds.length, results };
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
      
      if (!userData.fcmToken || (userData.notificationsDisabled && !bypassActiveCheck)) {
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
        }).catch((err: any) => console.error('Failed to log skipped push delivery:', err));

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
        }).catch((err: any) => console.error('Failed to log capped push delivery:', err));

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
          android: {
            priority: 'high' as const,
            notification: {
              sound: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              priority: 'max' as const,
              channelId: 'default_channel'
            }
          },
          apns: {
            headers: {
              'apns-priority': '10',
              'apns-push-type': 'alert'
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          },
          webpush: {
            headers: {
              Urgency: 'high'
            },
            notification: {
              icon: 'https://img.icons8.com/fluency-systems-filled/96/0E7850/clock.png',
              badge: 'https://lh3.googleusercontent.com/d/1iPPiCUwdOmGZ-KScVrvOpOw0LiauXE7X',
              clickAction: msgUrl,
              tag: msgTag || 'vectorise-notif'
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
        const isUnregisteredOrInvalid =
          errorMsgLower.includes('unregistered') ||
          errorMsgLower.includes('not-registered') ||
          errorMsgLower.includes('not found') ||
          errorMsgLower.includes('invalid-registration-token') ||
          errorMsgLower.includes('invalid-argument') ||
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-argument';

        if (isUnregisteredOrInvalid) {
          console.log(`[PushManager] Clearing invalid/unregistered fcmToken for user ${userId}`);
          await userRef.update({
            fcmToken: null
          }).catch((err: any) => console.error(`Failed to clear invalid fcmToken for user ${userId}:`, err));
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
    if (!admin.apps.length) {
      console.log('[PushManager] Firebase Admin not initialized, skipping notification listener.');
      return;
    }
    console.log('[PushManager] Starting FCM notification listener...');
    
    const activeListeners = new Map<string, () => void>();

    try {
      db.collection('users')
        .where('fcmToken', '!=', null)
        .onSnapshot((usersSnapshot: any) => {
          if (!usersSnapshot || !usersSnapshot.docs) return;
          usersSnapshot.docs.forEach((userDoc: any) => {
            const userId = userDoc.id;
            if (activeListeners.has(userId)) return;

            const unsubscribe = db.collection('users').doc(userId).collection('notifications')
              .where('pushSent', '==', false)
              .onSnapshot(async (snapshot: any) => {
                if (!snapshot || !snapshot.docChanges) return;
                for (const change of snapshot.docChanges()) {
                  if (change.type === 'added') {
                    const notification = { id: change.doc.id, ...change.doc.data() } as Notification;
                    
                    // Prevent waking server from spamming old notifications created before listener attached
                    const createdAtMs = notification.createdAt ? new Date(notification.createdAt).getTime() : 0;
                    const ageMinutes = (Date.now() - createdAtMs) / (60 * 1000);
                    if (createdAtMs > 0 && ageMinutes > 10) {
                      await change.doc.ref.update({
                        pushSent: false,
                        pushFailed: true,
                        lastPushError: 'Notification created >10m ago skipped on initial listener attach'
                      }).catch(() => {});
                      continue;
                    }

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
                        processingNotifications.delete(notification.id);
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
              }, (err: any) => {
                console.error(`[PushManager] Notification listener error for user ${userId}:`, err);
              });

            activeListeners.set(userId, unsubscribe);
          });

          const activeUserIds = new Set(usersSnapshot.docs.map((d: any) => d.id));
          for (const [userId, unsubscribe] of activeListeners.entries()) {
            if (!activeUserIds.has(userId)) {
              unsubscribe();
              activeListeners.delete(userId);
            }
          }
        }, (error: any) => {
          console.error('[PushManager] User-based FCM push subscription setup error:', error);
        });
    } catch (err) {
      console.error('[PushManager] Error setting up startNotificationListener:', err);
    }
  },

  /**
   * Process and retry pending/failed notifications on a queue timer.
   */
  processPendingNotifications: async () => {
    if (!admin.apps.length) return;
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

        const candidateDocs = snapshot.docs.filter((doc: any) => {
          const data = doc.data();
          return data.pushFailed === true && (data.retryCount || 0) < 5;
        });

        for (const doc of candidateDocs) {
          const notification = { id: doc.id, ...doc.data() } as any;
          
          if (notification.isRead) continue;

          let nextRetryAt: Date | null = null;
          if (notification.nextRetryAt) {
            if (typeof notification.nextRetryAt.toDate === 'function') {
              try {
                nextRetryAt = notification.nextRetryAt.toDate();
              } catch (e) {
                nextRetryAt = null;
              }
            } else if (notification.nextRetryAt instanceof Date) {
              nextRetryAt = isNaN(notification.nextRetryAt.getTime()) ? null : notification.nextRetryAt;
            } else if (typeof notification.nextRetryAt === 'number' || typeof notification.nextRetryAt === 'string') {
              const d = new Date(notification.nextRetryAt);
              nextRetryAt = isNaN(d.getTime()) ? null : d;
            } else if (typeof notification.nextRetryAt.seconds === 'number') {
              nextRetryAt = new Date(notification.nextRetryAt.seconds * 1000);
            } else if (typeof notification.nextRetryAt._seconds === 'number') {
              nextRetryAt = new Date(notification.nextRetryAt._seconds * 1000);
            }
          }
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
    if (!admin.apps.length) return;
    console.log('[PushManager] Processing notification triggers...');
    const now = new Date();
    const currentHour = now.getHours();
    
    // Fetch system configurations from Firestore with default values as fallbacks
    const DEFAULT_SYSTEM_REMINDERS = {
      unlockHour: 8,
      unlockTitle: "Today’s Focus: {sprintTitle}",
      unlockBody: "Day {currentDay} starts now. This step moves you forward. Start Task.",
      middayHour: 15,
      middayTitle: "You haven’t completed today’s step ({sprintTitle})",
      middayBody: "Day {currentDay} is still open. Get it done before the day slips. Start Task.",
      eveningHour: 20,
      eveningTitle: "Don’t break the streak ({sprintTitle})",
      eveningBody: "Finish Day {currentDay} before today ends. Keep your momentum. Start Task.",
      inactivityHour: 10,
      nudge_1: "Missing your momentum? Day {day} is waiting for you in '{title}'.",
      nudge_2: "Your growth cycle is stalling. Let's get back to it and finish Day {day} of '{title}'.",
      nudge_4: "Consistency is the only bridge to mastery. Resume '{title}' now to stay on track.",
      nudge_7: "It's been a week since your last win. Re-ignite your spark in '{title}' before it fades.",
      nudge_10: "The path is still there. One small win today changes everything for your '{title}' journey.",
      nudge_15: "Your '{title}' sprint is at high risk of abandonment. Your future self is counting on you to finish."
    };

    let systemConfig = DEFAULT_SYSTEM_REMINDERS;
    try {
      const configSnap = await db.collection('system_notifications').doc('active_reminders').get();
      if (configSnap.exists) {
        systemConfig = { ...DEFAULT_SYSTEM_REMINDERS, ...configSnap.data() };
      }
    } catch (e) {
      console.error('[PushManager] Failed to fetch system reminders config, using hardcoded fallbacks:', e);
    }

    const getReplacedMessage = (templateStr: string, replacements: Record<string, string | number>) => {
      let result = templateStr;
      Object.entries(replacements).forEach(([key, val]) => {
        result = result.replace(new RegExp(`{${key}}`, 'g'), String(val));
      });
      return result;
    };

    // 1. Get all users with FCM tokens
    const usersSnap = await db.collection('users')
      .where('fcmToken', '!=', null)
      .get();
    
    console.log(`[PushManager] Found ${usersSnap.size} users with active FCM tokens.`);

    const getUserTimezoneDetails = (userDate: Date, uData: Participant) => {
      const tz = (uData as any).tz || (uData as any).timezone || (uData as any).timeZone;
      if (tz && typeof tz === 'string') {
        try {
          const hourStr = userDate.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false });
          const minStr = userDate.toLocaleString('en-US', { timeZone: tz, minute: 'numeric' });
          const localHour = parseInt(hourStr, 10) % 24;
          const localMinute = parseInt(minStr, 10) % 60;
          const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(userDate);
          return { 
            localHour: isNaN(localHour) ? userDate.getHours() : localHour, 
            localMinute: isNaN(localMinute) ? userDate.getMinutes() : localMinute,
            dateStr 
          };
        } catch (e) {}
      }
      if (typeof (uData as any).timezoneOffsetMinutes === 'number') {
        const utcMs = userDate.getTime() + (userDate.getTimezoneOffset() * 60000);
        const userTime = new Date(utcMs - ((uData as any).timezoneOffsetMinutes * 60000));
        return { 
          localHour: userTime.getHours(), 
          localMinute: userTime.getMinutes(),
          dateStr: userTime.toISOString().split('T')[0] 
        };
      }
      return { 
        localHour: userDate.getHours(), 
        localMinute: userDate.getMinutes(),
        dateStr: userDate.toISOString().split('T')[0] 
      };
    };

    for (const userDoc of usersSnap.docs) {
      const user = { id: userDoc.id, ...userDoc.data() } as Participant;
      
      // Pre-send filter checks: skip users without valid FCM token, with notifications disabled, paused notification state, or disabled check-in reminders
      if (!user.fcmToken) {
        console.log(`[PushManager] Skipping user ${user.id} - missing fcmToken.`);
        continue;
      }
      if (user.notificationsDisabled) {
        console.log(`[PushManager] Skipping trigger processing for user ${user.id} - notifications disabled.`);
        continue;
      }
      if ((user as any).notificationState && (user as any).notificationState === 'Paused') {
        console.log(`[PushManager] Skipping user ${user.id} - notificationState is Paused.`);
        continue;
      }
      if ((user as any).checkInReminderEnabled === false) {
        console.log(`[PushManager] Skipping user ${user.id} - checkInReminderEnabled is false.`);
        continue;
      }

      const { localHour, localMinute, dateStr } = getUserTimezoneDetails(now, user);

      // Check if user is actively in the web app right now (within last 3 minutes)
      const isUserActiveNow = !!(user.lastActivityAt && 
        (now.getTime() - new Date(user.lastActivityAt).getTime()) < 3 * 60 * 1000);

      const lastSentAt = user.lastNotificationSentAt ? new Date(user.lastNotificationSentAt) : null;
      const sentToday = lastSentAt && lastSentAt.toISOString().split('T')[0] === dateStr;

      // Get active enrollments for user
      const enrollmentsSnap = await db.collection('users').doc(user.id).collection('enrollments')
        .where('status', '==', 'active')
        .get();

      if (enrollmentsSnap.empty) continue;

      for (const enrollDoc of enrollmentsSnap.docs) {
        const enrollment = { id: enrollDoc.id, ...enrollDoc.data() } as ParticipantSprint;
        let sprintSnap = await db.collection('experiences').doc('Sprint').collection('items').doc(enrollment.sprint_id).collection('sprintdetails').doc('info').get();
        if (!sprintSnap.exists) {
          sprintSnap = await db.collection('experiences').doc('RiseBlog').collection('items').doc(enrollment.sprint_id).collection('sprintdetails').doc('info').get();
        }
        if (!sprintSnap.exists) {
          sprintSnap = await db.collection('experiences').doc('Ignite').collection('items').doc(enrollment.sprint_id).collection('sprintdetails').doc('info').get();
        }
        if (!sprintSnap.exists) {
          sprintSnap = await db.collection('experiences').doc('Challenge').collection('items').doc(enrollment.sprint_id).collection('sprintdetails').doc('info').get();
        }
        if (!sprintSnap.exists) {
          sprintSnap = await db.collection('experiences').doc(enrollment.sprint_id).collection('sprintdetails').doc('info').get();
        }
        const sprint = sprintSnap.exists ? sprintSnap.data() as Sprint : null;

        // Check if today's task is completed
        const currentDay = enrollment.progress.find(p => !p.completed)?.day || enrollment.progress.length;
        const todayProgress = enrollment.progress.find(p => p.day === currentDay);
        const isTaskCompleted = todayProgress?.completed || false;

        // If today's task is completed, no reminder needed for this sprint today
        if (isTaskCompleted) continue;

        // Robust calculation of last active timestamp across user logins and actual task progress submissions
        const dates = [
          user.lastActivityAt ? new Date(user.lastActivityAt) : null,
          enrollment.last_activity_at ? new Date(enrollment.last_activity_at) : null,
          user.createdAt ? new Date(user.createdAt) : null
        ].filter((d): d is Date => d !== null && !isNaN(d.getTime()));

        const lastActivity = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
        const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
        const daysSinceActivity = Math.floor(hoursSinceActivity / 24);

        // Inactivity or Missed Days Nudges (Processed strictly at user's local inactivity hour)
        if (localHour === (systemConfig.inactivityHour ?? 10) && daysSinceActivity >= 1) {
          const milestones = [1, 2, 4, 7, 10, 15];
          const currentMilestone = [...milestones].reverse().find(m => daysSinceActivity >= m);
          
          if (currentMilestone) {
            const alreadyNudged = (enrollment.sentNudges || []).includes(currentMilestone);
            if (!alreadyNudged && !sentToday) {
              if (isUserActiveNow) {
                // User is actively in the web app, acknowledge nudge handled
                await enrollDoc.ref.update({
                  sentNudges: admin.firestore.FieldValue.arrayUnion(currentMilestone)
                }).catch(() => {});
              } else {
                const nextDay = enrollment.progress.findIndex(p => !p.completed) + 1 || 1;
                const template = systemConfig[`nudge_${currentMilestone}` as keyof typeof systemConfig] || DEFAULT_SYSTEM_REMINDERS[`nudge_${currentMilestone}` as keyof typeof DEFAULT_SYSTEM_REMINDERS];
                const message = getReplacedMessage(String(template), {
                  day: nextDay.toString(),
                  title: sprint?.title || 'your sprint'
                });
                
                const success = await pushNotificationManager.sendPush(user.id, {
                  title: 'Resume Sprint',
                  body: message,
                  url: `/participant/sprint/${enrollment.id}?day=${nextDay}`,
                  tag: 'sprint_nudge'
                }, true);

                if (success) {
                  await enrollDoc.ref.update({
                    sentNudges: admin.firestore.FieldValue.arrayUnion(currentMilestone)
                  }).catch((e: any) => console.error('[PushManager] Failed to update sentNudges:', e));
                }
              }
              continue;
            }
          }
        }

        // Check if enrollment has custom sprint reminderConfig configured
        const reminderConfig = (enrollment as any).reminderConfig;
        if (reminderConfig && reminderConfig.enabled) {
          const scheduledTime = reminderConfig.taskReminders?.[currentDay] || reminderConfig.dailyTime || '09:00';
          const [schedHStr, schedMStr] = (scheduledTime || '09:00').split(':');
          const schedHour = parseInt(schedHStr, 10);
          const schedMin = parseInt(schedMStr, 10);

          if (!isNaN(schedHour) && !isNaN(schedMin)) {
            const lastCustomSent = (enrollment as any).lastCustomReminderSentDate;
            const alreadySentCustom = lastCustomSent === dateStr;

            if (!alreadySentCustom) {
              // Due if at or past scheduled time within a 2-hour delivery grace window
              const isDue = (localHour === schedHour && localMinute >= schedMin) || 
                            (localHour > schedHour && localHour <= schedHour + 2);

              if (isDue) {
                if (isUserActiveNow) {
                  // User is active in web app right now, mark satisfied without buzzing device
                  await enrollDoc.ref.update({
                    lastCustomReminderSentDate: dateStr,
                    lastCustomReminderSentAt: now.toISOString()
                  }).catch(() => {});
                } else {
                  // User is away, deliver FCM push notification!
                  const sprintTitle = sprint?.title || reminderConfig.sprintTitle || 'Your Sprint';
                  const notifTitle = `Today’s Focus: ${sprintTitle}`;
                  const notifBody = `Day ${currentDay} starts now. This step moves you forward. Start Task.`;
                  
                  console.log(`[PushManager] Delivering custom sprint reminder push to user ${user.id} (Day ${currentDay}, scheduled ${scheduledTime}, local ${localHour}:${localMinute})`);
                  const success = await pushNotificationManager.sendPush(user.id, {
                    title: notifTitle,
                    body: notifBody,
                    url: `/participant/sprint/${enrollment.id}`,
                    tag: `sprint-reminder-${enrollment.sprint_id}`
                  });

                  if (success) {
                    await enrollDoc.ref.update({
                      lastCustomReminderSentDate: dateStr,
                      lastCustomReminderSentAt: now.toISOString()
                    }).catch((e: any) => console.error('[PushManager] Failed to update lastCustomReminderSentDate:', e));

                    await userDoc.ref.update({
                      lastNotificationSentAt: now.toISOString()
                    }).catch(() => {});
                  }
                }
              }
            }
          }
          // Custom schedule was processed for this sprint, skip system default unlock
          continue;
        }

        // Active Reminders - System Default Schedule
        const sprintTitle = sprint?.title || 'Gain Clarity First';
        const replaceParams = {
          sprintTitle: sprintTitle,
          title: sprintTitle,
          currentDay: currentDay
        };

        const formatPushTitle = (titleTemplate: string) => {
          let tmpl = titleTemplate || '';
          if (!tmpl.includes('{sprintTitle}') && !tmpl.includes('{title}')) {
            tmpl = `${tmpl} (${sprintTitle})`;
          }
          return getReplacedMessage(tmpl, replaceParams);
        };

        const userRef = db.collection('users').doc(user.id);
        const userData = userDoc.data() as any;

        // Daily Unlock
        if (localHour === systemConfig.unlockHour) {
          const lastUnlock = userData.lastDailyUnlockSentAt;
          const alreadySentUnlock = lastUnlock && lastUnlock.startsWith(dateStr);
          if (!alreadySentUnlock) {
            if (isUserActiveNow) {
              await userRef.update({
                lastDailyUnlockSentAt: dateStr,
                lastNotificationSentAt: now.toISOString()
              }).catch(() => {});
            } else {
              const success = await pushNotificationManager.sendPush(user.id, {
                title: formatPushTitle(systemConfig.unlockTitle),
                body: getReplacedMessage(systemConfig.unlockBody, replaceParams),
                url: `/participant/sprint/${enrollment.id}`,
                tag: 'daily-unlock'
              });
              if (success) {
                await userRef.update({
                  lastDailyUnlockSentAt: dateStr,
                  lastNotificationSentAt: now.toISOString()
                }).catch((e: any) => console.error('[PushManager] Failed to update lastDailyUnlockSentAt:', e));
              }
            }
          }
        }
        // Quick Check
        else if (localHour === systemConfig.middayHour) {
          const lastMidday = userData.lastMiddayCheckSentAt;
          const alreadySentMidday = lastMidday && lastMidday.startsWith(dateStr);
          if (!alreadySentMidday) {
            if (isUserActiveNow) {
              await userRef.update({
                lastMiddayCheckSentAt: dateStr,
                lastNotificationSentAt: now.toISOString()
              }).catch(() => {});
            } else {
              const success = await pushNotificationManager.sendPush(user.id, {
                title: formatPushTitle(systemConfig.middayTitle),
                body: getReplacedMessage(systemConfig.middayBody, replaceParams),
                url: `/participant/sprint/${enrollment.id}`,
                tag: 'midday-check'
              });
              if (success) {
                await userRef.update({
                  lastMiddayCheckSentAt: dateStr,
                  lastNotificationSentAt: now.toISOString()
                }).catch((e: any) => console.error('[PushManager] Failed to update lastMiddayCheckSentAt:', e));
              }
            }
          }
        }
        // Evening Reminder
        else if (localHour === systemConfig.eveningHour) {
          const lastEvening = userData.lastEveningReminderSentAt;
          const alreadySentEvening = lastEvening && lastEvening.startsWith(dateStr);
          if (!alreadySentEvening) {
            if (isUserActiveNow) {
              await userRef.update({
                lastEveningReminderSentAt: dateStr,
                lastNotificationSentAt: now.toISOString()
              }).catch(() => {});
            } else {
              const success = await pushNotificationManager.sendPush(user.id, {
                title: formatPushTitle(systemConfig.eveningTitle),
                body: getReplacedMessage(systemConfig.eveningBody, replaceParams),
                url: `/participant/sprint/${enrollment.id}`,
                tag: 'evening-reminder'
              });
              if (success) {
                await userRef.update({
                  lastEveningReminderSentAt: dateStr,
                  lastNotificationSentAt: now.toISOString()
                }).catch((e: any) => console.error('[PushManager] Failed to update lastEveningReminderSentAt:', e));
              }
            }
          }
        }
      }
    }
  }
};
