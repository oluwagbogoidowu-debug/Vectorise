
export enum UserRole {
  COACH = 'COACH',
  PARTICIPANT = 'PARTICIPANT',
  ADMIN = 'ADMIN',
  PARTNER = 'PARTNER',
}

// Add Permission type
export type Permission = string;

export type LifecycleStage = 
  | 'Foundation' 
  | 'Direction' 
  | 'Execution' 
  | 'Proof' 
  | 'Positioning' 
  | 'Stability' 
  | 'Expansion';

export type SprintType = 
  | 'Diagnostic' 
  | 'Narrowing' 
  | 'Execution' 
  | 'Expression' 
  | 'Stabilization';

export type EffortLevel = 'Low' | 'Medium' | 'High';
export type EvidenceType = 'decision' | 'artifact' | 'habit';
export type PaymentSource = 'direct' | 'influencer' | 'coin';
export type PaymentAttemptStatus = 'initiated' | 'processing' | 'failed' | 'abandoned' | 'successful';

export type SprintDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface LifecycleSlot {
  id: string;
  stage: LifecycleStage;
  type: SprintType;
  name: string;
  required: boolean;
  maxCount: number;
}

export type OrchestrationTrigger = 
  | 'after_homepage'
  | 'skip_clarity'
  | 'payment_hesitation'
  | 'after_1_sprint'
  | 'after_1_paid_sprint'
  | 'after_2_sprints'
  | 'after_2_paid_sprints'
  | 'after_3_sprints';

export interface LifecycleSlotAssignment {
  sprintId: string;
  sprintIds?: string[];
  focusCriteria: string[];
  sprintFocusMap?: Record<string, string[]>;
  stateTrigger?: OrchestrationTrigger; 
  availableFocusOptions?: string[];
}

export interface OrchestratorLog {
  id?: string;
  userId: string;
  trigger: OrchestrationTrigger;
  inputFocus: string;
  resolvedSprintId: string;
  slotId: string;
  timestamp: string;
}

export interface PaymentAttempt {
  id?: string;
  userId: string;
  sprintId: string;
  amount: number;
  status: PaymentAttemptStatus;
  failureReason?: string;
  timestamp: string;
}

export interface ParticipantSprint {
  id: string;
  sprintId: string;
  participantId: string;
  coachId: string; // New: Direct tracking of responsible coach
  startDate: string;
  pricePaid: number; // New: Commercial truth
  paymentSource: PaymentSource; // New: Attribution
  referralSource?: string | null; // New: Influencer link
  status: 'active' | 'completed' | 'paused'; // New: Enforced status
  completedAt?: string | null; // New: Success timestamp
  lastActivityAt?: string; // New: Retention tracking
  sentNudges?: number[];
  reflectionsDisabled?: boolean;
  isCommissionTrigger?: boolean; 
  progress: {
    day: number;
    completed: boolean;
    completedAt?: string;
    submission?: string;
    submissionFileUrl?: string;
    reflection?: string;
    proofSelection?: string;
  }[];
}

// Update Sprint with pendingChanges and targeting
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
  deleted?: boolean; 
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
  dailyContent: DailyContent[];
  updatedAt?: string;
  createdAt?: string;
  outcomes?: string[];
  transformation?: string;
  forWho?: string[];
  notForWho?: string[];
  methodSnapshot?: { verb: string; description: string }[];
  protocol?: 'One action per day' | 'Guided task' | 'Challenge-based';
  outcomeTag?: string; 
  outcomeStatement?: string;
  sprintType?: 'Foundational' | 'Execution' | 'Skill';
  reviewFeedback?: Record<string, string>;
  pendingChanges?: Partial<Sprint>;
  targeting?: any;
}

export interface DailyContent {
  day: number;
  lessonText: string;
  taskPrompt: string;
  coachInsight?: string;
  submissionType?: 'text' | 'file' | 'both' | 'none';
  proofType?: 'confirmation' | 'picker' | 'note';
  proofOptions?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImageUrl: string;
  roleDefinitionId?: string;
}

// Update Participant with missing properties
export interface Participant extends User {
  role: UserRole.PARTICIPANT | UserRole.PARTNER;
  currentStage?: LifecycleStage;
  referralCode?: string;
  referrerId?: string | null;
  walletBalance?: number;
  claimedMilestoneIds?: string[];
  onboardingAnswers?: Record<string, any>;
  intention?: string;
  partnerCommissionClosed?: boolean;
  impactStats?: { peopleHelped: number; streak: number };
  enrolledSprintIds: string[];
  shinePostIds: string[];
  shineCommentIds: string[];
  wishlistSprintIds: string[];
  savedSprintIds: string[];
  bio: string;
  persona: string;
  createdAt: string;
  interests?: string[];
  followers?: number;
  following?: number;
  isPartner?: boolean;
  partnerData?: any;
  referralFirstTouch?: string | null;
}

// Update Coach with missing properties
export interface Coach extends User {
  role: UserRole.COACH;
  niche: string;
  bio: string;
  approved: boolean;
  applicationDetails?: any;
  hasCoachProfile?: boolean;
  coachBio?: string;
  coachNiche?: string;
  coachApproved?: boolean;
}

// Add Admin
export interface Admin extends User {
  role: UserRole.ADMIN;
}

// Add RoleDefinition
export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  baseRole: UserRole;
  permissions: string[] | Permission[];
}

// Add NotificationType and update Notification
export type NotificationType = 'sprint_day_unlocked' | 'payment_success' | 'coach_message' | 'sprint_completed' | 'referral_update' | 'shine_interaction' | 'sprint_nudge';

export interface Notification {
  id: string;
  userId: string;
  type: string | NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
  expiresAt?: string | null;
  readAt?: string | null;
  context?: any;
}

// Add ShinePost
export interface ShinePost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isSaved: boolean;
  commentData: ShineComment[];
  sprintTitle?: string;
}

// Add ShineComment
export interface ShineComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
}

// Add CoachingComment
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

// Add Review
export interface Review {
  id: string;
  sprintId: string;
  participantId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  timestamp: string;
}

// Add GlobalOrchestrationSettings
export interface GlobalOrchestrationSettings {
  focusOptions: string[];
  triggerActions: Record<string, OrchestrationAction>;
  microSelectors: MicroSelector[];
}

// Add OrchestrationAction
export interface OrchestrationAction {
  type: 'show_micro_selector' | 'recommend_sprint';
  value: string;
}

// Add MicroSelector
export interface MicroSelector {
  id: string;
  stage: LifecycleStage;
  steps: MicroSelectorStep[];
}

// Add MicroSelectorStep
export interface MicroSelectorStep {
  question: string;
  options: {
    label: string;
    action: 'next_step' | 'skip_to_stage' | 'finish_and_recommend' | 'trigger_action';
    value: string;
  }[];
}

// Add PlatformPulse
export interface PlatformPulse {
  activeUsers24h: number;
  totalEnrollments24h: number;
  atRiskCount: number;
  revenue24h: number;
}

// Add Quote
export interface Quote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

// Add PartnerApplication
export interface PartnerApplication {
  id: string;
  fullName: string;
  email: string;
  country: string;
  primaryPlatform: string;
  platformLink: string;
  influenceTarget: string;
  commonRequests: string;
  whyPartner: string;
  introductionStrategy: string[];
  identityType: string;
  futureCoachIntent: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

// Add NotificationPayload
export interface NotificationPayload {
  title: string;
  body: string;
}

// Add UserEvent and EventType
export interface UserEvent {
  id?: string;
  userId: string;
  eventType: string | EventType;
  sprintId?: string;
  dayNumber?: number;
  timestamp: string;
  metadata?: any;
}

export type EventType = 'sprint_enrolled' | 'task_submitted' | 'feedback_sent' | 'sprint_completed';

// Add UserAnalytics and RiskLevel
export interface UserAnalytics {
  userId: string;
  lastActive: string;
  riskLevel: RiskLevel;
  engagementScore: number;
  dropOffProbability: number;
  currentCycleLabels: string[];
  updatedAt: string;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'churned';

// Add CoachAnalytics
export interface CoachAnalytics {
  coachId: string;
  masteryYield: number;
  supportVelocityHrs: number;
  slaComplianceRate: number;
  totalStudentsManaged: number;
  activeRiskSignals: string[];
  studentRetentionRate: number;
  recoveryYield: number;
  updatedAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeName: string;
  status: string;
  timestamp: string;
  refereeAvatar?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description: string;
  auditId?: string;
  timestamp: string;
}
