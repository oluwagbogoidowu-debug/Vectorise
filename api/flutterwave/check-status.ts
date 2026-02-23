import admin from '../../lib/firebaseAdmin.js';

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

        const { userId, sprintId } = freshData;

        transaction.update(paymentRef, {
          status: 'successful', // Set status to "successful"
          transaction_id: flw_tx.id, // Save transaction_id
          verified_at: admin.firestore.FieldValue.serverTimestamp(), // Save verified_at timestamp
          payment_method: flw_tx.payment_type,
          amount_settled: flw_tx.amount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Business logic: Handle enrollment
        if (!userId.startsWith('guest_')) {
          const enrollmentId = `enrollment_${userId}_${sprintId}`;
          
          const sprintSnap = await transaction.get(db.collection('sprints').doc(sprintId));
          const duration = sprintSnap.exists ? (sprintSnap.data()?.duration || 7) : 7;
          const coachId = sprintSnap.exists ? sprintSnap.data()?.coachId : '';

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
        }
      });

      return res.status(200).json({ 
          status: 'successful', 
          sprintId: data.sprintId,
          userId: data.userId,
          email: data.email,
          transaction_id: flw_tx.id
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
        userId: data.userId,
        email: data.email
    });

  } catch (error: any) {
    // 5. Errors are caught and logged
    console.error("[Registry] Status Check Error:", error);
    return res.status(500).json({ error: "Internal registry error during status check." });
  }
};

