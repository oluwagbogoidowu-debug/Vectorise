import { db } from './lib/firebaseAdmin.js';
import crypto from 'crypto';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[API Subscribe] Incoming body:', req.body);

  const { userId, fcmToken } = req.body || {};

  if (!fcmToken) {
    return res.status(400).json({ error: 'Missing fcmToken reference' });
  }

  try {
    // 1. Update user document in Firestore
    if (userId && userId !== 'anonymous') {
      try {
        await db.collection('users').doc(userId).update({
          fcmToken: fcmToken,
          notificationsDisabled: false,
          lastActivityAt: new Date().toISOString()
        });

        console.log(`[API Subscribe] Updated user ${userId} with FCM token`);
      } catch (userErr: any) {
        console.warn(
          `[API Subscribe] Could not update user ${userId}:`,
          userErr.message
        );
      }
    }

    // 2. Save to subscriptions collection (preventing duplicates using an MD5 hash of fcmToken)
    const docId = crypto
      .createHash('md5')
      .update(fcmToken)
      .digest('hex');

    const userDocId = userId || 'anonymous';
    await db.collection('users').doc(userDocId).collection('subscriptions').doc(docId).set({
      userId: userDocId,
      fcmToken: fcmToken,
      createdAt: new Date(),
    });

    console.log(`[API Subscribe] Saved subscription ID: ${docId}`);

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error('[API Subscribe] Error saving subscription:', err);

    return res.status(500).json({
      error: err.message || 'Failed to save subscription'
    });
  }
}
