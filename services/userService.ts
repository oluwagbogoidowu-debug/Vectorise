import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, increment, addDoc } from 'firebase/firestore';
import { User, Participant, Coach, UserRole, WalletTransaction } from '../types';

/**
 * Standardized utility to deeply clean objects for JSON serialization and Firestore safety.
 * Hardened to detect minified Firestore internal classes and break circular references.
 */
export const sanitizeData = (val: any, seen = new WeakSet()): any => {
    // 1. Handle null and primitives
    if (val === null || typeof val !== 'object') return val;

    // 2. Break circular references
    if (seen.has(val)) return undefined;
    seen.add(val);

    // 3. Handle Firestore Timestamps and Dates
    if (val instanceof Date) return val.toISOString();
    if (typeof val.toDate === 'function') {
        try {
            return val.toDate().toISOString();
        } catch (e) {
            return undefined;
        }
    }

    // 4. Handle Arrays
    if (Array.isArray(val)) {
        return val
            .map(item => sanitizeData(item, seen))
            .filter(i => i !== undefined);
    }

    // 5. Detect and Strip Firestore internal classes (References, Queries, Services)
    // Common minified names in Firebase SDK: Sa (Firestore), Q$1 (Query), Fe (FieldValue)
    const constructorName = val.constructor?.name || '';
    const isInternal = /^[A-Z]\$[0-9]$|^[A-Z][a-z]$/.test(constructorName) || 
                       constructorName.includes('Query') || 
                       constructorName.includes('Reference') ||
                       constructorName.includes('Firestore');
    
    // Check for common SDK patterns (onSnapshot, getDoc, _methodName)
    const hasSDKSignatures = !!(val.onSnapshot || val.getDoc || val._methodName);

    if (isInternal || hasSDKSignatures || val instanceof Element) {
        return undefined;
    }

    // 6. Only process "plain" objects
    const proto = Object.getPrototypeOf(val);
    const isPlain = proto === null || proto === Object.prototype;
    if (!isPlain) return undefined;

    const cleaned: any = {};
    const keys = Object.keys(val);
    for (const key of keys) {
        // Skip private/internal properties
        if (key.startsWith('_') || key.startsWith('$')) continue;
        
        const sanitizedVal = sanitizeData(val[key], seen);
        if (sanitizedVal !== undefined) {
            cleaned[key] = sanitizedVal;
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
        referralCode: uid.substring(0, 8).toUpperCase(),
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
      console.error("Email check failed:", error);
      return false;
    }
  },

  getUsersByIds: async (uids: string[]) => {
    const validIds = Array.from(new Set((uids || []).filter(id => !!id && typeof id === 'string' && id !== '')));
    if (validIds.length === 0) return [];

    try {
      const CHUNK_SIZE = 25;
      const results: Participant[] = [];
      const chunks: string[][] = [];
      
      for (let i = 0; i < validIds.length; i += CHUNK_SIZE) {
        chunks.push(validIds.slice(i, i + CHUNK_SIZE));
      }

      for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where("id", "in", chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          results.push(sanitizeData(doc.data()) as Participant);
        });
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
      querySnapshot.forEach((doc) => {
        coaches.push(sanitizeData(doc.data()) as Coach);
      });

      const q2 = query(collection(db, 'users'), where("hasCoachProfile", "==", true));
      const querySnapshot2 = await getDocs(q2);
      querySnapshot2.forEach((doc) => {
          const data = sanitizeData(doc.data());
          coaches.push({
              ...data,
              bio: data.coachBio || data.bio,
              niche: data.coachNiche,
              approved: data.coachApproved
          } as any);
      });

      return coaches;
    } catch (error) {
      console.error("Error fetching coaches:", error);
      return [];
    }
  },

  getParticipants: async () => {
    try {
      const q = query(collection(db, 'users'), where("role", "==", UserRole.PARTICIPANT));
      const querySnapshot = await getDocs(q);
      const participants: Participant[] = [];
      querySnapshot.forEach((doc) => {
        participants.push(sanitizeData(doc.data()) as Participant);
      });
      return participants;
    } catch (error) {
      console.error("Error fetching participants:", error);
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

  approveCoach: async (coachId: string) => {
      try {
          const userRef = doc(db, 'users', coachId);
          await updateDoc(userRef, {
              coachApproved: true,
              role: UserRole.COACH
          });
      } catch (error) {
          console.error("Error approving coach:", coachId, error);
          throw error;
      }
  },

  rejectCoach: async (coachId: string) => {
      try {
          const userRef = doc(db, 'users', coachId);
          await updateDoc(userRef, {
              coachApproved: false,
              hasCoachProfile: false 
          });
      } catch (error) {
          console.error("Error rejecting coach:", coachId, error);
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
          await updateDoc(userRef, {
              walletBalance: increment(trans.amount)
          });
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
          await updateDoc(userRef, {
              claimedMilestoneIds: arrayUnion(milestoneId)
          });
      } catch (error) {
          console.error("Error claiming milestone:", error);
          throw error;
      }
  },

  deleteUserDocument: async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);
    } catch (error) {
      console.error("Error deleting user document:", error);
      throw error;
    }
  },

  toggleSavedSprint: async (uid: string, sprintId: string, isSaved: boolean) => {
      try {
          const userRef = doc(db, 'users', uid);
          if (isSaved) {
              await updateDoc(userRef, {
                  savedSprintIds: arrayUnion(sprintId)
              });
          } else {
              await updateDoc(userRef, {
                  savedSprintIds: arrayRemove(sprintId)
                });
          }
      } catch (error) {
          console.error("Error toggling saved sprint:", error);
          throw error;
      }
  },

  addUserEnrollment: async (uid: string, sprintId: string) => {
      try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, {
              enrolledSprintIds: arrayUnion(sprintId)
          });
      } catch (error) {
          console.error("Error adding user enrollment:", error);
      }
  },

  addUserPost: async (uid: string, postId: string) => {
      try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, {
              shinePostIds: arrayUnion(postId)
          });
      } catch (error) {
          console.error("Error adding user post:", error);
      }
  },

  addUserComment: async (uid: string, commentId: string) => {
      try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, {
              shineCommentIds: arrayUnion(commentId)
          });
      } catch (error) {
          console.error("Error adding user comment:", error);
      }
  }
};