
export enum UserRole {
  COACH = 'COACH',
  PARTICIPANT = 'PARTICIPANT',
  ADMIN = 'ADMIN',
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
  baseRole: UserRole; // Determines the dashboard layout (Coach vs Admin vs Participant)
  permissions: Permission[];
  isSystem?: boolean; // System roles cannot be deleted
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleDefinitionId?: string; // Link to custom role definition
  profileImageUrl: string;
  enrolledSprintIds?: string[];
}

export interface Coach extends User {
  role: UserRole.COACH;
  bio: string;
  niche: string;
  approved: boolean;
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
  rewardPoints?: number; // Points awarded when unlocked
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
  // Demographics for pricing
  occupation?: 'student' | 'employed' | 'self_employed' | 'unemployed';
  incomeBracket?: 'low' | 'mid' | 'high'; // low <50k, mid 50-150k, high >150k
  
  bio?: string;
  followers?: number;
  following?: number;
  savedSprintIds?: string[];
  
  // New Activity Tracking Fields
  enrolledSprintIds?: string[];
  shinePostIds?: string[];
  shineCommentIds?: string[];

  // New fields for Account Switching
  hasCoachProfile?: boolean;
  coachBio?: string;
  coachNiche?: string;
  coachApproved?: boolean; // Approval status for participant-turned-coach
  
  // Referral & Subscription System
  referralCode?: string;
  walletBalance?: number; // Growth Points/Credits
  subscription?: {
      planId: SubscriptionTierId;
      active: boolean;
      renewsAt: string;
  };
  impactStats?: {
      peopleHelped: number;
      streak: number; // e.g. months active
  };
}

// FIX: Add Admin interface to correctly handle users with the ADMIN role.
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

export interface Sprint {
  id: string;
  coachId: string;
  title: string;
  description: string;
  category: string;
  difficulty: SprintDifficulty;
  duration: number;
  price: number;
  pointCost?: number; // Cost in Growth Points
  coverImageUrl: string;
  published: boolean;
  approvalStatus: SprintApprovalStatus; // New field for workflow
  dailyContent: DailyContent[];
}

export interface ParticipantSprint {
    id: string; // Unique enrollment ID
    sprintId: string;
    participantId: string;
    startDate: string; // ISO string
    progress: {
        day: number;
        completed: boolean;
        submission?: string;
        submissionFileUrl?: string;
        completedAt?: string; // Timestamp of completion
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
  timestamp: string; // ISO string
  likes: number;
  comments: number;
  isLiked?: boolean;
  isSaved?: boolean;
  commentData?: ShineComment[];
}

export interface Notification {
  id: string;
  type: 'shine_like' | 'shine_comment' | 'sprint_update' | 'follow' | 'announcement' | 'referral_update';
  text: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

// New Types for Reviews and Coaching
export interface Review {
    id: string;
    sprintId: string;
    userId: string;
    userName: string;
    userAvatar: string;
    rating: number; // 1-5
    comment: string;
    timestamp: string;
}

export interface CoachingComment {
    id: string;
    sprintId: string;
    day: number;
    participantId: string; // The student involved
    authorId: string; // Who wrote this message (Coach or Student)
    content: string;
    timestamp: string;
    read: boolean;
}

// New Types for General Chat
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string; // ISO string
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: {
    userId: string;
    name: string;
    avatar: string;
  }[];
  groupName?: string;
  groupAvatar?: string;
  lastMessage: Message;
  unreadCount: number;
}
