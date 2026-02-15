/**
 * LingoFriends - Pocketbase Collection Type Definitions
 * 
 * Typed interfaces for Pocketbase records that map to the game types.
 * These types represent the exact structure stored in Pocketbase collections.
 * 
 * @see docs/phase-1.1/task-1-1-7-pocketbase-schema.md
 * @see src/types/game.ts for game domain types
 */

import type { RecordModel } from 'pocketbase';
import type { 
  TreeStatus, 
  GiftType, 
  SkillPath,
  UserTree,
  GiftItem,
  GardenDecoration
} from './game';
import { LessonStatus } from './game';

// ============================================================================
// PROFILE RECORD
// ============================================================================

/**
 * Pocketbase profile record structure.
 * Extended with game fields for Phase 1.1.
 * 
 * API Rules:
 * - Read: Owner only
 * - Write: Owner only
 */
export interface ProfileRecord extends RecordModel {
  /** User ID this profile belongs to */
  user: string;
  
  /** Display name shown in app (the "username" kids see) */
  display_name: string;
  
  /** User's native language */
  native_language: string;
  
  /** Language being learned */
  target_language: string;
  
  /** Age group for content personalization */
  age_group: '7-10' | '11-14' | '15-18';
  
  /** CEFR proficiency level */
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  
  /** Learning goals from onboarding */
  goals: string[];
  
  /** User interests from onboarding */
  interests: string[];
  
  /** AI-detected personality traits */
  traits: Array<{
    category: 'personality' | 'learning_style' | 'strength' | 'struggle' | 'interest';
    label: string;
    description?: string;
  }>;
  
  /** Total XP earned (legacy, kept for backward compatibility) */
  xp: number;
  
  /** Daily XP earned today (legacy) */
  daily_xp_today: number;
  
  /** Daily XP cap */
  daily_cap: number;
  
  /** Current streak in days */
  streak: number;
  
  /** Last activity timestamp */
  last_activity: string;
  
  /** Whether onboarding is complete */
  onboarding_complete: boolean;
  
  // Subject-based learning fields (Phase 1 Task 5)
  subject_type?: 'language' | 'maths' | 'coding';
  target_subject?: string;
  selected_interests?: string[];
  
  // Game fields (Phase 1.1)
  /** Avatar type: fox, cat, panda, etc. */
  avatar?: 'fox' | 'cat' | 'panda' | 'rabbit' | 'owl' | 'bear' | 'deer' | 'squirrel';
  
  /** Avatar emoji for display */
  avatarEmoji?: string;
  
  /** Total Sun Drops balance */
  sunDrops: number;
  
  /** 6-character code for friend sharing */
  friendCode?: string;
  
  /** Count of pending gifts awaiting user action */
  giftsReceived: number;
  
  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// SKILL PATH RECORD
// ============================================================================

/**
 * Pocketbase skill_path record structure.
 * Predefined learning content created by admins.
 * 
 * API Rules:
 * - Read: Public (authenticated users)
 * - Write: Admin only
 */
export interface SkillPathRecord extends RecordModel {
  /** Display name (e.g., "Sports Talk") */
  name: string;
  
  /** Emoji icon */
  icon: string;
  
  /** Short description */
  description: string;
  
  /** Difficulty category */
  category: 'beginner' | 'intermediate' | 'advanced';
  
  /** Target language code (fr, es, de, en) */
  language: string;
  
  /** Array of lesson definitions */
  lessons: SkillPathLessonJSON[];
  
  // Timestamps
  created: string;
  updated: string;
}

/**
 * Lesson definition as stored in skill_path.lessons JSON.
 * This is the "template" - a UserTree tracks progress.
 */
export interface SkillPathLessonJSON {
  /** Lesson identifier */
  id: string;
  
  /** Display title */
  title: string;
  
  /** Emoji icon */
  icon: string;
  
  /** Vocabulary covered in this lesson */
  vocabulary?: string[];
  
  /** Number of activities in this lesson */
  activities: number;
  
  /** Maximum Sun Drops achievable */
  sunDropsMax?: number;
}

// ============================================================================
// USER TREE RECORD
// ============================================================================

/**
 * Pocketbase user_tree record structure.
 * Each tree represents a skill path the user is learning.
 * 
 * API Rules:
 * - Read: Owner only
 * - Write: Owner only
 */
export interface UserTreeRecord extends RecordModel {
  /** User who owns this tree */
  user: string;
  
  /** Skill path this tree represents */
  skillPath: string;
  
  /** Current growth status */
  status: TreeStatus;
  
  /** Health percentage (0-100) */
  health: number;
  
  /** Total Sun Drops earned on this tree */
  sunDropsTotal: number;
  
  /** Number of lessons completed */
  lessonsCompleted: number;
  
  /** Total lessons in skill path */
  lessonsTotal: number;
  
  /** Last time user reviewed/practiced */
  lastRefreshDate?: string;
  
  /** Position in garden grid */
  position: { x: number; y: number };
  
  /** IDs of decorations applied to this tree */
  decorations?: string[];
  
  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// GIFT RECORD
// ============================================================================

/**
 * Pocketbase gift record structure.
 * Gifts sent between friends for social features.
 * 
 * API Rules:
 * - Read: Sender or recipient only
 * - Create: Sender only
 * - Update: Recipient only (to apply)
 */
export interface GiftRecord extends RecordModel {
  /** Type of gift */
  type: GiftType;
  
  /** User who sent the gift */
  fromUser: string;
  
  /** User receiving the gift */
  toUser: string;
  
  /** Tree the gift was applied to (optional) */
  toItem?: string;
  
  /** Optional message from sender */
  message?: string;
  
  /** When sender earned/unlocked this gift */
  unlockedAt: string;
  
  /** When the gift was sent */
  sentAt: string;
  
  /** When the gift was applied (null if pending) */
  appliedAt?: string;
  
  // Timestamps
  created: string;
}

// ============================================================================
// DECORATION RECORD
// ============================================================================

/**
 * Pocketbase decoration record structure.
 * Garden customization items unlocked by users.
 * 
 * API Rules:
 * - Read: Owner only
 * - Write: Owner only
 */
export interface DecorationRecord extends RecordModel {
  /** User who owns this decoration */
  user: string;
  
  /** Type of decoration */
  itemType: 'hedge' | 'bench' | 'lantern' | 'pond' | 'fountain' | 'butterfly' | 'birdhouse' | 'flower_bed' | 'garden_gnome' | 'stepping_stone';
  
  /** Position in garden (null if not placed) */
  position?: { x: number; y: number };
  
  /** Whether decoration is placed in garden */
  placed: boolean;
  
  /** When decoration was unlocked */
  unlockedAt: string;
  
  // Timestamps
  created: string;
}

// ============================================================================
// DAILY PROGRESS RECORD
// ============================================================================

/**
 * Pocketbase daily_progress record structure.
 * Tracks daily learning activity and Sun Drops.
 * 
 * API Rules:
 * - Read: Owner only
 * - Write: Owner only
 */
export interface DailyProgressRecord extends RecordModel {
  /** User this record belongs to */
  user: string;
  
  /** Date of this progress record */
  date: string;
  
  /** Sun Drops earned today (max 50 daily cap) */
  sunDropsEarned: number;
  
  /** XP earned (legacy, being replaced by sunDropsEarned) */
  xp_earned: number;
  
  /** Number of lessons completed today */
  lessons_completed: number;
  
  /** Number of activities completed today */
  activities_completed: number;
  
  /** Time spent learning (seconds) */
  time_spent_seconds: number;
  
  /** Current streak in days */
  streak: number;
  
  /** Last activity timestamp */
  lastActivityDate?: string;
  
  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// SESSION RECORD
// ============================================================================

/**
 * Pocketbase session record structure.
 * Chat sessions for Main Hall and Lessons.
 * (Existing collection, documented here for completeness)
 */
export interface SessionRecord extends RecordModel {
  /** User who owns this session */
  user: string;
  
  /** Type of session */
  session_type: 'MAIN' | 'LESSON';
  
  /** Current status */
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  
  /** Session title */
  title: string;
  
  /** Learning objectives */
  objectives: string[];
  
  /** Chat messages */
  messages: Array<{
    id: string;
    text: string;
    sender: 'user' | 'ai' | 'system';
    timestamp: number;
    activity?: unknown;
    activityCompleted?: boolean;
  }>;
  
  /** Draft lesson being negotiated */
  draft?: {
    topic: string;
    userContext: string;
    objectives: string[];
    confidenceScore: number;
    missingInfo: string;
  } | null;
  
  /** Parent session ID for lesson sessions */
  parent_session?: string;
  
  /** Target language for this session */
  target_language: string;
  
  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// FRIENDSHIP RECORD
// ============================================================================

/**
 * Pocketbase friendship record structure.
 * Friend relationships between users.
 * (Existing collection, documented here for completeness)
 */
export interface FriendshipRecord extends RecordModel {
  /** First user in friendship */
  user_a: string;
  
  /** Second user in friendship */
  user_b: string;
  
  /** Status of friendship */
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  
  /** User who initiated the friendship request */
  initiated_by: string;
  
  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// FRIEND CODE RECORD
// ============================================================================

/**
 * Pocketbase friend_code record structure.
 * Temporary codes for adding friends.
 * (Existing collection, documented here for completeness)
 */
export interface FriendCodeRecord extends RecordModel {
  /** User who owns this code */
  user: string;
  
  /** 6-character shareable code */
  code: string;
  
  /** When code expires */
  expires_at: string;
  
  // Timestamps
  created: string;
}

// ============================================================================
// AI PROFILE FIELD RECORD
// ============================================================================

/**
 * Pocketbase ai_profile_field record structure.
 * Facts learned about the user during conversations.
 * (Existing collection, documented here for completeness)
 */
export interface AIProfileFieldRecord extends RecordModel {
  /** User this fact belongs to */
  user: string;
  
  /** Field name (e.g., "favorite_kpop_group") */
  field_name: string;
  
  /** Field value (e.g., "BTS") */
  field_value: string;
  
  /** Confidence score (0.0 to 1.0) */
  confidence: number;
  
  /** Session where this was learned */
  source_session?: string;
  
  /** When this fact was learned */
  learned_at: string;
  
  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// VOCABULARY RECORD
// ============================================================================

/**
 * Pocketbase vocabulary record structure.
 * Words learned by user for spaced repetition.
 * (Existing collection, documented here for completeness)
 */
export interface VocabularyRecord extends RecordModel {
  /** User who learned this word */
  user: string;
  
  /** The word/phrase in target language */
  term: string;
  
  /** Translation in user's native language */
  translation: string;
  
  /** Target language code */
  language: string;
  
  /** Context where word was learned */
  context?: string;
  
  /** Number of times word has been shown */
  times_seen: number;
  
  /** Number of correct answers */
  times_correct: number;
  
  /** Last review date */
  last_reviewed?: string;
  
  /** Next review date (for SRS) */
  next_review?: string;
  
  /** Growth stage (0-5 for tree visualization) */
  growth_stage: number;
  
  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Pocketbase UserTreeRecord to domain UserTree type.
 */
export function userTreeRecordToUserTree(record: UserTreeRecord): UserTree {
  return {
    id: record.id,
    skillPathId: record.skillPath,
    name: '', // Populated by joining with skill_paths
    icon: '', // Populated by joining with skill_paths
    status: record.status,
    health: record.health,
    lastRefreshDate: record.lastRefreshDate || record.created,
    sunDropsTotal: record.sunDropsTotal,
    lessonsCompleted: record.lessonsCompleted,
    lessonsTotal: record.lessonsTotal,
    position: record.position,
    decorations: record.decorations || [],
    giftsReceived: [], // Populated by separate query
  };
}

/**
 * Convert Pocketbase GiftRecord to domain GiftItem type.
 */
export function giftRecordToGiftItem(record: GiftRecord): GiftItem {
  return {
    id: record.id,
    type: record.type,
    fromUserId: record.fromUser,
    fromUserName: '', // Populated by joining with profiles
    appliedDate: record.appliedAt,
  };
}

/**
 * Convert Pocketbase SkillPathRecord to domain SkillPath type.
 */
export function skillPathRecordToSkillPath(record: SkillPathRecord): SkillPath {
  return {
    id: record.id,
    name: record.name,
    icon: record.icon,
    description: record.description,
    category: record.category,
    lessons: record.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      icon: lesson.icon,
      status: LessonStatus.LOCKED, // Default, computed per-user
      stars: 0, // Default, computed per-user
      sunDropsEarned: 0, // Default, computed per-user
      sunDropsMax: lesson.sunDropsMax || lesson.activities * 4, // Estimate
      completedDate: undefined,
    })),
  };
}

/**
 * Convert Pocketbase DecorationRecord to domain GardenDecoration type.
 */
export function decorationRecordToGardenDecoration(record: DecorationRecord): GardenDecoration {
  return {
    id: record.id,
    itemType: record.itemType,
    position: record.position || { x: 0, y: 0 },
  };
}