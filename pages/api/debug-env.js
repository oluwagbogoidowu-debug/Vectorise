export default function handler(req, res) {
  res.status(200).json({
    hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyStart: process.env.FIREBASE_PRIVATE_KEY?.slice(0, 30),
  });
}