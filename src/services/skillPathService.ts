/**
 * skillPathService
 *
 * Async, PocketBase-backed replacement for the synchronous
 * `getSkillPathById` that used to live in mockGameData.ts.
 *
 * Key design decisions:
 * - In-memory cache: PB round-trip only happens once per path per session.
 *   Cache is invalidated by `invalidateSkillPathCache()` after lesson generation
 *   so the garden immediately reflects new lesson nodes.
 * - Graceful fallback: 404 / network error returns `null` — callers are
 *   expected to handle null (PathView shows "not found", useGarden skips).
 * - Side-effect free: no writes to PB; this service is read-only.
 *
 * @module skillPathService
 * @see docs/phase-1.2/task-K3-use-skill-path-live.md
 */

import { pb } from '../../services/pocketbaseService';
import type { SkillPath, SkillPathLesson } from '../types/game';
import { LessonStatus } from '../types/game';

// ============================================
// TYPES
// ============================================

/**
 * Raw PocketBase record for the `skill_paths` collection.
 * Only the fields we actually read are declared here.
 */
interface PBSkillPath {
  id: string;
  name: string;
  icon: string;
  description: string;
  category?: string;
  targetLanguage?: string;
  nativeLanguage?: string;
  isActive?: boolean;
  /** JSON array of lesson title strings, in order */
  lessonTitles?: string[];
  /** Optional JSON array of per-lesson emoji icons */
  lessonIcons?: string[];
  /** Optional JSON array of per-lesson sun-drop maximums */
  lessonSunDropsMax?: number[];
}

// ============================================
// CACHE
// ============================================

/** In-memory session cache: skillPathId → SkillPath */
const _cache = new Map<string, SkillPath>();

// ============================================
// MAPPING
// ============================================

/**
 * Default sun-drop maximum per lesson when not stored in PB.
 * Chosen to feel achievable (≈10 min lesson) while still rewarding.
 */
const DEFAULT_SUN_DROPS_MAX = 15;

/**
 * Default emoji icons cycled when PB doesn't supply per-lesson icons.
 * Varied enough to give each lesson a distinct visual identity.
 */
const DEFAULT_LESSON_ICONS = ['📖', '✏️', '🗣️', '🎯', '⭐', '🏆', '💡', '🎓', '🌟', '🔤'];

/**
 * Map a raw PocketBase skill_paths record to the app's SkillPath type.
 *
 * `lessonTitles` in PB maps to `SkillPathLesson[]`. Fields not stored per-lesson
 * in PB (icon, sunDropsMax) use sensible defaults — per-lesson granularity
 * is planned for Phase 1.3.
 *
 * Status is set to the "fresh" state (lesson 0 current, rest locked) here;
 * `useSkillPath` overlays real progress from `user_trees` after fetching.
 */
function pbToSkillPath(record: PBSkillPath): SkillPath {
  const titles  = record.lessonTitles  ?? [];
  const icons   = record.lessonIcons   ?? [];
  const maxDrop = record.lessonSunDropsMax ?? [];

  const lessons: SkillPathLesson[] = titles.map((title, i) => ({
    id: `${record.id}-lesson-${i}`,
    title,
    // Cycle through default icons if PB doesn't have one for this index
    icon: icons[i] ?? DEFAULT_LESSON_ICONS[i % DEFAULT_LESSON_ICONS.length],
    // Fresh state — useSkillPath will overlay real statuses from PB
    status: i === 0 ? LessonStatus.CURRENT : LessonStatus.LOCKED,
    stars: 0 as const,
    sunDropsEarned: 0,
    sunDropsMax: maxDrop[i] ?? DEFAULT_SUN_DROPS_MAX,
    topics: [],
    estimatedMinutes: 10,
  }));

  // Note: targetLanguage / nativeLanguage are stored at the skill_path level
  // in PB but are NOT fields on the SkillPath type (they're on UserProfile).
  // We don't add them here — callers that need language context read from profile.
  return {
    id: record.id,
    name: record.name,
    icon: record.icon ?? '📚',
    description: record.description ?? '',
    category: record.category,
    lessons,
  };
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Fetch a skill path by PocketBase ID.
 *
 * Results are cached in memory for the page session so repeated calls
 * (e.g. useGarden + useSkillPath both fetching the same path) incur only
 * one PB round-trip.
 *
 * @returns SkillPath or null (path not found, inactive, or network error)
 */
export async function getSkillPathById(id: string): Promise<SkillPath | null> {
  if (!id) return null;

  // Cache hit — cheap path
  if (_cache.has(id)) {
    return _cache.get(id)!;
  }

  try {
    const record = await pb.collection('skill_paths').getOne<PBSkillPath>(id);
    const skillPath = pbToSkillPath(record);
    _cache.set(id, skillPath);
    return skillPath;
  } catch (err: unknown) {
    // 404 is expected for stale/unknown IDs — not worth logging as an error
    const isNotFound =
      (err instanceof Error && (err.message.includes('404') || err.message.includes('not found'))) ||
      (err as { status?: number }).status === 404;

    if (!isNotFound) {
      console.warn('[skillPathService] Failed to fetch skill path:', id, err);
    }
    return null;
  }
}

/**
 * Invalidate the cache for a specific skill path.
 *
 * Call this after generating or updating a path's lessons so the next
 * `getSkillPathById` call fetches fresh data from PB instead of serving
 * the cached (empty-lesson) version.
 */
export function invalidateSkillPathCache(id: string): void {
  _cache.delete(id);
}

/**
 * Clear the entire in-memory cache.
 *
 * Useful on logout (when a different user logs in, they shouldn't see
 * the previous user's skill path data) or in tests.
 */
export function clearSkillPathCache(): void {
  _cache.clear();
}
