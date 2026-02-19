import admin from 'firebase-admin';

function getDb() {
  if (!admin.apps.length) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountVar) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing");
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountVar);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || 'vectorise-f19d4'
      });
    } catch (e) {
      console.error("[StatusCheck Firebase Init Error]", e.message);
      throw e;
    }
  }
  return admin.firestore();
}

export default async function handler(req, res) {
  const { tx_ref } = req.query;
  if (!tx_ref) return res.status(400).json({ error: "Missing tx_ref" });

  try {
    const db = getDb();
    const paymentRef = db.collection('payments').doc(tx_ref);
    let paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) return res.status(200).json({ status: "pending" });

    let data = paymentDoc.data();

    // PROACTIVE VERIFICATION: 
    // If still pending in our DB, check Flutterwave directly to bypass webhook delays
    if (data.status === 'pending') {
      const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
      
      // We need the numeric ID or tx_ref to verify. Flutterwave's verify endpoint works with tx_ref too in some versions, 
      // but usually expects the transaction ID returned in the redirect URL.
      // However, most reliable is verifying by tx_ref if supported or using the transaction_id if provided.
      // Let's try to verify via the tx_ref first if it's a standard verify call.
      
      try {
        const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`, {
          headers: {
            Authorization: `Bearer ${FLW_SECRET_KEY}`
          }
        });
        
        const verifyData = await verifyRes.json();
        
        if (verifyData.status === 'success' && verifyData.data && verifyData.data.status === 'successful') {
          const flw_tx = verifyData.data;
          
          // Atomic Fulfillment within Status Check
          await db.runTransaction(async (transaction) => {
            const freshSnap = await transaction.get(paymentRef);
            const freshData = freshSnap.data();
            
            if (freshData.status === 'successful' || freshData.status === 'success') return;

            const { userId, sprintId, amount, currency } = freshData;

            // 1. Update Payment
            transaction.update(paymentRef, {
              status: 'successful',
              flw_transaction_id: flw_tx.id,
              payment_method: flw_tx.payment_type,
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 2. Create Enrollment
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

            // 3. Update User Profile
            transaction.update(db.collection('users').doc(userId), {
                enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
            });
          });

          // Refresh local data for the response
          data.status = 'successful';
        }
      } catch (verifyErr) {
        console.error("[Proactive Verify Error]", verifyErr.message);
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
}