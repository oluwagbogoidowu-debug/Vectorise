import admin from '../../lib/firebaseAdmin.js';

export default async (req: any, res: any) => {
  // Prevent caching of status checks
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  const { tx_ref } = req.query;
  if (!tx_ref) return res.status(400).json({ error: "Missing tx_ref" });

  try {
    const db = admin.firestore();
    if (!db) return res.status(500).json({ error: "Database unreachable" });

    const paymentRef = db.collection('payments').doc(tx_ref as string);
    let paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) {
      console.warn(`[Registry] Payment record not found for tx_ref: ${tx_ref}`);
      return res.status(200).json({ status: "pending" });
    }

    let data = paymentDoc.data() as any;

    // If still pending, proactively verify with Flutterwave to overcome possible webhook delays
    if (data.status === 'pending') {
      const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
      if (FLW_SECRET_KEY) {
        try {
          console.log(`[Registry] Proactively verifying tx_ref: ${tx_ref}`);
          const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`, {
            headers: {
              Authorization: `Bearer ${FLW_SECRET_KEY}`
            }
          });
          
          const verifyData = await verifyRes.json();
          console.log(`[Registry] Flutterwave verify response for ${tx_ref}:`, verifyData.status, verifyData.data?.status);
          
          if (verifyData.status === 'success' && verifyData.data && verifyData.data.status === 'successful') {
            const flw_tx = verifyData.data;
            
            await db.runTransaction(async (transaction) => {
              const freshSnap = await transaction.get(paymentRef);
              const freshData = freshSnap.data() as any;
              
              if (freshData.status === 'successful' || freshData.status === 'success') return;

              const { userId, sprintId } = freshData;

              transaction.update(paymentRef, {
                status: 'successful',
                flw_transaction_id: flw_tx.id,
                payment_method: flw_tx.payment_type,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });

              // If it's a guest, we don't create the enrollment yet.
              // They will be redirected to signup where they will claim this payment.
              if (userId.startsWith('guest_')) return;

              const enrollmentId = `enrollment_${userId}_${sprintId}`;
              
              // Check for active enrollments
              const activeEnrollments = await db.collection('enrollments')
                .where('user_id', '==', userId)
                .where('status', '==', 'active')
                .get();
              
              const hasActive = !activeEnrollments.empty;

              const sprintSnap = await transaction.get(db.collection('sprints').doc(sprintId));
              const duration = sprintSnap.exists ? (sprintSnap.data()?.duration || 7) : 7;
              const coachId = sprintSnap.exists ? sprintSnap.data()?.coachId : '';

              transaction.set(db.collection('enrollments').doc(enrollmentId), {
                id: enrollmentId,
                sprint_id: sprintId,
                user_id: userId,
                coach_id: coachId,
                started_at: new Date().toISOString(),
                status: hasActive ? 'queued' : 'active',
                progress: Array.from({ length: duration }, (_, i) => ({ day: i + 1, completed: false }))
              }, { merge: true });

              transaction.update(db.collection('users').doc(userId), {
                  enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
              });
            });

            data.status = 'successful';
          }
        } catch (verifyErr: any) {
          console.warn("[Registry] Proactive Verify Warning:", verifyErr.message);
        }
      }
    }

    return res.status(200).json({ 
        status: data.status, 
        sprintId: data.sprintId,
        userId: data.userId,
        email: data.email
    });
  } catch (e) {
    console.error("[Registry] Status Check Error:", e);
    return res.status(500).json({ error: "Internal registry error during status check." });
  }
};
