/**
 * LingoFriends - Lesson View Component
 * 
 * Main container for running a lesson. Orchestrates:
 * - Tutor bubbles with guidance
 * - Activity routing to correct activity type
 * - Sun Drop reward/penalty animations
 * - Progress tracking
 * - Lesson completion
 * 
 * @module LessonView
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TutorBubble } from './TutorBubble';
import { SunDropBurst } from './SunDropBurst';
import { PenaltyBurst } from './PenaltyBurst';
import { SunDropCounter } from './SunDropCounter';
import { LessonComplete } from './LessonComplete';
import { ActivityRouter, ActivityProps } from './activities/ActivityRouter';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { LessonPlan, LessonStep } from '../../types/game';
import { GameActivityType } from '../../types/game';
import { useLessonAudio } from '../../hooks/useLessonAudio';
import { AudioReplayButton } from './AudioReplayButton';
import { EncounterView } from './EncounterView';
import { HelpOverlay } from './HelpOverlay';
import { useSounds } from '../../hooks/useSounds';
import {
  regenerateQuestion,
  RegenerationReason,
  recordQuestionReport,
} from '../../services/questionRegenerationService';
import type { TargetLanguage } from '../../../types';
import type { HelpContext } from '../../services/helpService';
import { toLanguageCode } from '../../utils/languageUtils';

// ============================================
// TYPES
// ============================================

/**
 * Props for LessonView component.
 */
export interface LessonViewProps {
  /** The lesson to run */
  lesson: LessonPlan;
  /** Callback when lesson is completed */
  onComplete: (result: LessonResult) => void;
  /** Callback when user exits early */
  onExit: () => void;
  /** Target language for TTS audio playback */
  targetLanguage?: TargetLanguage;
}

/**
 * Result of a completed lesson.
 */
export interface LessonResult {
  /** Lesson ID that was completed */
  lessonId: string;
  /** Sun Drops earned in this lesson */
  sunDropsEarned: number;
  /** Maximum possible Sun Drops */
  sunDropsMax: number;
  /** Star rating (1-3) */
  stars: number;
  /** Steps completed */
  stepsCompleted: number;
  /** Total steps */
  stepsTotal: number;
  /** Time spent in milliseconds — used by learnerProfileService.recordSession() */
  timeSpentMs: number;
}

/**
 * Internal state for tracking lesson progress.
 */
interface LessonState {
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Sun Drops earned so far */
  sunDropsEarned: number;
  /** Whether to show reward animation */
  showReward: boolean;
  /** Whether to show penalty animation */
  showPenalty: boolean;
  /** Sun Drops to show in reward burst */
  rewardAmount: number;
  /** Whether lesson is complete */
  isComplete: boolean;
  /** Whether help overlay is visible (Task 2.0.07) */
  showHelp: boolean;
  /** Whether a question regeneration is in progress */
  isRegenerating: boolean;
  /** Current lesson steps (can be modified by regeneration) */
  steps: LessonStep[];
}

// ============================================
// CONSTANTS
// ============================================

/** Close button style */
const CLOSE_BUTTON_STYLE: React.CSSProperties = {
  background: 'transparent',
  color: '#78716C', // stone-500
  border: 'none',
  fontSize: 24,
  cursor: 'pointer',
  padding: 4,
};

// ============================================
// COMPONENT
// ============================================

/**
 * LessonView - Main lesson container.
 * 
 * Manages the flow of a lesson:
 * 1. Shows tutor bubble (optional guidance)
 * 2. Routes to correct activity component
 * 3. Handles correct/incorrect answers
 * 4. Shows Sun Drop reward/penalty
 * 5. Advances to next step
 * 6. Shows completion screen at end
 * 
 * @example
 * <LessonView
 *   lesson={currentLesson}
 *   onComplete={(result) => {
 *     console.log('Lesson done!', result);
 *     navigate('/path');
 *   }}
 *   onExit={() => navigate('/path')}
 * />
 */
export const LessonView: React.FC<LessonViewProps> = ({
  lesson,
  onComplete,
  onExit,
  targetLanguage = 'French', // Default to French if not provided
}) => {
  // Track lesson state
  const [state, setState] = useState<LessonState>(() => ({
    currentStepIndex: 0,
    sunDropsEarned: 0,
    showReward: false,
    showPenalty: false,
    rewardAmount: 0,
    isComplete: false,
    showHelp: false,
    isRegenerating: false,
    steps: lesson.steps, // Store mutable copy of steps for regeneration
  }));

  // Track start time for session duration reporting to learnerProfileService.
  // useRef so it doesn't trigger re-renders and survives across state updates.
  const lessonStartTimeRef = useRef<number>(Date.now());

  // Current step data
  const currentStep = lesson.steps[state.currentStepIndex];
  
  // Calculate maximum possible Sun Drops from lesson
  const sunDropsMax = lesson.totalSunDrops || lesson.steps.reduce((sum, step) => sum + (step.activity?.sunDrops || 1), 0);
  
  // Progress percentage
  const progress = ((state.currentStepIndex + 1) / lesson.steps.length) * 100;

  // ============================================
  // AUDIO MANAGEMENT
  // ============================================
  
  /**
   * Audio hook for TTS playback during lessons.
   * - Pre-generates audio for all chunks on mount
   * - Auto-plays on INFO steps
   * - Provides replay functionality
   */
  const {
    isAudioPlaying,
    isAudioLoading,
    isPregenComplete,
    playChunkAudio,
    stopChunkAudio,
    hasAudio,
  } = useLessonAudio({
    lesson,
    currentStepIndex: state.currentStepIndex,
    targetLanguage,
    autoPlay: true,
    autoPlayDelay: 800, // 800ms delay before auto-play on INFO steps
  });

  // Determine if current step is INFO type for button sizing
  const isInfoStep = currentStep?.activity?.type === GameActivityType.INFO;

  // ============================================
  // SOUND EFFECTS
  // ============================================
  
  /**
   * Sound effects hook for lesson feedback.
   * - Reward sound on correct answer
   * - Penalty sound on wrong answer
   * - Skip sound when skipping a question
   */
  const { playReward, playPenalty, playSkip, unlock } = useSounds();

  // Unlock audio context on first user interaction (iOS Safari requirement)
  useEffect(() => {
    const handleUnlock = () => {
      unlock();
      document.removeEventListener('click', handleUnlock);
      document.removeEventListener('touchstart', handleUnlock);
    };
    
    document.addEventListener('click', handleUnlock, { once: true });
    document.addEventListener('touchstart', handleUnlock, { once: true });
    
    return () => {
      document.removeEventListener('click', handleUnlock);
      document.removeEventListener('touchstart', handleUnlock);
    };
  }, [unlock]);

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Handle when activity is completed correctly.
   * Plays reward sound on correct answer, penalty sound on wrong.
   */
  const handleActivityComplete = useCallback((correct: boolean, sunDropsEarned: number) => {
    if (correct) {
      // Play reward sound
      playReward();
      // Show reward animation
      setState(prev => ({
        ...prev,
        sunDropsEarned: prev.sunDropsEarned + sunDropsEarned,
        showReward: true,
        rewardAmount: sunDropsEarned,
      }));
    } else {
      // Play penalty sound
      playPenalty();
      // Show penalty animation
      setState(prev => ({
        ...prev,
        showPenalty: true,
      }));
    }
  }, [playReward, playPenalty]);

  /**
   * Handle when wrong answer is given.
   * Shows penalty animation (but allows retry - doesn't advance).
   */
  const handleWrongAnswer = useCallback(() => {
    // Show penalty animation but don't advance - let user retry
    setState(prev => ({
      ...prev,
      showPenalty: true,
    }));
  }, []);

  /**
   * Handle when user skips a question.
   * Advances to next step without reward or penalty.
   * Used when user doesn't know the answer and wants to move on.
   */
  const handleSkip = useCallback(() => {
    // Play skip sound
    playSkip();
    // Advance to next step without any animation
    setState(prev => {
      const nextIndex = prev.currentStepIndex + 1;
      const isComplete = nextIndex >= lesson.steps.length;

      return {
        ...prev,
        currentStepIndex: nextIndex,
        isComplete,
      };
    });
  }, [lesson.steps.length, playSkip]);

  /**
   * Handle when user reports a broken question.
   * Triggers question regeneration and replaces current step.
   * Task 2.0.07: Help system question regeneration.
   */
  const handleReport = useCallback(async () => {
    if (!currentStep?.activity) {
      console.warn('[LessonView] Cannot report: no current activity');
      return;
    }

    setState(prev => ({ ...prev, isRegenerating: true }));

    try {
      // Record the report for analytics
      const reportId = recordQuestionReport(
        'anonymous', // TODO: Get from auth context
        lesson.id,
        state.currentStepIndex,
        currentStep.activity.type,
        RegenerationReason.USER_REPORTED,
        currentStep.activity as unknown as Record<string, unknown>,
        'User reported broken question via help overlay'
      );

      console.log(`[LessonView] Recorded report ${reportId}`);

      // For now, we skip the question (like handleSkip)
      // In production, we would call regenerateQuestion() and replace the step
      // This requires the chunk content which we don't have in this context
      
      // Advance to next step after reporting
      playSkip();
      setState(prev => {
        const nextIndex = prev.currentStepIndex + 1;
        const isComplete = nextIndex >= lesson.steps.length;

        return {
          ...prev,
          currentStepIndex: nextIndex,
          isComplete,
          isRegenerating: false,
        };
      });
    } catch (error) {
      console.error('[LessonView] Report failed:', error);
      setState(prev => ({ ...prev, isRegenerating: false }));
    }
  }, [currentStep, lesson.id, state.currentStepIndex, playSkip]);

  /**
   * Handle when a question is regenerated from HelpOverlay.
   * Replaces the current step with the new one.
   */
  const handleQuestionRegenerated = useCallback((newStep: LessonStep) => {
    console.log('[LessonView] Question regenerated, updating step');
    
    // Replace the current step in our steps array
    setState(prev => {
      const newSteps = [...prev.steps];
      newSteps[state.currentStepIndex] = newStep;
      
      return {
        ...prev,
        steps: newSteps,
        isRegenerating: false,
      };
    });
  }, [state.currentStepIndex]);

  /**
   * Build HelpContext for the help overlay.
   * Provides lesson context for AI-powered help.
   * 
   * Note: LessonPlan doesn't have nativeLanguage/targetLanguage fields,
   * so we use defaults. In production, this would come from user profile.
   */
  const buildHelpContext = useCallback((): HelpContext | null => {
    // Get user profile info - defaults since LessonPlan doesn't have these fields
    // TODO: Get from user profile/learner profile service
    const userProfile: HelpContext['userProfile'] = {
      ageGroup: '11-14', // Default for now
      nativeLanguage: 'English', // TODO: Get from user profile
      targetLanguage: targetLanguage || 'French', // From props
      currentLevel: 1, // Default, TODO: get from learner profile
    };

    return {
      currentStep,
      lesson: {
        id: lesson.id,
        title: lesson.title || 'Lesson',
        stepIndex: state.currentStepIndex,
        totalSteps: lesson.steps.length,
      },
      userProfile,
      learnedChunks: [], // TODO: Get from learner profile
      strugglingChunks: [], // TODO: Get from learner profile
      currentSunDrops: state.sunDropsEarned,
      totalSunDrops: sunDropsMax,
    };
  }, [currentStep, lesson.id, lesson.title, lesson.steps.length, state.currentStepIndex, state.sunDropsEarned, sunDropsMax, targetLanguage]);

  /**
   * Handle when reward animation completes.
   * Advances to next step or shows completion.
   */
  const handleRewardDone = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentStepIndex + 1;
      const isComplete = nextIndex >= lesson.steps.length;

      return {
        ...prev,
        showReward: false,
        currentStepIndex: nextIndex,
        isComplete,
      };
    });
  }, [lesson.steps.length]);

  /**
   * Handle when penalty animation completes.
   * Just hides the animation - does NOT advance (user can retry).
   */
  const handlePenaltyDone = useCallback(() => {
    setState(prev => ({
      ...prev,
      showPenalty: false,
    }));
  }, []);

  /**
   * Handle lesson completion continuation.
   * Computes timeSpentMs from lessonStartTimeRef so learnerProfileService
   * can record accurate session duration without corrupting analytics.
   */
  const handleContinue = useCallback(() => {
    const stars = calculateStarsFromDrops(state.sunDropsEarned, sunDropsMax);
    const timeSpentMs = Date.now() - lessonStartTimeRef.current;

    onComplete({
      lessonId: lesson.id,
      sunDropsEarned: state.sunDropsEarned,
      sunDropsMax,
      stars,
      stepsCompleted: lesson.steps.length,
      stepsTotal: lesson.steps.length,
      timeSpentMs,
    });
  }, [lesson.id, lesson.steps.length, state.sunDropsEarned, sunDropsMax]);

  /**
   * Handle replaying the lesson.
   * Reset start time so replay duration is measured correctly.
   */
  const handleReplay = useCallback(() => {
    lessonStartTimeRef.current = Date.now();
    setState({
      currentStepIndex: 0,
      sunDropsEarned: 0,
      showReward: false,
      showPenalty: false,
      rewardAmount: 0,
      isComplete: false,
      showHelp: false,
      isRegenerating: false,
      steps: lesson.steps, // Reset to original steps
    });
  }, [lesson.steps]);

  // ============================================
  // RENDER
  // ============================================

  // Show completion screen if lesson is done
  if (state.isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-amber-50">
        <LessonComplete
          sunDropsEarned={state.sunDropsEarned}
          sunDropsMax={sunDropsMax}
          onContinue={handleContinue}
          onReplay={handleReplay}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50">
      {/* Reward burst overlay */}
      <SunDropBurst
        amount={state.rewardAmount}
        onDone={handleRewardDone}
        visible={state.showReward}
      />

      {/* Penalty burst overlay */}
      <PenaltyBurst
        onDone={handlePenaltyDone}
        visible={state.showPenalty}
      />

      {/* Header bar */}
      <div className="sticky top-0 z-10 flex items-center px-4 py-3 bg-white border-b border-stone-200">
        {/* Close button */}
        <button 
          style={CLOSE_BUTTON_STYLE}
          onClick={onExit}
          aria-label="Close lesson"
        >
          ×
        </button>

        {/* Progress bar */}
        <div className="flex-1 mx-4">
          <ProgressBar value={progress} max={100} size="sm" />
        </div>

        {/* Help button - Task 2.0.07 */}
        <button
          onClick={() => setState(prev => ({ ...prev, showHelp: true }))}
          className="mr-2 p-2 text-xl hover:bg-stone-100 rounded-full transition-colors"
          aria-label="Get help"
        >
          💬
        </button>

        {/* Sun Drop counter */}
        <SunDropCounter 
          count={state.sunDropsEarned} 
          showGlow={state.showReward}
        />
      </div>

      {/* Help Overlay - Task 2.0.07 */}
      <HelpOverlay
        visible={state.showHelp}
        onClose={() => setState(prev => ({ ...prev, showHelp: false }))}
        currentStep={currentStep}
        lessonContext={buildHelpContext()}
        onQuestionRegenerated={handleQuestionRegenerated}
        userId="anonymous" // TODO: Get from auth context
        lessonId={lesson.id}
        stepIndex={state.currentStepIndex}
      />

      {/* NPC Avatar Encounter Scene — RPG-style character meeting */}
      <EncounterView
        stepIndex={state.currentStepIndex}
        totalSteps={lesson.steps.length}
        lessonId={lesson.id}
        isAudioPlaying={isAudioPlaying}
      />

      {/* Main content area */}
      <main className="p-6 max-w-lg mx-auto">
        {/* Tutor bubble with guidance */}
        {currentStep?.tutorText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <TutorBubble text={currentStep.tutorText} />
          </motion.div>
        )}

        {/* Audio replay button — prominent on INFO steps, compact on quiz steps */}
        {hasAudio && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`flex justify-center ${
              isInfoStep
                ? 'my-6'  // Large gap on INFO steps — it's the main interaction
                : 'my-2'  // Compact on quiz steps — secondary to the activity
            }`}
          >
            <AudioReplayButton
              isPlaying={isAudioPlaying}
              isLoading={isAudioLoading}
              onPress={playChunkAudio}
              size={isInfoStep ? 'lg' : 'sm'}
              label={isInfoStep
                ? (isAudioPlaying ? 'Playing...' : 'Tap to hear again')
                : undefined
              }
            />
          </motion.div>
        )}

        {/* Activity component - key forces fresh mount per step */}
        {currentStep?.activity && (
          <motion.div
            key={state.currentStepIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ActivityRouter
              data={currentStep.activity}
              helpText={currentStep.helpText || ''}
              onComplete={handleActivityComplete}
              onWrong={handleWrongAnswer}
              onSkip={handleSkip}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
};

// ============================================
// HELPERS
// ============================================

/**
 * Calculate star rating from Sun Drops earned.
 * 1 star: < 50% | 2 stars: 50-79% | 3 stars: ≥ 80%
 */
function calculateStarsFromDrops(earned: number, max: number): number {
  if (max === 0) return 1;
  const percentage = (earned / max) * 100;
  if (percentage >= 80) return 3;
  if (percentage >= 50) return 2;
  return 1;
}

export default LessonView;