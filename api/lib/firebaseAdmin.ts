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

let config: admin.ServiceAccount | undefined;
let isFirebaseAdminConfigured = false;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const keyVal = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    let parsedConfig: any = null;
    const errors: string[] = [];

    const strategies = [
      // Strategy 1: As-is
      (s: string) => s,
      // Strategy 2: Wrap in braces if missing
      (s: string) => {
        let trimmed = s.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          return '{' + trimmed + '}';
        }
        return trimmed;
      },
      // Strategy 3: Strip outer quotes and try as-is
      (s: string) => {
        let trimmed = s.trim();
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || 
            (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          trimmed = trimmed.slice(1, -1).trim();
        }
        return trimmed;
      },
      // Strategy 4: Strip outer quotes and wrap in braces if missing
      (s: string) => {
        let trimmed = s.trim();
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || 
            (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          trimmed = trimmed.slice(1, -1).trim();
        }
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          return '{' + trimmed + '}';
        }
        return trimmed;
      }
    ];

    for (const strategy of strategies) {
      try {
        const processed = strategy(keyVal);
        const firstBrace = processed.indexOf('{');
        const lastBrace = processed.lastIndexOf('}');
        let candidate: any = null;
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const jsonCandidate = processed.substring(firstBrace, lastBrace + 1);
          candidate = parseRelaxedJSON(jsonCandidate);
        } else {
          candidate = parseRelaxedJSON(processed);
        }
        if (candidate && typeof candidate === "object") {
          parsedConfig = candidate;
          break;
        }
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    if (parsedConfig) {
      config = parsedConfig;
    } else {
      console.warn("[FirebaseAdmin] All service account key parsing strategies failed.");
    }
  } catch (e: any) {
    console.warn("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
  }
}

if (!config && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  config = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  };
}

if (config && config.privateKey) {
  let key = config.privateKey
    .replace(/\\n/g, "\n")
    .replace(/^['"]|['"]$/g, "")
    .replace(/^['"]|['"]$/g, "")
    .trim();
  
  if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
    key = "-----BEGIN PRIVATE KEY-----\n" + key;
  }
  if (!key.includes("-----END PRIVATE KEY-----")) {
    key = key + "\n-----END PRIVATE KEY-----";
  }
  
  const header = "-----BEGIN PRIVATE KEY-----";
  const footer = "-----END PRIVATE KEY-----";
  let body = key.replace(header, "").replace(footer, "").replace(/\s+/g, "");
  
  let formattedBody = "";
  for (let i = 0; i < body.length; i += 64) {
    formattedBody += body.substring(i, i + 64) + "\n";
  }
  
  config.privateKey = `${header}\n${formattedBody}${footer}`;
}

if (!admin.apps.length) {
  if (config && config.privateKey && config.clientEmail) {
    try {
      const targetProjectId = config.projectId || process.env.FIREBASE_PROJECT_ID || "vectorise-f19d4";
      admin.initializeApp({
        credential: admin.credential.cert(config),
        projectId: targetProjectId
      });
      isFirebaseAdminConfigured = true;
      console.log(`[FirebaseAdmin] Initialized successfully for project: ${targetProjectId}`);
    } catch (e: any) {
      console.error("[FirebaseAdmin] Initialization with cert failed:", e.message);
    }
  } else {
    // When no service account is provided, do NOT initialize with ambient GCP credentials
    // to prevent connecting to the container hosting project where Firestore is not enabled.
    console.log("[FirebaseAdmin] Service account credentials not present. Running with safe fallback handlers.");
  }
} else {
  isFirebaseAdminConfigured = true;
}

let firestoreInstance: admin.firestore.Firestore | null = null;

if (isFirebaseAdminConfigured && admin.apps.length > 0) {
  try {
    firestoreInstance = admin.firestore();
    firestoreInstance.settings({ ignoreUndefinedProperties: true });
  } catch (e: any) {
    console.warn("[FirebaseAdmin] Failed to initialize default Firestore instance:", e.message);
  }
}

export function isFirebaseAdminAvailable(): boolean {
  return isFirebaseAdminConfigured && admin.apps.length > 0 && !!firestoreInstance;
}

// Fallback chainable query mock for uncredentialed environments
const createMockQuery = () => {
  const mock: any = {
    get: async () => ({ docs: [], empty: true, size: 0, exists: false, data: () => null }),
    doc: () => createMockDoc(),
    collection: () => mock,
    collectionGroup: () => mock,
    where: () => mock,
    limit: () => mock,
    orderBy: () => mock,
    onSnapshot: () => () => {},
    add: async () => ({ id: 'fallback_id' }),
  };
  return mock;
};

const createMockDoc = () => ({
  get: async () => ({ exists: false, data: () => null }),
  set: async () => {},
  update: async () => {},
  delete: async () => {},
  collection: () => createMockQuery(),
});

// Proxy wrapper for db to guarantee safe module evaluation and runtime fallback
const dbProxy: any = new Proxy({}, {
  get: (_target, prop) => {
    if (isFirebaseAdminAvailable()) {
      if (!firestoreInstance) {
        try {
          firestoreInstance = admin.firestore();
          firestoreInstance.settings({ ignoreUndefinedProperties: true });
        } catch (e: any) {
          console.warn("[FirebaseAdmin] Lazy Firestore init error:", e.message);
        }
      }
      if (firestoreInstance) {
        const val = (firestoreInstance as any)[prop];
        if (typeof val === 'function') {
          return val.bind(firestoreInstance);
        }
        return val;
      }
    }
    
    // Graceful fallback mock implementation when Firebase Admin is not configured
    const mock = createMockQuery();
    if (prop in mock) {
      return typeof mock[prop] === 'function' ? mock[prop] : mock;
    }
    return (..._args: any[]) => mock;
  }
});

export const db = dbProxy;
export default admin;


