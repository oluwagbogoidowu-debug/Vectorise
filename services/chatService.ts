
import { CoachingComment, Message, Conversation, User, Participant } from '../types';
import { MOCK_COACHING_COMMENTS, MOCK_SPRINTS, MOCK_USERS } from './mockData';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from './mockChatData';

// Helper to create a deterministic conversation ID
const getConversationId = (userId1: string, userId2: string): string => {
    const sortedIds = [userId1, userId2].sort();
    return `conv-${sortedIds[0]}-${sortedIds[1]}`;
};

export const chatService = {
  createConversation: async (
    participantId: string,
    coachId: string,
    initialMessage: string
  ): Promise<{ newConversation: Conversation; newMessage: Message }> => {
    const participant = MOCK_USERS.find(u => u.id === participantId);
    const coach = MOCK_USERS.find(u => u.id === coachId);

    if (!participant || !coach) {
      throw new Error('Participant or coach not found');
    }

    const conversationId = getConversationId(participantId, coachId);
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: conversationId,
      senderId: coachId,
      senderName: coach.name,
      senderAvatar: coach.profileImageUrl || '',
      content: initialMessage,
      timestamp: new Date().toISOString(),
    };

    const newConversation: Conversation = {
      id: conversationId,
      type: 'direct',
      participants: [
        { userId: participant.id, name: participant.name, avatar: participant.profileImageUrl || '' },
        { userId: coach.id, name: coach.name, avatar: coach.profileImageUrl || '' },
      ],
      lastMessage: newMessage,
      unreadCount: 1,
    };

    return { newConversation, newMessage };
  },

  sendMessage: async (message: Omit<CoachingComment, 'id'>, participant: Participant) => {
    const newCoachingComment = { ...message, id: `local_${Date.now()}` } as CoachingComment;
    MOCK_COACHING_COMMENTS.push(newCoachingComment);

    // Ensure the participant exists in our mock user data
    if (!MOCK_USERS.find(u => u.id === participant.id)) {
        MOCK_USERS.push(participant);
    }

    try {
        const sprint = MOCK_SPRINTS.find(s => s.id === message.sprintId);
        if (!sprint) throw new Error(`Sprint with id ${message.sprintId} not found`);

        const coachId = sprint.coachId;
        const conversationId = getConversationId(participant.id, coachId);
        let mainConversation = MOCK_CONVERSATIONS.find(c => c.id === conversationId);

        const taggedContent = `[CONTEXT:${sprint.title} - Day ${message.day}]\n${message.content}`;

        const newMainMessage: Message = {
            id: `msg_sync_${Date.now()}`,
            conversationId: conversationId,
            senderId: message.authorId,
            senderName: participant.name,
            senderAvatar: participant.profileImageUrl || '',
            content: taggedContent,
            timestamp: message.timestamp,
        };

        if (mainConversation) {
            if (!MOCK_MESSAGES[conversationId]) {
                MOCK_MESSAGES[conversationId] = [];
            }
            MOCK_MESSAGES[conversationId].push(newMainMessage);
            mainConversation.lastMessage = newMainMessage;
            mainConversation.unreadCount = (mainConversation.unreadCount || 0) + 1;
        } else {
             const coach = MOCK_USERS.find(u => u.id === coachId);
             if (!coach) throw new Error(`Coach with id ${coachId} not found`);

             const newConversation: Conversation = {
                id: conversationId,
                type: 'direct',
                participants: [
                    { userId: participant.id, name: participant.name, avatar: participant.profileImageUrl || '' },
                    { userId: coach.id, name: coach.name, avatar: coach.profileImageUrl || '' },
                ],
                lastMessage: newMainMessage,
                unreadCount: 1,
             };
             
             MOCK_CONVERSATIONS.push(newConversation);
             MOCK_MESSAGES[conversationId] = [newMainMessage];
        }
    } catch (syncError: any) {
        console.error("Error syncing message to main chat:", syncError.message);
    }

    return newCoachingComment;
  },

  createInitialWelcomeConversation: async (sprintId: string, participant: Participant) => {
    const sprint = MOCK_SPRINTS.find(s => s.id === sprintId);
    if (!sprint) {
      console.error(`Sprint not found: ${sprintId}`);
      return;
    }

    const coach = MOCK_USERS.find(u => u.id === sprint.coachId);
    if (!coach) {
      console.error(`Coach not found: ${sprint.coachId}`);
      return;
    }

    const conversationId = getConversationId(participant.id, coach.id);
    const existingConversation = MOCK_CONVERSATIONS.find(c => c.id === conversationId);

    if (existingConversation) {
      return;
    }

    if (!MOCK_USERS.find(u => u.id === participant.id)) {
        MOCK_USERS.push(participant);
    }

    const welcomeMessageContent = `Welcome to the '${sprint.title}' sprint! I'm excited to have you on board. Let me know if you have any questions as you get started.`;

    const newMessage: Message = {
      id: `msg-welcome-${Date.now()}`,
      conversationId: conversationId,
      senderId: coach.id,
      senderName: coach.name,
      senderAvatar: coach.profileImageUrl || '',
      content: welcomeMessageContent,
      timestamp: new Date().toISOString(),
    };

    const newConversation: Conversation = {
      id: conversationId,
      type: 'direct',
      participants: [
        { userId: participant.id, name: participant.name, avatar: participant.profileImageUrl || '' },
        { userId: coach.id, name: coach.name, avatar: coach.profileImageUrl || '' },
      ],
      lastMessage: newMessage,
      unreadCount: 1,
    };
    
    MOCK_CONVERSATIONS.push(newConversation);
    if (!MOCK_MESSAGES[conversationId]) {
        MOCK_MESSAGES[conversationId] = [];
    }
    MOCK_MESSAGES[conversationId].push(newMessage);

    console.log(`Created new welcome conversation: ${conversationId}`);
  },

  getConversation: async (sprintId: string, participantId: string) => {
      return MOCK_COACHING_COMMENTS.filter(c => c.sprintId === sprintId && c.participantId === participantId);
  },

  getAllMessages: async () => {
      return MOCK_COACHING_COMMENTS;
  }
};
