
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const axios = require('axios');

admin.initializeApp();

// Configuration
// In production, these should be set via:
// firebase functions:config:set paystack.secret="sk_test_..." paystack.public="pk_test_..."
const PAYSTACK_SECRET = functions.config().paystack ? functions.config().paystack.secret : "sk_test_20d6118d43b43bcb995817c64b4de06d96ec9ea7";
const PAYSTACK_URL = "https://api.paystack.co";

// Internal Pricing Registry
// Never let the frontend decide the price
const SPRINT_PRICES = {
  'clarity-sprint': 5000, // ₦5,000
  'focus-sprint': 3000,
  'visibility-sprint': 7500
};

/**
 * /initiatePayment
 * Triggered by frontend to start a transaction
 */
exports.initiatePayment = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  const { email, sprint_id, coach_id, user_stage, entry_sprint } = req.body;

  if (!email || !sprint_id) {
    return res.status(400).json({ message: "Missing required fields (email, sprint_id)" });
  }

  // 1. Get correct amount from backend logic
  const priceInNaira = SPRINT_PRICES[sprint_id] || 5000;
  const amountInKobo = priceInNaira * 100;

  // 2. Generate unique reference
  const reference = `vec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  try {
    // 3. Request Paystack Initialization
    const paystackResponse = await axios.post(`${PAYSTACK_URL}/transaction/initialize`, {
      email,
      amount: amountInKobo,
      reference,
      callback_url: `https://vectorise.app/#/impact/success?reference=${reference}`,
      metadata: {
        sprint_id,
        coach_id,
        user_stage,
        entry_sprint: !!entry_sprint
      }
    }, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    const { authorization_url } = paystackResponse.data.data;

    // 4. Store pending intent in DB
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
    return res.status(500).json({ message: "Internal server error during payment initiation" });
  }
});

/**
 * /paystackWebhook
 * Paystack calls this when payment status changes
 */
exports.paystackWebhook = functions.https.onRequest(async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  
  // 1. Verify Signature
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(JSON.stringify(req.body)).digest('hex');
  
  if (hash !== signature) {
    console.warn("Invalid Paystack Signature Detected");
    return res.status(401).send('Unauthorized');
  }

  const event = req.body;
  
  // 2. Handle successful charge
  if (event.event === 'charge.success') {
    const data = event.data;
    const reference = data.reference;
    const metadata = data.metadata;
    const email = data.customer.email;

    const db = admin.firestore();
    const paymentRef = db.collection('payments').doc(reference);

    try {
      // 3. Verify payment exists and is pending
      const paymentDoc = await paymentRef.get();
      if (!paymentDoc.exists) {
        console.error(`Payment ${reference} not found in DB`);
        return res.status(200).send('Event recorded but payment record missing');
      }

      // 4. Mark payment as successful
      await paymentRef.update({
        status: "successful",
        paid_at: admin.firestore.FieldValue.serverTimestamp(),
        paystack_id: data.id
      });

      // 5. Unlock Sprint / Enrollment Logic
      // Find the user by email
      const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
      
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userId = userDoc.id;
        const sprintId = metadata.sprint_id;
        
        // Automated Enrollment
        const enrollmentId = `enrollment_${userId}_${sprintId}`;
        const duration = 5; // Default for clarity sprint

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

        // Update user's active enrollments
        await userDoc.ref.update({
          enrolledSprintIds: admin.firestore.FieldValue.arrayUnion(sprintId)
        });

        // 6. Create Notification
        await db.collection('notifications').add({
          userId,
          type: 'payment_success',
          title: 'Sprint Unlocked',
          body: `Your payment for ${sprintId.replace('-', ' ')} was successful. You're ready to start.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          actionUrl: `/participant/sprint/${enrollmentId}?day=1`
        });
      }

      return res.status(200).send('Webhook Processed');
    } catch (err) {
      console.error("Webhook fulfillment error:", err);
      return res.status(500).send('Internal fulfillment error');
    }
  }

  return res.status(200).send('Event Ignored');
});
