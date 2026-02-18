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

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TutorBubble } from './TutorBubble';
import { SunDropBurst } from './SunDropBurst';
import { PenaltyBurst } from './PenaltyBurst';
import { SunDropCounter } from './SunDropCounter';
import { LessonComplete } from './LessonComplete';
import { ActivityRouter, ActivityProps } from './activities/ActivityRouter';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { LessonPlan, LessonStep } from '../../types/game';

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
}) => {
  // Track lesson state
  const [state, setState] = useState<LessonState>({
    currentStepIndex: 0,
    sunDropsEarned: 0,
    showReward: false,
    showPenalty: false,
    rewardAmount: 0,
    isComplete: false,
  });

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
  // HANDLERS
  // ============================================

  /**
   * Handle when activity is completed correctly.
   */
  const handleActivityComplete = useCallback((correct: boolean, sunDropsEarned: number) => {
    if (correct) {
      // Show reward animation
      setState(prev => ({
        ...prev,
        sunDropsEarned: prev.sunDropsEarned + sunDropsEarned,
        showReward: true,
        rewardAmount: sunDropsEarned,
      }));
    } else {
      // Show penalty animation
      setState(prev => ({
        ...prev,
        showPenalty: true,
      }));
    }
  }, []);

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
    });
  }, []);

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

        {/* Sun Drop counter */}
        <SunDropCounter 
          count={state.sunDropsEarned} 
          showGlow={state.showReward}
        />
      </div>

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