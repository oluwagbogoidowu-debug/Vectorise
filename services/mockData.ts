import { UserRole, Coach, Participant, Payout, Admin, ShinePost, Notification, RoleDefinition, Referral, ImpactReward, SubscriptionPlan, Sprint, ParticipantSprint, CoachingComment } from '../types';

export const MOCK_ROLES: RoleDefinition[] = [
  {
    id: 'role_super_admin',
    name: 'Super Admin',
    description: 'Full access to all system features.',
    baseRole: UserRole.ADMIN,
    permissions: ['user:view', 'user:manage', 'role:manage', 'analytics:view', 'sprint:delete', 'community:moderate'],
    isSystem: true
  },
  {
    id: 'role_head_coach',
    name: 'Head Coach',
    description: 'Can create and manage sprints.',
    baseRole: UserRole.COACH,
    permissions: ['sprint:create', 'sprint:edit', 'sprint:publish', 'analytics:view', 'community:moderate'],
    isSystem: true
  },
  {
    id: 'role_junior_coach',
    name: 'Junior Coach',
    description: 'Can edit content but cannot publish new sprints.',
    baseRole: UserRole.COACH,
    permissions: ['sprint:edit', 'community:moderate'],
    isSystem: false
  }
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'student',
        name: 'Student',
        price: 2500,
        currency: '₦',
        targetAudience: 'University Students',
        description: 'Perfect for students looking to grow without breaking the bank.',
        includedDifficulties: ['Beginner', 'Intermediate'],
        monthlyPoints: 0,
        features: [
            'Unlimited Beginner & Intermediate Sprints',
            'Daily Tasks (Text/Audio)',
            'Community Access',
            'Progress Tracking',
            'Advanced Sprints: ₦5,000 One-off'
        ]
    },
    {
        id: 'basic',
        name: 'Basic',
        price: 4000,
        currency: '₦',
        targetAudience: 'Early Career (50-100k)',
        description: 'Start building consistent habits.',
        includedDifficulties: ['Beginner'],
        monthlyPoints: 30,
        features: [
            'Unlimited Beginner Sprints',
            '30 Growth Points / Month',
            'Daily Tasks & Community',
            'Intermediate Sprints: ₦7,500 One-off'
        ]
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 7500,
        currency: '₦',
        targetAudience: 'Mid-Level (50-150k)',
        description: 'Accelerate your career and personal growth.',
        includedDifficulties: ['Beginner', 'Intermediate'],
        monthlyPoints: 50,
        features: [
            'Unlimited Beginner & Intermediate',
            '50 Growth Points / Month',
            'Small Group Q&A Access',
            'Advanced Sprints: ₦20,000 One-off'
        ]
    },
    {
        id: 'premium',
        name: 'Premium',
        price: 15000,
        currency: '₦',
        targetAudience: 'Advanced (150k+)',
        description: 'The ultimate toolkit for high achievers.',
        includedDifficulties: ['Beginner', 'Intermediate', 'Advanced'],
        monthlyPoints: 100,
        features: [
            'All Sprint Levels Included',
            '100 Growth Points / Month',
            '1:1 Coach Reviews',
            'VIP Community & Leaderboard',
            'Priority Support'
        ]
    }
];

export const MOCK_USERS: (Coach | Participant | Admin)[] = [
  {
    id: 'coach1',
    name: 'Alex Morgan',
    email: 'alex.morgan@vectorise.com',
    role: UserRole.COACH,
    roleDefinitionId: 'role_head_coach',
    profileImageUrl: 'https://picsum.photos/seed/coach1/200',
    bio: 'Certified life coach with 10+ years of experience in helping people find their purpose.',
    niche: 'Career & Purpose',
    approved: true,
  },
  {
    id: 'coach2',
    name: 'Dr. Evelyn Reed',
    email: 'e.reed@vectorise.com',
    role: UserRole.COACH,
    roleDefinitionId: 'role_junior_coach', 
    profileImageUrl: 'https://picsum.photos/seed/coach2/200',
    bio: 'PhD in Psychology, focused on mindfulness and stress reduction techniques.',
    niche: 'Mindfulness',
    approved: false,
  },
  {
    id: 'coach3',
    name: 'Marcus Stone',
    email: 'm.stone@vectorise.com',
    role: UserRole.COACH,
    roleDefinitionId: 'role_head_coach',
    profileImageUrl: 'https://picsum.photos/seed/coach3/200',
    bio: 'Business strategist and serial entrepreneur. I help you build systems that scale.',
    niche: 'Business & Leadership',
    approved: true,
  },
  {
    id: 'participant1',
    name: 'Jamie Lee',
    email: 'jamie.lee@example.com',
    role: UserRole.PARTICIPANT,
    profileImageUrl: 'https://picsum.photos/seed/participant1/200',
    bio: 'Aspiring entrepreneur looking to build better habits and focus.',
    followers: 142,
    following: 89,
    savedSprintIds: [],
    hasCoachProfile: false,
    referralCode: 'JAMIEGROWTH',
    walletBalance: 500,
    impactStats: {
        peopleHelped: 4,
        streak: 2
    },
    subscription: {
        planId: 'basic',
        active: true,
        renewsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    // Fix: removed 'incomeBracket' property as it does not exist on type 'Participant'
    occupation: 'employed'
  },
  {
    id: 'participant_new',
    name: 'New User',
    email: 'new@example.com',
    role: UserRole.PARTICIPANT,
    profileImageUrl: 'https://ui-avatars.com/api/?name=New+User&background=0E7850&color=fff',
    bio: 'Just joined Vectorise to level up my life.',
    followers: 12,
    following: 5,
    savedSprintIds: [],
    hasCoachProfile: false,
    referralCode: 'NEWUSER24',
    walletBalance: 0,
    impactStats: {
        peopleHelped: 0,
        streak: 0
    }
  },
  {
    id: 'admin1',
    name: 'Admin User',
    email: 'admin@vectorise.com',
    role: UserRole.ADMIN,
    roleDefinitionId: 'role_super_admin',
    profileImageUrl: 'https://picsum.photos/seed/admin1/200',
  }
];

export const MOCK_REFERRALS: Referral[] = [
    {
        id: 'ref1',
        referrerId: 'participant1',
        refereeName: 'Musa',
        refereeAvatar: 'https://i.pravatar.cc/150?u=musa',
        status: 'joined',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
];

export const MOCK_REWARDS: ImpactReward[] = [
    {
        id: 'rew1',
        type: 'early_access',
        title: 'Early Access: "Deep Focus" Sprint',
        description: 'Get into our upcoming Deep Focus sprint 48 hours before the public.',
        unlocked: true,
        requiredReferrals: 1,
        rewardPoints: 2
    },
    {
        id: 'rew2',
        type: 'reflection_prompt',
        title: 'The Catalyst Reflection Deck',
        description: '5 extra prompts to deepen your understanding of your own leadership style.',
        unlocked: true,
        requiredReferrals: 3,
        rewardPoints: 5
    }
];

export const MOCK_PAYOUTS: Payout[] = [
  { id: 'payout1', coachId: 'coach1', amount: 150000, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), status: 'completed' },
  { id: 'payout2', coachId: 'coach1', amount: 60000, date: new Date().toISOString(), status: 'pending' },
];

export const MOCK_SHINE_POSTS: ShinePost[] = [
  {
    id: 'post1',
    userId: 'participant1',
    userName: 'Jamie Lee',
    userAvatar: 'https://picsum.photos/seed/participant1/200',
    content: 'Realized that my biggest energy drain is actually perfectionism, not my workload. Feeling lighter already. ✨',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likes: 12,
    comments: 3,
    isLiked: true,
    isSaved: false,
    commentData: [
        { id: 'c1', userId: 'coach1', userName: 'Alex Morgan', userAvatar: 'https://picsum.photos/seed/coach1/200', content: 'That is a huge breakthrough! Keep that momentum.', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() }
    ]
  }
];

// Fix: corrected property names and added missing fields to match 'Notification' interface.
export const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: 'n0',
        userId: 'participant1',
        type: 'referral_update',
        title: 'Registry Impact',
        body: 'Someone just finished Week 1 — your influence is growing.',
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    }
];

// Fix: Added missing MOCK_SPRINTS to resolve import errors in Admin and Signup pages.
export const MOCK_SPRINTS: Sprint[] = [
  {
    id: 'sprint1',
    coachId: 'coach1',
    title: '7-Day Clarity Challenge',
    description: 'Find your purpose and set clear goals for the next quarter.',
    category: 'Productivity',
    difficulty: 'Beginner',
    duration: 7,
    price: 0,
    pointCost: 70,
    pricingType: 'credits',
    coverImageUrl: 'https://picsum.photos/seed/sprint1/800/400',
    published: true,
    approvalStatus: 'approved',
    dailyContent: [
        { day: 1, lessonText: "Start with why.", taskPrompt: "Write down 3 core values.", submissionType: 'text' }
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    outcomes: ['Clear goals', 'Morning routine', 'Priority matrix']
  }
];

// Fix: Added missing MOCK_PARTICIPANT_SPRINTS to resolve import errors in Sprint Landing and Discovery pages.
export const MOCK_PARTICIPANT_SPRINTS: ParticipantSprint[] = [
  {
    id: 'enrollment_participant1_sprint1',
    participantId: 'participant1',
    sprintId: 'sprint1',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    progress: [
      { day: 1, completed: true, completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
      { day: 2, completed: true, completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { day: 3, completed: false }
    ]
  }
];

// Fix: Added missing MOCK_COACHING_COMMENTS to resolve import errors in Chat Service.
export const MOCK_COACHING_COMMENTS: CoachingComment[] = [
  {
    id: 'cc1',
    sprintId: 'sprint1',
    day: 1,
    participantId: 'participant1',
    authorId: 'coach1',
    content: 'Great first step! Your goals look very specific.',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    read: true
  }
];