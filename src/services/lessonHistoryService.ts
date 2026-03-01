/**
 * Lesson History Service
 *
 * Saves completed lesson records to the lesson_history PocketBase collection.
 * Records are append-only — no updates, no deletes.
 *
 * @see scripts/migrate-lesson-history.cjs for collection setup
 * @see src/types/pocketbase.ts for LessonHistoryRecord type
 * @module lessonHistoryService
 */

import { pb } from '../../services/pocketbaseService';
import type { LessonHistoryRecord } from '../types/pocketbase';

// ============================================================================
// TYPES
// ============================================================================

/** Data needed to save a completed lesson. id/created/updated are set by PB. */
export type LessonHistoryInput = Omit<LessonHistoryRecord, 'id' | 'collectionId' | 'collectionName' | 'created' | 'updated' | 'expand'>;

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Save a completed lesson to the lesson_history collection.
 *
 * Called at the end of every lesson (regardless of score).
 * Silently swallows errors — if this fails, the lesson still counts
 * as completed in the user's tree. History is a nice-to-have.
 *
 * @param data - Lesson completion data (user, title, scores etc.)
 * @returns The saved record, or null on failure
 */
export async function saveLessonHistory(data: LessonHistoryInput): Promise<LessonHistoryRecord | null> {
  try {
    const record = await pb
      .collection('lesson_history')
      .create<LessonHistoryRecord>(data);

    return record;
  } catch (err) {
    // Log but don't throw — lesson completion should not fail because of history
    console.warn('[lessonHistoryService] Failed to save lesson history:', (err as Error).message ?? err);
    return null;
  }
}

/**
 * Get lesson history for the current authenticated user.
 * Sorted newest-first.
 *
 * @param limit - Max records to return (default 20)
 * @returns Array of lesson history records
 */
export async function getLessonHistory(limit = 20): Promise<LessonHistoryRecord[]> {
  try {
    const result = await pb
      .collection('lesson_history')
      .getList<LessonHistoryRecord>(1, limit, {
        sort: '-completed_at',
      });

    return result.items;
  } catch (err) {
    console.warn('[lessonHistoryService] Failed to fetch lesson history:', (err as Error).message ?? err);
    return [];
  }
}

export default { saveLessonHistory, getLessonHistory };
