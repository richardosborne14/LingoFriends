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
  INFO = 'info',                 // Information/teaching step (no quiz)
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
 * Each gift type has different effects on tree health.
 * 
 * Updated in Phase 1.1.11 to rebalance reward economy:
 * - Water Drop: +1 day buffer (friend gift only)
 * - Sparkle: +3 days buffer (friend gift only)
 * - Decoration: +5 days buffer (shop purchase with gems)
 * - Golden Flower: +10 days buffer (rare achievement reward)
 * - Seed: Start new skill path (pathway completion reward)
 * 
 * @see docs/phase-1.1/task-1-1-11-gift-system.md
 */
export enum GiftType {
  WATER_DROP = 'water_drop',       // +1 day tree health buffer
  SPARKLE = 'sparkle',             // +3 days tree health buffer
  DECORATION = 'decoration',       // +5 days tree health buffer (shop purchase)
  GOLDEN_FLOWER = 'golden_flower', // +10 days tree health buffer (rare)
  SEED = 'seed',                   // Start a new skill path
  // Note: RIBBON removed - replaced by shop-purchased decorations
}

/**
 * Achievement types that can unlock special rewards.
 * Used for granting decorations and bonuses for milestones.
 */
export enum AchievementType {
  STREAK_3_DAYS = 'streak_3_days',       // 3-day learning streak
  STREAK_7_DAYS = 'streak_7_days',       // 7-day learning streak
  STREAK_14_DAYS = 'streak_14_days',     // 14-day learning streak
  STREAK_30_DAYS = 'streak_30_days',     // 30-day learning streak
  PATHWAY_COMPLETE = 'pathway_complete', // Complete a skill path
  FIVE_PATHWAYS = 'five_pathways',       // Complete 5 skill paths
  PERFECT_LESSON = 'perfect_lesson',     // 100% on a lesson (no mistakes)
  FIRST_FRIEND = 'first_friend',         // Added first friend
  FIRST_GIFT = 'first_gift',             // Sent first gift
}

/**
 * Shop item categories for organizing the garden shop.
 * Clear separation between tree-helping and cosmetic items.
 */
export enum ShopCategory {
  TREE_CARE = 'tree_care',    // Items that boost tree health
  GARDEN = 'garden',          // Pure cosmetic garden decorations
  AVATAR = 'avatar',          // Avatar customization items
  SPECIAL = 'special',        // Limited-time or special items
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
  
  // INFO (teaching step)
  /** Title for info display */
  title?: string;
  /** Main content for info display */
  content?: string;
  /** Additional explanation */
  explanation?: string;
  /** Example usage */
  example?: string;
  
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
 * User's LEARNING tree instance in their garden.
 * 
 * Each tree represents ONE skill path the user is learning.
 * These are distinct from DECORATION trees (cosmetic only).
 * 
 * LEARNING TREES:
 * - Planted from SEEDS (earned via pathway completion)
 * - Have per-tree SunDrops that cause GROWTH
 * - 15 growth stages (0-14) based on SunDrops earned
 * - Linked to a specific skill pathway
 * - Health decays without review
 * - Click opens PathView for lessons
 * 
 * DECORATION TREES:
 * - Bought with GEMS in the shop
 * - Static appearance, no growth
 * - No gameplay function
 * - See DECORATION_CATALOGUE for available items
 * 
 * @see docs/phase-1.1/task-1-1-19-garden-architecture-fix.md
 * @see sunDropService.ts for growth calculations
 * @see treeHealthService.ts for decay calculations
 */
export interface UserTree {
  /** Unique identifier */
  id: string;
  /** User ID (relation to users) */
  userId: string;
  
  /** ID of the SkillPath this tree represents */
  skillPathId: string;
  /** Display name (e.g., "Spanish Basics", "French Greetings") */
  name: string;
  /** Emoji or icon identifier */
  icon: string;
  
  // ============================================
  // POSITION IN 3D GARDEN
  // ============================================
  
  /** Grid position in garden (0-11 for both x and z) */
  gridPosition: { gx: number; gz: number };
  /** Legacy position field - @deprecated use gridPosition */
  position: { x: number; y: number };
  
  // ============================================
  // GROWTH SYSTEM (PER-TREE SUNDROPS)
  // ============================================
  
  /**
   * Total SunDrops earned for THIS TREE ONLY.
   * NOT global - each learning tree has its own count.
   * Completing lessons in this pathway adds SunDrops here.
   */
  sunDropsEarned: number;
  
  /**
   * Growth stage: 0-14 (15 stages total).
   * Derived from sunDropsEarned via GROWTH_THRESHOLDS.
   * Stage 0 = seedling, Stage 14 = fully mature tree.
   */
  growthStage: number;
  
  /** @deprecated Use sunDropsEarned - kept for migration compatibility */
  sunDropsTotal: number;
  
  // ============================================
  // HEALTH SYSTEM (SPACED REPETITION)
  // ============================================
  
  /** Health percentage: 0-100. Decays without review. */
  health: number;
  /** Current status based on growth and health */
  status: TreeStatus;
  /** Days of protection from gifts and tree care items */
  bufferDays: number;
  /** When last reviewed/practiced (ISO date string) */
  lastRefreshDate: string;
  /** When last lesson was completed (ISO date string) */
  lastLessonDate?: string;
  
  // ============================================
  // PROGRESS TRACKING
  // ============================================
  
  /** Number of lessons completed in this pathway */
  lessonsCompleted: number;
  /** Total lessons in skill path */
  lessonsTotal: number;
  
  // ============================================
  // DECORATIONS & GIFTS
  // ============================================
  
  /** IDs of decorations placed on/around this tree */
  decorations: string[];
  /** Gifts received from friends for this tree */
  giftsReceived: GiftItem[];
  
  // ============================================
  // TIMESTAMPS
  // ============================================
  
  /** When the tree was planted (ISO date string) */
  createdAt?: string;
  /** When the tree was last updated (ISO date string) */
  updatedAt?: string;
}

/**
 * Growth thresholds for converting sunDropsEarned to growthStage.
 * Stage 0 = 0 drops, Stage 14 = 900+ drops.
 */
export const GROWTH_THRESHOLDS = [0, 10, 25, 45, 70, 100, 140, 190, 250, 320, 400, 500, 620, 750, 900];

/**
 * Calculate growth stage from SunDrops earned.
 * @param sunDropsEarned Total SunDrops for this tree
 * @returns Growth stage 0-14
 */
export function calculateGrowthStage(sunDropsEarned: number): number {
  for (let stage = GROWTH_THRESHOLDS.length - 1; stage >= 0; stage--) {
    if (sunDropsEarned >= GROWTH_THRESHOLDS[stage]) {
      return stage;
    }
  }
  return 0;
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
// SHOP CATALOGUES
// ============================================================================

/**
 * Decoration item category for shop organization.
 */
export type DecorationCategory = 'Trees' | 'Flowers' | 'Plants' | 'Furniture' | 'Features';

/**
 * Decoration item in the shop catalogue.
 * These are COSMETIC ONLY - no gameplay function.
 * Purchased with GEMS (not SunDrops).
 */
export interface DecorationItem {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Category for shop filtering */
  category: DecorationCategory;
  /** Cost in GEMS */
  cost: number;
  /** Emoji icon for UI display */
  icon: string;
}

/**
 * Tree care consumable item.
 * These provide health buffer to learning trees.
 * Purchased with GEMS.
 */
export interface TreeCareItem {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Cost in GEMS */
  cost: number;
  /** Effect type (currently only health_buffer) */
  effect: 'health_buffer';
  /** Days of health protection added */
  bufferDays: number;
  /** Emoji icon for UI display */
  icon: string;
  /** Description for shop display */
  description: string;
}

/**
 * Shop catalogue for GARDEN DECORATIONS.
 * These are cosmetic items purchased with GEMS.
 * 
 * NOTE: Trees in this catalogue are DECORATION TREES only -
 * they are NOT learning trees. Learning trees come from SEEDS.
 */
export const DECORATION_CATALOGUE: DecorationItem[] = [
  // ============================================
  // DECORATION TREES (COSMETIC, NOT LEARNING TREES)
  // These are static decorations - no growth, no health, no pathway link
  // ============================================
  { id: 'oak',      name: 'Oak Tree',        category: 'Trees',     cost: 30, icon: '🌳' },
  { id: 'pine',     name: 'Pine Tree',       category: 'Trees',     cost: 25, icon: '🌲' },
  { id: 'cherry',   name: 'Cherry Blossom',  category: 'Trees',     cost: 40, icon: '🌸' },
  { id: 'maple',    name: 'Autumn Maple',    category: 'Trees',     cost: 35, icon: '🍁' },
  { id: 'willow',   name: 'Weeping Willow',  category: 'Trees',     cost: 45, icon: '🌿' },
  { id: 'palm',     name: 'Palm Tree',       category: 'Trees',     cost: 38, icon: '🌴' },
  
  // ============================================
  // FLOWERS
  // ============================================
  { id: 'rose',     name: 'Rose',            category: 'Flowers',   cost: 15, icon: '🌹' },
  { id: 'sunflwr',  name: 'Sunflower',       category: 'Flowers',   cost: 12, icon: '🌻' },
  { id: 'tulip',    name: 'Tulip',           category: 'Flowers',   cost: 10, icon: '🌷' },
  { id: 'lavender', name: 'Lavender',        category: 'Flowers',   cost: 10, icon: '💜' },
  { id: 'daisy',    name: 'Daisy',           category: 'Flowers',   cost: 8,  icon: '🌼' },
  { id: 'poppy',    name: 'Poppy',           category: 'Flowers',   cost: 10, icon: '🌺' },
  
  // ============================================
  // PLANTS
  // ============================================
  { id: 'hedge',    name: 'Hedge Bush',      category: 'Plants',    cost: 18, icon: '🌿' },
  { id: 'mushroom', name: 'Mushroom',        category: 'Plants',    cost: 8,  icon: '🍄' },
  
  // ============================================
  // FURNITURE
  // ============================================
  { id: 'bench',    name: 'Bench',           category: 'Furniture', cost: 45, icon: '🪑' },
  { id: 'lantern',  name: 'Lantern',         category: 'Furniture', cost: 35, icon: '🏮' },
  { id: 'sign',     name: 'Sign Post',       category: 'Furniture', cost: 20, icon: '🪧' },
  
  // ============================================
  // FEATURES
  // ============================================
  { id: 'fountain', name: 'Fountain',        category: 'Features',  cost: 80, icon: '⛲' },
  { id: 'pond',     name: 'Pond',            category: 'Features',  cost: 55, icon: '💧' },
];

/**
 * Shop catalogue for TREE CARE ITEMS.
 * These are consumables that protect learning trees from health decay.
 * Purchased with GEMS.
 */
export const TREE_CARE_ITEMS: TreeCareItem[] = [
  { 
    id: 'watering_can', 
    name: 'Watering Can', 
    cost: 15, 
    effect: 'health_buffer', 
    bufferDays: 5, 
    icon: '🚿',
    description: 'Adds 5 days of health protection to a learning tree.'
  },
  { 
    id: 'sun_lamp', 
    name: 'Sun Lamp', 
    cost: 20, 
    effect: 'health_buffer', 
    bufferDays: 5, 
    icon: '💡',
    description: 'Adds 5 days of health protection to a learning tree.'
  },
  { 
    id: 'fertilizer', 
    name: 'Magic Fertilizer', 
    cost: 25, 
    effect: 'health_buffer', 
    bufferDays: 5, 
    icon: '✨',
    description: 'Adds 5 days of health protection to a learning tree.'
  },
  { 
    id: 'rainbow_pot', 
    name: 'Rainbow Pot', 
    cost: 30, 
    effect: 'health_buffer', 
    bufferDays: 5, 
    icon: '🌈',
    description: 'Adds 5 days of health protection to a learning tree.'
  },
];

/**
 * Get a decoration item by ID.
 */
export function getDecorationById(id: string): DecorationItem | undefined {
  return DECORATION_CATALOGUE.find(item => item.id === id);
}

/**
 * Get decorations by category.
 */
export function getDecorationsByCategory(category: DecorationCategory): DecorationItem[] {
  return DECORATION_CATALOGUE.filter(item => item.category === category);
}

/**
 * Get a tree care item by ID.
 */
export function getTreeCareItemById(id: string): TreeCareItem | undefined {
  return TREE_CARE_ITEMS.find(item => item.id === id);
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
  [GameActivityType.INFO]: 'info',
  [GameActivityType.MULTIPLE_CHOICE]: 'quiz',
  [GameActivityType.FILL_BLANK]: 'fill_blank',
  [GameActivityType.WORD_ARRANGE]: 'word_arrange',
  [GameActivityType.TRUE_FALSE]: 'true_false',
  [GameActivityType.MATCHING]: 'matching',
  [GameActivityType.TRANSLATE]: 'translate',
};
