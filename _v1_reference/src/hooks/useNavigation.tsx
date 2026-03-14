/**
 * useNavigation Hook
 * 
 * Manages app navigation state for the garden-first experience.
 * Handles navigation between Garden → Path → Lesson views with
 * proper state management and transitions.
 * 
 * Navigation Hierarchy:
 * - Garden (default/home): User's garden with trees
 * - Path: Skill path view when a tree is selected
 * - Lesson: Active lesson when a lesson node is selected
 * 
 * @module useNavigation
 */

import { useState, useCallback, ReactNode } from 'react';
import type { UserTree, SkillPathLesson, LessonPlan } from '../types/game';

// ============================================
// TYPES
// ============================================

/**
 * View types for main navigation
 */
export type ViewType = 'garden' | 'path' | 'lesson';

/**
 * Navigation state
 */
export interface NavigationState {
  /** Current view */
  currentView: ViewType;
  /** Selected tree when in path view */
  selectedTree: UserTree | null;
  /** Selected lesson when in lesson view */
  selectedLesson: SkillPathLesson | null;
  /** Active lesson plan when in lesson view */
  activeLessonPlan: LessonPlan | null;
}

/**
 * Navigation context value
 */
export interface NavigationContextValue extends NavigationState {
  /** Navigate to garden view */
  goToGarden: () => void;
  /** Navigate to path view for a specific tree */
  goToPath: (tree: UserTree) => void;
  /** Navigate to lesson view for a specific lesson */
  goToLesson: (lesson: SkillPathLesson, lessonPlan: LessonPlan) => void;
  /** Go back one level in navigation */
  goBack: () => void;
  /** Check if can go back */
  canGoBack: boolean;
}

/**
 * Props for NavigationProvider
 */
export interface NavigationProviderProps {
  children: ReactNode;
}

// ============================================
// HELPER HOOK
// ============================================

/**
 * Navigation state management hook
 * 
 * Provides navigation state and actions for the app.
 * Use this in the main App component to control view rendering.
 * 
 * @example
 * const { state, actions } = useNavigation();
 * 
 * // Navigate to path
 * actions.goToPath(selectedTree);
 * 
 * // Render based on state
 * if (state.currentView === 'garden') {
 *   return <GardenWorld onOpenPath={actions.goToPath} />;
 * }
 */
export function useNavigation() {
  const [state, setState] = useState<NavigationState>({
    currentView: 'garden',
    selectedTree: null,
    selectedLesson: null,
    activeLessonPlan: null,
  });

  /**
   * Navigate to garden view (home)
   * Resets all selected items
   */
  const goToGarden = useCallback(() => {
    setState({
      currentView: 'garden',
      selectedTree: null,
      selectedLesson: null,
      activeLessonPlan: null,
    });
  }, []);

  /**
   * Navigate to path view for a specific tree
   * Stores the selected tree for the path view to use
   */
  const goToPath = useCallback((tree: UserTree) => {
    setState({
      currentView: 'path',
      selectedTree: tree,
      selectedLesson: null,
      activeLessonPlan: null,
    });
  }, []);

  /**
   * Navigate to lesson view for a specific lesson
   * Stores both the lesson metadata and the generated lesson plan
   */
  const goToLesson = useCallback((lesson: SkillPathLesson, lessonPlan: LessonPlan) => {
    setState((prev) => ({
      ...prev,
      currentView: 'lesson',
      selectedLesson: lesson,
      activeLessonPlan: lessonPlan,
    }));
  }, []);

  /**
   * Go back one level in navigation
   * garden ← path ← lesson
   */
  const goBack = useCallback(() => {
    setState((prev) => {
      switch (prev.currentView) {
        case 'lesson':
          // Lesson → Path (if we have a selected tree)
          return {
            ...prev,
            currentView: 'path',
            selectedLesson: null,
            activeLessonPlan: null,
          };
        case 'path':
          // Path → Garden
          return {
            ...prev,
            currentView: 'garden',
            selectedTree: null,
          };
        default:
          // Already at garden, no change
          return prev;
      }
    });
  }, []);

  /**
   * Check if back navigation is available
   */
  const canGoBack = state.currentView !== 'garden';

  return {
    state,
    actions: {
      goToGarden,
      goToPath,
      goToLesson,
      goBack,
      canGoBack,
    },
  };
}

// ============================================
// NAVIGATION TRANSITION HELPERS
// ============================================

/**
 * Get the animation direction for transitions
 * Positive = forward (slide left), Negative = back (slide right)
 */
export function getTransitionDirection(
  from: ViewType,
  to: ViewType
): 'left' | 'right' | 'none' {
  const viewOrder: ViewType[] = ['garden', 'path', 'lesson'];
  const fromIndex = viewOrder.indexOf(from);
  const toIndex = viewOrder.indexOf(to);

  if (toIndex > fromIndex) return 'left';  // Forward navigation
  if (toIndex < fromIndex) return 'right'; // Back navigation
  return 'none';
}

/**
 * Framer Motion variants for view transitions
 */
export const viewTransitionVariants = {
  initial: (direction: 'left' | 'right') => ({
    x: direction === 'left' ? 300 : -300,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 'left' | 'right') => ({
    x: direction === 'left' ? -300 : 300,
    opacity: 0,
  }),
};

export default useNavigation;