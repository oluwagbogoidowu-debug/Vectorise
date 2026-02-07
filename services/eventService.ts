
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { UserEvent, EventType } from '../types';
import { sanitizeData } from './userService';

const EVENTS_COLLECTION = 'user_events';

export const eventService = {
  /**
   * Logs a raw user action. This table is immutable truth.
   */
  logEvent: async (userId: string, type: EventType, details: { sprintId?: string; dayNumber?: number; metadata?: any } = {}) => {
    try {
      const rawEvent: Omit<UserEvent, 'id'> = {
        userId,
        eventType: type,
        sprintId: details.sprintId,
        dayNumber: details.dayNumber,
        timestamp: new Date().toISOString(),
        metadata: details.metadata
      };
      
      // Sanitize to remove 'undefined' fields and prevent circularity
      const sanitizedEvent = sanitizeData(rawEvent);
      
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), sanitizedEvent);
      return docRef.id;
    } catch (error) {
      console.error("Critical failure: Event log failed.", error);
    }
  },

  /**
   * Fetches the full raw timeline for a specific user.
   * Note: Sort is performed in memory to avoid mandatory Firestore composite indexes.
   */
  getUserTimeline: async (userId: string) => {
    try {
      const q = query(
        collection(db, EVENTS_COLLECTION),
        where("userId", "==", userId)
      );
      const snap = await getDocs(q);
      const events = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as UserEvent);
      
      // Sort locally by timestamp descending
      return events.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error("Error fetching timeline:", error);
      return [];
    }
  }
};
