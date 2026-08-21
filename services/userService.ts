import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, increment, addDoc } from 'firebase/firestore';
import { User, Participant, Coach, UserRole, WalletTransaction } from '../types';
import { toast } from 'sonner';
import { MILESTONES, calculateMilestoneStatValue, UserMilestoneStats } from './milestoneConstants';

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
 * Specifically targets minified Firestore internal classes (Q$1, Sa, Y2, Ka, etc.) 
 * and breaks circular references to prevent "Converting circular structure to JSON" errors.
 */
export const sanitizeData = (val: any, seen = new WeakSet(), maxDepth = 10): any => {
    // 0. Null, undefined and depth check
    if (val === null) return null;
    if (typeof val === 'undefined') return undefined;
    if (maxDepth < 0) return undefined;
    
    // 1. Primitive types are safe
    if (typeof val !== 'object' && typeof val !== 'function') return val;
    if (typeof val === 'function') return undefined;

    // 2. Break circular references immediately - CRITICAL for circularity prevention
    if (seen.has(val)) return undefined;
    seen.add(val);
    
    // 3. Handle dates and specialized built-ins
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

    // 4. Detect and Strip Firestore/Firebase internal classes, DOM elements, and minified SDK objects
    const constructorName = val.constructor?.name || '';
    const isFirebaseInternal = 
        /^[A-Z][a-z0-9]$|^[A-Z]\$[0-9]$/.test(constructorName) || 
        ['Y2', 'Ka', 'Sa', 'Q$1', 't', 'Reference', 'Query', 'Snapshot', 'Firestore', 'FirebaseApp'].includes(constructorName) ||
        constructorName.includes('Firebase') || 
        constructorName.includes('Firestore') ||
        constructorName.includes('Transaction');

    // Pattern matching for specific SDK circular structures (e.g., Query.i.src)
    const hasSDKMarkers = !!(
        val.onSnapshot || 
        val.getDoc || 
        val.firestore || 
        val._database ||
        val._path ||
        val._delegate ||
        val._query ||
        (val.i && typeof val.i === 'object') ||
        (val.src && typeof val.src === 'object') ||
        (val.type === 'document' && val.path && val.id)
    );

    if (isFirebaseInternal || hasSDKMarkers || (typeof Element !== 'undefined' && val instanceof Element)) {
        return undefined;
    }

    // 5. Handle Arrays
    if (Array.isArray(val)) {
        const result = val.map(item => {
            const res = sanitizeData(item, seen, maxDepth - 1);
            return res === undefined ? null : res;
        });
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

/**
 * Safe JSON stringify that strips circular references and Firestore/Firebase internals.
 */
export const safeJSONStringify = (val: any): string => {
    try {
        const cleaned = sanitizeData(val);
        if (cleaned === undefined) return '{}';
        return JSON.stringify(cleaned);
    } catch (err) {
        try {
            const seen = new WeakSet();
            return JSON.stringify(val, (_key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) return undefined;
                    seen.add(value);
                    const constructorName = value.constructor?.name || '';
                    if (
                        /^[A-Z][a-z0-9]$|^[A-Z]\$[0-9]$/.test(constructorName) ||
                        ['Y2', 'Ka', 'Sa', 'Q$1', 't', 'Reference', 'Query', 'Snapshot'].includes(constructorName) ||
                        constructorName.includes('Firebase') ||
                        constructorName.includes('Firestore')
                    ) {
                        return undefined;
                    }
                    if (value.i && typeof value.i === 'object') return undefined;
                    if (value.src && typeof value.src === 'object') return undefined;
                }
                return value;
            }) || '{}';
        } catch (e) {
            return '{}';
        }
    }
};

/**
 * Deep clone an object safely without throwing circular reference errors.
 */
export const safeClone = <T>(val: T): T => {
    if (val === null || typeof val !== 'object') return val;
    try {
        const cleaned = sanitizeData(val);
        if (cleaned === undefined) return val;
        return JSON.parse(JSON.stringify(cleaned)) as T;
    } catch (e) {
        try {
            return JSON.parse(safeJSONStringify(val)) as T;
        } catch (err) {
            return val;
        }
    }
};

export const userService = {
  queueNotification,
  createUserDocument: async (uid: string, data: Partial<User | Participant | Coach>) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const existingData = userSnap.data();
        // Crucial bugfix: If the user document already exists, we MUST return their existing 
        // profile exactly as is. We must NEVER call updateDoc with default/basic onboarding 
        // fields that would overwrite their account data or downgrade their user role (especially 
        // from ADMIN/COACH to PARTICIPANT).
        return sanitizeData(existingData) as User | Participant | Coach;
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
    const validIds = Array.from(new Set((uids || []).filter(id => !!id && typeof id === 'string' && id.trim() !== '')));
    if (validIds.length === 0) return [];
    try {
      const results: Participant[] = [];
      const userMap = new Map<string, Participant>();

      // 1. Direct document fetches
      await Promise.all(validIds.map(async (uid) => {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            const data = sanitizeData({ id: userSnap.id, ...userSnap.data() }) as Participant;
            userMap.set(uid, data);
          }
        } catch (e) {}
      }));

      // 2. Query fallback for any not found yet
      const missingIds = validIds.filter(id => !userMap.has(id));
      if (missingIds.length > 0) {
        const CHUNK_SIZE = 25;
        for (let i = 0; i < missingIds.length; i += CHUNK_SIZE) {
          const chunk = missingIds.slice(i, i + CHUNK_SIZE);
          try {
            const q = query(collection(db, 'users'), where("id", "in", chunk));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
              const d = sanitizeData({ id: doc.id, ...doc.data() }) as Participant;
              userMap.set(doc.id, d);
            });
          } catch (e) {}
        }
      }

      return Array.from(userMap.values());
    } catch (error) {
      console.error("Error fetching users by IDs:", error);
      return [];
    }
  },

  getAllCoaches: async () => {
    try {
      const q1 = query(collection(db, 'users'), where("role", "==", UserRole.COACH));
      const q2 = query(collection(db, 'users'), where("coachApplicationSubmitted", "==", true));
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const map = new Map<string, Coach>();
      snap1.forEach((doc) => {
        const d = sanitizeData({ id: doc.id, ...doc.data() }) as Coach;
        map.set(doc.id, d);
      });
      snap2.forEach((doc) => {
        const d = sanitizeData({ id: doc.id, ...doc.data() }) as Coach;
        map.set(doc.id, d);
      });
      
      return Array.from(map.values());
    } catch (error) {
      return [];
    }
  },

  getCoaches: async () => {
    try {
      const q = query(collection(db, 'users'), where("role", "==", UserRole.COACH));
      const querySnapshot = await getDocs(q);
      const coaches: Coach[] = [];
      querySnapshot.forEach((doc) => coaches.push(sanitizeData({ id: doc.id, ...doc.data() }) as Coach));
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
      querySnapshot.forEach((doc) => participants.push(sanitizeData({ id: doc.id, ...doc.data() }) as Participant));
      return participants;
    } catch (error) {
      return [];
    }
  },

  getAllUsers: async () => {
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const allUsers: Participant[] = [];
      querySnapshot.forEach((doc) => allUsers.push(sanitizeData({ id: doc.id, ...doc.data() }) as Participant));
      return allUsers;
    } catch (error) {
      console.error("Error fetching all users:", error);
      return [];
    }
  },

  deleteUserAccount: async (userId: string) => {
    try {
      // 1. Delete notifications
      const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
      const notificationsSnap = await getDocs(notificationsQuery);
      for (const d of notificationsSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Delete wallet_transactions
      const transactionsQuery = query(collection(db, 'wallet_transactions'), where('userId', '==', userId));
      const transactionsSnap = await getDocs(transactionsQuery);
      for (const d of transactionsSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 3. Delete ShinePost
      const shineQuery = query(collection(db, 'ShinePost'), where('userId', '==', userId));
      const shineSnap = await getDocs(shineQuery);
      for (const d of shineSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 4. Delete enrollments subcollection
      const enrollmentsRef = collection(db, 'users', userId, 'enrollments');
      const enrollmentsSnap = await getDocs(enrollmentsRef);
      for (const d of enrollmentsSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 5. Delete claims subcollection
      const claimsRef = collection(db, 'users', userId, 'claims');
      const claimsSnap = await getDocs(claimsRef);
      for (const d of claimsSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 6. Delete partner applications
      const partnerAppQuery = query(collection(db, 'partner_applications'), where('userId', '==', userId));
      const partnerAppSnap = await getDocs(partnerAppQuery);
      for (const d of partnerAppSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 7. Delete main user document
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);

      toast.success("User account deleted successfully");
    } catch (error) {
      console.error("Error deleting user account:", error);
      toast.error("Failed to delete user account");
      throw error;
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
          const claimRecordRef = doc(db, 'users', uid, 'claims', `${uid}_${milestoneId}`);
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

              // 4. Update user balance, claimed IDs, and claimed badges array for sync
              transaction.update(userRef, {
                  walletBalance: increment(points),
                  claimedMilestoneIds: arrayUnion(milestoneId),
                  claimedBadges: arrayUnion({
                      milestoneId: milestoneId,
                      claimedAt: new Date().toISOString(),
                      claimedCredit: points,
                      processed: true
                  })
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
          
          try {
            const storageKeyUnlocked = `vectorise_unlocked_milestones_${uid}`;
            const stored = localStorage.getItem(storageKeyUnlocked);
            const list: string[] = stored ? JSON.parse(stored) : [];
            if (!list.includes(milestoneId)) {
              list.push(milestoneId);
              localStorage.setItem(storageKeyUnlocked, JSON.stringify(list));
            }
          } catch (e) {}

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

  notifyMilestoneReached: (milestoneTitle: string, points: number, actionLabel: string = "Claim") => {
    queueNotification('info', `Milestone Reached: ${milestoneTitle}`, {
      description: `${points} coins are ready to claim in the Hall of Rise!`,
      action: {
        label: actionLabel,
        onClick: () => window.location.href = '/profile/hall-of-rise'
      },
      duration: 5000,
    });
  },

  checkAndNotifyMilestones: async (uid: string, stats: UserMilestoneStats, currentClaimedIds: string[], userDocNotifiedIds?: string[]) => {
    if (!uid) return;

    // Only include milestones that are actually in the Hall of Rise (MILESTONES)
    // and are NOT auto-claimed (since those notify immediately upon auto-claim)
    const manualMilestones = MILESTONES.filter(m => !m.isAutoClaim);
    const storageKeyUnlocked = `vectorise_unlocked_milestones_${uid}`;
    const storageKeyInit = `vectorise_milestones_init_${uid}`;

    let knownUnlockedIds: string[] = [];
    try {
      const stored = localStorage.getItem(storageKeyUnlocked);
      if (stored) {
        knownUnlockedIds = JSON.parse(stored);
      }
    } catch (e) {
      knownUnlockedIds = [];
    }

    if (userDocNotifiedIds && Array.isArray(userDocNotifiedIds)) {
      userDocNotifiedIds.forEach(id => {
        if (!knownUnlockedIds.includes(id)) {
          knownUnlockedIds.push(id);
        }
      });
    }

    const isInitialized = localStorage.getItem(storageKeyInit) === 'true';

    if (!isInitialized) {
      // First baseline evaluation for this user on this browser session/device:
      // Record any already unlocked / historical milestones into known list so we NEVER blast stale toasts on initial load
      const initialUnlocked: string[] = Array.from(new Set([...knownUnlockedIds, ...currentClaimedIds]));
      for (const m of manualMilestones) {
        const val = calculateMilestoneStatValue(m.id, stats);
        if (val >= m.targetValue) {
          if (!initialUnlocked.includes(m.id)) {
            initialUnlocked.push(m.id);
          }
        }
      }
      try {
        localStorage.setItem(storageKeyUnlocked, JSON.stringify(initialUnlocked));
        localStorage.setItem(storageKeyInit, 'true');
      } catch (e) {
        console.error("Failed to initialize unlocked milestones storage:", e);
      }
      return;
    }

    // Real-time checks: Only notify for badges that genuinely just transitioned to unlocked!
    let updatedList = [...knownUnlockedIds];
    let hasChanges = false;
    const newlyUnlockedIds: string[] = [];

    for (const m of manualMilestones) {
      const val = calculateMilestoneStatValue(m.id, stats);
      const isUnlocked = val >= m.targetValue;
      const isClaimed = currentClaimedIds.includes(m.id);
      const alreadyKnown = updatedList.includes(m.id);

      if (isUnlocked && !isClaimed && !alreadyKnown) {
        // True milestone unlock moment!
        updatedList.push(m.id);
        newlyUnlockedIds.push(m.id);
        hasChanges = true;

        const sessionKey = `notified_${uid}_${m.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, 'true');
          userService.notifyMilestoneReached(m.title, m.points);
        }
      } else if (isClaimed && !alreadyKnown) {
        updatedList.push(m.id);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      try {
        localStorage.setItem(storageKeyUnlocked, JSON.stringify(updatedList));
      } catch (e) {
        console.error("Failed to save unlocked milestones to localStorage:", e);
      }

      if (newlyUnlockedIds.length > 0) {
        try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, {
            notifiedMilestoneIds: arrayUnion(...newlyUnlockedIds)
          });
        } catch (err) {
          console.warn("Could not persist notifiedMilestoneIds to Firestore:", err);
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

  adminDeleteUserAuth: async (userId: string) => {
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'clear_auth' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear user authentication');
      toast.success("User authentication cleared successfully");
      return data;
    } catch (error: any) {
      console.error("Error clearing user auth:", error);
      toast.error(error?.message || "Failed to clear user auth");
      throw error;
    }
  },

  adminDeleteUserDb: async (userId: string) => {
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'delete_db' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user database document');
      toast.success("User database file & records deleted successfully");
      return data;
    } catch (error: any) {
      console.error("Error deleting user database file:", error);
      toast.error(error?.message || "Failed to delete user database document");
      throw error;
    }
  },

  adminDeleteUserFull: async (userId: string) => {
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'delete_both' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to completely delete user');
      toast.success("User completely removed from Auth and Database");
      return data;
    } catch (error: any) {
      console.error("Error deleting user completely:", error);
      toast.error(error?.message || "Failed to delete user");
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
      await updateDoc(userRef, { 
        approved: true,
        role: UserRole.COACH,
        coachApplicationApproved: true
      });
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
    if (user.isIdentityComplete) return true;
    if (user.claimedMilestoneIds?.includes('setup_identity')) return true;
    return (user.growthAreas?.length || 0) === 5 && !!user.risePathway && !!user.profileImageUrl;
  }
};