import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, terminate } from "firebase/firestore";

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
 * Initialize Firestore with optimized settings.
 * - experimentalAutoDetectLongPolling: Allows SDK to choose between WebSockets and Long Polling.
 * - ignoreUndefinedProperties: Prevents errors when saving objects with undefined fields.
 * - useFetchStreams: false: Avoids streaming issues in certain network environments.
 */
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true, 
  ignoreUndefinedProperties: true,
  useFetchStreams: false, 
});

const analytics = getAnalytics(app);
export const auth = getAuth(app);

// Enable persistence with a check to prevent errors in environments that don't support it
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
        console.warn("Persistence failed: Browser doesn't support indexedDB.");
    }
});

/**
 * Utility to restart Firestore if it gets into a bad state (timeout loops)
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