
export default async function handler(req, res) {
  try {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

    if (!FLW_SECRET_KEY) {
      console.error("[Backend] Missing FLW_SECRET_KEY in environment.");
      return res.status(500).json({ error: "Missing FLW_SECRET_KEY" });
    }

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
        redirect_url: "https://vectorise.online/payment/callback",
        customer: {
          email: req.body.email
        },
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
      throw new Error(errorText);
    }

    // Requirement: Ensure content-type check is intact
    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error("Non-JSON response from Flutterwave:", text);
      throw new Error("Server returned non-JSON response");
    }

    // Requirement: Use res.status(200).json(data)
    return res.status(200).json(data);

  } catch (error) {
    console.error("[Backend] Internal Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
