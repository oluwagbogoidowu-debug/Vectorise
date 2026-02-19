import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = 'vectorise-f19d4';
    
    if (serviceAccountVar) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccountVar)),
            projectId: projectId
        });
    } else {
        admin.initializeApp({
            projectId: projectId
        });
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

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  try {
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
    return res.status(500).json({ error: error.message });
  }
}