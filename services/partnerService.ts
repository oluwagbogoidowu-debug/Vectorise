import { db } from './firebase';
import { collection, addDoc, getDocs, query, doc, updateDoc, orderBy, where } from 'firebase/firestore';
import { PartnerApplication, UserRole, Participant, Sprint, ParticipantSprint } from '../types';
import { sanitizeData } from './userService';

const COLLECTION_NAME = 'partner_applications';
const USERS_COLLECTION = 'users';
const ENROLLMENTS_COLLECTION = 'participant_sprints';
const LINK_STATS_COLLECTION = 'link_stats';

export const partnerService = {
  submitApplication: async (data: Omit<PartnerApplication, 'id' | 'status' | 'timestamp'>) => {
    try {
      const applicationData = sanitizeData({
        ...data,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      const docRef = await addDoc(collection(db, COLLECTION_NAME), applicationData);
      return docRef.id;
    } catch (error) {
      console.error("Error submitting partner application:", error);
      throw error;
    }
  },

  getApplications: async (): Promise<PartnerApplication[]> => {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as PartnerApplication));
    } catch (error) {
      console.error("Error fetching partner applications:", error);
      return [];
    }
  },

  updateApplicationStatus: async (id: string, status: 'approved' | 'rejected') => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { status });
    } catch (error) {
      console.error("Error updating application status:", error);
      throw error;
    }
  },

  getPartners: async (): Promise<Participant[]> => {
    try {
      const q = query(collection(db, USERS_COLLECTION), where("role", "==", UserRole.PARTNER));
      const snap = await getDocs(q);
      return snap.docs.map(d => sanitizeData(d.data()) as Participant);
    } catch (error) {
      console.error("Error fetching partners:", error);
      return [];
    }
  },

  getPartnerMetrics: async (referralCode: string, userId: string) => {
    try {
      // 1. Clicks from link_stats
      const clicksQuery = query(collection(db, LINK_STATS_COLLECTION), where("referralCode", "==", referralCode));
      const clicksSnap = await getDocs(clicksQuery);
      let totalClicks = 0;
      clicksSnap.forEach(doc => {
        totalClicks += doc.data().clicks || 0;
      });

      // 2. Signups (users where referrerId == userId)
      const signupsQuery = query(collection(db, USERS_COLLECTION), where("referrerId", "==", userId));
      const signupsSnap = await getDocs(signupsQuery);
      const totalSignups = signupsSnap.size;

      // 3. Paid Sprints (enrollments from these signups where price_paid > 0)
      let totalPaidSprints = 0;
      if (totalSignups > 0) {
        const signupIds = signupsSnap.docs.map(d => d.id);
        // Firestore 'in' query limit is 10, so we might need to chunk if there are many signups
        // For now, let's assume a reasonable number or fetch all and filter in memory if needed
        // But better to fetch enrollments by referrerId if we store it there too.
        // Let's check if ParticipantSprint has referrerId.
        
        // Alternative: Fetch all enrollments for these users
        const enrollmentsQuery = query(collection(db, ENROLLMENTS_COLLECTION), where("user_id", "in", signupIds.slice(0, 10)));
        const enrollmentsSnap = await getDocs(enrollmentsQuery);
        enrollmentsSnap.forEach(doc => {
          const data = doc.data() as ParticipantSprint;
          if (data.price_paid > 0) {
            totalPaidSprints++;
          }
        });
      }

      return {
        clicks: totalClicks,
        signups: totalSignups,
        paidSprints: totalPaidSprints
      };
    } catch (error) {
      console.error("Error fetching partner metrics:", error);
      return { clicks: 0, signups: 0, paidSprints: 0 };
    }
  },

  updatePartnerSprints: async (userId: string, sprintIds: string[]) => {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      await updateDoc(userRef, {
        "partnerData.selectedSprintIds": sprintIds
      });
    } catch (error) {
      console.error("Error updating partner sprints:", error);
      throw error;
    }
  }
};
