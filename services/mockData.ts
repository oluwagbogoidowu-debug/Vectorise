
import { UserRole, Coach, Participant, Admin, RoleDefinition, Sprint, LifecycleStage, LifecycleSlot, SprintType, ParticipantSprint, Referral, ShinePost, CoachingComment } from '../types';

export const FOCUS_OPTIONS = [
  "Get clarity on my career direction",
  "Build real-world skills before graduation",
  "Prepare for internships or entry roles",
  "Turn an interest into a real project",
  "Explore entrepreneurship seriously"
];

// USER DEFINED HIERARCHY MAPPING - EXACT LIST
export const CATEGORY_TO_STAGE_MAP: Record<string, LifecycleStage> = {
    // 01. Foundation: Stabilising the person before direction or action.
    'Mindset': 'Foundation',
    'Self-Belief': 'Foundation',
    'Self-Trust': 'Foundation',
    'Limiting Beliefs': 'Foundation',
    'Emotional Resilience': 'Foundation',
    'Emotional Intelligence': 'Foundation',
    'Inner Work': 'Foundation',
    'Mental Fitness': 'Foundation',
    'Wellness': 'Foundation',
    'Health': 'Foundation',
    'Lifestyle': 'Foundation',
    'Stress Management': 'Foundation',
    'Energy Management': 'Foundation',
    'Burnout Recovery': 'Foundation',
    'Faith-Based': 'Foundation',
    'Inner Peace': 'Foundation',
    'Growth Fundamentals': 'Foundation', // Platform Core
    'Core Platform Sprint': 'Foundation', // Platform Core

    // 02. Direction: Helping people understand who they are and where they’re headed.
    'Life': 'Direction',
    'Self-Discovery': 'Direction',
    'Identity': 'Direction',
    'Purpose': 'Direction',
    'Vision': 'Direction',
    'Clarity': 'Direction',
    'Purpose Alignment': 'Direction',
    'Meaning': 'Direction',
    'Consciousness': 'Direction',

    // 03. Execution: Doing the work daily and building momentum.
    'Productivity': 'Execution',
    'Performance': 'Execution',
    'High Performance': 'Execution',
    'Focus': 'Execution',
    'Discipline': 'Execution',
    'Consistency': 'Execution',
    'Habits': 'Execution',
    'Accountability': 'Execution',
    'Time Management': 'Execution',

    // 04. Proof: Turning effort into visible capability and outcomes.
    'Career': 'Proof',
    'Professional Development': 'Proof',
    'Leadership': 'Proof',
    'Executive Development': 'Proof',
    'Transition': 'Proof',
    'Work-Life Balance': 'Proof',

    // 05. Positioning: How value is expressed, communicated, and perceived.
    'Communication': 'Positioning',
    'Interpersonal Skills': 'Positioning',
    'Boundaries': 'Positioning',
    'Conflict Resolution': 'Positioning',
    'Connection': 'Positioning',
    'Personal Branding': 'Positioning',
    'Visibility': 'Positioning',
    'Expression': 'Positioning',
    'Thought Leadership': 'Positioning',
    'Content Creation': 'Positioning',

    // 06. Stability: Making progress sustainable and financially grounded.
    'Business': 'Stability',
    'Entrepreneurship': 'Stability',
    'Startup': 'Stability',
    'Founder': 'Stability',
    'Solopreneur': 'Stability',
    'Money Mindset': 'Stability',
    'Financial Empowerment': 'Stability',
    'Wealth Mindset': 'Stability',

    // 07. Expansion: Rebuilding, scaling, or evolving into a new chapter.
    'Creativity': 'Expansion',
    'Life Transitions': 'Expansion',
    'Reinvention': 'Expansion',
    'Change': 'Expansion',
    'Reset': 'Expansion',
    'Growth': 'Expansion',
    'Transformation': 'Expansion',
    'Relationships': 'Expansion'
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_TO_STAGE_MAP).sort();

export const LIFECYCLE_STAGES_CONFIG: Record<LifecycleStage, { subtitle: string; description: string }> = {
    'Foundation': {
        subtitle: '01. Foundation',
        description: 'Stabilising the person before direction or action.'
    },
    'Direction': {
        subtitle: '02. Direction',
        description: 'Helping people understand who they are and where they’re headed.'
    },
    'Execution': {
        subtitle: '03. Execution',
        description: 'Doing the work daily and building momentum.'
    },
    'Proof': {
        subtitle: '04. Proof',
        description: 'Turning effort into visible capability and outcomes.'
    },
    'Positioning': {
        subtitle: '05. Positioning',
        description: 'How value is expressed, communicated, and perceived.'
    },
    'Stability': {
        subtitle: '06. Stability',
        description: 'Making progress sustainable and financially grounded.'
    },
    'Expansion': {
        subtitle: '07. Expansion',
        description: 'Rebuilding, scaling, or evolving into a new chapter.'
    }
};

export const LIFECYCLE_SLOTS: LifecycleSlot[] = [
    // Foundation uniquely has both Clarity and Orientation
    { id: 'slot_found_clarity', stage: 'Foundation', type: 'Execution', name: 'Clarity', required: true, maxCount: 1 },
    { id: 'slot_found_orient', stage: 'Foundation', type: 'Diagnostic', name: 'Orientation', required: true, maxCount: 1 },
    
    // All others have singular slots for mapping
    { id: 'slot_dir_primary', stage: 'Direction', type: 'Narrowing', name: 'Mapping Slot', required: true, maxCount: 1 },
    { id: 'slot_exec_primary', stage: 'Execution', type: 'Execution', name: 'Mapping Slot', required: true, maxCount: 1 },
    { id: 'slot_proof_primary', stage: 'Proof', type: 'Expression', name: 'Mapping Slot', required: true, maxCount: 1 },
    { id: 'slot_pos_primary', stage: 'Positioning', type: 'Expression', name: 'Mapping Slot', required: true, maxCount: 1 },
    { id: 'slot_stab_primary', stage: 'Stability', type: 'Stabilization', name: 'Mapping Slot', required: true, maxCount: 1 },
    { id: 'slot_exp_primary', stage: 'Expansion', type: 'Expression', name: 'Mapping Slot', required: true, maxCount: 1 }
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

export const MOCK_SPRINTS: Sprint[] = [];

export const MOCK_USERS: (Coach | Participant | Admin)[] = [
  {
    id: 'admin1',
    name: 'Platform Controller',
    email: 'admin@vectorise.com',
    role: UserRole.ADMIN,
    profileImageUrl: 'https://picsum.photos/seed/admin1/200',
  }
];

export const MOCK_PARTICIPANT_SPRINTS: ParticipantSprint[] = [];
export const MOCK_PAYOUTS: any[] = [];
export const MOCK_REFERRALS: Referral[] = [];
export const MOCK_SHINE_POSTS: ShinePost[] = [];
export const MOCK_COACHING_COMMENTS: CoachingComment[] = [];
