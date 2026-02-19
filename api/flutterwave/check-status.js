const admin = require('firebase-admin');

let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  }
} catch (err) {
  console.error("Firebase key parse failed:", err);
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || 'vectorise-f19d4'
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  const { tx_ref } = req.query;
  if (!tx_ref) return res.status(400).json({ error: "Missing tx_ref" });

  try {
    const paymentRef = db.collection('payments').doc(tx_ref);
    let paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) return res.status(200).json({ status: "pending" });

    let data = paymentDoc.data();

    if (data.status === 'pending') {
      const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
      if (FLW_SECRET_KEY) {
        try {
          const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`, {
            headers: {
              Authorization: `Bearer ${FLW_SECRET_KEY}`
            }
          });
          
          const verifyData = await verifyRes.json();
          
          if (verifyData.status === 'success' && verifyData.data && verifyData.data.status === 'successful') {
            const flw_tx = verifyData.data;
            
            await db.runTransaction(async (transaction) => {
              const freshSnap = await transaction.get(paymentRef);
              const freshData = freshSnap.data();
              
              if (freshData.status === 'successful' || freshData.status === 'success') return;

              const { userId, sprintId } = freshData;

              transaction.update(paymentRef, {
                status: 'successful',
                flw_transaction_id: flw_tx.id,
                payment_method: flw_tx.payment_type,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });

              const enrollmentId = `enrollment_${userId}_${sprintId}`;
              const sprintSnap = await transaction.get(db.collection('sprints').doc(sprintId));
              const duration = sprintSnap.exists() ? (sprintSnap.data().duration || 7) : 7;
              const coachId = sprintSnap.exists() ? sprintSnap.data().coachId : '';

              transaction.set(db.collection('enrollments').doc(enrollmentId), {
                id: enrollmentId,
                sprint_id: sprintId,
                user_id: userId,
                coach_id: coachId,
                started_at: new Date().toISOString(),
                status: 'active',
                progress: Array.from({ length: duration }, (_, i) => ({ day: i + 1, completed: false }))
              }, { merge: true });

              transaction.update(db.collection('users').doc(userId), {
                  enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
              });
            });

            data.status = 'successful';
          }
        } catch (verifyErr) {
          console.error("[Proactive Verify Error]", verifyErr.message);
        }
      }
    }

    return res.status(200).json({ 
        status: data.status, 
        sprintId: data.sprintId,
        userId: data.userId
    });
  } catch (e) {
    console.error("[StatusCheck Error]", e);
    return res.status(500).json({ error: "Internal lookup error" });
  }
};