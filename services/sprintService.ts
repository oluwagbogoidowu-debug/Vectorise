
import { db } from './firebase';
import { collection, collectionGroup, query, where, getDocs, doc, setDoc, updateDoc, getDoc, addDoc, onSnapshot, deleteField, increment, serverTimestamp, deleteDoc, arrayUnion, writeBatch } from 'firebase/firestore';
import { ParticipantSprint, ParticipantSprintRun, Sprint, OrchestratorLog, OrchestrationTrigger, PaymentSource, LifecycleSlotAssignment, GlobalOrchestrationSettings, Review, Track, InteractionUser } from '../types';
import { sanitizeData, safeJSONStringify, userService } from './userService';
import { ensureSeedBlogsInFirestore } from './blogService';

const cleanDetailsData = (raw: any): any => {
    const sanitized = sanitizeData(raw);
    if (!sanitized) return {};
    const cleaned = { ...sanitized };
    delete cleaned.dailyContent;
    return cleaned;
};

export const determineExperienceContentType = (item: any): { contentType: 'sprint' | 'blog' | 'ignite' | 'challenge'; subcategory: string } => {
    if (!item) return { contentType: 'sprint', subcategory: 'sprint' };

    const ct = String(item.contentType || '').toLowerCase().trim();
    const sc = String(item.subcategory || '').toLowerCase().trim();
    const title = String(item.title || '').toLowerCase().trim();
    const cat = String(item.category || '').toLowerCase().trim();

    // 1. RiseBlog / Blog
    if (
        ct === 'blog' ||
        ct === 'riseblog' ||
        sc === 'riseblog' ||
        sc === 'blog' ||
        Boolean(item.blogBody) ||
        Boolean(item.blogImage) ||
        Boolean(item.blogTitle) ||
        title.includes('riseblog') ||
        cat.includes('riseblog')
    ) {
        return {
            contentType: 'blog',
            subcategory: 'riseblog'
        };
    }

    // 2. Ignite / Insight
    if (
        ct === 'ignite' ||
        ct === 'insight' ||
        sc === 'ignite' ||
        sc === 'insight' ||
        Boolean(item.igniteBody) ||
        Boolean(item.igniteBgColor) ||
        title.includes('ignite') ||
        title.includes('insight') ||
        cat.includes('ignite') ||
        cat.includes('insight')
    ) {
        return {
            contentType: 'ignite',
            subcategory: 'insight'
        };
    }

    // 3. Challenge
    if (
        ct === 'challenge' ||
        sc === 'challenge' ||
        Boolean(item.completionCriteria) ||
        Boolean(item.whatToDo) ||
        title.includes('challenge') ||
        cat.includes('challenge')
    ) {
        return {
            contentType: 'challenge',
            subcategory: 'challenge'
        };
    }

    // 4. Default to standard Sprint
    return {
        contentType: 'sprint',
        subcategory: item.subcategory || item.category || 'sprint'
    };
};

export const EXPERIENCES_COLLECTION = 'experiences';
export const EXPERIENCE_SINGULAR_COLLECTION = 'experience';
export const LEGACY_SPRINTS_COLLECTION = 'sprints';

export type ExperienceDocName = 'Sprint' | 'RiseBlog' | 'Ignite' | 'Challenge';
export const EXPERIENCE_DOC_NAMES: ExperienceDocName[] = ['Sprint', 'RiseBlog', 'Ignite', 'Challenge'];

export const getExperienceDocName = (item: any): ExperienceDocName => {
    const { contentType, subcategory } = determineExperienceContentType(item);
    if (contentType === 'blog' || subcategory === 'riseblog') return 'RiseBlog';
    if (contentType === 'ignite' || subcategory === 'insight') return 'Ignite';
    if (contentType === 'challenge' || subcategory === 'challenge') return 'Challenge';
    return 'Sprint';
};

let hasEnsuredCategoryDocs = false;
export const ensureExperienceCategoryDocs = async (): Promise<void> => {
    if (hasEnsuredCategoryDocs) return;
    hasEnsuredCategoryDocs = true;

    const categoryMetadata: Record<ExperienceDocName, { title: string; description: string }> = {
        Sprint: { title: 'Sprint Experiences', description: 'Structured multi-day action sprints.' },
        RiseBlog: { title: 'RiseBlog Experiences', description: 'Transformative articles and micro-habit learning.' },
        Ignite: { title: 'Ignite Insights', description: 'Bite-sized daily sparks and mindset insights.' },
        Challenge: { title: 'Challenge Experiences', description: 'Action-oriented personal and community challenges.' }
    };

    const collections = [EXPERIENCES_COLLECTION, EXPERIENCE_SINGULAR_COLLECTION];
    const writePromises: Promise<any>[] = [];
    for (const col of collections) {
        for (const cat of EXPERIENCE_DOC_NAMES) {
            writePromises.push(
                setDoc(doc(db, col, cat), {
                    id: cat,
                    name: cat,
                    title: categoryMetadata[cat].title,
                    description: categoryMetadata[cat].description,
                    type: cat,
                    updatedAt: new Date().toISOString()
                }, { merge: true }).catch(() => {})
            );
        }
    }
    await Promise.all(writePromises);
};

let isMigrationRunning = false;
let hasMigratedSession = false;

/**
 * Permanently cleans up and deletes all data in the former 'sprints' collection and flat 'experiences'
 * once confirmed safely relocated under experiences/{Category}/items/{id}.
 */
const cleanupLegacySprintDocs = async (itemId: string): Promise<void> => {
    try {
        // 1. Delete details from legacy sprints
        await deleteDoc(doc(db, LEGACY_SPRINTS_COLLECTION, itemId, 'sprintdetails', 'info')).catch(() => {});
        await deleteDoc(doc(db, LEGACY_SPRINTS_COLLECTION, itemId, 'sprintdetials', 'info')).catch(() => {});
        await deleteDoc(doc(db, LEGACY_SPRINTS_COLLECTION, itemId, 'details', 'info')).catch(() => {});

        // 2. Delete days from legacy sprints
        try {
            const daysSnap = await getDocs(collection(db, LEGACY_SPRINTS_COLLECTION, itemId, 'days'));
            for (const d of daysSnap.docs) {
                await deleteDoc(d.ref).catch(() => {});
            }
        } catch (e) {}

        // 3. Delete reviews from legacy sprints
        try {
            const revSnap = await getDocs(collection(db, LEGACY_SPRINTS_COLLECTION, itemId, 'reviews'));
            for (const r of revSnap.docs) {
                await deleteDoc(r.ref).catch(() => {});
            }
        } catch (e) {}

        // 4. Delete numbered day subcollections if any
        for (let dayNum = 1; dayNum <= 40; dayNum++) {
            try {
                const subColSnap = await getDocs(collection(db, LEGACY_SPRINTS_COLLECTION, itemId, `day ${dayNum}`));
                for (const subDoc of subColSnap.docs) {
                    await deleteDoc(subDoc.ref).catch(() => {});
                }
            } catch (e) {}
        }

        // 5. Delete root doc in legacy sprints
        await deleteDoc(doc(db, LEGACY_SPRINTS_COLLECTION, itemId)).catch(() => {});

        // 6. Delete old flat document in experiences if itemId is not a category doc name
        if (!EXPERIENCE_DOC_NAMES.includes(itemId as any)) {
            await deleteDoc(doc(db, EXPERIENCES_COLLECTION, itemId, 'sprintdetails', 'info')).catch(() => {});
            await deleteDoc(doc(db, EXPERIENCES_COLLECTION, itemId, 'sprintdetials', 'info')).catch(() => {});
            await deleteDoc(doc(db, EXPERIENCES_COLLECTION, itemId, 'details', 'info')).catch(() => {});
            try {
                const flatDays = await getDocs(collection(db, EXPERIENCES_COLLECTION, itemId, 'days'));
                for (const fd of flatDays.docs) {
                    await deleteDoc(fd.ref).catch(() => {});
                }
            } catch (e) {}
            try {
                const flatRevs = await getDocs(collection(db, EXPERIENCES_COLLECTION, itemId, 'reviews'));
                for (const fr of flatRevs.docs) {
                    await deleteDoc(fr.ref).catch(() => {});
                }
            } catch (e) {}
            await deleteDoc(doc(db, EXPERIENCES_COLLECTION, itemId)).catch(() => {});
        }
    } catch (err) {
        console.warn(`[Cleanup] Non-fatal error cleaning legacy sprint doc ${itemId}:`, err);
    }
};

export const migrateAllSprintsToExperiences = async (): Promise<void> => {
    if (isMigrationRunning || hasMigratedSession) return;
    isMigrationRunning = true;
    try {
        console.log('[Migration] Ensuring parent category documents in experiences collection (Sprint, RiseBlog, Ignite, Challenge)...');
        await ensureExperienceCategoryDocs().catch(() => {});

        const allItemIds = new Set<string>();
        const sprintDocsMap: Record<string, any> = {};

        // 1. Scan collectionGroup('sprintdetails')
        try {
            const sgSnap = await getDocs(query(collectionGroup(db, 'sprintdetails')));
            sgSnap.forEach(d => {
                const parentId = d.ref.parent?.parent?.id;
                if (parentId && !EXPERIENCE_DOC_NAMES.includes(parentId as any)) {
                    allItemIds.add(parentId);
                    sprintDocsMap[parentId] = { ...(sprintDocsMap[parentId] || {}), ...sanitizeData(d.data()), id: parentId };
                }
            });
        } catch (e) {
            console.warn('[Migration] collectionGroup sprintdetails scan skipped:', e);
        }

        // 2. Scan collectionGroup('details')
        try {
            const dgSnap = await getDocs(query(collectionGroup(db, 'details')));
            dgSnap.forEach(d => {
                const parentId = d.ref.parent?.parent?.id;
                if (parentId && !EXPERIENCE_DOC_NAMES.includes(parentId as any)) {
                    allItemIds.add(parentId);
                    sprintDocsMap[parentId] = { ...(sprintDocsMap[parentId] || {}), ...sanitizeData(d.data()), id: parentId };
                }
            });
        } catch (e) {
            console.warn('[Migration] collectionGroup details scan skipped:', e);
        }

        // 3. Scan legacy sprints root collection
        try {
            const legSnap = await getDocs(collection(db, LEGACY_SPRINTS_COLLECTION));
            legSnap.forEach(d => {
                if (d.id && !EXPERIENCE_DOC_NAMES.includes(d.id as any)) {
                    allItemIds.add(d.id);
                    const data = d.data();
                    if (data && Object.keys(data).length > 0) {
                        sprintDocsMap[d.id] = { ...(sprintDocsMap[d.id] || {}), ...sanitizeData(data), id: d.id };
                    }
                }
            });
        } catch (e) {
            console.warn('[Migration] legacy sprints root scan skipped:', e);
        }

        // 4. Scan experiences root collection for old flat documents
        try {
            const expSnap = await getDocs(collection(db, EXPERIENCES_COLLECTION));
            for (const d of expSnap.docs) {
                if (d.id && !EXPERIENCE_DOC_NAMES.includes(d.id as any)) {
                    allItemIds.add(d.id);
                    const data = d.data();
                    if (data && Object.keys(data).length > 0) {
                        sprintDocsMap[d.id] = { ...(sprintDocsMap[d.id] || {}), ...sanitizeData(data), id: d.id };
                    }
                }
            }
        } catch (e) {
            console.warn('[Migration] experiences root scan skipped:', e);
        }

        // 5. Scan categorized subcollections: experiences/{Category}/items
        for (const cat of EXPERIENCE_DOC_NAMES) {
            try {
                const catSnap = await getDocs(collection(db, EXPERIENCES_COLLECTION, cat, 'items'));
                catSnap.forEach(d => {
                    if (d.id) {
                        allItemIds.add(d.id);
                        const data = d.data();
                        if (data && Object.keys(data).length > 0) {
                            sprintDocsMap[d.id] = { ...(sprintDocsMap[d.id] || {}), ...sanitizeData(data), id: d.id };
                        }
                    }
                });
            } catch (e) {}
        }

        let migratedCount = 0;
        for (const itemId of Array.from(allItemIds)) {
            if (!itemId || EXPERIENCE_DOC_NAMES.includes(itemId as any)) continue;
            try {
                let itemData = sprintDocsMap[itemId] || { id: itemId };
                if (!itemData.title && !itemData.blogBody && !itemData.igniteBody && !itemData.blogTitle) {
                    const full = await sprintService.getSprintById(itemId, true);
                    if (full) itemData = full;
                }

                if (!itemData.title && !itemData.blogBody && !itemData.igniteBody && !itemData.blogTitle) {
                    continue;
                }

                const { contentType, subcategory } = determineExperienceContentType(itemData);
                itemData.contentType = contentType;
                itemData.subcategory = subcategory;

                const docName = getExperienceDocName(itemData);

                // Write to hierarchical experience path
                await sprintService._writeSubcollections(itemId, itemData);

                // Confirm that the document has been successfully moved and is accessible in experiences
                const checkSnap = await getDoc(doc(db, EXPERIENCES_COLLECTION, docName, 'items', itemId, 'sprintdetails', 'info'));
                if (checkSnap.exists()) {
                    // Confirmed moved: Now safely delete from former sprints collection & old flat locations
                    await cleanupLegacySprintDocs(itemId);
                    migratedCount++;
                }
            } catch (err) {
                console.error(`[Migration] Failed relocating item ${itemId}:`, err);
            }
        }

        // Final cleanup sweep across remaining root docs in legacy 'sprints' collection
        try {
            const remainingSprintsSnap = await getDocs(collection(db, LEGACY_SPRINTS_COLLECTION));
            for (const rDoc of remainingSprintsSnap.docs) {
                await cleanupLegacySprintDocs(rDoc.id);
            }
        } catch (e) {}

        hasMigratedSession = true;
        console.log(`[Migration] Successfully structured ${migratedCount} items under category documents in experiences collection and deleted former sprints data.`);
    } catch (error) {
        console.error('[Migration] Global migration failed:', error);
    } finally {
        isMigrationRunning = false;
    }
};

const SPRINTS_COLLECTION = 'experiences';
const ENROLLMENTS_COLLECTION = 'enrollments';
const ORCHESTRATOR_LOGS = 'orchestrator_logs';
const ORCHESTRATION_COLLECTION = 'orchestration';
const ORCHESTRATION_SLOTS_COLLECTION = 'orchestration_slots';
const LINK_STATS_COLLECTION = 'link_stats';

/**
 * Converts nested arrays (like taskLinkedSources: number[][]) in DailyContent to a flat format (e.g., string[]) for Firestore compatibility.
 */
export const serializeSprint = (sprint: any): any => {
    if (!sprint) return sprint;
    const cloned = { ...sprint };
    if (Array.isArray(cloned.dailyContent)) {
        cloned.dailyContent = cloned.dailyContent.map((day: any) => {
            if (!day) return day;
            const dayClone = { ...day };
            if (Array.isArray(dayClone.taskLinkedSources)) {
                dayClone.taskLinkedSources = dayClone.taskLinkedSources.map((item: any) => {
                    if (Array.isArray(item)) {
                        return safeJSONStringify(item);
                    }
                    if (typeof item === 'string') {
                        return item;
                    }
                    return '[]';
                });
            }
            if (Array.isArray(dayClone.taskMultiTextLabels)) {
                dayClone.taskMultiTextLabels = dayClone.taskMultiTextLabels.map((item: any) => {
                    if (Array.isArray(item)) {
                        return safeJSONStringify(item);
                    }
                    if (typeof item === 'string') {
                        return item;
                    }
                    return '[]';
                });
            }
            return dayClone;
        });
    }
    if (cloned.pendingChanges) {
        cloned.pendingChanges = serializeSprint(cloned.pendingChanges);
    }
    return cloned;
};

/**
 * Converts flat serialized values back into nested arrays (like taskLinkedSources: number[][]) for application usage.
 */
export const deserializeSprint = (sprint: any): any => {
    if (!sprint) return sprint;
    const cloned = { ...sprint };
    if (Array.isArray(cloned.dailyContent)) {
        cloned.dailyContent = cloned.dailyContent.map((day: any) => {
            if (!day) return day;
            const dayClone = { ...day };
            if (Array.isArray(dayClone.taskLinkedSources)) {
                dayClone.taskLinkedSources = dayClone.taskLinkedSources.map((item: any) => {
                    if (typeof item === 'string') {
                        try {
                            const parsed = JSON.parse(item);
                            return Array.isArray(parsed) ? parsed : [];
                        } catch (e) {
                            return [];
                        }
                    }
                    if (Array.isArray(item)) {
                        return item;
                    }
                    return [];
                });
            }
            if (Array.isArray(dayClone.taskMultiTextLabels)) {
                dayClone.taskMultiTextLabels = dayClone.taskMultiTextLabels.map((item: any) => {
                    if (typeof item === 'string') {
                        try {
                            const parsed = JSON.parse(item);
                            return Array.isArray(parsed) ? parsed : [];
                        } catch (e) {
                            return [];
                        }
                    }
                    if (Array.isArray(item)) {
                        return item;
                    }
                    return [];
                });
            }
            return dayClone;
        });
    }
    if (cloned.pendingChanges) {
        cloned.pendingChanges = deserializeSprint(cloned.pendingChanges);
    }
    return cloned;
};

// In-memory cache for resolved sprint documents
const sprintCache: Record<string, Sprint> = {};
let cachedAllEnrollments: { data: ParticipantSprint[]; cachedAt: number } | null = null;
let cachedPublishedSprints: { data: Sprint[]; cachedAt: number } | null = null;
let cachedAdminSprints: { data: Sprint[]; cachedAt: number } | null = null;
let cachedAdminCoachSprints: { data: Sprint[]; cachedAt: number } | null = null;
const cachedCoachSprintsMap = new Map<string, { data: Sprint[]; cachedAt: number }>();
let cachedOrchestrationData: { data: Record<string, any>; cachedAt: number } | null = null;
const SPRINT_CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

const notifyCoachesOnSprintStart = async (userId: string, sprintId: string, coachIdInput?: string) => {
    try {
        const { notificationService } = await import('./notificationService');
        // 1. Fetch user details
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        const userName = userData?.name || 'A participant';

        // 2. Fetch sprint details
        const sprint = await sprintService.getSprintById(sprintId);
        const sprintTitle = sprint?.title || 'a sprint';

        // 3. Determine target coach IDs to notify
        const coachesToNotify = new Set<string>();
        if (coachIdInput && coachIdInput.trim() !== '') {
            coachesToNotify.add(coachIdInput.trim());
        }
        if (sprint?.coachId && sprint.coachId.trim() !== '') {
            coachesToNotify.add(sprint.coachId.trim());
        }



        const title = `🚀 New Sprint Started: ${sprintTitle}`;
        const body = `${userName} just started "${sprintTitle}". Check the app to review their progress and respond!`;
        const actionUrl = `/coach/sprints`;

        for (const coachId of Array.from(coachesToNotify)) {
            if (coachId && coachId !== userId) {
                await notificationService.createNotification(
                    coachId,
                    'coach_message',
                    title,
                    body,
                    { actionUrl, bypassActiveCheck: true }
                ).catch(err => console.error(`[SprintService] Failed to notify coach ${coachId}:`, err));
            }
        }
    } catch (err) {
        console.error('[SprintService] Error in notifyCoachesOnSprintStart:', err);
    }
};

export const deduplicateSprintsById = (sprints: Sprint[]): Sprint[] => {
    const map = new Map<string, Sprint>();
    for (const s of sprints) {
        if (s && s.id && typeof s.id === 'string' && !EXPERIENCE_DOC_NAMES.includes(s.id as any)) {
            if (!map.has(s.id)) {
                map.set(s.id, s);
            } else {
                const existing = map.get(s.id)!;
                map.set(s.id, { ...existing, ...s });
            }
        }
    }
    return Array.from(map.values());
};

export const sprintService = {
    incrementLinkClick: async (referralCode: string, sprintId?: string | null) => {
        try {
            const docId = sprintId ? `${referralCode}_${sprintId}` : `${referralCode}_main`;
            const docRef = doc(db, LINK_STATS_COLLECTION, docId);
            await setDoc(docRef, {
                referralCode,
                sprintId: sprintId || 'main',
                clicks: increment(1),
                lastClickAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("[Telemetry] Failed to log click:", error);
        }
    },

    subscribeToLinkStats: (referralCode: string, callback: (stats: Record<string, number>) => void) => {
        const q = query(collection(db, LINK_STATS_COLLECTION), where("referralCode", "==", referralCode));
        return onSnapshot(q, (snapshot) => {
            const statsMap: Record<string, number> = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                statsMap[data.sprintId] = data.clicks || 0;
            });
            callback(statsMap);
        });
    },

    logOrchestratorResolution: async (log: Omit<OrchestratorLog, 'timestamp'>) => {
        try {
            const entry = sanitizeData({
                ...log,
                timestamp: new Date().toISOString()
            });
            await addDoc(collection(db, ORCHESTRATOR_LOGS), entry);
        } catch (e) {
            console.error("[Orchestrator] Logging failed:", e);
        }
    },

    createSprint: async (sprint: Sprint) => {
        const now = new Date().toISOString();
        const newSprint = sanitizeData({ ...sprint, createdAt: now, updatedAt: now, deleted: false });
        await ensureExperienceCategoryDocs().catch(() => {});
        await sprintService._writeSubcollections(sprint.id, newSprint);
        sprintCache[sprint.id] = newSprint;
        try {
            localStorage.setItem(`vectorise_sprint_cache_${sprint.id}`, safeJSONStringify(newSprint));
        } catch (e) {}
        return newSprint;
    },

    fetchAndCacheSprintInBackground: async (sprintId: string) => {
        const cacheKey = `vectorise_sprint_cache_${sprintId}`;
        try {
            let sprintData: any = null;

            // 1. Try categorized experiences paths: experiences/{Category}/items/{sprintId}
            for (const cat of EXPERIENCE_DOC_NAMES) {
                try {
                    let detailsSnap = await getDoc(doc(db, EXPERIENCES_COLLECTION, cat, 'items', sprintId, 'sprintdetails', 'info'));
                    if (!detailsSnap.exists()) {
                        detailsSnap = await getDoc(doc(db, EXPERIENCES_COLLECTION, cat, 'items', sprintId, 'details', 'info'));
                    }
                    if (detailsSnap.exists()) {
                        sprintData = { id: sprintId, ...cleanDetailsData(detailsSnap.data()) };
                        break;
                    }
                } catch (e) {}
            }

            // 2. Try singular experience paths: experience/{Category}/items/{sprintId}
            if (!sprintData) {
                for (const cat of EXPERIENCE_DOC_NAMES) {
                    try {
                        let detailsSnap = await getDoc(doc(db, EXPERIENCE_SINGULAR_COLLECTION, cat, 'items', sprintId, 'sprintdetails', 'info'));
                        if (detailsSnap.exists()) {
                            sprintData = { id: sprintId, ...cleanDetailsData(detailsSnap.data()) };
                            break;
                        }
                    } catch (e) {}
                }
            }

            // 3. Fallback to flat experiences paths
            if (!sprintData) {
                let snap = await getDoc(doc(db, EXPERIENCES_COLLECTION, sprintId));
                let detailsSnap = await getDoc(doc(db, EXPERIENCES_COLLECTION, sprintId, 'sprintdetails', 'info'));
                if (!detailsSnap.exists()) {
                    detailsSnap = await getDoc(doc(db, EXPERIENCES_COLLECTION, sprintId, 'details', 'info'));
                }
                if (detailsSnap.exists()) {
                    sprintData = { id: sprintId, ...cleanDetailsData(detailsSnap.data()) };
                } else if (snap.exists() && snap.data()?.title) {
                    sprintData = { id: sprintId, ...cleanDetailsData(snap.data()) };
                }
            }

            if (!sprintData) return;
            
            const resolved = await sprintService.resolveSprintDays(sprintData);
            if (resolved) {
                sprintCache[sprintId] = resolved;
                try {
                    localStorage.setItem(cacheKey, safeJSONStringify(resolved));
                } catch (err) {
                    console.error("Failed to save to localStorage:", err);
                }
            }
        } catch (e: any) {
            console.warn(`[sprintService] Background fetch failed for sprint ${sprintId} (offline?):`, e.message);
        }
    },

    getSprintById: async (sprintId: string, forceRefresh: boolean = false): Promise<Sprint | null> => {
        if (!sprintId) return null;
        const cacheKey = `vectorise_sprint_cache_${sprintId}`;
        
        // 1. Check in-memory cache first (skip if forceRefresh is true)
        if (!forceRefresh && sprintCache[sprintId]) {
            sprintService.fetchAndCacheSprintInBackground(sprintId).catch(() => {});
            return sprintCache[sprintId];
        }

        // 2. Check localStorage cache (skip if forceRefresh is true)
        if (!forceRefresh) {
            try {
                const localCached = localStorage.getItem(cacheKey);
                if (localCached) {
                    const parsed = JSON.parse(localCached);
                    sprintCache[sprintId] = parsed;
                    sprintService.fetchAndCacheSprintInBackground(sprintId).catch(() => {});
                    return parsed;
                }
            } catch (e) {
                console.error("Error reading sprint from localStorage cache:", e);
            }
        }

        // 3. No cache available. Fetch from Firestore across categorized documents
        try {
            console.log(`[sprintService] Fetching sprint ${sprintId} from Firestore...`);
            
            const fetchPromise: Promise<Sprint | null> = (async (): Promise<Sprint | null> => {
                let sprintData: any = null;

                // A. Try categorized experiences paths in parallel: experiences/{Category}/items/{sprintId}
                const catPromises = EXPERIENCE_DOC_NAMES.map(async (cat) => {
                    try {
                        let detailsSnap = await getDoc(doc(db, EXPERIENCES_COLLECTION, cat, 'items', sprintId, 'sprintdetails', 'info'));
                        if (!detailsSnap.exists()) {
                            detailsSnap = await getDoc(doc(db, EXPERIENCES_COLLECTION, cat, 'items', sprintId, 'details', 'info'));
                        }
                        if (detailsSnap.exists()) {
                            return { id: sprintId, ...cleanDetailsData(detailsSnap.data()) };
                        }
                    } catch (e) {}
                    return null;
                });
                const catResults = await Promise.all(catPromises);
                sprintData = catResults.find(r => r !== null);

                // B. Try singular experience paths in parallel: experience/{Category}/items/{sprintId}
                if (!sprintData) {
                    const singPromises = EXPERIENCE_DOC_NAMES.map(async (cat) => {
                        try {
                            let detailsSnap = await getDoc(doc(db, EXPERIENCE_SINGULAR_COLLECTION, cat, 'items', sprintId, 'sprintdetails', 'info'));
                            if (detailsSnap.exists()) {
                                return { id: sprintId, ...cleanDetailsData(detailsSnap.data()) };
                            }
                        } catch (e) {}
                        return null;
                    });
                    const singResults = await Promise.all(singPromises);
                    sprintData = singResults.find(r => r !== null);
                }

                // C. Fallback to flat experiences collection
                if (!sprintData) {
                    let snap = await getDoc(doc(db, EXPERIENCES_COLLECTION, sprintId));
                    let detailsSnap = await getDoc(doc(db, EXPERIENCES_COLLECTION, sprintId, 'sprintdetails', 'info'));
                    if (!detailsSnap.exists()) {
                        detailsSnap = await getDoc(doc(db, EXPERIENCES_COLLECTION, sprintId, 'details', 'info'));
                    }

                    if (detailsSnap.exists()) {
                        sprintData = { id: sprintId, ...cleanDetailsData(detailsSnap.data()) };
                    } else if (snap.exists() && snap.data()?.title) {
                        sprintData = { id: sprintId, ...cleanDetailsData(snap.data()) };
                    }
                }

                // Fallback D: Check if sprintId is an orchestration slot ID
                if (!sprintData) {
                    try {
                        const slotSnap = await getDoc(doc(db, ORCHESTRATION_SLOTS_COLLECTION, sprintId));
                        if (slotSnap.exists()) {
                            const slotData = slotSnap.data();
                            const targetId = slotData.sprintId || (slotData.sprintIds && slotData.sprintIds[0]);
                            if (targetId && targetId !== sprintId) {
                                return await sprintService.getSprintById(targetId);
                            }
                        }
                    } catch (e) {}
                }

                // Fallback E: Search collectionGroup('sprintdetails') or collectionGroup('details')
                if (!sprintData) {
                    try {
                        const q = query(collectionGroup(db, 'sprintdetails'));
                        const cgSnap = await getDocs(q);
                        for (const dDoc of cgSnap.docs) {
                            const parentId = dDoc.ref.parent?.parent?.id;
                            const data = dDoc.data();
                            if (parentId === sprintId || data.id === sprintId || data.sprintId === sprintId) {
                                sprintData = { id: parentId || sprintId, ...cleanDetailsData(data) };
                                break;
                            }
                        }
                    } catch (e) {}
                }

                if (!sprintData) return null;

                const resolved = await sprintService.resolveSprintDays(sprintData);
                if (resolved) {
                    sprintCache[sprintId] = resolved;
                    if (resolved.id && resolved.id !== sprintId) {
                        sprintCache[resolved.id] = resolved;
                    }
                    try {
                        localStorage.setItem(cacheKey, safeJSONStringify(resolved));
                        if (resolved.id) {
                            localStorage.setItem(`vectorise_sprint_cache_${resolved.id}`, safeJSONStringify(resolved));
                        }
                    } catch (err) {
                        console.error("Failed to save sprint to localStorage cache:", err);
                    }
                }
                return resolved;
            })();

            const timeoutPromise = new Promise<null>((resolve) => 
                setTimeout(() => {
                    console.warn(`[sprintService] getSprintById timeout check reached for ${sprintId}.`);
                    resolve(null);
                }, 12000)
            );

            const result = await Promise.race([fetchPromise, timeoutPromise]);
            if (result) {
                return result;
            }
            
            // If timed out or returned null from promise race, check local storage again
            const finalCheck = localStorage.getItem(cacheKey);
            return finalCheck ? JSON.parse(finalCheck) : null;
        } catch (err) {
            console.error(`[sprintService] Error fetching sprint ${sprintId}:`, err);
            const finalCheck = localStorage.getItem(cacheKey);
            return finalCheck ? JSON.parse(finalCheck) : null;
        }
    },

    getSprintsByIds: async (sprintIds: string[]) => {
        const validIds = Array.from(new Set((sprintIds || []).filter(id => !!id && typeof id === 'string' && id !== '')));
        if (validIds.length === 0) return [];
        try {
            const results: Sprint[] = [];
            const sprintPromises = validIds.map(id => sprintService.getSprintById(id));
            const fetched = await Promise.all(sprintPromises);
            for (const s of fetched) {
                if (s) results.push(s);
            }
            return results;
        } catch (error) {
            console.error("Error fetching sprints by IDs:", error);
            return [];
        }
    },

    subscribeToSprint: (sprintId: string, callback: (sprint: Sprint | null) => void) => {
        let latestDetails: any = null;
        let latestDays: Record<number, any> = {};
        const unsubs: (() => void)[] = [];

        const emitMerged = () => {
            if (!latestDetails) return;
            
            let dailyContent: any[] = [];
            const dayNums = Object.keys(latestDays).map(Number).sort((a, b) => a - b);
            
            if (dayNums.length > 0) {
                dayNums.forEach(d => {
                    dailyContent.push({ day: d, ...latestDays[d] });
                });
            } else if (Array.isArray(latestDetails.dailyContent) && latestDetails.dailyContent.length > 0) {
                dailyContent = latestDetails.dailyContent;
            }

            const mergedSprint = {
                ...latestDetails,
                dailyContent
            };
            
            const deserialized = deserializeSprint(mergedSprint);
            
            // Keep in-memory & localStorage cache updated with the latest realtime snapshot
            sprintCache[sprintId] = deserialized;
            try {
                localStorage.setItem(`vectorise_sprint_cache_${sprintId}`, safeJSONStringify(deserialized));
            } catch (e) {}

            callback(deserialized);
        };

        // Set up listeners on categorized paths
        for (const cat of EXPERIENCE_DOC_NAMES) {
            try {
                const catDetailsRef = doc(db, EXPERIENCES_COLLECTION, cat, 'items', sprintId, 'sprintdetails', 'info');
                const u1 = onSnapshot(catDetailsRef, (snap) => {
                    if (snap.exists()) {
                        latestDetails = { id: sprintId, ...cleanDetailsData(snap.data()) };
                        emitMerged();
                    }
                }, () => {});
                unsubs.push(u1);

                const catDaysRef = collection(db, EXPERIENCES_COLLECTION, cat, 'items', sprintId, 'days');
                const u2 = onSnapshot(catDaysRef, (snap) => {
                    if (!snap.empty) {
                        const days: Record<number, any> = {};
                        snap.forEach(dDoc => {
                            const data = dDoc.data();
                            const dayNum = parseInt(dDoc.id.replace('day ', ''));
                            if (!isNaN(dayNum)) {
                                days[dayNum] = data;
                            }
                        });
                        latestDays = { ...latestDays, ...days };
                        emitMerged();
                    }
                }, () => {});
                unsubs.push(u2);
            } catch (e) {}
        }

        // Listen to legacy flat experiences & sprints details
        try {
            const detailsRef = doc(db, EXPERIENCES_COLLECTION, sprintId, 'sprintdetails', 'info');
            const u3 = onSnapshot(detailsRef, async (detailsSnap) => {
                if (detailsSnap.exists()) {
                    latestDetails = { id: sprintId, ...cleanDetailsData(detailsSnap.data()) };
                    emitMerged();
                } else if (!latestDetails) {
                    sprintService.getSprintById(sprintId).then(res => {
                        if (res) {
                            latestDetails = res;
                            emitMerged();
                        }
                    }).catch(() => {});
                }
            }, () => {});
            unsubs.push(u3);

            const unsubDays = onSnapshot(collection(db, EXPERIENCES_COLLECTION, sprintId, 'days'), async (daysSnap) => {
                if (!daysSnap.empty) {
                    const days: Record<number, any> = {};
                    daysSnap.forEach(dDoc => {
                        const data = dDoc.data();
                        const dayNum = parseInt(dDoc.id.replace('day ', ''));
                        if (!isNaN(dayNum)) {
                            days[dayNum] = data;
                        }
                    });
                    latestDays = { ...latestDays, ...days };
                    emitMerged();
                }
            }, () => {});
            unsubs.push(unsubDays);
        } catch (e) {}

        // Initial fallback check
        sprintService.getSprintById(sprintId).then((res) => {
            if (res && !latestDetails) {
                latestDetails = res;
                emitMerged();
            }
        }).catch(() => {});

        return () => {
            unsubs.forEach(u => {
                try { u(); } catch (e) {}
            });
        };
    },

    getExperiencesByCategory: async (categoryName: ExperienceDocName): Promise<Sprint[]> => {
        try {
            const colRef = collection(db, EXPERIENCES_COLLECTION, categoryName, 'items');
            const snap = await getDocs(colRef);
            const items: Sprint[] = [];
            for (const d of snap.docs) {
                const item = await sprintService.getSprintById(d.id);
                if (item && item.deleted !== true) {
                    items.push(item);
                }
            }
            return items;
        } catch (e) {
            console.error(`Error getting experiences for category ${categoryName}:`, e);
            return [];
        }
    },

    subscribeToExperiencesByCategory: (categoryName: ExperienceDocName, callback: (sprints: Sprint[]) => void) => {
        try {
            const colRef = collection(db, EXPERIENCES_COLLECTION, categoryName, 'items');
            return onSnapshot(colRef, async (snap) => {
                const ids = snap.docs.map(d => d.id);
                const items = await sprintService.getSprintsByIds(ids);
                callback(items.filter(i => i.deleted !== true));
            }, (err) => {
                console.warn(`subscribeToExperiencesByCategory error for ${categoryName}:`, err);
            });
        } catch (e) {
            console.error(`Error subscribing to experiences category ${categoryName}:`, e);
            return () => {};
        }
    },

    getCoachSprints: async (coachId: string) => {
        if (!coachId) return [];
        const cached = cachedCoachSprintsMap.get(coachId);
        if (cached && Date.now() - cached.cachedAt < SPRINT_CACHE_TTL_MS) {
            return cached.data;
        }

        const q = query(collectionGroup(db, 'sprintdetails'));
        const snap = await getDocs(q);
        const rawMap = new Map<string, Sprint>();
        snap.docs.forEach(d => {
            const id = d.ref.parent?.parent?.id;
            if (id && !EXPERIENCE_DOC_NAMES.includes(id as any) && !rawMap.has(id)) {
                const data = sanitizeData(d.data()) as Sprint;
                data.id = id;
                if (data.coachId === coachId && data.deleted !== true) {
                    rawMap.set(id, data);
                }
            }
        });
        const resolved = await sprintService.resolveSprintsList(Array.from(rawMap.values()));
        cachedCoachSprintsMap.set(coachId, { data: resolved, cachedAt: Date.now() });
        return resolved;
    },

    getAdminCoachSprints: async () => {
        if (cachedAdminCoachSprints && Date.now() - cachedAdminCoachSprints.cachedAt < SPRINT_CACHE_TTL_MS) {
            return cachedAdminCoachSprints.data;
        }

        const q = query(collectionGroup(db, 'sprintdetails'));
        const snap = await getDocs(q);
        const rawMap = new Map<string, Sprint>();
        snap.docs.forEach(d => {
            const id = d.ref.parent?.parent?.id;
            if (id && !EXPERIENCE_DOC_NAMES.includes(id as any) && !rawMap.has(id)) {
                const data = sanitizeData(d.data()) as Sprint;
                data.id = id;
                if (data.deleted !== true) {
                    rawMap.set(id, data);
                }
            }
        });
        const resolved = await sprintService.resolveSprintsList(Array.from(rawMap.values()));
        const filtered = resolved.filter(s => 
            s.sprintType === 'Foundational' || 
            s.sprintType === 'Fundamentals' || 
            s.sprintType === 'Core' || 
            s.sprintType === 'Expert' || 
            s.category === 'Core Platform Sprint' || 
            s.category === 'Growth Fundamentals'
        );
        cachedAdminCoachSprints = { data: filtered, cachedAt: Date.now() };
        return filtered;
    },

    subscribeToCoachSprints: (coachId: string, callback: (sprints: Sprint[]) => void) => {
        ensureSeedBlogsInFirestore().catch(() => {});
        migrateAllSprintsToExperiences().catch(() => {});
        const q = query(collectionGroup(db, 'sprintdetails'));
        return onSnapshot(q, async (snap) => {
            const rawMap = new Map<string, Sprint>();
            snap.docs.forEach(d => {
                const id = d.ref.parent?.parent?.id;
                if (id && !EXPERIENCE_DOC_NAMES.includes(id as any) && !rawMap.has(id)) {
                    const data = sanitizeData(d.data()) as Sprint;
                    data.id = id;
                    const { contentType, subcategory } = determineExperienceContentType(data);
                    data.contentType = contentType;
                    data.subcategory = subcategory;
                    if (data.coachId === coachId && data.deleted !== true) {
                        rawMap.set(id, data);
                    }
                }
            });
            const resolved = await sprintService.resolveSprintsList(Array.from(rawMap.values()));
            if (coachId) {
                cachedCoachSprintsMap.set(coachId, { data: resolved, cachedAt: Date.now() });
            }
            callback(resolved);
        });
    },

    getAdminSprints: async () => {
        if (cachedAdminSprints && Date.now() - cachedAdminSprints.cachedAt < SPRINT_CACHE_TTL_MS) {
            return cachedAdminSprints.data;
        }

        ensureSeedBlogsInFirestore().catch(() => {});
        migrateAllSprintsToExperiences().catch(() => {});
        const q = query(collectionGroup(db, 'sprintdetails'));
        const snap = await getDocs(q);
        const rawMap = new Map<string, Sprint>();
        snap.docs.forEach(d => {
            const id = d.ref.parent?.parent?.id;
            if (id && !EXPERIENCE_DOC_NAMES.includes(id as any) && !rawMap.has(id)) {
                const data = sanitizeData(d.data()) as Sprint;
                data.id = id;
                const { contentType, subcategory } = determineExperienceContentType(data);
                data.contentType = contentType;
                data.subcategory = subcategory;
                if (data.deleted !== true) {
                    rawMap.set(id, data);
                }
            }
        });
        const resolved = await sprintService.resolveSprintsList(Array.from(rawMap.values()));
        cachedAdminSprints = { data: resolved, cachedAt: Date.now() };
        return resolved;
    },

    subscribeToAdminSprints: (callback: (sprints: Sprint[]) => void, onError?: (error: any) => void) => {
        ensureSeedBlogsInFirestore().catch(() => {});
        migrateAllSprintsToExperiences().catch(() => {});
        const q = query(collectionGroup(db, 'sprintdetails'));
        return onSnapshot(q, async (snap) => {
            const rawMap = new Map<string, Sprint>();
            snap.docs.forEach(d => {
                const id = d.ref.parent?.parent?.id;
                if (id && !EXPERIENCE_DOC_NAMES.includes(id as any) && !rawMap.has(id)) {
                    const data = sanitizeData(d.data()) as Sprint;
                    data.id = id;
                    const { contentType, subcategory } = determineExperienceContentType(data);
                    data.contentType = contentType;
                    data.subcategory = subcategory;
                    if (data.deleted !== true) {
                        rawMap.set(id, data);
                    }
                }
            });
            const resolved = await sprintService.resolveSprintsList(Array.from(rawMap.values()));
            cachedAdminSprints = { data: resolved, cachedAt: Date.now() };
            callback(resolved);
        }, (error) => {
            if (onError) onError(error);
        });
    },

    subscribeToAllSprints: (callback: (sprints: Sprint[]) => void, onError?: (error: any) => void) => {
        ensureSeedBlogsInFirestore().catch(() => {});
        migrateAllSprintsToExperiences().catch(() => {});
        const q = query(collectionGroup(db, 'sprintdetails'));
        return onSnapshot(q, async (snap) => {
            const rawMap = new Map<string, Sprint>();
            snap.docs.forEach(d => {
                const id = d.ref.parent?.parent?.id;
                if (id && !EXPERIENCE_DOC_NAMES.includes(id as any) && !rawMap.has(id)) {
                    const data = sanitizeData(d.data()) as Sprint;
                    data.id = id;
                    const { contentType, subcategory } = determineExperienceContentType(data);
                    data.contentType = contentType;
                    data.subcategory = subcategory;
                    rawMap.set(id, data);
                }
            });
            const resolved = await sprintService.resolveSprintsList(Array.from(rawMap.values()));
            callback(resolved);
        }, (error) => {
            if (onError) onError(error);
        });
    },

    getPublishedSprints: async () => {
        if (cachedPublishedSprints && Date.now() - cachedPublishedSprints.cachedAt < SPRINT_CACHE_TTL_MS) {
            return cachedPublishedSprints.data;
        }

        ensureSeedBlogsInFirestore().catch(() => {});
        migrateAllSprintsToExperiences().catch(() => {});
        const q = query(collectionGroup(db, 'sprintdetails'));
        const snap = await getDocs(q);
        const rawMap = new Map<string, Sprint>();
        snap.docs.forEach(d => {
            const id = d.ref.parent?.parent?.id;
            if (id && !EXPERIENCE_DOC_NAMES.includes(id as any) && !rawMap.has(id)) {
                const data = sanitizeData(d.data()) as Sprint;
                data.id = id;
                const { contentType, subcategory } = determineExperienceContentType(data);
                data.contentType = contentType;
                data.subcategory = subcategory;
                
                let isAllowed = false;
                if (data.deleted !== true) {
                    if (data.contentType === 'blog') isAllowed = data.approvalStatus === 'approved';
                    else if (data.contentType === 'ignite') isAllowed = data.published === true || data.approvalStatus === 'approved';
                    else isAllowed = data.approvalStatus === 'approved' && data.published === true;
                }

                if (isAllowed) {
                    rawMap.set(id, data);
                }
            }
        });
        const resolved = await sprintService.resolveSprintsList(Array.from(rawMap.values()));
        cachedPublishedSprints = { data: resolved, cachedAt: Date.now() };
        return resolved;
    },

    subscribeToPublishedSprints: (callback: (sprints: Sprint[]) => void, onError?: (error: any) => void) => {
        ensureSeedBlogsInFirestore().catch(() => {});
        migrateAllSprintsToExperiences().catch(() => {});
        const q = query(collectionGroup(db, 'sprintdetails'));
        return onSnapshot(q, async (snap) => {
            const rawMap = new Map<string, Sprint>();
            snap.docs.forEach(d => {
                const id = d.ref.parent?.parent?.id;
                if (id && !EXPERIENCE_DOC_NAMES.includes(id as any) && !rawMap.has(id)) {
                    const data = sanitizeData(d.data()) as Sprint;
                    data.id = id;
                    const { contentType, subcategory } = determineExperienceContentType(data);
                    data.contentType = contentType;
                    data.subcategory = subcategory;

                    let isAllowed = false;
                    if (data.deleted !== true) {
                        if (data.contentType === 'blog') isAllowed = data.approvalStatus === 'approved';
                        else if (data.contentType === 'ignite') isAllowed = data.published === true || data.approvalStatus === 'approved';
                        else isAllowed = data.approvalStatus === 'approved' && data.published === true;
                    }

                    if (isAllowed) {
                        rawMap.set(id, data);
                    }
                }
            });
            const resolved = await sprintService.resolveSprintsList(Array.from(rawMap.values()));
            cachedPublishedSprints = { data: resolved, cachedAt: Date.now() };
            callback(resolved);
        }, (error) => {
            if (onError) onError(error);
        });
    },

    resolveSprintDays: async (sprint: Sprint): Promise<Sprint> => {
        if (!sprint || !sprint.id) return sprint;
        
        // Fast path: If dailyContent is already populated in the sprint, return immediately
        if (Array.isArray(sprint.dailyContent) && sprint.dailyContent.length > 0) {
            return deserializeSprint(sprint);
        }

        try {
            const { contentType, subcategory } = determineExperienceContentType(sprint);
            sprint.contentType = contentType;
            sprint.subcategory = subcategory;
            const primaryDocName = getExperienceDocName(sprint);

            let daysSnap: any = null;

            // 1. Check primary categorized path: experiences/{Category}/items/{sprint.id}/days
            try {
                daysSnap = await getDocs(collection(db, EXPERIENCES_COLLECTION, primaryDocName, 'items', sprint.id, 'days'));
            } catch (e) {}

            // 2. Check other categories in parallel if empty
            if (!daysSnap || daysSnap.empty) {
                const otherCatSnaps = await Promise.all(
                    EXPERIENCE_DOC_NAMES.filter(c => c !== primaryDocName).map(async (cat) => {
                        try {
                            const snap = await getDocs(collection(db, EXPERIENCES_COLLECTION, cat, 'items', sprint.id, 'days'));
                            return !snap.empty ? snap : null;
                        } catch (e) { return null; }
                    })
                );
                daysSnap = otherCatSnaps.find(s => s !== null);
            }

            // 3. Check singular experience collection in parallel: experience/{Category}/items/{sprint.id}/days
            if (!daysSnap || daysSnap.empty) {
                const singSnaps = await Promise.all(
                    EXPERIENCE_DOC_NAMES.map(async (cat) => {
                        try {
                            const snap = await getDocs(collection(db, EXPERIENCE_SINGULAR_COLLECTION, cat, 'items', sprint.id, 'days'));
                            return !snap.empty ? snap : null;
                        } catch (e) { return null; }
                    })
                );
                daysSnap = singSnaps.find(s => s !== null);
            }

            // 4. Fallback to flat experiences collection
            if (!daysSnap || daysSnap.empty) {
                try {
                    daysSnap = await getDocs(collection(db, EXPERIENCES_COLLECTION, sprint.id, 'days'));
                } catch (e) {}
            }

            const loadedDays: Record<number, any> = {};
            if (daysSnap && !daysSnap.empty) {
                daysSnap.forEach((dDoc: any) => {
                    const data = dDoc.data();
                    const dayNum = parseInt(dDoc.id.replace('day ', ''));
                    if (!isNaN(dayNum)) {
                        loadedDays[dayNum] = data;
                    }
                });
            }

            if (Object.keys(loadedDays).length > 0) {
                const dailyContent = [];
                const maxDay = Math.max(...Object.keys(loadedDays).map(Number));
                for (let d = 1; d <= maxDay; d++) {
                    if (loadedDays[d]) {
                        dailyContent.push({ day: d, ...loadedDays[d] });
                    }
                }
                sprint.dailyContent = dailyContent;
            } else if (sprint.dailyContent && sprint.dailyContent.length > 0) {
                // Auto-migrate old format sprint to new subcollections in the background
                sprintService._writeSubcollections(sprint.id, sprint).catch(() => {});
            }
        } catch (err) {
            console.error("Error resolving sprint subcollection days:", err);
        }
        return deserializeSprint(sprint);
    },

    resolveSprintsList: async (sprints: Sprint[]): Promise<Sprint[]> => {
        const uniqueInputs = deduplicateSprintsById(sprints);
        const results = uniqueInputs.map((s) => {
            if (sprintCache[s.id]) {
                return sprintCache[s.id];
            }
            const deserialized = deserializeSprint(s);
            sprintCache[s.id] = deserialized;
            return deserialized;
        });
        return results;
    },

    _writeSubcollections: async (sprintId: string, sprintData: any) => {
        try {
            const serializedSprint = serializeSprint(sprintData);
            const { 
                dailyContent, 
                ...metadata 
            } = serializedSprint;
            
            const { contentType, subcategory } = determineExperienceContentType(metadata);
            metadata.contentType = contentType;
            metadata.subcategory = subcategory;

            const docName = getExperienceDocName(metadata);
            const detailsData = sanitizeData({ ...metadata, contentType, subcategory, updatedAt: new Date().toISOString() });
            
            // Clean up dailyContent from detailsData
            delete (detailsData as any).dailyContent;

            // Ensure parent category documents exist in background (non-blocking)
            ensureExperienceCategoryDocs().catch(() => {});

            // Immediately sync memory & localStorage cache for instant responsiveness
            const updatedSprintObj = { ...sprintData, id: sprintId, updatedAt: detailsData.updatedAt };
            sprintCache[sprintId] = updatedSprintObj;
            try {
                localStorage.setItem(`vectorise_sprint_cache_${sprintId}`, safeJSONStringify(updatedSprintObj));
            } catch (err) {}
            
            // Perform all primary document and day writes atomically using a single writeBatch
            const batch = writeBatch(db);

            // 1. Hierarchical categorized paths: experiences/{Category}/items/{sprintId}/...
            batch.set(doc(db, EXPERIENCES_COLLECTION, docName, 'items', sprintId, 'sprintdetails', 'info'), detailsData);
            batch.set(doc(db, EXPERIENCES_COLLECTION, docName, 'items', sprintId, 'details', 'info'), detailsData);
            batch.set(doc(db, EXPERIENCES_COLLECTION, docName, 'items', sprintId), {
                id: sprintId,
                title: metadata.title || metadata.blogTitle || metadata.igniteTitle || '',
                contentType,
                subcategory,
                updatedAt: detailsData.updatedAt
            }, { merge: true });

            // 2. Singular experience collection alias
            batch.set(doc(db, EXPERIENCE_SINGULAR_COLLECTION, docName, 'items', sprintId, 'sprintdetails', 'info'), detailsData);
            batch.set(doc(db, EXPERIENCE_SINGULAR_COLLECTION, docName, 'items', sprintId, 'details', 'info'), detailsData);

            // 3. Write all days in the same atomic batch
            if (Array.isArray(dailyContent)) {
                dailyContent.forEach((day) => {
                    if (!day || typeof day.day === 'undefined') return;
                    const dayNum = day.day;
                    const dayData = sanitizeData(day);
                    
                    const catDayRef = doc(db, EXPERIENCES_COLLECTION, docName, 'items', sprintId, 'days', `day ${dayNum}`);
                    batch.set(catDayRef, dayData);

                    const singDayRef = doc(db, EXPERIENCE_SINGULAR_COLLECTION, docName, 'items', sprintId, 'days', `day ${dayNum}`);
                    batch.set(singDayRef, dayData);
                });
            }

            // Commit all document and subcollection writes in ONE atomic network roundtrip
            await batch.commit();

            // Background cleanups that should NEVER block or slow down user saving:
            cleanupLegacySprintDocs(sprintId).catch(() => {});

            (async () => {
                // If duration was reduced, clean up orphaned days in the background
                if (Array.isArray(dailyContent)) {
                    try {
                        const daysSnap = await getDocs(collection(db, EXPERIENCES_COLLECTION, docName, 'items', sprintId, 'days'));
                        const newDayNums = new Set(dailyContent.map(d => d.day));
                        const deletePromises: Promise<any>[] = [];
                        for (const dDoc of daysSnap.docs) {
                            const dayNum = parseInt(dDoc.id.replace('day ', ''));
                            if (!isNaN(dayNum) && !newDayNums.has(dayNum)) {
                                deletePromises.push(deleteDoc(dDoc.ref).catch(() => {}));
                                deletePromises.push(deleteDoc(doc(db, EXPERIENCE_SINGULAR_COLLECTION, docName, 'items', sprintId, 'days', dDoc.id)).catch(() => {}));
                            }
                        }
                        if (deletePromises.length > 0) {
                            await Promise.all(deletePromises);
                        }
                    } catch (e) {}
                }

                // Cleanup other categories if item was re-categorized
                for (const otherCat of EXPERIENCE_DOC_NAMES) {
                    if (otherCat !== docName) {
                        try {
                            await Promise.all([
                                deleteDoc(doc(db, EXPERIENCES_COLLECTION, otherCat, 'items', sprintId, 'sprintdetails', 'info')).catch(() => {}),
                                deleteDoc(doc(db, EXPERIENCES_COLLECTION, otherCat, 'items', sprintId, 'details', 'info')).catch(() => {}),
                                deleteDoc(doc(db, EXPERIENCES_COLLECTION, otherCat, 'items', sprintId)).catch(() => {}),
                                deleteDoc(doc(db, EXPERIENCE_SINGULAR_COLLECTION, otherCat, 'items', sprintId, 'sprintdetails', 'info')).catch(() => {}),
                                deleteDoc(doc(db, EXPERIENCE_SINGULAR_COLLECTION, otherCat, 'items', sprintId, 'details', 'info')).catch(() => {})
                            ]);
                        } catch (e) {}
                    }
                }
            })().catch(() => {});
        } catch (err) {
            console.error("Error writing subcollections:", err);
            throw err;
        }
    },

    addReview: async (sprintId: string, review: Omit<Review, 'id' | 'sprintId'> & { id?: string }) => {
        try {
            const reviewData = {
                ...review,
                sprintId,
                rating: Number(review.rating) || 5,
                comment: review.comment || '',
                userName: review.userName || 'Anonymous Participant',
                userAvatar: review.userAvatar || '',
                timestamp: review.timestamp || new Date().toISOString()
            };
            // 1. Add to sprints/{sprintId}/reviews subcollection
            const subCol = collection(db, SPRINTS_COLLECTION, sprintId, 'reviews');
            const docRef = await addDoc(subCol, sanitizeData(reviewData));
            
            // 2. Also save to root 'reviews' collection for global lookup
            try {
                const rootCol = collection(db, 'reviews');
                await setDoc(doc(rootCol, docRef.id), sanitizeData({ ...reviewData, id: docRef.id }), { merge: true });
            } catch (e) {
                console.warn("[addReview] Error syncing to root reviews collection:", e);
            }

            return docRef.id;
        } catch (err) {
            console.error("[addReview] Error adding review:", err);
            throw err;
        }
    },

    getReviewsForSprint: async (sprintId: string): Promise<Review[]> => {
        if (!sprintId) return [];
        try {
            // Try subcollection first
            const subReviewsCol = collection(db, SPRINTS_COLLECTION, sprintId, 'reviews');
            const snap = await getDocs(subReviewsCol);
            const list: Review[] = snap.docs.map(d => ({
                ...sanitizeData(d.data()),
                id: d.id,
                sprintId
            }) as Review);

            if (list.length > 0) return list;

            // Fallback: root reviews collection
            const rootCol = collection(db, 'reviews');
            const q = query(rootCol, where("sprintId", "==", sprintId));
            const rootSnap = await getDocs(q);
            return rootSnap.docs.map(d => ({
                ...sanitizeData(d.data()),
                id: d.id,
                sprintId
            }) as Review);
        } catch (err) {
            console.warn(`[getReviewsForSprint] Error fetching reviews for ${sprintId}:`, err);
            return [];
        }
    },

    subscribeToSprintReviews: (sprintId: string, callback: (reviews: Review[]) => void) => {
        if (!sprintId) {
            callback([]);
            return () => {};
        }

        try {
            const subReviewsCol = collection(db, SPRINTS_COLLECTION, sprintId, 'reviews');
            return onSnapshot(subReviewsCol, (snapshot) => {
                const reviews = snapshot.docs.map(doc => ({
                    ...sanitizeData(doc.data()),
                    id: doc.id,
                    sprintId
                }) as Review);
                callback(reviews);
            }, (err) => {
                console.warn(`[subscribeToSprintReviews] Subcollection listener error for ${sprintId}:`, err);
                try {
                    const rootCol = collection(db, 'reviews');
                    const q = query(rootCol, where("sprintId", "==", sprintId));
                    return onSnapshot(q, (rootSnap) => {
                        const reviews = rootSnap.docs.map(doc => ({
                            ...sanitizeData(doc.data()),
                            id: doc.id,
                            sprintId
                        }) as Review);
                        callback(reviews);
                    }, () => callback([]));
                } catch (e) {
                    callback([]);
                }
            });
        } catch (e) {
            console.warn(`[subscribeToSprintReviews] Error setting listener for ${sprintId}:`, e);
            callback([]);
            return () => {};
        }
    },

    subscribeToReviewsForSprints: (sprintIds: string[], callback: (reviews: Review[]) => void) => {
        if (!sprintIds.length) {
            callback([]);
            return () => {};
        }

        const validSprintIds = sprintIds.filter(id => !!id && typeof id === 'string' && id.trim() !== '');
        if (!validSprintIds.length) {
            callback([]);
            return () => {};
        }

        const targetSprintIdSet = new Set(validSprintIds);
        const unsubs: (() => void)[] = [];
        const reviewsBySprint: Record<string, Review[]> = {};

        const emitAll = () => {
            const all = Object.values(reviewsBySprint).flat();
            callback(all);
        };

        // 1. Subscribe to each sprint's subcollection directly: sprints/{sprintId}/reviews
        // This does NOT require any collectionGroup index and works immediately out of the box
        validSprintIds.slice(0, 10).forEach((sprintId) => {
            try {
                const subReviewsCol = collection(db, SPRINTS_COLLECTION, sprintId, 'reviews');
                const unsub = onSnapshot(
                    subReviewsCol,
                    (snapshot) => {
                        reviewsBySprint[sprintId] = snapshot.docs.map(doc => ({
                            ...sanitizeData(doc.data()),
                            id: doc.id,
                            sprintId
                        }) as Review);
                        emitAll();
                    },
                    (err) => {
                        console.warn(`[subscribeToReviewsForSprints] Subcollection reviews listener error for sprint ${sprintId}:`, err);
                    }
                );
                unsubs.push(unsub);
            } catch (e) {
                console.warn(`[subscribeToReviewsForSprints] Could not listen to reviews for ${sprintId}:`, e);
            }
        });

        // 2. Also try root reviews collection fallback: collection(db, 'reviews')
        try {
            const rootReviewsCol = collection(db, 'reviews');
            const qRoot = query(rootReviewsCol, where("sprintId", "in", validSprintIds.slice(0, 10)));
            const rootUnsub = onSnapshot(
                qRoot,
                (snapshot) => {
                    const rootReviews = snapshot.docs.map(doc => ({
                        ...sanitizeData(doc.data()),
                        id: doc.id
                    }) as Review);
                    if (rootReviews.length > 0) {
                        reviewsBySprint['__root__'] = rootReviews;
                        emitAll();
                    }
                },
                (err) => {
                    // Suppress if root collection index or query isn't configured
                    console.warn('[subscribeToReviewsForSprints] Root reviews query error:', err);
                }
            );
            unsubs.push(rootUnsub);
        } catch (e) {
            // Ignore root fallback error
        }

        return () => {
            unsubs.forEach(u => {
                try {
                    u();
                } catch (e) {}
            });
        };
    },

    saveOrchestration: async (assignments: Record<string, LifecycleSlotAssignment>) => {
        // Legacy method - keeping for compatibility but will be phased out
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'current_mapping');
        await setDoc(docRef, sanitizeData({ assignments, updatedAt: new Date().toISOString() }), { merge: true });
    },

    saveSlotAssignment: async (slotId: string, assignment: LifecycleSlotAssignment) => {
        const docRef = doc(db, ORCHESTRATION_SLOTS_COLLECTION, slotId);
        await setDoc(docRef, sanitizeData({ ...assignment, updatedAt: new Date().toISOString() }));
    },

    deleteSlotAssignment: async (slotId: string) => {
        const docRef = doc(db, ORCHESTRATION_SLOTS_COLLECTION, slotId);
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(docRef);
        } catch (e) {
            console.error("Delete failed:", e);
        }
    },

    clearAllOrchestration: async () => {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            
            // Clear legacy
            await deleteDoc(doc(db, ORCHESTRATION_COLLECTION, 'current_mapping'));
            
            // Clear new slots
            const q = query(collection(db, ORCHESTRATION_SLOTS_COLLECTION));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
                await deleteDoc(doc(db, ORCHESTRATION_SLOTS_COLLECTION, d.id));
            }
        } catch (e) {
            console.error("Clear all failed:", e);
        }
    },

    getOrchestration: async (): Promise<Record<string, LifecycleSlotAssignment>> => {
        if (cachedOrchestrationData && (Date.now() - cachedOrchestrationData.cachedAt < SPRINT_CACHE_TTL_MS)) {
            return cachedOrchestrationData.data;
        }
        const q = query(collection(db, ORCHESTRATION_SLOTS_COLLECTION));
        const snap = await getDocs(q);
        const mapping: Record<string, LifecycleSlotAssignment> = {};
        snap.forEach(doc => {
            mapping[doc.id] = sanitizeData(doc.data()) as LifecycleSlotAssignment;
        });
        cachedOrchestrationData = { data: mapping, cachedAt: Date.now() };
        return mapping;
    },

    subscribeToOrchestration: (callback: (mapping: Record<string, LifecycleSlotAssignment>) => void) => {
        const q = query(collection(db, ORCHESTRATION_SLOTS_COLLECTION));
        return onSnapshot(q, (snapshot) => {
            const mapping: Record<string, LifecycleSlotAssignment> = {};
            snapshot.forEach(doc => {
                mapping[doc.id] = sanitizeData(doc.data()) as LifecycleSlotAssignment;
            });
            cachedOrchestrationData = { data: mapping, cachedAt: Date.now() };
            callback(mapping);
        });
    },

    getGlobalOrchestrationSettings: async (): Promise<GlobalOrchestrationSettings | null> => {
        const snap = await getDoc(doc(db, ORCHESTRATION_COLLECTION, 'global_settings'));
        return snap.exists() ? sanitizeData(snap.data()) as GlobalOrchestrationSettings : null;
    },

    subscribeToGlobalSettings: (callback: (settings: GlobalOrchestrationSettings | null) => void) => {
        return onSnapshot(doc(db, ORCHESTRATION_COLLECTION, 'global_settings'), (doc) => {
            callback(doc.exists() ? sanitizeData(doc.data()) as GlobalOrchestrationSettings : null);
        });
    },

    enrollUser: async (
        userId: string, 
        sprintId: string, 
        duration: number, 
        commercial?: { 
            coachId?: string, 
            pricePaid?: number, 
            currency?: string,
            source?: PaymentSource, 
            referral?: string | null,
            firstActionInput?: string, taskInputs?: string[]
        }
    ) => {
        const enrollmentId = `enrollment_${userId}_${sprintId}`;
        const enrollmentRef = doc(db, 'users', userId, 'enrollments', enrollmentId);
        const existing = await getDoc(enrollmentRef);

        const hasInputs = !!(
            (commercial?.taskInputs && commercial.taskInputs.some(a => a && String(a).trim().length > 0)) ||
            (commercial?.firstActionInput && commercial.firstActionInput.trim().length > 0)
        );
        const now = new Date().toISOString();
        
        if (existing.exists()) {
            const existingData = sanitizeData(existing.data()) as ParticipantSprint;

            // If the user has already completed this sprint, start a new run (Run 2, Run 3, etc.)
            if (existingData.status === 'completed') {
                const activeQuery = query(
                    collection(db, 'users', userId, 'enrollments'), 
                    where("status", "==", "active")
                );
                const activeSnap = await getDocs(activeQuery);
                const hasActive = !activeSnap.empty && activeSnap.docs.some(d => d.id !== enrollmentId);

                const previousRuns = existingData.pastRuns || [];
                const completedRun: ParticipantSprintRun = {
                    runNumber: existingData.currentRun || existingData.runNumber || (previousRuns.length + 1) || 1,
                    started_at: existingData.started_at,
                    completed_at: existingData.completed_at || now,
                    status: 'completed',
                    progress: existingData.progress || []
                };
                const newPastRuns = [...previousRuns, completedRun];
                const newRunNumber = newPastRuns.length + 1;
                const effectiveDuration = duration && duration > 0 ? duration : (existingData.progress?.length || 1);
                const freshProgress = Array.from({ length: effectiveDuration }, (_, i) => ({
                    day: i + 1,
                    completed: (i === 0 && hasInputs) ? true : false,
                    completedAt: (i === 0 && hasInputs) ? now : undefined,
                    answers: (i === 0 && commercial?.taskInputs) ? commercial.taskInputs : (i === 0 && commercial?.firstActionInput) ? [commercial.firstActionInput] : [],
                    submission: (i === 0 && commercial?.taskInputs) ? commercial.taskInputs[0] || "" : (i === 0 && commercial?.firstActionInput) ? commercial.firstActionInput : ""
                }));

                const updatedData: Partial<ParticipantSprint> = {
                    status: hasActive ? 'queued' : 'active',
                    currentRun: newRunNumber,
                    runNumber: newRunNumber,
                    pastRuns: newPastRuns,
                    started_at: now,
                    completed_at: null,
                    progress: freshProgress,
                    last_activity_at: now
                };

                await updateDoc(enrollmentRef, sanitizeData(updatedData));
                try {
                    const userRef = doc(db, 'users', userId);
                    await updateDoc(userRef, {
                        enrolledSprintIds: arrayUnion(sprintId)
                    });
                } catch (e) {}

                return { ...existingData, ...updatedData } as ParticipantSprint;
            }

            if (hasInputs && existingData.progress && existingData.progress[0]) {
                const updatedProgress = [...existingData.progress];
                if (!updatedProgress[0].completed || commercial?.taskInputs) {
                    updatedProgress[0] = {
                        ...updatedProgress[0],
                        completed: true,
                        completedAt: updatedProgress[0].completedAt || now,
                        answers: commercial?.taskInputs || (commercial?.firstActionInput ? [commercial.firstActionInput] : updatedProgress[0].answers),
                        submission: commercial?.taskInputs?.[0] || commercial?.firstActionInput || updatedProgress[0].submission || ""
                    };
                    await updateDoc(enrollmentRef, {
                        progress: updatedProgress,
                        last_activity_at: now
                    });
                    existingData.progress = updatedProgress;
                }
            }
            try {
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    enrolledSprintIds: arrayUnion(sprintId)
                });
            } catch (e) {}
            return existingData;
        }

        // Check for active enrollments to determine if this should be queued
        const activeQuery = query(
            collection(db, 'users', userId, 'enrollments'), 
            where("status", "==", "active")
        );
        const activeSnap = await getDocs(activeQuery);
        const hasActive = !activeSnap.empty;

        const effectiveDuration = duration && duration > 0 ? duration : 1;
        const newEnrollment: ParticipantSprint = {
            id: enrollmentId,
            sprint_id: sprintId,
            user_id: userId,
            coach_id: commercial?.coachId || '',
            started_at: now,
            price_paid: commercial?.pricePaid || 0,
            currency: commercial?.currency || 'NGN',
            payment_source: commercial?.source || 'direct',
            referral_source: commercial?.referral || null,
            status: hasActive ? 'queued' : 'active',
            last_activity_at: now,
            sentNudges: [],
            soundDisabled: false,
            notificationsDisabled: false,
            progress: Array.from({ length: effectiveDuration }, (_, i) => ({
                day: i + 1,
                completed: (i === 0 && hasInputs) ? true : false,
                completedAt: (i === 0 && hasInputs) ? now : undefined,
                answers: (i === 0 && commercial?.taskInputs) ? commercial.taskInputs : (i === 0 && commercial?.firstActionInput) ? [commercial.firstActionInput] : [],
                submission: (i === 0 && commercial?.taskInputs) ? commercial.taskInputs[0] || "" : (i === 0 && commercial?.firstActionInput) ? commercial.firstActionInput : ""
            }))
        };

        await setDoc(enrollmentRef, sanitizeData(newEnrollment));

        try {
            const userRef = doc(db, 'users', userId);
            const spr = await sprintService.getSprintById(sprintId);
            const isCoachSprint = !!(spr && spr.audience && spr.audience.some((a: any) => typeof a === 'string' && a.toLowerCase().includes("coach")));
            
            await updateDoc(userRef, {
                enrolledSprintIds: arrayUnion(sprintId),
                ...(isCoachSprint ? { isCoachRequestMode: true } : {})
            });
        } catch (e) {
            console.warn("[SprintService] Failed to update enrolledSprintIds or isCoachRequestMode on user doc:", e);
        }
        
        // Notify coach(es) via push and in-app notification when a user starts a sprint
        notifyCoachesOnSprintStart(userId, sprintId, commercial?.coachId).catch(err => 
            console.warn("[SprintService] Failed to notify coach on sprint start:", err)
        );

        if (newEnrollment.status === 'active') {
            await sprintService.checkReferralStart(userId);
        }
        
        return newEnrollment;
    },

    getUserEnrollments: async (userId: string) => {
        const q = query(collection(db, 'users', userId, 'enrollments'));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint));
    },

    deleteEnrollment: async (enrollmentId: string) => {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            const parts = enrollmentId.split('_');
            const userId = parts[1];
            await deleteDoc(doc(db, 'users', userId, 'enrollments', enrollmentId));
        } catch (e) {
            console.error("Delete enrollment failed:", e);
        }
    },

    subscribeToUserEnrollments: (userId: string, callback: (enrollments: ParticipantSprint[]) => void, onError?: (error: any) => void) => {
        const q = query(collection(db, 'users', userId, 'enrollments'));
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint)));
        }, (error) => {
            if (onError) onError(error);
        });
    },

    getEnrollmentsForSprints: async (sprintIds: string[]) => {
        if (!sprintIds.length) return [];
        const sprintIdSet = new Set(sprintIds.filter(id => !!id && typeof id === 'string'));
        if (sprintIdSet.size === 0) return [];
        const all = await sprintService.getAllEnrollments();
        return all.filter(e => sprintIdSet.has(e.sprint_id));
    },

    subscribeToEnrollment: (enrollmentId: string, callback: (data: ParticipantSprint | null) => void, onError?: (error: any) => void) => {
        const parts = enrollmentId.split('_');
        const userId = parts[1];
        return onSnapshot(doc(db, 'users', userId, 'enrollments', enrollmentId), (doc) => {
            callback(doc.exists() ? ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint) : null);
        }, (error) => {
            if (onError) onError(error);
        });
    },

    getAllEnrollments: async () => {
        if (cachedAllEnrollments && (Date.now() - cachedAllEnrollments.cachedAt < SPRINT_CACHE_TTL_MS)) {
            return cachedAllEnrollments.data;
        }

        const map = new Map<string, ParticipantSprint>();
        try {
            // 1. Run collectionGroup queries in parallel
            await Promise.all([
                (async () => {
                    try {
                        const q = query(collectionGroup(db, 'enrollments'));
                        const snap = await getDocs(q);
                        snap.docs.forEach(d => {
                            const data = sanitizeData(d.data()) as ParticipantSprint;
                            const id = d.id;
                            const userId = d.ref.parent?.parent?.id || data.user_id;
                            if (userId && data.sprint_id) {
                                map.set(id, { ...data, id, user_id: data.user_id || userId });
                            }
                        });
                    } catch (e) {
                        console.warn("[sprintService] collectionGroup enrollments query warning:", e);
                    }
                })(),
                (async () => {
                    try {
                        const qSingular = query(collectionGroup(db, 'enrollment'));
                        const snapSingular = await getDocs(qSingular);
                        snapSingular.docs.forEach(d => {
                            const data = sanitizeData(d.data()) as ParticipantSprint;
                            const id = d.id;
                            const userId = d.ref.parent?.parent?.id || data.user_id;
                            if (userId && data.sprint_id && !map.has(id)) {
                                map.set(id, { ...data, id, user_id: data.user_id || userId });
                            }
                        });
                    } catch (e) {}
                })()
            ]);

            // 2. Only fallback to per-user scan if collectionGroup found NOTHING (e.g. index building)
            if (map.size === 0) {
                try {
                    const usersSnap = await getDocs(collection(db, 'users'));
                    await Promise.all(usersSnap.docs.map(async (userDoc) => {
                        const userId = userDoc.id;
                        try {
                            const snap = await getDocs(collection(db, 'users', userId, 'enrollments'));
                            snap.forEach(d => {
                                const data = sanitizeData(d.data()) as ParticipantSprint;
                                if (data.sprint_id && !map.has(d.id)) {
                                    map.set(d.id, { ...data, id: d.id, user_id: data.user_id || userId });
                                }
                            });
                        } catch (e) {}
                        try {
                            const snapSing = await getDocs(collection(db, 'users', userId, 'enrollment'));
                            snapSing.forEach(d => {
                                const data = sanitizeData(d.data()) as ParticipantSprint;
                                if (data.sprint_id && !map.has(d.id)) {
                                    map.set(d.id, { ...data, id: d.id, user_id: data.user_id || userId });
                                }
                            });
                        } catch (e) {}
                    }));
                } catch (e) {}
            }
            const results = Array.from(map.values());
            cachedAllEnrollments = { data: results, cachedAt: Date.now() };
            return results;
        } catch (err) {
            console.error("Failed to load all enrollments:", err);
            return cachedAllEnrollments?.data || [];
        }
    },

    subscribeToAllEnrollments: (callback: (enrollments: ParticipantSprint[]) => void) => {
        const q = query(collectionGroup(db, 'enrollments'));
        return onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint));
            cachedAllEnrollments = { data: list, cachedAt: Date.now() };
            callback(list);
        });
    },

    updateEnrollment: async (enrollmentId: string, data: Partial<ParticipantSprint>) => {
        const parts = enrollmentId.split('_');
        const userId = parts[1];
        const enrollmentRef = doc(db, 'users', userId, 'enrollments', enrollmentId);
        await updateDoc(enrollmentRef, sanitizeData({ ...data, last_activity_at: new Date().toISOString() }));
        if (data.status === 'active') {
            const snap = await getDoc(enrollmentRef);
            if (snap.exists()) {
                const user_id = snap.data().user_id;
                if (user_id) {
                    await sprintService.checkReferralStart(user_id);
                }
            }
        }
    },

    updateSprint: async (sprintId: string, data: Partial<Sprint>, isDirect: boolean = false) => {
        try {
            // Check in-memory cache first, then localStorage, and only fetch if completely absent
            let existingDetails: any = sprintCache[sprintId];
            if (!existingDetails) {
                existingDetails = await sprintService.getSprintById(sprintId, false);
            }
            if (!existingDetails) {
                existingDetails = {};
            }

            // Also fetch existing days if neither data nor existingDetails has dailyContent
            if (!data.dailyContent && !existingDetails.dailyContent) {
                try {
                    const docName = getExperienceDocName(existingDetails);
                    const daysSnap = await getDocs(collection(db, EXPERIENCES_COLLECTION, docName, 'items', sprintId, 'days'));
                    if (!daysSnap.empty) {
                        const days = daysSnap.docs.map(d => sanitizeData(d.data())).sort((a: any, b: any) => (a.day || 0) - (b.day || 0));
                        existingDetails.dailyContent = days;
                    }
                } catch (e) {}
            }
            
            // Construct the merged data to write back to subcollections
            const mergedSub = { ...existingDetails, ...data, updatedAt: new Date().toISOString() };
            
            // Synchronously update in-memory cache and localStorage for zero-latency local availability
            sprintCache[sprintId] = mergedSub;
            try {
                localStorage.setItem(`vectorise_sprint_cache_${sprintId}`, safeJSONStringify(mergedSub));
            } catch (e) {}

            await sprintService._writeSubcollections(sprintId, mergedSub);
        } catch (e) {
            console.error("Failed to sync subcollections in updateSprint", e);
            throw e;
        }
    },

    deleteSprint: async (sprintId: string) => {
        try {
            const existing = await sprintService.getSprintById(sprintId, true);
            if (existing) {
                const details = {
                    ...existing,
                    deleted: true,
                    published: false,
                    updatedAt: new Date().toISOString()
                };
                await sprintService._writeSubcollections(sprintId, details);
            }
        } catch (err) {
            console.error("[SprintService] Failed to mark experience as deleted:", err);
        }

        // 2. Remove from all Tracks
        try {
            const tracksQuery = query(collection(db, 'tracks'), where("sprintIds", "array-contains", sprintId));
            const tracksSnap = await getDocs(tracksQuery);
            for (const trackDoc of tracksSnap.docs) {
                const trackData = trackDoc.data() as Track;
                const newSprintIds = trackData.sprintIds.filter(id => id !== sprintId);
                await updateDoc(doc(db, 'tracks', trackDoc.id), { 
                    sprintIds: newSprintIds,
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error("[SprintService] Failed to cleanup tracks after sprint deletion:", err);
        }

        // 3. Remove from Orchestration
        try {
            const orchSlotsQuery = query(collection(db, ORCHESTRATION_SLOTS_COLLECTION));
            const orchSlotsSnap = await getDocs(orchSlotsQuery);
            
            for (const slotDoc of orchSlotsSnap.docs) {
                const assignment = slotDoc.data() as LifecycleSlotAssignment;
                let changed = false;

                // Check primary sprintId
                if (assignment.sprintId === sprintId) {
                    assignment.sprintId = '';
                    changed = true;
                }

                // Check sprintIds array
                if (assignment.sprintIds && assignment.sprintIds.includes(sprintId)) {
                    assignment.sprintIds = assignment.sprintIds.filter(id => id !== sprintId);
                    changed = true;
                }

                // Check focus map
                if (assignment.sprintFocusMap && assignment.sprintFocusMap[sprintId]) {
                    delete assignment.sprintFocusMap[sprintId];
                    changed = true;
                }

                if (changed) {
                    await updateDoc(doc(db, ORCHESTRATION_SLOTS_COLLECTION, slotDoc.id), { 
                        ...assignment,
                        updatedAt: new Date().toISOString()
                    });
                }
            }
        } catch (err) {
            console.error("[SprintService] Failed to cleanup orchestration after sprint deletion:", err);
        }
    },

    approveSprint: async (sprintId: string, data?: Partial<Sprint>) => {
        try {
            let existingDetails: any = await sprintService.getSprintById(sprintId, true);
            if (!existingDetails) existingDetails = {};

            const finalData = { 
                ...existingDetails, 
                ...(data || {}), 
                id: sprintId, 
                approvalStatus: 'approved' as const, 
                published: true, 
                updatedAt: new Date().toISOString() 
            };
            if ((finalData as any).pendingChanges) {
                delete (finalData as any).pendingChanges;
            }

            await sprintService._writeSubcollections(sprintId, finalData);

            sprintCache[sprintId] = finalData as Sprint;
            try {
                localStorage.setItem(`vectorise_sprint_cache_${sprintId}`, safeJSONStringify(finalData));
            } catch (e) {}
        } catch (e) {
            console.error("Failed to sync subcollections in approveSprint", e);
            throw e;
        }
    },

    startNextQueuedSprint: async (userId: string) => {
        try {
            console.log("[SprintService] Attempting to start next queued sprint for user:", userId);
            
            // 1. Check for any truly active enrollments
            const activeQuery = query(
                collection(db, 'users', userId, 'enrollments'), 
                where("status", "==", "active")
            );
            const activeSnap = await getDocs(activeQuery);
            
            const activeEnrollments = activeSnap.docs.map(doc => sanitizeData(doc.data()) as ParticipantSprint);
            
            // Filter out those that are actually completed (all days done)
            const trulyActive = activeEnrollments.filter(e => {
                const isDone = e.progress && e.progress.every(p => p.completed);
                if (isDone) {
                    console.log("[SprintService] Found 'active' sprint that is actually completed, ignoring:", e.id);
                    // Optionally update its status to completed in the background
                    updateDoc(doc(db, 'users', userId, 'enrollments', e.id), { status: 'completed', completed_at: new Date().toISOString() }).catch(err => console.error("Failed to auto-complete sprint:", err));
                }
                return !isDone;
            });

            if (trulyActive.length > 0) {
                console.log("[SprintService] User already has truly active sprints:", trulyActive.map(t => t.id));
                return null;
            }

            // 2. Find the oldest queued enrollment
            const queuedQuery = query(
                collection(db, 'users', userId, 'enrollments'), 
                where("status", "==", "queued")
            );
            const queuedSnap = await getDocs(queuedQuery);
            
            if (queuedSnap.empty) {
                console.log("[SprintService] No queued sprints found for user.");
                return null;
            }

            // Sort by started_at (oldest first)
            const queued = queuedSnap.docs
                .map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint))
                .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

            const nextSprint = queued[0];
            console.log("[SprintService] Starting next queued sprint:", nextSprint.id);
            
            const enrollmentRef = doc(db, 'users', userId, 'enrollments', nextSprint.id);
            
            const now = new Date().toISOString();
            await updateDoc(enrollmentRef, { 
                status: 'active',
                started_at: now, // Reset start time to now when it actually starts
                last_activity_at: now
            });

            // Notify coach when queued sprint becomes active
            notifyCoachesOnSprintStart(userId, nextSprint.sprint_id, nextSprint.coach_id).catch(err =>
                console.warn("[SprintService] Failed to notify coach on queued sprint activation:", err)
            );

            await sprintService.checkReferralStart(userId);

            return nextSprint.id;
        } catch (error) {
            console.error("[SprintService] Failed to start next queued sprint:", error);
            return null;
        }
    },

    checkReferralStart: async (userId: string) => {
        try {
            const q = query(
                collectionGroup(db, 'referrals'),
                where('refereeId', '==', userId)
            );
            const snap = await getDocs(q);
            if (snap.empty) return;

            const docsToProcess = snap.docs.filter(d => d.data()?.status === 'joined');
            if (docsToProcess.length === 0) return;

            const { runTransaction } = await import('firebase/firestore');
            for (const referralDoc of docsToProcess) {
                const rData = referralDoc.data();
                const referrerId = rData.referrerId;
                
                await runTransaction(db, async (transaction) => {
                    const refDocRef = referralDoc.ref;
                    const referrerRef = doc(db, 'users', referrerId);
                    
                    const referrerSnap = await transaction.get(referrerRef);
                    if (!referrerSnap.exists()) return;

                    transaction.update(refDocRef, { status: 'started_sprint' });
                    transaction.update(referrerRef, {
                        'impactStats.peopleHelped': increment(1)
                    });

                    // Also update nested subcollection record
                    const subRefDoc = doc(db, 'users', referrerId, 'referrals', userId);
                    transaction.set(subRefDoc, { status: 'started_sprint' }, { merge: true });

                    // Drop a notification about referral completion immediately
                    const notifId = `${referrerId}_completed_${userId}`;
                    const notifRef = doc(db, 'users', referrerId, 'notifications', notifId);
                    transaction.set(notifRef, {
                        id: notifId,
                        userId: referrerId,
                        type: 'referral_update',
                        title: 'Referral Completed! 🌱',
                        body: 'Congratulations! A friend completed registration and started a sprint. Click to view rewards.',
                        actionUrl: '/impact',
                        isRead: false,
                        readAt: null,
                        pushSent: false,
                        createdAt: new Date().toISOString(),
                        expiresAt: null,
                        bypassActiveCheck: true,
                        data: {
                          title: 'Referral Completed! 🌱',
                          body: 'Congratulations! A friend completed registration and started a sprint. Click to view rewards.',
                          tag: 'referral-completion',
                          url: '/impact'
                        }
                    });
                });
                console.log(`[Referral System] Realtime trigger: Referee ${userId} started first sprint. Referrer ${referrerId} peopleHelped count incremented. Nested referral and notifications set.`);
            }
        } catch (err) {
            console.error("Error checking referral start:", err);
        }
    },

    runSystemMigration: async (onProgress?: (message: string) => void): Promise<any> => {
        const report = {
            sprintsScanned: 0,
            sprintsMigratedToSubcollection: 0,
            legacyDocsDeleted: 0,
            parentFieldsCleaned: 0,
            detailsFieldsCleaned: 0,
            errors: [] as string[],
            logs: [] as string[]
        };

        const log = (msg: string) => {
            report.logs.push(msg);
            console.log(`[Migration] ${msg}`);
            if (onProgress) onProgress(msg);
        };

        try {
            log("Starting system-wide migration to experiences/{Category}/items/{id} and wiping former sprints collection...");
            await ensureExperienceCategoryDocs().catch(() => {});
            
            const sprintsSnap = await getDocs(collection(db, LEGACY_SPRINTS_COLLECTION));
            report.sprintsScanned = sprintsSnap.size;
            log(`Found ${sprintsSnap.size} legacy sprints in former 'sprints' collection.`);

            for (const sprintDoc of sprintsSnap.docs) {
                const sprintId = sprintDoc.id;
                log(`Processing sprint: ${sprintId}...`);

                // 1. Fetch full sprint details
                const fullSprint = await sprintService.getSprintById(sprintId, true);
                if (fullSprint) {
                    const docName = getExperienceDocName(fullSprint);
                    log(`Relocating ${sprintId} to experiences/${docName}/items/${sprintId}...`);
                    await sprintService._writeSubcollections(sprintId, fullSprint);
                    report.sprintsMigratedToSubcollection++;
                }

                // 2. Wipe from legacy sprints collection
                await cleanupLegacySprintDocs(sprintId);
                report.legacyDocsDeleted++;
                log(`Successfully deleted legacy copy from former 'sprints/${sprintId}'.`);
            }

            // Also migrate global experiences
            await migrateAllSprintsToExperiences();

            log("Migration and legacy sprints cleanup complete! All sprint views and operations now draw from 'experiences' alone.");
            return report;
        } catch (e: any) {
            log(`Fatal error during migration: ${e.message}`);
            report.errors.push(e.message);
            return report;
        }
    },

    getSprintLinks: async (): Promise<any[]> => {
        try {
            const q = query(collection(db, 'sprint_links'));
            const snap = await getDocs(q);
            const links: any[] = [];
            snap.forEach(doc => {
                links.push({ id: doc.id, ...sanitizeData(doc.data()) });
            });
            return links;
        } catch (e) {
            console.error("Failed to fetch sprint links:", e);
            return [];
        }
    },

    subscribeToSprintLinks: (callback: (links: any[]) => void): (() => void) => {
        try {
            const colRef = collection(db, 'sprint_links');
            const unsub = onSnapshot(colRef, (snap) => {
                const links: any[] = [];
                snap.forEach(doc => {
                    links.push({ id: doc.id, ...sanitizeData(doc.data()) });
                });
                callback(links);
            }, (err) => {
                console.error("Error subscribing to sprint links:", err);
                callback([]);
            });
            return unsub;
        } catch (e) {
            console.error("Error setting sprint links listener:", e);
            callback([]);
            return () => {};
        }
    },

    saveSprintLink: async (link: any) => {
        const linkId = link.id || doc(collection(db, 'sprint_links')).id;
        const docRef = doc(db, 'sprint_links', linkId);
        const dataToSave = { ...link, id: linkId, updatedAt: new Date().toISOString() };
        await setDoc(docRef, sanitizeData(dataToSave));
        return dataToSave;
    },

    deleteSprintLink: async (id: string) => {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'sprint_links', id));
        } catch (e) {
            console.error("Failed to delete sprint link:", e);
        }
    },

    getSprintBlogLinks: async (): Promise<any[]> => {
        try {
            const q = query(collection(db, 'sprint_blog_links'));
            const snap = await getDocs(q);
            const links: any[] = [];
            snap.forEach(doc => {
                links.push({ id: doc.id, ...sanitizeData(doc.data()) });
            });
            return links;
        } catch (e) {
            console.error("Failed to fetch sprint blog links:", e);
            return [];
        }
    },

    subscribeToSprintBlogLinks: (callback: (links: any[]) => void): (() => void) => {
        try {
            const colRef = collection(db, 'sprint_blog_links');
            const unsub = onSnapshot(colRef, (snap) => {
                const links: any[] = [];
                snap.forEach(doc => {
                    links.push({ id: doc.id, ...sanitizeData(doc.data()) });
                });
                callback(links);
            }, (err) => {
                console.error("Error subscribing to sprint blog links:", err);
                callback([]);
            });
            return unsub;
        } catch (e) {
            console.error("Error setting sprint blog links listener:", e);
            callback([]);
            return () => {};
        }
    },

    saveSprintBlogLink: async (link: any) => {
        const linkId = link.id || doc(collection(db, 'sprint_blog_links')).id;
        const docRef = doc(db, 'sprint_blog_links', linkId);
        const dataToSave = { ...link, id: linkId, updatedAt: new Date().toISOString() };
        await setDoc(docRef, sanitizeData(dataToSave));
        return dataToSave;
    },

    deleteSprintBlogLink: async (id: string) => {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'sprint_blog_links', id));
        } catch (e) {
            console.error("Failed to delete sprint blog link:", e);
        }
    },

    // Record view of an experience (Ignite, Riseblog, Challenge, Sprint)
    recordExperienceView: async (experienceId: string, user: { id: string; name?: string; email?: string; profileImageUrl?: string; role?: string }) => {
        if (!experienceId || !user?.id) return;
        try {
            const viewDocRef = doc(db, 'experience_interactions', experienceId, 'views', user.id);
            const viewData: InteractionUser = {
                userId: user.id,
                userName: user.name || user.email?.split('@')[0] || 'Member',
                userEmail: user.email || '',
                userPhoto: user.profileImageUrl || '',
                role: user.role || 'Seeker',
                timestamp: new Date().toISOString(),
                action: 'view'
            };
            await setDoc(viewDocRef, sanitizeData(viewData), { merge: true });
        } catch (e) {
            console.warn('[recordExperienceView] error:', e);
        }
    },

    // Toggle or record like of an experience with user identity
    toggleExperienceLike: async (experienceId: string, user: { id: string; name?: string; email?: string; profileImageUrl?: string; role?: string }, isLiked: boolean) => {
        if (!experienceId || !user?.id) return;
        try {
            const likeDocRef = doc(db, 'experience_interactions', experienceId, 'likes', user.id);
            if (isLiked) {
                const likeData: InteractionUser = {
                    userId: user.id,
                    userName: user.name || user.email?.split('@')[0] || 'Member',
                    userEmail: user.email || '',
                    userPhoto: user.profileImageUrl || '',
                    role: user.role || 'Seeker',
                    timestamp: new Date().toISOString(),
                    action: 'like'
                };
                await setDoc(likeDocRef, sanitizeData(likeData));
            } else {
                await deleteDoc(likeDocRef).catch(() => {});
            }
        } catch (e) {
            console.warn('[toggleExperienceLike] error:', e);
        }
    },

    // Get all tracked views and likes for an experience
    getExperienceInteractions: async (experienceId: string): Promise<{ views: InteractionUser[]; likes: InteractionUser[]; viewCount: number; likeCount: number }> => {
        if (!experienceId) return { views: [], likes: [], viewCount: 0, likeCount: 0 };
        try {
            const viewsCol = collection(db, 'experience_interactions', experienceId, 'views');
            const likesCol = collection(db, 'experience_interactions', experienceId, 'likes');
            
            const [viewsSnap, likesSnap] = await Promise.all([
                getDocs(viewsCol).catch(() => ({ docs: [] } as any)),
                getDocs(likesCol).catch(() => ({ docs: [] } as any))
            ]);

            const views: InteractionUser[] = [];
            viewsSnap.docs.forEach((d: any) => {
                views.push({ id: d.id, ...sanitizeData(d.data()) } as any);
            });

            const likes: InteractionUser[] = [];
            likesSnap.docs.forEach((d: any) => {
                likes.push({ id: d.id, ...sanitizeData(d.data()) } as any);
            });

            // Sort most recent first
            views.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
            likes.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

            return {
                views,
                likes,
                viewCount: views.length,
                likeCount: likes.length
            };
        } catch (e) {
            console.error('[getExperienceInteractions] error:', e);
            return { views: [], likes: [], viewCount: 0, likeCount: 0 };
        }
    },

    // Real-time subscription to experience interactions
    subscribeToExperienceInteractions: (experienceId: string, callback: (data: { views: InteractionUser[]; likes: InteractionUser[]; viewCount: number; likeCount: number }) => void) => {
        if (!experienceId) return () => {};

        let viewsList: InteractionUser[] = [];
        let likesList: InteractionUser[] = [];

        const notify = () => {
            callback({
                views: [...viewsList].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()),
                likes: [...likesList].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()),
                viewCount: viewsList.length,
                likeCount: likesList.length
            });
        };

        const unsubViews = onSnapshot(collection(db, 'experience_interactions', experienceId, 'views'), (snap) => {
            viewsList = snap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) } as any));
            notify();
        }, (err) => {
            console.warn('[subscribeToExperienceInteractions views error]', err);
        });

        const unsubLikes = onSnapshot(collection(db, 'experience_interactions', experienceId, 'likes'), (snap) => {
            likesList = snap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) } as any));
            notify();
        }, (err) => {
            console.warn('[subscribeToExperienceInteractions likes error]', err);
        });

        return () => {
            unsubViews();
            unsubLikes();
        };
    }
};
