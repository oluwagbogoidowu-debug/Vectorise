import webpush from '../utils/webpush';
import { db } from '../lib/firebaseAdmin';

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection('subscriptions').get();

    if (snapshot.empty) {
      return res.status(200).json({ message: 'No subscribers found' });
    }

    const subs = snapshot.docs.map(doc => doc.data());

    const payload = JSON.stringify({
      title: '🔥 It works!',
      body: 'Push from Firebase-backed system',
      url: '/'
    });

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        ).catch(async (err) => {
          // If the subscription is no longer valid, remove it from Firestore
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Removing invalid subscription: ${sub.endpoint}`);
            const docId = encodeURIComponent(sub.endpoint);
            await db.collection('subscriptions').doc(docId).delete();
          }
          throw err;
        })
      )
    );

    res.status(200).json({ results });
  } catch (err) {
    console.error('Error sending notifications:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
}
