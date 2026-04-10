import { db } from '../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, subscription } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const { endpoint, keys } = subscription;

  try {
    // We use the endpoint as the document ID. 
    // Note: Firestore document IDs can't contain forward slashes, so we encode it.
    const docId = encodeURIComponent(endpoint);

    await db.collection('subscriptions').doc(docId).set({
      userId: userId || 'anonymous',
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      createdAt: new Date(),
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
}
