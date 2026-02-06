
const axios = require('axios');

/**
 * POST /api/flutterwave/initiate
 * Securely calls Flutterwave API to get a checkout link.
 */
module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, sprintId, name } = req.body;
  const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

  if (!FLUTTERWAVE_SECRET_KEY) {
    console.error("[Backend] FLUTTERWAVE_SECRET_KEY is missing from environment.");
    return res.status(500).json({ message: "Server configuration error." });
  }

  if (!email || !sprintId) {
    return res.status(400).json({ message: "Email and Sprint ID are required." });
  }

  // Backend pricing registry (Naira)
  const SPRINT_PRICES = {
    'clarity-sprint': 5000,
    'focus-sprint': 3000,
    'visibility-sprint': 7500
  };

  const amount = SPRINT_PRICES[sprintId] || 5000;
  const tx_ref = `VEC_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  try {
    console.log(`[Backend] Initiating Flutterwave for ${email}, Amt: ${amount}`);

    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref,
        amount,
        currency: 'NGN',
        redirect_url: `https://${req.headers.host}/#/payment/success`,
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
      },
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      return res.status(200).json({
        authorization_url: response.data.data.link,
        reference: tx_ref
      });
    }

    throw new Error(response.data.message || "Flutterwave API returned failure.");

  } catch (error) {
    console.error("[Backend] Flutterwave API Error:", error.response?.data || error.message);
    return res.status(500).json({ 
      message: "Payment initialization failed.",
      error: error.response?.data?.message || error.message 
    });
  }
};
