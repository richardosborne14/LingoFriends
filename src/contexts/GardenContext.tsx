/**
 * Garden Context
 * 
 * Central state management for the entire garden experience.
 * Provides unified access to garden trees, Sun Drops, and lessons.
 * 
 * This context wraps the three core garden hooks:
 * - useGarden: Tree management and skill paths
 * - useSunDrops: Currency and daily cap
 * - useLesson: Lesson progression
 * 
 * @module GardenContext
 * @see docs/phase-1.1/task-1-1-8-garden-state.md
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useGarden, UseGardenReturn } from '../hooks/useGarden';
import { useSunDrops, UseSunDropsReturn } from '../hooks/useSunDrops';
import { useLesson, UseLessonReturn } from '../hooks/useLesson';
import type { UserTree, SkillPath, SkillPathLesson } from '../types/game';

// ============================================
// TYPES
// ============================================

/**
 * Combined context value from all garden hooks
 */
export interface GardenContextValue {
  // Garden state
  trees: UserTree[];
  skillPaths: SkillPath[];
  currentTree: UserTree | null;
  isLoading: boolean;
  error: string | null;

  // Sun Drop state
  sunDropBalance: number;
  dailyEarned: number;
  dailyCap: number;
  remainingAllowance: number;
  isCapReached: boolean;

  // Lesson state
  lessonPlan: UseLessonReturn['lessonPlan'];
  currentStep: UseLessonReturn['currentStep'];
  progress: number;
  sunDropsEarnedInLesson: number;
  isLessonLoading: boolean;
  isLessonComplete: boolean;

  // Garden actions
  refreshGarden: () => Promise<void>;
  createTree: (skillPathId: string, position: { x: number; y: number }) => Promise<UserTree>;
  updateTreePosition: (treeId: string, position: { x: number; y: number }) => Promise<void>;
  selectTree: (tree: UserTree | null) => void;
  clearError: () => void;

  // Sun Drop actions
  earnSunDrops: (amount: number) => Promise<UseSunDropsReturn['earnSunDrops'] extends (a: number) => Promise<infer R> ? R : never>;
  checkDailyCap: () => Promise<void>;
  refreshSunDrops: () => Promise<void>;

  // Lesson actions
  loadLesson: (lesson: SkillPathLesson) => Promise<void>;
  submitAnswer: UseLessonReturn['submitAnswer'];
  nextStep: () => void;
  previousStep: () => void;
  resetLesson: () => void;
  endLesson: () => UseLessonReturn['endLesson'] extends () => infer R ? R : never;

  // Selectors
  getTreeBySkillPath: (skillPathId: string) => UserTree | undefined;
  getCurrentLesson: (tree: UserTree) => SkillPathLesson | undefined;
  getTreeHealth: UseGardenReturn['getTreeHealth'];
  calculateActivityReward: UseSunDropsReturn['calculateActivityReward'];
  calculateStarsFromDrops: UseSunDropsReturn['calculateStarsFromDrops'];

  // Helpers
  completeLessonAndSync: () => Promise<UseLessonReturn['endLesson'] extends () => infer R ? R : never>;
}

/**
 * Props for GardenProvider
 */
export interface GardenProviderProps {
  children: React.ReactNode;
}

// ============================================
// CONTEXT
// ============================================

/**
 * Garden Context
 * 
 * Provides unified access to all garden-related state and actions.
 */
const GardenContext = createContext<GardenContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

/**
 * Garden Provider Component
 * 
 * Wraps the app with garden state management.
 * Must be used within authenticated context (requires user ID).
 * 
 * @example
 * <GardenProvider>
 *   <GardenWorld />
 * </GardenProvider>
 */
export function GardenProvider({ children }: GardenProviderProps): React.ReactElement {
  // Initialize all hooks
  const garden = useGarden();
  const sunDrops = useSunDrops();
  const lesson = useLesson();

  // ==========================================
  // Combined Actions
  // ==========================================

  /**
   * Complete the current lesson and sync Sun Drops
   * This combines lesson end with currency updates
   */
  const completeLessonAndSync = useCallback(async () => {
    // End the lesson and get summary
    const summary = lesson.endLesson();
    
    // Sync Sun Drops earned in lesson with the balance
    // Note: Sun Drops were earned via submitAnswer, so just refresh
    await sunDrops.refresh();
    
    // Refresh garden to update tree progress
    await garden.refreshGarden();
    
    return summary;
  }, [lesson, sunDrops, garden]);

  /**
   * Clear all errors from hooks
   */
  const clearError = useCallback(() => {
    garden.clearError();
    sunDrops.clearError();
    lesson.clearError();
  }, [garden, sunDrops, lesson]);

  // ==========================================
  // Memoized Context Value
  // ==========================================

  const value = useMemo<GardenContextValue>(() => ({
    // Garden state
    trees: garden.trees,
    skillPaths: garden.skillPaths,
    currentTree: garden.currentTree,
    isLoading: garden.isLoading || sunDrops.isLoading,
    error: garden.error || sunDrops.error || lesson.error,

    // Sun Drop state
    sunDropBalance: sunDrops.balance,
    dailyEarned: sunDrops.dailyEarned,
    dailyCap: sunDrops.dailyCap,
    remainingAllowance: sunDrops.remainingAllowance,
    isCapReached: sunDrops.isCapReached,

    // Lesson state
    lessonPlan: lesson.lessonPlan,
    currentStep: lesson.currentStep,
    progress: lesson.progress,
    sunDropsEarnedInLesson: lesson.sunDropsEarned,
    isLessonLoading: lesson.isLoading,
    isLessonComplete: lesson.isComplete,

    // Garden actions
    refreshGarden: garden.refreshGarden,
    createTree: garden.createTree,
    updateTreePosition: garden.updateTreePosition,
    selectTree: garden.selectTree,
    clearError,

    // Sun Drop actions
    earnSunDrops: sunDrops.earnSunDrops,
    checkDailyCap: sunDrops.checkDailyCap,
    refreshSunDrops: sunDrops.refresh,

    // Lesson actions
    loadLesson: lesson.loadLesson,
    submitAnswer: lesson.submitAnswer,
    nextStep: lesson.nextStep,
    previousStep: lesson.previousStep,
    resetLesson: lesson.resetLesson,
    endLesson: lesson.endLesson,

    // Selectors
    getTreeBySkillPath: garden.getTreeBySkillPath,
    getCurrentLesson: garden.getCurrentLesson,
    getTreeHealth: garden.getTreeHealth,
    calculateActivityReward: sunDrops.calculateActivityReward,
    calculateStarsFromDrops: sunDrops.calculateStarsFromDrops,

    // Helpers
    completeLessonAndSync,
  }), [
    garden,
    sunDrops,
    lesson,
    clearError,
    completeLessonAndSync,
  ]);

  return (
    <GardenContext.Provider value={value}>
      {children}
    </GardenContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to access garden context
 * 
 * @throws Error if used outside GardenProvider
 * @returns Garden context value
 * 
 * @example
 * function GardenComponent() {
 *   const { trees, sunDropBalance, loadLesson } = useGardenContext();
 *   
 *   return (
 *     <div>
 *       <h2>Your Garden</h2>
 *       <p>Sun Drops: {sunDropBalance}</p>
 *       <ul>
 *         {trees.map(tree => (
 *           <li key={tree.id}>{tree.name}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 */
export function useGardenContext(): GardenContextValue {
  const context = useContext(GardenContext);
  
  if (!context) {
    throw new Error(
      'useGardenContext must be used within a GardenProvider. ' +
      'Make sure to wrap your component tree with <GardenProvider>.'
    );
  }
  
  return context;
}

// ============================================
// EXPORTS
// ============================================

export { GardenContext };
export default GardenProvider;