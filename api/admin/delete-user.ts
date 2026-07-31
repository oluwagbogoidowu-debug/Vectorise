import admin from '../lib/firebaseAdmin.js';

const db = admin.firestore();
const auth = admin.auth();

export default async (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, action } = req.body; // action: 'clear_auth' | 'delete_db' | 'delete_both'

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId parameter' });
    }

    if (!['clear_auth', 'delete_db', 'delete_both'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be clear_auth, delete_db, or delete_both' });
    }

    let authCleared = false;
    let dbDeleted = false;

    // 1. Clear Auth credentials
    if (action === 'clear_auth' || action === 'delete_both') {
      try {
        await auth.deleteUser(userId);
        authCleared = true;
      } catch (authErr: any) {
        if (authErr.code === 'auth/user-not-found') {
          console.warn(`[Admin Delete User] Auth account ${userId} not found.`);
          authCleared = true;
        } else {
          console.error(`[Admin Delete User] Failed to clear auth for ${userId}:`, authErr);
          if (action === 'clear_auth') {
            return res.status(500).json({ error: `Auth deletion failed: ${authErr.message || authErr}` });
          }
        }
      }
    }

    // 2. Delete database document and file references
    if (action === 'delete_db' || action === 'delete_both') {
      try {
        const userRef = db.collection('users').doc(userId);

        // Subcollections
        const enrollmentsSnap = await userRef.collection('enrollments').get();
        for (const docItem of enrollmentsSnap.docs) {
          await docItem.ref.delete();
        }

        const claimsSnap = await userRef.collection('claims').get();
        for (const docItem of claimsSnap.docs) {
          await docItem.ref.delete();
        }

        // Related collections referencing userId
        const notifSnap = await db.collection('notifications').where('userId', '==', userId).get();
        for (const docItem of notifSnap.docs) {
          await docItem.ref.delete();
        }

        const transSnap = await db.collection('wallet_transactions').where('userId', '==', userId).get();
        for (const docItem of transSnap.docs) {
          await docItem.ref.delete();
        }

        const shineSnap = await db.collection('ShinePost').where('userId', '==', userId).get();
        for (const docItem of shineSnap.docs) {
          await docItem.ref.delete();
        }

        const partnerSnap = await db.collection('partner_applications').where('userId', '==', userId).get();
        for (const docItem of partnerSnap.docs) {
          await docItem.ref.delete();
        }

        // Delete main user document file in users collection
        await userRef.delete();
        dbDeleted = true;
      } catch (dbErr: any) {
        console.error(`[Admin Delete User] Database document deletion failed for ${userId}:`, dbErr);
        if (action === 'delete_db') {
          return res.status(500).json({ error: `Database document deletion failed: ${dbErr.message || dbErr}` });
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      userId,
      authCleared,
      dbDeleted,
      message: action === 'clear_auth' 
        ? 'User authentication credentials cleared successfully.'
        : action === 'delete_db'
        ? 'User database document and file records deleted successfully.'
        : 'User completely deleted from both Auth and Database.'
    });
  } catch (error: any) {
    console.error('[Admin Delete User Error]:', error);
    return res.status(500).json({ error: error?.message || 'Failed to process user deletion request' });
  }
};
