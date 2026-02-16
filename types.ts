
export enum UserRole {
  COACH = 'COACH',
  PARTICIPANT = 'PARTICIPANT',
  ADMIN = 'ADMIN',
  PARTNER = 'PARTNER',
}

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
  user_id: string;
  trigger: OrchestrationTrigger;
  input_focus: string;
  resolved_sprint_id: string;
  slot_id: string;
  timestamp: string;
}

export interface PaymentAttempt {
  id?: string;
  user_id: string;
  sprint_id: string;
  amount: number;
  status: PaymentAttemptStatus;
  failure_reason?: string;
  timestamp: string;
}

export interface ParticipantSprint {
  id: string;
  sprint_id: string;
  user_id: string;
  coach_id: string;
  started_at: string;
  price_paid: number;
  payment_source: PaymentSource;
  status: 'active' | 'completed' | 'paused';
  completed_at?: string | null;
  last_activity_at?: string;
  referral_source?: string | null;
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
  /* Added missing occupation field */
  occupation?: string;
  createdAt: string;
  interests?: string[];
  followers?: number;
  following?: number;
  isPartner?: boolean;
  partnerData?: any;
  referralFirstTouch?: string | null;
}

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

export interface Admin extends User {
  role: UserRole.ADMIN;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  baseRole: UserRole;
  permissions: string[] | Permission[];
}

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

export interface ShineComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
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

export interface GlobalOrchestrationSettings {
  focusOptions: string[];
  triggerActions: Record<string, OrchestrationAction>;
  microSelectors: MicroSelector[];
}

export interface OrchestrationAction {
  type: 'show_micro_selector' | 'recommend_sprint';
  value: string;
}

export interface MicroSelector {
  id: string;
  stage: LifecycleStage;
  steps: MicroSelectorStep[];
}

export interface MicroSelectorStep {
  question: string;
  options: {
    label: string;
    action: 'next_step' | 'skip_to_stage' | 'finish_and_recommend' | 'trigger_action';
    value: string;
  }[];
}

export interface PlatformPulse {
  activeUsers24h: number;
  totalEnrollments24h: number;
  atRiskCount: number;
  revenue24h: number;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

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

export interface NotificationPayload {
  title: string;
  body: string;
}

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
