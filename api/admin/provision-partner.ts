import admin from '../../lib/firebaseAdmin';

const db = admin.firestore();
const auth = admin.auth();

export default async (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password, fullName, country, primaryPlatform } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Missing required partner data (email, password, fullName)." });
    }

    const cleanEmail = email.trim().toLowerCase();

    const userRecord = await auth.createUser({
      email: cleanEmail,
      password: password,
      displayName: fullName,
      emailVerified: true
    });

    const uid = userRecord.uid;

    await db.collection('users').doc(uid).set({
      id: uid,
      name: fullName,
      email: cleanEmail,
      role: 'PARTICIPANT',
      isPartner: true,
      profileImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0E7850&color=fff`,
      country: country || 'Unknown',
      primaryPlatform: primaryPlatform || 'None',
      createdAt: new Date().toISOString(),
      savedSprintIds: [],
      enrolledSprintIds: [],
      wishlistSprintIds: [],
      shinePostIds: [],
      shineCommentIds: [],
      claimedMilestoneIds: [],
      referralCode: (uid || '').substring(0, 8).toUpperCase(),
      walletBalance: 50,
      impactStats: { peopleHelped: 0, streak: 0 }
    });

    return res.status(200).json({ status: 'success', uid });
  } catch (error: any) {
    console.error("[Backend] Partner Provisioning Error:", error);
    return res.status(500).json({ error: error.message });
  }
};
