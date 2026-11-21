import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface AdminSprintSettings {
  referralShareText?: string;
  updatedAt?: string;
}

export const DEFAULT_REFERRAL_SHARE_TEXT =
  'I just completed "{sprintTitle}" on VectoRise. Start your own progress sprint here:';

const SPRINT_SETTINGS_COLLECTION = 'settings';
const SPRINT_SETTINGS_DOC_ID = 'sprint_settings';
const LOCAL_CACHE_KEY = 'vectorise_admin_sprint_settings_v1';

let memoryCache: AdminSprintSettings | null = null;

function readLocalCache(): AdminSprintSettings | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminSprintSettings;
  } catch {
    return null;
  }
}

function writeLocalCache(data: AdminSprintSettings) {
  memoryCache = data;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
    }
  } catch {
    // Ignore storage quota issues
  }
}

export function getCachedAdminSprintSettings(): AdminSprintSettings {
  if (memoryCache) return memoryCache;
  return readLocalCache() || {};
}

export async function getAdminSprintSettings(): Promise<AdminSprintSettings> {
  try {
    const snap = await getDoc(doc(db, SPRINT_SETTINGS_COLLECTION, SPRINT_SETTINGS_DOC_ID));
    if (snap.exists()) {
      const data = snap.data() as AdminSprintSettings;
      writeLocalCache(data);
      return data;
    }
  } catch (err) {
    console.warn('[referralShare] Could not fetch admin sprint settings:', err);
  }
  return getCachedAdminSprintSettings();
}

export function subscribeAdminSprintSettings(
  callback: (settings: AdminSprintSettings) => void
): () => void {
  const cached = getCachedAdminSprintSettings();
  if (cached && cached.referralShareText !== undefined) {
    callback(cached);
  }

  return onSnapshot(
    doc(db, SPRINT_SETTINGS_COLLECTION, SPRINT_SETTINGS_DOC_ID),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AdminSprintSettings;
        writeLocalCache(data);
        callback(data);
      } else {
        callback({});
      }
    },
    (err) => {
      console.warn('[referralShare] Admin sprint settings subscription error:', err);
    }
  );
}

export async function saveAdminSprintSettings(
  settings: Partial<AdminSprintSettings>
): Promise<void> {
  const payload: AdminSprintSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, SPRINT_SETTINGS_COLLECTION, SPRINT_SETTINGS_DOC_ID), payload, {
    merge: true,
  });
  writeLocalCache({ ...getCachedAdminSprintSettings(), ...payload });
}

export function buildSprintReferralUrl({
  sprintId,
  referralCode,
  userId,
}: {
  sprintId?: string;
  referralCode?: string;
  userId?: string;
}): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const resolvedCode =
    referralCode?.trim() || (userId ? userId.substring(0, 8).toUpperCase() : '');
  const refSuffix = resolvedCode ? `?ref=${encodeURIComponent(resolvedCode)}` : '';
  return sprintId ? `${origin}/sprint/${sprintId}${refSuffix}` : `${origin}${refSuffix}`;
}

export function composeReferralShareMessage({
  templateText,
  sprintTitle,
  shareUrl,
}: {
  templateText?: string;
  sprintTitle?: string;
  shareUrl: string;
}): { textWithLink: string; shareUrl: string } {
  const title = sprintTitle?.trim() || 'VectoRise Sprint';
  const rawTemplate = templateText?.trim() || DEFAULT_REFERRAL_SHARE_TEXT;

  const withTitle = rawTemplate
    .replace(/\{\{\s*sprintTitle\s*\}\}|\{\s*sprintTitle\s*\}/gi, title)
    .replace(/\{\{\s*title\s*\}\}|\{\s*title\s*\}/gi, title);

  const hasLinkPlaceholder = /\{\{\s*(link|url)\s*\}\}|\{\s*(link|url)\s*\}/i.test(withTitle);

  const textWithLink = hasLinkPlaceholder
    ? withTitle.replace(/\{\{\s*(link|url)\s*\}\}|\{\s*(link|url)\s*\}/gi, shareUrl)
    : `${withTitle}\n\n${shareUrl}`;

  return {
    textWithLink: textWithLink.trim(),
    shareUrl,
  };
}
