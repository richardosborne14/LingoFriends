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
}

// ============================================
// CONSTANTS
// ============================================

/** localStorage key for fast first-paint check */
const LS_KEY = 'lf_tutorial_complete';

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
 */
async function persistComplete(): Promise<void> {
  localStorage.setItem(LS_KEY, 'true');

  if (isAuthenticated()) {
    try {
      const userId = pb.authStore.record?.id;
      if (userId) {
        await pb.collection('profiles').update(userId, { tutorialComplete: true });
      }
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
  useEffect(() => {
    const locallyComplete = localStorage.getItem(LS_KEY) === 'true';
    if (locallyComplete) return;

    // Check PB profile for tutorialComplete flag (cross-device)
    const checkProfile = async () => {
      if (!isAuthenticated()) {
        // Not logged in — defer until auth resolves
        return;
      }
      try {
        const userId = pb.authStore.record?.id;
        if (!userId) return;
        const profile = await pb.collection('profiles').getOne(userId, {
          // Fetch both fields: tutorialComplete is the definitive flag;
          // onboardingComplete is the fallback for users who existed before
          // the tutorialComplete field was added (pre-migration period).
          fields: 'tutorialComplete,onboardingComplete',
        });

        // tutorialComplete is the authoritative "seen tutorial" flag.
        // If null/false, the tutorial will show (correct for new users).
        // Run scripts/migrate-tutorial-field.cjs once to backfill existing users.
        if (profile.tutorialComplete === true) {
          localStorage.setItem(LS_KEY, 'true');
          return;
        }
      } catch {
        // Ignore — if PB unreachable we still want to show tutorial for new users
      }
      // Show tutorial
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

  return (
    <TutorialContext.Provider value={{ isActive, currentStep, nextStep, skipTutorial, startTutorial }}>
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
