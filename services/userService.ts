import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, increment, addDoc } from 'firebase/firestore';
import { User, Participant, Coach, UserRole, WalletTransaction } from '../types';

/**
 * Standardized utility to deeply clean objects for JSON serialization and Firestore safety.
 * Hardened to detect minified Firestore internal classes and break circular references.
 * Critical for preventing "Converting circular structure to JSON" errors.
 */
export const sanitizeData = (val: any, seen = new WeakSet()): any => {
    // 1. Handle null and primitives
    if (val === null || typeof val === 'undefined') return undefined;
    
    // Primitives are safe
    if (typeof val !== 'object' && typeof val !== 'function') return val;
    if (typeof val === 'function') return undefined;

    // 2. Break circular references immediately
    if (seen.has(val)) return undefined;
    
    // 3. Handle specific non-serializable but non-circular common types
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

    // 4. Detect and Strip Firestore/Firebase internal classes
    // Firebase v10 minified names often follow patterns like Q$1 (Query), Sa (Firestore)
    const constructorName = val.constructor?.name || '';
    const isFirebaseInternal = 
        /^[A-Z]\$[0-9]$|^[A-Z][a-z]$/.test(constructorName) || 
        constructorName.includes('Query') || 
        constructorName.includes('Reference') ||
        constructorName.includes('Firestore') ||
        constructorName.includes('Transaction') ||
        constructorName.includes('Firebase') ||
        constructorName.includes('App') ||
        constructorName.includes('Snapshot') ||
        constructorName.includes('Observer');

    // Check for common internal property markers (Firebase often uses 'i', 'db', 'firestore')
    // Target pattern: 'i' -> 'src' cycle mentioned in error log
    const hasSDKSignatures = !!(
        val.onSnapshot || 
        val.getDoc || 
        val._methodName || 
        val.firestore || 
        val._database ||
        val._path ||
        (val.i && (val.src || val.i.src))
    );
    
    if (isFirebaseInternal || hasSDKSignatures || val instanceof Element) {
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

    // 6. Only process "plain" objects to avoid serializing complex class instances
    // This is the most effective guard against complex SDK objects
    const proto = Object.getPrototypeOf(val);
    const isPlain = proto === null || proto === Object.prototype;
    
    if (!isPlain) {
        // If not plain, but we really want the data, we'd need a whitelist. 
        // For now, returning undefined for non-plain objects is safest.
        return undefined;
    }

    // 7. Process plain object keys
    seen.add(val);
    const cleaned: any = {};
    const keys = Object.keys(val);
    
    for (const key of keys) {
        // Strip internal-looking fields
        if (key.startsWith('_') || key.startsWith('$')) continue;
        
        try {
            const sanitizedVal = sanitizeData(val[key], seen);
            if (sanitizedVal !== undefined) {
                cleaned[key] = sanitizedVal;
            }
        } catch (e) {
            // If property access fails (e.g. on some specialized proxy)
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