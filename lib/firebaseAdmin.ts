import admin from "firebase-admin";

if (!admin.apps.length) {
  let config: admin.ServiceAccount | undefined;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      config = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e);
    }
  }

  if (!config && process.env.FIREBASE_PROJECT_ID) {
    config = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    };
  }

  if (config && config.privateKey) {
    // Ensure newlines are correctly handled and remove any accidental wrapping quotes
    config.privateKey = config.privateKey
      .replace(/\\n/g, "\n")
      .replace(/^['"]|['"]$/g, "")
      .trim();
  }

  if (config) {
    admin.initializeApp({
      credential: admin.credential.cert(config),
    });
  } else {
    // Fallback for environments with ambient credentials (like GCP)
    try {
      admin.initializeApp();
    } catch (e) {
      console.error("Firebase Admin initialization failed: No credentials provided.");
    }
  }
}

export default admin;

