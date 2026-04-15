import { db } from './lib/firebaseAdmin.js';
import crypto from 'crypto';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔍 Log incoming request (VERY important for debugging)
  console.log('[API Subscribe] Incoming body:', req.body);

  const { userId, subscription } = req.body || {};

  // ✅ Stronger validation with clearer feedback
  if (!subscription) {
    return res.status(400).json({ error: 'Missing subscription object' });
  }

  const { endpoint, keys } = subscription;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint' });
  }

  if (!keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: 'Missing subscription keys' });
  }

  try {
    // 1. Update user document (optional but useful)
    if (userId && userId !== 'anonymous') {
      try {
        await db.collection('users').doc(userId).update({
          pushSubscription: subscription,
          notificationsDisabled: false,
          lastActivityAt: new Date().toISOString()
        });

        console.log(`[API Subscribe] Updated user ${userId}`);
      } catch (userErr: any) {
        console.warn(
          `[API Subscribe] Could not update user ${userId}:`,
          userErr.message
        );
        // continue anyway
      }
    }

    // 2. Save to subscriptions collection
    const docId = crypto
      .createHash('md5')
      .update(endpoint)
      .digest('hex');

    await db.collection('subscriptions').doc(docId).set({
      userId: userId || 'anonymous',
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      createdAt: new Date(),
    });

    console.log(`[API Subscribe] Saved subscription: ${docId}`);

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error('[API Subscribe] Error saving subscription:', err);

    return res.status(500).json({
      error: err.message || 'Failed to save subscription'
    });
  }
}
