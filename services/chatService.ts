
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { CoachingComment, Sprint } from '../types';
import { MOCK_COACHING_COMMENTS } from './mockData';
import { sanitizeData, userService } from './userService';
import { notificationService } from './notificationService';
import { sprintService } from './sprintService';

export const chatService = {
  sendMessage: async (message: Omit<CoachingComment, 'id'>) => {
    try {
      const sanitized = sanitizeData(message);
      const colRef = collection(db, 'coaching_messages');
      const docRef = await addDoc(colRef, sanitized);
      const fullMessage = { ...sanitized, id: docRef.id } as CoachingComment;

      // Trigger Logic: Notify the other party
      // If author is coach, notify student
      // If author is student, notify coach (using system logic)
      const sprint = await sprintService.getSprintById(message.sprintId);
      const isCoach = message.authorId === sprint?.coachId;
      const targetUserId = isCoach ? message.participantId : sprint?.coachId;

      if (targetUserId && sprint) {
        await notificationService.createNotification(
          targetUserId,
          'coach_message',
          isCoach ? 'Message from Coach' : 'Message from Student',
          `${message.content.substring(0, 60)}${message.content.length > 60 ? '...' : ''}`,
          { 
            actionUrl: isCoach 
              ? `/participant/sprint/${message.participantId}?day=${message.day}&openChat=true` 
              : `/coach/participants`, // Coach tracker for coaches
            context: { 
              sprintId: message.sprintId, 
              day: message.day,
              participantId: message.participantId 
            }
          }
        );
      }

      return fullMessage;
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
