
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { CoachingComment, Sprint } from '../types';
import { MOCK_COACHING_COMMENTS } from './mockData';
import { sanitizeData, userService } from './userService';
import { notificationService } from './notificationService';
import { sprintService } from './sprintService';

const getDeletedMessageIds = (): string[] => {
  try {
    const list = localStorage.getItem('deleted_coaching_messages');
    return list ? JSON.parse(list) : [];
  } catch (e) {
    return [];
  }
};

const addDeletedMessageId = (id: string) => {
  try {
    const list = getDeletedMessageIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem('deleted_coaching_messages', JSON.stringify(list));
    }
  } catch (e) {}
};

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
            },
            bypassActiveCheck: true // Always push coach/student messages immediately
          }
        );
      }

      return fullMessage;
    } catch (error: any) {
      return { ...message, id: `local_${Date.now()}` } as CoachingComment;
    }
  },

  getConversation: async (sprintId: string, participantId: string, day: number) => {
    try {
      const deletedIds = getDeletedMessageIds();
      const colRef = collection(db, 'coaching_messages');
      const q = query(
        colRef, 
        where("sprintId", "==", sprintId),
        where("participantId", "==", participantId),
        where("day", "==", day)
      );
      const snapshot = await getDocs(q);
      const dbMessages = snapshot.docs
        .map(doc => sanitizeData({ id: doc.id, ...doc.data() }) as CoachingComment)
        .filter(m => !deletedIds.includes(m.id));
      const mockMessages = MOCK_COACHING_COMMENTS
        .filter(c => c.sprintId === sprintId && c.participantId === participantId && c.day === day)
        .filter(m => !deletedIds.includes(m.id));
      return [...dbMessages, ...mockMessages].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error: any) {
      const deletedIds = getDeletedMessageIds();
      return MOCK_COACHING_COMMENTS
        .filter(c => c.sprintId === sprintId && c.participantId === participantId && c.day === day)
        .filter(m => !deletedIds.includes(m.id));
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      addDeletedMessageId(messageId);
      // Attempt firestore deletion as well
      const docRef = doc(db, 'coaching_messages', messageId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.warn("Locally deleted message, but cloud deletion skipped/failed:", error);
      return true;
    }
  },

  hasUnreadMessages: async (sprintId: string, participantId: string, day: number, readerId: string) => {
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
      return snapshot.docs.some(d => (d.data() as CoachingComment).authorId !== readerId);
    } catch (error) {
      return false;
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
          const deletedIds = getDeletedMessageIds();
          const colRef = collection(db, 'coaching_messages');
          const snapshot = await getDocs(colRef);
          const dbMessages = snapshot.docs
            .map(doc => sanitizeData({ id: doc.id, ...doc.data() }) as CoachingComment)
            .filter(m => !deletedIds.includes(m.id));
          const mockMessages = MOCK_COACHING_COMMENTS.filter(m => !deletedIds.includes(m.id));
          return [...dbMessages, ...mockMessages];
      } catch (error: any) {
          const deletedIds = getDeletedMessageIds();
          return MOCK_COACHING_COMMENTS.filter(m => !deletedIds.includes(m.id));
      }
  }
};
