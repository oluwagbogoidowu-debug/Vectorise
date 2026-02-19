import admin from 'firebase-admin';

function getDb() {
  if (!admin.apps.length) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountVar) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing");
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountVar);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || 'vectorise-f19d4'
      });
    } catch (e) {
      console.error("[StatusCheck Firebase Init Error]", e.message);
      throw e;
    }
  }
  return admin.firestore();
}

export default async function handler(req, res) {
  const { tx_ref } = req.query;
  if (!tx_ref) return res.status(400).json({ error: "Missing tx_ref" });

  try {
    const db = getDb();
    const paymentDoc = await db.collection('payments').doc(tx_ref).get();
    if (!paymentDoc.exists) return res.status(200).json({ status: "pending" });

    const data = paymentDoc.data();
    return res.status(200).json({ 
        status: data.status, 
        sprintId: data.sprintId,
        userId: data.userId
    });
  } catch (e) {
    console.error("[StatusCheck Error]", e);
    return res.status(500).json({ error: "Internal lookup error" });
  }
}