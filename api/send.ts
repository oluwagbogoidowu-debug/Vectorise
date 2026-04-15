import webpush from '../utils/webpush.js';
import { db } from './lib/firebaseAdmin.js';
import type { Request, Response } from 'express';
import crypto from 'crypto';

export default async function handler(req: Request, res: Response) {
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
      subs.map(sub => {
        console.log(`[API Send] Attempting push to: ${sub.endpoint.substring(0, 50)}...`);
        return webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        ).then(res => {
          console.log(`[API Send] Success for: ${sub.endpoint.substring(0, 50)}... Status: ${res.statusCode}`);
          return res;
        }).catch(async (err) => {
          console.error(`[API Send] Failure for: ${sub.endpoint.substring(0, 50)}... Error:`, err.message);
          if (err.body) console.error(`[API Send] Error body:`, err.body);
          
          // If the subscription is no longer valid, remove it from Firestore
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Removing invalid subscription: ${sub.endpoint}`);
            const docId = crypto.createHash('md5').update(sub.endpoint).digest('hex');
            await db.collection('subscriptions').doc(docId).delete();
          }
          throw err;
        });
      })
    );

    res.status(200).json({ results });
  } catch (err) {
    console.error('Error sending notifications:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
}
