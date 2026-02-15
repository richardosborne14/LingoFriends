/**
 * Game Type Definitions for LingoFriends Phase 1.1
 * 
 * This file contains all type definitions for the garden-based learning system.
 * These types support the game mechanics including:
 * - Activities within lessons (6 types)
 * - Skill paths and lesson progression
 * - Garden trees and health/decay system
 * - Gifts and social features
 * - Sun Drop currency system
 * 
 * @see docs/phase-1.1/GAME_DESIGN.md for full specifications
 * 
 * ⚠️ PHASE 1.2 NOTE
 * 
 * Phase 1.2 introduces significant changes to content and progression:
 * 
 * - `vocabulary: string[]` is being replaced by `chunks: LexicalChunk[]`
 *   See: docs/phase-1.2/task-1-2-2-chunk-content-design.md
 * 
 * - Static `SkillPath` with fixed lessons is being replaced by dynamic
 *   path generation based on learner profile and i+1 difficulty.
 *   See: docs/phase-1.2/task-1-2-9-dynamic-paths.md
 * 
 * - `ActivityConfig` will be updated to use chunk-based content instead
 *   of isolated vocabulary words.
 * 
 * - New types will be added in src/types/pedagogy.ts:
 *   - LexicalChunk (the new content unit)
 *   - LearnerProfile (user's learning state)
 *   - UserChunk (SRS status per chunk)
 *   - Topic (content organization)
 * 
 * These Phase 1.1 types will remain compatible during the transition.
 * The gamification layer (trees, SunDrops, garden) is preserved.
 * 
 * @see PEDAGOGY.md for the pedagogical foundation
 * @see docs/phase-1.2/phase-1.2-overview.md for Phase 1.2 architecture
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Activity types for lessons.
 * Each type has different difficulty and Sun Drop values.
 * 
 * Phase 1.1 implements 6 core activity types.
 * Phase 2 will add LISTEN_TYPE and SPEAK for voice activities.
 */
export enum GameActivityType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FILL_BLANK = 'fill_blank',
  WORD_ARRANGE = 'word_arrange',
  TRUE_FALSE = 'true_false',
  MATCHING = 'matching',
  TRANSLATE = 'translate',
  // Phase 2:
  // LISTEN_TYPE = 'listen_type',
  // SPEAK = 'speak',
}

/**
 * Status of a lesson in a skill path.
 * Used to track progress and unlock logic.
 * 
 * - LOCKED: Prerequisites not met, cannot play
 * - CURRENT: Next available lesson to play
 * - COMPLETED: Finished with at least 1 star
 */
export enum LessonStatus {
  LOCKED = 'locked',
  CURRENT = 'current',
  COMPLETED = 'completed',
}

/**
 * Status of a tree in the garden.
 * Visual state reflects learning progress on a skill path.
 * 
 * - SEED: Just planted, no lessons completed yet
 * - GROWING: Some lessons completed, tree is developing
 * - BLOOMED: All lessons completed, tree is full grown
 */
export enum TreeStatus {
  SEED = 'seed',
  GROWING = 'growing',
  BLOOMED = 'bloomed',
}

/**
 * Types of gifts players can send to friends.
 * Each gift type has different effects on the recipient's garden.
 * 
 * @see GAME_DESIGN.md Section 7 (Social Features)
 */
export enum GiftType {
  WATER_DROP = 'water_drop',       // +10 days buffer on decay
  SPARKLE = 'sparkle',             // Cosmetic + small health boost
  SEED = 'seed',                   // Start a new skill path
  RIBBON = 'ribbon',               // Tree decoration
  GOLDEN_FLOWER = 'golden_flower', // Rare garden decoration
}

// ============================================================================
// ACTIVITY INTERFACES
// ============================================================================

/**
 * Configuration for a single activity within a lesson.
 * 
 * Activities are the core learning exercises. Each step in a lesson
 * has one activity with its configuration and Sun Drop reward.
 * 
 * @example
 * // Multiple Choice
 * {
 *   type: GameActivityType.MULTIPLE_CHOICE,
 *   question: "What is 'bonjour' in English?",
 *   options: ["Goodbye", "Hello", "Thank you", "Please"],
 *   correctIndex: 1,
 *   sunDrops: 2
 * }
 * 
 * @example
 * // Fill in the Blank
 * {
 *   type: GameActivityType.FILL_BLANK,
 *   sentence: "Je ___ français.",
 *   correctAnswer: "parle",
 *   hint: "to speak = parler",
 *   sunDrops: 3
 * }
 */
export interface ActivityConfig {
  /** Type of activity - determines UI and validation */
  type: GameActivityType;
  
  // Multiple Choice & True/False
  /** The question to display (MC, TF) */
  question?: string;
  /** Array of 4 options for multiple choice */
  options?: string[];
  /** Index of correct answer in options array (MC) */
  correctIndex?: number;
  
  // Fill Blank & Translate
  /** The correct answer text (FB, Translate) */
  correctAnswer?: string;
  /** Sentence with ___ placeholder (FB) */
  sentence?: string;
  /** Accepted alternative answers (Translate) */
  acceptedAnswers?: string[];
  
  // Word Arrange
  /** The target sentence to construct (WA) */
  targetSentence?: string;
  /** Words to arrange, in random order (WA) */
  scrambledWords?: string[];
  
  // True/False
  /** Whether the statement is true (TF) */
  isTrue?: boolean;
  /** Statement to evaluate (TF, alternative to question) */
  statement?: string;
  
  // Matching
  /** Pairs to match (left term -> right definition) */
  pairs?: Array<{ left: string; right: string }>;
  
  // Translate
  /** Source phrase to translate */
  sourcePhrase?: string;
  
  // Common
  /** Hint shown below question when user taps "Help" */
  hint?: string;
  /** Sun Drop value: 1-4 based on difficulty (set by AI) */
  sunDrops: number;
}

/**
 * A single step in a lesson.
 * Each step combines tutor guidance with an interactive activity.
 * 
 * Lessons have 5-8 steps, progressing in difficulty.
 */
export interface LessonStep {
  /** Professor Finch's guidance text (1-2 sentences) */
  tutorText: string;
  /** Hint shown when child taps "Help" button */
  helpText: string;
  /** The activity for this step */
  activity: ActivityConfig;
}

/**
 * Full lesson plan generated by AI.
 * Created dynamically based on user's skill path and progress.
 * 
 * @see lessonGenerator.ts for AI generation logic
 */
export interface LessonPlan {
  /** Unique identifier for this lesson instance */
  id: string;
  /** Display title (e.g., "Greetings Basics") */
  title: string;
  /** Emoji or icon identifier */
  icon: string;
  /** ID of the parent skill path */
  skillPathId: string;
  /** Position in the skill path (0-indexed) */
  lessonIndex: number;
  /** Array of 5-8 lesson steps */
  steps: LessonStep[];
  /** Sum of all step activity sunDrops values */
  totalSunDrops: number;
}

// ============================================================================
// SKILL PATH INTERFACES
// ============================================================================

/**
 * Definition of a skill path (e.g., "Sports Talk", "Restaurant Vocabulary").
 * 
 * Skill paths are the top-level organizational unit for learning content.
 * Each skill path has multiple lessons arranged in sequence.
 * 
 * When a user starts a skill path, they get a UserTree in their garden.
 */
export interface SkillPath {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Emoji or icon identifier */
  icon: string;
  /** Short description shown in tree details */
  description: string;
  /** Category for grouping (e.g., "Basics", "Travel") */
  category: string;
  /** Lessons in this skill path, in order */
  lessons: SkillPathLesson[];
}

/**
 * A lesson within a skill path.
 * Tracks the user's progress on this specific lesson.
 */
export interface SkillPathLesson {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Emoji or icon identifier */
  icon: string;
  /** Current status for this user */
  status: LessonStatus;
  /** Star rating: 0-3 based on Sun Drops earned */
  stars: number;
  /** Sun Drops earned on best completion */
  sunDropsEarned: number;
  /** Maximum possible Sun Drops */
  sunDropsMax: number;
  /** When completed (ISO date string) */
  completedDate?: string;
}

// ============================================================================
// GARDEN INTERFACES
// ============================================================================

/**
 * User's tree instance in their garden.
 * 
 * Each tree represents a skill path the user is learning.
 * Tree health reflects spaced repetition - decays without review.
 * 
 * @see sunDropService.ts for health calculation
 */
export interface UserTree {
  /** Unique identifier */
  id: string;
  /** ID of the SkillPath this tree represents */
  skillPathId: string;
  /** Display name (same as SkillPath name) */
  name: string;
  /** Emoji or icon identifier */
  icon: string;
  /** Current growth status */
  status: TreeStatus;
  /** Health percentage: 0-100 */
  health: number;
  /** When last reviewed/practiced (ISO date string) */
  lastRefreshDate: string;
  /** Total Sun Drops earned on this tree */
  sunDropsTotal: number;
  /** Number of lessons completed */
  lessonsCompleted: number;
  /** Total lessons in skill path */
  lessonsTotal: number;
  /** Position in garden grid */
  position: { x: number; y: number };
  /** IDs of decorations applied to this tree */
  decorations: string[];
  /** Gifts received from friends */
  giftsReceived: GiftItem[];
}

/**
 * A gift received from a friend.
 * Gifts can buff tree health or provide decorations.
 */
export interface GiftItem {
  /** Unique identifier */
  id: string;
  /** Type of gift */
  type: GiftType;
  /** ID of the friend who sent it */
  fromUserId: string;
  /** Display name of sender */
  fromUserName: string;
  /** When the gift was applied (ISO date), if applied */
  appliedDate?: string;
}

/**
 * Garden decoration placed by user.
 * Decorations are cosmetic items that personalize the garden.
 */
export interface GardenDecoration {
  /** Unique identifier */
  id: string;
  /** Type of decoration item */
  itemType: string;
  /** Position in garden */
  position: { x: number; y: number };
}

/**
 * Player avatar configuration.
 * Avatar walks around the garden and represents the user.
 * 
 * Phase 1.1 uses emoji placeholders; sprites come in Phase D.
 */
export interface PlayerAvatar {
  /** Unique identifier */
  id: string;
  /** Emoji placeholder until sprites implemented */
  emoji: string;
  /** Display name of avatar buddy */
  name: string;
}

// ============================================================================
// RESULT INTERFACES
// ============================================================================

/**
 * Result of a Sun Drop calculation.
 * Returned when earning Sun Drops from activities.
 */
export interface SunDropResult {
  /** Amount earned in this action */
  earned: number;
  /** New total balance */
  total: number;
  /** Whether daily cap was hit */
  capped: boolean;
  /** Fraction of tree growth progress (0-1) */
  treeGrowth: number;
}

/**
 * Result of completing an activity.
 * Tracks correctness and Sun Drop changes.
 */
export interface ActivityResult {
  /** Whether the answer was correct */
  correct: boolean;
  /** Sun Drops earned (0 if wrong) */
  sunDropsEarned: number;
  /** Sun Drops lost from wrong attempts */
  sunDropsLost: number;
  /** Number of attempts before correct */
  attempts: number;
  /** Whether help button was used */
  usedHelp: boolean;
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Map new GameActivityType to legacy ActivityType for backward compatibility.
 * The original ActivityType enum in types.ts will be gradually deprecated.
 * 
 * @deprecated Use GameActivityType for new code
 */
export const ACTIVITY_TYPE_MAP: Record<GameActivityType, string> = {
  [GameActivityType.MULTIPLE_CHOICE]: 'quiz',
  [GameActivityType.FILL_BLANK]: 'fill_blank',
  [GameActivityType.WORD_ARRANGE]: 'word_arrange',
  [GameActivityType.TRUE_FALSE]: 'true_false',
  [GameActivityType.MATCHING]: 'matching',
  [GameActivityType.TRANSLATE]: 'translate',
};