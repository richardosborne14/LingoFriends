/**
 * useTreeHealth Hook
 * 
 * React hook for managing tree health state in the garden.
 * Provides health calculations, refresh actions, and notifications
 * for trees needing attention.
 * 
 * Features:
 * - Calculate health for any tree by ID
 * - Get health categories and indicators for UI
 * - Refresh tree health after lessons
 * - Apply gifts for buffer days
 * - Track trees needing attention
 * 
 * @module useTreeHealth
 * @see docs/phase-1.1/task-1-1-10-tree-health-decay.md
 */

import { useMemo, useCallback } from 'react';
import { useGarden } from './useGarden';
import {
  calculateHealth,
  calculateDaysSinceRefresh,
  calculateBufferDays,
  getHealthCategory,
  getHealthIndicator,
  refreshTreeHealth as refreshTreeHealthService,
  applyGiftBuffer as applyGiftBufferService,
  getTreesNeedingRefresh,
  getDyingTrees,
  updateAllTreeHealth,
} from '../services/treeHealthService';
import type { UserTree, GiftType } from '../types/game';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Return type for useTreeHealth hook
 */
export interface UseTreeHealthReturn {
  // Health calculations
  /** Get health percentage for a tree by ID */
  getHealth: (treeId: string) => number;
  /** Get health category for styling */
  getHealthCategory: (treeId: string) => 'healthy' | 'thirsty' | 'dying';
  /** Get health indicator (text, emoji, color) for UI */
  getHealthIndicator: (treeId: string) => { text: string; emoji: string; color: 'green' | 'amber' | 'red' };
  /** Get days since last refresh for a tree */
  getDaysSinceRefresh: (treeId: string) => number;
  /** Get buffer days from unused gifts */
  getBufferDays: (treeId: string) => number;
  
  // Actions
  /** Refresh tree health after completing a lesson */
  refreshTree: (treeId: string) => Promise<void>;
  /** Apply a gift to add buffer days */
  applyGift: (treeId: string, giftId: string) => Promise<void>;
  /** Update all tree health values (call on app start) */
  updateAllTrees: () => Promise<number>;
  
  // Notifications
  /** Trees that need refresh (health < 50%) */
  treesNeedingRefresh: UserTree[];
  /** Trees in critical condition (health < 40%) */
  dyingTrees: UserTree[];
  /** Number of trees needing attention */
  treesNeedingAttention: number;
  
  // Tree access
  /** All trees from garden */
  trees: UserTree[];
  /** Get a specific tree by ID */
  getTree: (treeId: string) => UserTree | undefined;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing tree health state.
 * 
 * Must be used within a GardenProvider (uses useGarden internally).
 * 
 * @example
 * function TreeHealthIndicator({ treeId }: { treeId: string }) {
 *   const { getHealthIndicator, getHealth } = useTreeHealth();
 *   const indicator = getHealthIndicator(treeId);
 *   
 *   return (
 *     <div className={`health-${indicator.color}`}>
 *       {indicator.emoji} {indicator.text} ({getHealth(treeId)}%)
 *     </div>
 *   );
 * }
 * 
 * @example
 * function TreesNeedingAttention() {
 *   const { treesNeedingRefresh, dyingTrees } = useTreeHealth();
 *   
 *   return (
 *     <div>
 *       {dyingTrees.length > 0 && (
 *         <Warning>{dyingTrees.length} trees are dying!</Warning>
 *       )}
 *       {treesNeedingRefresh.map(tree => (
 *         <TreeCard key={tree.id} tree={tree} />
 *       ))}
 *     </div>
 *   );
 * }
 */
export function useTreeHealth(): UseTreeHealthReturn {
  const { trees, refreshGarden } = useGarden();
  
  // ==========================================
  // Health Map (memoized)
  // ==========================================
  
  /**
   * Map of tree IDs to their calculated health values.
   * Recalculates when trees change.
   */
  const healthMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const tree of trees) {
      map.set(tree.id, calculateHealth(tree));
    }
    return map;
  }, [trees]);
  
  /**
   * Map of tree IDs to their days since refresh.
   */
  const daysSinceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const tree of trees) {
      map.set(tree.id, calculateDaysSinceRefresh(tree));
    }
    return map;
  }, [trees]);
  
  /**
   * Map of tree IDs to their buffer days from gifts.
   */
  const bufferDaysMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const tree of trees) {
      map.set(tree.id, calculateBufferDays(tree));
    }
    return map;
  }, [trees]);
  
  // ==========================================
  // Health Getters
  // ==========================================
  
  /**
   * Get health percentage for a tree by ID.
   * Returns 100 (full health) if tree not found.
   */
  const getHealth = useCallback((treeId: string): number => {
    return healthMap.get(treeId) ?? 100;
  }, [healthMap]);
  
  /**
   * Get health category for a tree by ID.
   */
  const getHealthCategoryById = useCallback((treeId: string): 'healthy' | 'thirsty' | 'dying' => {
    return getHealthCategory(getHealth(treeId));
  }, [getHealth]);
  
  /**
   * Get health indicator for a tree by ID.
   */
  const getHealthIndicatorById = useCallback((treeId: string) => {
    return getHealthIndicator(getHealth(treeId));
  }, [getHealth]);
  
  /**
   * Get days since last refresh for a tree.
   */
  const getDaysSinceRefresh = useCallback((treeId: string): number => {
    return daysSinceMap.get(treeId) ?? 0;
  }, [daysSinceMap]);
  
  /**
   * Get buffer days from unused gifts for a tree.
   */
  const getBufferDays = useCallback((treeId: string): number => {
    return bufferDaysMap.get(treeId) ?? 0;
  }, [bufferDaysMap]);
  
  /**
   * Get a specific tree by ID.
   */
  const getTree = useCallback((treeId: string): UserTree | undefined => {
    return trees.find(t => t.id === treeId);
  }, [trees]);
  
  // ==========================================
  // Actions
  // ==========================================
  
  /**
   * Refresh tree health after completing a lesson.
   * Resets the tree to full health.
   */
  const refreshTree = useCallback(async (treeId: string): Promise<void> => {
    const tree = trees.find(t => t.id === treeId);
    if (!tree) {
      throw new Error(`Tree not found: ${treeId}`);
    }
    
    await refreshTreeHealthService(tree);
    await refreshGarden();
  }, [trees, refreshGarden]);
  
  /**
   * Apply a gift to add buffer days to a tree.
   */
  const applyGift = useCallback(async (treeId: string, giftId: string): Promise<void> => {
    const tree = trees.find(t => t.id === treeId);
    if (!tree) {
      throw new Error(`Tree not found: ${treeId}`);
    }
    
    await applyGiftBufferService(tree, giftId);
    await refreshGarden();
  }, [trees, refreshGarden]);
  
  /**
   * Update all tree health values.
   * Should be called on app start to ensure health values are current.
   */
  const updateAllTrees = useCallback(async (): Promise<number> => {
    // Get user ID from pocketbase
    const userId = getUserId();
    if (!userId) {
      console.warn('[useTreeHealth] No user ID available for updateAllTrees');
      return 0;
    }
    
    const updatedCount = await updateAllTreeHealth(userId);
    await refreshGarden();
    return updatedCount;
  }, [refreshGarden]);
  
  // ==========================================
  // Notifications
  // ==========================================
  
  /**
   * Trees that need refresh (health < 50%).
   */
  const treesNeedingRefresh = useMemo(() => {
    return getTreesNeedingRefresh(trees);
  }, [trees]);
  
  /**
   * Trees in critical condition (health < 40%).
   */
  const dyingTrees = useMemo(() => {
    return getDyingTrees(trees);
  }, [trees]);
  
  /**
   * Total trees needing attention.
   */
  const treesNeedingAttention = useMemo(() => {
    return trees.filter(tree => getHealth(tree.id) < 100).length;
  }, [trees, getHealth]);
  
  // ==========================================
  // Return
  // ==========================================
  
  return {
    // Health calculations
    getHealth,
    getHealthCategory: getHealthCategoryById,
    getHealthIndicator: getHealthIndicatorById,
    getDaysSinceRefresh,
    getBufferDays,
    
    // Actions
    refreshTree,
    applyGift,
    updateAllTrees,
    
    // Notifications
    treesNeedingRefresh,
    dyingTrees,
    treesNeedingAttention,
    
    // Tree access
    trees,
    getTree,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the current user ID from Pocketbase.
 * This is a simple wrapper to get the user ID for the health service.
 */
function getUserId(): string | null {
  // Import from pocketbaseService to get current user
  // Using localStorage as fallback since pocketbaseService uses it
  try {
    const authData = localStorage.getItem('pb_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.token ? parsed.model?.id : null;
    }
    return null;
  } catch {
    return null;
  }
}

export default useTreeHealth;