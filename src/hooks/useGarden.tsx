/**
 * useGarden Hook
 * 
 * Central state management for the user's garden.
 * Handles tree fetching, position management, and real-time updates.
 * 
 * Features:
 * - Fetch trees from Pocketbase
 * - Real-time subscription to tree changes
 * - Create and update tree positions
 * - Track current skill path
 * - Garden refresh functionality
 * 
 * @module useGarden
 * @see docs/phase-1.1/task-1-1-8-garden-state.md
 */

import { useState, useEffect, useCallback } from 'react';
import { pb, getCurrentUserId } from '../../services/pocketbaseService';
import {
  calculateHealth,
  calculateDaysSinceRefresh,
  getHealthIndicator,
  updateAllTreeHealth,
} from '../services/treeHealthService';
import type { 
  UserTree, 
  TreeStatus, 
  SkillPath, 
  SkillPathLesson, 
  LessonStatus,
  GiftItem,
  GiftType,
} from '../types/game';
import { TreeStatus as TreeStatusEnum, calculateGrowthStage } from '../types/game';
import { MOCK_SKILL_PATHS } from '../data/mockGameData';

// ============================================
// TYPES
// ============================================

/**
 * Return type for useGarden hook
 */
export interface UseGardenReturn {
  // State
  /** All user's trees */
  trees: UserTree[];
  /** Available skill paths (for planting new trees) */
  skillPaths: SkillPath[];
  /** Currently selected tree */
  currentTree: UserTree | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;

  // Actions
  /** Refresh garden from server */
  refreshGarden: () => Promise<void>;
  /** Create a new tree for a skill path */
  createTree: (skillPathId: string, position: { x: number; y: number }) => Promise<UserTree>;
  /** Update tree position */
  updateTreePosition: (treeId: string, position: { x: number; y: number }) => Promise<void>;
  /** Select a tree as current */
  selectTree: (tree: UserTree | null) => void;
  /** Clear error state */
  clearError: () => void;

  // Selectors
  /** Get tree for a specific skill path */
  getTreeBySkillPath: (skillPathId: string) => UserTree | undefined;
  /** Get current lesson for a tree */
  getCurrentLesson: (tree: UserTree) => SkillPathLesson | undefined;
  /** Get tree health status */
  getTreeHealth: (tree: UserTree) => TreeHealthInfo;
}

/**
 * Information about tree health
 */
export interface TreeHealthInfo {
  /** Health percentage (0-100) */
  health: number;
  /** Days since last refresh */
  daysSinceRefresh: number;
  /** Health category */
  category: 'healthy' | 'thirsty' | 'dying';
  /** Display text */
  displayText: string;
  /** Display emoji */
  emoji: string;
}

/**
 * Pocketbase user tree record
 */
interface PBUserTree {
  id: string;
  user: string;
  skillPathId: string;
  name: string;
  icon: string;
  status: TreeStatus;
  health: number;
  lastRefreshDate: string;
  sunDropsTotal: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  position: { x: number; y: number };
  decorations: string[];
  giftsReceived: GiftItemRecord[];
  created: string;
  updated: string;
}

/**
 * Gift item record in Pocketbase
 */
interface GiftItemRecord {
  id: string;
  type: string;
  fromUserId: string;
  fromUserName: string;
  appliedDate?: string;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for managing garden state
 * 
 * @example
 * const {
 *   trees,
 *   currentTree,
 *   createTree,
 *   getTreeHealth,
 * } = useGarden();
 * 
 * // Plant a new tree
 * await createTree('spanish-greetings', { x: 300, y: 200 });
 * 
 * // Check tree health
 * const health = getTreeHealth(tree);
 * console.log(health.displayText); // "Healthy"
 */
export function useGarden(): UseGardenReturn {
  // State for trees
  const [trees, setTrees] = useState<UserTree[]>([]);
  // Available skill paths
  const [skillPaths, setSkillPaths] = useState<SkillPath[]>([]);
  // Currently selected tree
  const [currentTree, setCurrentTree] = useState<UserTree | null>(null);
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Error state
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // Initialize on mount
  // ==========================================
  
  useEffect(() => {
    loadGarden();
    
    // Subscribe to real-time updates so tree health/gift changes
    // from other sources update the garden without a full reload.
    const userId = getCurrentUserId();
    if (userId) {
      subscribeToTreeChanges(userId);
    }
    
    // Cleanup subscription on unmount
    return () => {
      pb.collection('user_trees').unsubscribe();
    };
  }, []);

  /**
   * Subscribe to real-time tree changes
   */
  const subscribeToTreeChanges = async (userId: string) => {
    try {
      await pb.collection('user_trees').subscribe('*', (e) => {
        if (e.record.user !== userId) return;
        
        const tree = pbTreeToUserTree(e.record as unknown as PBUserTree);
        
        if (e.action === 'create') {
          setTrees(prev => [...prev, tree]);
        } else if (e.action === 'update') {
          setTrees(prev => prev.map(t => t.id === tree.id ? tree : t));
        } else if (e.action === 'delete') {
          setTrees(prev => prev.filter(t => t.id !== e.record.id));
          
          // If deleted tree was current, clear selection
          if (currentTree?.id === e.record.id) {
            setCurrentTree(null);
          }
        }
      });
    } catch (err) {
      console.error('[useGarden] Failed to subscribe to changes:', err);
    }
  };

  /**
   * Load garden data from Pocketbase.
   * Empty array is valid for new users with no trees yet.
   */
  const loadGarden = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userId = getCurrentUserId();
      if (!userId) {
        setTrees([]);
        setSkillPaths([]);
        setIsLoading(false);
        return;
      }

      // Load trees
      const treeRecords = await pb.collection('user_trees').getList<PBUserTree>(1, 50, {
        filter: `user = "${userId}"`,
        sort: 'created',
      });

      const loadedTrees = treeRecords.items.map(pbTreeToUserTree);
      setTrees(loadedTrees);

      // Update all tree health values based on time since last refresh
      // This is done on app start to ensure health is current
      try {
        const updatedCount = await updateAllTreeHealth(userId);
        if (updatedCount > 0) {
          console.log(`[useGarden] Updated health for ${updatedCount} trees`);
        }
      } catch (healthError) {
        // Log but don't fail - health updates are non-critical
        console.warn('[useGarden] Failed to update tree health:', healthError);
      }

      // Load skill paths (from cache or database)
      // MOCK_SKILL_PATHS used until Task K wires live PB skill path records
      setSkillPaths(MOCK_SKILL_PATHS);

    } catch (err) {
      console.error('[useGarden] Failed to load garden:', err);
      setError('Failed to load your garden. Let\'s try again!');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // Actions
  // ==========================================

  /**
   * Refresh garden from server
   */
  const refreshGarden = useCallback(async (): Promise<void> => {
    await loadGarden();
  }, []);

  /**
   * Create a new tree for a skill path
   * 
   * @param skillPathId - The skill path to plant
   * @param position - Position in the garden
   * @returns The created tree
   */
  const createTree = useCallback(async (
    skillPathId: string, 
    position: { x: number; y: number }
  ): Promise<UserTree> => {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Check if tree already exists for this skill path
    const existingTree = trees.find(t => t.skillPathId === skillPathId);
    if (existingTree) {
      throw new Error('You already have a tree for this skill path!');
    }

    // Get skill path details
    const skillPath = skillPaths.find(sp => sp.id === skillPathId);
    if (!skillPath) {
      throw new Error('Skill path not found');
    }

    const newTree: UserTree = {
      id: `tree-${Date.now()}`, // Will be replaced by DB ID
      userId: userId || '',
      skillPathId,
      name: skillPath.name,
      icon: skillPath.icon,
      status: TreeStatusEnum.SEED,
      health: 100,
      bufferDays: 0,
      lastRefreshDate: new Date().toISOString(),
      sunDropsEarned: 0,
      sunDropsTotal: 0, // Deprecated, kept for compatibility
      growthStage: 0,
      gridPosition: { gx: Math.floor(position.x / 50), gz: Math.floor(position.y / 50) },
      position,
      lessonsCompleted: 0,
      lessonsTotal: skillPath.lessons.length,
      decorations: [],
      giftsReceived: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setError(null);

      // Create in Pocketbase
      const record = await pb.collection('user_trees').create<PBUserTree>({
        user: userId,
        skillPathId,
        name: skillPath.name,
        icon: skillPath.icon,
        status: TreeStatusEnum.SEED,
        health: 100,
        lastRefreshDate: new Date().toISOString(),
        sunDropsTotal: 0,
        lessonsCompleted: 0,
        lessonsTotal: skillPath.lessons.length,
        position,
        decorations: [],
        giftsReceived: [],
      });

      const createdTree = pbTreeToUserTree(record);
      
      // Add to local state
      setTrees(prev => [...prev, createdTree]);
      
      return createdTree;
    } catch (err) {
      console.error('[useGarden] Failed to create tree:', err);
      setError('Couldn\'t plant your tree. Let\'s try again!');
      throw err;
    }
  }, [trees, skillPaths]);

  /**
   * Update tree position
   */
  const updateTreePosition = useCallback(async (
    treeId: string, 
    position: { x: number; y: number }
  ): Promise<void> => {
    // Optimistic update — show the move instantly, revert if PB rejects
    setTrees(prev => prev.map(t => 
      t.id === treeId ? { ...t, position } : t
    ));

    try {
      setError(null);
      
      await pb.collection('user_trees').update(treeId, { position });
    } catch (err) {
      console.error('[useGarden] Failed to update position:', err);
      setError('Couldn\'t move your tree. Let\'s try again!');
      
      // Revert optimistic update on error
      await loadGarden();
    }
  }, []);

  /**
   * Select a tree as current
   */
  const selectTree = useCallback((tree: UserTree | null): void => {
    setCurrentTree(tree);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // ==========================================
  // Selectors
  // ==========================================

  /**
   * Get tree for a specific skill path
   */
  const getTreeBySkillPath = useCallback((skillPathId: string): UserTree | undefined => {
    return trees.find(t => t.skillPathId === skillPathId);
  }, [trees]);

  /**
   * Get current lesson for a tree
   */
  const getCurrentLesson = useCallback((tree: UserTree): SkillPathLesson | undefined => {
    const skillPath = skillPaths.find(sp => sp.id === tree.skillPathId);
    if (!skillPath) return undefined;
    
    return skillPath.lessons.find(l => l.status === 'current');
  }, [skillPaths]);

  /**
   * Get tree health information
   * Uses treeHealthService for accurate calculations with gift buffers.
   */
  const getTreeHealth = useCallback((tree: UserTree): TreeHealthInfo => {
    const health = calculateHealth(tree);
    const daysRefresh = calculateDaysSinceRefresh(tree);
    const indicator = getHealthIndicator(health);
    
    return {
      health,
      daysSinceRefresh: daysRefresh,
      category: indicator.color === 'green' ? 'healthy' : indicator.color === 'amber' ? 'thirsty' : 'dying',
      displayText: indicator.text,
      emoji: indicator.emoji,
    };
  }, []);

  // ==========================================
  // Return
  // ==========================================

  return {
    // State
    trees,
    skillPaths,
    currentTree,
    isLoading,
    error,

    // Actions
    refreshGarden,
    createTree,
    updateTreePosition,
    selectTree,
    clearError,

    // Selectors
    getTreeBySkillPath,
    getCurrentLesson,
    getTreeHealth,
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Convert Pocketbase tree record to UserTree type.
 * Handles migration from old schema to new schema with per-tree SunDrops.
 */
function pbTreeToUserTree(pb: PBUserTree): UserTree {
  // Calculate growth stage from sunDropsEarned (or sunDropsTotal for migration)
  const sunDropsEarned = (pb as unknown as Record<string, unknown>).sunDropsEarned as number ?? pb.sunDropsTotal ?? 0;
  const growthStage = calculateGrowthStage(sunDropsEarned);
  
  return {
    id: pb.id,
    userId: pb.user,
    skillPathId: pb.skillPathId,
    name: pb.name,
    icon: pb.icon,
    status: pb.status,
    health: pb.health,
    bufferDays: (pb as unknown as Record<string, unknown>).bufferDays as number ?? 0,
    lastRefreshDate: pb.lastRefreshDate,
    sunDropsEarned,
    sunDropsTotal: pb.sunDropsTotal,
    growthStage,
    gridPosition: (pb as unknown as Record<string, unknown>).gridPosition as { gx: number; gz: number } 
      ?? { gx: Math.floor(pb.position.x / 50), gz: Math.floor(pb.position.y / 50) },
    position: pb.position,
    lessonsCompleted: pb.lessonsCompleted,
    lessonsTotal: pb.lessonsTotal,
    decorations: pb.decorations,
    // Convert GiftItemRecord[] to GiftItem[] by casting the type field
    giftsReceived: pb.giftsReceived.map(g => ({
      ...g,
      type: g.type as GiftType,
    })),
    createdAt: pb.created,
    updatedAt: pb.updated,
  };
}

export default useGarden;