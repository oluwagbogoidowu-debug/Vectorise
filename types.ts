export enum UserRole {
  COACH = 'COACH',
  PARTICIPANT = 'PARTICIPANT',
  ADMIN = 'ADMIN',
  PARTNER = 'PARTNER',
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

export type SprintDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface LifecycleSlot {
  id: string;
  stage: LifecycleStage;
  type: SprintType;
  name: string;
  required: boolean;
  maxCount: number;
}

export interface LifecycleSlotAssignment {
  sprintId: string;
  focusCriteria: string[];
}

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

  actionsPerDay?: number;
  effortLevel?: EffortLevel;
  type?: SprintType;
  compatibleStages?: LifecycleStage[];
  entryConditions?: string[];
  primaryOutcome?: string;
  evidenceProduced?: EvidenceType;
  pendingChanges?: Partial<Sprint>;

  sprintType?: 'Foundational' | 'Execution' | 'Skill';
  targeting?: SprintTargeting;

  reviewFeedback?: Record<string, string>;
}

export interface DailyContent {
  day: number;
  lessonText: string;
  audioUrl?: string;
  taskPrompt: string;
  resourceUrl?: string;
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
  createdAt?: string;
  roleDefinitionId?: string;
  isPartner?: boolean;
  partnerData?: any;
}

export interface Participant extends User {
  role: UserRole.PARTICIPANT | UserRole.PARTNER;
  currentStage?: LifecycleStage;
  completedSlotIds?: string[];
  activeSprintId?: string;
  walletBalance?: number;
  referralCode?: string;
  impactStats?: { peopleHelped: number; streak: number };
  wishlistSprintIds?: string[];
  enrolledSprintIds?: string[];
  claimedMilestoneIds?: string[];
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
  hasCoachProfile?: boolean;
  coachBio?: string;
  coachNiche?: string;
  coachApproved?: boolean;
  applicationDetails?: any;
}

export interface Admin extends User {
  role: UserRole.ADMIN;
}

export interface ParticipantSprint {
  id: string;
  sprintId: string;
  participantId: string;
  startDate: string;
  sentNudges?: number[];
  reflectionsDisabled?: boolean;
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

export type NotificationType = 
  | 'sprint_day_unlocked' 
  | 'payment_success' 
  | 'coach_message' 
  | 'sprint_completed' 
  | 'referral_update' 
  | 'shine_interaction' 
  | 'sprint_nudge'
  | 'shine_reflection'
  | 'shine_interaction';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  actionUrl?: string | null;
  context?: any;
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

export interface Quote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export type Permission = string;

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

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeName: string;
  refereeAvatar?: string;
  sprintId?: string;
  sprintName?: string;
  status: 'joined' | 'started_sprint' | 'completed_week_1' | 'completed_sprint';
  timestamp: string;
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
  agreedToRewards: boolean;
  agreedToRecommendations: boolean;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}