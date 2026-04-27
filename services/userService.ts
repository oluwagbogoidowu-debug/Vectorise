import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, increment, addDoc } from 'firebase/firestore';
import { User, Participant, Coach, UserRole, WalletTransaction } from '../types';
import { toast } from 'sonner';
import { MILESTONES } from './milestoneConstants';

// Notification Queue System
const notificationQueue: { type: 'success' | 'info' | 'error', message: string, options: any }[] = [];
let isProcessingQueue = false;

const processQueue = async () => {
  if (isProcessingQueue || notificationQueue.length === 0) return;
  isProcessingQueue = true;

  while (notificationQueue.length > 0) {
    const next = notificationQueue.shift();
    if (next) {
      // Clear any existing toasts to ensure "Never make them show at the same time"
      toast.dismiss();
      
      if (next.type === 'success') toast.success(next.message, next.options);
      else if (next.type === 'info') toast.info(next.message, next.options);
      else if (next.type === 'error') toast.error(next.message, next.options);
      
      const duration = next.options?.duration || 3000;
      // Wait for the toast to finish + 2 seconds break
      await new Promise(resolve => setTimeout(resolve, duration + 2000));
    }
  }

  isProcessingQueue = false;
};

const queueNotification = (type: 'success' | 'info' | 'error', message: string, options: any) => {
  notificationQueue.push({ type, message, options });
  processQueue();
};

/**
 * Hardened utility to deeply clean objects for Firestore safety and JSON serialization.
 * Specifically targets minified Firestore internal classes (Q$1, Sa, etc.) 
 * and breaks circular references to prevent "Converting circular structure to JSON" errors.
 */
export const sanitizeData = (val: any, seen = new WeakSet(), maxDepth = 10): any => {
    // 0. Depth check to prevent infinite recursion
    if (maxDepth < 0) return undefined;
    // 1. Handle null and primitives
    if (val === null || typeof val === 'undefined') return undefined;
    if (typeof val !== 'object' && typeof val !== 'function') return val;
    if (typeof val === 'function') return undefined;

    // 2. Break circular references immediately
    if (seen.has(val)) return undefined;
    
    // 3. Handle common non-serializable but safe common types
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Map || val instanceof Set || val instanceof WeakMap || val instanceof WeakSet) return undefined;
    
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
        ['Y2', 'Ka', 'Sa', 'Q$1', 't'].includes(constructorName) ||
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
        (val.i && typeof val.i === 'object' && (val.src || val.i.src || val.i.i)) ||
        (val.src && typeof val.src === 'object' && (val.src.i || val.src.src)) ||
        (val.type === 'document' && val.path && val.id) // Firestore DocumentReference
    );

    if (isFirebaseInternal || hasSDKMarkers || val instanceof Element || (val.constructor && val.constructor.name === 'Object' && val.i && val.src)) {
        return undefined;
    }

    // 5. Handle Arrays
    if (Array.isArray(val)) {
        seen.add(val);
        const result = val
            .map(item => sanitizeData(item, seen, maxDepth - 1))
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
            const sanitizedVal = sanitizeData(val[key], seen, maxDepth - 1);
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
  queueNotification,
  createUserDocument: async (uid: string, data: Partial<User | Participant | Coach>) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const existingData = userSnap.data();
        await updateDoc(userRef, sanitizeData(data));
        return { ...existingData, ...data };
      }

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
        walletBalance: 0,
        impactStats: { peopleHelped: 0, streak: 0 },
        isPartner: false,
        notificationState: 'New',
        ...data
      });
      await setDoc(userRef, userData);
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

  getUserByEmail: async (email: string): Promise<User | Participant | Coach | null> => {
    try {
      const q = query(collection(db, 'users'), where("email", "==", email.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return sanitizeData(snap.docs[0].data()) as User | Participant | Coach;
    } catch (error) {
      return null;
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

  getAllCoaches: async () => {
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
          
          // Use a transaction to ensure the balance update and ledger entry are linked
          // Actually, for simplicity and consistency with firestore rules, we'll keep it as is 
          // but ensure it's called within transactions where needed.
          await addDoc(transRef, transactionData);
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, { walletBalance: increment(trans.amount) });
      } catch (error) {
          console.error("Transaction Ledger Error:", error);
          throw error;
      }
  },

  claimMilestone: async (uid: string, milestoneId: string, points: number, isAutoClaim = false) => {
      try {
          const { runTransaction } = await import('firebase/firestore');
          const userRef = doc(db, 'users', uid);
          const claimRecordRef = doc(db, 'claims', `${uid}_${milestoneId}`);
          const transRef = collection(db, 'wallet_transactions');

          await runTransaction(db, async (transaction) => {
              // 1. Check user doc
              const userSnap = await transaction.get(userRef);
              if (!userSnap.exists()) return;

              const userData = userSnap.data() as Participant;
              if (userData.claimedMilestoneIds?.includes(milestoneId)) {
                  console.log(`[UserService] Milestone ${milestoneId} already claimed for user ${uid}`);
                  return;
              }

              // 2. Secondary check against dedicated claims collection (Fortress Guard)
              const claimSnap = await transaction.get(claimRecordRef);
              if (claimSnap.exists()) {
                  console.log(`[UserService] Milestone ${milestoneId} exists in claims record for user ${uid}`);
                  // Repair the user doc if it was missing the ID
                  transaction.update(userRef, {
                      claimedMilestoneIds: arrayUnion(milestoneId)
                  });
                  return;
              }

              // 3. Log the transaction
              const transactionDocRef = doc(transRef);
              const transactionData = sanitizeData({
                  amount: points,
                  type: 'milestone',
                  description: `Claimed milestone: ${milestoneId}`,
                  auditId: milestoneId,
                  userId: uid,
                  timestamp: new Date().toISOString()
              });
              transaction.set(transactionDocRef, transactionData);

              // 4. Update user balance and claimed IDs
              transaction.update(userRef, {
                  walletBalance: increment(points),
                  claimedMilestoneIds: arrayUnion(milestoneId)
              });

              // 5. Record permanent claim (Non-riggable record)
              transaction.set(claimRecordRef, {
                  userId: uid,
                  milestoneId: milestoneId,
                  points: points,
                  claimedAt: new Date().toISOString(),
                  isAutoClaim: isAutoClaim
              });
          });
          
          // Only show notification if it's in the Hall of Rise (MILESTONES)
          const milestoneDef = MILESTONES.find(m => m.id === milestoneId);
          if (isAutoClaim && milestoneDef) {
            queueNotification('success', `Bonus! +${points} Coins earned for ${milestoneDef.title}`, {
              description: "Keep rising!",
              duration: 3000,
            });
          }
      } catch (error) {
          console.error("Error claiming milestone:", error);
          throw error;
      }
  },

  notifyMilestoneReached: (milestoneId: string, points: number, actionLabel: string = "Claim") => {
    queueNotification('info', `Milestone Reached: ${milestoneId}`, {
      description: `${points} coins are ready to claim in the Hall of Rise!`,
      action: {
        label: actionLabel,
        onClick: () => window.location.href = '/profile/hall-of-rise'
      },
      duration: 5000,
    });
  },

  checkAndNotifyMilestones: async (uid: string, stats: any, currentClaimedIds: string[]) => {
    // Only include milestones that are actually in the Hall of Rise (MILESTONES)
    // and are NOT auto-claimed (since those notify immediately)
    const manualMilestones = MILESTONES.filter(m => !m.isAutoClaim);

    const getStatValue = (id: string) => {
        switch(id) {
            case 's1': return stats.started;
            case 's2': return stats.completed;
            case 's4': return stats.completed;
            case 'cm1': return stats.daysActive;
            case 'cm2': return stats.daysActive;
            case 'r1': return stats.meaningfulReflections;
            case 'r2': return stats.meaningfulReflections;
            case 'i1': return stats.peopleHelped;
            case 'i10': return stats.peopleHelped;
            default: return 0;
        }
    };

    for (const m of manualMilestones) {
      const val = getStatValue(m.id);
      if (val >= m.targetValue && !currentClaimedIds.includes(m.id)) {
        // Check if we already notified in this session to avoid spam
        const sessionKey = `notified_${m.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
          userService.notifyMilestoneReached(m.title, m.points);
          sessionStorage.setItem(sessionKey, 'true');
        }
      }
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

  approveCoach: async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { approved: true });
    } catch (error) {
      console.error("Error approving coach:", error);
      throw error;
    }
  },

  addUserComment: async (uid: string, commentId: string) => {
      try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, { shineCommentIds: arrayUnion(commentId) });
      } catch (error) {}
  },

  isIdentitySet: (user: Participant | null): boolean => {
    if (!user) return false;
    return (user.growthAreas?.length || 0) === 5 && !!user.risePathway && !!user.profileImageUrl;
  }
};