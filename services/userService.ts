import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, increment, addDoc } from 'firebase/firestore';
import { User, Participant, Coach, UserRole, WalletTransaction } from '../types';

/**
 * Hardened utility to deeply clean objects for JSON serialization and Firestore safety.
 * Detects minified Firestore internal classes and breaks circular references.
 * Specifically handles the "Q$1" / "Sa" internal constructors seen in error logs.
 */
export const sanitizeData = (val: any, seen = new WeakSet()): any => {
    // 1. Handle primitives and nulls
    if (val === null || typeof val === 'undefined') return undefined;
    if (typeof val !== 'object' && typeof val !== 'function') return val;
    if (typeof val === 'function') return undefined;

    // 2. Break circular references
    if (seen.has(val)) return undefined;
    
    // 3. Handle common safe non-plain objects
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

    // 4. STRIP SDK INTERNALS (Fixes "Converting circular structure to JSON")
    // Detects minified names like Q$1, Sa, and standard SDK names
    const constructorName = val.constructor?.name || '';
    const isInternal = 
        /^[A-Z]\$[0-9]$|^[A-Z][a-z]$/.test(constructorName) || 
        constructorName.includes('Query') || 
        constructorName.includes('Reference') ||
        constructorName.includes('Firestore') ||
        constructorName.includes('Firebase') ||
        constructorName.includes('App') ||
        constructorName.includes('Snapshot') ||
        constructorName.includes('Observer') ||
        constructorName === 'DocumentReference' ||
        constructorName === 'CollectionReference';

    // Property-based detection for minified SDK objects
    const hasSDKMarkers = !!(
        val.onSnapshot || 
        val.getDoc || 
        val.firestore || 
        val._database ||
        val._path ||
        val._methodName ||
        (val.i && (val.src || (val.i && val.i.src))) // Matches the error log pattern
    );
    
    if (isInternal || hasSDKMarkers || val instanceof Element) {
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

    // 6. Only process plain objects to avoid serializing complex class instances
    const proto = Object.getPrototypeOf(val);
    if (proto !== null && proto !== Object.prototype) {
        return undefined;
    }

    // 7. Recurse into plain object keys
    seen.add(val);
    const cleaned: any = {};
    const keys = Object.keys(val);
    
    for (const key of keys) {
        // Skip internal-looking properties
        if (key.startsWith('_') || key.startsWith('$')) continue;
        
        try {
            const sanitizedVal = sanitizeData(val[key], seen);
            if (sanitizedVal !== undefined) {
                cleaned[key] = sanitizedVal;
            }
        } catch (e) {
            // Handle inaccessible properties
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