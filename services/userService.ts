import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, increment, addDoc } from 'firebase/firestore';
import { User, Participant, Coach, UserRole, WalletTransaction } from '../types';

/**
 * Hardened utility to deeply clean objects for Firestore safety and JSON serialization.
 * Specifically targets minified Firestore internal classes (Q$1, Sa, etc.) 
 * and breaks circular references to prevent "Converting circular structure to JSON" errors.
 */
export const sanitizeData = (val: any, seen = new WeakSet()): any => {
    // 1. Handle null and primitives
    if (val === null || typeof val === 'undefined') return undefined;
    if (typeof val !== 'object' && typeof val !== 'function') return val;
    if (typeof val === 'function') return undefined;

    // 2. Break circular references immediately
    if (seen.has(val)) return undefined;
    
    // 3. Handle common non-serializable but safe common types
    if (val instanceof Date) return val.toISOString();
    
    // Handle Firestore Timestamps
    if (typeof val.toDate === 'function') {
        try {
            const date = val.toDate();
            return date instanceof Date ? date.toISOString() : undefined;
        } catch (e) {
            return undefined;
        }
    }

    // 4. Detect and Strip Firestore/Firebase internal classes and DOM elements
    // Minified names often follow patterns like Q$1, Sa, Y2, Ka, etc.
    const constructorName = val.constructor?.name || '';
    const isFirebaseInternal = 
        /^[A-Z][a-z0-9]$|^[A-Z]\$[0-9]$/.test(constructorName) || 
        constructorName.includes('Query') || 
        constructorName.includes('Reference') ||
        constructorName.includes('Firestore') ||
        constructorName.includes('Transaction') ||
        constructorName.includes('Firebase') ||
        constructorName.includes('App') ||
        constructorName.includes('Snapshot') ||
        constructorName.includes('Observer') ||
        constructorName.includes('Collection');

    // Pattern matching for specific SDK circular structures (e.g., Query.i.src)
    // The 'i' and 'src' properties are common markers in minified Firestore SDK internals.
    const hasSDKMarkers = !!(
        val.onSnapshot || 
        val.getDoc || 
        val.firestore || 
        val._database ||
        val._path ||
        (val.i && (val.src || (val.i && val.i.src) || (val.i && val.i.i))) ||
        (val.src && (val.src.i || val.src.src))
    );

    if (isFirebaseInternal || hasSDKMarkers || val instanceof Element) {
        return undefined;
    }

    // 5. Handle Arrays
    if (Array.isArray(val)) {
        seen.add(val);
        const result = val
            .map(item => sanitizeData(item, seen))
            .filter(i => i !== undefined);
        return result;
    }

    // 6. Strict "Plain Object" check
    // We only want to serialize things that are pure data containers.
    // Class instances, Proxies, or SDK internals that pass step 4 will be caught here.
    const proto = Object.getPrototypeOf(val);
    const isPlain = proto === null || proto === Object.prototype;
    
    if (!isPlain) {
        return undefined;
    }

    // 7. Process plain object keys
    seen.add(val);
    const cleaned: any = {};
    const keys = Object.keys(val);
    
    for (const key of keys) {
        // Skip internal/private keys
        if (key.startsWith('_') || key.startsWith('$')) continue;
        
        try {
            const sanitizedVal = sanitizeData(val[key], seen);
            if (sanitizedVal !== undefined) {
                cleaned[key] = sanitizedVal;
            }
        } catch (e) {
            continue;
        }
    }
    return cleaned;
};

export const userService = {
  createUserDocument: async (uid: string, data: Partial<User | Participant | Coach>) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userData = sanitizeData({
        id: uid,
        createdAt: new Date().toISOString(),
        role: UserRole.PARTICIPANT,
        savedSprintIds: [], 
        enrolledSprintIds: [], 
        wishlistSprintIds: [],
        shinePostIds: [], 
        shineCommentIds: [], 
        claimedMilestoneIds: [],
        referralCode: (uid || '').substring(0, 8).toUpperCase(),
        walletBalance: 50,
        impactStats: { peopleHelped: 0, streak: 0 },
        isPartner: false,
        ...data
      });
      await setDoc(userRef, userData, { merge: true });
      return userData;
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  },

  getUserDocument: async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return sanitizeData(userSnap.data()) as User | Participant | Coach;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error fetching user document:", error);
      throw error;
    }
  },

  checkEmailExists: async (email: string): Promise<boolean> => {
    try {
      const q = query(collection(db, 'users'), where("email", "==", email.toLowerCase().trim()));
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (error) {
      return false;
    }
  },

  getUsersByIds: async (uids: string[]) => {
    const validIds = Array.from(new Set((uids || []).filter(id => !!id && typeof id === 'string' && id !== '')));
    if (validIds.length === 0) return [];
    try {
      const CHUNK_SIZE = 25;
      const results: Participant[] = [];
      for (let i = 0; i < validIds.length; i += CHUNK_SIZE) {
        const chunk = validIds.slice(i, i + CHUNK_SIZE);
        const q = query(collection(db, 'users'), where("id", "in", chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => results.push(sanitizeData(doc.data()) as Participant));
      }
      return results;
    } catch (error) {
      console.error("Error fetching users by IDs:", error);
      return [];
    }
  },

  getCoaches: async () => {
    try {
      const q = query(collection(db, 'users'), where("role", "==", UserRole.COACH));
      const querySnapshot = await getDocs(q);
      const coaches: Coach[] = [];
      querySnapshot.forEach((doc) => coaches.push(sanitizeData(doc.data()) as Coach));
      return coaches;
    } catch (error) {
      return [];
    }
  },

  getParticipants: async () => {
    try {
      const q = query(collection(db, 'users'), where("role", "==", UserRole.PARTICIPANT));
      const querySnapshot = await getDocs(q);
      const participants: Participant[] = [];
      querySnapshot.forEach((doc) => participants.push(sanitizeData(doc.data()) as Participant));
      return participants;
    } catch (error) {
      return [];
    }
  },

  updateUserDocument: async (uid: string, data: Partial<User | Participant | Coach>) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, sanitizeData(data));
    } catch (error) {
      console.error("Error updating user document:", error);
      throw error;
    }
  },

  processWalletTransaction: async (userId: string, trans: Omit<WalletTransaction, 'id' | 'userId' | 'timestamp'>) => {
      try {
          const transRef = collection(db, 'wallet_transactions');
          const transactionData = sanitizeData({
              ...trans,
              userId,
              timestamp: new Date().toISOString()
          });
          await addDoc(transRef, transactionData);
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, { walletBalance: increment(trans.amount) });
      } catch (error) {
          console.error("Transaction Ledger Error:", error);
          throw error;
      }
  },

  claimMilestone: async (uid: string, milestoneId: string, points: number) => {
      try {
          await userService.processWalletTransaction(uid, {
              amount: points,
              type: 'milestone',
              description: `Claimed milestone: ${milestoneId}`,
              auditId: milestoneId
          });
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, { claimedMilestoneIds: arrayUnion(milestoneId) });
      } catch (error) {
          throw error;
      }
  },

  deleteUserDocument: async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);
    } catch (error) {
      throw error;
    }
  },

  toggleSavedSprint: async (uid: string, sprintId: string, isSaved: boolean) => {
      try {
          const userRef = doc(db, 'users', uid);
          if (isSaved) {
              await updateDoc(userRef, { savedSprintIds: arrayUnion(sprintId) });
          } else {
              await updateDoc(userRef, { savedSprintIds: arrayRemove(sprintId) });
          }
      } catch (error) {
          throw error;
      }
  },

  addUserEnrollment: async (uid: string, sprintId: string) => {
      try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, { enrolledSprintIds: arrayUnion(sprintId) });
      } catch (error) {}
  },

  addUserPost: async (uid: string, postId: string) => {
      try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, { shinePostIds: arrayUnion(postId) });
      } catch (error) {}
  },

  addUserComment: async (uid: string, commentId: string) => {
      try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, { shineCommentIds: arrayUnion(commentId) });
      } catch (error) {}
  }
};