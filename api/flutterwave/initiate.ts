import admin, { db } from '../lib/firebaseAdmin';

export default async (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  try {
    const rawFlwKey = process.env.FLW_SECRET_KEY || 
      process.env.FLUTTERWAVE_SECRET_KEY || 
      process.env.VITE_FLW_SECRET_KEY || 
      process.env.FLW_SECRET;

    const FLW_SECRET_KEY = rawFlwKey ? rawFlwKey.trim().replace(/^['"]|['"]$/g, '') : '';
    if (!FLW_SECRET_KEY) {
      console.warn("[Registry] Gateway Configuration Notice: FLW_SECRET_KEY is missing in environment.");
      return res.status(503).json({ 
        error: "Payment gateway is currently not configured or undergoing maintenance. Please try again shortly." 
      });
    }

    const { email, amount, sprintId, trackId, coinPackageId, coins, name, userId, currency = "NGN" } = req.body || {};
    
    if (!email || !userId || (!sprintId && !trackId && !coinPackageId)) {
      return res.status(400).json({ error: "Mandatory fields missing (email, userId, sprintId, trackId or coinPackageId)" });
    }

    const tx_ref = `vec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: "Invalid payment amount specified." });
    }

    // Save pending payment record safely in Firestore
    try {
      if (db) {
        await db.collection('payments').doc(tx_ref).set({
            userId,
            email: email.toLowerCase().trim(),
            userName: name || 'Vectorise User',
            sprintId: sprintId || null,
            trackId: trackId || null,
            coinPackageId: coinPackageId || null,
            coins: coins || null,
            amount: paymentAmount,
            currency,
            status: "pending",
            paymentProvider: "flutterwave",
            txRef: tx_ref,
            initiatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
      }
    } catch (dbErr: any) {
      console.warn("[Registry] Firestore pre-payment record non-fatal warning:", dbErr?.message);
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'vectorise.online';
    const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const redirectUrl = `${baseUrl}/api/payment-success`;

    // Initialize Flutterwave payment
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
          title: coinPackageId ? "Vectorise Coin Purchase" : (trackId ? "Vectorise Track Bundle" : "Vectorise Registry Authorization"),
          description: coinPackageId ? `Coin Package: ${coins} Coins` : (trackId ? `Track Bundle: ${trackId}` : `Sprint Enrollment: ${sprintId}`)
        }
      })
    });

    const data = await flwResponse.json();
    if (!flwResponse.ok) {
        console.error("[Registry] Flutterwave error response:", data);
        return res.status(flwResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("[Registry] Initiate Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error during payment initiation." });
  }
};
