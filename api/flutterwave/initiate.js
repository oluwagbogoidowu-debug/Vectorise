export default async function handler(req, res) {
  // CORS Headers
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

    const { email, amount, sprintId } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Use amount from body or fallback to default
    const paymentAmount = amount || "5000";

    // Append sprintId to redirect URL so PaymentSuccess can construct enrollment ID
    const redirectUrl = `https://vectorise.online/#/payment-success?sprintId=${sprintId || 'clarity-sprint'}`;

    // Using global fetch (available in Node 18+) to avoid 'node-fetch' dependency issues
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
        customer: { email },
        customizations: {
          title: sprintId || "Growth Sprint",
          description: "Vectorise Growth Cycle"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Flutterwave error:", errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error("Non-JSON response from Flutterwave:", text);
      throw new Error("Server returned non-JSON response");
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("[Backend] Internal Error:", error);
    return res.status(500).json({ error: error.message });
  }
}