import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK for backend fulfillment
if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = 'vectorise-f19d4';

    if (serviceAccountVar) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountVar)),
        projectId: projectId
      });
    } else {
      admin.initializeApp({
        projectId: projectId
      });
    }
  } catch (e: any) {
    console.error("[WebhookV2] Firebase Init Error:", e.message);
  }
}

const db = admin.firestore();

/**
 * Flutterwave Webhook Handler
 * Secure backend-to-backend fulfillment for growth sprints.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Accept only POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // 2. Read and Verify Flutterwave Signature
  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== secretHash) {
    console.error("[Webhook] Unauthorized: Invalid verif-hash signature.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = req.body;
    
    // 3. Filter for successful completed charges only
    if (payload.event !== 'charge.completed' || payload.data.status !== 'successful') {
      console.log(`[Webhook] Event ignored: ${payload.event} with status ${payload.data?.status}`);
      return res.status(200).send('Event received but ignored.');
    }

    const { tx_ref, amount, currency, customer, id: flw_id } = payload.data;
    const email = customer.email.toLowerCase().trim();

    console.log(`[Webhook] Processing verified fulfillment: ${tx_ref} (${currency} ${amount})`);

    // 4. Find the payment record (Source of Truth)
    const paymentRef = db.collection('payments').doc(tx_ref);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      console.error(`[Webhook] Payment record ${tx_ref} not found in registry.`);
      return res.status(404).json({ error: "Payment record not found" });
    }

    const paymentData = paymentDoc.data();

    // 5. Integrity & Idempotency Checks
    if (paymentData?.status === 'successful' || paymentData?.status === 'success') {
      console.log(`[Webhook] Transaction ${tx_ref} already processed. Returning 200.`);
      return res.status(200).send('Already Processed');
    }

    // STRICT MATCHING: Amount and Currency must match what we initiated
    if (Number(amount) !== Number(paymentData?.amount) || currency !== paymentData?.currency) {
      console.error(`[Webhook] INTEGRITY BREACH: Amount/Currency mismatch for ${tx_ref}. Webhook: ${currency} ${amount}, DB: ${paymentData?.currency} ${paymentData?.amount}`);
      await paymentRef.update({ status: 'failed', failureReason: 'Integrity mismatch detected on webhook' });
      return res.status(400).json({ error: "Integrity mismatch" });
    }

    const { userId, sprintId } = paymentData || {};
    if (!userId || !sprintId) {
      console.error(`[Webhook] Corrupt payment record: Missing userId/sprintId for ${tx_ref}`);
      return res.status(400).json({ error: "Corrupt record" });
    }

    // 6. Secure Database Fulfillment Transaction
    await db.runTransaction(async (transaction) => {
      // A. Update Payment Status
      transaction.update(paymentRef, {
        status: 'success',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        amount: Number(amount),
        currency: currency,
        provider_transaction_id: flw_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // B. Update User Profile (Unlock Sprint)
      const userRef = db.collection('users').doc(userId);
      transaction.update(userRef, {
        unlockedSprints: admin.firestore.FieldValue.arrayUnion(sprintId),
        enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
      });

      // C. Initialize Enrollment Protocol
      const enrollmentId = `enrollment_${userId}_${sprintId}`;
      const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
      
      // Fetch sprint metadata for duration
      const sprintSnap = await transaction.get(db.collection('sprints').doc(sprintId));
      const duration = sprintSnap.data()?.duration || 7;

      transaction.set(enrollmentRef, {
        id: enrollmentId,
        sprint_id: sprintId,
        user_id: userId,
        coach_id: sprintSnap.data()?.coachId || '',
        started_at: new Date().toISOString(),
        price_paid: Number(amount),
        currency: currency,
        status: 'active',
        last_activity_at: new Date().toISOString(),
        progress: Array.from({ length: duration }, (_, i) => ({ 
          day: i + 1, 
          completed: false 
        }))
      }, { merge: true });

      // D. Log Analytics Event
      const eventRef = db.collection('user_events').doc();
      transaction.set(eventRef, {
        userId,
        eventType: 'sprint_enrolled',
        sprintId,
        timestamp: new Date().toISOString(),
        metadata: { method: 'flutterwave_webhook', tx_ref, flw_id }
      });

      // E. Update Admin Global Stats (Currently only revenue in NGN is tracked globally for simplicity)
      if (currency === 'NGN') {
        const statsRef = db.collection('admin_stats').doc('global');
        transaction.set(statsRef, {
          totalRevenue: admin.firestore.FieldValue.increment(Number(amount)),
          totalSales: admin.firestore.FieldValue.increment(1),
          lastSaleAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    });

    // 7. Create In-App Notification (Outside transaction for speed)
    await db.collection('notifications').add({
      userId,
      type: 'payment_success',
      title: 'Growth Path Authorized',
      body: `Registry verified. Your journey into '${sprintId}' has begun.`,
      isRead: false,
      createdAt: new Date().toISOString(),
      actionUrl: `/participant/sprint/enrollment_${userId}_${sprintId}?day=1`
    });

    console.log(`[Webhook] Success: Fulfillment complete for User ${userId}, Sprint ${sprintId}`);
    return res.status(200).send('Webhook Processed Successfully');

  } catch (error: any) {
    console.error("[Webhook] Critical processing failure:", error);
    return res.status(500).json({ error: "Internal processing error" });
  }
}