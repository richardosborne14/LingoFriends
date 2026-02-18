/**
 * TutorialStep Component
 *
 * Thin wrapper that connects TutorialManager state to TutorialOverlay.
 * Renders only when its `step` matches the manager's `currentStep`.
 *
 * DOM targeting:
 *   Pass a CSS selector via `targetSelector` and TutorialStep will
 *   call `document.querySelector()` to find the element's DOMRect.
 *   Re-queries on window resize so the spotlight tracks rotated layouts.
 *
 * Self-contained steps:
 *   If `targetSelector` is omitted the overlay is centred with no spotlight
 *   (useful for 'welcome' and 'complete' steps).
 *
 * @module TutorialStep
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTutorial, type TutorialStep as StepType } from './TutorialManager';
import { TutorialOverlay } from './TutorialOverlay';

// ============================================
// PROPS
// ============================================

export interface TutorialStepProps {
  /** Which tutorial step this component handles */
  step: StepType;
  /** CSS selector for the element to spotlight (null = centred, no spotlight) */
  targetSelector?: string;
  /** Emoji icon shown at top of the tooltip card */
  icon?: string;
  /** Short headline */
  title: string;
  /** 1–2 sentence body text */
  description: string;
  /** Override the "Got it!" label */
  nextLabel?: string;
  /** Hide the "Skip tutorial" link on this step */
  hideSkip?: boolean;
  /** Extra content to render inside the card */
  children?: React.ReactNode;
}

// ============================================
// COMPONENT
// ============================================

/**
 * Renders an overlay for one specific tutorial step.
 * Drop as many of these as you need alongside your main UI — they self-manage visibility.
 *
 * @example
 * <TutorialStep
 *   step="garden_intro"
 *   targetSelector=".garden-world-3d"
 *   icon="🌳"
 *   title="This is your garden!"
 *   description="Each tree is a skill you're learning. Tap one to start."
 * />
 */
export const TutorialStep: React.FC<TutorialStepProps> = ({
  step,
  targetSelector,
  icon,
  title,
  description,
  nextLabel,
  hideSkip = false,
  children,
}) => {
  const { isActive, currentStep, nextStep, skipTutorial } = useTutorial();

  // Bounding rect of the spotlight target (null = no spotlight)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Prevent stale closure issues on resize
  const selectorRef = useRef(targetSelector);
  selectorRef.current = targetSelector;

  /**
   * Query the target element and update the stored rect.
   * Wrapped in useCallback so we can call it from both useEffect and resize.
   */
  const updateRect = useCallback(() => {
    const sel = selectorRef.current;
    if (!sel) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(sel);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      // Scroll into view if the element is off-screen
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setTargetRect(null);
    }
  }, []);

  // Recompute rect whenever this step becomes active
  useEffect(() => {
    if (!isActive || currentStep !== step) return;

    updateRect();

    // Re-query on resize (orientation change, keyboard slide-up, etc.)
    window.addEventListener('resize', updateRect, { passive: true });
    return () => window.removeEventListener('resize', updateRect);
  }, [isActive, currentStep, step, updateRect]);

  // Only render when this is the active step
  if (!isActive || currentStep !== step) return null;

  return (
    <TutorialOverlay
      targetRect={targetRect}
      icon={icon}
      title={title}
      description={description}
      nextLabel={nextLabel}
      onNext={nextStep}
      onSkip={hideSkip ? undefined : skipTutorial}
    >
      {children}
    </TutorialOverlay>
  );
};

export default TutorialStep;
