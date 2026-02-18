/**
 * Game Progress Service
 *
 * Handles all game-specific persistence to Pocketbase:
 * - Loading real game stats (gems, sunDrops, streak) from profile
 * - Saving lesson completion (updates tree + profile)
 * - Applying tree care consumables (deducts gems, applies health/sunDrop boost)
 * - Saving/loading placed garden objects
 *
 * Design note: This service is the bridge between the game loop (App.tsx)
 * and Pocketbase. The garden display still uses useGarden (with mock fallback)
 * but all mutations go through here so progress is real and persistent.
 *
 * @module gameProgressService
 * @see docs/phase-1.1/task-B-pocketbase-wiring.md
 */

import { pb, getCurrentUserId } from '../../services/pocketbaseService';
import { learnerProfileService } from './learnerProfileService';
import type { ProfileRecord } from '../types/pocketbase';

// ============================================
// TYPES
// ============================================

/** Real game stats loaded from Pocketbase profile */
export interface GameStats {
  /** Global SunDrop total (sum across all trees — for display only) */
  sunDrops: number;
  /** Gem balance (shop currency) */
  gems: number;
  /** Seeds earned (for planting — Phase 2) */
  seeds: number;
  /** Current daily streak in days */
  streak: number;
}

/** Result returned after saving a lesson completion */
export interface LessonCompletionResult {
  sunDropsEarned: number;
  gemsEarned: number;
  newStreak: number;
}

// ============================================
// READ: GAME STATS
// ============================================

/**
 * Load real game stats from the authenticated user's profile.
 * Used by useGameStats hook to populate the header.
 *
 * Returns zeros if not authenticated or profile not found.
 * Never throws — callers can always fall back to 0 values.
 */
export async function getGameStats(): Promise<GameStats> {
  const userId = getCurrentUserId();
  if (!userId) return { sunDrops: 0, gems: 0, seeds: 0, streak: 0 };

  try {
    const records = await pb.collection('profiles').getList(1, 1, {
      filter: `user = "${userId}"`,
    });

    if (records.items.length === 0) {
      return { sunDrops: 0, gems: 0, seeds: 0, streak: 0 };
    }

    const profile = records.items[0] as unknown as ProfileRecord;
    return {
      sunDrops: profile.sunDrops ?? 0,
      gems: profile.gems ?? 0,
      seeds: profile.seeds ?? 0,
      streak: profile.streak ?? 0,
    };
  } catch (err) {
    // Non-fatal — UI shows 0 instead of crashing
    console.warn('[gameProgressService] Failed to load game stats:', err);
    return { sunDrops: 0, gems: 0, seeds: 0, streak: 0 };
  }
}

// ============================================
// WRITE: LESSON COMPLETION
// ============================================

/**
 * Save lesson completion to Pocketbase.
 *
 * On lesson complete, we:
 * 1. Find (or create) the user_tree record for this skill path
 * 2. Increment its sunDropsEarned and lessonsCompleted
 * 3. Update the profile: add sunDrops, add gem bonus, update streak
 *
 * This is non-fatal: if PB is unreachable, we still return an estimated
 * result so the UI can show the reward screen normally. Progress is best-effort.
 *
 * @param skillPathId - The skill path (tree) this lesson belongs to
 * @param sunDropsEarned - SunDrops earned during the lesson
 * @param starsEarned - Stars earned (0-3) — used for gem bonus calculation
 */
export async function saveLessonCompletion(params: {
  skillPathId: string;
  sunDropsEarned: number;
  starsEarned: number;
}): Promise<LessonCompletionResult> {
  const userId = getCurrentUserId();
  const gemsEarned = calculateGemBonus(params.sunDropsEarned, params.starsEarned);

  // If not authenticated, return estimated result without saving
  if (!userId) {
    console.warn('[gameProgressService] Cannot save lesson: not authenticated');
    return { sunDropsEarned: params.sunDropsEarned, gemsEarned, newStreak: 0 };
  }

  let newStreak = 1;

  try {
    // 1. Update user_tree record (find or create)
    const trees = await pb.collection('user_trees').getList(1, 1, {
      filter: `user = "${userId}" && skillPathId = "${params.skillPathId}"`,
    });

    if (trees.items.length > 0) {
      const tree = trees.items[0] as unknown as Record<string, unknown>;
      const prev = (tree.sunDropsEarned as number) ?? (tree.sunDropsTotal as number) ?? 0;
      const prevLessons = (tree.lessonsCompleted as number) ?? 0;

      await pb.collection('user_trees').update(trees.items[0].id, {
        sunDropsEarned: prev + params.sunDropsEarned,
        sunDropsTotal: prev + params.sunDropsEarned, // keep in sync
        lessonsCompleted: prevLessons + 1,
        lastRefreshDate: new Date().toISOString(),
        lastLessonDate: new Date().toISOString(),
        // Reset health to 100 — completing a lesson "waters" the tree
        health: 100,
        bufferDays: 0,
      });
    } else {
      // First lesson on this skill path — create the tree record
      await pb.collection('user_trees').create({
        user: userId,
        skillPathId: params.skillPathId,
        status: 'growing',
        health: 100,
        bufferDays: 0,
        sunDropsEarned: params.sunDropsEarned,
        sunDropsTotal: params.sunDropsEarned,
        lessonsCompleted: 1,
        lastRefreshDate: new Date().toISOString(),
        lastLessonDate: new Date().toISOString(),
        gridPosition: { gx: 3, gz: 3 },
        position: { x: 150, y: 150 },
        decorations: [],
        giftsReceived: [],
      });
    }

    // 2. Update profile: sunDrops, gems, streak
    const profileRecords = await pb.collection('profiles').getList(1, 1, {
      filter: `user = "${userId}"`,
    });

    if (profileRecords.items.length > 0) {
      const profile = profileRecords.items[0] as unknown as ProfileRecord;

      // Streak logic: increment if last activity was yesterday, reset if older
      newStreak = calculateNewStreak(profile.streak ?? 0, profile.last_activity);

      await pb.collection('profiles').update(profileRecords.items[0].id, {
        sunDrops: (profile.sunDrops ?? 0) + params.sunDropsEarned,
        gems: (profile.gems ?? 0) + gemsEarned,
        streak: newStreak,
        last_activity: new Date().toISOString(),
      });
    }

    console.log(`[gameProgressService] Lesson saved: +${params.sunDropsEarned} 🌟 +${gemsEarned} 💎 streak=${newStreak}`);
    return { sunDropsEarned: params.sunDropsEarned, gemsEarned, newStreak };

  } catch (err) {
    // Non-fatal: UI still shows reward screen; progress will re-sync next session
    console.error('[gameProgressService] Failed to save lesson completion:', err);
    return { sunDropsEarned: params.sunDropsEarned, gemsEarned, newStreak };
  }
}

// ============================================
// WRITE: TREE CARE
// ============================================

/**
 * Apply a tree care consumable to a learning tree.
 *
 * Checks gem balance first — throws if insufficient.
 * On success: restores health, boosts sunDrops, deducts gems.
 *
 * @param skillPathId - Identifies which learning tree to apply care to
 * @param healthRestore - HP to restore (0-100)
 * @param sunDropBoost - SunDrops to add (0-N)
 * @param gemCost - Gems to deduct from profile
 */
export async function applyTreeCare(params: {
  skillPathId: string;
  healthRestore: number;
  sunDropBoost: number;
  gemCost: number;
}): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Check gem balance before doing anything
  const profileRecords = await pb.collection('profiles').getList(1, 1, {
    filter: `user = "${userId}"`,
  });

  if (profileRecords.items.length === 0) throw new Error('Profile not found');

  const profile = profileRecords.items[0] as unknown as ProfileRecord;
  if ((profile.gems ?? 0) < params.gemCost) {
    throw new Error(`Not enough gems (need ${params.gemCost}, have ${profile.gems ?? 0})`);
  }

  // Apply care to tree if it exists in PB
  const trees = await pb.collection('user_trees').getList(1, 1, {
    filter: `user = "${userId}" && skillPathId = "${params.skillPathId}"`,
  });

  if (trees.items.length > 0) {
    const tree = trees.items[0] as unknown as Record<string, unknown>;
    const currentHealth = (tree.health as number) ?? 100;
    const currentSunDrops = (tree.sunDropsEarned as number) ?? 0;

    await pb.collection('user_trees').update(trees.items[0].id, {
      health: Math.min(100, currentHealth + params.healthRestore),
      sunDropsEarned: currentSunDrops + params.sunDropBoost,
      sunDropsTotal: currentSunDrops + params.sunDropBoost,
      lastRefreshDate: new Date().toISOString(),
    });
  }
  // Note: if no PB tree exists yet, the care item is still consumed (gems deducted)
  // The tree will be created on first lesson completion with full health anyway.

  // Deduct gems from profile
  await pb.collection('profiles').update(profileRecords.items[0].id, {
    gems: (profile.gems ?? 0) - params.gemCost,
    sunDrops: (profile.sunDrops ?? 0) + params.sunDropBoost,
    last_activity: new Date().toISOString(),
  });

  console.log(`[gameProgressService] Tree care applied: +${params.healthRestore}hp +${params.sunDropBoost}🌟 -${params.gemCost}💎`);
}

// ============================================
// WRITE: GARDEN OBJECTS
// ============================================

/**
 * Save a placed garden object to Pocketbase.
 * Called when the user places a decoration via the shop.
 * Non-fatal: decorations are cosmetic, failure doesn't block gameplay.
 */
export async function savePlacedObject(params: {
  objectType: string;
  gx: number;
  gz: number;
}): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    await pb.collection('garden_objects').create({
      user: userId,
      object_id: params.objectType,
      gx: params.gx,
      gz: params.gz,
      placed_at: new Date().toISOString(),
    });
    console.log(`[gameProgressService] Object placed: ${params.objectType} at (${params.gx}, ${params.gz})`);
  } catch (err) {
    console.warn('[gameProgressService] Failed to save placed object (non-fatal):', err);
  }
}

/**
 * Load all placed garden objects for the current user.
 * Called on app mount to restore the garden's decorations.
 * Returns empty array on failure (garden shows with no decorations).
 */
export async function loadGardenObjects(): Promise<Array<{
  id: string;
  objectType: string;
  gx: number;
  gz: number;
}>> {
  const userId = getCurrentUserId();
  if (!userId) return [];

  try {
    const records = await pb.collection('garden_objects').getList(1, 200, {
      filter: `user = "${userId}"`,
      sort: 'placed_at',
    });

    return records.items.map(r => ({
      id: r.id,
      objectType: r.object_id as string,
      gx: r.gx as number,
      gz: r.gz as number,
    }));
  } catch (err) {
    console.warn('[gameProgressService] Failed to load garden objects:', err);
    return [];
  }
}

// ============================================
// HELPERS (private)
// ============================================

/**
 * Calculate gem bonus for a lesson.
 * Rule: 1 gem per 10 SunDrops, +2 bonus for 3 stars, +1 for 2 stars.
 * Minimum 1 gem for completing any lesson.
 */
function calculateGemBonus(sunDropsEarned: number, starsEarned: number): number {
  const base = Math.max(1, Math.floor(sunDropsEarned / 10));
  const starBonus = starsEarned >= 3 ? 2 : starsEarned >= 2 ? 1 : 0;
  return base + starBonus;
}

/**
 * Calculate new streak value from last activity timestamp.
 * - Same day → keep current streak
 * - Yesterday → increment streak
 * - Gap or no activity → reset to 1 (today counts as day 1)
 */
function calculateNewStreak(currentStreak: number, lastActivity: string | undefined): number {
  if (!lastActivity) return 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = new Date(lastActivity);
  last.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return currentStreak;      // Same day — keep
  if (diffDays === 1) return currentStreak + 1;  // Yesterday — extend
  return 1;                                       // Gap — reset (today is day 1)
}

// ============================================
// WRITE: SRS / LEARNER MODEL UPDATE (Task F)
// ============================================

/**
 * Post-lesson SRS (Spaced Repetition System) update.
 *
 * Called immediately after lesson completion to update the learner model:
 *
 * 1. Confidence signal — derived from star rating.
 *    Stars ≥ 2 → correct signal (boost confidence, advance SRS intervals).
 *    Stars < 2 → incorrect signal (decay confidence, schedule earlier review).
 *
 * 2. Chunk stats recalculation — triggers learnerProfileService to recount
 *    acquired/fragile/new chunks from stored exposure data in PocketBase.
 *    This keeps the i+1 difficulty engine calibrated for the next session.
 *
 * NOTE: This is a coarse-grained SRS signal based on the lesson star rating.
 * Fine-grained per-activity chunk SRS will be added when LessonView surfaces
 * individual activity results (correct/incorrect per chunk ID) — see Phase 1.3.
 *
 * Non-fatal: SRS update failure doesn't block the lesson complete animation.
 *
 * @param stars - Lesson star rating (1–3)
 */
export async function postLessonSRSUpdate(stars: number): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return; // Not authenticated — skip silently (dev/test mode)

  try {
    // Coarse confidence signal: 3⭐ = clearly correct, 2⭐ = borderline correct,
    // 1⭐ = struggled (treat as incorrect to trigger earlier review)
    const correct = stars >= 2;
    const usedHelp = stars < 3; // Inferred: < perfect suggests some difficulty

    await learnerProfileService.updateConfidence(userId, correct, usedHelp);

    // Recount acquired / fragile / new chunks from stored exposure records.
    // This recalibrates the i+1 difficulty for the next prepareSession() call.
    await learnerProfileService.updateChunkStats(userId);

    console.log(`[gameProgressService] SRS updated: stars=${stars}, correct=${correct}, usedHelp=${usedHelp}`);
  } catch (err) {
    // Non-fatal — learner model degrades gracefully without SRS update
    console.warn('[gameProgressService] SRS update failed (non-fatal):', err);
  }
}
