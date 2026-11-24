import admin, { db } from '../lib/firebaseAdmin.js';
import { VAPID_PUBLIC_KEY } from '../../utils/vapid.js';
import crypto from 'crypto';
import type { Request, Response } from 'express';

type NotificationOperation = 'vapid-key' | 'subscribe' | 'send';

function resolveOperation(req: Request): NotificationOperation | null {
  const rawOp = String(
    req.query?.operation ??
      req.query?.action ??
      req.body?.operation ??
      req.body?.action ??
      ''
  )
    .trim()
    .toLowerCase();

  if (
    rawOp === 'vapid' ||
    rawOp === 'vapid-key' ||
    rawOp === 'vapid_key' ||
    rawOp === 'get-vapid-key' ||
    rawOp === 'getvapidkey' ||
    rawOp === 'public-key'
  ) {
    return 'vapid-key';
  }
  if (rawOp === 'subscribe' || rawOp === 'subscribe-user') {
    return 'subscribe';
  }
  if (rawOp === 'send' || rawOp === 'send-notification') {
    return 'send';
  }

  // Path-based inference for mounted route aliases
  const path = (req.path || req.originalUrl || '').toLowerCase();
  if (path.includes('vapid-key')) return 'vapid-key';
  if (path.includes('subscribe')) return 'subscribe';
  if (path.endsWith('/send')) return 'send';

  // Method & payload inference on /api/notifications
  if (req.method === 'GET') {
    return 'vapid-key';
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const body = req.body || {};
    if (body.fcmToken || body.subscription) {
      return 'subscribe';
    }
    return 'send';
  }

  return null;
}

async function handleGetVapidKey(_req: Request, res: Response) {
  try {
    if (!VAPID_PUBLIC_KEY) {
      return res.status(500).json({ error: 'VAPID key missing' });
    }

    return res.status(200).json({
      publicKey: VAPID_PUBLIC_KEY,
    });
  } catch (error) {
    console.error('[API Notifications] VAPID error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleSubscribe(req: Request, res: Response) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, fcmToken, subscription, timezone, timezoneOffsetMinutes } =
    req.body || {};
  const token: string | undefined = fcmToken || subscription;

  if (!token) {
    return res.status(400).json({ error: 'Missing fcmToken reference' });
  }

  try {
    const userDocId = userId && userId !== 'anonymous' ? userId : 'anonymous';

    // 1. Update user document in Firestore
    if (userDocId !== 'anonymous') {
      try {
        const userUpdates: Record<string, any> = {
          fcmToken: token,
          notificationsDisabled: false,
          lastActivityAt: new Date().toISOString(),
          pushSubscriptionInvalidCount: 0,
        };
        if (timezone || typeof timezoneOffsetMinutes === 'number') {
          userUpdates.timezone = timezone || 'UTC';
          userUpdates.tz = timezone || 'UTC';
          userUpdates.timezoneOffsetMinutes =
            typeof timezoneOffsetMinutes === 'number' ? timezoneOffsetMinutes : 0;
        }
        await db.collection('users').doc(userDocId).update(userUpdates);
        console.log(`[API Notifications] Updated user ${userDocId} with FCM token`);
      } catch (userErr: any) {
        console.warn(
          `[API Notifications] Could not update user ${userDocId}:`,
          userErr?.message || userErr
        );
      }
    }

    // 2. Save to subscriptions subcollection (deduplicated via MD5 hash of fcmToken)
    const docId = crypto.createHash('md5').update(token).digest('hex');

    await db
      .collection('users')
      .doc(userDocId)
      .collection('subscriptions')
      .doc(docId)
      .set({
        userId: userDocId,
        fcmToken: token,
        createdAt: new Date(),
      });

    console.log(`[API Notifications] Saved subscription ID: ${docId}`);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[API Notifications] Error saving subscription:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to save subscription',
    });
  }
}

async function handleSendNotification(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      userIds,
      title = '🔥 It works!',
      body = 'Push from FCM-backed system',
      url = '/',
      tag = 'daily-unlock',
    } = req.body || {};

    let subs: Array<{ ref?: any; fcmToken?: string }> = [];

    const targetIds: string[] = Array.isArray(userIds)
      ? userIds.filter(Boolean)
      : userId
        ? [userId]
        : [];

    if (targetIds.length > 0) {
      for (const uid of targetIds) {
        const subSnap = await db
          .collection('users')
          .doc(uid)
          .collection('subscriptions')
          .get();

        if (!subSnap.empty) {
          subSnap.docs.forEach((doc: any) => {
            subs.push({ ref: doc.ref, ...(doc.data() as any) });
          });
        } else {
          const userSnap = await db.collection('users').doc(uid).get();
          const userData = userSnap.exists ? (userSnap.data() as any) : null;
          if (userData?.fcmToken) {
            subs.push({ fcmToken: userData.fcmToken });
          }
        }
      }
    } else {
      const snapshot = await db.collectionGroup('subscriptions').get();
      if (!snapshot.empty) {
        subs = snapshot.docs.map((doc: any) => ({
          ref: doc.ref,
          ...(doc.data() as any),
        }));
      }
    }

    if (subs.length === 0) {
      return res.status(200).json({ message: 'No subscribers found', results: [] });
    }

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const fcmToken = sub.fcmToken;
        if (!fcmToken) {
          console.warn('[API Notifications] Skipping subscription doc without fcmToken');
          return;
        }

        console.log(
          `[API Notifications] Attempting FCM push to token: ${fcmToken.substring(0, 25)}...`
        );

        try {
          const message = {
            token: fcmToken,
            notification: {
              title: String(title),
              body: String(body),
            },
            data: {
              url: String(url),
              tag: String(tag),
            },
            android: {
              priority: 'high' as const,
              notification: {
                sound: 'default',
                priority: 'max' as const,
                channelId: 'default_channel',
              },
            },
            apns: {
              headers: {
                'apns-priority': '10',
                'apns-push-type': 'alert',
              },
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            },
            webpush: {
              headers: {
                Urgency: 'high',
              },
              notification: {
                icon: 'https://img.icons8.com/fluency-systems-filled/96/0E7850/clock.png',
                badge: 'https://lh3.googleusercontent.com/d/1iPPiCUwdOmGZ-KScVrvOpOw0LiauXE7X',
                clickAction: String(url),
              },
            },
          };

          const resultId = await admin.messaging().send(message);
          console.log(
            `[API Notifications] Success for token: ${fcmToken.substring(0, 25)}... Response: ${resultId}`
          );
          return resultId;
        } catch (err: any) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(
            `[API Notifications] Failure for token: ${fcmToken.substring(0, 25)}... Error:`,
            errMsg
          );

          const errMsgLower = errMsg.toLowerCase();
          const isUnregisteredOrInvalid =
            errMsgLower.includes('unregistered') ||
            errMsgLower.includes('not-registered') ||
            errMsgLower.includes('not found') ||
            errMsgLower.includes('invalid-registration-token') ||
            errMsgLower.includes('invalid-argument') ||
            err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-argument';

          if (isUnregisteredOrInvalid && sub.ref) {
            console.log(
              `[API Notifications] Removing invalid subscription token: ${fcmToken.substring(0, 25)}...`
            );
            await sub.ref.delete().catch(() => {});
          }
          throw err;
        }
      })
    );

    return res.status(200).json({ results });
  } catch (err) {
    console.error('[API Notifications] Error sending notifications:', err);
    return res.status(500).json({ error: 'Failed to send notifications' });
  }
}

export default async function handler(req: Request, res: Response) {
  const operation = resolveOperation(req);

  switch (operation) {
    case 'vapid-key':
      return handleGetVapidKey(req, res);
    case 'subscribe':
      return handleSubscribe(req, res);
    case 'send':
      return handleSendNotification(req, res);
    default:
      return res.status(400).json({
        error:
          'Unsupported notification operation. Valid operations: "vapid-key", "subscribe", "send".',
      });
  }
}
