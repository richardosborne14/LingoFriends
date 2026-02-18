/**
 * useSkillPath Hook
 *
 * Loads a skill path with live lesson statuses derived from PocketBase
 * `user_trees` progress data. Overlays real `lessonsCompleted` and
 * `sunDropsEarned` onto the static mock template so the path view
 * reflects actual learner progress after each lesson.
 *
 * Status logic (per lesson index i, given `lessonsCompleted = N`):
 *   - i < N  → 'completed'  (already done)
 *   - i === N → 'current'   (next lesson, clickable)
 *   - i > N  → 'locked'     (prerequisites not yet met)
 *
 * Star logic (for completed lessons):
 *   Stars are estimated from the ratio of average earned sun drops to the
 *   lesson's `sunDropsMax`. We store only a total for the tree, so we
 *   divide evenly across completed lessons — per-lesson breakdown comes in Phase 1.3.
 *   ≥80% = 3★  |  ≥60% = 2★  |  ≥40% = 1★  |  else 0★
 *
 * Fallback behaviour (always safe):
 *   - Not authenticated → returns mock template statuses unchanged
 *   - PB unreachable   → same fallback; logs a warning, never throws
 *   - No tree record   → lesson 0 is 'current', all others 'locked'
 *
 * @module useSkillPath
 * @see docs/phase-1.2/task-G-dynamic-paths.md
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { pb, getCurrentUserId } from '../../services/pocketbaseService';
// K3: Replaced synchronous mock lookup with async PB-backed service.
// skillPathService has the same function name so the diff is minimal.
import { getSkillPathById } from '../services/skillPathService';
import type { SkillPath, SkillPathLesson } from '../types/game';
import { LessonStatus } from '../types/game';

// ============================================================
// TYPES
// ============================================================

export interface UseSkillPathResult {
  /** The skill path with live lesson statuses (null while loading) */
  skillPath: SkillPath | null;
  /** True while the PB query is in flight */
  isLoading: boolean;
  /** Error message if the query failed (hook still returns mock fallback) */
  error: string | null;
  /** Call this to force a re-fetch (e.g. after lesson complete) */
  refresh: () => void;
}

// ============================================================
// STAR CALCULATION
// ============================================================

/**
 * Convert a sun drop ratio to a star rating (0–3).
 *
 * Uses Krashen-aligned thresholds: we don't punish learners with
 * 0 stars unless they genuinely struggled (< 40% accuracy).
 */
function calculateStars(earned: number, max: number): 0 | 1 | 2 | 3 {
  // Guard against divide-by-zero or nonsensical max values
  if (max <= 0 || earned <= 0) return 0;
  const ratio = earned / max;
  if (ratio >= 0.8) return 3;
  if (ratio >= 0.6) return 2;
  if (ratio >= 0.4) return 1;
  return 0;
}

// ============================================================
// STATUS OVERLAY
// ============================================================

/**
 * Build the live lesson list by overlaying PB progress onto the template.
 *
 * If no PB record exists (user has never started this path), lesson 0 is
 * set to 'current' and everything else stays locked — identical to the
 * mock template default for a fresh tree.
 *
 * @param template   - The static SkillPath from mock data (defines titles, icons, maxSunDrops)
 * @param lessonsCompleted - How many lessons the user has finished (from PB)
 * @param totalSunDropsEarned - Total sun drops earned on this tree (from PB)
 */
function buildLiveLessons(
  template: SkillPath,
  lessonsCompleted: number,
  totalSunDropsEarned: number,
): SkillPathLesson[] {
  // Divide total sun drops evenly across completed lessons as a best estimate.
  // Per-lesson granularity requires per-activity result tracking (Phase 1.3).
  const avgSunDropsPerLesson =
    lessonsCompleted > 0 ? totalSunDropsEarned / lessonsCompleted : 0;

  return template.lessons.map((lesson, i) => {
    const isCompleted = i < lessonsCompleted;
    // Lesson at index `lessonsCompleted` is the next one to do
    const isCurrent = i === lessonsCompleted;

    // Only compute stars for completed lessons
    const stars = isCompleted
      ? calculateStars(avgSunDropsPerLesson, lesson.sunDropsMax)
      : 0;

    // Estimated sun drops earned per-lesson (uniform distribution approximation)
    const sunDropsEarned = isCompleted ? Math.round(avgSunDropsPerLesson) : 0;

    return {
      ...lesson,
      status: isCompleted
        ? LessonStatus.COMPLETED
        : isCurrent
          ? LessonStatus.CURRENT
          : LessonStatus.LOCKED,
      stars,
      sunDropsEarned,
    };
  });
}

// ============================================================
// HOOK
// ============================================================

/**
 * useSkillPath
 *
 * @param skillPathId  - ID of the skill path to load (e.g. 'spanish-greetings')
 * @param refreshKey   - Increment this to force a re-fetch (e.g. after lesson complete)
 *
 * @example
 * const { skillPath, isLoading, refresh } = useSkillPath(skillPathId, refreshKey);
 */
export function useSkillPath(skillPathId: string, refreshKey = 0): UseSkillPathResult {
  // K3: Template is now fetched async from PB (was: synchronous mock lookup).
  // Start as null — PathView handles the loading state with a spinner.
  const [skillPath, setSkillPath] = useState<SkillPath | null>(null);
  // Start loading immediately — there's always a PB fetch on mount.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track whether the component using this hook is still mounted.
  // Prevents setState calls on unmounted components after async PB queries.
  const isMountedRef = useRef(true);

  // Manual refresh trigger: callers increment this to force re-fetch
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setInternalRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    /**
     * Two-step async fetch:
     *   Step 1: Load the path template from PB skill_paths (K3 — was sync mock)
     *   Step 2: Load user progress from PB user_trees (existing logic)
     *   Step 3: Overlay progress onto template via buildLiveLessons (unchanged)
     */
    async function fetchPathAndProgress() {
      setIsLoading(true);
      setError(null);

      // ── Step 1: Fetch path template from PB ─────────────────────────────
      // Previously: synchronous getSkillPathById from mockGameData.
      // Now: async getSkillPathById from skillPathService (with in-memory cache).
      const template = await getSkillPathById(skillPathId);

      if (cancelled || !isMountedRef.current) return;

      if (!template) {
        // Path not found in PB — unknown skillPathId or isActive=false.
        // PathView handles null gracefully with a "path not found" message.
        console.warn(`[useSkillPath] No path found in PB for skillPathId: ${skillPathId}`);
        setSkillPath(null);
        setIsLoading(false);
        return;
      }

      const userId = getCurrentUserId();

      // Not authenticated → show template with default statuses (lesson 0 current).
      // This covers dev mode and unauthenticated previews — no crash, no blank screen.
      if (!userId) {
        setSkillPath(template);
        setIsLoading(false);
        return;
      }

      // ── Step 2: Fetch user progress from PB user_trees ──────────────────
      // This logic is identical to the pre-K3 version — only the source of
      // `template` has changed (async PB instead of sync mock).
      try {
        // getFirstListItem throws if no record found — we catch that case below
        const treeRecord = await pb.collection('user_trees').getFirstListItem(
          `user = "${userId}" && skillPathId = "${skillPathId}"`,
        );

        if (cancelled || !isMountedRef.current) return;

        const lessonsCompleted = (treeRecord.lessonsCompleted as number) ?? 0;
        const sunDropsEarned =
          (treeRecord.sunDropsEarned as number) ??
          (treeRecord.sunDropsTotal as number) ??
          0;

        // ── Step 3: Overlay progress onto template ───────────────────────
        const liveLessons = buildLiveLessons(template, lessonsCompleted, sunDropsEarned);
        setSkillPath({ ...template, lessons: liveLessons });
        console.log(
          `[useSkillPath] Loaded live path: ${skillPathId} — ${lessonsCompleted}/${template.lessons.length} completed`,
        );
      } catch (err: unknown) {
        if (cancelled || !isMountedRef.current) return;

        // "No records found" is expected for a tree the user hasn't started yet.
        // In that case, lesson 0 should be 'current', rest 'locked' — which is
        // exactly what buildLiveLessons returns when lessonsCompleted = 0.
        const isNotFound =
          err instanceof Error &&
          (err.message.includes('not found') ||
            err.message.includes('404') ||
            (err as { status?: number }).status === 404);

        if (isNotFound) {
          // Fresh tree: overlay 0 completions so lesson 0 becomes 'current'
          const freshLessons = buildLiveLessons(template, 0, 0);
          setSkillPath({ ...template, lessons: freshLessons });
          console.log(`[useSkillPath] No PB record for ${skillPathId} — using fresh state (lesson 0 current)`);
        } else {
          // Unexpected error: fall back to template without progress overlay.
          // We still show the path — kids should never see a blank screen.
          console.warn(`[useSkillPath] PB progress query failed for ${skillPathId}:`, err);
          setError('Could not load your progress. Using saved data.');
          setSkillPath(template);
        }
      } finally {
        if (!cancelled && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    fetchPathAndProgress();

    return () => {
      // Cancel in-flight queries if skillPathId changes or component unmounts
      cancelled = true;
    };

    // refreshKey (prop) and internalRefreshKey (from refresh()) both trigger re-fetch.
    // Template re-fetch is cheap — skillPathService has an in-memory cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillPathId, refreshKey, internalRefreshKey]);

  return { skillPath, isLoading, error, refresh };
}
