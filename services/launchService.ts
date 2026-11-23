import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  increment,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

export type LaunchItemType = 'sprint' | 'track';

export interface LaunchControllable {
  id: string;
  title?: string;
  isComingSoon?: boolean;
  launchDate?: string;
  preRegistrationEnabled?: boolean;
  hasLimitedSlots?: boolean;
  slotLimit?: number | null;
  reservedCount?: number;
  interestCount?: number;
  contentType?: string;
}

const EXPERIENCES_CATEGORIES = ['Sprint', 'RiseBlog', 'Ignite', 'Challenge'] as const;

export function sanitizeEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function isEntityComingSoon(entity?: LaunchControllable | null): boolean {
  return Boolean(entity?.isComingSoon);
}

/**
 * Returns remaining slots strictly when capacity is genuinely limited
 * (hasLimitedSlots === true && slotLimit > 0). Otherwise returns null.
 */
export function getRemainingSlots(entity?: LaunchControllable | null): number | null {
  if (!entity || entity.hasLimitedSlots !== true) return null;
  const limit = Number(entity.slotLimit);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const reserved = Math.max(0, Number(entity.reservedCount) || 0);
  return Math.max(0, limit - reserved);
}

export function isRegistrationFull(entity?: LaunchControllable | null): boolean {
  const remaining = getRemainingSlots(entity);
  return remaining !== null && remaining <= 0;
}

async function resolveSprintDocRefClient(sprintId: string) {
  for (const cat of EXPERIENCES_CATEGORIES) {
    const ref = doc(db, 'experiences', cat, 'items', sprintId, 'sprintdetails', 'info');
    const snap = await getDoc(ref);
    if (snap.exists()) return ref;
  }
  const flatRef = doc(db, 'experiences', sprintId, 'sprintdetails', 'info');
  const flatSnap = await getDoc(flatRef);
  if (flatSnap.exists()) return flatRef;
  return null;
}

export const launchService = {
  recordLaunchInterest: async (params: {
    itemType: LaunchItemType;
    itemId: string;
    itemTitle: string;
    email: string;
    name?: string;
    userId?: string;
  }): Promise<{ alreadyRecorded: boolean }> => {
    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Email is required to register interest.');
    const safeEmail = sanitizeEmailKey(cleanEmail);
    const docId = `${params.itemType}_${params.itemId}_${safeEmail}`;
    const interestRef = doc(db, 'launch_interests', docId);

    const targetRef =
      params.itemType === 'track'
        ? doc(db, 'tracks', params.itemId)
        : await resolveSprintDocRefClient(params.itemId);

    let alreadyRecorded = false;

    await runTransaction(db, async (tx) => {
      const existingSnap = await tx.get(interestRef);
      let targetSnap: any = null;
      if (targetRef) {
        targetSnap = await tx.get(targetRef);
      }

      if (existingSnap.exists()) {
        alreadyRecorded = true;
        return;
      }

      tx.set(interestRef, {
        id: docId,
        itemType: params.itemType,
        itemId: params.itemId,
        itemTitle: params.itemTitle,
        email: cleanEmail,
        name: params.name || 'Vectorise User',
        userId: params.userId || null,
        createdAt: new Date().toISOString(),
      });

      if (targetRef && targetSnap?.exists()) {
        tx.update(targetRef, {
          interestCount: increment(1),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    if (!alreadyRecorded && params.itemType === 'sprint') {
      try {
        localStorage.removeItem(`vectorise_sprint_cache_${params.itemId}`);
      } catch {
        // ignore storage errors
      }
    }

    return { alreadyRecorded };
  },

  hasUserShownInterest: async (
    itemType: LaunchItemType,
    itemId: string,
    email?: string | null
  ): Promise<boolean> => {
    if (!email || !itemId) return false;
    const safeEmail = sanitizeEmailKey(email);
    const docId = `${itemType}_${itemId}_${safeEmail}`;
    try {
      const snap = await getDoc(doc(db, 'launch_interests', docId));
      return snap.exists();
    } catch {
      return false;
    }
  },

  hasUserReservedSpot: async (
    itemType: LaunchItemType,
    itemId: string,
    email?: string | null,
    userId?: string | null
  ): Promise<boolean> => {
    if (!itemId) return false;
    try {
      if (email) {
        const safeEmail = sanitizeEmailKey(email);
        const snap = await getDoc(doc(db, 'launch_reservations', `${itemType}_${itemId}_${safeEmail}`));
        if (snap.exists()) return true;
      }
      if (userId) {
        const q = query(
          collection(db, 'launch_reservations'),
          where('itemType', '==', itemType),
          where('itemId', '==', itemId),
          where('userId', '==', userId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) return true;
      }
    } catch {
      // ignore query errors
    }
    return false;
  },

  reserveFreeSpot: async (params: {
    itemType: LaunchItemType;
    itemId: string;
    itemTitle: string;
    email: string;
    name?: string;
    userId?: string;
    selectedTier?: 'standard' | 'complete';
    currency?: string;
  }): Promise<{ alreadyReserved: boolean }> => {
    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Email is required to reserve your spot.');
    const safeEmail = sanitizeEmailKey(cleanEmail);
    const docId = `${params.itemType}_${params.itemId}_${safeEmail}`;
    const resRef = doc(db, 'launch_reservations', docId);

    const targetRef =
      params.itemType === 'track'
        ? doc(db, 'tracks', params.itemId)
        : await resolveSprintDocRefClient(params.itemId);

    let alreadyReserved = false;

    await runTransaction(db, async (tx) => {
      const existingSnap = await tx.get(resRef);
      let targetSnap: any = null;
      if (targetRef) {
        targetSnap = await tx.get(targetRef);
      }

      if (existingSnap.exists()) {
        alreadyReserved = true;
        return;
      }

      if (targetSnap?.exists()) {
        const d = targetSnap.data() as LaunchControllable;
        if (d.hasLimitedSlots === true && typeof d.slotLimit === 'number' && d.slotLimit > 0) {
          const currentReserved = Math.max(0, Number(d.reservedCount) || 0);
          if (currentReserved >= d.slotLimit) {
            throw new Error('Sorry, all limited spots for this launch have been reserved.');
          }
        }
      }

      tx.set(resRef, {
        id: docId,
        itemType: params.itemType,
        itemId: params.itemId,
        itemTitle: params.itemTitle,
        email: cleanEmail,
        name: params.name || 'Vectorise User',
        userId: params.userId || null,
        selectedTier: params.selectedTier || null,
        amountPaid: 0,
        currency: params.currency || 'NGN',
        status: 'reserved',
        createdAt: new Date().toISOString(),
      });

      if (targetRef && targetSnap?.exists()) {
        tx.update(targetRef, {
          reservedCount: increment(1),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    if (!alreadyReserved && params.itemType === 'sprint') {
      try {
        localStorage.removeItem(`vectorise_sprint_cache_${params.itemId}`);
      } catch {
        // ignore storage errors
      }
    }

    return { alreadyReserved };
  },
};
