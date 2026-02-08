
import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, deleteDoc, onSnapshot, addDoc, deleteField, writeBatch } from 'firebase/firestore';
import { ParticipantSprint, Sprint, Review, CoachingComment, UserEvent, LifecycleSlotAssignment } from '../types';
import { userService, sanitizeData } from './userService';
import { notificationService } from './notificationService';
import { isRegistryIncomplete } from '../utils/sprintUtils';

const SPRINTS_COLLECTION = 'sprints';
const ENROLLMENTS_COLLECTION = 'enrollments';
const REVIEWS_COLLECTION = 'reviews';
const ORCHESTRATION_COLLECTION = 'orchestration';

export interface OrchestrationMapping {
    assignments: Record<string, { sprintId: string; focusCriteria: string[] }>;
}

export const sprintService = {
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

            // If Admin (isDirect) or not yet approved, update directly.
            // Coaches editing approved sprints go to pendingChanges.
            if (isDirect || existing.approvalStatus !== 'approved') {
                const updateData = sanitizeData({
                    ...data,
                    updatedAt: now
                });
                await updateDoc(sprintRef, updateData);
            } else {
                const updateData = sanitizeData({
                    pendingChanges: {
                        ...data,
                        updatedAt: now
                    },
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
            
            // Check provided data for pricing validity
            if (data) {
                const isFoundational = data.category === 'Core Platform Sprint' || data.category === 'Growth Fundamentals';
                const price = Number(data.price || 0);
                const points = Number(data.pointCost || 0);
                if ((isFoundational && points <= 0) || (!isFoundational && price <= 0)) {
                    throw new Error("Financial Constraint: A price must be set before approval.");
                }
            }

            const updateObj: any = {
                approvalStatus: 'approved',
                published: true,
                updatedAt: new Date().toISOString(),
                pendingChanges: deleteField() 
            };

            if (data) {
                const sanitized = sanitizeData(data);
                const fieldsToOverwrite = [
                    'price', 'pointCost', 'pricingType', 'title', 
                    'description', 'transformation', 'category', 
                    'difficulty', 'duration', 'coverImageUrl', 
                    'outcomes', 'forWho', 'notForWho', 'methodSnapshot', 'protocol'
                ];
                fieldsToOverwrite.forEach(field => {
                    if (sanitized[field] !== undefined) {
                        updateObj[field] = sanitized[field];
                    }
                });
            }

            await updateDoc(sprintRef, updateObj);
        } catch (error) {
            console.error("Error approving sprint:", error);
            throw error;
        }
    },

    getAdminSprints: async () => {
        try {
            // Only fetch sprints that are not deleted
            const q = query(collection(db, SPRINTS_COLLECTION), where("deleted", "==", false));
            const querySnapshot = await getDocs(q);
            const dbSprints: Sprint[] = [];
            const invalidApprovedIds: string[] = [];

            querySnapshot.forEach((doc) => {
                const data = sanitizeData(doc.data()) as Sprint;
                
                // VALIDATION RULE: Demote approved sprints with 0 price
                if (data.approvalStatus === 'approved') {
                    const isFoundational = data.category === 'Core Platform Sprint' || data.category === 'Growth Fundamentals';
                    const price = Number(data.price || 0);
                    const points = Number(data.pointCost || 0);
                    
                    if ((isFoundational && points <= 0) || (!isFoundational && price <= 0)) {
                        data.approvalStatus = 'pending_approval';
                        data.published = false;
                        invalidApprovedIds.push(data.id);
                    }
                }

                if (data.approvalStatus === 'pending_approval' && isRegistryIncomplete(data)) {
                    data.approvalStatus = 'draft';
                }
                dbSprints.push(data);
            });

            // Perform batch update for demotions
            if (invalidApprovedIds.length > 0) {
                const batch = writeBatch(db);
                invalidApprovedIds.forEach(id => {
                    batch.update(doc(db, SPRINTS_COLLECTION, id), { 
                        approvalStatus: 'pending_approval', 
                        published: false,
                        updatedAt: new Date().toISOString()
                    });
                });
                await batch.commit();
            }

            return dbSprints;
        } catch (error) {
            console.error("Error fetching admin sprints:", error);
            return [];
        }
    },

    getPublishedSprints: async () => {
        try {
            const q = query(
                collection(db, SPRINTS_COLLECTION), 
                where("approvalStatus", "==", "approved"),
                where("deleted", "==", false)
            );
            const querySnapshot = await getDocs(q);
            const dbSprints: Sprint[] = [];
            querySnapshot.forEach((doc) => {
                const data = sanitizeData(doc.data()) as Sprint;
                // Final safety check for registry
                const isFoundational = data.category === 'Core Platform Sprint' || data.category === 'Growth Fundamentals';
                const p = Number(data.price || 0);
                const pts = Number(data.pointCost || 0);
                if ((isFoundational && pts > 0) || (!isFoundational && p > 0)) {
                    dbSprints.push(data);
                }
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
                const data = sanitizeData(doc.data()) as Sprint;
                if (data.approvalStatus === 'pending_approval' && isRegistryIncomplete(data)) {
                    data.approvalStatus = 'draft';
                }
                dbSprints.push(data);
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

    saveOrchestration: async (assignments: Record<string, { sprintId: string; focusCriteria: string[] }>) => {
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'current_mapping');
        await setDoc(docRef, sanitizeData({ assignments, updatedAt: new Date().toISOString() }));
    },

    getOrchestration: async (): Promise<Record<string, { sprintId: string; focusCriteria: string[] }>> => {
        const docRef = doc(db, ORCHESTRATION_COLLECTION, 'current_mapping');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return snap.data().assignments || {};
        }
        return {};
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
