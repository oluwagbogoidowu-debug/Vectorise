
export enum UserRole {
  COACH = 'COACH',
  PARTICIPANT = 'PARTICIPANT',
  ADMIN = 'ADMIN',
}

export type EventType = 
  | 'user_registered'
  | 'sprint_enrolled'
  | 'lesson_opened'
  | 'task_viewed'
  | 'task_submitted'
  | 'coaching_question_asked'
  | 'feedback_sent' // Coach action
  | 'sprint_edited' // Coach action
  | 'risk_flag_raised' // System event
  | 'reflection_shared'
  | 'wallet_credited'
  | 'wallet_debited'
  | 'session_start'
  | 'milestone_claimed'
  | 'payout_requested'
  | 'trigger_resolved_independently';

export interface UserEvent {
  id: string;
  userId: string; // Actor
  eventType: EventType;
  sprintId?: string;
  dayNumber?: number;
  timestamp: string;
  metadata?: {
      isResponseTrigger?: boolean;
      triggerId?: string; // Links response to trigger
      slaHrs?: number; // Configured SLA at time of trigger
      [key: string]: any;
  };
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface CoachAnalytics {
  coachId: string;
  masteryYield: number; // 0-1 (Success rate of students)
  supportVelocityHrs: number; // Avg response time
  slaComplianceRate: number; // % of triggers met within SLA
  totalStudentsManaged: number;
  activeRiskSignals: string[]; 
  studentRetentionRate: number;
  recoveryYield: number; // % of at-risk students recovered after response
  updatedAt: string;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'churned';

export interface UserAnalytics {
  userId: string;
  lastActive: string;
  riskLevel: RiskLevel;
  engagementScore: number; // 0-100
  dropOffProbability: number;
  currentCycleLabels: string[]; // e.g. ["Night Owl", "Fast Finisher"]
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number; // Positive for credit, negative for debit
  type: 'referral' | 'milestone' | 'purchase' | 'refund' | 'payout';
  description: string;
  timestamp: string;
  auditId: string; // Link to sprintId or referralId or payoutId
}

export interface PlatformPulse {
  activeUsers24h: number;
  totalEnrollments24h: number;
  atRiskCount: number;
  revenue24h: number;
}

export type Permission = 
  | 'sprint:create'
  | 'sprint:edit'
  | 'sprint:publish'
  | 'sprint:delete'
  | 'user:view'
  | 'user:manage'
  | 'role:manage'
  | 'analytics:view'
  | 'community:moderate';

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  baseRole: UserRole;
  permissions: Permission[];
  isSystem?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleDefinitionId?: string;
  profileImageUrl: string;
  createdAt?: string;
}

export interface CoachApplication {
  transformationDesc: string;
  successStory: string;
  predictableOutcomesCount: string;
  uniqueApproach: string;
  uniquePhilosophy: string;
  embodiedTraits: string;
  personalPractice: string;
  personalPracticeResults: string;
  currentPricing: string;
}

export interface Coach extends User {
  role: UserRole.COACH;
  bio: string;
  niche: string;
  approved: boolean;
  applicationDetails?: CoachApplication;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeName: string;
  refereeAvatar?: string;
  status: 'joined' | 'started_sprint' | 'completed_week_1' | 'completed_sprint';
  sprintName?: string;
  timestamp: string;
}

export interface ImpactReward {
  id: string;
  type: 'early_access' | 'reflection_prompt' | 'mini_guide' | 'achievement';
  title: string;
  description: string;
  unlocked: boolean;
  requiredReferrals: number;
  rewardPoints?: number;
}

export type SubscriptionTierId = 'free' | 'student' | 'basic' | 'pro' | 'premium';

export interface SubscriptionPlan {
  id: SubscriptionTierId;
  name: string;
  price: number;
  currency: string;
  description: string;
  includedDifficulties: SprintDifficulty[];
  monthlyPoints: number;
  features: string[];
  targetAudience?: string;
}

export interface Participant extends User {
  role: UserRole.PARTICIPANT;
  persona?: string;
  onboardingAnswers?: Record<string, string>;
  occupation?: 'student' | 'employed' | 'self_employed' | 'unemployed';
  bio?: string;
  intention?: string;
  interests?: string[];
  followers?: number;
  following?: number;
  savedSprintIds?: string[];
  wishlistSprintIds?: string[];
  enrolledSprintIds?: string[];
  shinePostIds?: string[];
  shineCommentIds?: string[];
  claimedMilestoneIds?: string[];
  hasCoachProfile?: boolean;
  coachBio?: string;
  coachNiche?: string;
  coachApproved?: boolean;
  coachApplicationDetails?: CoachApplication;
  referralCode?: string;
  walletBalance?: number;
  subscription?: {
      planId: SubscriptionTierId;
      active: boolean;
      renewsAt: string;
  };
  impactStats?: {
      peopleHelped: number;
      streak: number;
  };
}

export interface Admin extends User {
  role: UserRole.ADMIN;
}

export interface DailyContent {
  day: number;
  lessonText: string;
  audioUrl?: string;
  taskPrompt: string;
  resourceUrl?: string;
  submissionType?: 'text' | 'file' | 'both' | 'none';
}

export type SprintDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type SprintApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface SprintTargeting {
    persona: string;
    p1: string; // Question 1 for persona
    p2: string; // Question 2 for persona
    p3: string; // Question 3 for persona
    occupation: string;
}

export interface Sprint {
  id: string;
  coachId: string;
  title: string;
  description: string;
  category: string;
  difficulty: SprintDifficulty;
  duration: number;
  price: number;
  pointCost?: number;
  pricingType?: 'cash' | 'credits';
  coverImageUrl: string;
  published: boolean;
  approvalStatus: SprintApprovalStatus;
  dailyContent: DailyContent[];
  updatedAt?: string;
  createdAt?: string;
  outcomes?: string[];
  targeting?: SprintTargeting;
  pendingChanges?: Partial<Sprint>; // Staging area for unapproved updates
}

export interface ParticipantSprint {
    id: string;
    sprintId: string;
    participantId: string;
    startDate: string;
    sentNudges?: number[]; // Track days nudged (1, 2, 4, 7, 10, 15)
    progress: {
        day: number;
        completed: boolean;
        submission?: string;
        submissionFileUrl?: string;
        completedAt?: string;
        reflection?: string;
        isReflectionPublic?: boolean;
    }[];
}

export interface Payout {
  id: string;
  coachId: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed';
}

export interface ShineComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
}

export interface ShinePost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  sprintTitle?: string;
  timestamp: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
  isSaved?: boolean;
  commentData?: ShineComment[];
}

export type NotificationType = 
  | 'sprint_day_unlocked'
  | 'coach_message'
  | 'sprint_completed'
  | 'payment_success'
  | 'next_sprint_recommended'
  | 'referral_update'
  | 'shine_interaction'
  | 'system_announcement'
  | 'sprint_nudge';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
  context?: Record<string, any> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

export interface Review {
    id: string;
    sprintId: string;
    userId: string;
    userName: string;
    userAvatar: string;
    rating: number;
    comment: string;
    timestamp: string;
}

export interface CoachingComment {
    id: string;
    sprintId: string;
    day: number;
    participantId: string;
    authorId: string;
    content: string;
    timestamp: string;
    read: boolean;
}

export interface NotificationPayload {
  title: string;
  body: string;
}
