const admin = require('firebase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
      } catch (err) {
        console.error("Firebase key parse failed:", err);
      }
    }

    if (!admin.apps.length) {
      if (!serviceAccount) {
        return res.status(500).send('Registry Config Missing');
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || 'vectorise-f19d4'
      });
    }

    const db = admin.firestore();
    const secretHash = process.env.FLW_SECRET_HASH;
    const signature = req.headers['verif-hash'];

    if (!signature || signature !== secretHash) {
      console.error("[Webhook] Signature verification failed.");
      return res.status(401).send('Unauthorized');
    }

    const payload = req.body;

    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const { tx_ref, amount, currency, id: flw_id } = payload.data;
      
      const paymentRef = db.collection('payments').doc(tx_ref);

      await db.runTransaction(async (transaction) => {
        const paymentDoc = await transaction.get(paymentRef);
        
        if (!paymentDoc.exists) throw new Error("Payment record not found");
        const paymentData = paymentDoc.data();

        if (paymentData.status === 'successful') return;

        if (Number(amount) < Number(paymentData.amount) || currency !== paymentData.currency) {
          console.error(`[Webhook] Integrity mismatch for ${tx_ref}`);
          transaction.update(paymentRef, { status: 'failed', failureReason: 'Integrity mismatch' });
          return;
        }

        const { userId, sprintId } = paymentData;

        transaction.update(paymentRef, {
          status: 'successful',
          flw_transaction_id: flw_id,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

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

        transaction.update(db.collection('users').doc(userId), {
            enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
        });

        console.log(`[Webhook] Fulfilled ${tx_ref} for User ${userId}`);
      });
      
      return res.status(200).send('Webhook Processed');
    }

    res.status(200).end();
  } catch (err) {
    console.error("[Webhook] Processing Error:", err.message);
    return res.status(500).send('Internal Error');
  }
};