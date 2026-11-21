import { db, isFirebaseAdminAvailable } from './firebaseAdmin';

const FIREBASE_PROJECT_ID = 'vectorise-f19d4';
export const DEFAULT_OG_IMAGE =
  'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd';

const EXPERIENCE_CATEGORIES = ['Sprint', 'Challenge', 'Ignite', 'RiseBlog'] as const;

export interface OgEntityData {
  id: string;
  type: 'sprint' | 'track';
  title: string;
  description: string;
  rawImage: string;
}

function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return Number(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue !== undefined) return null;
  if (val.mapValue && val.mapValue.fields) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  if (val.arrayValue && Array.isArray(val.arrayValue.values)) {
    return val.arrayValue.values.map((item: any) => decodeFirestoreValue(item));
  }
  return undefined;
}

export async function fetchFirestoreDocumentRest(
  docPath: string
): Promise<Record<string, any> | null> {
  try {
    const cleanPath = docPath.replace(/^\/+/, '');
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${cleanPath}`;
    const resp = await fetch(firestoreUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) return null;
    const json: any = await resp.json();
    if (!json || !json.fields) return null;

    const data: Record<string, any> = {};
    for (const [key, val] of Object.entries(json.fields as Record<string, any>)) {
      const decoded = decodeFirestoreValue(val);
      if (decoded !== undefined) data[key] = decoded;
    }
    return data;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

async function fetchFirestoreDocumentAdmin(
  docPath: string
): Promise<Record<string, any> | null> {
  if (!isFirebaseAdminAvailable()) return null;
  try {
    const snap = await withTimeout(db.doc(docPath).get(), 2000, null as any);
    if (snap && snap.exists) {
      return snap.data() || null;
    }
  } catch {
    // Fallback to REST
  }
  return null;
}

const OG_CACHE_TTL_MS = 5 * 60 * 1000;
const OG_MISS_CACHE_TTL_MS = 30 * 1000;
const ogCache = new Map<string, { value: OgEntityData | null; expiresAt: number }>();

function getCachedOg(key: string): { hit: boolean; value: OgEntityData | null } {
  const entry = ogCache.get(key);
  if (!entry) return { hit: false, value: null };
  if (Date.now() > entry.expiresAt) {
    ogCache.delete(key);
    return { hit: false, value: null };
  }
  return { hit: true, value: entry.value };
}

function setCachedOg(key: string, value: OgEntityData | null) {
  if (ogCache.size > 250) {
    const firstKey = ogCache.keys().next().value;
    if (firstKey) ogCache.delete(firstKey);
  }
  const ttl = value ? OG_CACHE_TTL_MS : OG_MISS_CACHE_TTL_MS;
  ogCache.set(key, { value, expiresAt: Date.now() + ttl });
}

function hasOgEntityFields(doc: Record<string, any> | null | undefined): boolean {
  return Boolean(
    doc &&
      (doc.title ||
        doc.blogTitle ||
        doc.igniteTitle ||
        doc.coverImageUrl ||
        doc.blogImage ||
        doc.imageUrl)
  );
}

async function fetchFirstAvailable(
  paths: string[]
): Promise<{ path: string; data: Record<string, any> } | null> {
  if (paths.length === 0) return null;

  if (isFirebaseAdminAvailable()) {
    try {
      const refs = paths.map((p) => db.doc(p));
      const snaps = await withTimeout(
        db.getAll(...refs) as Promise<any[]>,
        2500,
        null
      );
      if (Array.isArray(snaps)) {
        for (let i = 0; i < snaps.length; i++) {
          const snap = snaps[i];
          const data = snap?.exists ? snap.data() : null;
          if (hasOgEntityFields(data)) {
            return { path: paths[i], data };
          }
        }
        // Admin responded cleanly with no match across all candidate paths
        return null;
      }
    } catch {
      // Fall through to fast REST check below if Admin getAll failed/timed out
    }
  }

  // REST fallback (used on Vercel / serverless without Admin cert, or if Admin timed out)
  // Check top priority paths first in small parallel batches to avoid stalling crawlers
  const batchSize = 4;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const docs = await Promise.all(batch.map((p) => fetchFirestoreDocumentRest(p)));
    for (let j = 0; j < docs.length; j++) {
      if (hasOgEntityFields(docs[j])) {
        return { path: batch[j], data: docs[j]! };
      }
    }
  }

  return null;
}

function extractRawImageFromDoc(docData: Record<string, any> | null | undefined): string {
  if (!docData) return '';
  return (
    (typeof docData.coverImageUrl === 'string' && docData.coverImageUrl.trim()) ||
    (typeof docData.blogImage === 'string' && docData.blogImage.trim()) ||
    (typeof docData.imageUrl === 'string' && docData.imageUrl.trim()) ||
    ''
  );
}

function cleanDescriptionText(raw: string): string {
  if (!raw) return 'Start your personal growth journey today.';
  return raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

export async function fetchSprintMetadataForOg(
  sprintId: string,
  depth = 0
): Promise<OgEntityData | null> {
  if (!sprintId || depth > 1) return null;
  const cleanId = decodeURIComponent(sprintId).trim();
  if (!cleanId) return null;

  const cacheKey = `sprint:${cleanId}`;
  const cached = getCachedOg(cacheKey);
  if (cached.hit) return cached.value;

  const detailPaths: string[] = [];
  for (const cat of EXPERIENCE_CATEGORIES) {
    detailPaths.push(`experiences/${cat}/items/${cleanId}/sprintdetails/info`);
  }
  for (const cat of EXPERIENCE_CATEGORIES) {
    detailPaths.push(`experiences/${cat}/items/${cleanId}/details/info`);
  }
  for (const cat of EXPERIENCE_CATEGORIES) {
    detailPaths.push(`experience/${cat}/items/${cleanId}/sprintdetails/info`);
  }
  detailPaths.push(`experiences/${cleanId}/sprintdetails/info`);
  detailPaths.push(`experiences/${cleanId}/details/info`);
  detailPaths.push(`experiences/${cleanId}`);
  for (const cat of EXPERIENCE_CATEGORIES) {
    detailPaths.push(`experiences/${cat}/items/${cleanId}`);
  }
  detailPaths.push(`sprints/${cleanId}/sprintdetails/info`);
  detailPaths.push(`sprints/${cleanId}/details/info`);
  detailPaths.push(`sprints/${cleanId}`);

  const matched = await fetchFirstAvailable(detailPaths);

  if (matched) {
    const docData = matched.data;
    let rawImage = extractRawImageFromDoc(docData);

    // If sprintdetails/info exists without an image field, check the parent item doc once
    if (!rawImage && /\/(?:sprintdetails|details)\/info$/.test(matched.path)) {
      const parentPath = matched.path.replace(/\/(?:sprintdetails|details)\/info$/, '');
      const parentDoc = isFirebaseAdminAvailable()
        ? await fetchFirestoreDocumentAdmin(parentPath)
        : await fetchFirestoreDocumentRest(parentPath);
      rawImage = extractRawImageFromDoc(parentDoc);
    }

    const title =
      (typeof docData.title === 'string' && docData.title.trim()) ||
      (typeof docData.blogTitle === 'string' && docData.blogTitle.trim()) ||
      (typeof docData.igniteTitle === 'string' && docData.igniteTitle.trim()) ||
      'Vectorise';

    const rawDesc =
      (typeof docData.subtitle === 'string' && docData.subtitle.trim()) ||
      (typeof docData.description === 'string' && docData.description.trim()) ||
      (typeof docData.transformation === 'string' && docData.transformation.trim()) ||
      'Start your personal growth journey today.';

    const result: OgEntityData = {
      id: cleanId,
      type: 'sprint',
      title,
      description: cleanDescriptionText(rawDesc),
      rawImage,
    };
    setCachedOg(cacheKey, result);
    return result;
  }

  // Fallback: check if sprintId is an orchestration slot pointing to a real sprint
  const slotMatch = await fetchFirstAvailable([`orchestration_slots/${cleanId}`]);
  if (slotMatch) {
    const slotData = slotMatch.data;
    const targetId =
      slotData.sprintId ||
      (Array.isArray(slotData.sprintIds) ? slotData.sprintIds[0] : undefined);
    if (typeof targetId === 'string' && targetId && targetId !== cleanId) {
      const resolved = await fetchSprintMetadataForOg(targetId, depth + 1);
      setCachedOg(cacheKey, resolved);
      return resolved;
    }
  }

  setCachedOg(cacheKey, null);
  return null;
}

export async function fetchTrackMetadataForOg(
  trackId: string
): Promise<OgEntityData | null> {
  if (!trackId) return null;
  const cleanId = decodeURIComponent(trackId).trim();
  if (!cleanId) return null;

  const cacheKey = `track:${cleanId}`;
  const cached = getCachedOg(cacheKey);
  if (cached.hit) return cached.value;

  const trackMatch = await fetchFirstAvailable([`tracks/${cleanId}`]);
  if (!trackMatch) {
    setCachedOg(cacheKey, null);
    return null;
  }

  const trackData = trackMatch.data;
  const title =
    (typeof trackData.title === 'string' && trackData.title.trim()) || 'Vectorise Track';
  const rawDesc =
    (typeof trackData.subtitle === 'string' && trackData.subtitle.trim()) ||
    (typeof trackData.description === 'string' && trackData.description.trim()) ||
    'Start your personal growth journey today.';
  const rawImage = extractRawImageFromDoc(trackData);

  const result: OgEntityData = {
    id: cleanId,
    type: 'track',
    title,
    description: cleanDescriptionText(rawDesc),
    rawImage,
  };
  setCachedOg(cacheKey, result);
  return result;
}

export function normalizeGoogleDriveImageUrl(url: string): string {
  const trimmed = url.trim();
  // Match drive.google.com/file/d/<ID>/... or drive.google.com/u/0/file/d/<ID>/...
  const fileMatch = trimmed.match(/drive\.google\.com\/(?:u\/\d+\/)?file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch && fileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}=w1200`;
  }
  // Match drive.google.com/open?id=<ID>, uc?id=<ID>, or thumbnail?id=<ID>
  const queryMatch = trimmed.match(
    /drive\.google\.com\/(?:open|uc|thumbnail)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i
  );
  if (queryMatch && queryMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${queryMatch[1]}=w1200`;
  }
  // Match lh3.googleusercontent.com/d/<ID> or /u/0/d/<ID> without sizing parameter
  const lh3Match = trimmed.match(
    /^https?:\/\/lh3\.googleusercontent\.com\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:[?#].*)?$/i
  );
  if (lh3Match && lh3Match[1]) {
    return `https://lh3.googleusercontent.com/d/${lh3Match[1]}=w1200`;
  }
  return trimmed;
}

export function resolveOgImageUrl({
  rawImage,
  baseUrl,
  entityType,
  entityId,
}: {
  rawImage?: string;
  baseUrl: string;
  entityType: 'sprint' | 'track';
  entityId: string;
}): string {
  const trimmed = (rawImage || '').trim();
  if (!trimmed) return DEFAULT_OG_IMAGE;

  if (trimmed.startsWith('data:image/')) {
    return `${baseUrl}/api/og?mode=image&type=${encodeURIComponent(entityType)}&id=${encodeURIComponent(entityId)}`;
  }

  let normalized = normalizeGoogleDriveImageUrl(trimmed);

  if (normalized.startsWith('//')) {
    normalized = `https:${normalized}`;
  } else if (normalized.startsWith('/')) {
    normalized = `${baseUrl}${normalized}`;
  } else if (!/^https?:\/\//i.test(normalized)) {
    normalized = `${baseUrl}/${normalized}`;
  } else if (
    normalized.startsWith('http://') &&
    !normalized.includes('localhost') &&
    !normalized.includes('127.0.0.1')
  ) {
    normalized = normalized.replace(/^http:\/\//i, 'https://');
  }

  return normalized;
}

function escapeHtmlAttr(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function detectImageMimeType(url: string): string | null {
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.png')) return 'image/png';
  if (cleanUrl.endsWith('.webp')) return 'image/webp';
  if (cleanUrl.endsWith('.gif')) return 'image/gif';
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

export function injectOgMetaIntoHtml({
  rawHtml,
  title,
  description,
  imageUrl,
  pageUrl,
}: {
  rawHtml: string;
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
}): string {
  const safeTitle = escapeHtmlAttr(title);
  const safeDescription = escapeHtmlAttr(description);
  const safeImage = escapeHtmlAttr(imageUrl);
  const safeUrl = escapeHtmlAttr(pageUrl);
  const mimeType = detectImageMimeType(imageUrl);

  // Strip any existing default meta tags so social crawlers only see the entity's tags
  let cleanedHtml = rawHtml
    .replace(/<meta\s+[^>]*name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+[^>]*property=["']og:[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+[^>]*name=["']twitter:[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>\s*/gi, '');

  const fullPageTitle =
    title.trim().toLowerCase() === 'vectorise'
      ? 'Vectorise – Personal Growth Sprints'
      : `${safeTitle} – Vectorise`;

  const ogTags = `
    <meta name="description" content="${safeDescription}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:site_name" content="Vectorise" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:secure_url" content="${safeImage}" />${
      mimeType ? `\n    <meta property="og:image:type" content="${mimeType}" />` : ''
    }
    <meta property="og:image:alt" content="${safeTitle}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImage}" />`;

  if (/<title>[\s\S]*?<\/title>/i.test(cleanedHtml)) {
    return cleanedHtml.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${fullPageTitle}</title>${ogTags}`
    );
  }

  return cleanedHtml.replace('</head>', `<title>${fullPageTitle}</title>${ogTags}\n</head>`);
}

export function getRequestBaseUrl(req: any): { baseUrl: string; fullUrl: string } {
  const forwardedHost = req.headers?.['x-forwarded-host'];
  const rawHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  const host =
    (typeof rawHost === 'string' && rawHost.split(',')[0].trim()) ||
    req.headers?.host ||
    req.hostname ||
    'vectorise.online';

  const forwardedProto = req.headers?.['x-forwarded-proto'];
  const rawProto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const protocol =
    (typeof rawProto === 'string' && rawProto.split(',')[0].trim()) ||
    (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');

  const baseUrl = `${protocol}://${host}`;
  const pathWithQuery = req.originalUrl || req.url || '/';
  const fullUrl = `${baseUrl}${pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`}`;

  return { baseUrl, fullUrl };
}
