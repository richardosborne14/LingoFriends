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
import type {
  ChunkType,
  ChunkStatus,
  ChunkSlot,
  LexicalChunk,
  UserChunk,
  LearnerProfile,
  Topic,
  DetectedInterest,
  ProgressSnapshot,
} from './pedagogy';
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
  
  /** Gem currency balance for shop purchases */
  gems: number;
  
  /** Seeds earned from pathway completion (for sharing) */
  seeds: number;
  
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
// GARDEN OBJECT RECORD
// ============================================================================

/**
 * Pocketbase garden_object record structure.
 * Stores placed decorations in the 3D garden.
 * 
 * API Rules:
 * - Read: Owner only
 * - Write: Owner only
 */
export interface GardenObjectRecord extends RecordModel {
  /** User who owns this object */
  user: string;
  
  /** Object type identifier (matches ShopItem.id, e.g., "oak", "fountain") */
  object_id: string;
  
  /** Grid X position (0-11) */
  gx: number;
  
  /** Grid Z position (0-11) */
  gz: number;
  
  /** When the object was placed */
  placed_at: string;
  
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
 * Updated for per-tree SunDrops architecture (Task 1.1.19).
 */
export function userTreeRecordToUserTree(record: UserTreeRecord): UserTree {
  // Handle both old and new schema fields for migration compatibility
  const sunDropsEarned = (record as unknown as Record<string, unknown>).sunDropsEarned as number ?? record.sunDropsTotal ?? 0;
  
  return {
    id: record.id,
    userId: record.user,
    skillPathId: record.skillPath,
    name: '', // Populated by joining with skill_paths
    icon: '', // Populated by joining with skill_paths
    status: record.status,
    health: record.health,
    bufferDays: (record as unknown as Record<string, unknown>).bufferDays as number ?? 0,
    lastRefreshDate: record.lastRefreshDate || record.created,
    lastLessonDate: (record as unknown as Record<string, unknown>).lastLessonDate as string | undefined,
    sunDropsEarned,
    sunDropsTotal: record.sunDropsTotal,
    growthStage: calculateGrowthStage(sunDropsEarned),
    gridPosition: (record as unknown as Record<string, unknown>).gridPosition as { gx: number; gz: number } 
      ?? { gx: Math.floor(record.position.x / 50), gz: Math.floor(record.position.y / 50) },
    position: record.position,
    lessonsCompleted: record.lessonsCompleted,
    lessonsTotal: record.lessonsTotal,
    decorations: record.decorations || [],
    giftsReceived: [], // Populated by separate query
    createdAt: record.created,
    updatedAt: record.updated,
  };
}

/**
 * Calculate growth stage from SunDrops earned.
 * Mirrored from game.ts to avoid circular import.
 */
function calculateGrowthStage(sunDropsEarned: number): number {
  const thresholds = [0, 10, 25, 45, 70, 100, 140, 190, 250, 320, 400, 500, 620, 750, 900];
  for (let stage = thresholds.length - 1; stage >= 0; stage--) {
    if (sunDropsEarned >= thresholds[stage]) {
      return stage;
    }
  }
  return 0;
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

// ============================================================================
// PHASE 1.2: PEDAGOGY ENGINE COLLECTIONS
// ============================================================================

/**
 * Pocketbase topic record structure.
 * 
 * Topics are flexible pools of chunks (not fixed paths like Phase 1.1 skill_paths).
 * The Pedagogy Engine draws from topics based on learner interests and level.
 * 
 * API Rules:
 * - Read: Any authenticated user
 * - Write: Admin only (curated content)
 * 
 * @see docs/phase-1.2/task-1.2-1-learner-model-schema.md
 */
export interface TopicRecord extends RecordModel {
  /** Display name */
  name: string;
  
  /** Emoji icon */
  icon: string;
  
  /** Description for topic selection UI */
  description: string;
  
  /** Parent topic ID for hierarchical topics */
  parent_topic?: string;
  
  /** Target language code: fr, es, de, en */
  target_language: string;
  
  /** Difficulty range: "1-3" means beginner to intermediate */
  difficulty_range: string;
  
  /** Searchable tags for topic discovery */
  tags: string[];
  
  /** Number of chunks in this topic (denormalized) */
  chunk_count: number;
  
  // Timestamps
  created: string;
  updated: string;
}

/**
 * Pocketbase chunk_library record structure.
 * 
 * The master library of all lexical chunks. Chunks are the fundamental
 * content unit in the Lexical Approach - whole phrases/patterns that
 * native speakers retrieve as units.
 * 
 * API Rules:
 * - Read: Any authenticated user
 * - Write: Admin only (curated content)
 * 
 * @see docs/phase-1.2/task-1.2-2-chunk-content-design.md
 */
export interface ChunkLibraryRecord extends RecordModel {
  /** The chunk text in the target language */
  text: string;
  
  /** Translation in the native language */
  translation: string;
  
  /** Type of chunk: polyword, collocation, utterance, frame */
  chunk_type: ChunkType;
  
  /** Target language code: fr, es, de, en */
  target_language: string;
  
  /** Native language code: en, fr, es, de */
  native_language: string;
  
  /** For sentence frames: variable slots that can be filled */
  slots?: ChunkSlot[];
  
  /** Difficulty level: 1-5 (used for i+1 calibration) */
  difficulty: number;
  
  /** Associated topic IDs (relation) */
  topics: string[];
  
  /** Corpus frequency rank (lower = more common) */
  frequency: number;
  
  /** Default SRS interval for first review (days) */
  base_interval: number;
  
  /** Usage notes for AI tutor */
  notes?: string;
  
  /** Cultural context notes */
  cultural_context?: string;
  
  /** Age-appropriate ranges: ["7-10", "11-14", "15-18"] */
  age_appropriate: string[];
  
  /** Audio URL for listening activities (Phase 2) */
  audio_url?: string;
  
  // Timestamps
  created: string;
  updated: string;
}

/**
 * Pocketbase user_chunks record structure.
 * 
 * The heart of the spaced repetition system. Each chunk a learner
 * encounters gets a UserChunk record tracking their progress.
 * 
 * API Rules:
 * - Read: Owner only
 * - Write: Owner only (via API, not direct user input)
 * 
 * @see docs/phase-1.2/task-1.2-10-chunk-srs.md
 */
export interface UserChunkRecord extends RecordModel {
  /** User who owns this record */
  user: string;
  
  /** Chunk this record is for */
  chunk: string;
  
  /** Current acquisition status */
  status: ChunkStatus;
  
  /** SM-2 ease factor (1.3-2.5, higher = easier) */
  ease_factor: number;
  
  /** Days until next review */
  interval: number;
  
  /** When to review this chunk next */
  next_review_date: string;
  
  /** Number of successful consecutive reviews */
  repetitions: number;
  
  /** Total times encountered in activities */
  total_encounters: number;
  
  /** Times answered correctly on first try */
  correct_first_try: number;
  
  /** Total wrong attempts */
  wrong_attempts: number;
  
  /** Times help button was used for this chunk */
  help_used_count: number;
  
  /** Where first encountered (topic or lesson ID) */
  first_encountered_in?: string;
  
  /** When first encountered */
  first_encountered_at?: string;
  
  /** Where last encountered */
  last_encountered_in?: string;
  
  /** When last encountered */
  last_encountered_at?: string;
  
  /** Derived confidence score (0-1) */
  confidence_score: number;
  
  // Timestamps
  created: string;
  updated: string;
}

/**
 * Pocketbase learner_profiles record structure.
 * 
 * The "brain" of personalization. Aggregated learner data used for:
 * - Generating personalized paths
 * - Calibrating difficulty (i+1)
 * - Detecting when learner is struggling
 * - Adapting content to preferences
 * 
 * API Rules:
 * - Read: Owner only
 * - Write: Owner only (via API, not direct user input)
 * 
 * @see docs/phase-1.2/task-1.2-4-learner-profile-service.md
 */
export interface LearnerProfileRecord extends RecordModel {
  /** User who owns this profile */
  user: string;
  
  /** Native language code */
  native_language: string;
  
  /** Target language code */
  target_language: string;
  
  // === Level Tracking ===
  
  /** Current level: 0-100 (CEFR-mapped) */
  current_level: number;
  
  /** Level history for progress charts: [{date, value}] */
  level_history?: ProgressSnapshot[];
  
  // === Chunk Statistics ===
  
  /** Total chunks encountered */
  total_chunks_encountered: number;
  
  /** Chunks with status "acquired" */
  chunks_acquired: number;
  
  /** Chunks with status "learning" */
  chunks_learning: number;
  
  /** Chunks with status "fragile" */
  chunks_fragile: number;
  
  // === Interests ===
  
  /** Explicit interests from onboarding */
  explicit_interests?: string[];
  
  /** AI-detected interests: [{topic, strength, detectedAt}] */
  detected_interests?: DetectedInterest[];
  
  // === Confidence ===
  
  /** Rolling average confidence: 0-1 */
  average_confidence: number;
  
  /** Confidence history for trends: [{date, value}] */
  confidence_history?: ProgressSnapshot[];
  
  // === Engagement ===
  
  /** Total learning sessions completed */
  total_sessions: number;
  
  /** Total time spent learning (minutes) */
  total_time_minutes: number;
  
  /** Average session length (minutes) */
  average_session_length: number;
  
  /** Help request rate: 0-1 */
  help_request_rate: number;
  
  /** Wrong answer rate: 0-1 */
  wrong_answer_rate: number;
  
  // === Preferences ===
  
  /** Preferred activity types (learned) */
  preferred_activity_types?: string[];
  
  /** Preferred session length (minutes) */
  preferred_session_length: number;
  
  // === Coaching ===
  
  /** Last reflection question asked */
  last_reflection_prompt?: string;
  
  /** AI observations about the learner */
  coaching_notes?: string;
  
  // === Affective Filter ===
  
  /** Risk score: 0-1, higher = more likely disengaged */
  filter_risk_score: number;
  
  /** Last struggled significantly */
  last_struggle_date?: string;
  
  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// PEDAGOGY HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Pocketbase TopicRecord to domain Topic type.
 */
export function topicRecordToTopic(record: TopicRecord): Topic {
  return {
    id: record.id,
    name: record.name,
    icon: record.icon,
    description: record.description,
    parentTopicId: record.parent_topic,
    targetLanguage: record.target_language,
    difficultyRange: record.difficulty_range,
    tags: record.tags || [],
    chunkCount: record.chunk_count,
    created: record.created,
    updated: record.updated,
  };
}

/**
 * Convert Pocketbase ChunkLibraryRecord to domain LexicalChunk type.
 */
export function chunkRecordToLexicalChunk(record: ChunkLibraryRecord): LexicalChunk {
  return {
    id: record.id,
    text: record.text,
    translation: record.translation,
    chunkType: record.chunk_type as ChunkType,
    targetLanguage: record.target_language,
    nativeLanguage: record.native_language,
    slots: record.slots,
    difficulty: record.difficulty,
    topicIds: record.topics || [],
    frequency: record.frequency,
    baseInterval: record.base_interval,
    notes: record.notes,
    culturalContext: record.cultural_context,
    ageAppropriate: record.age_appropriate || [],
    audioUrl: record.audio_url,
    created: record.created,
    updated: record.updated,
  };
}

/**
 * Convert Pocketbase UserChunkRecord to domain UserChunk type.
 */
export function userChunkRecordToUserChunk(record: UserChunkRecord): UserChunk {
  return {
    id: record.id,
    userId: record.user,
    chunkId: record.chunk,
    status: record.status as ChunkStatus,
    easeFactor: record.ease_factor,
    interval: record.interval,
    nextReviewDate: record.next_review_date,
    repetitions: record.repetitions,
    totalEncounters: record.total_encounters,
    correctFirstTry: record.correct_first_try,
    wrongAttempts: record.wrong_attempts,
    helpUsedCount: record.help_used_count,
    firstEncounteredIn: record.first_encountered_in || '',
    firstEncounteredAt: record.first_encountered_at || '',
    lastEncounteredIn: record.last_encountered_in || '',
    lastEncounteredAt: record.last_encountered_at || '',
    confidenceScore: record.confidence_score,
    created: record.created,
    updated: record.updated,
  };
}

/**
 * Convert Pocketbase LearnerProfileRecord to domain LearnerProfile type.
 */
export function learnerProfileRecordToLearnerProfile(record: LearnerProfileRecord): LearnerProfile {
  return {
    id: record.id,
    userId: record.user,
    nativeLanguage: record.native_language,
    targetLanguage: record.target_language,
    currentLevel: record.current_level,
    levelHistory: record.level_history || [],
    totalChunksEncountered: record.total_chunks_encountered,
    chunksAcquired: record.chunks_acquired,
    chunksLearning: record.chunks_learning,
    chunksFragile: record.chunks_fragile,
    explicitInterests: record.explicit_interests || [],
    detectedInterests: record.detected_interests || [],
    averageConfidence: record.average_confidence,
    confidenceHistory: record.confidence_history || [],
    totalSessions: record.total_sessions,
    totalTimeMinutes: record.total_time_minutes,
    averageSessionLength: record.average_session_length,
    helpRequestRate: record.help_request_rate,
    wrongAnswerRate: record.wrong_answer_rate,
    preferredActivityTypes: record.preferred_activity_types || [],
    preferredSessionLength: record.preferred_session_length,
    lastReflectionPrompt: record.last_reflection_prompt || '',
    coachingNotes: record.coaching_notes || '',
    filterRiskScore: record.filter_risk_score,
    lastStruggleDate: record.last_struggle_date,
    created: record.created,
    updated: record.updated,
  };
}
