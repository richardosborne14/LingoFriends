/**
 * LingoFriends - SRS Service (Task F)
 *
 * Spaced Repetition System for chunk acquisition.
 *
 * Architecture note:
 * - `chunkManager.recordEncounter()` owns the PB write (SM-2 update per record).
 * - THIS service exposes:
 *   1. Pure SM-2 calculation functions  — testable without any DB.
 *   2. `recordBatchEncounters()`        — translates lesson star rating → chunk signals,
 *                                         then calls chunkManager for each chunk.
 *   3. Convenience wrappers             — getDueChunks, getFragileChunks, decayOverdueChunks.
 *
 * Why keep it separate from chunkManager?
 * chunkManager is a data-layer CRUD service; srsService is the algorithm layer.
 * Keeping them apart lets us unit-test the algorithm with zero DB dependencies.
 *
 * @module srsService
 * @see docs/phase-1.2/task-1.2-10-chunk-srs.md
 * @see PEDAGOGY.md for SM-2 background
 */

import { chunkManager } from './chunkManager';
import { ChunkStatus } from '../types/pedagogy';
import type { UserChunk, LexicalChunk } from '../types/pedagogy';

// ============================================================================
// CONSTANTS
// ============================================================================

/** SM-2 minimum ease factor — very difficult items floor here */
const MIN_EASE_FACTOR = 1.3;

/** SM-2 maximum ease factor — cap prevents ludicrously long intervals */
const MAX_EASE_FACTOR = 3.0;

/** Maximum interval in days — 6 months prevents scheduling into oblivion */
const MAX_INTERVAL_DAYS = 180;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of a pure SM-2 calculation.
 * No side effects — all data, no DB.
 */
export interface SRSCalculation {
  /** New acquisition status */
  status: ChunkStatus;
  /** Days until next review */
  interval: number;
  /** Updated ease factor */
  easeFactor: number;
  /** Computed next review date */
  nextReviewDate: Date;
}

/**
 * Input for recording a batch of encounters at lesson end.
 * Used when we only have a coarse star rating, not per-activity data.
 */
export interface BatchEncounterInput {
  /** User ID */
  userId: string;
  /** All chunks encountered in the session */
  chunks: LexicalChunk[];
  /**
   * Lesson star rating (1-3).
   * 3★ = answered well   → correct, no help
   * 2★ = needed help      → correct, used help
   * 1★ = struggled        → incorrect
   */
  starRating: 1 | 2 | 3;
}

/**
 * Summary returned by recordBatchEncounters.
 */
export interface BatchEncounterResult {
  /** Number of chunk records successfully updated */
  updated: number;
  /** Number of chunks that failed to update */
  failed: number;
  /** Chunk IDs that graduated: learning → acquired */
  graduated: string[];
  /** Chunk IDs that became fragile this session */
  becameFragile: string[];
}

// ============================================================================
// PURE SM-2+ FUNCTIONS
// ============================================================================

/**
 * Calculate the next SRS parameters for a chunk after one encounter.
 *
 * Pure function — no side effects, no imports beyond types.
 * chunkManager calls this indirectly through its own private calculateSRSUpdate;
 * we expose it here so it can be independently unit-tested.
 *
 * Rules:
 * - Incorrect     → ease factor -0.3, interval reset to 1 day, status → fragile (if was acquired)
 * - Correct+help  → ease factor -0.1, interval × 1.2, status stays/moves to learning
 * - Correct alone → ease factor +0.1, SM-2 interval growth, graduates after 3 clean reps
 *
 * @param chunk   - Minimal UserChunk state needed for calculation
 * @param result  - Encounter outcome
 * @returns       - New SRS parameters (no DB write)
 */
export function calculateNextReview(
  chunk: Pick<UserChunk, 'status' | 'easeFactor' | 'interval' | 'repetitions'>,
  result: { correct: boolean; usedHelp: boolean }
): SRSCalculation {
  const now = new Date();

  // ── Incorrect answer ─────────────────────────────────────────────────────
  // Penalise ease factor; reset to short interval.
  // Acquired chunks become fragile — they'll surface in the next session's review.
  if (!result.correct) {
    const newEF = Math.max(MIN_EASE_FACTOR, chunk.easeFactor - 0.3);
    const newStatus: ChunkStatus =
      chunk.status === ChunkStatus.ACQUIRED ? ChunkStatus.FRAGILE : chunk.status;
    return {
      status: newStatus,
      interval: 1,
      easeFactor: newEF,
      nextReviewDate: addDays(now, 1),
    };
  }

  // ── Correct with help ─────────────────────────────────────────────────────
  // Learner got there but needed a nudge — grow interval conservatively.
  if (result.usedHelp) {
    const newEF = Math.max(MIN_EASE_FACTOR, chunk.easeFactor - 0.1);
    const newInterval = Math.max(1, Math.round(chunk.interval * 1.2));
    // Only advance from 'new' to 'learning' — don't graduate on a helped answer.
    const newStatus: ChunkStatus =
      chunk.status === ChunkStatus.NEW ? ChunkStatus.LEARNING : chunk.status;
    return {
      status: newStatus,
      interval: newInterval,
      easeFactor: newEF,
      nextReviewDate: addDays(now, newInterval),
    };
  }

  // ── Correct without help — full SM-2 ────────────────────────────────────
  const newReps = chunk.repetitions + 1;
  const newEF = Math.min(MAX_EASE_FACTOR, chunk.easeFactor + 0.1);

  // Classic SM-2 interval schedule
  let newInterval: number;
  if (newReps === 1) {
    newInterval = 1;   // Review tomorrow
  } else if (newReps === 2) {
    newInterval = 3;   // Review in 3 days
  } else {
    newInterval = Math.round(chunk.interval * newEF);
  }
  newInterval = Math.min(MAX_INTERVAL_DAYS, newInterval);

  // Status transition logic
  let newStatus: ChunkStatus;
  if (chunk.status === ChunkStatus.FRAGILE) {
    // Fragile chunk recalled successfully → restore to acquired
    newStatus = ChunkStatus.ACQUIRED;
  } else if (newReps >= 3 && newEF >= 2.0) {
    // 3 clean reviews with healthy ease factor → graduate to acquired
    newStatus = ChunkStatus.ACQUIRED;
  } else {
    newStatus = ChunkStatus.LEARNING;
  }

  return {
    status: newStatus,
    interval: newInterval,
    easeFactor: newEF,
    nextReviewDate: addDays(now, newInterval),
  };
}

// ============================================================================
// TOPIC HEALTH
// ============================================================================

/**
 * Calculate topic health (0–100) from a set of chunk statuses.
 *
 * Used to drive tree health in the garden:
 *   acquired → full health (100)
 *   learning → moderate health (70)
 *   fragile  → low health (30)
 *   new      → neutral (50)
 *
 * Returns 50 for empty input (no data = neutral assumption).
 *
 * @param chunks - Array of objects with at minimum a `status` field
 * @returns      - Health score 0–100
 */
export function calculateTopicHealth(
  chunks: Array<Pick<UserChunk, 'status'>>
): number {
  if (chunks.length === 0) return 50;

  const weights: Record<ChunkStatus, number> = {
    [ChunkStatus.ACQUIRED]: 100,
    [ChunkStatus.LEARNING]:  70,
    [ChunkStatus.FRAGILE]:   30,
    [ChunkStatus.NEW]:       50,
  };

  const total = chunks.reduce((sum, c) => sum + weights[c.status], 0);
  return Math.round(total / chunks.length);
}

// ============================================================================
// BATCH ENCOUNTER RECORDING (LESSON-END INTEGRATION)
// ============================================================================

/**
 * Record encounters for every chunk in a completed lesson.
 *
 * Called from App.tsx `handleLessonComplete` via the session plan stored
 * in `activePlanRef`. Only called when the v2 lesson generator was used
 * (activePlanRef is null when the v1 fallback was used).
 *
 * Star rating → encounter signal mapping:
 *   3★ → correct=true,  usedHelp=false  (strong performance)
 *   2★ → correct=true,  usedHelp=true   (needed support)
 *   1★ → correct=false, usedHelp=false  (struggled significantly)
 *
 * Phase 2 will replace this with per-activity ActivityResult.chunkIds
 * for precise chunk-level accuracy. This coarse approximation is
 * acceptable for Phase 1.2.
 *
 * Fire-and-forget safe: individual chunk failures are logged but do not
 * abort processing of remaining chunks.
 *
 * @param input - Batch parameters (userId, chunks, starRating)
 * @returns     - Summary of updates, graduations, and failures
 */
export async function recordBatchEncounters(
  input: BatchEncounterInput
): Promise<BatchEncounterResult> {
  const { userId, chunks, starRating } = input;

  const result: BatchEncounterResult = {
    updated: 0,
    failed: 0,
    graduated: [],
    becameFragile: [],
  };

  if (!userId || chunks.length === 0) {
    return result;
  }

  // Translate star rating to a per-chunk encounter signal.
  const signal = {
    correct: starRating >= 2,
    // Treat 2★ as "needed help" — slightly penalises ease factor without
    // resetting the interval (encourages review sooner than 3★ would).
    usedHelp: starRating === 2,
    // Estimated answer time — we don't have actual timing per chunk yet.
    timeToAnswerMs: 5000,
  };

  for (const chunk of chunks) {
    try {
      const encounterResult = await chunkManager.recordEncounter(
        userId,
        chunk.id,
        signal
      );
      result.updated += 1;

      // Track notable status transitions
      if (encounterResult.statusChanged) {
        const { status } = encounterResult.userChunk;
        if (status === ChunkStatus.ACQUIRED) {
          result.graduated.push(chunk.id);
        } else if (status === ChunkStatus.FRAGILE) {
          result.becameFragile.push(chunk.id);
        }
      }
    } catch (err) {
      // Non-fatal: one chunk failure must not block the rest.
      console.warn(
        `[SRSService] Failed to record encounter for chunk "${chunk.id}":`,
        err
      );
      result.failed += 1;
    }
  }

  if (result.graduated.length > 0) {
    console.log(
      `[SRSService] 🎓 ${result.graduated.length} chunk(s) graduated to acquired`
    );
  }
  if (result.becameFragile.length > 0) {
    console.log(
      `[SRSService] ⚠️ ${result.becameFragile.length} chunk(s) became fragile`
    );
  }

  return result;
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Get chunks due for SRS review today.
 *
 * Wraps chunkManager.getDueChunks() so callers don't need to
 * import both services.
 *
 * @param userId - User ID
 * @param count  - Maximum chunks to return (default 10)
 * @returns      - Due UserChunks, sorted most-overdue first
 */
export async function getDueChunks(
  userId: string,
  count = 10
): Promise<UserChunk[]> {
  return chunkManager.getDueChunks(userId, count);
}

/**
 * Get fragile chunks that need priority reinforcement.
 *
 * Fragile chunks were once acquired but have started to decay.
 * The pedagogy engine includes these in the next session's review list.
 *
 * @param userId - User ID
 * @param count  - Maximum chunks to return (default 5)
 * @returns      - Fragile UserChunks
 */
export async function getFragileChunks(
  userId: string,
  count = 5
): Promise<UserChunk[]> {
  return chunkManager.getFragileChunks(userId, count);
}

/**
 * Decay acquired chunks whose review date has passed without review.
 *
 * Should be called once per day when the app opens.
 * Overdue acquired chunks are re-recorded as incorrect, which transitions
 * them to fragile — they then surface in the next session's review list.
 *
 * @param userId - User ID
 * @returns      - Number of chunks decayed to fragile
 */
export async function decayOverdueChunks(userId: string): Promise<number> {
  try {
    const acquired = await chunkManager.getChunksByStatus(
      userId,
      ChunkStatus.ACQUIRED,
      100
    );
    const now = new Date();
    let decayed = 0;

    for (const chunk of acquired) {
      if (new Date(chunk.nextReviewDate) < now) {
        try {
          // Record a missed review as incorrect → triggers fragile transition
          await chunkManager.recordEncounter(userId, chunk.chunkId, {
            correct: false,
            timeToAnswerMs: 0,
            usedHelp: false,
          });
          decayed += 1;
        } catch {
          // Non-fatal — skip this chunk
        }
      }
    }

    if (decayed > 0) {
      console.log(`[SRSService] 📉 Decayed ${decayed} overdue chunk(s) to fragile`);
    }

    return decayed;
  } catch (error) {
    console.error('[SRSService] Error in decayOverdueChunks:', error);
    return 0;
  }
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Add a number of days to a date (handles fractional days).
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + days * 24 * 60 * 60 * 1000);
  return result;
}
