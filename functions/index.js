
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const axios = require('axios');

admin.initializeApp();

/**
 * CONFIGURATION
 * Keys are read from:
 * functions.config().paystack.secret
 * functions.config().paystack.public
 */
const getPaystackSecret = () => functions.config().paystack ? functions.config().paystack.secret : null;
const PAYSTACK_URL = "https://api.paystack.co";

// Internal Backend-Only Pricing Registry
const SPRINT_PRICES = {
  'clarity-sprint': 5000, // ₦5,000
  'foundation-1': 5000,
  'visibility-sprint': 7500,
  'execution-accelerator': 10000
};

/**
 * /initiatePayment
 * Accepts: email, sprint_id, coach_id (opt), user_stage, entry_sprint (bool)
 */
exports.initiatePayment = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  const { email, sprint_id, coach_id, user_stage, entry_sprint } = req.body;
  const secretKey = getPaystackSecret();

  if (!secretKey) {
    return res.status(500).json({ message: "Payment configuration missing on server." });
  }

  if (!email || !sprint_id) {
    return res.status(400).json({ message: "Missing required fields (email, sprint_id)" });
  }

  // Determine amount (backend pricing control)
  const priceInNaira = SPRINT_PRICES[sprint_id] || 5000;
  const amountInKobo = priceInNaira * 100;
  const reference = `vec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  try {
    const paystackResponse = await axios.post(`${PAYSTACK_URL}/transaction/initialize`, {
      email,
      amount: amountInKobo,
      reference,
      // User is redirected here after payment
      callback_url: `https://${req.get('host').includes('localhost') ? 'localhost:3000' : 'vectorise.app'}/#/payment/success?reference=${reference}`,
      metadata: {
        sprint_id,
        coach_id,
        user_stage,
        entry_sprint: !!entry_sprint
      }
    }, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const { authorization_url } = paystackResponse.data.data;

    // Store pending intent
    await admin.firestore().collection('payments').doc(reference).set({
      email,
      sprint_id,
      amount: priceInNaira,
      status: "pending",
      metadata: { sprint_id, coach_id, user_stage, entry_sprint },
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ authorization_url, reference });
  } catch (error) {
    console.error("Paystack API Error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Could not initialize transaction." });
  }
});

/**
 * /verifyPayment
 * GET check for frontend to verify status before showing success UI
 */
exports.verifyPayment = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const { reference } = req.query;
  
  if (!reference) return res.status(400).json({ status: 'error' });

  try {
    const paymentDoc = await admin.firestore().collection('payments').doc(reference).get();
    if (!paymentDoc.exists) return res.json({ status: 'not_found' });
    
    return res.json({ status: paymentDoc.data().status });
  } catch (err) {
    return res.status(500).json({ status: 'error' });
  }
});

/**
 * /paystack/webhook
 * HMAC SHA-512 verification and enrollment fulfillment
 */
exports.paystackWebhook = functions.https.onRequest(async (req, res) => {
  const secretKey = getPaystackSecret();
  const signature = req.headers['x-paystack-signature'];
  
  if (!signature || !secretKey) {
    return res.status(401).send('Unauthorized');
  }

  // Verify HMAC Signature
  const hash = crypto.createHmac('sha512', secretKey).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== signature) {
    console.warn("Invalid Paystack Signature");
    return res.status(401).send('Unauthorized');
  }

  const event = req.body;
  if (event.event === 'charge.success') {
    const { reference, metadata, customer } = event.data;
    const db = admin.firestore();

    try {
      const paymentRef = db.collection('payments').doc(reference);
      const paymentDoc = await paymentRef.get();

      if (!paymentDoc.exists) {
        console.error(`Payment record ${reference} missing.`);
        return res.status(200).send('Recorded but missing');
      }

      // 1. Mark payment as successful
      await paymentRef.update({
        status: "successful",
        paid_at: admin.firestore.FieldValue.serverTimestamp(),
        paystack_id: event.data.id
      });

      // 2. Resolve User & Enroll
      const userQuery = await db.collection('users').where('email', '==', customer.email).limit(1).get();
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userId = userDoc.id;
        const sprintId = metadata.sprint_id;
        
        const enrollmentId = `enrollment_${userId}_${sprintId}`;
        const duration = sprintId === 'clarity-sprint' ? 5 : 7; // Clarity is always 5

        // Atomic Enrollment
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

        // Update user profile
        await userDoc.ref.update({
          enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
        });

        // 3. Create Success Notification
        await db.collection('notifications').add({
          user_id: userId,
          type: 'payment_success',
          title: 'Sprint Secured',
          body: `Your journey in ${sprintId.replace(/-/g, ' ')} has been authorized. Day 1 is now open.`,
          is_read: false,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          action_url: `/participant/sprint/${enrollmentId}?day=1`
        });
        
        console.log(`Fulfillment complete for ${customer.email} -> ${sprintId}`);
      }

      return res.status(200).send('Fulfillment Complete');
    } catch (err) {
      console.error("Webhook Fulfillment Failure:", err);
      return res.status(500).send('Internal Error');
    }
  }

  return res.status(200).send('Event Ignored');
});
