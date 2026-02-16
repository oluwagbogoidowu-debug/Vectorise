import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, deleteDoc, onSnapshot, addDoc, deleteField, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { ParticipantSprint, Sprint, Review, CoachingComment, UserEvent, LifecycleSlotAssignment, GlobalOrchestrationSettings } from '../types';
import { userService, sanitizeData } from './userService';
import { notificationService } from './notificationService';
import { isRegistryIncomplete } from '../utils/sprintUtils';
import { LIFECYCLE_SLOTS } from './mockData';

const SPRINTS_COLLECTION = 'sprints';
const ENROLLMENTS_COLLECTION = 'enrollments';
const REVIEWS_COLLECTION = 'reviews';
const ORCHESTRATION_COLLECTION = 'orchestration';
const LINK_STATS_COLLECTION = 'link_stats';

export interface OrchestrationMapping {
    assignments: Record<string, { sprintId: string; focusCriteria: string[] }>;
}

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

    createSprint: async (sprint: Sprint) => {
        try {
            const now = new Date().toISOString();
            const newSprint = sanitizeData({
                ...sprint,
                createdAt: sprint.createdAt || now,
                updatedAt: now,
                deleted: false
            });
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprint.id);
            await setDoc(sprintRef, newSprint);
            return newSprint;
        } catch (error) {
            console.error("Error creating sprint in Firestore:", error);
            throw error;
        }
    },

    updateSprint: async (sprintId: string, data: Partial<Sprint>, isDirect: boolean = false) => {
        try {
            const now = new Date().toISOString();
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
            const sprintSnap = await getDoc(sprintRef);
            
            if (!sprintSnap.exists()) throw new Error("Sprint not found");
            const existing = sprintSnap.data() as Sprint;

            // If Admin is editing or it's a fresh draft, update directly
            if (isDirect || existing.approvalStatus === 'draft' || existing.approvalStatus === 'rejected') {
                const updateData = sanitizeData({
                    ...data,
                    updatedAt: now
                });
                await updateDoc(sprintRef, updateData);
            } else {
                // If Coach is editing a published/approved sprint, it goes into pendingChanges
                // and triggers a re-audit status.
                const updateData = sanitizeData({
                    pendingChanges: {
                        ...(existing.pendingChanges || {}),
                        ...data,
                        updatedAt: now
                    },
                    approvalStatus: 'pending_approval', // Flag for Admin re-audit
                    updatedAt: now
                });
                await updateDoc(sprintRef, updateData);
            }
        } catch (error) {
            console.error("Error updating sprint in Firestore:", error);
            throw error;
        }
    },

    deleteSprint: async (sprintId: string) => {
        try {
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
            await updateDoc(sprintRef, {
                deleted: true,
                published: false,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error deleting sprint:", error);
            throw error;
        }
    },

    approveSprint: async (sprintId: string, data?: Partial<Sprint>) => {
        try {
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
            const sprintSnap = await getDoc(sprintRef);
            if (!sprintSnap.exists()) throw new Error("Sprint not found");
            const existing = sprintSnap.data() as Sprint;

            // Merge pendingChanges into main record on approval
            const finalData = {
                ...(existing || {}),
                ...(existing.pendingChanges || {}),
                ...(data || {}),
                approvalStatus: 'approved',
                published: true,
                updatedAt: new Date().toISOString(),
                pendingChanges: deleteField() 
            };

            await updateDoc(sprintRef, sanitizeData(finalData));
        } catch (error) {
            console.error("Error approving sprint:", error);
            throw error;
        }
    },

    getAdminSprints: async () => {
        try {
            const q = query(collection(db, SPRINTS_COLLECTION), where("deleted", "==", false));
            const querySnapshot = await getDocs(q);
            const dbSprints: Sprint[] = [];
            querySnapshot.forEach((doc) => {
                dbSprints.push(sanitizeData(doc.data()) as Sprint);
            });
            return dbSprints;
        } catch (error) {
            console.error("Error fetching admin sprints:", error);
            return [];
        }
    },

    getPublishedSprints: async () => {
        try {
            const orchestration = await sprintService.getOrchestration();
            const orchestratedSprintIds = new Set(
                Object.values(orchestration)
                    .map(mapping => mapping.sprintId)
                    .filter(id => !!id)
            );
            if (orchestratedSprintIds.size === 0) return [];
            const q = query(
                collection(db, SPRINTS_COLLECTION), 
                where("approvalStatus", "==", "approved"),
                where("deleted", "==", false)
            );
            const querySnapshot = await getDocs(q);
            const dbSprints: Sprint[] = [];
            querySnapshot.forEach((doc) => {
                const data = sanitizeData(doc.data()) as Sprint;
                if (!orchestratedSprintIds.has(data.id)) return;
                dbSprints.push(data);
            });
            return dbSprints;
        } catch (error) {
            return [];
        }
    },

    getCoachSprints: async (coachId: string) => {
        try {
            const q = query(
                collection(db, SPRINTS_COLLECTION), 
                where("coachId", "==", coachId),
                where("deleted", "==", false)
            );
            const querySnapshot = await getDocs(q);
            const dbSprints: Sprint[] = [];
            querySnapshot.forEach((doc) => {
                dbSprints.push(sanitizeData(doc.data()) as Sprint);
            });
            return dbSprints;
        } catch (error) {
            return [];
        }
    },

    getSprintById: async (sprintId: string) => {
        try {
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
            const sprintSnap = await getDoc(sprintRef);
            if (sprintSnap.exists()) return sanitizeData(sprintSnap.data()) as Sprint;
            return null;
        } catch (error) {
            return null;
        }
    },

    // Fix: Updated type to Record<string, LifecycleSlotAssignment> to support deep registry configuration
    saveOrchestration: async (assignments: Record<string, LifecycleSlotAssignment>) => {
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'current_mapping');
        await setDoc(docRef, sanitizeData({ assignments, updatedAt: new Date().toISOString() }), { merge: true });
    },

    // Fix: Corrected return type to include the full LifecycleSlotAssignment interface
    getOrchestration: async (): Promise<Record<string, LifecycleSlotAssignment>> => {
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'current_mapping');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return (sanitizeData(snap.data()) as any).assignments || {};
        }
        return {};
    },

    // Added subscribeToOrchestration to support real-time platform logic updates
    subscribeToOrchestration: (callback: (mapping: Record<string, any>) => void) => {
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'current_mapping');
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                callback((sanitizeData(doc.data()) as any).assignments || {});
            } else {
                callback({});
            }
        });
    },

    saveGlobalOrchestrationSettings: async (settings: GlobalOrchestrationSettings) => {
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'global_settings');
        await setDoc(docRef, sanitizeData({ ...settings, updatedAt: new Date().toISOString() }));
    },

    getGlobalOrchestrationSettings: async (): Promise<GlobalOrchestrationSettings | null> => {
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'global_settings');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return sanitizeData(snap.data()) as GlobalOrchestrationSettings;
        }
        return null;
    },

    // Added subscribeToGlobalSettings to support real-time global orchestration settings
    subscribeToGlobalSettings: (callback: (settings: GlobalOrchestrationSettings | null) => void) => {
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'global_settings');
        return onSnapshot(docRef, (doc) => {
            callback(doc.exists() ? sanitizeData(doc.data()) as GlobalOrchestrationSettings : null);
        });
    },

    getSprintIdByFocus: async (focus: string): Promise<string | null> => {
        const orchestration = await sprintService.getOrchestration();
        for (const slotId in orchestration) {
            const mapping = orchestration[slotId];
            if (mapping.focusCriteria && mapping.focusCriteria.includes(focus)) {
                return mapping.sprintId;
            }
        }
        return null;
    },

    enrollUser: async (userId: string, sprintId: string, duration: number) => {
        const enrollmentId = `enrollment_${userId}_${sprintId}`;
        const enrollmentRef = doc(db, ENROLLMENTS_COLLECTION, enrollmentId);
        const existing = await getDoc(enrollmentRef);
        if (existing.exists()) return sanitizeData(existing.data()) as ParticipantSprint;
        const newEnrollment: ParticipantSprint = {
            id: enrollmentId, sprintId, participantId: userId,
            startDate: new Date().toISOString(), sentNudges: [],
            progress: Array.from({ length: duration }, (_, i) => ({ day: i + 1, completed: false }))
        };
        await setDoc(enrollmentRef, sanitizeData(newEnrollment));
        await userService.addUserEnrollment(userId, sprintId);
        return newEnrollment;
    },

    getUserEnrollments: async (userId: string) => {
        const q = query(collection(db, ENROLLMENTS_COLLECTION), where("participantId", "==", userId));
        const snap = await getDocs(q);
        const results: ParticipantSprint[] = [];
        snap.forEach((doc) => results.push(sanitizeData(doc.data()) as ParticipantSprint));
        return results;
    },

    subscribeToUserEnrollments: (userId: string, callback: (enrollments: ParticipantSprint[]) => void) => {
        const q = query(collection(db, ENROLLMENTS_COLLECTION), where("participantId", "==", userId));
        return onSnapshot(q, (snapshot) => {
            const results: ParticipantSprint[] = [];
            snapshot.forEach((doc) => results.push(sanitizeData(doc.data()) as ParticipantSprint));
            callback(results);
        });
    },

    getEnrollmentsForSprints: async (sprintIds: string[]) => {
        const validIds = (sprintIds || []).filter(id => !!id);
        if (validIds.length === 0) return [];
        const q = query(collection(db, ENROLLMENTS_COLLECTION), where("sprintId", "in", validIds.slice(0, 10)));
        const snap = await getDocs(q);
        const results: ParticipantSprint[] = [];
        snap.forEach(doc => results.push(sanitizeData(doc.data()) as ParticipantSprint));
        return results;
    },

    subscribeToEnrollment: (enrollmentId: string, callback: (data: ParticipantSprint | null) => void) => {
        return onSnapshot(doc(db, ENROLLMENTS_COLLECTION, enrollmentId), (doc) => {
            callback(doc.exists() ? sanitizeData(doc.data()) as ParticipantSprint : null);
        });
    },

    subscribeToReviewsForSprints: (sprintIds: string[], callback: (reviews: Review[]) => void) => {
        const validIds = (sprintIds || []).filter(id => !!id);
        if (validIds.length === 0) { callback([]); return () => {}; }
        const q = query(collection(db, REVIEWS_COLLECTION), where("sprintId", "in", validIds.slice(0, 10)));
        return onSnapshot(q, (snapshot) => {
            const results: Review[] = [];
            snapshot.forEach(doc => results.push(sanitizeData({ id: doc.id, ...doc.data() }) as Review));
            callback(results);
        });
    }
};