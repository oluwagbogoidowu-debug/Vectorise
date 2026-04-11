import { db } from '../lib/firebaseAdmin';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, subscription } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    console.error('[API Subscribe] Invalid subscription object:', req.body);
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const { endpoint, keys } = subscription;

  try {
    // 1. Update the user document directly so pushNotificationManager can find it
    if (userId && userId !== 'anonymous') {
      try {
        await db.collection('users').doc(userId).update({
          pushSubscription: subscription,
          notificationsDisabled: false,
          lastActivityAt: new Date().toISOString()
        });
        console.log(`[API Subscribe] Updated user ${userId} with push subscription`);
      } catch (userErr) {
        console.warn(`[API Subscribe] Could not update user ${userId} (might not exist):`, userErr.message);
        // We continue even if user update fails, as we still want to save the subscription
      }
    }

    // 2. Save to the global subscriptions collection
    // We use a hash of the endpoint as the document ID to avoid length/character issues
    const docId = crypto.createHash('md5').update(endpoint).digest('hex');

    await db.collection('subscriptions').doc(docId).set({
      userId: userId || 'anonymous',
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      createdAt: new Date(),
    });

    console.log(`[API Subscribe] Saved subscription to global collection: ${docId}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[API Subscribe] Error saving subscription:', err);
    res.status(500).json({ error: err.message || 'Failed to save subscription' });
  }
}
