
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { UserEvent, EventType } from '../types';

const EVENTS_COLLECTION = 'user_events';

/**
 * Robust utility to recursively remove non-serializable values and undefined fields.
 */
const sanitizeData = (val: any, seen = new WeakSet()): any => {
    if (val === null || typeof val !== 'object') return val;
    if (seen.has(val)) return undefined;

    if (Array.isArray(val)) {
        seen.add(val);
        return val.map(item => sanitizeData(item, seen)).filter(i => i !== undefined);
    }

    if (val instanceof Date) return val.toISOString();
    if (typeof val.toDate === 'function') return val.toDate().toISOString();

    const isPlainObject = val.constructor === Object || Object.getPrototypeOf(val) === null;
    if (!isPlainObject) return undefined;

    seen.add(val);
    const cleaned: any = {};
    Object.entries(val).forEach(([key, value]) => {
        const sanitizedVal = sanitizeData(value, seen);
        if (sanitizedVal !== undefined) {
            cleaned[String(key)] = sanitizedVal;
        }
    });
    return cleaned;
};

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
      
      // Sanitize to remove 'undefined' fields which Firestore rejects
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
