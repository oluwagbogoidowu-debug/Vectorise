import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, terminate } from "firebase/firestore";

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
 * Standard Firestore configuration.
 */
export const db = getFirestore(app);

export const auth = getAuth(app);
const analytics = getAnalytics(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Hardened error handler for Firestore operations.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Capture base error info
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('[Firestore Context]:', errInfo);

  // CRITICAL: Must be a JSON string for the system to diagnose security rule issues properly
  throw new Error(JSON.stringify(errInfo));
}

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