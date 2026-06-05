import admin from "firebase-admin";

function parseRelaxedJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch (initialError: any) {
    // Attempt parsing with Function constructor to support single quotes, trailing commas, unquoted keys etc.
    try {
      const fn = new Function(`return (${str});`);
      const parsed = fn();
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      throw new Error("Parsed result is not an object");
    } catch (e: any) {
      // Try string regex-based cleanup as a fallback
      try {
        let cleaned = str.trim();
        cleaned = cleaned.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'\s*:/g, '"$1":');
        cleaned = cleaned.replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, ':"$1"');
        cleaned = cleaned.replace(/,\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, ',"$1"');
        cleaned = cleaned.replace(/\[\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, '["$1"');
        cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        return JSON.parse(cleaned);
      } catch {
        throw new Error(`Relaxed parsing failed. Original JSON error: ${initialError.message}`);
      }
    }
  }
}

if (!admin.apps.length) {
  let config: admin.ServiceAccount | undefined;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      let keyVal = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      
      // Handle potential wrapping quotes from shell/env files
      if ((keyVal.startsWith("'") && keyVal.endsWith("'")) || 
          (keyVal.startsWith('"') && keyVal.endsWith('"'))) {
        keyVal = keyVal.slice(1, -1).trim();
      }

      // If the user copied the contents without the curly braces
      if (keyVal.startsWith('"type"') || keyVal.startsWith("'type'") || keyVal.startsWith("type")) {
        keyVal = "{" + keyVal + "}";
      }

      // 🔍 Attempt to extract JSON if there's wrapping text
      const firstBrace = keyVal.indexOf('{');
      const lastBrace = keyVal.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = keyVal.substring(firstBrace, lastBrace + 1);
        try {
          config = parseRelaxedJSON(jsonCandidate);
        } catch (e: any) {
          console.error("Failed to parse extracted JSON from FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
          // Fallback to trying the whole string if extraction failed for some reason
          config = parseRelaxedJSON(keyVal);
        }
      } else {
        config = parseRelaxedJSON(keyVal);
      }
    } catch (e: any) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
      const k = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (k) {
        // Log info without exposing secrets
        console.error(`Key string info: length=${k.length}, first15="${k.substring(0, 15)}", last15="${k.substring(k.length - 15)}"`);
        if (k.includes('\n')) console.error("Key contains newlines.");
      }
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
    // (This is the standard PEM format, though not strictly required by all decoders, it's safest)
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

  if (config && config.privateKey && config.clientEmail) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(config),
      });
    } catch (e: any) {
      console.error("Firebase Admin initialization with cert failed:", e.message);
      try {
        admin.initializeApp();
      } catch (e2) {
        console.error("Firebase Admin fallback initialization failed:", e2);
      }
    }
  } else {
    // Fallback for environments with ambient credentials (like GCP)
    try {
      admin.initializeApp();
    } catch (e) {
      console.error("Firebase Admin initialization failed: No credentials provided or invalid config.");
    }
  }
}

const firestore = admin.firestore();
firestore.settings({ ignoreUndefinedProperties: true });

export const db = firestore;
export default admin;

