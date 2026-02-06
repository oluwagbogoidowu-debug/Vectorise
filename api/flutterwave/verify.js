
const axios = require('axios');

/**
 * GET /api/flutterwave/verify?reference=TX_REF
 * Backend-to-Backend verification of the payment status.
 */
module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { reference } = req.query;
  const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

  if (!reference) {
    return res.status(400).json({ status: 'error', message: 'Reference is required' });
  }

  try {
    // 1. Call Flutterwave to verify the transaction
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`
        }
      }
    );

    const { status, amount, customer, meta } = response.data.data;

    // 2. Check if successful
    if (status === "successful") {
      console.log(`[Backend] Payment Verified: ${reference} for ${customer.email}`);
      
      // In a real app, you would perform fulfillment here too (e.g., updating Firestore)
      // if the webhook hasn't already done it.
      
      return res.status(200).json({ status: 'successful', email: customer.email });
    }

    return res.status(200).json({ status: status || 'pending' });

  } catch (error) {
    console.error("[Backend] Verification Error:", error.response?.data || error.message);
    return res.status(500).json({ status: 'error', message: 'Internal verification failed' });
  }
};
