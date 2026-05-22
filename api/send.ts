import webpush from '../utils/webpush.js';
import { db } from './lib/firebaseAdmin.js';
import type { Request, Response } from 'express';
import crypto from 'crypto';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, title, body, url } = req.body;

    // 🔒 Basic validation
    if (!userId || !title || !body) {
      return res.status(400).json({
        error: 'Missing required fields: userId, title, body',
      });
    }

    // 📦 Get subscriptions for this user ONLY
    const snapshot = await db
      .collection('subscriptions')
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({
        message: 'No subscriptions for user',
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      tag: 'app-notification',
    });

    const results = await Promise.allSettled(
      snapshot.docs.map(async (doc) => {
        const sub = doc.data();

        try {
          const response = await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );

          console.log(`[Push] Success → ${userId}`);
          return response;
        } catch (err: any) {
          console.error(`[Push] Failed → ${userId}`, err.message);

          // 🧹 Clean up dead subscriptions
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`[Push] Removing invalid subscription`);

            const docId = crypto
              .createHash('md5')
              .update(sub.endpoint)
              .digest('hex');

            await db.collection('subscriptions').doc(docId).delete();
          }

          throw err;
        }
      })
    );

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (err) {
    console.error('[Push] Fatal error:', err);

    return res.status(500).json({
      error: 'Failed to send push notifications',
    });
  }
}
