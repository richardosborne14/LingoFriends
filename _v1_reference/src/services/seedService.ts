/**
 * Seed Service
 * 
 * Manages seed earning and planting mechanics for LingoFriends.
 * Seeds are rewards for completing skill paths, allowing players to
 * start new learning paths (plant new trees) in their garden.
 * 
 * Seed Earning Rules:
 * - Complete all lessons in a path → 2 Seeds earned
 * - Get 3 stars on all lessons → 1 bonus Seed
 * - Daily streak (7+ days) → 1 Seed
 * - Gift from friend → 1 Seed
 * 
 * @module seedService
 * @see docs/phase-1.1/task-1-1-13-seed-earning.md
 */

import { pb, getCurrentUserId } from '../../services/pocketbaseService';
import type { UserTree } from '../types/game';
import { TreeStatus } from '../types/game';
import type { ProfileRecord, SkillPathRecord, UserTreeRecord } from '../types/pocketbase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of checking if a seed should be earned.
 */
export interface SeedEarnResult {
  /** Whether a seed was earned */
  earned: boolean;
  /** Reason for earning (shown to user) */
  reason: string;
  /** Type of seed earning trigger */
  trigger: 'path_complete' | 'perfect_path' | 'streak' | 'gift' | 'none';
}

/**
 * Result of planting a seed.
 */
export interface PlantSeedResult {
  /** Whether planting was successful */
  success: boolean;
  /** The new tree if successful */
  tree?: UserTree;
  /** Error message if failed */
  error?: string;
  /** Remaining seed count */
  remainingSeeds: number;
}

/**
 * Skill path available for planting.
 */
export interface AvailableSkillPath {
  id: string;
  name: string;
  icon: string;
  description: string;
  lessonCount: number;
  category: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Seeds earned for completing a skill path.
 * Task spec says 2 seeds per pathway completion (one to keep, one to share).
 */
export const SEEDS_FOR_PATH_COMPLETE = 2;

/**
 * Bonus seed for perfect path (all 3-star lessons).
 */
export const SEEDS_FOR_PERFECT_PATH = 1;

/**
 * Seeds earned for 7+ day streak.
 */
export const SEEDS_FOR_STREAK_MILESTONE = 1;

/**
 * Maximum seeds a user can hold.
 * Prevents hoarding - encourages planting!
 */
export const MAX_SEEDS = 10;

// ============================================================================
// SEED EARNING FUNCTIONS
// ============================================================================

/**
 * Check if completing a lesson earns seeds.
 * Seeds are earned when the final lesson in a path is completed.
 * 
 * @param tree - The tree representing the skill path
 * @param lessonId - The lesson that was just completed
 * @param starsEarned - Stars earned on this lesson (for perfect path check)
 * @returns Seed earn result with reason
 * 
 * @example
 * // Last lesson completed
 * const result = checkSeedEarned(tree, 'lesson-5', 3);
 * if (result.earned) {
 *   await awardSeed(userId, result.reason);
 * }
 */
export function checkSeedEarned(
  tree: UserTree,
  lessonId: string,
  starsEarned: number
): SeedEarnResult {
  // Check if this was the last lesson in the path
  const isLastLesson = tree.lessonsCompleted + 1 >= tree.lessonsTotal;
  
  if (!isLastLesson) {
    return { earned: false, reason: '', trigger: 'none' };
  }
  
  // Path completed - earn seeds!
  return {
    earned: true,
    reason: `You completed ${tree.name}! 🎉`,
    trigger: 'path_complete',
  };
}

/**
 * Check for bonus seed (3 stars on all lessons).
 * This is checked after path completion.
 * 
 * @param lessonResults - Array of lesson results with stars
 * @returns Seed earn result for bonus
 * 
 * @example
 * const allResults = [ { stars: 3 }, { stars: 3 }, { stars: 3 } ];
 * const bonus = checkBonusSeedEarned(allResults);
 * // Returns earned: true for perfect path
 */
export function checkBonusSeedEarned(
  lessonResults: Array<{ stars: number }>
): SeedEarnResult {
  if (lessonResults.length === 0) {
    return { earned: false, reason: '', trigger: 'none' };
  }
  
  const allThreeStars = lessonResults.every(r => r.stars === 3);
  
  if (allThreeStars) {
    return {
      earned: true,
      reason: 'Perfect path! All lessons with 3 stars! ⭐⭐⭐',
      trigger: 'perfect_path',
    };
  }
  
  return { earned: false, reason: '', trigger: 'none' };
}

/**
 * Check if a streak milestone earns a seed.
 * Seeds are awarded at 7-day streaks.
 * 
 * @param currentStreak - Current streak in days
 * @param previousStreak - Previous streak (to check if milestone just hit)
 * @returns Seed earn result for streak milestone
 */
export function checkStreakSeedEarned(
  currentStreak: number,
  previousStreak: number
): SeedEarnResult {
  // Check if we just hit a 7-day milestone
  const currentMilestone = Math.floor(currentStreak / 7);
  const previousMilestone = Math.floor(previousStreak / 7);
  
  if (currentMilestone > previousMilestone && currentStreak >= 7) {
    return {
      earned: true,
      reason: `${currentStreak} day streak! Keep it up! 🔥`,
      trigger: 'streak',
    };
  }
  
  return { earned: false, reason: '', trigger: 'none' };
}

// ============================================================================
// SEED MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get the current seed count for a user.
 * 
 * @param userId - The user's ID
 * @returns Number of seeds owned
 */
export async function getSeedCount(userId: string): Promise<number> {
  try {
    const records = await pb.collection('profiles').getList<ProfileRecord>(1, 1, {
      filter: `user = "${userId}"`,
    });
    
    if (records.items.length === 0) {
      return 0;
    }
    
    return records.items[0].seeds || 0;
  } catch (error) {
    console.error('[seedService] Failed to get seed count:', error);
    return 0;
  }
}

/**
 * Award seeds to a user.
 * Respects the maximum seed cap.
 * 
 * @param userId - The user's ID
 * @param amount - Number of seeds to award
 * @param reason - Why the seeds were earned (for logging)
 * @returns New seed count after awarding
 * 
 * @example
 * // Award 2 seeds for path completion
 * const newCount = await awardSeed(userId, 2, 'Path complete');
 */
export async function awardSeed(
  userId: string,
  amount: number = 1,
  reason: string = ''
): Promise<number> {
  try {
    const records = await pb.collection('profiles').getList<ProfileRecord>(1, 1, {
      filter: `user = "${userId}"`,
    });
    
    if (records.items.length === 0) {
      throw new Error('Profile not found');
    }
    
    const profile = records.items[0];
    const currentSeeds = profile.seeds || 0;
    
    // Cap at maximum
    const newSeeds = Math.min(currentSeeds + amount, MAX_SEEDS);
    const actualAwarded = newSeeds - currentSeeds;
    
    if (actualAwarded > 0) {
      await pb.collection('profiles').update(profile.id, {
        seeds: newSeeds,
      });
      
      console.log(`[seedService] Awarded ${actualAwarded} seeds to ${userId}. Reason: ${reason}`);
    } else {
      console.log(`[seedService] Seed cap reached for ${userId}. No seeds awarded.`);
    }
    
    return newSeeds;
  } catch (error) {
    console.error('[seedService] Failed to award seeds:', error);
    throw new Error('Failed to award seeds. Please try again.');
  }
}

/**
 * Deduct seeds from a user.
 * Used when planting a seed.
 * 
 * @param userId - The user's ID
 * @param amount - Number of seeds to deduct
 * @returns New seed count after deduction
 * @throws Error if user doesn't have enough seeds
 */
export async function deductSeed(
  userId: string,
  amount: number = 1
): Promise<number> {
  try {
    const records = await pb.collection('profiles').getList<ProfileRecord>(1, 1, {
      filter: `user = "${userId}"`,
    });
    
    if (records.items.length === 0) {
      throw new Error('Profile not found');
    }
    
    const profile = records.items[0];
    const currentSeeds = profile.seeds || 0;
    
    if (currentSeeds < amount) {
      throw new Error(`Not enough seeds. Need ${amount}, have ${currentSeeds}.`);
    }
    
    const newSeeds = currentSeeds - amount;
    
    await pb.collection('profiles').update(profile.id, {
      seeds: newSeeds,
    });
    
    console.log(`[seedService] Deducted ${amount} seeds from ${userId}. Remaining: ${newSeeds}`);
    
    return newSeeds;
  } catch (error) {
    console.error('[seedService] Failed to deduct seeds:', error);
    throw error;
  }
}

// ============================================================================
// SKILL PATH FUNCTIONS
// ============================================================================

/**
 * Get available skill paths for planting.
 * Returns paths the user doesn't have yet.
 * 
 * @param userId - The user's ID
 * @returns Array of available skill paths
 */
export async function getAvailableSkillPaths(userId: string): Promise<AvailableSkillPath[]> {
  try {
    // Get user's existing trees
    const userTrees = await pb.collection('user_trees').getList<UserTreeRecord>(1, 100, {
      filter: `user = "${userId}"`,
    });
    
    const existingPathIds = new Set(userTrees.items.map(t => t.skillPath));
    
    // Get all skill paths
    const allPaths = await pb.collection('skill_paths').getList<SkillPathRecord>(1, 100, {
      filter: '', // Get all
    });
    
    // Filter to paths user doesn't have
    const availablePaths = allPaths.items
      .filter(path => !existingPathIds.has(path.id))
      .map(path => ({
        id: path.id,
        name: path.name,
        icon: path.icon,
        description: path.description,
        lessonCount: path.lessons?.length || 0,
        category: path.category,
      }));
    
    return availablePaths;
  } catch (error) {
    console.error('[seedService] Failed to get available skill paths:', error);
    return [];
  }
}

// ============================================================================
// PLANTING FUNCTIONS
// ============================================================================

/**
 * Plant a seed to start a new skill path.
 * Creates a new tree in the user's garden.
 * 
 * @param userId - The user's ID
 * @param skillPathId - The skill path to plant
 * @param position - Position in garden grid
 * @returns Plant result with new tree or error
 * 
 * @example
 * const result = await plantSeed(
 *   userId,
 *   'path-spanish-food',
 *   { x: 3, y: 5 }
 * );
 * 
 * if (result.success) {
 *   console.log('New tree planted:', result.tree?.name);
 * }
 */
export async function plantSeed(
  userId: string,
  skillPathId: string,
  position: { x: number; y: number }
): Promise<PlantSeedResult> {
  try {
    // Check seed count first
    const seedCount = await getSeedCount(userId);
    
    if (seedCount < 1) {
      return {
        success: false,
        error: 'Not enough seeds! Complete a skill path to earn more.',
        remainingSeeds: seedCount,
      };
    }
    
    // Get skill path info
    const skillPath = await pb.collection('skill_paths').getOne<SkillPathRecord>(skillPathId);
    
    if (!skillPath) {
      return {
        success: false,
        error: 'Skill path not found.',
        remainingSeeds: seedCount,
      };
    }
    
    // Check if user already has this path
    const existingTrees = await pb.collection('user_trees').getList<UserTreeRecord>(1, 1, {
      filter: `user = "${userId}" && skillPath = "${skillPathId}"`,
    });
    
    if (existingTrees.items.length > 0) {
      return {
        success: false,
        error: 'You already have this skill path in your garden!',
        remainingSeeds: seedCount,
      };
    }
    
    // Deduct seed
    const remainingSeeds = await deductSeed(userId, 1);
    
    // Create the tree
    const now = new Date().toISOString();
    const treeRecord = await pb.collection('user_trees').create<UserTreeRecord>({
      user: userId,
      skillPath: skillPathId,
      status: 'seed',
      health: 100,
      sunDropsTotal: 0,
      lessonsCompleted: 0,
      lessonsTotal: skillPath.lessons?.length || 5,
      lastRefreshDate: now,
      position,
      decorations: [],
    });
    
    // Build tree object with new architecture fields
    const tree: UserTree = {
      id: treeRecord.id,
      userId: userId,
      skillPathId: skillPathId,
      name: skillPath.name,
      icon: skillPath.icon,
      status: TreeStatus.SEED,
      health: 100,
      bufferDays: 0,
      lastRefreshDate: now,
      lastLessonDate: now,
      sunDropsEarned: 0, // Per-tree SunDrops for growth
      sunDropsTotal: 0, // Deprecated but kept for compatibility
      growthStage: 0, // Seed stage
      gridPosition: { gx: Math.floor(position.x / 50), gz: Math.floor(position.y / 50) },
      position,
      lessonsCompleted: 0,
      lessonsTotal: skillPath.lessons?.length || 5,
      decorations: [],
      giftsReceived: [],
      createdAt: now,
      updatedAt: now,
    };
    
    console.log(`[seedService] Planted seed for ${userId}. New tree: ${tree.name}`);
    
    return {
      success: true,
      tree,
      remainingSeeds,
    };
  } catch (error) {
    console.error('[seedService] Failed to plant seed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to plant seed. Please try again.';
    
    return {
      success: false,
      error: errorMessage,
      remainingSeeds: await getSeedCount(userId),
    };
  }
}

/**
 * Check if user has space for a new tree.
 * Garden has limited plots.
 * 
 * @param maxTrees - Maximum trees allowed (default: 8)
 * @returns Whether user can plant another tree
 */
export async function canPlantTree(userId: string, maxTrees: number = 8): Promise<boolean> {
  try {
    const result = await pb.collection('user_trees').getList(1, 1, {
      filter: `user = "${userId}"`,
    });
    
    return result.totalItems < maxTrees;
  } catch (error) {
    console.error('[seedService] Failed to check tree space:', error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format seed count for display.
 * Shows number with seed emoji.
 * 
 * @param count - Number of seeds
 * @returns Formatted string
 */
export function formatSeeds(count: number): string {
  return `${count} ${count === 1 ? 'Seed' : 'Seeds'} 🌱`;
}

/**
 * Calculate total seeds that will be earned.
 * Useful for previewing rewards.
 * 
 * @param isPathComplete - Whether path is complete
 * @param isPerfectPath - Whether all lessons got 3 stars
 * @returns Total seeds to be earned
 */
export function calculateSeedReward(
  isPathComplete: boolean,
  isPerfectPath: boolean
): number {
  let total = 0;
  
  if (isPathComplete) {
    total += SEEDS_FOR_PATH_COMPLETE;
  }
  
  if (isPerfectPath) {
    total += SEEDS_FOR_PERFECT_PATH;
  }
  
  return total;
}