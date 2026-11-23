import admin, { db } from '../lib/firebaseAdmin.js';

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
        email: data.email,
        activeEnrollmentId: data.activeEnrollmentId || null,
        coinPackageId: data.coinPackageId || null,
        coins: data.coins || null,
        isPreRegistration: Boolean(data.isPreRegistration),
        preRegItemType: data.preRegItemType || null,
        selectedTier: data.selectedTier || null
      });
    }

    const rawFlwKey = process.env.FLW_SECRET_KEY || 
      process.env.FLUTTERWAVE_SECRET_KEY || 
      process.env.VITE_FLW_SECRET_KEY || 
      process.env.FLW_SECRET;

    const FLW_SECRET_KEY = rawFlwKey ? rawFlwKey.trim().replace(/^['"]|['"]$/g, '') : '';

    let verifyData: any;
    if (!FLW_SECRET_KEY && data.testMode === true) {
      verifyData = {
        status: 'success',
        data: {
          id: `test_${tx_ref}`,
          status: 'successful',
          payment_type: 'test_mode',
          amount: Number(data.amount) || 0,
          currency: data.currency || 'NGN',
        },
      };
    } else {
      if (!FLW_SECRET_KEY) {
        return res.status(500).json({ error: "Flutterwave configuration missing" });
      }

      // 2. Call Flutterwave’s verify transaction API
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
      
      verifyData = await verifyRes.json();
      console.log(`[Registry] Flutterwave verify response:`, verifyData.status);
    }

    // 3. If the Flutterwave response status is "successful"
    if (verifyData.status === 'success' && verifyData.data && verifyData.data.status === 'successful') {
      const flw_tx = verifyData.data;
      
      // Update the corresponding Firestore document
      await db.runTransaction(async (transaction: any) => {
        const freshSnap = await transaction.get(paymentRef);
        const freshData = freshSnap.data() as any;
        
        // Prevent status from being updated twice
        if (freshData.status === 'successful' || freshData.status === 'success') return;

        const { userId, sprintId, trackId, coinPackageId, coins, isPreRegistration, preRegItemType, email, userName, selectedTier } = freshData;

        // Helper to resolve sprint details doc during read phase
        const readSprintMeta = async (sId: string) => {
          let sprintSnap = await transaction.get(db.collection('experiences').doc('Sprint').collection('items').doc(sId).collection('sprintdetails').doc('info'));
          if (!sprintSnap.exists) {
            sprintSnap = await transaction.get(db.collection('experiences').doc('RiseBlog').collection('items').doc(sId).collection('sprintdetails').doc('info'));
          }
          if (!sprintSnap.exists) {
            sprintSnap = await transaction.get(db.collection('experiences').doc('Ignite').collection('items').doc(sId).collection('sprintdetails').doc('info'));
          }
          if (!sprintSnap.exists) {
            sprintSnap = await transaction.get(db.collection('experiences').doc('Challenge').collection('items').doc(sId).collection('sprintdetails').doc('info'));
          }
          if (!sprintSnap.exists) {
            sprintSnap = await transaction.get(db.collection('experiences').doc(sId).collection('sprintdetails').doc('info'));
          }
          return sprintSnap;
        };

        if (isPreRegistration) {
          const resolvedType: 'sprint' | 'track' = preRegItemType === 'track' || (trackId && !sprintId) ? 'track' : 'sprint';
          const targetId = resolvedType === 'track' ? trackId : sprintId;
          const cleanEmail = (email || '').trim().toLowerCase();
          const safeEmail = cleanEmail.replace(/[^a-z0-9]/g, '_');
          const resDocId = `${resolvedType}_${targetId}_${safeEmail}`;
          const resRef = db.collection('launch_reservations').doc(resDocId);

          const existingResSnap = await transaction.get(resRef);
          const targetSnap = resolvedType === 'track'
            ? (targetId ? await transaction.get(db.collection('tracks').doc(targetId)) : null)
            : (targetId ? await readSprintMeta(targetId) : null);

          transaction.update(paymentRef, {
            status: 'successful',
            transaction_id: flw_tx.id,
            verified_at: admin.firestore.FieldValue.serverTimestamp(),
            payment_method: flw_tx.payment_type,
            amount_settled: flw_tx.amount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          if (!existingResSnap.exists && targetId) {
            const targetTitle = targetSnap?.exists ? (targetSnap.data()?.title || targetId) : targetId;
            transaction.set(resRef, {
              id: resDocId,
              itemType: resolvedType,
              itemId: targetId,
              itemTitle: targetTitle,
              email: cleanEmail,
              name: userName || 'Vectorise User',
              userId: userId && !String(userId).startsWith('guest_') ? userId : null,
              selectedTier: selectedTier || null,
              amountPaid: Number(flw_tx.amount || freshData.amount || 0),
              currency: flw_tx.currency || freshData.currency || 'NGN',
              paymentRef: tx_ref,
              status: 'reserved',
              createdAt: new Date().toISOString()
            });

            if (targetSnap?.exists) {
              transaction.update(targetSnap.ref, {
                reservedCount: admin.firestore.FieldValue.increment(1),
                updatedAt: new Date().toISOString()
              });
            }
          }
          return;
        }

        // Pre-read all needed docs BEFORE writing in the transaction
        let existingEnrollmentsSnap: any = null;
        let trackSnap: any = null;
        const trackItemsMeta: Array<{ sId: string; duration: number; coachId: string; existingSnap: any }> = [];
        let singleDuration = 7;
        let singleCoachId = '';
        let existingSingleEnrSnap: any = null;

        if (!userId.startsWith('guest_') && !(coinPackageId && coins)) {
          existingEnrollmentsSnap = await transaction.get(db.collection('users').doc(userId).collection('enrollments').where('status', '==', 'active'));
          if (trackId) {
            trackSnap = await transaction.get(db.collection('tracks').doc(trackId));
            if (trackSnap.exists) {
              const sprintIds = trackSnap.data()?.sprintIds || [];
              for (const sId of sprintIds) {
                const enrollmentId = `enrollment_${userId}_${sId}`;
                const existingEnrSnap = await transaction.get(db.collection('users').doc(userId).collection('enrollments').doc(enrollmentId));
                const sprintSnap = await readSprintMeta(sId);
                trackItemsMeta.push({
                  sId,
                  duration: sprintSnap.exists ? (sprintSnap.data()?.duration || 7) : 7,
                  coachId: sprintSnap.exists ? (sprintSnap.data()?.coachId || '') : '',
                  existingSnap: existingEnrSnap
                });
              }
            }
          } else if (sprintId) {
            const enrollmentId = `enrollment_${userId}_${sprintId}`;
            existingSingleEnrSnap = await transaction.get(db.collection('users').doc(userId).collection('enrollments').doc(enrollmentId));
            const sprintSnap = await readSprintMeta(sprintId);
            singleDuration = sprintSnap.exists ? (sprintSnap.data()?.duration || 7) : 7;
            singleCoachId = sprintSnap.exists ? (sprintSnap.data()?.coachId || '') : '';
          }
        }

        // Write Phase
        transaction.update(paymentRef, {
          status: 'successful', // Set status to "successful"
          transaction_id: flw_tx.id, // Save transaction_id
          verified_at: admin.firestore.FieldValue.serverTimestamp(), // Save verified_at timestamp
          payment_method: flw_tx.payment_type,
          amount_settled: flw_tx.amount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

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
            const hasActiveSprint = existingEnrollmentsSnap ? !existingEnrollmentsSnap.empty : false;

            if (trackId && trackSnap?.exists) {
              let firstSprintActivated = false;

              for (const item of trackItemsMeta) {
                const enrollmentId = `enrollment_${userId}_${item.sId}`;
                const enrRef = db.collection('users').doc(userId).collection('enrollments').doc(enrollmentId);
                const existingData = item.existingSnap?.exists ? item.existingSnap.data() : null;
                const isInProgressExisting = Boolean(
                  existingData &&
                  existingData.status !== 'completed' &&
                  Array.isArray(existingData.progress) &&
                  existingData.progress.some((p: any) => !p.completed)
                );

                if (isInProgressExisting) {
                  transaction.update(enrRef, {
                    paymentUnlocked: true,
                    price_paid: Number(flw_tx.amount || freshData.amount || 0),
                    currency: flw_tx.currency || freshData.currency || 'NGN',
                    payment_source: 'cash',
                    last_activity_at: new Date().toISOString()
                  });
                  if (!activeEnrollmentId && existingData.status === 'active') {
                    activeEnrollmentId = enrollmentId;
                  }
                } else {
                  const shouldBeActive = !hasActiveSprint && !firstSprintActivated;
                  if (shouldBeActive) {
                    firstSprintActivated = true;
                    activeEnrollmentId = enrollmentId;
                  }

                  transaction.set(enrRef, {
                    id: enrollmentId,
                    sprint_id: item.sId,
                    track_id: trackId,
                    user_id: userId,
                    coach_id: item.coachId,
                    started_at: new Date().toISOString(),
                    paymentUnlocked: true,
                    status: shouldBeActive ? 'active' : 'queued',
                    progress: Array.from({ length: item.duration }, (_, i) => ({ day: i + 1, completed: false }))
                  }, { merge: true });
                }

                transaction.update(db.collection('users').doc(userId), {
                  enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(item.sId)
                });
              }

              transaction.update(db.collection('users').doc(userId), {
                enrolledTrackIds: admin.firestore.FieldValue.arrayUnion(trackId)
              });
            } else if (sprintId) {
              const enrollmentId = `enrollment_${userId}_${sprintId}`;
              const enrRef = db.collection('users').doc(userId).collection('enrollments').doc(enrollmentId);
              const existingData = existingSingleEnrSnap?.exists ? existingSingleEnrSnap.data() : null;
              const isInProgressExisting = Boolean(
                existingData &&
                existingData.status !== 'completed' &&
                Array.isArray(existingData.progress) &&
                existingData.progress.some((p: any) => !p.completed)
              );

              if (isInProgressExisting) {
                // Preserve Move 1 & Move 2 answers/progress while unlocking Move 3+
                activeEnrollmentId = enrollmentId;
                transaction.update(enrRef, {
                  paymentUnlocked: true,
                  price_paid: Number(flw_tx.amount || freshData.amount || 0),
                  currency: flw_tx.currency || freshData.currency || 'NGN',
                  payment_source: 'cash',
                  ...(freshData.selectedTier ? { selectedTier: freshData.selectedTier } : {}),
                  status: 'active',
                  last_activity_at: new Date().toISOString()
                });
              } else {
                const shouldBeActive = !hasActiveSprint;
                if (shouldBeActive) activeEnrollmentId = enrollmentId;

                transaction.set(enrRef, {
                  id: enrollmentId,
                  sprint_id: sprintId,
                  user_id: userId,
                  coach_id: singleCoachId,
                  started_at: new Date().toISOString(),
                  price_paid: Number(flw_tx.amount || freshData.amount || 0),
                  currency: flw_tx.currency || freshData.currency || 'NGN',
                  payment_source: 'cash',
                  ...(freshData.selectedTier ? { selectedTier: freshData.selectedTier } : {}),
                  paymentUnlocked: true,
                  status: shouldBeActive ? 'active' : 'queued',
                  progress: Array.from({ length: singleDuration }, (_, i) => ({ day: i + 1, completed: false }))
                }, { merge: true });
              }

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
          activeEnrollmentId: finalPaymentData.activeEnrollmentId || null,
          coinPackageId: data.coinPackageId || null,
          coins: data.coins || null,
          isPreRegistration: Boolean(finalPaymentData?.isPreRegistration),
          preRegItemType: finalPaymentData?.preRegItemType || null,
          selectedTier: finalPaymentData?.selectedTier || null
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
        email: data.email,
        coinPackageId: data.coinPackageId || null,
        coins: data.coins || null,
        isPreRegistration: Boolean(data.isPreRegistration),
        preRegItemType: data.preRegItemType || null
    });

  } catch (error: any) {
    // 5. Errors are caught and logged
    console.error("[Registry] Status Check Error:", error);
    return res.status(500).json({ error: "Internal registry error during status check." });
  }
};

