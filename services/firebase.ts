import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

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
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable persistence with a check to prevent errors in environments that don't support it
// (e.g., SSR, specific private modes, or multiple tabs if not handled)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
        console.warn("Persistence failed: Browser doesn't support indexedDB.");
    }
});

export default app;