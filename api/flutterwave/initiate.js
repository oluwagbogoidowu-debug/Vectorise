
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

    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Using global fetch (available in Node 18+) to avoid 'node-fetch' dependency issues
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tx_ref: `tx-${Date.now()}`,
        amount: "5000",
        currency: "NGN",
        // Correcting the redirect URL to match the SPA hash routing
        redirect_url: "https://vectorise.online/#/payment-success",
        customer: { email },
        customizations: {
          title: "Clarity Sprint",
          description: "5-day Clarity Sprint"
        }
      })
    });

    // Requirement: Ensure !response.ok check is intact
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Flutterwave error:", errorText);
      // Return error as JSON to prevent frontend crash
      return res.status(response.status).json({ error: errorText });
    }

    // Requirement: Use requested content-type checking logic
    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error("Non-JSON response from Flutterwave:", text);
      throw new Error("Server returned non-JSON response");
    }

    // Return successful JSON response
    return res.status(200).json(data);

  } catch (error) {
    console.error("[Backend] Internal Error:", error);
    // CRITICAL: Always return JSON even on catch to avoid "Unexpected token A"
    return res.status(500).json({ error: error.message });
  }
}
