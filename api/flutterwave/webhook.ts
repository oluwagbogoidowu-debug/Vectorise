import admin from '../../lib/firebaseAdmin.js';

export default async (req: any, res: any) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== secretHash) {
    console.error("[Webhook] Unauthorized: Invalid verif-hash signature.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const db = admin.firestore();
    if (!db) return res.status(500).json({ error: "Database unreachable" });

    const payload = req.body;
    
    if (payload.event !== 'charge.completed' || payload.data.status !== 'successful') {
      return res.status(200).send('Event received but ignored.');
    }

    const { tx_ref, amount, currency, id: flw_id } = payload.data;

    const paymentRef = db.collection('payments').doc(tx_ref);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    const paymentData = paymentDoc.data();

    if (paymentData?.status === 'success' || paymentData?.status === 'successful') {
      return res.status(200).send('Already Processed');
    }

    if (Number(amount) !== Number(paymentData?.amount) || currency !== paymentData?.currency) {
      await paymentRef.update({ status: 'failed', failureReason: 'Integrity mismatch detected on webhook' });
      return res.status(400).json({ error: "Integrity mismatch" });
    }

    const { userId, sprintId } = paymentData || {};

    await db.runTransaction(async (transaction) => {
      transaction.update(paymentRef, {
        status: 'success',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        amount: Number(amount),
        currency: currency,
        provider_transaction_id: flw_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const userRef = db.collection('users').doc(userId);
      transaction.update(userRef, {
        enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
      });

      const enrollmentId = `enrollment_${userId}_${sprintId}`;
      const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
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
    });

    await db.collection('notifications').add({
      userId,
      type: 'payment_success',
      title: 'Growth Path Authorized',
      body: `Registry verified. Your journey into '${sprintId}' has begun.`,
      isRead: false,
      createdAt: new Date().toISOString(),
      actionUrl: `/participant/sprint/enrollment_${userId}_${sprintId}?day=1`
    });

    return res.status(200).send('Webhook Processed Successfully');
  } catch (error: any) {
    console.error("[Webhook] Critical failure:", error);
    return res.status(500).json({ error: "Internal processing error" });
  }
};
