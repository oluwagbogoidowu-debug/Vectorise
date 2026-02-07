
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, increment, addDoc } from 'firebase/firestore';
import { User, Participant, Coach, UserRole, WalletTransaction } from '../types';

/**
 * Standardized utility to recursively remove non-serializable values and handle circularity.
 * Strips out circular references and internal classes (like Firebase or DOM elements).
 */
export const sanitizeData = (val: any, seen = new WeakSet()): any => {
    // 1. Handle primitives and null
    if (val === null || typeof val !== 'object') return val;
    
    // 2. Prevent infinite recursion on circular structures
    if (seen.has(val)) return undefined;

    // 3. Handle Arrays
    if (Array.isArray(val)) {
        seen.add(val);
        return val.map(item => sanitizeData(item, seen)).filter(i => i !== undefined);
    }

    // 4. Handle Dates
    if (val instanceof Date) return val.toISOString();

    // 5. Handle Firestore Timestamps and common sentinel methods
    if (typeof val.toDate === 'function') return val.toDate().toISOString();

    // 6. Avoid internal Firebase/DOM class instances - only allow plain objects
    // A plain object is one created via {} or new Object()
    // Class instances like DocumentReference or Firestore will have a custom constructor.
    const isPlainObject = val.constructor === Object || Object.getPrototypeOf(val) === null;
    if (!isPlainObject) return undefined;

    // 7. Track this object to prevent circularity
    seen.add(val);

    const cleaned: any = {};
    Object.entries(val).forEach(([key, value]) => {
        const sanitizedVal = sanitizeData(value, seen);
        if (sanitizedVal !== undefined) {
            // Firestore requires string keys
            cleaned[String(key)] = sanitizedVal;
        }
    });
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
        shinePostIds: [], 
        shineCommentIds: [], 
        claimedMilestoneIds: [],
        referralCode: uid.substring(0, 8).toUpperCase(),
        walletBalance: 30,
        impactStats: { peopleHelped: 0, streak: 0 },
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
          console.error("Error approving coach:", error);
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
          console.error("Error rejecting coach:", error);
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
