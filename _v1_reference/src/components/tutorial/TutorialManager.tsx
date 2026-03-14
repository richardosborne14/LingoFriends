/**
 * TutorialManager — Tutorial State Machine & Context
 *
 * Controls the first-run tutorial for new users. Steps guide kids from:
 *   Welcome → Garden explanation → Header stats → Tree tap → Shop → Complete
 *
 * Persistence strategy:
 *   1. localStorage for immediate fast check (prevents flash on reload)
 *   2. PocketBase profile.tutorialComplete for cross-device sync
 *   Both are written simultaneously when the tutorial completes or is skipped.
 *
 * Usage:
 *   <TutorialProvider>
 *     <App />
 *   </TutorialProvider>
 *
 *   // Inside any component:
 *   const { isActive, currentStep, nextStep, skipTutorial } = useTutorial();
 *
 * @module TutorialManager
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { pb, isAuthenticated } from '../../../services/pocketbaseService';

// ============================================
// TYPES
// ============================================

/**
 * All possible tutorial steps in display order.
 * 'idle' means the tutorial hasn't started or has been dismissed.
 */
export type TutorialStep =
  | 'idle'
  | 'welcome'
  | 'garden_intro'
  | 'header_stats'
  | 'tap_tree'
  | 'shop_intro'
  | 'complete';

interface TutorialContextValue {
  /** Whether the tutorial is currently showing */
  isActive: boolean;
  /** Currently active step */
  currentStep: TutorialStep;
  /** Advance to the next step */
  nextStep: () => void;
  /** User tapped "Skip" — dismiss immediately and mark complete */
  skipTutorial: () => void;
  /** Force-start tutorial (e.g. from Settings → "Replay tutorial") */
  startTutorial: () => void;
  /**
   * Call this when the user completes their very first lesson.
   * Sets the `lf_first_lesson_done` flag. Tutorial starts later when
   * GardenReveal dismisses via startTutorialIfPending().
   */
  onFirstLessonComplete: () => void;
  /**
   * Start the tutorial after GardenReveal dismisses.
   * Only starts if first lesson is done and tutorial not yet complete.
   */
  startTutorialIfPending: () => void;
}

// ============================================
// CONSTANTS
// ============================================

/** localStorage key for fast first-paint check */
const LS_KEY = 'lf_tutorial_complete';

/**
 * localStorage key that gates the tutorial on first lesson completion.
 * Tutorial only fires AFTER the user has returned from their first ever lesson —
 * at that point the garden context is meaningful and the "well done" intro makes sense.
 */
const LS_FIRST_LESSON_KEY = 'lf_first_lesson_done';

/** Ordered steps the user walks through */
const TUTORIAL_STEPS: TutorialStep[] = [
  'welcome',
  'garden_intro',
  'header_stats',
  'tap_tree',
  'shop_intro',
  'complete',
];

// ============================================
// CONTEXT
// ============================================

const TutorialContext = createContext<TutorialContextValue | null>(null);

// ============================================
// HELPERS
// ============================================

/**
 * Mark tutorial complete in both localStorage and PocketBase profile.
 * Non-fatal — if PB fails, localStorage still suppresses re-showing.
 *
 * IMPORTANT: The profiles collection has its OWN record ID separate from the
 * auth user ID. We must query by `user` relation field, not use getOne(userId).
 */
async function persistComplete(): Promise<void> {
  localStorage.setItem(LS_KEY, 'true');

  if (isAuthenticated()) {
    try {
      const userId = pb.authStore.record?.id;
      if (!userId) return;

      // Look up the profile record ID via the `user` relation filter
      const records = await pb.collection('profiles').getList(1, 1, {
        filter: `user = "${userId}"`,
        fields: 'id',
      });
      if (records.items.length === 0) return; // Profile not created yet — localStorage covers this

      await pb.collection('profiles').update(records.items[0].id, { tutorialComplete: true });
    } catch (err) {
      // Non-fatal — tutorial won't show again because of localStorage
      console.warn('[Tutorial] Failed to save tutorialComplete to PB:', err);
    }
  }
}

// ============================================
// PROVIDER
// ============================================

interface TutorialProviderProps {
  children: ReactNode;
}

/**
 * Provides tutorial state to the entire app.
 *
 * Wrap around the root App component, outside of routing:
 * ```tsx
 * <TutorialProvider>
 *   <App />
 * </TutorialProvider>
 * ```
 */
export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<TutorialStep>('idle');

  // On mount: check if the user needs the tutorial.
  // We check localStorage first (fast, no async) then PB for cross-device sync.
  // GATE: tutorial only fires AFTER the user's first lesson is complete
  // (LS_FIRST_LESSON_KEY must be set). This ensures the garden tour is contextually
  // meaningful — they've seen a lesson and now need to learn how to navigate.
  useEffect(() => {
    const locallyComplete = localStorage.getItem(LS_KEY) === 'true';
    if (locallyComplete) return;

    // If first lesson hasn't happened yet, do nothing — onFirstLessonComplete will trigger.
    const firstLessonDone = localStorage.getItem(LS_FIRST_LESSON_KEY) === 'true';
    if (!firstLessonDone) return;

    // Check PB profile for tutorialComplete flag (cross-device).
    // IMPORTANT: profiles have their own record ID — query by `user` relation,
    // not getOne(userId) which would try to find a record with the auth user's ID.
    const checkProfile = async () => {
      if (!isAuthenticated()) return;
      try {
        const userId = pb.authStore.record?.id;
        if (!userId) return;

        const records = await pb.collection('profiles').getList(1, 1, {
          filter: `user = "${userId}"`,
          fields: 'id,tutorialComplete',
        });

        if (records.items.length > 0 && records.items[0].tutorialComplete === true) {
          localStorage.setItem(LS_KEY, 'true');
          return;
        }
      } catch {
        // Ignore — if PB unreachable we still want to show tutorial
      }
      setCurrentStep('welcome');
      setIsActive(true);
    };

    checkProfile();
  }, []);

  /**
   * Move to the next tutorial step.
   * On the last step, auto-persists completion.
   */
  const nextStep = useCallback(async () => {
    const idx = TUTORIAL_STEPS.indexOf(currentStep);
    if (idx === -1) return;

    const nextIdx = idx + 1;
    if (nextIdx >= TUTORIAL_STEPS.length) {
      // Reached the end
      setIsActive(false);
      setCurrentStep('idle');
      await persistComplete();
      return;
    }

    const next = TUTORIAL_STEPS[nextIdx];
    if (next === 'complete') {
      // Show the "complete" step briefly then auto-dismiss
      setCurrentStep('complete');
      setTimeout(async () => {
        setIsActive(false);
        setCurrentStep('idle');
        await persistComplete();
      }, 2500);
    } else {
      setCurrentStep(next);
    }
  }, [currentStep]);

  /**
   * Immediately dismiss and mark complete.
   * Kids who tap "Skip" get a "Are you sure?" — nah, keep it simple.
   * If they skip, they skip. They can replay from Settings.
   */
  const skipTutorial = useCallback(async () => {
    setIsActive(false);
    setCurrentStep('idle');
    await persistComplete();
  }, []);

  /**
   * Force-start the tutorial — used by Settings "Replay tutorial" button.
   * Clears localStorage so it can also re-show on next session.
   */
  const startTutorial = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setCurrentStep('welcome');
    setIsActive(true);
  }, []);

  /**
   * Called when the user completes their very first lesson.
   * Marks first-lesson-done in localStorage so the tutorial gate passes.
   * Does NOT start the tutorial immediately — that happens after GardenReveal
   * dismisses, via startTutorialIfPending().
   * 
   * This separation ensures the GardenReveal celebration isn't blocked by
   * the tutorial overlay.
   */
  const onFirstLessonComplete = useCallback(() => {
    // Mark first lesson done — the useEffect gate now passes on future mounts
    localStorage.setItem(LS_FIRST_LESSON_KEY, 'true');
    // NOTE: Tutorial starts after GardenReveal dismisses, not here
  }, []);

  /**
   * Start the tutorial if the user has completed their first lesson
   * but hasn't seen the tutorial yet. Called from GardenReveal's onEnterGarden.
   * 
   * This ensures the tutorial appears AFTER the lesson complete celebration,
   * not during it.
   */
  const startTutorialIfPending = useCallback(() => {
    // If already completed the tutorial, do nothing
    const alreadyComplete = localStorage.getItem(LS_KEY) === 'true';
    if (alreadyComplete) return;

    // Only start if first lesson was completed
    const firstLessonDone = localStorage.getItem(LS_FIRST_LESSON_KEY) === 'true';
    if (!firstLessonDone) return;

    // Start the garden tour now — user has dismissed GardenReveal
    setCurrentStep('welcome');
    setIsActive(true);
  }, []);

  return (
    <TutorialContext.Provider value={{ isActive, currentStep, nextStep, skipTutorial, startTutorial, onFirstLessonComplete, startTutorialIfPending }}>
      {children}
    </TutorialContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

/**
 * Access tutorial state from any component.
 *
 * @throws if called outside of TutorialProvider
 */
export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useTutorial must be used inside <TutorialProvider>');
  }
  return ctx;
}
