const admin = require('firebase-admin');

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
  } catch (e) {
    console.error("[Webhook] Firebase Init Error:", e.message);
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // 1. Verify Signature (Source of Truth)
  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== secretHash) {
    console.error("[Webhook] Signature verification failed.");
    return res.status(401).send('Unauthorized');
  }

  const payload = req.body;

  // 2. Only process successful charges
  if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
    const { tx_ref, amount, currency, id: flw_id } = payload.data;
    
    try {
      const paymentRef = db.collection('payments').doc(tx_ref);

      await db.runTransaction(async (transaction) => {
        const paymentDoc = await transaction.get(paymentRef);
        
        if (!paymentDoc.exists) throw new Error("Payment record not found");
        const paymentData = paymentDoc.data();

        // Idempotency check
        if (paymentData.status === 'successful') {
          console.log(`[Webhook] ${tx_ref} already processed.`);
          return;
        }

        // Integrity Check: Match amount and currency
        if (Number(amount) < Number(paymentData.amount) || currency !== paymentData.currency) {
          console.error(`[Webhook] Integrity mismatch for ${tx_ref}`);
          transaction.update(paymentRef, { status: 'failed', failureReason: 'Integrity mismatch' });
          return;
        }

        const { userId, sprintId } = paymentData;

        // Atomic Fulfillment
        transaction.update(paymentRef, {
          status: 'successful',
          flw_transaction_id: flw_id,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create Enrollment
        const enrollmentId = `enrollment_${userId}_${sprintId}`;
        const sprintSnap = await transaction.get(db.collection('sprints').doc(sprintId));
        const duration = sprintSnap.exists() ? (sprintSnap.data().duration || 7) : 7;

        transaction.set(db.collection('enrollments').doc(enrollmentId), {
          id: enrollmentId,
          sprint_id: sprintId,
          user_id: userId,
          coach_id: sprintSnap.exists() ? sprintSnap.data().coachId : '',
          started_at: new Date().toISOString(),
          status: 'active',
          progress: Array.from({ length: duration }, (_, i) => ({ day: i + 1, completed: false }))
        }, { merge: true });

        // Update User Profile
        transaction.update(db.collection('users').doc(userId), {
            enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
        });

        console.log(`[Webhook] Fulfilled ${tx_ref} for User ${userId}`);
      });
      
      return res.status(200).send('Webhook Processed');
    } catch (err) {
      console.error("[Webhook] Processing Error:", err.message);
      return res.status(500).send('Internal Error');
    }
  }

  res.status(200).end();
};