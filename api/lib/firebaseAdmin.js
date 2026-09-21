import admin from "firebase-admin";
function parseRelaxedJSON(str) {
  try {
    return JSON.parse(str);
  } catch (initialError) {
    try {
      const fn = new Function(`return (${str});`);
      const parsed = fn();
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      throw new Error("Parsed result is not an object");
    } catch (e) {
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
let config;
let isFirebaseAdminConfigured = false;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const keyVal = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    let parsedConfig = null;
    const errors = [];
    const strategies = [
      // Strategy 1: As-is
      (s) => s,
      // Strategy 2: Wrap in braces if missing
      (s) => {
        let trimmed = s.trim();
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
          return "{" + trimmed + "}";
        }
        return trimmed;
      },
      // Strategy 3: Strip outer quotes and try as-is
      (s) => {
        let trimmed = s.trim();
        if (trimmed.startsWith("'") && trimmed.endsWith("'") || trimmed.startsWith('"') && trimmed.endsWith('"')) {
          trimmed = trimmed.slice(1, -1).trim();
        }
        return trimmed;
      },
      // Strategy 4: Strip outer quotes and wrap in braces if missing
      (s) => {
        let trimmed = s.trim();
        if (trimmed.startsWith("'") && trimmed.endsWith("'") || trimmed.startsWith('"') && trimmed.endsWith('"')) {
          trimmed = trimmed.slice(1, -1).trim();
        }
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
          return "{" + trimmed + "}";
        }
        return trimmed;
      }
    ];
    for (const strategy of strategies) {
      try {
        const processed = strategy(keyVal);
        const firstBrace = processed.indexOf("{");
        const lastBrace = processed.lastIndexOf("}");
        let candidate = null;
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
      } catch (err) {
        errors.push(err.message);
      }
    }
    if (parsedConfig) {
      config = parsedConfig;
    } else {
      console.warn("[FirebaseAdmin] All service account key parsing strategies failed.");
    }
  } catch (e) {
    console.warn("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
  }
}
if (!config && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  config = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
  };
}
if (config && config.privateKey) {
  let key = config.privateKey.replace(/\\n/g, "\n").replace(/^['"]|['"]$/g, "").replace(/^['"]|['"]$/g, "").trim();
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
  config.privateKey = `${header}
${formattedBody}${footer}`;
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
    } catch (e) {
      console.error("[FirebaseAdmin] Initialization with cert failed:", e.message);
    }
  } else {
    console.log("[FirebaseAdmin] Service account credentials not present. Running with safe fallback handlers.");
  }
} else {
  isFirebaseAdminConfigured = true;
}
let firestoreInstance = null;
if (isFirebaseAdminConfigured && admin.apps.length > 0) {
  try {
    firestoreInstance = admin.firestore();
    firestoreInstance.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    console.warn("[FirebaseAdmin] Failed to initialize default Firestore instance:", e.message);
  }
}
function isFirebaseAdminAvailable() {
  return isFirebaseAdminConfigured && admin.apps.length > 0 && !!firestoreInstance;
}
const createMockQuery = () => {
  const mock = {
    get: async () => ({ docs: [], empty: true, size: 0, exists: false, data: () => null }),
    doc: () => createMockDoc(),
    collection: () => mock,
    collectionGroup: () => mock,
    where: () => mock,
    limit: () => mock,
    orderBy: () => mock,
    onSnapshot: () => () => {
    },
    add: async () => ({ id: "fallback_id" })
  };
  return mock;
};
const createMockDoc = () => ({
  get: async () => ({ exists: false, data: () => null }),
  set: async () => {
  },
  update: async () => {
  },
  delete: async () => {
  },
  collection: () => createMockQuery()
});
const dbProxy = new Proxy({}, {
  get: (_target, prop) => {
    if (isFirebaseAdminAvailable()) {
      if (!firestoreInstance) {
        try {
          firestoreInstance = admin.firestore();
          firestoreInstance.settings({ ignoreUndefinedProperties: true });
        } catch (e) {
          console.warn("[FirebaseAdmin] Lazy Firestore init error:", e.message);
        }
      }
      if (firestoreInstance) {
        const val = firestoreInstance[prop];
        if (typeof val === "function") {
          return val.bind(firestoreInstance);
        }
        return val;
      }
    }
    const mock = createMockQuery();
    if (prop in mock) {
      return typeof mock[prop] === "function" ? mock[prop] : mock;
    }
    return (..._args) => mock;
  }
});
const db = dbProxy;
var firebaseAdmin_default = admin;
export {
  db,
  firebaseAdmin_default as default,
  isFirebaseAdminAvailable
};
