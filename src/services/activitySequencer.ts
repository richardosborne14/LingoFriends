/**
 * LingoFriends — Activity Sequencer
 *
 * Plans the sequence of activity types for a lesson BEFORE content generation.
 * This ensures variety and pedagogically-sound progression without relying
 * on the AI to choose activity types.
 *
 * PEDAGOGICAL FRAMEWORK:
 * - Recognition tier (easiest): TRUE_FALSE, MULTIPLE_CHOICE
 * - Guided production tier (medium): MATCHING, FILL_BLANK
 * - Free production tier (hardest): WORD_ARRANGE, TRANSLATE
 *
 * RULES:
 * 1. Every lesson starts with an INFO step (teach the chunk)
 * 2. First quiz should be recognition tier (easy win after learning)
 * 3. Progress from easier to harder activities
 * 4. NO two consecutive quiz steps may have the same activity type
 * 5. Lessons with 5+ quiz steps use at least 3 distinct types
 * 6. Lessons with 7+ quiz steps use at least 4 distinct types
 *
 * This module has ZERO dependencies on AI services — pure TypeScript logic.
 *
 * @module activitySequencer
 * @see docs/phase-1.3-activity-improvements/task-1-activity-variety.md
 */

import { GameActivityType } from '../types/game';

// ============================================================================
// CONSTANTS — ACTIVITY TIERS
// ============================================================================

/**
 * Activity difficulty tiers based on cognitive demand.
 *
 * RECOGNITION: Learner identifies meaning from options (easiest)
 * - TRUE_FALSE: Binary choice, lowest cognitive load
 * - MULTIPLE_CHOICE: 4 options, still recognition-based
 *
 * GUIDED_PRODUCTION: Learner produces language with scaffolding (medium)
 * - MATCHING: Connect pairs, visual support
 * - FILL_BLANK: Complete partial sentence, context provided
 *
 * FREE_PRODUCTION: Learner constructs language independently (hardest)
 * - WORD_ARRANGE: Construct sentence from given words
 * - TRANSLATE: Full translation with no scaffolding
 */
const ACTIVITY_TIERS = {
  recognition: [GameActivityType.TRUE_FALSE, GameActivityType.MULTIPLE_CHOICE],
  guided_production: [GameActivityType.MATCHING, GameActivityType.FILL_BLANK],
  free_production: [GameActivityType.WORD_ARRANGE, GameActivityType.TRANSLATE],
} as const;

/**
 * All quiz activity types (excludes INFO which is teaching, not quiz).
 */
const ALL_QUIZ_TYPES: GameActivityType[] = [
  ...ACTIVITY_TIERS.recognition,
  ...ACTIVITY_TIERS.guided_production,
  ...ACTIVITY_TIERS.free_production,
];

/**
 * SunDrop values by activity type.
 * Harder activities reward more SunDrops.
 */
const SUNDROR_BY_TYPE: Record<GameActivityType, number> = {
  [GameActivityType.TRUE_FALSE]: 1,
  [GameActivityType.MULTIPLE_CHOICE]: 1,
  [GameActivityType.MATCHING]: 2,
  [GameActivityType.FILL_BLANK]: 2,
  [GameActivityType.WORD_ARRANGE]: 3,
  [GameActivityType.TRANSLATE]: 3,
  [GameActivityType.INFO]: 0,
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single step in the planned sequence.
 */
export interface SequenceStep {
  /** Whether this is a teaching step (INFO) or a quiz step */
  type: 'info' | 'quiz';
  /** For quiz steps, the activity type to use */
  activityType?: GameActivityType;
  /** SunDrops for this step (0 for INFO) */
  sunDrops: number;
}

/**
 * Complete sequence plan for a lesson.
 */
export interface SequencePlan {
  /** Ordered list of all steps (INFO + quiz) */
  fullPlan: SequenceStep[];
  /** Just the quiz activity types in order (excludes INFO) */
  quizTypes: GameActivityType[];
  /** Number of distinct activity types used */
  distinctTypeCount: number;
  /** Total SunDrops for all quiz steps */
  totalQuizSunDrops: number;
}

/**
 * Options for sequence planning.
 */
export interface SequenceOptions {
  /** Learner's difficulty level (1-5), affects type selection */
  difficulty?: number;
  /** Activity types used in the previous lesson (to avoid inter-lesson repetition) */
  previousLessonTypes?: GameActivityType[];
  /** Seed for deterministic random selection (useful for testing) */
  seed?: number;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Plan the activity type sequence for a lesson.
 *
 * The sequence follows pedagogical principles:
 * 1. INFO steps introduce chunks (teaching, not quiz)
 * 2. Quiz steps progress from recognition to production
 * 3. No consecutive duplicate activity types
 * 4. Minimum variety requirements are enforced
 *
 * @param totalSteps - Total steps in the lesson (including INFO)
 * @param infoStepIndices - Which step indices are INFO steps (0-based)
 * @param options - Optional difficulty and previous lesson context
 * @returns SequencePlan with ordered activity types
 *
 * @example
 * // Plan a 10-step lesson with INFO at positions 0, 5
 * const plan = planActivitySequence(10, [0, 5], { difficulty: 2 });
 * // Returns: { fullPlan: [...], quizTypes: [...], distinctTypeCount: 4, ... }
 */
export function planActivitySequence(
  totalSteps: number,
  infoStepIndices: number[],
  options: SequenceOptions = {}
): SequencePlan {
  const { difficulty = 2, previousLessonTypes = [], seed } = options;

  // Calculate how many quiz steps we need
  const quizStepCount = totalSteps - infoStepIndices.length;

  // Build the weighted pool based on difficulty
  const pool = buildWeightedPool(difficulty);

  // Generate quiz types with no consecutive duplicates
  const quizTypes: GameActivityType[] = [];
  const rng = createRng(seed);

  for (let i = 0; i < quizStepCount; i++) {
    const lastType = quizTypes[quizTypes.length - 1] ?? null;
    const progress = i / Math.max(1, quizStepCount - 1); // 0 to 1

    // Filter out the last used type to prevent consecutive duplicates
    let candidates = pool.filter(t => t !== lastType);

    // Apply tier preference based on progress through lesson
    candidates = applyTierPreference(candidates, progress, rng);

    // Pick a candidate using weighted random selection
    const chosen = selectFromPool(candidates, rng);

    quizTypes.push(chosen);
  }

  // Ensure minimum variety
  enforceMinimumVariety(quizTypes, rng);

  // Build full plan with INFO steps inserted
  const fullPlan = buildFullPlan(totalSteps, infoStepIndices, quizTypes);

  // Calculate metadata
  const distinctTypeCount = new Set(quizTypes).size;
  const totalQuizSunDrops = quizTypes.reduce(
    (sum, type) => sum + SUNDROR_BY_TYPE[type],
    0
  );

  return {
    fullPlan,
    quizTypes,
    distinctTypeCount,
    totalQuizSunDrops,
  };
}

/**
 * Get the SunDrops value for an activity type.
 */
export function getSunDropsForType(type: GameActivityType): number {
  return SUNDROR_BY_TYPE[type] ?? 1;
}

/**
 * Get a human-readable description of an activity type.
 * Used in debugging and logging.
 */
export function getActivityDescription(type: GameActivityType): string {
  const descriptions: Record<GameActivityType, string> = {
    [GameActivityType.INFO]: 'information/teaching',
    [GameActivityType.MULTIPLE_CHOICE]: 'multiple choice (4 options)',
    [GameActivityType.TRUE_FALSE]: 'true/false (binary choice)',
    [GameActivityType.FILL_BLANK]: 'fill in the blank',
    [GameActivityType.MATCHING]: 'matching pairs',
    [GameActivityType.WORD_ARRANGE]: 'word arrangement',
    [GameActivityType.TRANSLATE]: 'translation',
  };
  return descriptions[type] ?? type;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Build a weighted pool of activity types based on difficulty.
 *
 * Lower difficulty = more recognition activities (easier)
 * Higher difficulty = more production activities (harder)
 */
function buildWeightedPool(difficulty: number): GameActivityType[] {
  const pool: GameActivityType[] = [];

  // Recognition: more copies at low difficulty
  // difficulty 1 → 3 copies, difficulty 5 → 0 copies
  const recognitionWeight = Math.max(0, 4 - difficulty);
  for (let i = 0; i < recognitionWeight; i++) {
    pool.push(...ACTIVITY_TIERS.recognition);
  }

  // Guided production: steady presence
  // Always 2 copies regardless of difficulty
  const guidedWeight = 2;
  for (let i = 0; i < guidedWeight; i++) {
    pool.push(...ACTIVITY_TIERS.guided_production);
  }

  // Free production: more copies at high difficulty
  // difficulty 1 → 0 copies, difficulty 5 → 4 copies
  const productionWeight = Math.max(0, difficulty - 1);
  for (let i = 0; i < productionWeight; i++) {
    pool.push(...ACTIVITY_TIERS.free_production);
  }

  // Ensure pool is never empty (minimum case: difficulty 2)
  if (pool.length === 0) {
    pool.push(
      GameActivityType.MULTIPLE_CHOICE,
      GameActivityType.FILL_BLANK,
      GameActivityType.TRANSLATE
    );
  }

  return pool;
}

/**
 * Apply tier preference based on lesson progress.
 *
 * Early steps (0-33%): Prefer recognition (easy wins)
 * Middle steps (33-66%): No preference (variety)
 * Late steps (66-100%): Prefer production (challenge)
 */
function applyTierPreference(
  candidates: GameActivityType[],
  progress: number,
  rng: () => number
): GameActivityType[] {
  // Use Set<GameActivityType> to avoid TypeScript narrowing issues
  const recognitionSet: Set<GameActivityType> = new Set(ACTIVITY_TIERS.recognition);
  const productionSet: Set<GameActivityType> = new Set(ACTIVITY_TIERS.free_production);

  if (progress < 0.33) {
    // Early: strongly prefer recognition
    const preferred = candidates.filter(t => recognitionSet.has(t));
    return preferred.length > 0 ? preferred : candidates;
  } else if (progress > 0.66) {
    // Late: prefer production
    const preferred = candidates.filter(t => productionSet.has(t));
    return preferred.length > 0 ? preferred : candidates;
  }

  // Middle: return all candidates (no preference)
  return candidates;
}

/**
 * Select an activity type from a pool using random selection.
 */
function selectFromPool(pool: GameActivityType[], rng: () => number): GameActivityType {
  if (pool.length === 0) {
    // Fallback to a safe default
    return GameActivityType.MULTIPLE_CHOICE;
  }
  const index = Math.floor(rng() * pool.length);
  return pool[index];
}

/**
 * Create a random number generator.
 * If seed is provided, returns a seeded PRNG for deterministic results.
 * If no seed, returns Math.random.
 *
 * Uses mulberry32 algorithm for seeded random generation.
 */
function createRng(seed?: number): () => number {
  if (seed === undefined) {
    return Math.random;
  }

  // Mulberry32 PRNG - properly initialized
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t >>> 14;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Enforce minimum variety in the quiz types array.
 * Mutates the array in-place if needed.
 *
 * Rules:
 * - 5+ quiz steps → at least 3 distinct types
 * - 7+ quiz steps → at least 4 distinct types
 */
function enforceMinimumVariety(
  quizTypes: GameActivityType[],
  rng: () => number
): void {
  const distinctTypes = new Set(quizTypes);
  const minRequired = quizTypes.length >= 7 ? 4 : quizTypes.length >= 5 ? 3 : 2;

  if (distinctTypes.size >= minRequired) {
    return; // Already meets requirements
  }

  // Find types not yet used
  const missingTypes = ALL_QUIZ_TYPES.filter(t => !distinctTypes.has(t));

  // Count occurrences of each type
  const typeCounts = new Map<GameActivityType, number>();
  quizTypes.forEach(t => {
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  });

  // Replace over-represented types with missing types
  let typesAdded = 0;
  const typesNeeded = minRequired - distinctTypes.size;

  for (const missingType of missingTypes) {
    if (typesAdded >= typesNeeded) break;

    // Find the type with the most occurrences
    let maxCount = 0;
    let maxType: GameActivityType | null = null;
    typeCounts.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    });

    if (maxType && maxCount > 1) {
      // Find an occurrence that won't create consecutive duplicate
      for (let i = 0; i < quizTypes.length; i++) {
        if (quizTypes[i] === maxType) {
          // Check if replacing would create consecutive duplicate
          const prev = quizTypes[i - 1];
          const next = quizTypes[i + 1];
          if (prev === missingType || next === missingType) {
            continue; // Skip this position
          }

          // Replace
          quizTypes[i] = missingType;
          typeCounts.set(maxType, maxCount - 1);
          typeCounts.set(missingType, 1);
          typesAdded++;
          break;
        }
      }
    }
  }
}

/**
 * Build the full plan array by interleaving INFO and quiz steps.
 */
function buildFullPlan(
  totalSteps: number,
  infoStepIndices: number[],
  quizTypes: GameActivityType[]
): SequenceStep[] {
  const fullPlan: SequenceStep[] = [];
  const infoSet = new Set(infoStepIndices);
  let quizIndex = 0;

  for (let i = 0; i < totalSteps; i++) {
    if (infoSet.has(i)) {
      fullPlan.push({
        type: 'info',
        sunDrops: 0,
      });
    } else {
      const activityType = quizTypes[quizIndex] ?? GameActivityType.MULTIPLE_CHOICE;
      fullPlan.push({
        type: 'quiz',
        activityType,
        sunDrops: SUNDROR_BY_TYPE[activityType],
      });
      quizIndex++;
    }
  }

  return fullPlan;
}