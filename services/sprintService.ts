
import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, deleteDoc, onSnapshot, addDoc, deleteField } from 'firebase/firestore';
import { ParticipantSprint, Sprint, Review, CoachingComment, UserEvent } from '../types';
import { userService, sanitizeData } from './userService';
import { notificationService } from './notificationService';
import { isRegistryIncomplete } from '../utils/sprintUtils';

const SPRINTS_COLLECTION = 'sprints';
const ENROLLMENTS_COLLECTION = 'enrollments';
const REVIEWS_COLLECTION = 'reviews';

export const sprintService = {
    createSprint: async (sprint: Sprint) => {
        try {
            const now = new Date().toISOString();
            const newSprint = sanitizeData({
                ...sprint,
                createdAt: sprint.createdAt || now,
                updatedAt: now
            });
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprint.id);
            await setDoc(sprintRef, newSprint);
            return newSprint;
        } catch (error) {
            console.error("Error creating sprint in Firestore:", error);
            throw error;
        }
    },

    updateSprint: async (sprintId: string, data: Partial<Sprint>) => {
        try {
            const now = new Date().toISOString();
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
            const sprintSnap = await getDoc(sprintRef);
            
            if (!sprintSnap.exists()) throw new Error("Sprint not found");
            const existing = sprintSnap.data() as Sprint;

            // APPROVAL WORKFLOW LOGIC:
            // If the sprint is already approved/live, any new change must go to 'pendingChanges'
            // to be reviewed by an Admin before hitting the live root level.
            if (existing.approvalStatus === 'approved') {
                const updateData = sanitizeData({
                    pendingChanges: {
                        ...data,
                        updatedAt: now
                    },
                    updatedAt: now
                });
                await updateDoc(sprintRef, updateData);
            } else {
                // If it's still a draft or rejected, we update the root directly
                const updateData = sanitizeData({
                    ...data,
                    updatedAt: now
                });
                await updateDoc(sprintRef, updateData);
            }
        } catch (error) {
            console.error("Error updating sprint in Firestore:", error);
            throw error;
        }
    },

    approveSprint: async (sprintId: string) => {
        try {
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
            await updateDoc(sprintRef, {
                approvalStatus: 'approved',
                published: true,
                updatedAt: new Date().toISOString(),
                pendingChanges: deleteField() // Ensure no leftover staging on first approval
            });
        } catch (error) {
            console.error("Error approving sprint:", error);
            throw error;
        }
    },

    /**
     * Merges staged 'pendingChanges' into the live root version of the sprint.
     */
    approveSprintUpdates: async (sprintId: string) => {
        try {
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
            const sprintSnap = await getDoc(sprintRef);
            if (!sprintSnap.exists()) return;
            
            const sprint = sprintSnap.data() as Sprint;
            if (!sprint.pendingChanges) return;

            const mergedData = sanitizeData({
                ...sprint,
                ...sprint.pendingChanges,
                pendingChanges: deleteField(), // Clear the staging area
                updatedAt: new Date().toISOString()
            });

            await updateDoc(sprintRef, mergedData);
        } catch (error) {
            console.error("Error approving sprint updates:", error);
            throw error;
        }
    },

    rejectSprint: async (sprintId: string) => {
        try {
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
            await updateDoc(sprintRef, {
                approvalStatus: 'rejected',
                published: false,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error rejecting sprint:", error);
            throw error;
        }
    },

    deleteSprint: async (sprintId: string) => {
        try {
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
            await deleteDoc(sprintRef);
        } catch (error) {
            console.error("Error deleting sprint from Firestore:", error);
            throw error;
        }
    },

    getPublishedSprints: async () => {
        try {
            const q = query(
                collection(db, SPRINTS_COLLECTION), 
                where("approvalStatus", "==", "approved")
            );
            const querySnapshot = await getDocs(q);
            
            const dbSprints: Sprint[] = [];
            querySnapshot.forEach((doc) => {
                dbSprints.push(sanitizeData(doc.data()) as Sprint);
            });

            return dbSprints;
        } catch (error) {
            console.error("Error fetching published sprints:", error);
            return [];
        }
    },

    getCoachSprints: async (coachId: string) => {
        try {
            const q = query(
                collection(db, SPRINTS_COLLECTION), 
                where("coachId", "==", coachId)
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
            console.error("Error fetching coach sprints:", error);
            return [];
        }
    },

    getAdminSprints: async () => {
        try {
            const q = query(collection(db, SPRINTS_COLLECTION));
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
            console.error("Error fetching admin sprints:", error);
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
            console.error("Error fetching sprint by ID:", error);
            return null;
        }
    },

    getSprintParticipantAnalytics: async (sprintId: string) => {
        try {
            const now = new Date().getTime();
            const sprintRef = doc(db, SPRINTS_COLLECTION, sprintId);
            const sprintSnap = await getDoc(sprintRef);
            if (!sprintSnap.exists()) return [];
            const sprint = sprintSnap.data() as Sprint;

            const enrollQ = query(collection(db, ENROLLMENTS_COLLECTION), where("sprintId", "==", sprintId));
            const enrollSnap = await getDocs(enrollQ);
            const enrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as ParticipantSprint));

            const msgQ = query(collection(db, 'coaching_messages'), where("sprintId", "==", sprintId));
            const msgSnap = await getDocs(msgQ);
            const messages = msgSnap.docs.map(d => d.data() as CoachingComment);

            const eventQ = query(collection(db, 'user_events'), where("sprintId", "==", sprintId));
            const eventSnap = await getDocs(eventQ);
            const events = eventSnap.docs.map(d => d.data() as UserEvent);

            const analysis = await Promise.all(enrollments.map(async (enroll) => {
                const userEvents = events.filter(ev => ev.userId === enroll.participantId);
                const userMessages = messages.filter(m => m.participantId === enroll.participantId);
                const sortedEvents = [...userEvents].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const lastActivity = sortedEvents[0];
                const lastActivityTime = lastActivity ? new Date(lastActivity.timestamp).getTime() : new Date(enroll.startDate).getTime();
                const diffHrs = (now - lastActivityTime) / (1000 * 3600);
                const diffDays = Math.floor(diffHrs / 24);

                const sortedMsgs = [...userMessages].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const latestMsg = sortedMsgs[0];
                const isWaitingForCoach = latestMsg && latestMsg.authorId === enroll.participantId && !latestMsg.read && ((now - new Date(latestMsg.timestamp).getTime()) / (1000 * 3600) >= 24);

                const isCompleted = enroll.progress.every(p => p.completed);

                if (!isCompleted && diffDays > 0) {
                    await notificationService.triggerDropOffNudge(enroll, sprint, diffDays);
                }

                let segment: 'active' | 'drop1' | 'drop2' | 'completed' = 'active';
                if (isCompleted) segment = 'completed';
                else if (diffHrs > 48) segment = 'drop2';
                else if (diffHrs > 24) segment = 'drop1';

                return {
                    enroll,
                    lastActivity: lastActivity?.timestamp || enroll.startDate,
                    segment,
                    isWaitingForCoach,
                    latestMessageTime: latestMsg?.timestamp
                };
            }));
            
            return analysis;
        } catch (error) {
            console.error("Analysis Error:", error);
            return [];
        }
    },

    enrollUser: async (userId: string, sprintId: string, duration: number) => {
        try {
            const enrollmentId = `enrollment_${userId}_${sprintId}`;
            const enrollmentRef = doc(db, ENROLLMENTS_COLLECTION, enrollmentId);
            
            const existing = await getDoc(enrollmentRef);
            if (existing.exists()) {
                return sanitizeData(existing.data()) as ParticipantSprint;
            }

            const newEnrollment: ParticipantSprint = {
                id: enrollmentId,
                sprintId: sprintId,
                participantId: userId,
                startDate: new Date().toISOString(),
                sentNudges: [],
                progress: Array.from({ length: duration }, (_, i) => ({
                    day: i + 1,
                    completed: false
                }))
            };

            await setDoc(enrollmentRef, sanitizeData(newEnrollment));
            await userService.addUserEnrollment(userId, sprintId);
            return newEnrollment;
        } catch (error) {
            console.error("Error enrolling user:", error);
            throw error;
        }
    },

    getUserEnrollments: async (userId: string) => {
        try {
            const q = query(collection(db, ENROLLMENTS_COLLECTION), where("participantId", "==", userId));
            const querySnapshot = await getDocs(q);
            
            const dbEnrollments: ParticipantSprint[] = [];
            querySnapshot.forEach((doc) => {
                dbEnrollments.push(sanitizeData(doc.data()) as ParticipantSprint);
            });

            const uniqueEnrollmentsMap = new Map<string, ParticipantSprint>();
            dbEnrollments.forEach(e => {
                const existing = uniqueEnrollmentsMap.get(e.sprintId);
                if (!existing || e.id === `enrollment_${userId}_${e.sprintId}`) {
                    uniqueEnrollmentsMap.set(e.sprintId, e);
                }
            });

            return Array.from(uniqueEnrollmentsMap.values());
        } catch (error) {
            console.error("Error fetching user enrollments:", error);
            return [];
        }
    },

    subscribeToUserEnrollments: (userId: string, callback: (enrollments: ParticipantSprint[]) => void) => {
        const q = query(collection(db, ENROLLMENTS_COLLECTION), where("participantId", "==", userId));
        
        return onSnapshot(q, (snapshot) => {
            const dbEnrollments: ParticipantSprint[] = [];
            snapshot.forEach((doc) => {
                dbEnrollments.push(sanitizeData(doc.data()) as ParticipantSprint);
            });

            const uniqueEnrollmentsMap = new Map<string, ParticipantSprint>();
            dbEnrollments.forEach(e => uniqueEnrollmentsMap.set(e.sprintId, e));

            callback(Array.from(uniqueEnrollmentsMap.values()));
        }, (error) => {
            console.error("User enrollments sync error:", error);
            callback([]);
        });
    },

    getEnrollmentsForSprints: async (sprintIds: string[]) => {
        const validIds = Array.from(new Set((sprintIds || []).filter(id => !!id && typeof id === 'string' && id !== '')));
        if (validIds.length === 0) return [];

        const CHUNK_SIZE = 25;
        const chunks: string[][] = [];
        for (let i = 0; i < validIds.length; i += CHUNK_SIZE) {
            chunks.push(validIds.slice(i, i + CHUNK_SIZE));
        }

        try {
            const results: ParticipantSprint[] = [];
            const promises = chunks.map(chunk => {
                const q = query(collection(db, ENROLLMENTS_COLLECTION), where("sprintId", "in", chunk));
                return getDocs(q);
            });

            const snapshots = await Promise.all(promises);
            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    results.push(sanitizeData(doc.data()) as ParticipantSprint);
                });
            });
            
            const map = new Map<string, ParticipantSprint>();
            results.forEach(e => {
                const key = `${e.participantId}_${e.sprintId}`;
                if (!map.has(key)) map.set(key, e);
            });

            return Array.from(map.values());
        } catch (error) {
            console.error("Error fetching enrollments for sprints:", error);
            return [];
        }
    },

    getEnrollmentById: async (enrollmentId: string) => {
        try {
            const docRef = doc(db, ENROLLMENTS_COLLECTION, enrollmentId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) return sanitizeData(docSnap.data()) as ParticipantSprint;
            return null;
        } catch (error) {
            return null;
        }
    },

    subscribeToEnrollment: (enrollmentId: string, callback: (data: ParticipantSprint | null) => void) => {
        const docRef = doc(db, ENROLLMENTS_COLLECTION, enrollmentId);
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                callback(sanitizeData(doc.data()) as ParticipantSprint);
            } else {
                callback(null);
            }
        }, (err) => {
            console.error("Enrollment sub error:", err);
            callback(null);
        });
    },

    updateProgress: async (enrollmentId: string, progress: ParticipantSprint['progress']) => {
        try {
            const sanitizedProgress = sanitizeData(progress);
            const enrollmentRef = doc(db, ENROLLMENTS_COLLECTION, enrollmentId);
            await updateDoc(enrollmentRef, { progress: sanitizedProgress });
        } catch (error) {
            console.error("Error updating enrollment progress:", error);
        }
    },

    submitReview: async (review: Omit<Review, 'id'>) => {
        try {
            const reviewsRef = collection(db, REVIEWS_COLLECTION);
            const docRef = await addDoc(reviewsRef, sanitizeData(review));
            return { id: docRef.id, ...review } as Review;
        } catch (error) {
            console.error("Error submitting review:", error);
            throw error;
        }
    },

    subscribeToReviewsForSprints: (sprintIds: string[], callback: (reviews: Review[]) => void) => {
        const validIds = Array.from(new Set((sprintIds || []).filter(id => !!id && typeof id === 'string' && id.trim() !== '')));
        
        if (validIds.length === 0) {
            callback([]);
            return () => {};
        }

        const limitedIds = validIds.slice(0, 30);
        const q = query(collection(db, REVIEWS_COLLECTION), where("sprintId", "in", limitedIds));

        return onSnapshot(q, (snapshot) => {
            const dbReviews: Review[] = [];
            snapshot.forEach((doc) => {
                dbReviews.push(sanitizeData({ id: doc.id, ...doc.data() }) as Review);
            });

            const uniqueReviews = Array.from(new Map(dbReviews.map(r => [r.id, r])).values());
            const sorted = uniqueReviews.sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            callback(sorted);
        }, (err) => {
            console.warn("Reviews sync error:", err);
            callback([]);
        });
    }
};
