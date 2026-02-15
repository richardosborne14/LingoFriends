/**
 * Pedagogy Engine Type Definitions for Phase 1.2
 * 
 * This file contains types for the adaptive learning engine that powers
 * LingoFriends' personalized content delivery. These types support:
 * 
 * - Lexical chunks (the fundamental content unit)
 * - Learner profiles (aggregated user data)
 * - User chunk progress (SRS data per chunk)
 * - Topics (flexible content organization)
 * 
 * Key Differences from Phase 1.1:
 * - Content is chunk-based, not isolated vocabulary
 * - Paths are dynamically generated, not static
 * - Each chunk has independent SRS scheduling
 * - Difficulty is calibrated per-learner (i+1)
 * 
 * @see docs/phase-1.2/phase-1.2-overview.md for architecture
 * @see PEDAGOGY.md for pedagogical foundation
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Types of lexical chunks, based on Michael Lewis's taxonomy.
 * 
 * The Lexical Approach teaches that native speakers store and retrieve
 * "chunks" of language as single units, rather than constructing
 * sentences word-by-word using grammar rules.
 * 
 * @see PEDAGOGY.md Section 1 (Lexical Approach)
 */
export enum ChunkType {
  /** 
   * Fixed multi-word units that function as single words.
   * Examples: "by the way", "once upon a time", "at the end of the day"
   */
  POLYWORD = 'polyword',
  
  /** 
   * Words that naturally co-occur more often than by chance.
   * Examples: "make a decision" (not "do a decision"), "strong accent" (not "powerful accent")
   */
  COLLOCATION = 'collocation',
  
  /** 
   * Whole phrases with specific pragmatic meaning in context.
   * Examples: "I'll get it", "Would you like a cup of coffee?", "If you ask me..."
   */
  UTTERANCE = 'utterance',
  
  /** 
   * Semi-fixed patterns with variable slots that can be filled.
   * Examples: "If I were you, I'd...", "The thing is...", "Could you possibly...?"
   */
  FRAME = 'frame',
}

/**
 * Acquisition status of a chunk for a learner.
 * 
 * This status determines:
 * - When the chunk should be reviewed (SRS scheduling)
 * - Whether it's suitable for context in new lessons
 * - How it contributes to tree health in the garden
 * 
 * Status transitions:
 * - new → learning (first encounter)
 * - learning → acquired (stable after multiple successful reviews)
 * - acquired → fragile (decay over time without review)
 * - fragile → acquired (successful review restores)
 * - any → learning (after repeated failures)
 */
export enum ChunkStatus {
  /** 
   * Never encountered by this learner.
   * Not yet in the SRS system.
   */
  NEW = 'new',
  
  /** 
   * Encountered but not yet stable in memory.
   * Short review intervals (1-3 days).
   * May require more practice.
   */
  LEARNING = 'learning',
  
  /** 
   * Stable in memory with long review intervals.
   * Can be used as context for new chunks.
   * Contributes positively to tree health.
   */
  ACQUIRED = 'acquired',
  
  /** 
   * Previously acquired but now decaying.
   * Needs review soon to prevent forgetting.
   * Reduces tree health until reviewed.
   */
  FRAGILE = 'fragile',
}

/**
 * Granular CEFR sub-level for precise progress tracking.
 * 
 * Each major CEFR level is split into sub-levels:
 * - Base (e.g., A1): Starting point of that level
 * - Plus (e.g., A1+): Strong in that level, ready for next
 * - Minus (e.g., A2-): Just entered that level, still building
 * 
 * This provides learners with a sense of progress within each level
 * and helps the AI target appropriate difficulty.
 * 
 * @see https://www.coe.int/en/common-european-framework-reference-languages
 */
export type CEFRSubLevel = 
  | 'A1' | 'A1+' 
  | 'A2-' | 'A2' | 'A2+' 
  | 'B1-' | 'B1' | 'B1+' 
  | 'B2-' | 'B2' | 'B2+' 
  | 'C1-' | 'C1' | 'C1+' 
  | 'C2';

/**
 * CEFR level mapping for difficulty calibration.
 * 
 * Our internal scale (0-100) maps to granular CEFR sub-levels.
 * These are used for difficulty targeting and progress display.
 * 
 * @deprecated Use CEFRSubLevel for display, internal values for calculations
 */
export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

/**
 * Input for AI level evaluation.
 * Contains recent activity data for qualitative assessment.
 */
export interface LevelEvaluationInput {
  /** Recent user responses to activities */
  recentResponses: Array<{
    chunk: string;
    userAnswer: string;
    correct: boolean;
    usedHelp: boolean;
    responseTime: number;  // seconds
  }>;
  /** Current displayed level */
  currentLevel: CEFRSubLevel;
  /** Chunk statistics */
  chunkStats: {
    acquired: number;
    learning: number;
    fragile: number;
  };
  /** Last N confidence scores for trend analysis */
  confidenceTrend: number[];
}

/**
 * Result of AI level evaluation.
 * Provides suggested level with reasoning and areas to work on.
 */
export interface LevelEvaluationResult {
  /** AI's suggested level based on performance */
  suggestedLevel: CEFRSubLevel;
  /** Areas where learner is strong */
  strengths: string[];
  /** Areas that need improvement */
  areas: string[];
  /** AI's confidence in this assessment (0-1) */
  confidence: number;
  /** Explanation for the learner */
  reasoning: string;
}

// ============================================================================
// CHUNK INTERFACES
// ============================================================================

/**
 * A variable slot in a sentence frame.
 * 
 * Sentence frames (type ChunkType.FRAME) have replaceable parts.
 * For example: "Je voudrais ___, s'il vous plaît" has one slot for a noun.
 */
export interface ChunkSlot {
  /** Position in the sentence (0-indexed, by word) */
  position: number;
  
  /** Placeholder text shown to learner */
  placeholder: string;
  
  /** Grammatical type: noun, verb, adjective, etc. */
  type: string;
  
  /** Example words that can fill this slot */
  examples: string[];
}

/**
 * A lexical chunk from the chunk library.
 * 
 * Chunks are the fundamental unit of teaching in the Lexical Approach.
 * Instead of isolated words, we teach whole phrases that native speakers
 * retrieve as units. Each chunk has:
 * 
 * - Text and translation for learning
 * - Type classification (polyword, collocation, etc.)
 * - Difficulty level (1-5) for i+1 calibration
 * - Topics for organization and selection
 * - SRS base interval for spaced repetition
 * 
 * @example
 * // Polyword
 * { text: "by the way", translation: "au fait", chunkType: "polyword", difficulty: 1 }
 * 
 * @example
 * // Utterance
 * { text: "Je voudrais un café, s'il vous plaît", translation: "I would like a coffee, please", chunkType: "utterance", difficulty: 2 }
 * 
 * @example
 * // Frame with slots
 * {
 *   text: "Je voudrais ___, s'il vous plaît",
 *   translation: "I would like ___, please",
 *   chunkType: "frame",
 *   slots: [{ position: 2, placeholder: "___", type: "noun", examples: ["un café", "un thé", "un croissant"] }]
 * }
 */
export interface LexicalChunk {
  /** Unique identifier */
  id: string;
  
  /** The chunk text in the target language */
  text: string;
  
  /** Translation in the native language */
  translation: string;
  
  /** Type of chunk (polyword, collocation, utterance, frame) */
  chunkType: ChunkType;
  
  /** Target language code: fr, es, de, en */
  targetLanguage: string;
  
  /** Native language code: en, fr, es, de */
  nativeLanguage: string;
  
  /** For frames: variable slots that can be filled */
  slots?: ChunkSlot[];
  
  /** Difficulty level: 1-5 (used for i+1 calibration) */
  difficulty: number;
  
  /** Associated topic IDs */
  topicIds: string[];
  
  /** Corpus frequency rank (lower = more common) */
  frequency: number;
  
  /** Default SRS interval for first review (days) */
  baseInterval: number;
  
  /** Usage notes for AI tutor */
  notes?: string;
  
  /** Cultural context notes */
  culturalContext?: string;
  
  /** Age-appropriate ranges: ["7-10", "11-14", "15-18"] */
  ageAppropriate: string[];
  
  /** Audio URL for listening activities (Phase 2) */
  audioUrl?: string;
  
  /** Creation timestamp */
  created: string;
  
  /** Last update timestamp */
  updated: string;
}

// ============================================================================
// USER CHUNK INTERFACES
// ============================================================================

/**
 * A learner's progress on a specific chunk.
 * 
 * This is the heart of the spaced repetition system. Each chunk a learner
 * encounters gets a UserChunk record that tracks:
 * 
 * - Acquisition status (new/learning/acquired/fragile)
 * - SRS parameters (ease factor, interval, next review date)
 * - Performance history (correct/wrong/help counts)
 * - Context (where first/last encountered)
 * 
 * The SM-2 algorithm uses easeFactor and interval to schedule reviews.
 * When a learner answers correctly, interval increases. When wrong,
 * interval resets and easeFactor decreases.
 * 
 * @see docs/phase-1.2/task-1.2-10-chunk-srs.md for SM-2 implementation
 */
export interface UserChunk {
  /** Unique identifier */
  id: string;
  
  /** User ID */
  userId: string;
  
  /** Chunk ID */
  chunkId: string;
  
  /** Current acquisition status */
  status: ChunkStatus;
  
  /** 
   * SM-2 ease factor (1.3-2.5).
   * Higher = easier for this learner, longer intervals.
   * Starts at 2.5, decreases on wrong answers, increases on correct.
   */
  easeFactor: number;
  
  /** 
   * Days until next review.
   * Calculated from easeFactor and repetitions.
   */
  interval: number;
  
  /** When to review this chunk next (ISO date string) */
  nextReviewDate: string;
  
  /** Number of successful consecutive reviews */
  repetitions: number;
  
  /** Total times encountered in activities */
  totalEncounters: number;
  
  /** Times answered correctly on first try */
  correctFirstTry: number;
  
  /** Total wrong attempts */
  wrongAttempts: number;
  
  /** Times help button was used for this chunk */
  helpUsedCount: number;
  
  /** Where first encountered (topic ID or lesson ID) */
  firstEncounteredIn: string;
  
  /** When first encountered (ISO date string) */
  firstEncounteredAt: string;
  
  /** Where last encountered (topic ID or lesson ID) */
  lastEncounteredIn: string;
  
  /** When last encountered (ISO date string) */
  lastEncounteredAt: string;
  
  /** 
   * Derived confidence score (0-1).
   * Calculated from: correctFirstTry / totalEncounters, weighted by recency.
   */
  confidenceScore: number;
  
  /** Creation timestamp */
  created: string;
  
  /** Last update timestamp */
  updated: string;
}

// ============================================================================
// LEARNER PROFILE INTERFACES
// ============================================================================

/**
 * Detected interest with strength score.
 * 
 * AI can detect interests from:
 * - Activity choices (which topics they pick)
 * - Chat topics (what they talk about in Main Hall)
 * - Performance patterns (better engagement on certain topics)
 * 
 * Strength increases when:
 * - User selects topic multiple times
 * - User talks about topic in chat
 * - User has high engagement on topic
 */
export interface DetectedInterest {
  /** Topic name or ID */
  topic: string;
  
  /** Strength score: 0-1 (higher = stronger interest) */
  strength: number;
  
  /** When this interest was detected (ISO date string) */
  detectedAt: string;
}

/**
 * A snapshot of level or confidence at a point in time.
 * 
 * Used for:
 * - Progress visualization (charts)
 * - Trend analysis (improving/declining)
 * - Identifying plateaus or breakthroughs
 */
export interface ProgressSnapshot {
  /** Date of snapshot (ISO date string) */
  date: string;
  
  /** Value at this point (level 0-100 or confidence 0-1) */
  value: number;
}

/**
 * Aggregated learner data and preferences.
 * 
 * This is the "brain" of personalization. The learner profile tracks:
 * 
 * - Current level and progress over time
 * - Interest profile (explicit from onboarding + AI-detected)
 * - Engagement signals and patterns
 * - Affective filter risk indicators
 * 
 * The profile is used to:
 * - Generate personalized learning paths
 * - Calibrate difficulty (i+1)
 * - Detect when learner is struggling
 * - Adapt content to preferences
 * 
 * @see docs/phase-1.2/task-1.2-4-learner-profile-service.md
 */
export interface LearnerProfile {
  /** Unique identifier */
  id: string;
  
  /** User ID */
  userId: string;
  
  /** Native language code */
  nativeLanguage: string;
  
  /** Target language code */
  targetLanguage: string;
  
  // === Level Tracking ===
  
  /** 
   * Current level: 0-100 (CEFR-mapped).
   * A1 = 0-20, A2 = 21-40, B1 = 41-60, B2 = 61-80, C1 = 81-90, C2 = 91-100
   */
  currentLevel: number;
  
  /** Level history for progress charts */
  levelHistory: ProgressSnapshot[];
  
  // === Chunk Statistics ===
  
  /** Total chunks encountered */
  totalChunksEncountered: number;
  
  /** Chunks with status "acquired" */
  chunksAcquired: number;
  
  /** Chunks with status "learning" */
  chunksLearning: number;
  
  /** Chunks with status "fragile" (need review) */
  chunksFragile: number;
  
  // === Interests ===
  
  /** Explicit interests from onboarding */
  explicitInterests: string[];
  
  /** AI-detected interests with strength scores */
  detectedInterests: DetectedInterest[];
  
  // === Confidence ===
  
  /** Rolling average confidence: 0-1 */
  averageConfidence: number;
  
  /** Confidence history for trend analysis */
  confidenceHistory: ProgressSnapshot[];
  
  // === Engagement ===
  
  /** Total learning sessions completed */
  totalSessions: number;
  
  /** Total time spent learning (minutes) */
  totalTimeMinutes: number;
  
  /** Average session length (minutes) */
  averageSessionLength: number;
  
  /** Help request rate: 0-1 (% of activities where help was used) */
  helpRequestRate: number;
  
  /** Wrong answer rate: 0-1 (% of activities answered wrong first try) */
  wrongAnswerRate: number;
  
  // === Preferences (learned over time) ===
  
  /** Activity types the learner performs best on */
  preferredActivityTypes: string[];
  
  /** Preferred session length in minutes */
  preferredSessionLength: number;
  
  // === Coaching ===
  
  /** Last reflection question asked (for coaching cycle) */
  lastReflectionPrompt: string;
  
  /** AI observations about the learner's style and needs */
  coachingNotes: string;
  
  // === Affective Filter ===
  
  /** 
   * Risk score: 0-1.
   * Higher = more likely disengaged or frustrated.
   * Based on: wrong answer rate, help requests, session exits, etc.
   */
  filterRiskScore: number;
  
  /** Last struggled significantly (ISO date string) */
  lastStruggleDate?: string;
  
  // === Timestamps ===
  
  created: string;
  updated: string;
}

// ============================================================================
// TOPIC INTERFACES
// ============================================================================

/**
 * A topic for organizing chunks thematically.
 * 
 * Topics are more flexible than Phase 1.1's "skill paths." Instead of
 * a static sequence, topics are pools of chunks that the Pedagogy Engine
 * draws from based on:
 * 
 * - Learner's interests
 * - Current level (i+1 difficulty)
 * - Review needs (fragile chunks)
 * 
 * Topics can be hierarchical (e.g., "Food" → "Restaurant" → "Ordering").
 * 
 * @example
 * {
 *   id: "topic_restaurant_fr",
 *   name: "Restaurant",
 *   icon: "🍽️",
 *   description: "Learn to order food and drinks in restaurants",
 *   parentTopicId: "topic_food_fr",
 *   targetLanguage: "fr",
 *   difficultyRange: "1-3",
 *   tags: ["restaurant", "ordering", "food", "drinks"],
 *   chunkCount: 45
 * }
 */
export interface Topic {
  /** Unique identifier */
  id: string;
  
  /** Display name (localized to target language) */
  name: string;
  
  /** Emoji icon for visual display */
  icon: string;
  
  /** Description for topic selection UI */
  description: string;
  
  /** Parent topic ID (for hierarchical topics) */
  parentTopicId?: string;
  
  /** Target language code */
  targetLanguage: string;
  
  /** 
   * Difficulty range as string: "min-max".
   * "1-3" means beginner to intermediate chunks available.
   */
  difficultyRange: string;
  
  /** Searchable tags for topic discovery */
  tags: string[];
  
  /** Number of chunks in this topic (denormalized for performance) */
  chunkCount: number;
  
  /** Creation timestamp */
  created: string;
  
  /** Last update timestamp */
  updated: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert internal level (0-100) to CEFR level.
 */
export function levelToCEFR(level: number): CEFRLevel {
  if (level <= 20) return CEFRLevel.A1;
  if (level <= 40) return CEFRLevel.A2;
  if (level <= 60) return CEFRLevel.B1;
  if (level <= 80) return CEFRLevel.B2;
  if (level <= 90) return CEFRLevel.C1;
  return CEFRLevel.C2;
}

/**
 * Convert CEFR level to internal level range.
 * Returns the minimum level for that CEFR band.
 */
export function cefrToLevel(cefr: CEFRLevel): number {
  switch (cefr) {
    case CEFRLevel.A1: return 0;
    case CEFRLevel.A2: return 21;
    case CEFRLevel.B1: return 41;
    case CEFRLevel.B2: return 61;
    case CEFRLevel.C1: return 81;
    case CEFRLevel.C2: return 91;
  }
}

/**
 * Calculate initial ease factor for a chunk.
 * Starts at 2.5 (the SM-2 default).
 */
export function getInitialEaseFactor(): number {
  return 2.5;
}

/**
 * Calculate initial interval for a chunk.
 * Based on the chunk's base interval from the library.
 */
export function getInitialInterval(baseInterval: number): number {
  return baseInterval || 1;
}

/**
 * Calculate confidence score from performance data.
 * Weighted toward recent performance.
 */
export function calculateConfidenceScore(
  correctFirstTry: number,
  totalEncounters: number,
  helpUsedCount: number
): number {
  if (totalEncounters === 0) return 0.5; // Neutral starting point
  
  // Base confidence from correct first try rate
  const correctRate = correctFirstTry / totalEncounters;
  
  // Penalty for help usage
  const helpPenalty = Math.min(0.2, helpUsedCount * 0.05);
  
  // Final score, clamped to 0-1
  return Math.max(0, Math.min(1, correctRate - helpPenalty));
}

/**
 * Determine chunk status based on SRS parameters.
 */
export function determineChunkStatus(
  repetitions: number,
  easeFactor: number,
  daysSinceLastReview: number,
  interval: number
): ChunkStatus {
  // If never reviewed, it's learning
  if (repetitions === 0) {
    return ChunkStatus.LEARNING;
  }
  
  // If easeFactor is very low, it's being learned
  if (easeFactor < 1.5) {
    return ChunkStatus.LEARNING;
  }
  
  // If overdue by more than 2x interval, it's fragile
  if (daysSinceLastReview > interval * 2) {
    return ChunkStatus.FRAGILE;
  }
  
  // If well-established with good ease factor, it's acquired
  if (repetitions >= 3 && easeFactor >= 2.0) {
    return ChunkStatus.ACQUIRED;
  }
  
  // Otherwise, still learning
  return ChunkStatus.LEARNING;
}

/**
 * Parse difficulty range string to min/max values.
 * "1-3" → { min: 1, max: 3 }
 */
export function parseDifficultyRange(range: string): { min: number; max: number } {
  const parts = range.split('-').map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return { min: 1, max: 5 }; // Default to full range
  }
  return { min: parts[0], max: parts[1] };
}

// ============================================================================
// LEVEL CONVERSION FUNCTIONS (GRANULAR CEFR)
// ============================================================================

/**
 * Mapping of internal level values to CEFRSubLevel display strings.
 * Used for converting the numeric level to user-facing text.
 */
const LEVEL_TO_SUBLEVEL: Map<number, CEFRSubLevel> = new Map([
  [0, 'A1'], [10, 'A1+'],
  [20, 'A2-'], [30, 'A2'], [40, 'A2+'],
  [50, 'B1-'], [60, 'B1'], [70, 'B1+'],
  [80, 'B2-'], [85, 'B2'], [90, 'B2+'],
  [93, 'C1-'], [96, 'C1'], [98, 'C1+'],
  [100, 'C2'],
]);

/**
 * Mapping of CEFRSubLevel display strings to internal level values.
 * Used for converting user selections to numeric values.
 */
const SUBLEVEL_TO_LEVEL: Map<CEFRSubLevel, number> = new Map([
  ['A1', 0], ['A1+', 10],
  ['A2-', 20], ['A2', 30], ['A2+', 40],
  ['B1-', 50], ['B1', 60], ['B1+', 70],
  ['B2-', 80], ['B2', 85], ['B2+', 90],
  ['C1-', 93], ['C1', 96], ['C1+', 98],
  ['C2', 100],
]);

/**
 * Convert internal level (0-100) to CEFRSubLevel display string.
 * Finds the nearest sub-level for any given numeric level.
 * 
 * @param level - Internal level value (0-100)
 * @returns CEFRSubLevel display string (e.g., "A2+")
 * 
 * @example
 * levelToSubLevel(0);   // 'A1'
 * levelToSubLevel(15);  // 'A1+'
 * levelToSubLevel(35);  // 'A2'
 * levelToSubLevel(67);  // 'B1+'
 */
export function levelToSubLevel(level: number): CEFRSubLevel {
  // Clamp to valid range
  const clampedLevel = Math.max(0, Math.min(100, level));
  
  // Find the closest level threshold
  const thresholds = Array.from(LEVEL_TO_SUBLEVEL.keys()).sort((a, b) => a - b);
  
  // Start with the lowest level
  let closestThreshold = thresholds[0];
  
  // Find the highest threshold that the level meets or exceeds
  for (const threshold of thresholds) {
    if (clampedLevel >= threshold) {
      closestThreshold = threshold;
    } else {
      break;
    }
  }
  
  return LEVEL_TO_SUBLEVEL.get(closestThreshold) || 'A1';
}

/**
 * Convert CEFRSubLevel display string to internal level value.
 * 
 * @param subLevel - CEFRSubLevel display string (e.g., "A2+")
 * @returns Internal level value (0-100)
 * 
 * @example
 * subLevelToLevel('A1');   // 0
 * subLevelToLevel('A2+');  // 40
 * subLevelToLevel('B1');   // 60
 */
export function subLevelToLevel(subLevel: CEFRSubLevel): number {
  return SUBLEVEL_TO_LEVEL.get(subLevel) ?? 0;
}

/**
 * Get a rough level estimate from chunk count.
 * This is used for quick UI feedback, not authoritative.
 * AI evaluation provides the actual level assessment.
 * 
 * @param acquired - Number of chunks acquired
 * @returns Estimated internal level (0-100)
 * 
 * @example
 * getEstimatedLevel(50);   // 5 (early A1)
 * getEstimatedLevel(150);  // 22 (early A2-)
 * getEstimatedLevel(500);  // 52 (solid B1-)
 */
export function getEstimatedLevel(acquired: number): number {
  if (acquired < 50) return Math.floor(acquired / 5);        // 0-10 (A1 to A1+)
  if (acquired < 200) return 10 + Math.floor((acquired - 50) / 10);   // 11-25 (A2- range)
  if (acquired < 450) return 25 + Math.floor((acquired - 200) / 15);  // 26-41 (A2-A2+ range)
  if (acquired < 800) return 42 + Math.floor((acquired - 450) / 18);  // 42-61 (B1 range)
  if (acquired < 1250) return 62 + Math.floor((acquired - 800) / 15); // 62-91 (B1+-B2 range)
  if (acquired < 2000) return 92 + Math.floor((acquired - 1250) / 50); // 92-107 (cap at 100)
  return 100;
}

/**
 * Get the chunks needed to reach the next sub-level.
 * Useful for progress display ("50 chunks to A2!").
 * 
 * @param currentLevel - Current internal level (0-100)
 * @param acquired - Current chunks acquired
 * @returns Object with next level and chunks needed
 */
export function getChunksToNextLevel(currentLevel: number, acquired: number): {
  nextLevel: CEFRSubLevel;
  chunksNeeded: number;
} {
  // Threshold planning (chunks needed for each level)
  const thresholds: Array<{ level: number; subLevel: CEFRSubLevel; chunks: number }> = [
    { level: 0, subLevel: 'A1', chunks: 0 },
    { level: 10, subLevel: 'A1+', chunks: 50 },
    { level: 20, subLevel: 'A2-', chunks: 100 },
    { level: 30, subLevel: 'A2', chunks: 200 },
    { level: 40, subLevel: 'A2+', chunks: 300 },
    { level: 50, subLevel: 'B1-', chunks: 450 },
    { level: 60, subLevel: 'B1', chunks: 600 },
    { level: 70, subLevel: 'B1+', chunks: 800 },
    { level: 80, subLevel: 'B2-', chunks: 1000 },
    { level: 85, subLevel: 'B2', chunks: 1250 },
    { level: 90, subLevel: 'B2+', chunks: 1500 },
    { level: 93, subLevel: 'C1-', chunks: 1750 },
    { level: 96, subLevel: 'C1', chunks: 2000 },
    { level: 98, subLevel: 'C1+', chunks: 2500 },
    { level: 100, subLevel: 'C2', chunks: 3000 },
  ];
  
  // Find next threshold
  for (const threshold of thresholds) {
    if (acquired < threshold.chunks) {
      return {
        nextLevel: threshold.subLevel,
        chunksNeeded: threshold.chunks - acquired,
      };
    }
  }
  
  // Already at C2
  return {
    nextLevel: 'C2',
    chunksNeeded: 0,
  };
}

// ============================================================================
// SESSION TYPES (for Pedagogy Engine)
// ============================================================================

/**
 * Activity types available in the learning games.
 * 
 * Each type presents chunks in different ways to reinforce learning
 * through varied practice modalities.
 */
export type GameActivityType = 
  | 'multiple_choice'    // Select the correct answer from options
  | 'fill_blank'         // Type or select missing word(s)
  | 'matching'           // Match pairs (chunk to translation)
  | 'translate'          // Translate a chunk
  | 'true_false'         // Determine if statement is correct
  | 'word_arrange'       // Arrange scrambled words into correct order
  | 'listening'          // Listen and identify (Phase 2)
  | 'speaking';          // Speak and compare (Phase 2)

/**
 * Result of a single activity completion.
 * 
 * Used to track performance and update the learner model after
 * each activity in a session.
 */
export interface ActivityResult {
  /** Unique identifier for this activity */
  id: string;
  
  /** Type of activity completed */
  activityType: GameActivityType;
  
  /** Chunk ID(s) involved in this activity */
  chunkIds: string[];
  
  /** Whether the learner answered correctly */
  correct: boolean;
  
  /** Time taken to answer (milliseconds) */
  responseTimeMs: number;
  
  /** Whether help button was used */
  usedHelp: boolean;
  
  /** Number of attempts before correct (1 = first try) */
  attempts: number;
  
  /** Confidence rating if provided (0-1) */
  selfRatedConfidence?: number;
  
  /** When the activity was completed */
  timestamp: string;
}

/**
 * An adaptation action triggered by the affective filter monitor.
 * 
 * When the system detects learner frustration, disengagement, or
 * other affective states, it can adapt the session accordingly.
 */
export type AdaptationAction = 
  | { type: 'none' }
  | { type: 'simplify'; message: string; dropToLevel: number }
  | { type: 'encourage'; message: string }
  | { type: 'challenge'; message: string; increaseToLevel: number }
  | { type: 'suggest_break'; message: string }
  | { type: 'change_topic'; message: string; reason: string };

/**
 * Context for a learning session.
 * 
 * Tracks the current state of a session including performance data,
 * signals for the affective filter, and any adaptations made.
 */
export interface SessionContext {
  /** Unique session identifier */
  sessionId: string;
  
  /** User ID */
  userId: string;
  
  /** Topic being studied */
  topic: string;
  
  /** When the session started */
  startedAt: string;
  
  /** Activity results so far */
  activities: ActivityResult[];
  
  /** Current i+1 target level (1-5 scale) */
  currentTargetLevel: number;
  
  /** Base level before adaptations */
  baseTargetLevel: number;
  
  /** Chunks introduced this session */
  newChunkIds: string[];
  
  /** Chunks reviewed this session */
  reviewChunkIds: string[];
  
  /** Affective filter signals recorded */
  filterSignals: FilterSignal[];
  
  /** Adaptations applied so far */
  adaptations: AdaptationAction[];
  
  /** Whether session is complete */
  isComplete: boolean;
}

/**
 * A signal for the affective filter monitor.
 * 
 * These signals help detect when the learner might be struggling
 * or disengaging, triggering adaptations.
 */
export interface FilterSignal {
  /** Type of signal */
  type: 'wrong_answer' | 'help_used' | 'slow_response' | 'fast_response' | 'session_quit';
  
  /** When the signal occurred */
  timestamp: string;
  
  /** Activity ID that triggered it */
  activityId: string;
  
  /** Optional additional data */
  data?: Record<string, unknown>;
}

/**
 * A plan for a learning session.
 * 
 * Created by the Pedagogy Engine at the start of a session,
 * containing the chunks to learn and review.
 */
export interface SessionPlan {
  /** Unique session identifier */
  sessionId: string;
  
  /** Topic being studied */
  topic: string;
  
  /** New chunks to introduce (at i+1 level) */
  targetChunks: LexicalChunk[];
  
  /** Fragile chunks to reinforce (review) */
  reviewChunks: LexicalChunk[];
  
  /** Familiar chunks for context (already acquired) */
  contextChunks: LexicalChunk[];
  
  /** Recommended activity types for this session */
  recommendedActivities: GameActivityType[];
  
  /** Estimated session duration (minutes) */
  estimatedDuration: number;
  
  /** Difficulty level (i+1, on 1-5 scale) */
  difficulty: number;
  
  /** Why this session was designed this way (for debugging/logging) */
  reasoning?: string;
}

/**
 * Recommendation for the next activity.
 * 
 * Generated after each activity completion to determine
 * what the learner should do next.
 */
export interface ActivityRecommendation {
  /** Type of activity to do next */
  activityType: GameActivityType;
  
  /** Chunks to use in this activity */
  chunks: LexicalChunk[];
  
  /** Why this activity was chosen */
  reason: string;
  
  /** Difficulty level for this activity */
  difficulty: number;
  
  /** Any adaptation being applied */
  adaptation?: AdaptationAction;
  
  /** Whether this is a review activity */
  isReview: boolean;
}

/**
 * Summary at the end of a learning session.
 * 
 * Provides the learner with feedback on their performance and
 * highlights what they learned.
 */
export interface SessionSummary {
  /** Session ID */
  sessionId: string;
  
  /** Duration in minutes */
  durationMinutes: number;
  
  /** Total activities completed */
  activitiesCompleted: number;
  
  /** Activities answered correctly on first try */
  correctFirstTry: number;
  
  /** Accuracy rate (0-1) */
  accuracy: number;
  
  /** New chunks encountered */
  newChunksLearned: number;
  
  /** Chunks now acquired after this session */
  chunksAcquired: number;
  
  /** Review chunks reinforced */
  chunksReviewed: number;
  
  /** SunDrops earned (based on performance) */
  sunDropsEarned: number;
  
  /** Confidence change during session */
  confidenceChange: number;
  
  /** Filter risk at end of session */
  filterRiskScore: number;
  
  /** Tips for next session */
  tips: string[];
  
  /** Chunks that need more practice */
  strugglingChunks: string[];
  
  /** Chunks mastered this session */
  masteredChunks: string[];
}

/**
 * Options for preparing a learning session.
 */
export interface SessionOptions {
  /** Topic to study (optional - if not provided, will choose based on interests/reviews) */
  topic?: string;
  
  /** Target session duration in minutes */
  duration: number;
  
  /** Preferred activity types (optional) */
  activityTypes?: GameActivityType[];
  
  /** Force include specific chunks (optional) */
  forceChunkIds?: string[];
  
  /** Whether to include review chunks */
  includeReviews?: boolean;
  
  /** Maximum new chunks to introduce */
  maxNewChunks?: number;
}

/**
 * Performance data for difficulty adaptation.
 */
export interface PerformanceData {
  /** Number of correct answers */
  correct: number;
  
  /** Total activities */
  total: number;
  
  /** Average response time in milliseconds */
  avgResponseTimeMs: number;
  
  /** Number of help button uses */
  helpUsedCount: number;
}
