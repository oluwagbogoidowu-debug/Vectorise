const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const axios = require('axios');

admin.initializeApp();

/**
 * CONFIGURATION
 * Keys are read from:
 * firebase functions:config:set paystack.secret="sk_test_..."
 */
const getPaystackSecret = () => {
    // Priority 1: Firebase Config
    if (functions.config().paystack && functions.config().paystack.secret) {
        return functions.config().paystack.secret;
    }
    // Priority 2: Fallback for initial test (matches user provided key)
    return "sk_test_20d6118d43b43bcb995817c64b4de06d96ec9ea7";
};

const PAYSTACK_URL = "https://api.paystack.co";

// Internal Pricing Registry - ONLY backend decides the cost
const SPRINT_PRICES = {
  'clarity-sprint': 5000, // ₦5,000
  'focus-sprint': 3000,
  'visibility-sprint': 7500
};

/**
 * POST /createPartnerAccount
 * Securely creates an Auth account and Firestore profile for an approved partner.
 */
exports.createPartnerAccount = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { email, password, fullName, country, primaryPlatform } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "Incomplete partner data." });
    }

    console.log(`[Admin] Provisioning Partner Account: ${email}`);

    // 1. Create the Auth User
    const userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password: password,
      displayName: fullName,
      emailVerified: true // Pre-verify since this is an admin-provisioned account
    });

    const uid = userRecord.uid;

    // 2. Create the User Document in Firestore
    await admin.firestore().collection('users').doc(uid).set({
      id: uid,
      name: fullName,
      email: email.trim().toLowerCase(),
      role: 'PARTICIPANT', // Initial role, can be upgraded
      isPartner: true,
      profileImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0E7850&color=fff`,
      country: country || 'Unknown',
      primaryPlatform: primaryPlatform || 'None',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      savedSprintIds: [],
      enrolledSprintIds: [],
      wishlistSprintIds: [],
      shinePostIds: [],
      shineCommentIds: [],
      claimedMilestoneIds: [],
      referralCode: uid.substring(0, 8).toUpperCase(),
      walletBalance: 50,
      impactStats: { peopleHelped: 0, streak: 0 }
    });

    console.log(`[Admin] Partner account provisioned successfully for UID: ${uid}`);

    return res.json({ status: 'success', uid });
  } catch (error) {
    console.error("Partner Creation Error:", error);
    return res.status(500).json({ 
        message: "Failed to create partner authentication account.",
        detail: error.message
    });
  }
});

/**
 * POST /initiatePayment
 * Frontend calls this to start a transaction.
 */
exports.initiatePayment = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { email, sprint_id, coach_id } = req.body;
    const secretKey = getPaystackSecret();

    if (!email || !sprint_id) {
      return res.status(400).json({ message: "Email and Sprint ID are required." });
    }

    // 1. Determine amount from backend registry (Naira)
    const priceInNaira = SPRINT_PRICES[sprint_id] || 5000;
    // 2. Convert to Kobo (integer)
    const amountInKobo = Math.round(priceInNaira * 100);
    // 3. Generate Unique Reference
    const reference = `VEC_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    console.log(`Initializing payment: ${email}, ${sprint_id}, Ref: ${reference}`);

    // 4. Call Paystack API
    const paystackResponse = await axios.post(`${PAYSTACK_URL}/transaction/initialize`, {
      email,
      amount: amountInKobo,
      reference,
      // Aligning with flat hash route
      callback_url: `https://${req.get('host').includes('localhost') ? 'localhost:3000' : 'vectorise.online'}/#/payment-success?reference=${reference}`,
      metadata: {
        sprint_id,
        coach_id,
        entry_sprint: true
      }
    }, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const { authorization_url } = paystackResponse.data.data;

    // 5. Store pending record in Firestore
    await admin.firestore().collection('payments').doc(reference).set({
      email,
      sprint_id,
      amount: priceInNaira,
      status: "pending",
      metadata: { sprint_id, coach_id },
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ authorization_url, reference });
  } catch (error) {
    console.error("Paystack Init Error:", error.response?.data || error.message);
    return res.status(500).json({ 
        message: "Payment initialization failed. Check server logs.",
        detail: error.response?.data?.message || error.message
    });
  }
});

/**
 * GET /verifyPayment?reference=REF_ID
 * Frontend polls this to check if webhook has completed fulfillment.
 */
exports.verifyPayment = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const { reference } = req.query;
  
  if (!reference) return res.status(400).json({ status: 'error', message: 'Missing reference' });

  try {
    // Check Firestore for the payment status (updated by webhook or verify call)
    const paymentDoc = await admin.firestore().collection('payments').doc(reference).get();
    
    if (!paymentDoc.exists) {
        // If not in DB, double check Paystack directly as fallback
        const secretKey = getPaystackSecret();
        const verifyRes = await axios.get(`${PAYSTACK_URL}/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${secretKey}` }
        });
        
        if (verifyRes.data.data.status === 'success') {
            return res.json({ status: 'successful' });
        }
        return res.json({ status: 'not_found' });
    }
    
    return res.json({ status: paymentDoc.data().status });
  } catch (err) {
    console.error("Verify endpoint error:", err);
    return res.status(500).json({ status: 'error' });
  }
});

/**
 * POST /paystack/webhook
 * Secure webhook listener for charge.success.
 */
exports.paystackWebhook = functions.https.onRequest(async (req, res) => {
  const secretKey = getPaystackSecret();
  const signature = req.headers['x-paystack-signature'];
  
  if (!signature) {
    console.error("Webhook called without Paystack signature");
    return res.status(401).send('Unauthorized');
  }

  // 1. Verify Paystack Signature (HMAC SHA-512)
  const hash = crypto.createHmac('sha512', secretKey).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== signature) {
    console.warn("Invalid Paystack Webhook Signature Detected");
    return res.status(401).send('Unauthorized');
  }

  const event = req.body;
  
  // 2. Process only successful charges
  if (event.event === 'charge.success') {
    const { reference, metadata, customer } = event.data;
    const db = admin.firestore();

    try {
      const paymentRef = db.collection('payments').doc(reference);
      const paymentDoc = await paymentRef.get();

      // Check if already processed (Idempotency)
      if (paymentDoc.exists && paymentDoc.data().status === 'successful') {
        console.log(`Payment ${reference} already fulfilled.`);
        return res.status(200).send('Already Processed');
      }

      // 3. Mark successful in DB
      await paymentRef.set({
        email: customer.email,
        status: "successful",
        paid_at: admin.firestore.FieldValue.serverTimestamp(),
        paystack_data: event.data
      }, { merge: true });

      // 4. Enroll User in Sprint
      const userQuery = await db.collection('users').where('email', '==', customer.email).limit(1).get();
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userId = userDoc.id;
        const sprintId = metadata.sprint_id;
        
        const enrollmentId = `enrollment_${userId}_${sprintId}`;
        const duration = sprintId === 'clarity-sprint' ? 5 : 7;

        // Create Enrollment Record
        await db.collection('enrollments').doc(enrollmentId).set({
          id: enrollmentId,
          sprintId: sprintId,
          participantId: userId,
          startDate: new Date().toISOString(),
          status: "active",
          progress: Array.from({ length: duration }, (_, i) => ({
              day: i + 1,
              completed: false
          }))
        }, { merge: true });

        // Update User Profile with the new enrolled ID
        await userDoc.ref.update({
          enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
        });

        // Add Notification
        await db.collection('notifications').add({
          userId,
          type: 'payment_success',
          title: 'Journey Authorized',
          body: `Verification complete for ${sprintId.replace(/-/g, ' ')}. Day 1 is now accessible.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          actionUrl: `/participant/sprint/${enrollmentId}?day=1`
        });

        console.log(`Successfully enrolled ${customer.email} in ${sprintId}`);
      } else {
          console.warn(`User with email ${customer.email} not found for enrollment.`);
      }

      return res.status(200).send('Webhook Received & Processed');
    } catch (err) {
      console.error("Fulfillment Error:", err);
      return res.status(500).send('Internal Server Error');
    }
  }

  return res.status(200).send('Event Ignored');
});