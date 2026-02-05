/**
 * LingoFriends - Onboarding Container
 * 
 * Main controller for the onboarding flow.
 * Manages state, navigation, and final submission to Pocketbase.
 * 
 * Flow:
 * 1. Step 1: Native Language Selection (confirms from signup)
 * 2. Step 2: Target Subject Selection (what to learn)
 * 3. Step 3: Interests Selection (personalization)
 * 4. Complete: Celebration + Start Learning
 * 
 * @module onboarding/OnboardingContainer
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, Button } from '../ui';
import { StepIndicator } from './StepIndicator';
import { Step0DisplayName } from './Step0DisplayName';
import { Step1Language } from './Step1Language';
import { Step2Subject } from './Step2Subject';
import { Step3Interests } from './Step3Interests';
import { OnboardingComplete } from './OnboardingComplete';
import { getOnboardingTranslations } from './translations';
import type { NativeLanguage, TargetSubject, SubjectType } from '../../types';

// ============================================
// TYPES
// ============================================

export interface OnboardingContainerProps {
  /** User's initial native language (from signup) */
  initialNativeLanguage: NativeLanguage;
  /** User's initial display name (from signup) */
  initialDisplayName?: string;
  /** Called when onboarding completes successfully */
  onComplete: (data: OnboardingData) => Promise<void>;
}

export interface OnboardingData {
  displayName: string;
  nativeLanguage: NativeLanguage;
  subjectType: SubjectType;
  targetSubject: TargetSubject;
  selectedInterests: string[];
}

interface OnboardingState {
  currentStep: number;
  displayName: string;
  nativeLanguage: NativeLanguage | null;
  subjectType: SubjectType | null;
  targetSubject: TargetSubject | null;
  selectedInterests: string[];
}

// ============================================
// CONSTANTS
// ============================================

const TOTAL_STEPS = 3;

// Animation variants for step transitions
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

// ============================================
// COMPONENT
// ============================================

/**
 * Onboarding Container
 * 
 * Orchestrates the entire onboarding flow with smooth transitions
 * between steps. Handles state management and final submission.
 */
export function OnboardingContainer({ 
  initialNativeLanguage,
  initialDisplayName = '',
  onComplete,
}: OnboardingContainerProps) {
  // Determine if we need display name step (if name is empty or "Learner")
  const needsDisplayNameStep = !initialDisplayName || initialDisplayName === 'Learner';
  
  // Total steps includes display name step if needed
  const totalStepsWithName = needsDisplayNameStep ? 4 : 3;
  
  // State for tracking progress and selections
  const [state, setState] = useState<OnboardingState>({
    currentStep: needsDisplayNameStep ? 0 : 1, // Start at 0 if we need display name
    displayName: initialDisplayName || '',
    nativeLanguage: initialNativeLanguage,
    subjectType: null,
    targetSubject: null,
    selectedInterests: [],
  });

  // Track animation direction for transitions
  const [direction, setDirection] = useState(1);
  
  // Loading state for final submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get translations based on current native language
  const displayLanguage = state.nativeLanguage || 'English';
  const t = getOnboardingTranslations(displayLanguage);

  /**
   * Navigate to next step
   */
  const goNext = useCallback(() => {
    setDirection(1);
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS + 1), // +1 for complete screen
    }));
  }, []);

  /**
   * Navigate to previous step
   */
  const goBack = useCallback(() => {
    setDirection(-1);
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  /**
   * Update native language selection
   */
  const handleLanguageSelect = useCallback((language: NativeLanguage) => {
    setState(prev => ({
      ...prev,
      nativeLanguage: language,
    }));
  }, []);

  /**
   * Update subject selection
   */
  const handleSubjectSelect = useCallback((subject: TargetSubject, type: SubjectType) => {
    setState(prev => ({
      ...prev,
      targetSubject: subject,
      subjectType: type,
    }));
  }, []);

  /**
   * Update interests selection
   */
  const handleInterestsSelect = useCallback((interests: string[]) => {
    setState(prev => ({
      ...prev,
      selectedInterests: interests,
    }));
  }, []);

  /**
   * Update display name
   */
  const handleDisplayNameChange = useCallback((name: string) => {
    setState(prev => ({
      ...prev,
      displayName: name,
    }));
  }, []);

  /**
   * Handle final completion
   */
  const handleComplete = useCallback(async () => {
    if (!state.nativeLanguage || !state.targetSubject || !state.subjectType) {
      console.error('[Onboarding] Missing required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onComplete({
        displayName: state.displayName || 'Learner',
        nativeLanguage: state.nativeLanguage,
        subjectType: state.subjectType,
        targetSubject: state.targetSubject,
        selectedInterests: state.selectedInterests,
      });
    } catch (error) {
      console.error('[Onboarding] Error completing onboarding:', error);
      // Could show error toast here
    } finally {
      setIsSubmitting(false);
    }
  }, [state, onComplete]);

  /**
   * Check if current step can proceed to next
   */
  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case 0:
        return state.displayName.trim().length > 0;
      case 1:
        return state.nativeLanguage !== null;
      case 2:
        return state.targetSubject !== null && state.subjectType !== null;
      case 3:
        return true; // Interests are optional
      default:
        return false;
    }
  };

  /**
   * Render current step content
   */
  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <Step0DisplayName
            currentName={state.displayName}
            onNameChange={handleDisplayNameChange}
            displayLanguage={displayLanguage}
          />
        );
      case 1:
        return (
          <Step1Language
            selectedLanguage={state.nativeLanguage}
            onSelect={handleLanguageSelect}
            displayLanguage={displayLanguage}
          />
        );
      case 2:
        return (
          <Step2Subject
            nativeLanguage={state.nativeLanguage || 'English'}
            selectedSubject={state.targetSubject}
            onSelect={handleSubjectSelect}
            displayLanguage={displayLanguage}
          />
        );
      case 3:
        return (
          <Step3Interests
            selectedInterests={state.selectedInterests}
            onSelect={handleInterestsSelect}
            displayLanguage={displayLanguage}
          />
        );
      case 4:
        return (
          <OnboardingComplete
            displayLanguage={displayLanguage}
            targetSubject={state.targetSubject || 'English'}
            interestsCount={state.selectedInterests.length}
            onStart={handleComplete}
            isLoading={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-[#f0fdf4] via-white to-[#e0f2fe] flex flex-col overflow-hidden">
      {/* Header - fixed height */}
      <header className="flex-shrink-0 flex items-center justify-between p-3 md:p-4 border-b border-[#e5e5e5]/50">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-bold text-[#262626] hidden sm:inline">LingoFriends</span>
        </div>

        {/* Step indicator (not shown on complete screen) */}
        {state.currentStep <= TOTAL_STEPS && (
          <StepIndicator
            totalSteps={TOTAL_STEPS}
            currentStep={state.currentStep}
          />
        )}

        {/* Spacer for layout balance */}
        <div className="w-20" />
      </header>

      {/* Main Content - scrollable area with constrained height */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={state.currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full max-w-2xl"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation - fixed at bottom (not shown on complete screen) */}
      {state.currentStep <= TOTAL_STEPS && (
        <footer className="flex-shrink-0 p-4 md:p-6 flex justify-between items-center max-w-2xl mx-auto w-full border-t border-[#e5e5e5]/50 bg-white/80 backdrop-blur-sm">
          {/* Back Button */}
          {state.currentStep > 1 ? (
            <Button
              variant="secondary"
              onClick={goBack}
            >
              ← {t.back}
            </Button>
          ) : (
            <div /> // Spacer
          )}

          {/* Next/Skip Button */}
          <div className="flex gap-3">
            {/* Skip button for interests step */}
            {state.currentStep === 3 && state.selectedInterests.length === 0 && (
              <Button
                variant="secondary"
                onClick={goNext}
              >
                {t.skip} →
              </Button>
            )}

            {/* Next button */}
            <Button
              variant="primary"
              onClick={goNext}
              disabled={!canProceed()}
            >
              {state.currentStep === TOTAL_STEPS ? t.letsStart : t.next} →
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}

export default OnboardingContainer;
