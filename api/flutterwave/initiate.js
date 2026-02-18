import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountVar) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccountVar))
        });
        console.log("[Backend] Firebase Admin initialized with Service Account.");
    } else {
        admin.initializeApp();
        console.log("[Backend] Firebase Admin initialized with Default Credentials.");
    }
  } catch (e) {
    console.error("[Backend] Firebase Init Error:", e.message);
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
      throw new Error("Configuration Error: Missing FLW_SECRET_KEY in environment.");
    }

    // Resilience for different body formats
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (pErr) {
        return res.status(400).json({ error: "Malformed JSON body" });
      }
    }

    const { email, amount, sprintId, name, userId, currency = "NGN" } = body || {};
    
    // Explicit Validation
    const missing = [];
    if (!email) missing.push("email");
    if (!userId) missing.push("userId");
    if (!sprintId) missing.push("sprintId");

    if (missing.length > 0) {
      return res.status(400).json({ 
        error: "Mandatory fields missing", 
        details: `Missing: ${missing.join(', ')}` 
      });
    }

    const paymentAmount = Number(amount || 5000);
    const tx_ref = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Attempt to Create Pending Record (Non-blocking fallback)
    try {
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
    } catch (dbErr) {
        console.error("[Backend] Firestore Write Failed:", dbErr.message);
        // We continue anyway so the user can pay, assuming verification will catch it later.
    }

    const host = req.headers.host || 'vectorise.online';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;
    const cleanEmail = email.trim().toLowerCase();
    
    const redirectUrl = `${origin}/#/payment-success?sprintId=${sprintId}&transaction_id=${tx_ref}&email=${encodeURIComponent(cleanEmail)}`;

    // 2. Request Payment Link from Flutterwave
    const flwResponse = await fetch("https://api.flutterwave.com/v3/payments", {
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
        customer: { 
            email: cleanEmail, 
            name: name || 'Vectorise User' 
        },
        customizations: {
          title: "Vectorise Growth Cycle",
          description: `Enrollment for ${sprintId}`
        }
      })
    });

    const data = await flwResponse.json();

    if (!flwResponse.ok) {
      console.error("[Backend] Flutterwave Error:", data);
      return res.status(flwResponse.status).json({ 
          error: data.message || "Gateway rejection", 
          details: data 
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("[Backend] Critical Process Error:", error.message);
    return res.status(500).json({ 
        error: error.message || "System encountered an unexpected processing error.",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}