
import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, addDoc, onSnapshot, deleteField, increment, serverTimestamp } from 'firebase/firestore';
import { ParticipantSprint, Sprint, OrchestratorLog, OrchestrationTrigger, PaymentSource, LifecycleSlotAssignment, GlobalOrchestrationSettings, Review, Track } from '../types';
import { sanitizeData, userService } from './userService';

const SPRINTS_COLLECTION = 'sprints';
const ENROLLMENTS_COLLECTION = 'enrollments';
const ORCHESTRATOR_LOGS = 'orchestrator_logs';
const ORCHESTRATION_COLLECTION = 'orchestration';
const ORCHESTRATION_SLOTS_COLLECTION = 'orchestration_slots';
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

    getSprintsByIds: async (sprintIds: string[]) => {
        const validIds = Array.from(new Set((sprintIds || []).filter(id => !!id && typeof id === 'string' && id !== '')));
        if (validIds.length === 0) return [];
        try {
            const CHUNK_SIZE = 10;
            const results: Sprint[] = [];
            for (let i = 0; i < validIds.length; i += CHUNK_SIZE) {
                const chunk = validIds.slice(i, i + CHUNK_SIZE);
                const q = query(collection(db, SPRINTS_COLLECTION), where("id", "in", chunk));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => results.push(sanitizeData(doc.data()) as Sprint));
            }
            return results;
        } catch (error) {
            console.error("Error fetching sprints by IDs:", error);
            return [];
        }
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

    getAdminCoachSprints: async () => {
        const q = query(
            collection(db, SPRINTS_COLLECTION), 
            where("category", "in", ["Growth Fundamentals", "Core Platform Sprint"]), 
            where("deleted", "==", false)
        );
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

    subscribeToAdminSprints: (callback: (sprints: Sprint[]) => void, onError?: (error: any) => void) => {
        const q = query(collection(db, SPRINTS_COLLECTION), where("deleted", "==", false));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(doc => sanitizeData(doc.data()) as Sprint));
        }, (error) => {
            if (onError) onError(error);
        });
    },

    subscribeToAllSprints: (callback: (sprints: Sprint[]) => void, onError?: (error: any) => void) => {
        const q = query(collection(db, SPRINTS_COLLECTION));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(doc => sanitizeData(doc.data()) as Sprint));
        }, (error) => {
            if (onError) onError(error);
        });
    },

    getPublishedSprints: async () => {
        const q = query(collection(db, SPRINTS_COLLECTION), where("published", "==", true), where("deleted", "==", false));
        const snap = await getDocs(q);
        return snap.docs.map(doc => sanitizeData(doc.data()) as Sprint);
    },

    subscribeToPublishedSprints: (callback: (sprints: Sprint[]) => void, onError?: (error: any) => void) => {
        const q = query(collection(db, SPRINTS_COLLECTION), where("published", "==", true), where("deleted", "==", false));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(doc => sanitizeData(doc.data()) as Sprint));
        }, (error) => {
            if (onError) onError(error);
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
        const q = query(collection(db, ORCHESTRATION_SLOTS_COLLECTION));
        const snap = await getDocs(q);
        const mapping: Record<string, LifecycleSlotAssignment> = {};
        snap.forEach(doc => {
            mapping[doc.id] = sanitizeData(doc.data()) as LifecycleSlotAssignment;
        });
        return mapping;
    },

    subscribeToOrchestration: (callback: (mapping: Record<string, LifecycleSlotAssignment>) => void) => {
        const q = query(collection(db, ORCHESTRATION_SLOTS_COLLECTION));
        return onSnapshot(q, (snapshot) => {
            const mapping: Record<string, LifecycleSlotAssignment> = {};
            snapshot.forEach(doc => {
                mapping[doc.id] = sanitizeData(doc.data()) as LifecycleSlotAssignment;
            });
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
            referral?: string | null 
        }
    ) => {
        const enrollmentId = `enrollment_${userId}_${sprintId}`;
        const enrollmentRef = doc(db, ENROLLMENTS_COLLECTION, enrollmentId);
        const existing = await getDoc(enrollmentRef);
        
        if (existing.exists()) return sanitizeData(existing.data()) as ParticipantSprint;

        // Check for active enrollments to determine if this should be queued
        const activeQuery = query(
            collection(db, ENROLLMENTS_COLLECTION), 
            where("user_id", "==", userId), 
            where("status", "==", "active")
        );
        const activeSnap = await getDocs(activeQuery);
        const hasActive = !activeSnap.empty;

        const now = new Date().toISOString();
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
            reflectionsDisabled: false,
            soundDisabled: false,
            notificationsDisabled: false,
            progress: Array.from({ length: duration }, (_, i) => ({ day: i + 1, completed: false }))
        };

        await setDoc(enrollmentRef, sanitizeData(newEnrollment));
        
        // Auto-claim First Sprint milestone if it's the first one
        if (!hasActive) {
            // We can't easily check claimedMilestoneIds here without fetching user
            // but claimMilestone handles its own check
            await userService.claimMilestone(userId, 's1', 5, true);
        }
        
        return newEnrollment;
    },

    getUserEnrollments: async (userId: string) => {
        const q = query(collection(db, ENROLLMENTS_COLLECTION), where("user_id", "==", userId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint));
    },

    subscribeToUserEnrollments: (userId: string, callback: (enrollments: ParticipantSprint[]) => void, onError?: (error: any) => void) => {
        const q = query(collection(db, ENROLLMENTS_COLLECTION), where("user_id", "==", userId));
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint)));
        }, (error) => {
            if (onError) onError(error);
        });
    },

    getEnrollmentsForSprints: async (sprintIds: string[]) => {
        if (!sprintIds.length) return [];
        const CHUNK_SIZE = 10;
        const results: ParticipantSprint[] = [];
        
        for (let i = 0; i < sprintIds.length; i += CHUNK_SIZE) {
            const chunk = sprintIds.slice(i, i + CHUNK_SIZE);
            const q = query(collection(db, ENROLLMENTS_COLLECTION), where("sprint_id", "in", chunk));
            const snap = await getDocs(q);
            snap.forEach(doc => results.push({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint));
        }
        
        return results;
    },

    subscribeToEnrollment: (enrollmentId: string, callback: (data: ParticipantSprint | null) => void, onError?: (error: any) => void) => {
        return onSnapshot(doc(db, ENROLLMENTS_COLLECTION, enrollmentId), (doc) => {
            callback(doc.exists() ? ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint) : null);
        }, (error) => {
            if (onError) onError(error);
        });
    },

    getAllEnrollments: async () => {
        const q = query(collection(db, ENROLLMENTS_COLLECTION));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint));
    },

    subscribeToAllEnrollments: (callback: (enrollments: ParticipantSprint[]) => void) => {
        const q = query(collection(db, ENROLLMENTS_COLLECTION));
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint)));
        });
    },

    updateSprint: async (sprintId: string, data: Partial<Sprint>, isDirect: boolean = false) => {
        const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
        await updateDoc(sprintRef, sanitizeData({ ...data, updatedAt: new Date().toISOString() }));
    },

    deleteSprint: async (sprintId: string) => {
        // 1. Mark sprint as deleted
        await updateDoc(doc(db, SPRINTS_COLLECTION, sprintId), { deleted: true, published: false });

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
        const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
        const finalData = { ...(data || {}), approvalStatus: 'approved', published: true, updatedAt: new Date().toISOString(), pendingChanges: deleteField() };
        await updateDoc(sprintRef, sanitizeData(finalData));
    },

    startNextQueuedSprint: async (userId: string) => {
        try {
            console.log("[SprintService] Attempting to start next queued sprint for user:", userId);
            
            // 1. Check for any truly active enrollments
            const activeQuery = query(
                collection(db, ENROLLMENTS_COLLECTION), 
                where("user_id", "==", userId), 
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
                    updateDoc(doc(db, ENROLLMENTS_COLLECTION, e.id), { status: 'completed', completed_at: new Date().toISOString() }).catch(err => console.error("Failed to auto-complete sprint:", err));
                }
                return !isDone;
            });

            if (trulyActive.length > 0) {
                console.log("[SprintService] User already has truly active sprints:", trulyActive.map(t => t.id));
                return null;
            }

            // 2. Find the oldest queued enrollment
            const queuedQuery = query(
                collection(db, ENROLLMENTS_COLLECTION), 
                where("user_id", "==", userId), 
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
            
            const enrollmentRef = doc(db, ENROLLMENTS_COLLECTION, nextSprint.id);
            
            const now = new Date().toISOString();
            await updateDoc(enrollmentRef, { 
                status: 'active',
                started_at: now, // Reset start time to now when it actually starts
                last_activity_at: now
            });

            return nextSprint.id;
        } catch (error) {
            console.error("[SprintService] Failed to start next queued sprint:", error);
            return null;
        }
    }
};
