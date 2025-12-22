
import { Conversation, Message, UserRole } from '../types';

// Mock Users
const currentUser = {
  userId: 'participant1', // Matched to main user data
  name: 'You',
  avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
};

const coachUser = {
  userId: 'coach1', // Matched to main user data
  name: 'Coach Jess',
  avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
};

const coachTom = {
    userId: 'coach-tom',
    name: 'Coach Tom',
    avatar: 'https://randomuser.me/api/portraits/men/46.jpg',
};

const participantUser1 = {
  userId: 'user-alex',
  name: 'Alex R',
  avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
};

const participantUser2 = {
    userId: 'user-sam',
    name: 'Samantha G',
    avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
};


// Mock Messages
const messages_coach: Message[] = [
    {
        id: 'msg-c1',
        conversationId: 'conv-1',
        senderId: coachUser.userId,
        senderName: coachUser.name,
        senderAvatar: coachUser.avatar,
        content: "Hey! Just checking in on your progress with the 'Mindful Morning' sprint. How are you finding the daily tasks?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
        id: 'msg-c2',
        conversationId: 'conv-1',
        senderId: 'participant1',
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        content: "Hi Jess! It's going well, thanks. I really enjoyed today's meditation. The prompt about setting intentions was powerful.",
        timestamp: new Date(Date.now() - 1000 * 60 * 50 * 1).toISOString(),
    },
     {
        id: 'msg-c3',
        conversationId: 'conv-1',
        senderId: coachUser.userId,
        senderName: coachUser.name,
        senderAvatar: coachUser.avatar,
        content: "That's great to hear! A lot of people find that one particularly helpful. Do you have any questions or anything you'd like to discuss for tomorrow's task?",
        timestamp: new Date(Date.now() - 1000 * 60 * 45 * 1).toISOString(),
    },
];

const messages_group: Message[] = [
    {
        id: 'msg-g1',
        conversationId: 'conv-2',
        senderId: participantUser1.userId,
        senderName: participantUser1.name,
        senderAvatar: participantUser1.avatar,
        content: "Hey everyone! Loved the Shine post about overcoming creative blocks. I'm in the 'Unleash Your Inner Artist' sprint and it really resonated.",
        timestamp: new Date(Date.now() - 1000 * 60 * 120 * 2).toISOString(),
    },
    {
        id: 'msg-g2',
        conversationId: 'conv-2',
        senderId: participantUser2.userId,
        senderName: participantUser2.name,
        senderAvatar: participantUser2.avatar,
        content: "Oh nice! I'm in that one too. The daily drawing prompts are challenging but fun.",
        timestamp: new Date(Date.now() - 1000 * 60 * 90 * 1).toISOString(),
    },
    {
        id: 'msg-g3',
        conversationId: 'conv-2',
        senderId: 'participant1',
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        content: "I was thinking of joining that sprint next! Would you recommend it?",
        timestamp: new Date(Date.now() - 1000 * 60 * 85 * 1).toISOString(),
    },
    {
       id: 'msg-g4',
        conversationId: 'conv-2',
        senderId: participantUser1.userId,
        senderName: participantUser1.name,
        senderAvatar: participantUser1.avatar,
        content: "100%! It's been a great way to build a consistent creative habit.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    },
    {
       id: 'msg-g5',
        conversationId: 'conv-2',
        senderId: participantUser2.userId,
        senderName: participantUser2.name,
        senderAvatar: participantUser2.avatar,
        content: "Definitely agree with Alex. Plus the tribe here is super supportive!",
        timestamp: new Date(Date.now() - 1000 * 60 * 30 * 1).toISOString(),
    }
];

const messages_dm: Message[] = [
    {
        id: 'msg-dm1',
        conversationId: 'conv-3',
        senderId: participantUser2.userId,
        senderName: participantUser2.name,
        senderAvatar: participantUser2.avatar,
        content: "Hey, I saw your comment on the Shine post. Your progress pics are amazing! Keep it up.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
        id: 'msg-dm2',
        conversationId: 'conv-3',
        senderId: 'participant1',
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        content: "Thanks so much! That really means a lot. Your support in the comments has been so motivating! ",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    }
];

const messages_coach_tom: Message[] = [
    {
        id: 'msg-ct1',
        conversationId: 'conv-4',
        senderId: coachTom.userId,
        senderName: coachTom.name,
        senderAvatar: coachTom.avatar,
        content: "Welcome to the 'Productivity Power-Up' sprint! I'm excited to have you on board.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
        id: 'msg-ct2',
        conversationId: 'conv-4',
        senderId: coachTom.userId,
        senderName: coachTom.name,
        senderAvatar: coachTom.avatar,
        content: "Let me know if you have any questions as you get started.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    }
];


// Mock Conversations
export const MOCK_CONVERSATIONS: Conversation[] = [
    {
        id: 'conv-1',
        type: 'direct',
        participants: [{userId: 'participant1', name: 'You', avatar: ''}, {userId: 'coach1', name: 'Coach Jess', avatar: ''}],
        lastMessage: messages_coach[messages_coach.length - 1],
        unreadCount: 1,
    },
    {
        id: 'conv-2',
        type: 'group',
        groupName: "Artist's Corner",
        groupAvatar: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2071&auto=format&fit=crop',
        participants: [{userId: 'participant1', name: 'You', avatar: ''}, participantUser1, participantUser2],
        lastMessage: messages_group[messages_group.length - 1],
        unreadCount: 3,
    },
    {
        id: 'conv-3',
        type: 'direct',
        participants: [{userId: 'participant1', name: 'You', avatar: ''}, participantUser2],
        lastMessage: messages_dm[messages_dm.length - 1],
        unreadCount: 0,
    },
    {
        id: 'conv-4',
        type: 'direct',
        participants: [{userId: 'participant1', name: 'You', avatar: ''}, {userId: 'coach-tom', name: 'Coach Tom', avatar: ''}],
        lastMessage: messages_coach_tom[messages_coach_tom.length - 1],
        unreadCount: 2,
    }
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
    'conv-1': messages_coach,
    'conv-2': messages_group,
    'conv-3': messages_dm,
    'conv-4': messages_coach_tom,
};
