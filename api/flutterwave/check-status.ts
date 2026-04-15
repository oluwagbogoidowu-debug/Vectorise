import admin from '../lib/firebaseAdmin.js';

export default async (req: any, res: any) => {
  // Prevent caching of status checks
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  // 1. Retrieve tx_ref from the query
  const { tx_ref, transaction_id } = req.query;
  
  if (!tx_ref) {
    return res.status(400).json({ error: "Missing tx_ref" });
  }

  try {
    const db = admin.firestore();
    if (!db) {
      return res.status(500).json({ error: "Database unreachable" });
    }

    // The Firestore document ID is the tx_ref
    const paymentRef = db.collection('payments').doc(tx_ref as string);
    const paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) {
      console.warn(`[Registry] Payment record not found for tx_ref: ${tx_ref}`);
      return res.status(404).json({ error: "Payment record not found" });
    }

    const data = paymentDoc.data() as any;

    // Prevent status from being updated twice if already successful
    if (data.status === 'successful' || data.status === 'success') {
      return res.status(200).json({ 
        status: data.status, 
        sprintId: data.sprintId,
        trackId: data.trackId,
        userId: data.userId,
        email: data.email
      });
    }

    const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
    if (!FLW_SECRET_KEY) {
      return res.status(500).json({ error: "Flutterwave configuration missing" });
    }

    // 2. Call Flutterwave’s verify transaction API
    // We prefer verify_by_reference as it's the source of truth for our tx_ref
    // but we can also use transaction_id if provided.
    let verifyUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`;
    if (transaction_id) {
        verifyUrl = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
    }

    console.log(`[Registry] Verifying payment for tx_ref: ${tx_ref}`);
    const verifyRes = await fetch(verifyUrl, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const verifyData = await verifyRes.json();
    console.log(`[Registry] Flutterwave verify response:`, verifyData.status);

    // 3. If the Flutterwave response status is "successful"
    if (verifyData.status === 'success' && verifyData.data && verifyData.data.status === 'successful') {
      const flw_tx = verifyData.data;
      
      // Update the corresponding Firestore document
      await db.runTransaction(async (transaction) => {
        const freshSnap = await transaction.get(paymentRef);
        const freshData = freshSnap.data() as any;
        
        // Prevent status from being updated twice
        if (freshData.status === 'successful' || freshData.status === 'success') return;

        const { userId, sprintId, trackId, coinPackageId, coins } = freshData;

        transaction.update(paymentRef, {
          status: 'successful', // Set status to "successful"
          transaction_id: flw_tx.id, // Save transaction_id
          verified_at: admin.firestore.FieldValue.serverTimestamp(), // Save verified_at timestamp
          payment_method: flw_tx.payment_type,
          amount_settled: flw_tx.amount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Business logic: Handle Coins or Enrollment
        let activeEnrollmentId = null;
        if (!userId.startsWith('guest_')) {
          if (coinPackageId && coins) {
            // Handle Coin Purchase
            transaction.update(db.collection('users').doc(userId), {
              walletBalance: admin.firestore.FieldValue.increment(Number(coins))
            });
            
            // Log transaction
            const transactionId = `coin_purchase_${tx_ref}`;
            transaction.set(db.collection('users').doc(userId).collection('transactions').doc(transactionId), {
              id: transactionId,
              amount: Number(coins),
              type: 'credit',
              description: `Purchased ${coins} Coins Package`,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              status: 'completed',
              paymentRef: tx_ref
            });
          } else {
            // Check for existing active enrollments
            const existingEnrollmentsSnap = await transaction.get(db.collection('enrollments').where('user_id', '==', userId).where('status', '==', 'active'));
            const hasActiveSprint = !existingEnrollmentsSnap.empty;

            if (trackId) {
              // Handle Track Enrollment
              const trackSnap = await transaction.get(db.collection('tracks').doc(trackId));
              if (trackSnap.exists) {
                const trackData = trackSnap.data();
                const sprintIds = trackData?.sprintIds || [];
                
                let firstSprintActivated = false;

                for (const sId of sprintIds) {
                  const enrollmentId = `enrollment_${userId}_${sId}`;
                  const sprintSnap = await transaction.get(db.collection('sprints').doc(sId));
                  const duration = sprintSnap.exists ? (sprintSnap.data()?.duration || 7) : 7;
                  const coachId = sprintSnap.exists ? sprintSnap.data()?.coachId : '';

                  // Logic: If no active sprint exists, activate the first one in the track.
                  // Otherwise, queue it.
                  const shouldBeActive = !hasActiveSprint && !firstSprintActivated;
                  if (shouldBeActive) {
                      firstSprintActivated = true;
                      activeEnrollmentId = enrollmentId;
                  }

                  transaction.set(db.collection('enrollments').doc(enrollmentId), {
                    id: enrollmentId,
                    sprint_id: sId,
                    track_id: trackId,
                    user_id: userId,
                    coach_id: coachId,
                    started_at: new Date().toISOString(),
                    status: shouldBeActive ? 'active' : 'queued',
                    progress: Array.from({ length: duration }, (_, i) => ({ day: i + 1, completed: false }))
                  }, { merge: true });

                  transaction.update(db.collection('users').doc(userId), {
                      enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sId)
                  });
                }
                
                transaction.update(db.collection('users').doc(userId), {
                  enrolledTrackIds: admin.firestore.FieldValue.arrayUnion(trackId)
                });
              }
            } else if (sprintId) {
              // Handle Single Sprint Enrollment
              const enrollmentId = `enrollment_${userId}_${sprintId}`;
              
              const sprintSnap = await transaction.get(db.collection('sprints').doc(sprintId));
              const duration = sprintSnap.exists ? (sprintSnap.data()?.duration || 7) : 7;
              const coachId = sprintSnap.exists ? sprintSnap.data()?.coachId : '';

              const shouldBeActive = !hasActiveSprint;
              if (shouldBeActive) activeEnrollmentId = enrollmentId;

              transaction.set(db.collection('enrollments').doc(enrollmentId), {
                id: enrollmentId,
                sprint_id: sprintId,
                user_id: userId,
                coach_id: coachId,
                started_at: new Date().toISOString(),
                status: shouldBeActive ? 'active' : 'queued',
                progress: Array.from({ length: duration }, (_, i) => ({ day: i + 1, completed: false }))
              }, { merge: true });

              transaction.update(db.collection('users').doc(userId), {
                  enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
              });
            }
          }
        }

        // Update payment record with activeEnrollmentId if found
        if (activeEnrollmentId) {
            transaction.update(paymentRef, { activeEnrollmentId });
        }
      });

      const finalPaymentSnap = await paymentRef.get();
      const finalPaymentData = finalPaymentSnap.data() as any;

      return res.status(200).json({ 
          status: 'successful', 
          sprintId: data.sprintId,
          trackId: data.trackId,
          userId: data.userId,
          email: data.email,
          transaction_id: flw_tx.id,
          activeEnrollmentId: finalPaymentData.activeEnrollmentId
      });
    } else if (verifyData.status === 'success' && verifyData.data && verifyData.data.status === 'failed') {
      // 4. If status is not successful: mark as "failed"
      await paymentRef.update({ 
        status: 'failed', 
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      });
      return res.status(200).json({ status: 'failed' });
    }

    // Default to pending if not terminal
    return res.status(200).json({ 
        status: 'pending', 
        sprintId: data.sprintId,
        trackId: data.trackId,
        userId: data.userId,
        email: data.email
    });

  } catch (error: any) {
    // 5. Errors are caught and logged
    console.error("[Registry] Status Check Error:", error);
    return res.status(500).json({ error: "Internal registry error during status check." });
  }
};

