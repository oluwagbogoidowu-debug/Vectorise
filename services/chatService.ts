
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { CoachingComment } from '../types';
import { MOCK_COACHING_COMMENTS } from './mockData';
import { sanitizeData } from './userService';

export const chatService = {
  sendMessage: async (message: Omit<CoachingComment, 'id'>) => {
    try {
      const sanitized = sanitizeData(message);
      const colRef = collection(db, 'coaching_messages');
      const docRef = await addDoc(colRef, sanitized);
      return { ...sanitized, id: docRef.id } as CoachingComment;
    } catch (error: any) {
      return { ...message, id: `local_${Date.now()}` } as CoachingComment;
    }
  },

  getConversation: async (sprintId: string, participantId: string) => {
    try {
      const colRef = collection(db, 'coaching_messages');
      const q = query(
        colRef, 
        where("sprintId", "==", sprintId),
        where("participantId", "==", participantId)
      );
      const snapshot = await getDocs(q);
      const dbMessages = snapshot.docs.map(doc => sanitizeData({ id: doc.id, ...doc.data() }) as CoachingComment);
      const mockMessages = MOCK_COACHING_COMMENTS.filter(c => 
          c.sprintId === sprintId && c.participantId === participantId
      );
      return [...dbMessages, ...mockMessages].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error: any) {
      return MOCK_COACHING_COMMENTS.filter(c => c.sprintId === sprintId && c.participantId === participantId);
    }
  },

  markMessagesAsRead: async (sprintId: string, participantId: string, day: number, readerId: string) => {
    try {
      const colRef = collection(db, 'coaching_messages');
      const q = query(
        colRef,
        where("sprintId", "==", sprintId),
        where("participantId", "==", participantId),
        where("day", "==", day),
        where("read", "==", false)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      let count = 0;
      snapshot.docs.forEach((d) => {
        const msg = d.data() as CoachingComment;
        // Only mark as read if the reader is NOT the author
        if (msg.authorId !== readerId) {
          batch.update(d.ref, { read: true });
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },

  getAllMessages: async () => {
      try {
          const colRef = collection(db, 'coaching_messages');
          const snapshot = await getDocs(colRef);
          const dbMessages = snapshot.docs.map(doc => sanitizeData({ id: doc.id, ...doc.data() }) as CoachingComment);
          return [...dbMessages, ...MOCK_COACHING_COMMENTS];
      } catch (error: any) {
          return MOCK_COACHING_COMMENTS;
      }
  }
};
