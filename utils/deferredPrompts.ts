import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export type DeferredPromptType = 'referral' | 'rating';
export type DeferredPromptStatus = 'skipped' | 'completed';

const STORAGE_KEY = 'vectorise_deferred_prompts';

export interface DeferredPromptEntry {
  status: DeferredPromptStatus;
  skippedAt?: string;
  completedAt?: string;
  ratingValue?: number;
}

export interface DeferredPromptRecord {
  sprintId: string;
  enrollmentId?: string;
  userId?: string;
  referral?: DeferredPromptEntry;
  rating?: DeferredPromptEntry;
  updatedAt: string;
}

export const getDeferredPromptsMap = (): Record<string, DeferredPromptRecord> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const recordDeferredPromptState = async ({
  userId,
  sprintId,
  enrollmentId,
  type,
  status,
  ratingValue,
  isPreview,
}: {
  userId?: string;
  sprintId?: string;
  enrollmentId?: string;
  type: DeferredPromptType;
  status: DeferredPromptStatus;
  ratingValue?: number;
  isPreview?: boolean;
}): Promise<void> => {
  if (isPreview || !sprintId) return;

  const now = new Date().toISOString();
  const entry: DeferredPromptEntry = {
    status,
    ...(status === 'skipped' ? { skippedAt: now } : { completedAt: now }),
    ...(typeof ratingValue === 'number' ? { ratingValue } : {}),
  };

  try {
    const map = getDeferredPromptsMap();
    const key = `${userId || 'guest'}_${sprintId}`;
    const existing = map[key] || {
      sprintId,
      ...(enrollmentId ? { enrollmentId } : {}),
      ...(userId ? { userId } : {}),
      updatedAt: now,
    };

    map[key] = {
      ...existing,
      [type]: entry,
      updatedAt: now,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore localStorage quota/private-mode errors
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const updates: Promise<any>[] = [];

  if (userId && enrollmentId) {
    updates.push(
      updateDoc(doc(db, 'users', userId, 'enrollments', enrollmentId), {
        [`deferredPrompts.${type}`]: entry,
      }).catch(() => {})
    );
  }

  if (userId) {
    updates.push(
      updateDoc(doc(db, 'users', userId), {
        [`deferredSprintPrompts.${sprintId}.${type}`]: entry,
      }).catch(() => {})
    );
  }

  if (updates.length > 0) {
    await Promise.allSettled(updates);
  }
};
