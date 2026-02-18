import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK for backend fulfillment
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'))
    });
  } catch (e) {
    // Fallback for environments with automatic auth
    admin.initializeApp();
  }
}

const db = admin.firestore();

/**
 * Flutterwave Webhook Handler
 * Verifies transaction integrity and fulfills product delivery.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // 1. Verify Flutterwave Signature
  // Flutterwave sends a secret hash in the 'verif-hash' header
  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== secretHash) {
    console.error("[Webhook] Authorization failed: Invalid or missing verif-hash.");
    return res.status(401).end();
  }

  try {
    const payload = req.body;
    
    // 2. Filter for successful completed charges
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const { tx_ref, amount, customer, id: flw_id, meta } = payload.data;
      const email = customer.email.toLowerCase().trim();
      const now = new Date().toISOString();

      console.log(`[Webhook] Processing fulfillment for ${tx_ref} (${email})`);

      // 3. Update Payment Record
      // We assume tx_ref is the unique identifier for the payment attempt
      const paymentRef = db.collection('payments').doc(tx_ref);
      const paymentDoc = await paymentRef.get();

      // Idempotency check: Don't process twice
      if (paymentDoc.exists && paymentDoc.data()?.status === 'success') {
        console.log(`[Webhook] Payment ${tx_ref} already fulfilled.`);
        return res.status(200).send('Already Processed');
      }

      await paymentRef.set({
        status: 'success',
        completedAt: now,
        provider_transaction_id: flw_id,
        amount: amount,
        email: email,
        updatedAt: now
      }, { merge: true });

      // 4. Sprint Access Logic
      // Find the user by verified email
      const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
      
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Get Sprint ID from metadata or previous record
        const sprintId = meta?.sprintId || paymentDoc.data()?.sprintId;
        
        if (sprintId) {
          const enrollmentId = `enrollment_${userId}_${sprintId}`;
          const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
          
          // Get Sprint Duration for path initialization
          const sprintSnap = await db.collection('sprints').doc(sprintId).get();
          const sprintData = sprintSnap.data();
          const duration = sprintData?.duration || 7;

          // Create/Update Enrollment Record
          await enrollmentRef.set({
            id: enrollmentId,
            sprint_id: sprintId,
            user_id: userId,
            coach_id: sprintData?.coachId || '',
            started_at: now,
            price_paid: amount,
            payment_source: userData.referrerId ? 'influencer' : 'direct',
            referral_source: userData.referrerId || null,
            status: 'active',
            last_activity_at: now,
            progress: Array.from({ length: duration }, (_, i) => ({ 
              day: i + 1, 
              completed: false 
            }))
          }, { merge: true });

          // Log Fulfillment Event for Analytics
          await db.collection('user_events').add({
            userId,
            eventType: 'sprint_enrolled',
            sprintId,
            timestamp: now,
            metadata: { method: 'webhook_fulfillment', tx_ref, flw_id }
          });

          // Create In-App Notification
          await db.collection('notifications').add({
            userId,
            type: 'payment_success',
            title: 'Path Authorized',
            body: `Registry verified for your sprint. You can now begin Day 1.`,
            isRead: false,
            createdAt: now,
            actionUrl: `/participant/sprint/${enrollmentId}?day=1`
          });

          console.log(`[Webhook] Fulfillment successful for User ${userId}, Sprint ${sprintId}`);
        } else {
          console.warn(`[Webhook] Fulfillment aborted: Missing sprintId in metadata for ${tx_ref}`);
        }
      } else {
        console.warn(`[Webhook] User record not found for ${email}. Manual identity merge required.`);
        // Note: In Vectorise, if email isn't found, the PaymentSuccess page handles 
        // identity establishment by redirecting the user to signup with the prefilled email.
      }
    }

    return res.status(200).send('Webhook Received');
  } catch (error: any) {
    console.error("[Webhook] Critical fulfillment failure:", error);
    return res.status(500).json({ error: error.message });
  }
}
