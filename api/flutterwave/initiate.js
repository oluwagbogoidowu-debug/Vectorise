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
      console.log("[Firebase] Successfully initialized Admin SDK");
    } catch (e) {
      console.error("[Firebase] Initialization failed:", e.message);
      throw e;
    }
  }
  return admin.firestore();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  try {
    const db = getDb();
    const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
    const { email, amount, sprintId, name, userId, currency = "NGN" } = req.body || {};
    
    if (!email || !userId || !sprintId) {
      return res.status(400).json({ error: "Mandatory fields missing (email, userId, sprintId)" });
    }

    const tx_ref = `vec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const paymentAmount = Number(amount);

    // 1. Create Pending Record in Firebase
    await db.collection('payments').doc(tx_ref).set({
        userId,
        email: email.toLowerCase().trim(),
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

    const host = req.headers.host || 'vectorise.online';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUrl = `${protocol}://${host}/#/payment-success?tx_ref=${tx_ref}`;

    // 2. Initialize Flutterwave
    const flwResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tx_ref,
        amount: paymentAmount.toString(),
        currency,
        redirect_url: redirectUrl,
        customer: { email, name: name || 'Vectorise User' },
        customizations: {
          title: "Vectorise Registry Authorization",
          description: `Sprint Enrollment: ${sprintId}`
        }
      })
    });

    const data = await flwResponse.json();
    if (!flwResponse.ok) return res.status(flwResponse.status).json(data);

    return res.status(200).json(data);
  } catch (error) {
    console.error("[Initiate Error]", error);
    return res.status(500).json({ error: error.message });
  }
}