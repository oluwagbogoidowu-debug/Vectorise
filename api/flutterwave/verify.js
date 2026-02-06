
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
    const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

    if (!reference) {
      return res.status(400).json({ status: 'error', message: 'Reference is required' });
    }

    if (!FLW_SECRET_KEY) {
      return res.status(500).json({ status: 'error', message: 'Missing Secret Key (FLW_SECRET_KEY)' });
    }

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Flutterwave verification error:", errorText);
      throw new Error(errorText);
    }

    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error("Non-JSON response:", text);
      throw new Error("Server returned non-JSON response");
    }

    if (data.data && data.data.status === "successful") {
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
