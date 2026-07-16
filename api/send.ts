import admin, { db } from './lib/firebaseAdmin.js';
import type { Request, Response } from 'express';
import crypto from 'crypto';

export default async function handler(req: Request, res: Response) {
  try {
    const snapshot = await db.collectionGroup('subscriptions').get();

    if (snapshot.empty) {
      return res.status(200).json({ message: 'No subscribers found' });
    }

    const subs = snapshot.docs.map(doc => ({
      ref: doc.ref,
      ...doc.data() as any
    }));

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const fcmToken = sub.fcmToken;
        if (!fcmToken) {
          console.warn(`[API Send] Skipping subscription doc without fcmToken`);
          return;
        }

        console.log(`[API Send] Attempting FCM push to token: ${fcmToken.substring(0, 25)}...`);

        try {
          const message = {
            token: fcmToken,
            notification: {
              title: '🔥 It works!',
              body: 'Push from FCM-backed system'
            },
            data: {
              url: '/',
              tag: 'daily-unlock'
            },
            android: {
              priority: 'high' as const,
              notification: {
                sound: 'default',
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
                clickAction: '/'
              }
            }
          };

          const resultId = await admin.messaging().send(message);
          console.log(`[API Send] Success for token: ${fcmToken.substring(0, 25)}... Response: ${resultId}`);
          return resultId;
        } catch (err: any) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[API Send] Failure for token: ${fcmToken.substring(0, 25)}... Error:`, errMsg);
          
          const errMsgLower = errMsg.toLowerCase();
          if (
            errMsgLower.includes('not-registered') ||
            errMsgLower.includes('invalid-registration-token') ||
            errMsgLower.includes('invalid-argument') ||
            err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-argument'
          ) {
            console.log(`Removing invalid subscription token: ${fcmToken.substring(0, 25)}...`);
            await sub.ref.delete().catch(() => {});
          }
          throw err;
        }
      })
    );

    res.status(200).json({ results });
  } catch (err) {
    console.error('Error sending notifications:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
}
