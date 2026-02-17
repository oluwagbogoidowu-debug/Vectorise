/**
 * GET /api/flutterwave/verify?transaction_id=ID&sprintId=SPRINT_ID
 * Secure backend-to-backend verification of payment status.
 */

// Source of truth for prices to prevent amount manipulation
const SPRINT_PRICES = {
  'clarity-sprint': 5000,
  'focus-sprint': 3000,
  'visibility-sprint': 7500
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { transaction_id, sprintId } = req.query;
    const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

    if (!transaction_id) {
      return res.status(400).json({ status: 'error', message: 'Transaction ID is required' });
    }

    if (!FLW_SECRET_KEY) {
      return res.status(500).json({ status: 'error', message: 'Registry Error: Missing Secret Key' });
    }

    // Call Flutterwave's secure verify endpoint
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ status: 'error', message: 'Gateway unreachable' });
    }

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const tx = data.data;
      
      // Mandatory Security Checks
      const expectedAmount = SPRINT_PRICES[sprintId] || 5000;
      const isStatusValid = tx.status === "successful";
      const isAmountValid = parseFloat(tx.amount) >= expectedAmount;
      const isCurrencyValid = tx.currency === "NGN";

      if (isStatusValid && isAmountValid && isCurrencyValid) {
        return res.status(200).json({ 
          status: 'successful', 
          email: tx.customer.email,
          amount: tx.amount,
          tx_ref: tx.tx_ref
        });
      } else {
        console.error("[Verification Failure]", { isStatusValid, isAmountValid, isCurrencyValid, tx });
        return res.status(200).json({ 
          status: 'failed', 
          message: 'Payment integrity check failed (Status/Amount/Currency mismatch)' 
        });
      }
    }

    return res.status(200).json({ 
      status: 'failed',
      message: data.message || 'Transaction not found'
    });

  } catch (error) {
    console.error("[Backend] Verification Exception:", error);
    return res.status(500).json({ status: 'error', message: 'Internal validation error' });
  }
}
