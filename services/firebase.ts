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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

/**
 * Initialize Firestore with forced long-polling.
 * This is the most robust setting for AI Studio and restricted network environments 
 * where WebSockets often fail or time out.
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, 
  ignoreUndefinedProperties: true,
  useFetchStreams: false, 
});

export const auth = getAuth(app);
const analytics = getAnalytics(app);

// Enable persistence for offline capability
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
        console.warn("Persistence failed: Browser doesn't support indexedDB.");
    }
});

/**
 * Utility to restart Firestore if connection is dropped
 */
export const reconnectFirestore = async () => {
    try {
        await terminate(db);
        window.location.reload();
    } catch (e) {
        console.error("Firestore Reconnect failed");
    }
};

export default app;