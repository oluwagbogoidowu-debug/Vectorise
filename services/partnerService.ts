import { db } from './firebase';
import { collection, addDoc, getDocs, query, doc, updateDoc, orderBy, serverTimestamp, increment, onSnapshot, where, setDoc } from 'firebase/firestore';
import { PartnerApplication } from '../types';
import { sanitizeData } from './userService';

const COLLECTION_NAME = 'partner_applications';
const METRICS_COLLECTION = 'partner_metrics';

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

  /**
   * Logs a click for a specific partner referral code.
   * Uses a dedicated metrics document per partner for efficiency.
   */
  logClick: async (referralCode: string, sprintId?: string | null) => {
    try {
      const metricsRef = doc(db, METRICS_COLLECTION, referralCode);
      const now = new Date().toISOString();
      
      // Use setDoc with merge to increment or initialize
      await setDoc(metricsRef, {
        totalClicks: increment(1),
        lastClickAt: now,
        referralCode: referralCode,
        // We could also track per-sprint clicks here if needed
        ...(sprintId ? { [`sprintClicks_${sprintId}`]: increment(1) } : {})
      }, { merge: true });

      // Log raw click event for audit
      await addDoc(collection(db, 'partner_click_logs'), {
        referralCode,
        sprintId: sprintId || 'general',
        timestamp: now,
        userAgent: navigator.userAgent
      });
      
      console.log(`[Registry] Click tracked for partner: ${referralCode}`);
    } catch (err) {
      console.error("Failed to log click:", err);
    }
  },

  /**
   * Real-time subscription to partner metrics
   */
  subscribeToMetrics: (referralCode: string, callback: (data: any) => void) => {
    const metricsRef = doc(db, METRICS_COLLECTION, referralCode);
    return onSnapshot(metricsRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        callback({ totalClicks: 0 });
      }
    });
  }
};