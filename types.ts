
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
export type PaymentSource = 'direct' | 'influencer' | 'coin' | 'free_first_sprint' | 'cash';
// Added 'successful' to match backend usage and fix comparison errors in services/paymentService.ts
export type PaymentAttemptStatus = 'pending' | 'success' | 'successful' | 'failed' | 'refunded' | 'abandoned';

export type SprintDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface TrafficRecord {
  id: string;
  anonymous_id: string | null;
  session_id: string;
  user_id?: string | null; // This will be the email once identified
  uid?: string | null; // The original Firebase UID
  email?: string | null;
  source: string;
  medium: string;
  campaign?: string | null;
  partner_code?: string | null;
  landing_page: string;
  referrer_url: string;
  user_agent: string;
  device_type: 'mobile' | 'desktop' | 'tablet';
  geography?: string; // Approx from browser/IP
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  anonymous_id: string | null;
  session_id: string;
  user_id?: string | null; // This will be the email once identified
  uid?: string | null; // The original Firebase UID
  email?: string | null;
  event_name: string;
  event_properties: any;
  page_url: string;
  scroll_depth?: number; // percentage
  dwell_time?: number; // seconds
  created_at: string;
}

export interface UserSessionReport {
  anonymous_id: string | null;
  session_id: string;
  email?: string | null;
  user_id?: string | null;
  traffic: TrafficRecord;
  events: AnalyticsEvent[];
  totalDwellTime: number;
  maxScrollDepth: number;
  hasPaid: boolean;
  conversionPath: string[]; // Sequential list of core events
}

export interface IdentityReport {
  identifier: string; // email if available, else anonymous_id
  anonymous_id: string | null;
  email?: string | null;
  user_id?: string | null;
  firstTouch: TrafficRecord;
  lastActiveAt: string;
  totalSessions: number;
  totalEvents: number;
  hasPaid: boolean;
  sessions: UserSessionReport[];
  enrollments: ParticipantSprint[];
}

export interface FunnelStats {
  visitors: number;
  sprintViews: number;
  paymentIntents: number;
  successPayments: number;
  completions: number;
  activeUserList?: { id: string; label: string; lastActive: string }[];
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  sprintId?: string;
  trackId?: string;
  sprintTitle: string;
  amount: number;
  currency: string;
  status: PaymentAttemptStatus;
  paymentProvider: string;
  txRef: string;
  paymentMethod: string;
  initiatedAt: string;
  completedAt?: string | null;
  failureReason?: string | null;
  isTest: boolean;
}

export interface FinancialStats {
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  totalRefunds: number;
  successRate: number;
  failureRate: number;
  dropOffRate: number;
  arpu: number;
}

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
  focusOptionPriorityMap?: Record<string, string[]>;
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
  sprint_id?: string;
  track_id?: string;
  amount: number;
  currency: string;
  status: PaymentAttemptStatus;
  failure_reason?: string;
  timestamp: string;
}

export interface ParticipantSprintRun {
  runNumber: number;
  started_at: string;
  completed_at?: string | null;
  status: 'active' | 'completed';
  progress: {
    day: number;
    completed: boolean;
    completedAt?: string;
    submission?: string;
    submissionFileUrl?: string;
    proofSelection?: string;
    answers?: string[];
    answersMap?: Record<string, string>;
  }[];
}

export interface ParticipantSprint {
  id: string;
  sprint_id: string;
  user_id: string;
  coach_id: string;
  started_at: string;
  price_paid: number;
  currency: string;
  payment_source: PaymentSource;
  status: 'active' | 'completed' | 'paused' | 'queued';
  completed_at?: string | null;
  last_activity_at?: string;
  referral_source?: string | null;
  sentNudges?: number[];
  soundDisabled?: boolean;
  notificationsDisabled?: boolean;
  isCommissionTrigger?: boolean; 
  checkInReminderEnabled?: boolean;
  checkInHistory?: { day: number; timestamp: string }[];
  currentRun?: number;
  runNumber?: number;
  pastRuns?: ParticipantSprintRun[];
  progress: {
    day: number;
    completed: boolean;
    completedAt?: string;
    submission?: string;
    submissionFileUrl?: string;
    proofSelection?: string;
    answers?: string[];
    answersMap?: Record<string, string>;
  }[];
}

export interface DynamicSection {
  id: string;
  title: string;
  body: string;
  type?: 'text' | 'list';
}

export type ExperienceContentType = 'sprint' | 'blog' | 'ignite' | 'challenge';

export interface BaseExperience {
  id: string;
  coachId: string;
  title: string;
  subtitle?: string;
  description: string;
  contentType?: ExperienceContentType;
  category: string; // The subcategory (e.g. Mindset, Execution, Micro-Habits, Influence, etc.)
  subcategory?: string;
  coverImageUrl: string;
  price: number;
  currency: string;
  duration: number;
  published: boolean;
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
  rating?: number;
  averageRating?: number;
  reviewsCount?: number;
  totalRatings?: number;
  totalRatingSum?: number;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface SprintDetails {
  outcomes?: string[];
  transformation?: string;
  forWho?: string[];
  notForWho?: string[];
  methodSnapshot?: { verb: string; description: string }[];
  protocol?: 'One action per day' | 'Guided task' | 'Challenge-based';
  outcomeTag?: string;
  outcomeStatement?: string;
  sprintType?: 'Fundamentals' | 'Core' | 'Expert' | 'Foundational' | 'Execution' | 'Skill';
  difficulty?: SprintDifficulty;
  dynamicSections?: DynamicSection[];
  checkInReminder?: boolean;
  checkInReminderDays?: number;
  curriculumSource?: string;
  parentSprintId?: string;
  isVersion?: boolean;
  versionNumber?: number;
  versionTag?: string;
}

export interface RiseBlogDetails {
  blogBody?: string;
  blogImage?: string;
  readTime?: string;
  audience?: string[];
  likes?: number;
  authorName?: string;
  authorRole?: string;
  authorAvatar?: string;
}

export interface IgniteDetails {
  igniteBody?: string;
  igniteBgColor?: string;
  igniteDate?: string;
  likes?: number;
}

export interface ChallengeDetails {
  name?: string;
  whatToDo?: string;
  howOften?: string;
  howLong?: string;
  completionCriteria?: string;
  whyDoIt?: string;
}

export interface InteractionUser {
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  role?: string;
  timestamp: string;
  action?: 'view' | 'like' | 'read';
  durationSeconds?: number;
}

export interface Sprint {
  id: string;
  trackId?: string;
  coachId: string;
  title: string;
  subtitle?: string;
  actionTrigger?: string;
  description: string; 
  category: string;
  subcategory?: string;
  difficulty?: SprintDifficulty;
  audience?: string[];
  overrideOrchestrator?: boolean;
  overrideOrder?: number;
  nextSprintId?: string;
  linkedSprintId?: string;
  duration: number;
  price: number;
  currency: string;
  pointCost?: number;
  pricingType?: 'cash' | 'credits';
  coverImageUrl: string;
  published: boolean;
  deleted?: boolean; 
  curriculumSource?: string; 
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
  rating?: number;
  averageRating?: number;
  reviewsCount?: number;
  totalRatings?: number;
  totalRatingSum?: number;
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
  sprintType?: 'Fundamentals' | 'Core' | 'Expert' | 'Foundational' | 'Execution' | 'Skill';
  reviewFeedback?: Record<string, string>;
  pendingChanges?: Partial<Sprint>;
  targeting?: any;
  dynamicSections?: DynamicSection[];
  checkInReminder?: boolean;
  checkInReminderDays?: number;
  parentSprintId?: string;
  isVersion?: boolean;
  versionNumber?: number;
  versionTag?: string;
  contentType?: 'sprint' | 'blog' | 'ignite' | 'challenge';
  blogBody?: string;
  blogImage?: string;
  igniteBody?: string;
  igniteBgColor?: string;
  igniteDate?: string; // Format: YYYY-MM-DD
  challengeData?: {
    name?: string;
    whatToDo?: string;
    howOften?: string;
    howLong?: string;
    completionCriteria?: string;
    whyDoIt?: string;
  };
  likes?: number;
  views?: number;
  reads?: number;
  viewsCount?: number;
  likesCount?: number;
  readsCount?: number;
  viewedBy?: InteractionUser[];
  likedBy?: InteractionUser[];
  readBy?: InteractionUser[];
}

export interface TaskVideoConfig {
  url: string;
  start?: string | number;
  end?: string | number;
}

export interface DailyContent {
  day: number;
  lessonText: string;
  taskPrompt: string;
  taskPrompts?: string[];
  taskStepIds?: string[];
  taskHints?: string[];
  taskInputTypes?: ('text' | 'tags' | 'poll' | 'note' | 'mark' | 'none')[];
  taskMultiTextLabels?: string[][];
  taskPollOptions?: string[];
  taskPollOptionLinks?: (string | null | undefined)[];
  taskLinkedToNext?: boolean[];
  taskLinkedSources?: number[][];
  taskNotes?: string[];
  taskTagNotes?: string[];
  taskTagNoteActive?: boolean[];
  taskFootnotes?: string[];
  taskVideos?: (TaskVideoConfig | null | undefined)[];
  taskPollMultiSelect?: boolean[];
  taskPollArrange?: boolean[];
  taskSpread?: boolean[];
  submissionType?: 'text' | 'file' | 'both' | 'none';
  submissionPrompt?: string;
  proofType?: 'picker' | 'note' | 'confirmation';
  mirrorActive?: boolean;
  mirrorIntro?: string;
  mirrorFraming?: string[];
  mirrorParaphrases?: string[];
  mirrorDisabledSteps?: boolean[];
  bridgeNote?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImageUrl: string;
  roleDefinitionId?: string;
  emailVerifiedConfirmed?: boolean;
  emailVerifiedOverride?: boolean;
  emailVerified?: boolean;
  defaultLoginMode?: 'COACH' | 'PARTICIPANT';
  coachApplicationSubmitted?: boolean;
  coachApplicationApproved?: boolean;
  coachApplicationNiche?: string;
  coachApplicationAnswers?: any;
  whatsappLinkClicked?: boolean;
  whatsappLinkClickedAt?: string;
  whatsappJoinedConfirmed?: boolean;
  whatsappJoinedConfirmedAt?: string;
}

export type UserNotificationState = 'New' | 'Active' | 'Pending' | 'Completed' | 'Inactive' | 'Dormant';

export interface Participant extends User {
  role: UserRole.PARTICIPANT | UserRole.PARTNER;
  currentStage?: LifecycleStage;
  referralCode?: string;
  referrerId?: string | null;
  walletBalance?: number;
  claimedMilestoneIds?: string[];
  onboardingAnswers?: Record<string, any>;
  metadata?: Record<string, any>;
  identificationData?: Record<string, any>;
  lifeStage?: string;
  currentGoal?: string;
  currentPriority?: string;
  desiredDirection?: string;
  strengths?: string[];
  intention?: string;
  archetype?: string;
  growthAreas?: string[];
  risePathway?: string;
  isIdentityComplete?: boolean;
  partnerCommissionClosed?: boolean;
  impactStats?: { peopleHelped: number; streak: number };
  occupation?: string;
  enrolledSprintIds: string[];
  shinePostIds: string[];
  shineCommentIds: string[];
  wishlistSprintIds: string[];
  savedSprintIds: string[];
  bio: string;
  persona: string;
  createdAt: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
  notificationState?: UserNotificationState;
  notificationsSentToday?: number;
  lastNotificationSentAt?: string;
  notificationsDisabled?: boolean;
  notifiedStreakMilestones?: number[];
  pushSubscription?: PushSubscriptionJSON;
  fcmToken?: string;
  claimedBadges?: {
    milestoneId: string;
    claimedAt: string;
    claimedCredit: number;
    processed: boolean;
  }[];
  blogReadsCount?: number;
  blogReadIds?: string[];
  rewardedBlogIds?: string[];
  claimedBlogRewardCycles?: number;
  interests?: string[];
  followers?: number;
  following?: number;
  isPartner?: boolean;
  partnerData?: any;
  referralFirstTouch?: string | null;
  pushPermissionDeniedCount?: number;
  pushPermissionLastDeniedAt?: string;
  pushPermissionConsecutiveDeniedDays?: number;
  pushPermissionLastRequestAt?: string;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
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

export type NotificationType = 'sprint_day_unlocked' | 'payment_success' | 'coach_message' | 'sprint_completed' | 'referral_update' | 'shine_interaction' | 'sprint_nudge' | 'system_alert' | 'sprint_started';

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
  readAt?: null | string;
  pushSent?: boolean;
  pushFailed?: boolean;
  lastPushError?: string;
  retryCount?: number;
  nextRetryAt?: any;
  context?: any;
  bypassActiveCheck?: boolean;
  pushOnly?: boolean;
  inAppDisabled?: boolean;
  data?: {
    title: string;
    body: string;
    tag: string;
    url: string;
  };
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
  prompt?: string;
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

export interface Track {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  sprintIds: string[];
  discountPercentage: number;
  coverImageUrl: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  currency: string;
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

export interface SprintLink {
  id: string;
  sourceSprintId: string;
  optionCode: string;
  optionText: string;
  targetSprintId: string;
  createdAt: string;
}

export interface SprintBlogLink {
  id: string;
  sourceSprintId: string;
  optionCode: string;
  optionText: string;
  targetBlogId: string;
  createdAt: string;
}

export interface UserIdentificationRule {
  id: string;
  sourceSprintId: string;
  optionCode: string;
  optionText?: string;
  targetField: string;
  targetCategory?: string;
  valueToSave?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserIdentificationEntry {
  field: string;
  value: any;
  optionCode?: string;
  optionText?: string;
  sourceSprintId?: string;
  sourceSprintTitle?: string;
  capturedAt: string;
}

export interface SystemMetadataField {
  id: string;
  key: string;
  label: string;
  category: string;
  aliases: string[];
  placeholderSample: string;
  description?: string;
  icon?: string;
  isSystemDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}


