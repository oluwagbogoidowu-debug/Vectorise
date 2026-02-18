import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already done
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'))
    });
  } catch (e) {
    admin.initializeApp();
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

    if (!FLW_SECRET_KEY) {
      console.error("[Backend] Missing FLW_SECRET_KEY");
      return res.status(500).json({ error: "Missing FLW_SECRET_KEY" });
    }

    const { email, amount, sprintId, name, userId, currency = "NGN" } = req.body || {};
    
    if (!email || !userId || !sprintId) {
      return res.status(400).json({ error: "Email, User ID, and Sprint ID are required" });
    }

    const paymentAmount = Number(amount || 5000);
    const tx_ref = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Create Pending Payment Record in Firestore
    await db.collection('payments').doc(tx_ref).set({
      userId,
      email: email.trim().toLowerCase(),
      userName: name || 'Vectorise User',
      sprintId,
      amount: paymentAmount,
      currency,
      status: "pending",
      paymentProvider: "flutterwave",
      txRef: tx_ref,
      initiatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Determine origin dynamically
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    const cleanEmail = email.trim().toLowerCase();
    
    /**
     * Flutterwave appends its own query string to the redirect_url.
     */
    const redirectUrl = `${origin}/#/payment-success?sprintId=${sprintId}&transaction_id=${tx_ref}&email=${encodeURIComponent(cleanEmail)}`;

    // 2. Request Payment Link from Flutterwave
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tx_ref: tx_ref,
        amount: paymentAmount.toString(),
        currency: currency,
        redirect_url: redirectUrl,
        customer: { email: cleanEmail, name: name || 'Vectorise User' },
        customizations: {
          title: "Vectorise Growth Cycle",
          description: `Enrollment for ${sprintId}`
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Clean up the failed intent record
      await db.collection('payments').doc(tx_ref).update({ status: 'failed', failureReason: 'Gateway initialization failed' });
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("[Backend] Internal Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
