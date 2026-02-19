import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
    });
  } catch (e) {
    admin.initializeApp();
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  const { tx_ref } = req.query;
  if (!tx_ref) return res.status(400).json({ error: "Missing tx_ref" });

  try {
    const paymentDoc = await db.collection('payments').doc(tx_ref).get();
    if (!paymentDoc.exists) return res.status(200).json({ status: "pending" });

    const data = paymentDoc.data();
    return res.status(200).json({ 
        status: data.status, 
        sprintId: data.sprintId,
        userId: data.userId
    });
  } catch (e) {
    return res.status(500).json({ error: "Internal lookup error" });
  }
}