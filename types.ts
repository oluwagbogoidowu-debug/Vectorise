
export enum UserRole {
  COACH = 'COACH',
  PARTICIPANT = 'PARTICIPANT',
  ADMIN = 'ADMIN',
}

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

// FIX: Exported SprintDifficulty to satisfy imports in coach pages
export type SprintDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

// FIX: Added SprintTargeting interface for program matching logic
export interface SprintTargeting {
  persona: string;
  p1: string;
  p2: string;
  p3: string;
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
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  dailyContent: DailyContent[];
  updatedAt?: string;
  createdAt?: string;
  outcomes?: string[];
  
  // REGISTRY STRUCTURAL FIELDS
  transformation?: string;
  forWho?: string[];
  notForWho?: string[];
  methodSnapshot?: { verb: string; description: string }[];
  protocol?: 'One action per day' | 'Guided task' | 'Challenge-based';

  // ORCHESTRATION FIELDS
  actionsPerDay?: number;
  effortLevel?: EffortLevel;
  type?: SprintType;
  compatibleStages?: LifecycleStage[];
  entryConditions?: string[];
  primaryOutcome?: string;
  evidenceProduced?: EvidenceType;
  pendingChanges?: Partial<Sprint>;

  // FIX: Added missing structural fields used in registry and targeting
  sprintType?: 'Foundational' | 'Execution' | 'Skill';
  targeting?: SprintTargeting;

  // REVIEW FEEDBACK (Mapping section keys to Admin comments)
  reviewFeedback?: Record<string, string>;
}

export interface LifecycleSlot {
  id: string;
  stage: LifecycleStage;
  type: SprintType;
  name: string;
  required: boolean;
  maxCount: number;
}

export interface LifecycleSlotAssignment {
  id: string;
  slotId: string;
  sprintId: string;
  segment?: 'Students' | 'NYSC' | 'Early Career' | 'Founders';
  active: boolean;
}

export interface DailyContent {
  day: number;
  lessonText: string;
  audioUrl?: string;
  taskPrompt: string;
  resourceUrl?: string;
  submissionType?: 'text' | 'file' | 'both' | 'none';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImageUrl: string;
  createdAt?: string;
  // FIX: Added roleDefinitionId for permissions check
  roleDefinitionId?: string;
}

export interface Participant extends User {
  role: UserRole.PARTICIPANT;
  currentStage?: LifecycleStage;
  completedSlotIds?: string[];
  activeSprintId?: string;
  walletBalance?: number;
  referralCode?: string;
  impactStats?: { peopleHelped: number; streak: number };
  wishlistSprintIds?: string[];
  enrolledSprintIds?: string[];
  claimedMilestoneIds?: string[];
  // FIX: Added missing properties for engagement, profiles and onboarding
  shinePostIds?: string[];
  shineCommentIds?: string[];
  savedSprintIds?: string[];
  bio?: string;
  intention?: string;
  onboardingAnswers?: Record<number, string>;
  persona?: string;
  occupation?: string;
  subscription?: {
    planId: string;
    active: boolean;
    renewsAt: string;
  };
  followers?: number;
  following?: number;
  interests?: string[];
  // FIX: Added coach onboarding fields to Participant for role transition
  hasCoachProfile?: boolean;
  coachBio?: string;
  coachNiche?: string;
  coachApproved?: boolean;
}

export interface Coach extends User {
  role: UserRole.COACH;
  bio: string;
  niche: string;
  approved: boolean;
  // FIX: Added mirroring properties for profile updates
  hasCoachProfile?: boolean;
  coachBio?: string;
  coachNiche?: string;
  coachApproved?: boolean;
  applicationDetails?: any;
}

export interface Admin extends User {
  role: UserRole.ADMIN;
}

export interface PlatformPulse {
  activeUsers24h: number;
  totalEnrollments24h: number;
  atRiskCount: number;
  revenue24h: number;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  baseRole: UserRole;
  permissions: string[];
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  baseRole: UserRole;
  permissions: string[];
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

// FIX: Added missing exported types used in services and components
export type Permission = string;

export type NotificationType = 
  | 'sprint_day_unlocked' 
  | 'payment_success' 
  | 'coach_message' 
  | 'sprint_completed' 
  | 'referral_update' 
  | 'shine_interaction'
  | 'sprint_nudge';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
  readAt?: string | null;
  expiresAt?: string | null;
  context?: any;
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

export interface ParticipantSprint {
  id: string;
  sprintId: string;
  participantId: string;
  startDate: string;
  sentNudges?: number[];
  progress: {
    day: number;
    completed: boolean;
    completedAt?: string;
    submission?: string;
    submissionFileUrl?: string;
  }[];
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeName: string;
  refereeAvatar?: string;
  sprintName?: string;
  status: 'joined' | 'started_sprint' | 'completed_week_1' | 'completed_sprint';
  timestamp: string;
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
  sprintTitle?: string;
  commentData?: ShineComment[];
}

export interface ShineComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'milestone' | 'referral' | 'purchase';
  description: string;
  auditId?: string;
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

export type EventType = 'task_submitted' | 'sprint_enrolled' | 'feedback_sent' | 'login' | 'page_view';

export interface UserEvent {
  id: string;
  userId: string;
  eventType: EventType;
  sprintId?: string;
  dayNumber?: number;
  timestamp: string;
  metadata?: any;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'churned';

export interface UserAnalytics {
  userId: string;
  lastActive: string;
  riskLevel: RiskLevel;
  engagementScore: number;
  dropOffProbability: number;
  currentCycleLabels: string[];
  updatedAt: string;
}

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

export interface NotificationPayload {
  title: string;
  body: string;
}
