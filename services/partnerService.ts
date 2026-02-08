import { db } from './firebase';
import { collection, addDoc, getDocs, query, doc, updateDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { PartnerApplication } from '../types';
import { sanitizeData } from './userService';

const COLLECTION_NAME = 'partner_applications';

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
  }
};