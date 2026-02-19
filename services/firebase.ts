import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { initializeFirestore, enableIndexedDbPersistence, terminate } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDEijT9QTC6wTyv_u2BN_UTC3NeOmADkI8",
  authDomain: "vectorise-f19d4.firebaseapp.com",
  projectId: "vectorise-f19d4",
  storageBucket: "vectorise-f19d4.firebasestorage.app",
  messagingSenderId: "617918084896",
  appId: "1:617918084896:web:2e1b531c6a0fd9e85f8945",
  measurementId: "G-M7NVQD0H7B"
};

const app = initializeApp(firebaseConfig);

/**
 * Hardened Firestore configuration.
 * experimentalForceLongPolling: true is required for environments where WebSockets are blocked.
 * useFetchStreams: false prevents connectivity issues in browsers with restrictive streaming policies.
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
  ignoreUndefinedProperties: true
});

export const auth = getAuth(app);
const analytics = getAnalytics(app);

// Enable persistence for offline capability with more robust error checking
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("[Firestore] Persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
      console.warn("[Firestore] Persistence failed: Browser doesn't support indexedDB.");
    }
  });
}

/**
 * Utility to restart Firestore if connection is dropped
 */
export const reconnectFirestore = async () => {
  try {
    await terminate(db);
    window.location.reload();
  } catch (e) {
    console.error("[Firestore] Reconnect failed", e);
  }
};

export default app;