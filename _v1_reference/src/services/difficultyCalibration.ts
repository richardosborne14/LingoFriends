/**
 * LingoFriends - i+1 Difficulty Calibration Service
 * 
 * Implements Krashen's Input Hypothesis for optimal difficulty targeting.
 * The core principle: learners acquire language best when exposed to input
 * that is slightly beyond their current level (i+1), not too easy (i) or
 * too hard (i+2+).
 * 
 * Key Concepts:
 * - "i" represents the learner's current competence level
 * - "+1" is the optimal learning zone - challenging but achievable
 * - Filter risk (frustration/disengagement) may require dropping back to "i"
 * 
 * This service provides:
 * - Level calculation from learner profile data
 * - Target difficulty selection (i+1)
 * - Chunk selection at appropriate difficulty
 * - Performance-based difficulty adaptation
 * - Drop-back detection for struggling learners
 * 
 * @module difficultyCalibration
 * @see docs/phase-1.2/task-1.2-6-difficulty-calibration.md
 * @see PEDAGOGY.md Section 2 (Krashen's Input Hypothesis)
 */

import type {
  LearnerProfile,
  LexicalChunk,
  ActivityResult,
  PerformanceData,
} from '../types/pedagogy';
import { learnerProfileService } from './learnerProfileService';
import { chunkManager } from './chunkManager';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of the difficulty calibration analysis.
 * Provides both the current level and the recommended target.
 */
export interface DifficultyCalibration {
  /** Learner's current competence level (1-5 scale) */
  currentLevel: number;
  
  /** Recommended target level for new content (i+1) */
  targetLevel: number;
  
  /** Whether the learner should drop back to consolidation mode */
  shouldDropBack: boolean;
  
  /** Reason for the calibration decision */
  reasoning: string;
  
  /** Factors that influenced the calibration */
  factors: {
    chunkBaseLevel: number;
    confidenceAdjustment: number;
    filterRiskAdjustment: number;
  };
}

/**
 * Performance summary for difficulty adaptation.
 * Used to adjust difficulty after activities.
 */
export interface PerformanceSummary {
  /** Number of correct answers */
  correct: number;
  
  /** Total activities completed */
  total: number;
  
  /** Average response time in milliseconds */
  avgTimeMs: number;
  
  /** Number of times help was used */
  helpUsed: number;
}

/**
 * Options for chunk selection.
 */
export interface ChunkSelectionOptions {
  /** Target language code */
  language?: string;
  
  /** Age group filter */
  ageGroup?: string;
  
  /** Exclude specific chunk IDs */
  excludeIds?: string[];
}

// ============================================================================
// CONSTANTS - CEFR LEVEL MAPPING
// ============================================================================

/**
 * Mapping of acquired chunk counts to CEFR levels.
 * 
 * These thresholds are based on research into vocabulary acquisition
 * and CEFR level correlations. They are approximate and may need
 * calibration based on real user data.
 * 
 * Reference: Milton & Meara (2006), "Vocabulary Acquisition"
 */
const CHUNK_THRESHOLDS: Array<{
  minChunks: number;
  level: number;  // 1-5 scale
  cefr: string;
}> = [
  { minChunks: 0, level: 1.0, cefr: 'A1' },      // Beginner
  { minChunks: 50, level: 1.5, cefr: 'A1+' },   // A1 progressing
  { minChunks: 150, level: 2.0, cefr: 'A2' },   // Elementary
  { minChunks: 300, level: 2.5, cefr: 'A2+' },  // A2 progressing
  { minChunks: 500, level: 3.0, cefr: 'B1' },   // Intermediate
  { minChunks: 800, level: 3.5, cefr: 'B1+' },  // B1 progressing
  { minChunks: 1200, level: 4.0, cefr: 'B2' },  // Upper Intermediate
  { minChunks: 1700, level: 4.5, cefr: 'B2+' }, // B2 progressing
  { minChunks: 2300, level: 5.0, cefr: 'C1' },  // Advanced
];

/**
 * Performance thresholds for difficulty adaptation.
 */
const ADAPTATION_THRESHOLDS = {
  /** Accuracy rate for increasing difficulty (90%+) */
  HIGH_ACCURACY: 0.9,
  
  /** Accuracy rate for decreasing difficulty (below 60%) */
  LOW_ACCURACY: 0.6,
  
  /** Help rate that indicates struggle (above 30%) */
  HIGH_HELP_RATE: 0.3,
  
  /** Help rate indicating good performance (below 10%) */
  LOW_HELP_RATE: 0.1,
  
  /** Difficulty increase for strong performance */
  INCREASE_STEP: 0.2,
  
  /** Difficulty decrease for struggle */
  DECREASE_STEP: 0.3,
};

/**
 * Thresholds for drop-back detection.
 */
const DROP_BACK_THRESHOLDS = {
  /** Wrong answers in recent activities to trigger drop-back */
  RECENT_WRONG_COUNT: 3,
  
  /** Number of recent activities to consider */
  RECENT_WINDOW: 5,
  
  /** Filter risk score threshold (0-1) */
  FILTER_RISK_THRESHOLD: 0.7,
  
  /** Confidence score threshold (0-1) */
  LOW_CONFIDENCE_THRESHOLD: 0.4,
};

// ============================================================================
// MAIN EXPORT FUNCTIONS
// ============================================================================

/**
 * Calculate the learner's current "i" level (1-5 scale).
 * 
 * This represents the learner's current competence level, calculated from:
 * 1. Base level from acquired chunks (CEFR-mapped)
 * 2. Confidence adjustment (±0.15 based on performance)
 * 3. Filter risk adjustment (reduces level when stressed)
 * 
 * @param profile - The learner's profile
 * @returns Current level on 1-5 scale
 * 
 * @example
 * const profile = await learnerProfileService.getProfile(userId);
 * const currentLevel = getCurrentLevel(profile);
 * console.log(`Learner is at level ${currentLevel.toFixed(1)}`);
 */
export function getCurrentLevel(profile: LearnerProfile): number {
  // Base level from acquired chunks
  const chunkLevel = mapChunksToLevel(profile.chunksAcquired);
  
  // Confidence adjustment: high confidence boosts level, low reduces it
  // Range: -0.15 to +0.15 (confidence 0-1, centered at 0.5)
  const confidenceAdj = (profile.averageConfidence - 0.5) * 0.3;
  
  // Filter risk adjustment: stressed learners need easier content
  // Higher filter risk reduces level (max reduction: 0.2)
  const filterAdj = -profile.filterRiskScore * 0.2;
  
  // Combine and clamp to valid range
  const level = chunkLevel + confidenceAdj + filterAdj;
  
  return Math.max(1, Math.min(5, level));
}

/**
 * Calculate the target i+1 level for new content.
 * 
 * The target is one level above the learner's current level, but:
 * - Capped at level 5 (maximum difficulty)
 * - May drop to "i" (current level) if filter risk is high
 * 
 * @param profile - The learner's profile
 * @returns Target level on 1-5 scale
 * 
 * @example
 * const currentLevel = getCurrentLevel(profile);
 * const targetLevel = getTargetLevel(profile);
 * console.log(`Targeting i+1: ${currentLevel.toFixed(1)} → ${targetLevel.toFixed(1)}`);
 */
export function getTargetLevel(profile: LearnerProfile): number {
  const i = getCurrentLevel(profile);
  
  // Standard i+1 calculation
  let target = i + 1;
  
  // If filter risk is elevated, stay at current level (consolidation mode)
  // This prevents overwhelming a frustrated learner
  if (profile.filterRiskScore > DROP_BACK_THRESHOLDS.FILTER_RISK_THRESHOLD) {
    return i; // Stay at "i" instead of "i+1"
  }
  
  // Clamp to valid range
  return Math.max(1, Math.min(5, target));
}

/**
 * Get a full difficulty calibration analysis for a learner.
 * 
 * Provides detailed information about the current level, target level,
 * and factors that influenced the calculation.
 * 
 * @param profile - The learner's profile
 * @returns Complete calibration analysis
 */
export function calibrateDifficulty(profile: LearnerProfile): DifficultyCalibration {
  const chunkBaseLevel = mapChunksToLevel(profile.chunksAcquired);
  const confidenceAdjustment = (profile.averageConfidence - 0.5) * 0.3;
  const filterRiskAdjustment = -profile.filterRiskScore * 0.2;
  
  const currentLevel = getCurrentLevel(profile);
  const targetLevel = getTargetLevel(profile);
  const shouldDropBack = checkShouldDropBack(profile, []);
  
  // Build reasoning string
  const factors: string[] = [];
  factors.push(`${profile.chunksAcquired} chunks acquired (base level ${chunkBaseLevel.toFixed(1)})`);
  
  if (confidenceAdjustment > 0.05) {
    factors.push(`high confidence (+${confidenceAdjustment.toFixed(2)})`);
  } else if (confidenceAdjustment < -0.05) {
    factors.push(`low confidence (${confidenceAdjustment.toFixed(2)})`);
  }
  
  if (filterRiskAdjustment < -0.05) {
    factors.push(`filter risk reduced level (${filterRiskAdjustment.toFixed(2)})`);
  }
  
  let reasoning: string;
  if (shouldDropBack) {
    reasoning = `Dropping to consolidation mode (level ${currentLevel.toFixed(1)}) due to elevated filter risk. `;
  } else {
    reasoning = `Targeting i+1 at level ${targetLevel.toFixed(1)}. `;
  }
  reasoning += `Factors: ${factors.join(', ')}.`;
  
  return {
    currentLevel,
    targetLevel,
    shouldDropBack,
    reasoning,
    factors: {
      chunkBaseLevel,
      confidenceAdjustment,
      filterRiskAdjustment,
    },
  };
}

/**
 * Select chunks at the learner's i+1 level.
 * 
 * These are the target chunks for a learning session - new content
 * that is slightly above the learner's current level.
 * 
 * @param userId - User ID
 * @param topic - Topic to filter by
 * @param count - Maximum number of chunks to return
 * @param options - Additional selection options
 * @returns Array of chunks at the target difficulty
 * 
 * @example
 * const newChunks = await selectChunksForLevel(userId, 'restaurant', 5);
 * console.log(`Found ${newChunks.length} chunks for learning`);
 */
export async function selectChunksForLevel(
  userId: string,
  topic: string,
  count: number,
  options?: ChunkSelectionOptions
): Promise<LexicalChunk[]> {
  // Get learner profile
  const profile = await learnerProfileService.getProfile(userId);
  if (!profile) {
    throw new Error('Learner profile not found');
  }
  
  // Get target level
  const targetLevel = getTargetLevel(profile);
  
  // Determine language (from profile or options)
  const language = options?.language ?? profile.targetLanguage;
  
  // Search for chunks at target difficulty (±0.5 tolerance)
  const chunks = await chunkManager.searchChunks({
    topic,
    difficulty: [Math.max(1, targetLevel - 0.5), Math.min(5, targetLevel + 0.5)],
    language,
    limit: count * 3, // Get more than needed for variety
    excludeIds: options?.excludeIds,
    ageGroup: options?.ageGroup,
  });
  
  // Get already acquired chunks to filter out
  const acquiredChunks = await chunkManager.getChunksByStatus(userId, 'acquired' as any, 100);
  const acquiredIds = new Set(acquiredChunks.map(uc => uc.chunkId));
  
  // Also exclude learning chunks (already encountered)
  const learningChunks = await chunkManager.getChunksByStatus(userId, 'learning' as any, 100);
  const learningIds = new Set(learningChunks.map(uc => uc.chunkId));
  
  // Filter out already known chunks
  const newChunks = chunks.filter(c => !acquiredIds.has(c.id) && !learningIds.has(c.id));
  
  // Sort by frequency (more common chunks first)
  newChunks.sort((a, b) => a.frequency - b.frequency);
  
  // Return the requested count
  return newChunks.slice(0, count);
}

/**
 * Get chunks for context (i level - already acquired or learning).
 * 
 * Context chunks provide familiar scaffolding around new content,
 * helping learners connect new material to what they already know.
 * 
 * @param userId - User ID
 * @param topic - Topic to filter by
 * @param count - Maximum number of chunks to return
 * @returns Array of familiar chunks for context
 * 
 * @example
 * const contextChunks = await getContextChunks(userId, 'restaurant', 10);
 * console.log(`Using ${contextChunks.length} familiar chunks for scaffolding`);
 */
export async function getContextChunks(
  userId: string,
  topic: string,
  count: number
): Promise<LexicalChunk[]> {
  // Get learner profile
  const profile = await learnerProfileService.getProfile(userId);
  if (!profile) {
    throw new Error('Learner profile not found');
  }
  
  const currentLevel = getCurrentLevel(profile);
  
  // Get chunks at or below current level
  const chunks = await chunkManager.searchChunks({
    topic,
    difficulty: [1, currentLevel],
    language: profile.targetLanguage,
    limit: count * 2,
  });
  
  // Only include chunks that are acquired or learning
  const userChunks = await chunkManager.getUserChunksForTopic(userId, topic, count * 2);
  const knownIds = new Set(
    userChunks
      .filter(uc => uc.status === 'acquired' || uc.status === 'learning')
      .map(uc => uc.chunkId)
  );
  
  // Filter to known chunks
  const contextChunks = chunks.filter(c => knownIds.has(c.id));
  
  // Sort by confidence (most confident first)
  contextChunks.sort((a, b) => {
    const aChunk = userChunks.find(uc => uc.chunkId === a.id);
    const bChunk = userChunks.find(uc => uc.chunkId === b.id);
    return (bChunk?.confidenceScore ?? 0) - (aChunk?.confidenceScore ?? 0);
  });
  
  return contextChunks.slice(0, count);
}

/**
 * Adapt difficulty based on performance.
 * 
 * Called after each activity (or batch of activities) to adjust
 * the target i+1 level based on how the learner performed.
 * 
 * Rules:
 * - 90%+ accuracy with low help use → increase difficulty
 * - Below 60% accuracy or high help use → decrease difficulty
 * - Otherwise → maintain current level
 * 
 * @param currentTarget - Current target level (1-5 scale)
 * @param performance - Performance data from recent activities
 * @returns Adjusted target level
 * 
 * @example
 * const newTarget = adaptDifficulty(3.0, {
 *   correct: 9,
 *   total: 10,
 *   avgTimeMs: 3000,
 *   helpUsed: 0
 * });
 * // newTarget would be 3.2 (strong performance, increase)
 */
export function adaptDifficulty(
  currentTarget: number,
  performance: PerformanceData
): number {
  const accuracy = performance.correct / Math.max(1, performance.total);
  const helpRate = performance.helpUsedCount / Math.max(1, performance.total);
  
  // Strong performance: increase difficulty slightly
  if (accuracy >= ADAPTATION_THRESHOLDS.HIGH_ACCURACY && 
      helpRate < ADAPTATION_THRESHOLDS.LOW_HELP_RATE) {
    return Math.min(5, currentTarget + ADAPTATION_THRESHOLDS.INCREASE_STEP);
  }
  
  // Struggling: decrease difficulty more aggressively
  if (accuracy < ADAPTATION_THRESHOLDS.LOW_ACCURACY || 
      helpRate > ADAPTATION_THRESHOLDS.HIGH_HELP_RATE) {
    return Math.max(1, currentTarget - ADAPTATION_THRESHOLDS.DECREASE_STEP);
  }
  
  // Good performance but used some help: small increase
  if (accuracy >= 0.8 && helpRate <= ADAPTATION_THRESHOLDS.HIGH_HELP_RATE) {
    return Math.min(5, currentTarget + 0.1);
  }
  
  // Moderate struggling (60-70% accuracy): small decrease
  if (accuracy < 0.7) {
    return Math.max(1, currentTarget - 0.15);
  }
  
  // Maintain current level
  return currentTarget;
}

/**
 * Determine if we should drop back to "i" level (consolidation mode).
 * 
 * Drop-back is triggered when:
 * - 3+ wrong answers in the last 5 activities
 * - Filter risk score is high (>0.7)
 * - Confidence is very low (<0.4)
 * 
 * This prevents the "affective filter" from blocking learning
 * due to frustration or anxiety.
 * 
 * @param profile - The learner's profile
 * @param recentPerformance - Recent activity results
 * @returns Whether to drop back to consolidation mode
 * 
 * @example
 * const shouldDrop = shouldDropBack(profile, recentActivities);
 * if (shouldDrop) {
 *   console.log('Switching to consolidation mode - reviewing familiar content');
 * }
 */
export function shouldDropBack(
  profile: LearnerProfile,
  recentPerformance: ActivityResult[]
): boolean {
  return checkShouldDropBack(profile, recentPerformance);
}

/**
 * Internal implementation of drop-back detection.
 * Separated for reuse within the module.
 */
function checkShouldDropBack(
  profile: LearnerProfile,
  recentPerformance: ActivityResult[]
): boolean {
  // Check wrong answer streak
  const recentWrong = recentPerformance
    .slice(-DROP_BACK_THRESHOLDS.RECENT_WINDOW)
    .filter(p => !p.correct).length;
  
  if (recentWrong >= DROP_BACK_THRESHOLDS.RECENT_WRONG_COUNT) {
    return true;
  }
  
  // Check filter risk score
  if (profile.filterRiskScore > DROP_BACK_THRESHOLDS.FILTER_RISK_THRESHOLD) {
    return true;
  }
  
  // Check for very low confidence
  if (profile.averageConfidence < DROP_BACK_THRESHOLDS.LOW_CONFIDENCE_THRESHOLD) {
    return true;
  }
  
  return false;
}

/**
 * Map acquired chunk count to CEFR-based level (1-5 scale).
 * 
 * This provides a rough approximation of learner level based on
 * vocabulary size. The thresholds are based on research into
 * CEFR-vocabulary correlations.
 * 
 * @param acquiredCount - Number of chunks with "acquired" status
 * @returns Level on 1-5 scale
 */
export function mapChunksToLevel(acquiredCount: number): number {
  // Find the appropriate level based on chunk count
  for (let i = CHUNK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (acquiredCount >= CHUNK_THRESHOLDS[i].minChunks) {
      return CHUNK_THRESHOLDS[i].level;
    }
  }
  
  // Default to base level
  return 1.0;
}

/**
 * Convert 1-5 scale level to CEFR label.
 * 
 * @param level - Level on 1-5 scale
 * @returns CEFR level string
 */
export function levelToCEFRLabel(level: number): string {
  if (level < 1.5) return 'A1';
  if (level < 2) return 'A1+';
  if (level < 2.5) return 'A2';
  if (level < 3) return 'A2+';
  if (level < 3.5) return 'B1';
  if (level < 4) return 'B1+';
  if (level < 4.5) return 'B2';
  if (level < 5) return 'B2+';
  return 'C1';
}

/**
 * Calculate appropriate difficulty range for search.
 * 
 * Given a target level, returns a min-max range that accounts
 * for tolerance in matching.
 * 
 * @param targetLevel - Target level (1-5 scale)
 * @param tolerance - Tolerance for range (default 0.5)
 * @returns [min, max] difficulty range
 */
export function getDifficultyRange(
  targetLevel: number,
  tolerance: number = 0.5
): [number, number] {
  return [
    Math.max(1, targetLevel - tolerance),
    Math.min(5, targetLevel + tolerance),
  ];
}

/**
 * Get chunks that are optimal for consolidation (review mode).
 * 
 * When a learner needs to drop back, get chunks at their current
 * level (i) rather than above (i+1).
 * 
 * @param userId - User ID
 * @param topic - Topic to filter by
 * @param count - Maximum number of chunks
 * @returns Array of chunks for consolidation
 */
export async function getConsolidationChunks(
  userId: string,
  topic: string,
  count: number
): Promise<LexicalChunk[]> {
  const profile = await learnerProfileService.getProfile(userId);
  if (!profile) {
    throw new Error('Learner profile not found');
  }
  
  const currentLevel = getCurrentLevel(profile);
  
  // Get fragile chunks (need review most)
  const fragileChunks = await chunkManager.getFragileChunks(userId, count);
  
  if (fragileChunks.length >= count) {
    // Get the actual chunk data
    const chunks: LexicalChunk[] = [];
    for (const uc of fragileChunks.slice(0, count)) {
      const chunk = await chunkManager.getChunk(uc.chunkId);
      if (chunk) chunks.push(chunk);
    }
    return chunks;
  }
  
  // Get learning chunks at current level
  const learningChunks = await chunkManager.getChunksByStatus(userId, 'learning' as any, count);
  
  // Convert to LexicalChunks
  const chunks: LexicalChunk[] = [];
  for (const uc of fragileChunks) {
    const chunk = await chunkManager.getChunk(uc.chunkId);
    if (chunk) chunks.push(chunk);
  }
  
  for (const uc of learningChunks) {
    if (chunks.length >= count) break;
    const chunk = await chunkManager.getChunk(uc.chunkId);
    if (chunk && !chunks.find(c => c.id === chunk.id)) {
      chunks.push(chunk);
    }
  }
  
  return chunks.slice(0, count);
}

// ============================================================================
// LEGACY COMPATIBILITY - Activity Result Conversion
// ============================================================================

/**
 * Convert ActivityResult array to PerformanceData summary.
 * 
 * @param activities - Array of activity results
 * @returns Performance summary for adaptation
 */
export function summarizePerformance(activities: ActivityResult[]): PerformanceData {
  const total = activities.length;
  const correct = activities.filter(a => a.correct).length;
  const helpUsedCount = activities.filter(a => a.usedHelp).length;
  
  const totalResponseTime = activities.reduce((sum, a) => sum + a.responseTimeMs, 0);
  const avgResponseTimeMs = total > 0 ? totalResponseTime / total : 0;
  
  return {
    correct,
    total,
    avgResponseTimeMs,
    helpUsedCount,
  };
}