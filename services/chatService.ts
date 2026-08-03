
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

      // Determine sender and recipient
      const sprint = await sprintService.getSprintById(message.sprintId);
      const isCoachSending = message.authorId !== message.participantId;

      let targetUserId: string | undefined = undefined;
      let notificationTitle = '';
      let actionUrl = '';

      if (isCoachSending) {
        // Coach sent a response to student
        targetUserId = message.participantId;

        let coachName = '';
        try {
          const coachUser = await userService.getUserDocument(message.authorId);
          if (coachUser?.name) coachName = coachUser.name;
        } catch (e) {}

        notificationTitle = coachName ? `Response from Coach ${coachName}` : 'New Message from Coach';
        actionUrl = `/participant/sprint/${message.sprintId}?day=${message.day}&openChat=true`;
      } else {
        // Student sent a message to coach
        let coachId = sprint?.coachId;
        if (!coachId || coachId.trim() === '') {
          try {
            const coaches = await userService.getAllCoaches();
            if (coaches && coaches.length > 0) {
              coachId = coaches[0].id;
            }
          } catch (e) {}
        }
        targetUserId = coachId || 'admin1';

        let studentName = '';
        try {
          const studentUser = await userService.getUserDocument(message.authorId);
          if (studentUser?.name) studentName = studentUser.name;
        } catch (e) {}

        notificationTitle = studentName ? `New Message from Student (${studentName})` : 'New Message from Student';
        actionUrl = `/coach/participants?participantId=${message.participantId}&sprintId=${message.sprintId}&day=${message.day}`;
      }

      if (targetUserId) {
        await notificationService.createNotification(
          targetUserId,
          'coach_message',
          notificationTitle,
          `${message.content.substring(0, 80)}${message.content.length > 80 ? '...' : ''}`,
          { 
            actionUrl,
            context: { 
              sprintId: message.sprintId, 
              day: message.day,
              participantId: message.participantId 
            },
            bypassActiveCheck: true // Send push notification immediately
          }
        );
      }

      return fullMessage;
    } catch (error: any) {
      console.error("Error in chatService.sendMessage:", error);
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
