
import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, limit, orderBy } from 'firebase/firestore';
import { ParticipantSprint, Sprint } from '../types';
import { MOCK_SPRINTS, MOCK_PARTICIPANT_SPRINTS } from './mockData';
import { userService } from './userService';

export const sprintService = {
    /**
     * Get all sprints from the database.
     * Sprints are ordered by their creation date in descending order.
     * It simulates a delay to show a loading state.
     * @returns {Promise<Sprint[]>} A promise that resolves to an array of sprints.
     */
    getSprints: async (): Promise<Sprint[]> => {
        try {
            const q = query(collection(db, 'sprints')); // Removed orderBy for now
            const querySnapshot = await getDocs(q);
            const sprints = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sprint));
            
            // Perform client-side sorting
            sprints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // DEV ONLY: Simulate delay
            await new Promise(resolve => setTimeout(resolve, 500));

            return sprints;
        } catch (error) {
            console.error("Error fetching sprints:", error);
            // Fallback to mock data on error
            return MOCK_SPRINTS;
        }
    },

    /**
     * Creates a new sprint in the database.
     * @param sprintData - The data for the new sprint.
     * @returns The ID of the newly created sprint.
     */
    createSprint: async (sprintData: Omit<Sprint, 'id' | 'createdAt'>): Promise<string> => {
        try {
            const sprintId = `sprint_${Date.now()}`;
            const sprintRef = doc(db, 'sprints', sprintId);

            // Inject the generated sprintId into the dailyContent actions
            const updatedDailyContent = sprintData.dailyContent.map((content) => ({
                ...content,
                action: {
                    ...content.action,
                    id: `action_${sprintId}_${content.day}`,
                    sprintId: sprintId,
                }
            }));

            const newSprint: Sprint = {
                ...sprintData,
                id: sprintId,
                createdAt: new Date().toISOString(),
                dailyContent: updatedDailyContent,
            };

            await setDoc(sprintRef, newSprint);
            return sprintId;
        } catch (error) {
            console.error("Error creating sprint:", error);
            throw new Error('Failed to create sprint in database.');
        }
    },
    
    /**
     * Checks if a user is already enrolled in a specific sprint.
     */
    isUserEnrolled: async (userId: string, sprintId: string): Promise<boolean> => {
        try {
            const q = query(collection(db, 'enrollments'), where("participantId", "==", userId), where("sprintId", "==", sprintId));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            console.error("Error checking enrollment:", error);
            return false;
        }
    },
    
    /**
     * Fetches a single enrollment document for a user in a specific sprint.
     */
    getEnrollmentByUserAndSprint: async (userId: string, sprintId: string): Promise<ParticipantSprint | null> => {
        try {
            const q = query(
                collection(db, 'enrollments'), 
                where("participantId", "==", userId), 
                where("sprintId", "==", sprintId),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data() as ParticipantSprint;
            }
            
            // Fallback to mock search
            return MOCK_PARTICIPANT_SPRINTS.find(e => e.participantId === userId && e.sprintId === sprintId) || null;

        } catch (error) {
            console.warn("Error fetching enrollment by user and sprint:", error);
            return MOCK_PARTICIPANT_SPRINTS.find(e => e.participantId === userId && e.sprintId === sprintId) || null;
        }
    },

    /**
     * Enrolls a user in a sprint by creating a document in the 'enrollments' collection.
     */
    enrollUser: async (userId: string, sprintId: string, duration: number) => {
        try {
            const existing = await sprintService.getEnrollmentByUserAndSprint(userId, sprintId);
            if (existing && !existing.id.startsWith('enrollment_fallback')) {
                console.warn(`User ${userId} is already enrolled in sprint ${sprintId}.`);
                return existing;
            }

            const enrollmentId = `enrollment_${userId}_${sprintId}_${Date.now()}`;
            const enrollmentRef = doc(db, 'enrollments', enrollmentId);
            
            const newEnrollment: ParticipantSprint = {
                id: enrollmentId,
                sprintId: sprintId,
                participantId: userId,
                startDate: new Date().toISOString(),
                progress: Array.from({ length: duration }, (_, i) => ({
                    day: i + 1,
                    completed: false
                }))
            };

            await setDoc(enrollmentRef, newEnrollment);
            
            // Also update the User document to track this enrollment
            await userService.addUserEnrollment(userId, sprintId);

            return newEnrollment;
        } catch (error) {
            console.warn("Error enrolling user in DB (falling back to local):", error);
            const fallbackEnrollment: ParticipantSprint = {
                id: `enrollment_fallback_${Date.now()}`,
                sprintId: sprintId,
                participantId: userId,
                startDate: new Date().toISOString(),
                progress: Array.from({ length: duration }, (_, i) => ({
                    day: i + 1,
                    completed: false
                }))
            };
            return fallbackEnrollment;
        }
    },

    /**
     * Fetches all sprint enrollments for a specific user.
     */
    getUserEnrollments: async (userId: string) => {
        try {
            const q = query(collection(db, 'enrollments'), where("participantId", "==", userId));
            const querySnapshot = await getDocs(q);
            
            const dbEnrollments: ParticipantSprint[] = [];
            querySnapshot.forEach((doc) => {
                dbEnrollments.push(doc.data() as ParticipantSprint);
            });

            // Combine with Mock Data that belongs to this user (for hybrid demo state)
            const mockEnrollments = MOCK_PARTICIPANT_SPRINTS.filter(p => p.participantId === userId);
            
            // Deduplicate based on ID, prioritizing DB enrollments
            const allEnrollments = [...dbEnrollments, ...mockEnrollments];
            const uniqueEnrollmentsMap = new Map();
            allEnrollments.forEach(item => {
                // If we already have this sprint enrollment from DB, don't overwrite with mock
                const key = `${item.participantId}_${item.sprintId}`;
                if (!uniqueEnrollmentsMap.has(key) || !item.id.startsWith('enrollment_fallback')) {
                    uniqueEnrollmentsMap.set(key, item);
                }
            });

            return Array.from(uniqueEnrollmentsMap.values());
        } catch (error: any) {
            console.error("Error fetching enrollments:", error);
            return MOCK_PARTICIPANT_SPRINTS.filter(p => p.participantId === userId);
        }
    },

    /**
     * Get a single enrollment by ID.
     */
    getEnrollmentById: async (enrollmentId: string) => {
        try {
            const docRef = doc(db, 'enrollments', enrollmentId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as ParticipantSprint;
            }
            
            // Fallback to mock search
            return MOCK_PARTICIPANT_SPRINTS.find(e => e.id === enrollmentId) || null;
        } catch (error) {
            console.warn("Error fetching enrollment:", error);
            return MOCK_PARTICIPANT_SPRINTS.find(e => e.id === enrollmentId) || null;
        }
    },

    /**
     * Updates the progress of a specific enrollment day.
     */
    updateProgress: async (enrollmentId: string, progress: ParticipantSprint['progress']) => {
        try {
            // Update local mock for immediate UI consistency
            const idx = MOCK_PARTICIPANT_SPRINTS.findIndex(e => e.id === enrollmentId);
            if (idx !== -1) {
                MOCK_PARTICIPANT_SPRINTS[idx].progress = progress;
            }

            // Sanitize progress data to remove undefined values
            const cleanedProgress = progress.map(p => ({
                ...p,
                completedAt: p.completedAt ?? null,
                submission: p.submission ?? null,
                submissionFileUrl: p.submissionFileUrl ?? null,
            }));

            const enrollmentRef = doc(db, 'enrollments', enrollmentId);
            await updateDoc(enrollmentRef, { progress: cleanedProgress });
            console.log("Task submitted to the database successfully");

        } catch (error: any) {
            console.warn("Could not update enrollment in DB:", error?.message || error);
        }
    },

    /**
     * Fetches the number of enrollments for a specific sprint.
     */
    getEnrollmentCountForSprint: async (sprintId: string): Promise<number> => {
        try {
            const q = query(collection(db, 'enrollments'), where('sprintId', '==', sprintId));
            const querySnapshot = await getDocs(q);
            return querySnapshot.size;
        } catch (error) {
            console.error(`Error fetching enrollment count for sprint ${sprintId}:`, error);
            return 0;
        }
    }
};
