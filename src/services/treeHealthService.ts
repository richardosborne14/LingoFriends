/**
 * Tree Health Service
 * 
 * Manages the tree health and decay system for the spaced repetition mechanic.
 * Trees lose health over time without review, encouraging kids to return regularly.
 * 
 * Key features:
 * - Health decay based on days since last refresh
 * - Gift buffers that delay decay (different days per gift type)
 * - Async updates via Pocketbase
 * - Batch health updates for app startup
 * 
 * Health Schedule (from GAME_DESIGN.md):
 * | Days Since Refresh | Health |
 * |--------------------|--------|
 * | 0-2 days          | 100%   |
 * | 3-5 days          | 85%    |
 * | 6-10 days         | 60%    |
 * | 11-14 days        | 35%    |
 * | 15-21 days        | 15%    |
 * | 22+ days          | 5%     |
 * 
 * @module treeHealthService
 * @see docs/phase-1.1/task-1-1-10-tree-health-decay.md
 * @see docs/phase-1.1/GAME_DESIGN.md Section 6 (Spaced Repetition)
 */

import { pb, getCurrentUserId } from '../../services/pocketbaseService';
import type { UserTree, GiftType, GiftItem } from '../types/game';
import { GiftType as GiftTypeEnum } from '../types/game';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Health thresholds mapped to maximum days since refresh.
 * Used to determine health based on effective days since last refresh.
 */
const HEALTH_THRESHOLDS = [
  { maxDays: 2, health: 100 },
  { maxDays: 5, health: 85 },
  { maxDays: 10, health: 60 },
  { maxDays: 14, health: 35 },
  { maxDays: 21, health: 15 },
] as const;

/** Minimum health - trees never die completely, can always be revived */
const MIN_HEALTH = 5;

/** Maximum health a tree can have */
const MAX_HEALTH = 100;

/**
 * Buffer days provided by each gift type.
 * These delay the start of decay.
 * 
 * - water_drop: Standard 10-day buffer
 * - sparkle: Small 5-day buffer
 * - seed: No buffer (starts new trees, doesn't affect health)
 * - ribbon: No buffer (decoration only)
 * - golden_flower: Premium 15-day buffer
 */
const GIFT_BUFFER_DAYS: Record<GiftType, number> = {
  [GiftTypeEnum.WATER_DROP]: 10,
  [GiftTypeEnum.SPARKLE]: 5,
  [GiftTypeEnum.SEED]: 0,
  [GiftTypeEnum.RIBBON]: 0,
  [GiftTypeEnum.GOLDEN_FLOWER]: 15,
};

/** Health threshold for "needing refresh" notification */
const NEEDS_REFRESH_THRESHOLD = 50;

/** Health threshold for "dying" status */
const DYING_THRESHOLD = 40;

// ============================================================================
// HEALTH CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate tree health based on the tree's state.
 * 
 * Takes into account:
 * - Days since last refresh
 * - Unused gift buffers
 * 
 * @param tree - The user's tree to calculate health for
 * @returns Health percentage (5-100)
 * 
 * @example
 * const tree = { lastRefreshDate: '2024-01-15T10:00:00Z', giftsReceived: [] };
 * const health = calculateHealth(tree); // Depends on days since Jan 15
 */
export function calculateHealth(tree: UserTree): number {
  const daysSinceRefresh = calculateDaysSinceRefresh(tree);
  const bufferDays = calculateBufferDays(tree);
  
  // Apply buffer before decay kicks in
  const effectiveDays = Math.max(0, daysSinceRefresh - bufferDays);
  
  // Find the appropriate health level
  for (const threshold of HEALTH_THRESHOLDS) {
    if (effectiveDays <= threshold.maxDays) {
      return threshold.health;
    }
  }
  
  // 22+ days: minimum health
  return MIN_HEALTH;
}

/**
 * Calculate days since last refresh.
 * 
 * @param tree - The tree to check
 * @returns Number of days since last refresh (0 for new trees)
 * 
 * @example
 * // Tree refreshed 5 days ago
 * calculateDaysSinceRefresh(tree); // Returns 5
 */
export function calculateDaysSinceRefresh(tree: UserTree): number {
  // New trees start at full health
  if (!tree.lastRefreshDate) {
    return 0;
  }
  
  const lastRefresh = new Date(tree.lastRefreshDate);
  const now = new Date();
  const diffMs = now.getTime() - lastRefresh.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Return 0 for future dates (clock skew protection)
  return Math.max(0, diffDays);
}

/**
 * Calculate buffer days from unused gifts.
 * 
 * Only gifts that haven't been applied yet contribute to the buffer.
 * Each gift type provides different buffer days.
 * 
 * @param tree - The tree with gifts
 * @returns Total buffer days from unused gifts
 */
export function calculateBufferDays(tree: UserTree): number {
  if (!tree.giftsReceived || tree.giftsReceived.length === 0) {
    return 0;
  }
  
  return tree.giftsReceived
    .filter(gift => !gift.appliedDate) // Only unused gifts
    .reduce((total, gift) => {
      return total + (GIFT_BUFFER_DAYS[gift.type] || 0);
    }, 0);
}

/**
 * Get health category for visual display.
 * 
 * Categories:
 * - healthy: 80-100% (green)
 * - thirsty: 40-79% (amber)
 * - dying: 0-39% (red)
 * 
 * @param health - Health percentage (0-100)
 * @returns Health category for styling
 */
export function getHealthCategory(health: number): 'healthy' | 'thirsty' | 'dying' {
  if (health >= 80) return 'healthy';
  if (health >= 40) return 'thirsty';
  return 'dying';
}

/**
 * Health indicator configuration for UI display.
 */
export interface HealthIndicator {
  /** Display text for the indicator */
  text: string;
  /** Emoji for quick visual recognition */
  emoji: string;
  /** Color for styling */
  color: 'green' | 'amber' | 'red';
}

/**
 * Get health indicator for UI display.
 * 
 * @param health - Health percentage (0-100)
 * @returns Display configuration
 * 
 * @example
 * const indicator = getHealthIndicator(75);
 * // { text: 'Thirsty', emoji: '💧', color: 'amber' }
 */
export function getHealthIndicator(health: number): HealthIndicator {
  const category = getHealthCategory(health);
  
  switch (category) {
    case 'healthy':
      return { text: 'Healthy', emoji: '✓', color: 'green' };
    case 'thirsty':
      return { text: 'Thirsty', emoji: '💧', color: 'amber' };
    case 'dying':
      return { text: 'Dying!', emoji: '🆘', color: 'red' };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get buffer days for a specific gift type.
 * 
 * @param giftType - The type of gift
 * @returns Buffer days this gift provides
 */
export function getGiftBufferDays(giftType: GiftType): number {
  return GIFT_BUFFER_DAYS[giftType] || 0;
}

/**
 * Get all trees that need refresh (health below threshold).
 * 
 * @param trees - All user's trees
 * @returns Trees that need attention
 */
export function getTreesNeedingRefresh(trees: UserTree[]): UserTree[] {
  return trees.filter(tree => {
    const health = calculateHealth(tree);
    return health < NEEDS_REFRESH_THRESHOLD;
  });
}

/**
 * Get all trees in critical/dying state.
 * 
 * @param trees - All user's trees
 * @returns Trees in critical condition
 */
export function getDyingTrees(trees: UserTree[]): UserTree[] {
  return trees.filter(tree => {
    const health = calculateHealth(tree);
    return health < DYING_THRESHOLD;
  });
}

/**
 * Check if a specific tree needs attention.
 * 
 * @param tree - Tree to check
 * @returns Whether the tree needs attention
 */
export function treeNeedsAttention(tree: UserTree): boolean {
  return calculateHealth(tree) < MAX_HEALTH;
}

/**
 * Get a human-readable description of tree health.
 * 
 * @param tree - Tree to describe
 * @returns Human-readable status description
 */
export function getHealthDescription(tree: UserTree): string {
  const health = calculateHealth(tree);
  const indicator = getHealthIndicator(health);
  const daysSince = calculateDaysSinceRefresh(tree);
  const bufferDays = calculateBufferDays(tree);
  
  if (health >= MAX_HEALTH) {
    // Perfect health - check for gift protection
    if (bufferDays > 0) {
      return `This tree is in perfect health with ${bufferDays} days of gift protection!`;
    }
    return 'This tree is in perfect health!';
  }
  
  if (health >= 80) {
    // Good health - mention gift protection if available
    if (bufferDays > 0) {
      return `This tree is doing well with ${bufferDays} days of gift protection remaining.`;
    }
    return 'This tree is doing well.';
  }
  
  if (bufferDays > 0) {
    return `This tree has ${bufferDays} days of protection from gifts. After that, it needs practice!`;
  }
  
  if (daysSince === 1) {
    return `This tree was last refreshed yesterday. It's doing fine!`;
  }
  
  if (health >= 40) {
    return `This tree needs some attention. Practice a lesson to refresh it!`;
  }
  
  return 'This tree is in critical condition! Practice now to save it!';
}

// ============================================================================
// ASYNC FUNCTIONS (POCKETBASE INTEGRATION)
// ============================================================================

/**
 * Pocketbase user tree record structure.
 */
interface PBUserTree {
  id: string;
  user: string;
  skillPathId: string;
  name: string;
  icon: string;
  status: string;
  health: number;
  lastRefreshDate: string;
  sunDropsTotal: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  position: { x: number; y: number };
  decorations: string[];
  giftsReceived: GiftItem[];
  created: string;
  updated: string;
}

/**
 * Refresh tree health after completing a lesson.
 * 
 * This resets the tree to full health by updating lastRefreshDate.
 * 
 * @param tree - The tree to refresh
 * @returns Updated tree with fresh health
 * @throws Error if update fails
 * 
 * @example
 * const refreshedTree = await refreshTreeHealth(tree);
 * console.log(refreshedTree.health); // 100
 */
export async function refreshTreeHealth(tree: UserTree): Promise<UserTree> {
  const now = new Date().toISOString();
  
  try {
    const record = await pb.collection('user_trees').update<PBUserTree>(tree.id, {
      lastRefreshDate: now,
      health: MAX_HEALTH,
    });
    
    return pbTreeToUserTree(record);
  } catch (error) {
    console.error('[treeHealthService] Failed to refresh tree health:', error);
    throw new Error('Failed to refresh tree. Please try again.');
  }
}

/**
 * Apply a gift to add buffer days to a tree.
 * 
 * Marks the gift as applied, which adds its buffer days to decay protection.
 * 
 * @param tree - The tree to apply the gift to
 * @param giftId - ID of the gift to apply
 * @returns Updated tree with gift applied
 * @throws Error if gift not found or update fails
 * 
 * @example
 * // Apply a water_drop gift (10 days buffer)
 * const updatedTree = await applyGiftBuffer(tree, 'gift-123');
 */
export async function applyGiftBuffer(
  tree: UserTree, 
  giftId: string
): Promise<UserTree> {
  // Find the gift
  const gift = tree.giftsReceived?.find(g => g.id === giftId);
  if (!gift) {
    throw new Error('Gift not found on this tree.');
  }
  
  // Check if already applied
  if (gift.appliedDate) {
    throw new Error('This gift has already been used.');
  }
  
  const bufferDays = GIFT_BUFFER_DAYS[gift.type] || 0;
  
  // Non-buffer gifts (seeds, ribbons) don't affect health
  if (bufferDays === 0) {
    console.log(`[treeHealthService] Gift type ${gift.type} doesn't provide buffer days.`);
    return tree;
  }
  
  // Mark gift as applied
  const updatedGifts: GiftItem[] = (tree.giftsReceived || []).map(g => 
    g.id === giftId 
      ? { ...g, appliedDate: new Date().toISOString() } 
      : g
  );
  
  try {
    const record = await pb.collection('user_trees').update<PBUserTree>(tree.id, {
      giftsReceived: updatedGifts,
    });
    
    return pbTreeToUserTree(record);
  } catch (error) {
    console.error('[treeHealthService] Failed to apply gift:', error);
    throw new Error('Failed to apply gift. Please try again.');
  }
}

/**
 * Update all tree health values for a user.
 * 
 * Should be called on app start to ensure health values are current.
 * Only updates trees where health has changed.
 * 
 * @param userId - The user's ID
 * @returns Number of trees updated
 * 
 * @example
 * // In app initialization
 * const updatedCount = await updateAllTreeHealth(userId);
 * console.log(`Updated ${updatedCount} trees.`);
 */
export async function updateAllTreeHealth(userId: string): Promise<number> {
  try {
    const records = await pb.collection('user_trees').getList<PBUserTree>(1, 50, {
      filter: `user = "${userId}"`,
    });
    
    let updatedCount = 0;
    
    for (const record of records.items) {
      const tree = pbTreeToUserTree(record);
      const calculatedHealth = calculateHealth(tree);
      
      // Only update if health has changed
      if (calculatedHealth !== record.health) {
        await pb.collection('user_trees').update(record.id, {
          health: calculatedHealth,
        });
        updatedCount++;
      }
    }
    
    return updatedCount;
  } catch (error) {
    console.error('[treeHealthService] Failed to update all tree health:', error);
    // Don't throw - this is a background operation
    return 0;
  }
}

/**
 * Get all trees for a user from Pocketbase.
 * 
 * @param userId - The user's ID
 * @returns Array of user trees
 */
export async function getUserTrees(userId: string): Promise<UserTree[]> {
  try {
    const records = await pb.collection('user_trees').getList<PBUserTree>(1, 50, {
      filter: `user = "${userId}"`,
      sort: 'created',
    });
    
    return records.items.map(pbTreeToUserTree);
  } catch (error) {
    console.error('[treeHealthService] Failed to get user trees:', error);
    return [];
  }
}

// ============================================================================
// HELPER: PB RECORD CONVERSION
// ============================================================================

/**
 * Convert Pocketbase record to UserTree type.
 * 
 * @param pb - Pocketbase tree record
 * @returns UserTree object
 */
function pbTreeToUserTree(pb: PBUserTree): UserTree {
  return {
    id: pb.id,
    skillPathId: pb.skillPathId,
    name: pb.name,
    icon: pb.icon,
    status: pb.status as any, // TreeStatus enum
    health: pb.health,
    lastRefreshDate: pb.lastRefreshDate,
    sunDropsTotal: pb.sunDropsTotal,
    lessonsCompleted: pb.lessonsCompleted,
    lessonsTotal: pb.lessonsTotal,
    position: pb.position,
    decorations: pb.decorations,
    giftsReceived: pb.giftsReceived.map(g => ({
      ...g,
      type: g.type as GiftType,
    })),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TREE_HEALTH_CONSTANTS = {
  MIN_HEALTH,
  MAX_HEALTH,
  NEEDS_REFRESH_THRESHOLD,
  DYING_THRESHOLD,
  GIFT_BUFFER_DAYS,
  HEALTH_THRESHOLDS,
};