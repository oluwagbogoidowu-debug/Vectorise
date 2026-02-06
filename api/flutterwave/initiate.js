
/**
 * POST /api/flutterwave/initiate
 * Securely calls Flutterwave API to get a checkout link.
 */
module.exports = async (req, res) => {
  // Always return JSON
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email, sprintId, name } = req.body;
    const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!FLUTTERWAVE_SECRET_KEY) {
      console.error("[Backend] CRITICAL: FLUTTERWAVE_SECRET_KEY is missing from environment.");
      return res.status(500).json({ 
        message: "Server configuration error: Secret Key Missing.",
        suggestion: "Ensure FLUTTERWAVE_SECRET_KEY is set in Vercel environment variables." 
      });
    }

    if (!email || !sprintId) {
      return res.status(400).json({ message: "Email and Sprint ID are required." });
    }

    const SPRINT_PRICES = {
      'clarity-sprint': 5000,
      'focus-sprint': 3000,
      'visibility-sprint': 7500
    };

    const amount = SPRINT_PRICES[sprintId] || 5000;
    const tx_ref = `VEC_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const redirect_url = `${protocol}://${host}/#/payment/success`;

    console.log(`[Backend] Initiating Flutterwave for ${email}, Amt: ${amount}`);

    // Using native fetch (Node 18+) to avoid axios dependency issues
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref,
        amount,
        currency: 'NGN',
        redirect_url,
        customer: {
          email,
          name: name || 'Vectorise User'
        },
        meta: {
          sprintId,
          source: 'vectorise_onboarding'
        },
        customizations: {
          title: 'Vectorise Growth Registry',
          description: `Payment for ${sprintId.replace(/-/g, ' ')}`,
          logo: 'https://lh3.googleusercontent.com/d/1rlpdJZVVY-aFonII5g-HgNNn7P9KYprl'
        }
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      return res.status(200).json({
        authorization_url: data.data.link,
        reference: tx_ref
      });
    }

    console.error("[Backend] Flutterwave API Error Response:", data);
    return res.status(response.status).json({ 
      message: data.message || "Flutterwave declined the request.",
      detail: data
    });

  } catch (error) {
    console.error("[Backend] Unhandled Internal Error:", error);
    return res.status(500).json({ 
      message: "Internal Server Error in payment registry.",
      error: error.message 
    });
  }
};
