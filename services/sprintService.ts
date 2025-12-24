
import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, limit } from 'firebase/firestore';
import { ParticipantSprint, Sprint } from '../types';
import { MOCK_SPRINTS, MOCK_PARTICIPANT_SPRINTS } from './mockData';
import { userService } from './userService';

export const sprintService = {
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
            // Fallback for safety, assuming not enrolled if DB check fails
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
            // Fallback to mock search on error
            return MOCK_PARTICIPANT_SPRINTS.find(e => e.participantId === userId && e.sprintId === sprintId) || null;
        }
    },

    /**
     * Enrolls a user in a sprint by creating a document in the 'enrollments' collection.
     */
    enrollUser: async (userId: string, sprintId: string, duration: number) => {
        try {
            const isEnrolled = await sprintService.isUserEnrolled(userId, sprintId);
            if (isEnrolled) {
                console.warn(`User ${userId} is already enrolled in sprint ${sprintId}.`);
                return null; // Or throw an error, depending on desired behavior
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
            // Fallback: Return the object so the UI updates optimistically even if DB fails
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
     * Merges with Mock Data for demo purposes if needed, or replaces it.
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
            
            // Deduplicate based on ID
            const allEnrollments = [...dbEnrollments, ...mockEnrollments];
            const uniqueEnrollments = Array.from(new Map(allEnrollments.map(item => [item.id, item])).values());

            return uniqueEnrollments;
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                 console.warn("Firestore permission denied (check security rules). Falling back to mock enrollments.");
            } else {

                 console.error("Error fetching enrollments:", error);
            }
            // Return mock data on error so dashboard doesn't break
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
            // Basic heuristic: If it looks like our DB ID format or we just try.
            const enrollmentRef = doc(db, 'enrollments', enrollmentId);
            await updateDoc(enrollmentRef, { progress });
        } catch (error) {
            // Quiet fail for mock data updates or permission issues to prevent console noise
            // console.warn("Could not update enrollment in DB:", error);
        }
    }
};
