
/**
 * POST /api/flutterwave/webhook
 * Handles transaction fulfillment after successful payment.
 */
module.exports = async (req, res) => {
  // Secret hash check for security (Optional but recommended)
  // const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  // const signature = req.headers['verif-hash'];
  // if (signature !== secretHash) return res.status(401).end();

  const payload = req.body;

  if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
    const { amount, customer, tx_ref, meta } = payload.data;
    
    console.log(`[Webhook] Successful charge: ${customer.email} -> ${amount} NGN`);
    
    // Here you would integrate with Firestore using admin SDK if needed
    // Example: Update enrollment, mark payment as paid, etc.
  }

  res.status(200).end();
};
