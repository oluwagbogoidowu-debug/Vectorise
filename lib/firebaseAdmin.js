import admin from "firebase-admin";

if (!admin.apps.length) {
  let config = undefined;

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
    // 1. Handle literal "\n" strings and accidental wrapping quotes
    let key = config.privateKey
      .replace(/\\n/g, "\n")
      .replace(/^['"]|['"]$/g, "")
      .replace(/^['"]|['"]$/g, "") // Handle double wrapping
      .trim();
    
    // 2. Ensure the key has the correct PEM headers
    if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
      key = "-----BEGIN PRIVATE KEY-----\n" + key;
    }
    if (!key.includes("-----END PRIVATE KEY-----")) {
      key = key + "\n-----END PRIVATE KEY-----";
    }
    
    // 3. Normalize newlines: remove any existing newlines and re-insert them every 64 chars
    const header = "-----BEGIN PRIVATE KEY-----";
    const footer = "-----END PRIVATE KEY-----";
    let body = key.replace(header, "").replace(footer, "").replace(/\s+/g, "");
    
    // Reconstruct the key with proper 64-character line breaks
    let formattedBody = "";
    for (let i = 0; i < body.length; i += 64) {
      formattedBody += body.substring(i, i + 64) + "\n";
    }
    
    config.privateKey = `${header}\n${formattedBody}${footer}`;
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

const firestore = admin.firestore();
firebase.firestore.settings({ ignoreUndefinedProperties: true });

export const db = firestore;
export default admin;