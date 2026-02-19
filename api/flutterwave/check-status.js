import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = 'vectorise-f19d4';
    
    if (serviceAccountVar) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountVar)),
        projectId: projectId
      });
    } else {
      admin.initializeApp({
        projectId: projectId
      });
    }
  } catch (e) {
    console.error("[StatusCheck] Firebase Init Error:", e.message);
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