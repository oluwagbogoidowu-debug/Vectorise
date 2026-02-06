
/**
 * GET /api/flutterwave/verify?reference=TX_REF
 * Backend-to-Backend verification of the payment status.
 */
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { reference } = req.query;
    const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!reference) {
      return res.status(400).json({ status: 'error', message: 'Reference is required' });
    }

    if (!FLUTTERWAVE_SECRET_KEY) {
      return res.status(500).json({ status: 'error', message: 'Missing Secret Key' });
    }

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.data && data.data.status === "successful") {
      return res.status(200).json({ 
        status: 'successful', 
        email: data.data.customer.email 
      });
    }

    return res.status(200).json({ 
      status: data.data?.status || 'pending',
      message: data.message 
    });

  } catch (error) {
    console.error("[Backend] Verification Exception:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
