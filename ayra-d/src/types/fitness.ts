// =============================================================================
// FITSITEGONGA - Production Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// USER & AUTH
// -----------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: 'CLIENT' | 'TRAINER' | 'ADMIN';
  membership_tier: 'FREE' | 'PAID';
  subscription_status?: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';
  trial_ends_at?: string;
  fitness_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  body_weight?: number;
  body_weight_unit?: 'LBS' | 'KG';
  goals: string[];
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// CHALLENGES (Original System)
// -----------------------------------------------------------------------------

interface Challenge {
  id: string;
  name: string;
  description?: string;
  category: 'STRENGTH' | 'CARDIO' | 'NUTRITION' | 'CUSTOM';
  type: 'DURATION' | 'REPETITION' | 'DISTANCE' | 'CUSTOM';
  goal_value: number;
  goal_unit: string;
  start_date: string;
  end_date: string;
  created_by: string;
  is_active: boolean;
  participants: string[];
  created_at: string;
}

interface ProgressLog {
  id: string;
  user_id: string;
  challenge_id: string;
  value: number;
  unit: string;
  notes?: string;
  photo_url?: string;
  logged_at: string;
  created_at: string;
  user?: User;
  challenge?: Challenge;
}

interface ProgressReaction {
  id: string;
  reaction: string;
  user_id?: string;
}

interface ProgressEntryProps {
  log: ProgressLog;
  user: User;
  onReact: (reaction: string) => void;
  onComment: (comment: string) => void;
  canEdit?: boolean;
  reactions?: ProgressReaction[];
}

interface ProgressFeedProps {
  logs: ProgressLog[];
  onReact: (logId: string, reaction: string) => void;
  onComment: (logId: string, comment: string) => void;
  currentUserId: string;
}

// -----------------------------------------------------------------------------
// ACHIEVEMENTS
// -----------------------------------------------------------------------------

type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'LEGENDARY';
type AchievementCategory = 'WORKOUT' | 'CONSISTENCY' | 'MILESTONE' | 'SOCIAL';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  category: AchievementCategory;
  criteria: {
    workout_count?: number;
    streak_days?: number;
    distance_miles?: number;
    group_challenges?: number;
    encouragements?: number;
    users_helped?: number;
  };
  created_at: string;
}

interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_date: string;
  progress_value?: number;
  achievement?: Achievement;
}

// -----------------------------------------------------------------------------
// LIFT TRACKING (The Forge)
// -----------------------------------------------------------------------------

type WeightUnit = 'LBS' | 'KG';
type LiftTrend = 'up' | 'down' | 'stable';

interface TrackedLift {
  id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  working_weight: number;
  working_unit: WeightUnit;
  one_rep_max: number | null;
  goal_weight: number | null;
  goal_date: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Computed from API
  bestSet?: {
    weight: number;
    reps: number;
    estimated_1rm: number;
    date: string;
  };
  lastSet?: {
    weight: number;
    reps: number;
    date: string;
    formatted: string;
  };
  trend?: LiftTrend;
  totalSets?: number;
}

interface SetLog {
  id: string;
  lift_id: string;
  user_id: string;
  weight: number;
  reps: number;
  unit: WeightUnit;
  rpe: number | null;
  tempo: string | null;
  rest_time: number | null;
  set_number: number | null;
  is_warmup: boolean;
  is_pr: boolean;
  estimated_1rm: number | null;
  volume: number | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
}

type GoalType = 'ONE_REP_MAX' | 'WORKING_WEIGHT' | 'VOLUME' | 'CONSISTENCY' | 'REPS';
type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'PAUSED';

interface LiftGoal {
  id: string;
  lift_id: string;
  user_id: string;
  goal_type: GoalType;
  target_value: number;
  current_value: number;
  timeframe_days: number | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

// Active session (client-side)
interface ActiveSet {
  id: string;
  weight: number;
  reps: number;
  rpe?: number;
  isWarmup: boolean;
  isPR: boolean;
  timestamp: Date;
  restTime?: number;
}

interface LiftSession {
  liftId: string;
  exerciseId: string;
  exerciseName: string;
  sets: ActiveSet[];
  startTime: Date;
  endTime?: Date;
  notes?: string;
}

// -----------------------------------------------------------------------------
// WORKOUT PLANNING
// -----------------------------------------------------------------------------

type WorkoutType = 'PUSH' | 'PULL' | 'LEGS' | 'UPPER' | 'LOWER' | 'FULL_BODY' | 'CARDIO' | 'REST' | 'CUSTOM';
type WorkoutStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'RESCHEDULED';

interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: WorkoutType;
  exercises: {
    exercise_id: string;
    sets: number;
    reps_min: number;
    reps_max: number;
    rest_seconds: number;
  }[];
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ScheduledWorkout {
  id: string;
  user_id: string;
  template_id: string | null;
  scheduled_for: string;
  day_of_week: number | null;
  is_recurring: boolean;
  status: WorkoutStatus;
  started_at: string | null;
  completed_at: string | null;
  template?: WorkoutTemplate;
}

// -----------------------------------------------------------------------------
// MESSAGING (The Nexus)
// -----------------------------------------------------------------------------

type ChannelType = 'GLOBAL' | 'SQUAD' | 'DIRECT' | 'TRAINER';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: User['role'];
  };
  channel_type: ChannelType;
  squad_id: string | null;
  recipient_id: string | null;
  parent_id: string | null;
  media_urls: string[];
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  created_at: string;
  reactions: MessageReaction[];
  _count?: { replies: number };
}

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  user: { id: string; display_name: string };
}

// -----------------------------------------------------------------------------
// SQUADS (Alpha Squads)
// -----------------------------------------------------------------------------

type SquadVisibility = 'PUBLIC' | 'INVITE_ONLY' | 'PRIVATE';
type SquadRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

interface Squad {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  owner?: User;
  visibility: SquadVisibility;
  max_members: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  memberCount?: number;
  unreadCount?: number;
  role?: SquadRole;
}

interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: SquadRole;
  joined_at: string;
  notifications_enabled: boolean;
  user?: User;
}

interface SquadInvite {
  id: string;
  squad_id: string;
  inviter_id: string;
  invitee_id: string;
  status: InviteStatus;
  created_at: string;
  responded_at: string | null;
  squad?: Squad;
  inviter?: User;
}

// -----------------------------------------------------------------------------
// SOCIAL (Friendships & Trainer Links)
// -----------------------------------------------------------------------------

type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';
type TrainerClientStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'ENDED';

interface Friendship {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: FriendshipStatus;
  initiated_by: string;
  accepted_at: string | null;
  created_at: string;
  friend?: User; // The other user
}

interface TrainerClient {
  id: string;
  trainer_id: string;
  client_id: string;
  status: TrainerClientStatus;
  can_view_progress: boolean;
  can_create_workouts: boolean;
  can_modify_goals: boolean;
  started_at: string;
  ended_at: string | null;
  trainer?: User;
  client?: User;
}

// -----------------------------------------------------------------------------
// TRI-SECTOR SIDEBAR STATE
// -----------------------------------------------------------------------------

type SectorId = 'nexus' | 'forge' | 'identity';

type NexusPanel = 'global-feed' | 'trainer-link' | 'alpha-squads';
type ForgePanel = 'active-lifts' | 'week-planner' | 'challenges';
type IdentityPanel = 'profile' | 'friends' | 'settings';

type SidebarPanel = NexusPanel | ForgePanel | IdentityPanel;

interface SidebarState {
  activeSector: SectorId;
  activePanel: SidebarPanel;
  notifications: {
    nexus: number;
    forge: number;
    identity: number;
  };
}

// -----------------------------------------------------------------------------
// API RESPONSES
// -----------------------------------------------------------------------------

interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// -----------------------------------------------------------------------------
// FORM TYPES
// -----------------------------------------------------------------------------

interface CreateLiftForm {
  exercise_id: string;
  exercise_name: string;
  working_weight: number;
  working_unit: WeightUnit;
  goal_weight?: number;
  goal_date?: string;
}

interface LogSetForm {
  weight: number;
  reps: number;
  unit: WeightUnit;
  rpe?: number;
  tempo?: string;
  rest_time?: number;
  set_number?: number;
  is_warmup: boolean;
  notes?: string;
}

interface LogSessionForm {
  exercise_id: string;
  sets: LogSetForm[];
  notes?: string;
  start_time: string;
  end_time: string;
}

interface CreateSquadForm {
  name: string;
  description?: string;
  visibility: SquadVisibility;
  max_members: number;
}

interface SendMessageForm {
  content: string;
  channel_type: ChannelType;
  squad_id?: string;
  recipient_id?: string;
  parent_id?: string;
  media_urls?: string[];
}

// -----------------------------------------------------------------------------
// REALTIME EVENTS
// -----------------------------------------------------------------------------

interface MessageEvent {
  type: 'message:global' | 'message:squad' | 'message:direct';
  message: Message;
}

interface ReactionEvent {
  type: 'message:reaction';
  messageId: string;
  emoji: string;
  userId: string;
  action: 'added' | 'removed';
}

interface SquadEvent {
  type: 'squad:invite' | 'squad:member-joined' | 'squad:member-left';
  squadId: string;
  userId: string;
}

interface LiftEvent {
  type: 'lift:pr' | 'lift:session-complete';
  liftId: string;
  userId: string;
  data: Record<string, unknown>;
}

type RealtimeEvent = MessageEvent | ReactionEvent | SquadEvent | LiftEvent;

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const ACHIEVEMENT_TIERS = {
  BRONZE: { color: '#cd7f32', bgColor: '#cd7f3220' },
  SILVER: { color: '#c0c0c0', bgColor: '#c0c0c020' },
  GOLD: { color: '#ffd700', bgColor: '#ffd70020' },
  PLATINUM: { color: '#e5e4e2', bgColor: '#e5e4e220' },
  DIAMOND: { color: '#b9f2ff', bgColor: '#b9f2ff20' },
  LEGENDARY: { color: '#ff6b6b', bgColor: '#ff6b6b20' },
} as const;

const CHALLENGE_CATEGORIES = {
  STRENGTH: { icon: '💪', color: '#ff6b6b', name: 'Strength' },
  CARDIO: { icon: '🏃', color: '#4ecdc4', name: 'Cardio' },
  NUTRITION: { icon: '🥗', color: '#45b7d1', name: 'Nutrition' },
  CUSTOM: { icon: '🎯', color: '#96ceb4', name: 'Custom' },
} as const;

const SECTOR_COLORS = {
  nexus: '#10b981',    // Emerald/Green
  forge: '#a855f7',    // Purple
  identity: '#06b6d4', // Cyan
} as const;

const WORKOUT_TYPES = {
  PUSH: { icon: '💪', color: '#ef4444', name: 'Push' },
  PULL: { icon: '🔙', color: '#3b82f6', name: 'Pull' },
  LEGS: { icon: '🦵', color: '#22c55e', name: 'Legs' },
  UPPER: { icon: '⬆️', color: '#f59e0b', name: 'Upper' },
  LOWER: { icon: '⬇️', color: '#06b6d4', name: 'Lower' },
  FULL_BODY: { icon: '🏋️', color: '#8b5cf6', name: 'Full Body' },
  CARDIO: { icon: '🏃', color: '#ec4899', name: 'Cardio' },
  REST: { icon: '😴', color: '#6b7280', name: 'Rest' },
  CUSTOM: { icon: '⚙️', color: '#64748b', name: 'Custom' },
} as const;