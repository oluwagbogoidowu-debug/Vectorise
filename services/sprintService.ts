
import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, addDoc, onSnapshot, deleteField, increment, serverTimestamp } from 'firebase/firestore';
import { ParticipantSprint, Sprint, OrchestratorLog, OrchestrationTrigger, PaymentSource, LifecycleSlotAssignment, GlobalOrchestrationSettings, Review } from '../types';
import { sanitizeData } from './userService';

const SPRINTS_COLLECTION = 'sprints';
const ENROLLMENTS_COLLECTION = 'enrollments';
const ORCHESTRATOR_LOGS = 'orchestrator_logs';
const ORCHESTRATION_COLLECTION = 'orchestration';
const LINK_STATS_COLLECTION = 'link_stats';

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
        await setDoc(doc(db, SPRINTS_COLLECTION, sprint.id), newSprint);
        return newSprint;
    },

    getSprintById: async (sprintId: string) => {
        const snap = await getDoc(doc(db, SPRINTS_COLLECTION, sprintId));
        return snap.exists() ? sanitizeData(snap.data()) as Sprint : null;
    },

    subscribeToSprint: (sprintId: string, callback: (sprint: Sprint | null) => void) => {
        return onSnapshot(doc(db, SPRINTS_COLLECTION, sprintId), (doc) => {
            callback(doc.exists() ? sanitizeData(doc.data()) as Sprint : null);
        });
    },

    getCoachSprints: async (coachId: string) => {
        const q = query(collection(db, SPRINTS_COLLECTION), where("coachId", "==", coachId), where("deleted", "==", false));
        const snap = await getDocs(q);
        return snap.docs.map(doc => sanitizeData(doc.data()) as Sprint);
    },

    subscribeToCoachSprints: (coachId: string, callback: (sprints: Sprint[]) => void) => {
        const q = query(collection(db, SPRINTS_COLLECTION), where("coachId", "==", coachId), where("deleted", "==", false));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(doc => sanitizeData(doc.data()) as Sprint));
        });
    },

    getAdminSprints: async () => {
        const q = query(collection(db, SPRINTS_COLLECTION), where("deleted", "==", false));
        const snap = await getDocs(q);
        return snap.docs.map(doc => sanitizeData(doc.data()) as Sprint);
    },

    subscribeToAdminSprints: (callback: (sprints: Sprint[]) => void) => {
        const q = query(collection(db, SPRINTS_COLLECTION), where("deleted", "==", false));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(doc => sanitizeData(doc.data()) as Sprint));
        });
    },

    getPublishedSprints: async () => {
        const q = query(collection(db, SPRINTS_COLLECTION), where("published", "==", true), where("deleted", "==", false));
        const snap = await getDocs(q);
        return snap.docs.map(doc => sanitizeData(doc.data()) as Sprint);
    },

    subscribeToPublishedSprints: (callback: (sprints: Sprint[]) => void) => {
        const q = query(collection(db, SPRINTS_COLLECTION), where("published", "==", true), where("deleted", "==", false));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(doc => sanitizeData(doc.data()) as Sprint));
        });
    },

    subscribeToReviewsForSprints: (sprintIds: string[], callback: (reviews: Review[]) => void) => {
        if (!sprintIds.length) {
            callback([]);
            return () => {};
        }
        const q = query(collection(db, 'reviews'), where("sprintId", "in", sprintIds.slice(0, 10)));
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.docs.map(doc => sanitizeData(doc.data()) as Review));
        });
    },

    saveOrchestration: async (assignments: Record<string, LifecycleSlotAssignment>) => {
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'current_mapping');
        await setDoc(docRef, sanitizeData({ assignments, updatedAt: new Date().toISOString() }), { merge: true });
    },

    getOrchestration: async (): Promise<Record<string, LifecycleSlotAssignment>> => {
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'current_mapping');
        const snap = await getDoc(docRef);
        return snap.exists() ? (sanitizeData(snap.data()) as any).assignments || {} : {};
    },

    subscribeToOrchestration: (callback: (mapping: Record<string, any>) => void) => {
        return onSnapshot(doc(db, ORCHESTRATION_COLLECTION, 'current_mapping'), (doc) => {
            callback(doc.exists() ? (sanitizeData(doc.data()) as any).assignments || {} : {});
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
            currency?: string, // Added currency to commercial options
            source?: PaymentSource, 
            referral?: string | null 
        }
    ) => {
        const enrollmentId = `enrollment_${userId}_${sprintId}`;
        const enrollmentRef = doc(db, ENROLLMENTS_COLLECTION, enrollmentId);
        const existing = await getDoc(enrollmentRef);
        
        if (existing.exists()) return sanitizeData(existing.data()) as ParticipantSprint;

        const now = new Date().toISOString();
        // Added missing 'currency' property to newEnrollment
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
            status: 'active',
            last_activity_at: now,
            sentNudges: [],
            progress: Array.from({ length: duration }, (_, i) => ({ day: i + 1, completed: false }))
        };

        await setDoc(enrollmentRef, sanitizeData(newEnrollment));
        return newEnrollment;
    },

    getUserEnrollments: async (userId: string) => {
        const q = query(collection(db, ENROLLMENTS_COLLECTION), where("user_id", "==", userId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => sanitizeData(doc.data()) as ParticipantSprint);
    },

    subscribeToUserEnrollments: (userId: string, callback: (enrollments: ParticipantSprint[]) => void) => {
        const q = query(collection(db, ENROLLMENTS_COLLECTION), where("user_id", "==", userId));
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.docs.map(doc => sanitizeData(doc.data()) as ParticipantSprint));
        });
    },

    getEnrollmentsForSprints: async (sprintIds: string[]) => {
        if (!sprintIds.length) return [];
        const q = query(collection(db, ENROLLMENTS_COLLECTION), where("sprint_id", "in", sprintIds.slice(0, 10)));
        const snap = await getDocs(q);
        return snap.docs.map(doc => sanitizeData(doc.data()) as ParticipantSprint);
    },

    subscribeToEnrollment: (enrollmentId: string, callback: (data: ParticipantSprint | null) => void) => {
        return onSnapshot(doc(db, ENROLLMENTS_COLLECTION, enrollmentId), (doc) => {
            callback(doc.exists() ? sanitizeData(doc.data()) as ParticipantSprint : null);
        });
    },

    updateSprint: async (sprintId: string, data: Partial<Sprint>, isDirect: boolean = false) => {
        const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
        await updateDoc(sprintRef, sanitizeData({ ...data, updatedAt: new Date().toISOString() }));
    },

    deleteSprint: async (sprintId: string) => {
        await updateDoc(doc(db, SPRINTS_COLLECTION, sprintId), { deleted: true, published: false });
    },

    approveSprint: async (sprintId: string, data?: Partial<Sprint>) => {
        const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
        const finalData = { ...(data || {}), approvalStatus: 'approved', published: true, updatedAt: new Date().toISOString(), pendingChanges: deleteField() };
        await updateDoc(sprintRef, sanitizeData(finalData));
    }
};
