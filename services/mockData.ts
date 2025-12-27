
import { UserRole, Coach, Participant, Sprint, ParticipantSprint, Payout, Admin, ShinePost, Notification, RoleDefinition, Referral, ImpactReward, SubscriptionPlan, DailyContent, Review, CoachingComment } from '../types';

// Helper to generate content for mock sprints
const generateDailyContent = (duration: number, topic: string): DailyContent[] => {
    return Array.from({ length: duration }, (_, i) => ({
        day: i + 1,
        lessonText: `Welcome to Day ${i + 1} of ${topic}. Today we will dive deeper into the core concepts and practices that will help you master this skill. Remember, consistency is key to growth.`,
        taskPrompt: `Complete the daily exercise for Day ${i + 1}. Reflect on your progress and share a key takeaway with the community.`,
        audioUrl: '/mock-audio.mp3',
        submissionType: 'text' // Default
    }));
};

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
    approved: true, // Approved so she can create sprints
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
      id: "coach-tom",
      name: "Coach Tom",
      email: "tom.roberts@vectorise.com",
      role: UserRole.COACH,
      roleDefinitionId: "role_head_coach",
      profileImageUrl: "https://randomuser.me/api/portraits/men/46.jpg",
      bio: "Productivity expert and author. I help you get more done in less time.",
      niche: "Productivity",
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
    savedSprintIds: ['sprint2', 'sprint4'],
    enrolledSprintIds: ['sprint1', 'sprint4', 'sprint9'],
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
    occupation: 'employed',
    incomeBracket: 'low'
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
    enrolledSprintIds: [],
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
  },
  {
    id: '3OAhjywfNyeW1AOOOzcYJw1DPpd2',
    name: 'New Coach',
    email: 'new.coach@vectorise.com',
    role: UserRole.COACH,
    roleDefinitionId: 'role_head_coach',
    profileImageUrl: 'https://picsum.photos/seed/newcoach/200',
    bio: 'A new coach, ready to inspire.',
    niche: 'General',
    approved: true,
  }
];

export const MOCK_REFERRALS: Referral[] = [
    {
        id: 'ref1',
        referrerId: 'participant1',
        refereeName: 'Musa',
        refereeAvatar: 'https://i.pravatar.cc/150?u=musa',
        status: 'joined',
        sprintName: 'Clarity Challenge',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'ref2',
        referrerId: 'participant1',
        refereeName: 'Chidi',
        refereeAvatar: 'https://i.pravatar.cc/150?u=chidi',
        status: 'started_sprint',
        sprintName: 'Purpose Sprint',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'ref3',
        referrerId: 'participant1',
        refereeName: 'Seyi',
        refereeAvatar: 'https://i.pravatar.cc/150?u=seyi',
        status: 'completed_week_1',
        sprintName: 'Mindfulness Habit',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'ref4',
        referrerId: 'participant1',
        refereeName: 'Zainab',
        refereeAvatar: 'https://i.pravatar.cc/150?u=zainab',
        status: 'joined',
        sprintName: 'Digital Detox',
        timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
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
    },
    {
        id: 'rew3',
        type: 'mini_guide',
        title: 'Guide: Holding Space for Others',
        description: 'A simple guide on how to support friends on their growth journey.',
        unlocked: false,
        requiredReferrals: 5,
        rewardPoints: 10
    },
    {
        id: 'rew4',
        type: 'achievement',
        title: 'Community Leader Badge',
        description: 'Exclusive badge on your profile and access to the "Leaders Circle" tribe.',
        unlocked: false,
        requiredReferrals: 10,
        rewardPoints: 50
    }
];

export const MOCK_SPRINTS: Sprint[] = [
  {
    id: 'sprint1',
    coachId: '3OAhjywfNyeW1AOOOzcYJw1DPpd2',
    title: '7-Day Clarity Challenge',
    description: 'A high-impact sprint to cut through the noise and define your most important goals for the next 90 days.',
    category: 'Productivity',
    difficulty: 'Beginner',
    duration: 7,
    price: 3000,
    pointCost: 6,
    coverImageUrl: 'https://picsum.photos/seed/sprint1/800/400',
    published: true,
    approvalStatus: 'approved',
    dailyContent: [
      { day: 1, lessonText: `Welcome! Today is about understanding your "Why".`, taskPrompt: 'Write down your top 3 values.', audioUrl: '/mock-audio.mp3', submissionType: 'text' },
      { day: 2, lessonText: `Let's identify your energy drains.`, taskPrompt: 'List 5 things that drained your energy this week.', audioUrl: '/mock-audio.mp3', submissionType: 'text' },
      { day: 3, lessonText: 'Visualize your ideal future.', taskPrompt: 'Describe your perfect day in detail.', audioUrl: '/mock-audio.mp3', submissionType: 'text' },
      { day: 4, lessonText: 'Breaking down big goals.', taskPrompt: 'Choose one big goal. Upload a PDF or Image of your breakdown strategy.', audioUrl: '/mock-audio.mp3', submissionType: 'file' },
      { day: 5, lessonText: 'The power of "No".', taskPrompt: 'Identify one thing you will say "no" to this week.', audioUrl: '/mock-audio.mp3', submissionType: 'text' },
      { day: 6, lessonText: 'Building your support system.', taskPrompt: 'Reach out to one person who supports you and thank them.', audioUrl: '/mock-audio.mp3', submissionType: 'text' },
      { day: 7, lessonText: 'Your 90-Day Action Plan.', taskPrompt: 'Outline your main goal and first 3 actions for the next 90 days.', audioUrl: '/mock-audio.mp3', submissionType: 'both' },
    ],
  },
  {
    id: 'sprint2',
    coachId: 'coach1',
    title: '21-Day Mindfulness Habit',
    description: 'Build a sustainable mindfulness practice in just 21 days. Designed for busy professionals.',
    category: 'Personal Fitness',
    difficulty: 'Intermediate',
    duration: 22,
    price: 7500,
    pointCost: 15,
    coverImageUrl: 'https://picsum.photos/seed/sprint2/800/400',
    published: false,
    approvalStatus: 'draft',
    dailyContent: generateDailyContent(22, 'Mindfulness')
  },
  {
    id: 'sprint3',
    coachId: '3OAhjywfNyeW1AOOOzcYJw1DPpd2',
    title: 'Launch Your Side Hustle',
    description: 'From idea to first dollar in 14 days. A practical guide for aspiring entrepreneurs.',
    category: 'Skill Acquisition',
    difficulty: 'Advanced',
    duration: 14,
    price: 20000,
    pointCost: 40,
    coverImageUrl: 'https://picsum.photos/seed/sprint3/800/400',
    published: true,
    approvalStatus: 'approved',
    dailyContent: [
        { day: 1, lessonText: 'Idea Validation.', taskPrompt: 'Upload your business model canvas.', audioUrl: '/mock-audio.mp3', submissionType: 'file' },
        ...generateDailyContent(13, 'Business Launch').map(d => ({ ...d, day: d.day + 1 }))
    ]
  },
  {
    id: 'sprint4',
    coachId: '3OAhjywfNyeW1AOOOzcYJw1DPpd2',
    title: 'Digital Detox',
    description: 'Reclaim your time and attention span with this 7-day digital detox program.',
    category: 'Personal Fitness',
    difficulty: 'Beginner',
    duration: 7,
    price: 4000,
    pointCost: 8,
    coverImageUrl: 'https://picsum.photos/seed/sprint4/800/400',
    published: true,
    approvalStatus: 'approved',
    dailyContent: generateDailyContent(7, 'Digital Wellbeing')
  },
  {
    id: 'sprint5',
    coachId: 'coach3',
    title: 'LinkedIn Authority',
    description: 'Optimize your profile and start creating content that attracts high-ticket opportunities.',
    category: 'Personal Branding',
    difficulty: 'Intermediate',
    duration: 14,
    price: 10000,
    pointCost: 20,
    coverImageUrl: 'https://picsum.photos/seed/branding1/800/400',
    published: true,
    approvalStatus: 'approved',
    dailyContent: generateDailyContent(14, 'LinkedIn Growth')
  },
  {
    id: 'sprint6',
    coachId: 'coach2',
    title: 'The Art of Storytelling',
    description: 'Learn how to captivate your audience by telling compelling stories. Perfect for leaders, marketers, and creators.',
    category: 'Personal Branding',
    difficulty: 'Intermediate',
    duration: 10,
    price: 8000,
    pointCost: 16,
    coverImageUrl: 'https://picsum.photos/seed/story1/800/400',
    published: false,
    approvalStatus: 'pending_approval',
    dailyContent: generateDailyContent(10, 'Storytelling')
  },
  {
    id: 'sprint7',
    coachId: 'coach3',
    title: 'Scaling Your Sales Funnel',
    description: 'A deep dive into building and optimizing sales funnels that convert. For advanced business owners.',
    category: 'Skill Acquisition',
    difficulty: 'Advanced',
    duration: 30,
    price: 25000,
    pointCost: 50,
    coverImageUrl: 'https://picsum.photos/seed/sales1/800/400',
    published: false,
    approvalStatus: 'pending_approval',
    dailyContent: generateDailyContent(30, 'Sales Funnels')
  },
    {
    id: 'sprint8',
    coachId: 'coach2',
    title: 'Financial Habits for Creatives',
    description: 'Manage your finances like a pro without sacrificing your creative freedom. For freelancers and artists.',
    category: 'Productivity',
    difficulty: 'Beginner',
    duration: 14,
    price: 5000,
    pointCost: 10,
    coverImageUrl: 'https://picsum.photos/seed/finance1/800/400',
    published: false,
    approvalStatus: 'pending_approval',
    dailyContent: generateDailyContent(14, 'Financial Habits')
  },
  {
    id: 'sprint9',
    coachId: 'coach-tom',
    title: 'Productivity Power-Up',
    description: 'A 5-day sprint to help you build a productivity system that works for you.',
    category: 'Productivity',
    difficulty: 'Beginner',
    duration: 5,
    price: 5000,
    pointCost: 10,
    coverImageUrl: 'https://picsum.photos/seed/sprint9/800/400',
    published: true,
    approvalStatus: 'approved',
    dailyContent: generateDailyContent(5, 'Productivity')
  }
];

export let MOCK_PARTICIPANT_SPRINTS: ParticipantSprint[] = [
    {
        id: 'enrollment1',
        sprintId: 'sprint1',
        participantId: 'participant1',
        startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        progress: [
            { day: 1, completed: true, submission: 'My values are growth, connection, and impact.', completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
            { day: 2, completed: true, submission: 'Endless meetings and social media scrolling.', completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
            { day: 3, completed: true, submission: 'My perfect day involves creative work, nature, and time with loved ones.', completedAt: new Date().toISOString() },
            { day: 4, completed: false }, 
            { day: 5, completed: false },
            { day: 6, completed: false },
            { day: 7, completed: false },
        ]
    },
    {
        id: 'enrollment3',
        sprintId: 'sprint4',
        participantId: 'participant1',
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        progress: Array.from({ length: 7 }, (_, i) => ({ day: i + 1, completed: false }))
    },
    {
        id: 'enrollment4',
        sprintId: 'sprint9',
        participantId: 'participant1',
        startDate: new Date().toISOString(),
        progress: Array.from({ length: 5 }, (_, i) => ({ day: i + 1, completed: false }))
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
    content: `Just finished Day 3 of the Clarity Challenge! Realized that my biggest energy drain is actually perfectionism, not my workload. Feeling lighter already. ✨`,
    sprintTitle: '7-Day Clarity Challenge',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likes: 12,
    comments: 3,
    isLiked: true,
    isSaved: false,
    commentData: [
        { id: 'c1', userId: 'coach1', userName: 'Alex Morgan', userAvatar: 'https://picsum.photos/seed/coach1/200', content: 'That is a huge breakthrough Jamie! Keep that momentum.', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
        { id: 'c2', userId: 'user_xyz', userName: 'Sarah Chen', userAvatar: 'https://i.pravatar.cc/150?u=sarah', content: 'I needed to hear this today. Perfectionism is my enemy too.', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
        { id: 'c3', userId: 'user_abc', userName: 'Marcus J.', userAvatar: 'https://i.pravatar.cc/150?u=marcus', content: '💯 Keep going!', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() }
    ]
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: 'n0',
        type: 'referral_update',
        text: 'Seyi just finished Week 1 — your influence is growing.',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        read: false
    }
];

export const MOCK_REVIEWS: Review[] = [
    {
        id: 'rev1',
        sprintId: 'sprint1',
        userId: 'user_xyz',
        userName: 'Sarah Chen',
        userAvatar: 'https://i.pravatar.cc/150?u=sarah',
        rating: 5,
        comment: "This sprint completely changed how I approach my mornings. Highly recommended!",
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'rev2',
        sprintId: 'sprint1',
        userId: 'user_abc',
        userName: 'Marcus J.',
        userAvatar: 'https://i.pravatar.cc/150?u=marcus',
        rating: 4,
        comment: "Great content, very actionable. I just wished there was more video content.",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'rev3',
        sprintId: 'sprint4',
        userId: 'participant1',
        userName: 'Jamie Lee',
        userAvatar: 'https://picsum.photos/seed/participant1/200',
        rating: 5,
        comment: "The Digital Detox was exactly what I needed. Feeling so much more present.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
];

export const MOCK_COACHING_COMMENTS: CoachingComment[] = [
    {
        id: 'cc1',
        sprintId: 'sprint1',
        day: 1,
        participantId: 'participant1',
        authorId: 'participant1',
        content: 'Hi Alex! I struggled a bit with defining my values today. Is it okay if I have 5 instead of 3?',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        read: true
    },
    {
        id: 'cc2',
        sprintId: 'sprint1',
        day: 1,
        participantId: 'participant1',
        authorId: 'coach1',
        content: `Hi Jamie! Absolutely. The number isn't as important as the clarity. If 5 feels right, go with 5. You can always narrow it down later if you feel the need for more focus.`,
        timestamp: new Date(Date.now() - 3.9 * 24 * 60 * 60 * 1000).toISOString(),
        read: true
    },
    {
        id: 'cc3',
        sprintId: 'sprint1',
        day: 3,
        participantId: 'participant1',
        authorId: 'participant1',
        content: 'Visualizing the perfect day made me realize how much time I waste on commuting. Going to look for remote options.',
        timestamp: new Date().toISOString(),
        read: false
    }
];
