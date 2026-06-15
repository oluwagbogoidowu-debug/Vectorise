
import { db } from './firebase';
import { collection, collectionGroup, query, where, getDocs, doc, setDoc, updateDoc, getDoc, addDoc, onSnapshot, deleteField, increment, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ParticipantSprint, Sprint, OrchestratorLog, OrchestrationTrigger, PaymentSource, LifecycleSlotAssignment, GlobalOrchestrationSettings, Review, Track } from '../types';
import { sanitizeData, userService } from './userService';

const cleanDetailsData = (raw: any): any => {
    const sanitized = sanitizeData(raw);
    if (!sanitized) return {};
    const cleaned = { ...sanitized };
    delete cleaned.dailyContent;
    return cleaned;
};

const SPRINTS_COLLECTION = 'sprints';
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
                        return JSON.stringify(item);
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
                        return JSON.stringify(item);
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
        // Parent document is kept completely empty to store sprint details purely in subcollections
        await setDoc(doc(db, SPRINTS_COLLECTION, sprint.id), {});
        await sprintService._writeSubcollections(sprint.id, newSprint);
        return newSprint;
    },

    getSprintById: async (sprintId: string) => {
        const snap = await getDoc(doc(db, SPRINTS_COLLECTION, sprintId));
        const detailsSnap = await getDoc(doc(db, SPRINTS_COLLECTION, sprintId, 'sprintdetails', 'info'));
        if (!snap.exists() && !detailsSnap.exists()) return null;
        
        let sprintData = { id: sprintId } as any;
        if (detailsSnap.exists()) {
            sprintData = { ...sprintData, ...cleanDetailsData(detailsSnap.data()) };
        } else if (snap.exists()) {
            sprintData = { ...sprintData, ...cleanDetailsData(snap.data()) };
        }
        return await sprintService.resolveSprintDays(sprintData);
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
        const detailsRef = doc(db, SPRINTS_COLLECTION, sprintId, 'sprintdetails', 'info');
        return onSnapshot(detailsRef, async (detailsSnap) => {
            if (!detailsSnap.exists()) {
                // Try parent fallback if it is not migrated yet
                const parentSnap = await getDoc(doc(db, SPRINTS_COLLECTION, sprintId));
                if (!parentSnap.exists()) {
                    callback(null);
                    return;
                }
                const parentData = sanitizeData(parentSnap.data()) as Sprint;
                callback(await sprintService.resolveSprintDays(parentData));
                return;
            }
            let sprintData = { id: sprintId, ...cleanDetailsData(detailsSnap.data()) } as Sprint;
            const fullSprint = await sprintService.resolveSprintDays(sprintData);
            callback(fullSprint);
        });
    },

    getCoachSprints: async (coachId: string) => {
        const q = query(collectionGroup(db, 'sprintdetails'));
        const snap = await getDocs(q);
        const raw = snap.docs
            .map(d => {
                const data = sanitizeData(d.data()) as Sprint;
                data.id = d.ref.parent.parent!.id;
                return data;
            })
            .filter(s => s.coachId === coachId && s.deleted !== true);
        return await sprintService.resolveSprintsList(raw);
    },

    getAdminCoachSprints: async () => {
        const q = query(collectionGroup(db, 'sprintdetails'));
        const snap = await getDocs(q);
        const allSprints = snap.docs
            .map(d => {
                const data = sanitizeData(d.data()) as Sprint;
                data.id = d.ref.parent.parent!.id;
                return data;
            })
            .filter(s => s.deleted !== true);
        const resolved = await sprintService.resolveSprintsList(allSprints);
        return resolved.filter(s => 
            s.sprintType === 'Foundational' || 
            s.sprintType === 'Fundamentals' || 
            s.sprintType === 'Core' || 
            s.sprintType === 'Expert' || 
            s.category === 'Core Platform Sprint' || 
            s.category === 'Growth Fundamentals'
        );
    },

    subscribeToCoachSprints: (coachId: string, callback: (sprints: Sprint[]) => void) => {
        const q = query(collectionGroup(db, 'sprintdetails'));
        return onSnapshot(q, async (snap) => {
            const raw = snap.docs
                .map(d => {
                    const data = sanitizeData(d.data()) as Sprint;
                    data.id = d.ref.parent.parent!.id;
                    return data;
                })
                .filter(s => s.coachId === coachId && s.deleted !== true);
            const resolved = await sprintService.resolveSprintsList(raw);
            callback(resolved);
        });
    },

    getAdminSprints: async () => {
        const q = query(collectionGroup(db, 'sprintdetails'));
        const snap = await getDocs(q);
        const raw = snap.docs
            .map(d => {
                const data = sanitizeData(d.data()) as Sprint;
                data.id = d.ref.parent.parent!.id;
                return data;
            })
            .filter(s => s.deleted !== true);
        return await sprintService.resolveSprintsList(raw);
    },

    subscribeToAdminSprints: (callback: (sprints: Sprint[]) => void, onError?: (error: any) => void) => {
        const q = query(collectionGroup(db, 'sprintdetails'));
        return onSnapshot(q, async (snap) => {
            const raw = snap.docs
                .map(d => {
                    const data = sanitizeData(d.data()) as Sprint;
                    data.id = d.ref.parent.parent!.id;
                    return data;
                })
                .filter(s => s.deleted !== true);
            const resolved = await sprintService.resolveSprintsList(raw);
            callback(resolved);
        }, (error) => {
            if (onError) onError(error);
        });
    },

    subscribeToAllSprints: (callback: (sprints: Sprint[]) => void, onError?: (error: any) => void) => {
        const q = query(collectionGroup(db, 'sprintdetails'));
        return onSnapshot(q, async (snap) => {
            const raw = snap.docs.map(d => {
                const data = sanitizeData(d.data()) as Sprint;
                data.id = d.ref.parent.parent!.id;
                return data;
            });
            const resolved = await sprintService.resolveSprintsList(raw);
            callback(resolved);
        }, (error) => {
            if (onError) onError(error);
        });
    },

    getPublishedSprints: async () => {
        const q = query(collectionGroup(db, 'sprintdetails'));
        const snap = await getDocs(q);
        const raw = snap.docs
            .map(d => {
                const data = sanitizeData(d.data()) as Sprint;
                data.id = d.ref.parent.parent!.id;
                return data;
            })
            .filter(s => s.published === true && s.deleted !== true);
        return await sprintService.resolveSprintsList(raw);
    },

    subscribeToPublishedSprints: (callback: (sprints: Sprint[]) => void, onError?: (error: any) => void) => {
        const q = query(collectionGroup(db, 'sprintdetails'));
        return onSnapshot(q, async (snap) => {
            const raw = snap.docs
                .map(d => {
                    const data = sanitizeData(d.data()) as Sprint;
                    data.id = d.ref.parent.parent!.id;
                    return data;
                })
                .filter(s => s.published === true && s.deleted !== true);
            const resolved = await sprintService.resolveSprintsList(raw);
            callback(resolved);
        }, (error) => {
            if (onError) onError(error);
        });
    },

    resolveSprintDays: async (sprint: Sprint): Promise<Sprint> => {
        if (!sprint || !sprint.id) return sprint;
        try {
            const daysSnap = await getDocs(collection(db, SPRINTS_COLLECTION, sprint.id, 'days'));
            const loadedDays: Record<number, any> = {};
            if (!daysSnap.empty) {
                daysSnap.forEach(dDoc => {
                    const data = dDoc.data();
                    const dayNum = parseInt(dDoc.id.replace('day ', ''));
                    if (!isNaN(dayNum)) {
                        loadedDays[dayNum] = data;
                    }
                });
            }
            
            const hasDailyField = 'dailyContent' in sprint;

            if (Object.keys(loadedDays).length > 0) {
                const dailyContent = [];
                const maxDay = Math.max(...Object.keys(loadedDays).map(Number));
                for (let d = 1; d <= maxDay; d++) {
                    if (loadedDays[d]) {
                        dailyContent.push({ day: d, ...loadedDays[d] });
                    }
                }
                sprint.dailyContent = dailyContent;
                
                // If parent doc contains dailyContent, clean it up immediately in Firestore
                if (hasDailyField) {
                    try {
                        const parentRef = doc(db, SPRINTS_COLLECTION, sprint.id);
                        await updateDoc(parentRef, { dailyContent: deleteField() }).catch(() => {});
                        
                        const detailsRef = doc(db, SPRINTS_COLLECTION, sprint.id, 'sprintdetails', 'info');
                        await updateDoc(detailsRef, { dailyContent: deleteField() }).catch(() => {});
                    } catch (e) {}
                }
            } else if (sprint.dailyContent && sprint.dailyContent.length > 0) {
                // Auto-migrate old format sprint to new subcollections in the background
                console.log(`[Migration] Auto-migrating sprint ${sprint.id} to new subcollection structure in Firestore...`);
                await sprintService._writeSubcollections(sprint.id, sprint);
                
                // Clean from parent and sprintdetails
                try {
                    const parentRef = doc(db, SPRINTS_COLLECTION, sprint.id);
                    await updateDoc(parentRef, { dailyContent: deleteField() }).catch(() => {});
                    
                    const detailsRef = doc(db, SPRINTS_COLLECTION, sprint.id, 'sprintdetails', 'info');
                    await updateDoc(detailsRef, { dailyContent: deleteField() }).catch(() => {});
                } catch (e) {}
            }
        } catch (err) {
            console.error("Error resolving sprint subcollection days:", err);
        }
        return deserializeSprint(sprint);
    },

    resolveSprintsList: async (sprints: Sprint[]): Promise<Sprint[]> => {
        return await Promise.all(sprints.map(async (s) => {
            let sprintData = { ...s };
            try {
                const detailsSnap = await getDoc(doc(db, SPRINTS_COLLECTION, s.id, 'sprintdetails', 'info'));
                if (detailsSnap.exists()) {
                    sprintData = { ...sprintData, ...cleanDetailsData(detailsSnap.data()) };
                }
            } catch (e) {}
            return await sprintService.resolveSprintDays(sprintData);
        }));
    },

    _writeSubcollections: async (sprintId: string, sprintData: any) => {
        try {
            const serializedSprint = serializeSprint(sprintData);
            const { 
                dailyContent, 
                ...metadata 
            } = serializedSprint;
            const detailsData = sanitizeData({ ...metadata, updatedAt: new Date().toISOString() });
            
            // Clean up dailyContent from detailsData
            delete (detailsData as any).dailyContent;
            
            await setDoc(doc(db, SPRINTS_COLLECTION, sprintId, 'sprintdetails', 'info'), detailsData);
            
            // Ensure any direct obsolete day documents (sprints/{sprintId}/day X) are deleted
            for (let d = 1; d <= 30; d++) {
                try {
                    const obsoleteDayRef = doc(db, SPRINTS_COLLECTION, sprintId, `day ${d}`);
                    await deleteDoc(obsoleteDayRef);
                } catch (err) {}
            }
            
            // Ensure the parent is completely empty as requested
            const parentRef = doc(db, SPRINTS_COLLECTION, sprintId);
            await setDoc(parentRef, {});
            
            const detailsRef = doc(db, SPRINTS_COLLECTION, sprintId, 'sprintdetails', 'info');
            await updateDoc(detailsRef, { dailyContent: deleteField() }).catch(() => {});

            if (Array.isArray(dailyContent)) {
                // Get all existing day documents to check for deletions (keeps the subcollection synchronized)
                const daysSnap = await getDocs(collection(db, SPRINTS_COLLECTION, sprintId, 'days'));
                const newDayNums = new Set(dailyContent.map(d => d.day));
                for (const dDoc of daysSnap.docs) {
                    const dayNum = parseInt(dDoc.id.replace('day ', ''));
                    if (!isNaN(dayNum) && !newDayNums.has(dayNum)) {
                        await deleteDoc(dDoc.ref);
                    }
                }

                for (const day of dailyContent) {
                    if (!day || typeof day.day === 'undefined') continue;
                    const dayNum = day.day;
                    const dayData = sanitizeData(day);
                    const daysSubDocRef = doc(db, SPRINTS_COLLECTION, sprintId, 'days', `day ${dayNum}`);
                    await setDoc(daysSubDocRef, dayData);
                }
            }
        } catch (err) {
            console.error("Error writing subcollections:", err);
        }
    },

    subscribeToReviewsForSprints: (sprintIds: string[], callback: (reviews: Review[]) => void) => {
        if (!sprintIds.length) {
            callback([]);
            return () => {};
        }
        const q = query(collectionGroup(db, 'reviews'), where("sprintId", "in", sprintIds.slice(0, 10)));
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
            referral?: string | null,
            firstActionInput?: string
        }
    ) => {
        const enrollmentId = `enrollment_${userId}_${sprintId}`;
        const enrollmentRef = doc(db, 'users', userId, 'enrollments', enrollmentId);
        const existing = await getDoc(enrollmentRef);
        
        if (existing.exists()) return sanitizeData(existing.data()) as ParticipantSprint;

        // Check for active enrollments to determine if this should be queued
        const activeQuery = query(
            collection(db, 'users', userId, 'enrollments'), 
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
            soundDisabled: false,
            notificationsDisabled: false,
            progress: Array.from({ length: duration }, (_, i) => ({
                day: i + 1,
                completed: false,
                answers: (i === 0 && commercial?.firstActionInput) ? [commercial.firstActionInput] : [],
                submission: (i === 0 && commercial?.firstActionInput) ? commercial.firstActionInput : ""
            }))
        };

        await setDoc(enrollmentRef, sanitizeData(newEnrollment));
        
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
        const results: ParticipantSprint[] = [];
        try {
            const usersSnap = await getDocs(collection(db, 'users'));
            const userDocs = usersSnap.docs;
            
            await Promise.all(userDocs.map(async (userDoc) => {
                const userId = userDoc.id;
                
                // Fetch from users/{userId}/enrollments
                const enrollmentsRef = collection(db, 'users', userId, 'enrollments');
                const enrollmentsSnap = await getDocs(enrollmentsRef);
                enrollmentsSnap.forEach(doc => {
                    const data = sanitizeData(doc.data()) as ParticipantSprint;
                    if (sprintIds.includes(data.sprint_id)) {
                        results.push({ ...data, id: doc.id });
                    }
                });
                
                // Fallback: Fetch from users/{userId}/enrollment
                const enrollmentRef = collection(db, 'users', userId, 'enrollment');
                const enrollmentSnap = await getDocs(enrollmentRef);
                enrollmentSnap.forEach(doc => {
                    const data = sanitizeData(doc.data()) as ParticipantSprint;
                    if (sprintIds.includes(data.sprint_id) && !results.some(r => r.id === doc.id)) {
                        results.push({ ...data, id: doc.id });
                    }
                });
            }));
        } catch (e) {
            console.error("Failed to fetch enrollments from individual user paths:", e);
        }
        return results;
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
        const q = query(collectionGroup(db, 'enrollments'));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint));
    },

    subscribeToAllEnrollments: (callback: (enrollments: ParticipantSprint[]) => void) => {
        const q = query(collectionGroup(db, 'enrollments'));
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as ParticipantSprint)));
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
        const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
        const detailsRef = doc(db, SPRINTS_COLLECTION, sprintId, 'sprintdetails', 'info');
        
        try {
            // Fetch existing details from subcollection OR parent doc as fallback
            let existingDetails = {};
            const detailsSnap = await getDoc(detailsRef);
            if (detailsSnap.exists()) {
                existingDetails = sanitizeData(detailsSnap.data());
            } else {
                const parentSnap = await getDoc(sprintRef);
                if (parentSnap.exists()) {
                    existingDetails = sanitizeData(parentSnap.data());
                }
            }
            
            // Construct the merged data to write back to subcollections
            const mergedSub = { ...existingDetails, ...data, updatedAt: new Date().toISOString() };
            
            await sprintService._writeSubcollections(sprintId, mergedSub);

            // Ensure the parent doc is completely empty to satisfies single subcollection source of truth ONLY after successful subcollections sync
            await setDoc(sprintRef, {});
        } catch (e) {
            console.error("Failed to sync subcollections in updateSprint", e);
        }
    },

    deleteSprint: async (sprintId: string) => {
        // Mark sprint as deleted inside the subcollection info, parent doc remains completely empty
        const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
        await setDoc(sprintRef, {});

        try {
            const detailsRef = doc(db, SPRINTS_COLLECTION, sprintId, 'sprintdetails', 'info');
            const detailsSnap = await getDoc(detailsRef);
            if (detailsSnap.exists()) {
                const details = sanitizeData(detailsSnap.data());
                details.deleted = true;
                details.published = false;
                details.updatedAt = new Date().toISOString();
                await setDoc(detailsRef, details);
            }
        } catch (err) {
            console.error("[SprintService] Failed to mark subcollection as deleted:", err);
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
        const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
        const detailsRef = doc(db, SPRINTS_COLLECTION, sprintId, 'sprintdetails', 'info');

        try {
            let existingDetails = {};
            const detailsSnap = await getDoc(detailsRef);
            if (detailsSnap.exists()) {
                existingDetails = sanitizeData(detailsSnap.data());
            } else {
                const parentSnap = await getDoc(sprintRef);
                if (parentSnap.exists()) {
                    existingDetails = sanitizeData(parentSnap.data());
                }
            }

            const finalData = { ...existingDetails, ...(data || {}), approvalStatus: 'approved', published: true, updatedAt: new Date().toISOString() };
            if ((finalData as any).pendingChanges) {
                delete (finalData as any).pendingChanges;
            }

            await sprintService._writeSubcollections(sprintId, finalData);

            // Entirely clear parent document fields ONLY after writing subcollections successfully
            await setDoc(sprintRef, {});
        } catch (e) {
            console.error("Failed to sync subcollections in approveSprint", e);
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
                where('refereeId', '==', userId),
                where('status', '==', 'joined')
            );
            const snap = await getDocs(q);
            if (snap.empty) return;

            const { runTransaction } = await import('firebase/firestore');
            for (const referralDoc of snap.docs) {
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
            log("Starting system-wide legacy sprint document migration...");
            const sprintsSnap = await getDocs(collection(db, SPRINTS_COLLECTION));
            
            report.sprintsScanned = sprintsSnap.size;
            log(`Found ${sprintsSnap.size} sprints in the database.`);

            for (const sprintDoc of sprintsSnap.docs) {
                const sprintId = sprintDoc.id;
                log(`Scanning sprint: ${sprintId}...`);

                // 1. Fetch parent document
                let parentData = sanitizeData(sprintDoc.data());
                
                // 2. Fetch details/info document
                let detailsData: any = null;
                const detailsRef = doc(db, SPRINTS_COLLECTION, sprintId, 'sprintdetails', 'info');
                const detailsTypoRef = doc(db, SPRINTS_COLLECTION, sprintId, 'sprintdetials', 'info');
                
                try {
                    const snap = await getDoc(detailsRef);
                    if (snap.exists()) {
                        detailsData = sanitizeData(snap.data());
                    }
                } catch (e) {
                    log(`Warning loading details info for ${sprintId}: ${e}`);
                }

                try {
                    const typoSnap = await getDoc(detailsTypoRef);
                    if (typoSnap.exists() && !detailsData) {
                        detailsData = sanitizeData(typoSnap.data());
                        log(`Found legacy data under sprintdetials typo path for ${sprintId}.`);
                    }
                } catch (e) {}

                // Merge metadata to see what we have
                const combinedMetadata = { ...parentData, ...detailsData };
                
                // 3. Resolve existing days in the 'days' subcollection
                const daysSnap = await getDocs(collection(db, SPRINTS_COLLECTION, sprintId, 'days'));
                const hasDaysSubcollection = !daysSnap.empty;

                let dailyContentToSave = combinedMetadata.dailyContent || null;

                // If days subcollection is empty but we have dailyContent, save it to 'days'
                if (!hasDaysSubcollection && dailyContentToSave && dailyContentToSave.length > 0) {
                    log(`Sprint ${sprintId} has dailyContent but empty 'days' subcollection. Migrating content...`);
                    
                    const mergedForSub = { ...combinedMetadata, dailyContent: dailyContentToSave };
                    await sprintService._writeSubcollections(sprintId, mergedForSub);
                    
                    report.sprintsMigratedToSubcollection++;
                    log(`Successfully migrated ${dailyContentToSave.length} days of content to 'sprints/${sprintId}/days'.`);
                } else if (hasDaysSubcollection) {
                    log(`Sprint ${sprintId} already has a 'days' subcollection of size ${daysSnap.size}.`);
                }

                // 4. CLEAN UP Parent document 'sprints/{sprintId}'
                const fieldsToDelete: Record<string, any> = {
                    dailyContent: deleteField(),
                    attachments: deleteField(),
                    lessonAttachments: deleteField(),
                    taskAttachments: deleteField(),
                    dailyContentAttachments: deleteField()
                };

                try {
                    // Entirely clear the parent doc, converting it to an empty object
                    const parentRef = doc(db, SPRINTS_COLLECTION, sprintId);
                    await setDoc(parentRef, {});
                    report.parentFieldsCleaned++;
                    log(`Successfully cleared all fields from parent document sprints/${sprintId}, converting it to an empty placeholder.`);
                } catch (e: any) {
                    log(`Error cleaning parent doc for ${sprintId}: ${e.message}`);
                    report.errors.push(`ParentDoc ${sprintId}: ${e.message}`);
                }

                // 5. CLEAN UP 'sprints/{sprintId}/sprintdetails/info' and 'sprintdetials/info'
                try {
                    let detailsChanged = false;
                    if (detailsData) {
                        for (const key of Object.keys(fieldsToDelete)) {
                            if (key in detailsData) {
                                detailsChanged = true;
                            }
                        }
                    }

                    // Always execute update with deleteField on actual target subdocs to guarantee cleanup
                    const detailsSnapObj = await getDoc(detailsRef);
                    if (detailsSnapObj.exists()) {
                        await updateDoc(detailsRef, fieldsToDelete);
                        if (detailsChanged) report.detailsFieldsCleaned++;
                    }

                    // Run on typo collection too
                    const typoSnapObj = await getDoc(detailsTypoRef);
                    if (typoSnapObj.exists()) {
                        await updateDoc(detailsTypoRef, fieldsToDelete);
                        log(`Cleaned legacy fields from legacy typo path 'sprintdetials/info' for ${sprintId}.`);
                    }
                } catch (e: any) {
                    log(`Error cleaning details info doc for ${sprintId}: ${e.message}`);
                    report.errors.push(`DetailsDoc ${sprintId}: ${e.message}`);
                }

                // 6. Delete legacy subcollections / documents (e.g. 'day 1', 'day 2', ..., 'day 40')
                log(`Scanning for legacy 'day X' subcollections under sprints/${sprintId}...`);
                for (let d = 1; d <= 40; d++) {
                    const legacyDayColName = `day ${d}`;
                    try {
                        const legacyDayColRef = collection(db, SPRINTS_COLLECTION, sprintId, legacyDayColName);
                        const legacyDaySnap = await getDocs(legacyDayColRef);
                        
                        if (!legacyDaySnap.empty) {
                            log(`Found legacy document(s) in collection 'sprints/${sprintId}/${legacyDayColName}'. Deleting...`);
                            for (const docInSub of legacyDaySnap.docs) {
                                await deleteDoc(docInSub.ref);
                                report.legacyDocsDeleted++;
                            }
                        }
                    } catch (e: any) {
                        log(`Error scanning/deleting legacy subcollection ${legacyDayColName} for ${sprintId}: ${e.message}`);
                    }
                }
            }

            log("Migration complete!");
            return report;
        } catch (e: any) {
            log(`Fatal error during migration: ${e.message}`);
            report.errors.push(e.message);
            return report;
        }
    }
};
