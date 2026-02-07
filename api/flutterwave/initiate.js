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

    const { email, amount, sprintId, name } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const paymentAmount = amount || "5000";

    // Determine origin dynamically to prevent redirecting localhost users to live site
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    // Pass the exact email entered by the user
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = `${origin}/#/payment-success?sprintId=${sprintId || 'clarity-sprint'}&email=${encodeURIComponent(cleanEmail)}`;

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tx_ref: `tx-${Date.now()}`,
        amount: paymentAmount,
        currency: "NGN",
        redirect_url: redirectUrl,
        customer: { email: cleanEmail, name: name || 'Vectorise User' },
        customizations: {
          title: "Vectorise Growth Cycle",
          description: `Enrollment for ${sprintId || 'Sprint'}`
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("[Backend] Internal Error:", error);
    return res.status(500).json({ error: error.message });
  }
}