
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { CoachingComment } from '../types';
import { MOCK_COACHING_COMMENTS } from './mockData';

export const chatService = {
  /**
   * Sends a message to the 'coaching_messages' collection.
   */
  sendMessage: async (message: Omit<CoachingComment, 'id'>) => {
    try {
      const colRef = collection(db, 'coaching_messages');
      const docRef = await addDoc(colRef, message);
      return { ...message, id: docRef.id } as CoachingComment;
    } catch (error: any) {
      // Suppress permission errors
      if (error.code !== 'permission-denied' && !error.message?.includes('Missing or insufficient permissions')) {
          console.warn("Error sending message (falling back to local):", error.message);
      }
      // Return a local object so the UI updates optimistically
      return { ...message, id: `local_${Date.now()}` } as CoachingComment;
    }
  },

  /**
   * Fetches conversation for a specific sprint and participant.
   */
  getConversation: async (sprintId: string, participantId: string) => {
    try {
      const colRef = collection(db, 'coaching_messages');
      // Note: Complex queries might require an index. 
      // We filter in memory if needed or use simple queries for prototype.
      const q = query(
        colRef, 
        where("sprintId", "==", sprintId),
        where("participantId", "==", participantId)
      );
      
      const snapshot = await getDocs(q);
      const dbMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoachingComment));
      
      // Merge with Mock Data for seamless demo experience
      const mockMessages = MOCK_COACHING_COMMENTS.filter(c => 
          c.sprintId === sprintId && c.participantId === participantId
      );

      // Deduplicate by content + timestamp roughly or just concat and sort
      // Simple concat & sort
      return [...dbMessages, ...mockMessages].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error: any) {
      // Suppress permission errors
      if (error.code !== 'permission-denied' && !error.message?.includes('Missing or insufficient permissions')) {
          console.warn("Error fetching conversation:", error.message);
      }
      return MOCK_COACHING_COMMENTS.filter(c => c.sprintId === sprintId && c.participantId === participantId);
    }
  },

  /**
   * Fetch ALL messages (For Coach Inbox View).
   * Warning: In production, this should be paginated or optimized.
   */
  getAllMessages: async () => {
      try {
          const colRef = collection(db, 'coaching_messages');
          const snapshot = await getDocs(colRef);
          const dbMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoachingComment));
          return [...dbMessages, ...MOCK_COACHING_COMMENTS];
      } catch (error: any) {
          // Suppress permission errors
          if (error.code !== 'permission-denied' && !error.message?.includes('Missing or insufficient permissions')) {
              console.warn("Error fetching all messages:", error.message);
          }
          return MOCK_COACHING_COMMENTS;
      }
  }
};
