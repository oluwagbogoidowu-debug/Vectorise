
import { UserRole, Coach, Participant, Admin, RoleDefinition, Sprint, LifecycleStage, LifecycleSlot, SprintType, ParticipantSprint, Referral, ShinePost, CoachingComment } from '../types';

export const FOCUS_OPTIONS = [
  "Get clarity on my career direction",
  "Build real-world skills before graduation",
  "Prepare for internships or entry roles",
  "Turn an interest into a real project",
  "Explore entrepreneurship seriously"
];

export const LIFECYCLE_STAGES_CONFIG: Record<LifecycleStage, { description: string; notReadyFor: string; durationRange: string }> = {
    'Foundation': {
        description: 'Users here are uncertain, overwhelmed, or early.',
        notReadyFor: 'Optimize, brand, or specialize.',
        durationRange: '5–14 Days'
    },
    'Direction': {
        description: 'Users have core stability but need a specific target.',
        notReadyFor: 'Scaling or hiring.',
        durationRange: '7–21 Days'
    },
    'Execution': {
        description: 'Direction is set; velocity is the primary metric.',
        notReadyFor: 'Pivoting or rest.',
        durationRange: '14–30 Days'
    },
    'Proof': {
        description: 'Generating evidence and artifacts of mastery.',
        notReadyFor: 'Hiding or humility.',
        durationRange: '10–14 Days'
    },
    'Positioning': {
        description: 'Translating proof into a market-facing identity.',
        notReadyFor: 'Mass-marketing.',
        durationRange: '21–45 Days'
    },
    'Stability': {
        description: 'Systems and habits that protect the new position.',
        notReadyFor: 'Radical change.',
        durationRange: '30–60 Days'
    },
    'Expansion': {
        description: 'Leverage, networking, and scaling the proven model.',
        notReadyFor: 'Solitude.',
        durationRange: '60–90 Days'
    }
};

export const LIFECYCLE_SLOTS: LifecycleSlot[] = [
    { id: 'slot_found_1', stage: 'Foundation', type: 'Execution', name: 'Clarity Execution', required: true, maxCount: 1 },
    { id: 'slot_found_2', stage: 'Foundation', type: 'Diagnostic', name: 'Initial Orientation', required: true, maxCount: 1 },
    { id: 'slot_dir_1', stage: 'Direction', type: 'Narrowing', name: 'Path Identification', required: true, maxCount: 1 },
    { id: 'slot_exec_1', stage: 'Execution', type: 'Execution', name: 'High Velocity Cycle', required: true, maxCount: 1 },
    { id: 'slot_proof_1', stage: 'Proof', type: 'Expression', name: 'Artifact Generation', required: true, maxCount: 1 }
];

export const MOCK_ROLES: RoleDefinition[] = [
  {
    id: 'role_super_admin',
    name: 'Super Admin',
    description: 'Full access to all system features.',
    baseRole: UserRole.ADMIN,
    permissions: ['user:view', 'user:manage', 'role:manage', 'analytics:view', 'sprint:delete', 'community:moderate'],
  }
];

export const MOCK_SPRINTS: Sprint[] = [
  {
    id: 'sprint1',
    coachId: 'coach1',
    title: '7-Day Clarity Challenge',
    description: 'Find your purpose and set clear goals.',
    category: 'Clarity',
    difficulty: 'Beginner',
    duration: 7,
    price: 5000,
    coverImageUrl: 'https://picsum.photos/seed/sprint1/800/400',
    published: true,
    approvalStatus: 'approved',
    dailyContent: [],
    type: 'Diagnostic',
    compatibleStages: ['Foundation'],
    primaryOutcome: 'Validated Direction',
    evidenceProduced: 'decision'
  },
  {
    id: 'sprint2',
    coachId: 'coach2',
    title: 'Daily Execution Engine',
    description: 'Build the habit of deep work.',
    category: 'Productivity',
    difficulty: 'Intermediate',
    duration: 14,
    price: 7500,
    coverImageUrl: 'https://picsum.photos/seed/sprint2/800/400',
    published: true,
    approvalStatus: 'approved',
    dailyContent: [],
    type: 'Execution',
    compatibleStages: ['Foundation', 'Execution'],
    primaryOutcome: 'Deep Work Habit',
    evidenceProduced: 'habit'
  }
];

export const MOCK_USERS: (Coach | Participant | Admin)[] = [
  {
    id: 'admin1',
    name: 'Platform Controller',
    email: 'admin@vectorise.com',
    role: UserRole.ADMIN,
    profileImageUrl: 'https://picsum.photos/seed/admin1/200',
  }
];

// FIX: Exported missing mock data arrays required by various services
export const MOCK_PARTICIPANT_SPRINTS: ParticipantSprint[] = [];

export const MOCK_PAYOUTS: { id: string; coachId: string; amount: number; status: 'pending' | 'completed'; date: string }[] = [];

export const MOCK_REFERRALS: Referral[] = [];

export const MOCK_SHINE_POSTS: ShinePost[] = [];

export const MOCK_COACHING_COMMENTS: CoachingComment[] = [];
