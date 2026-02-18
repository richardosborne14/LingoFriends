/**
 * useLesson Hook
 * 
 * Manages lesson state and progress through activities.
 * Handles lesson loading, step progression, and completion.
 * 
 * Features:
 * - Load lesson plans from service
 * - Track current step and progress
 * - Handle activity results and Sun Drop rewards
 * - Calculate stars and completion stats
 * 
 * @module useLesson
 * @see docs/phase-1.1/task-1-1-8-garden-state.md
 */

import { useState, useEffect, useCallback } from 'react';
import { generateLessonPlan, canGenerateLessonPlan } from '../services/lessonPlanService';
import type { 
  SkillPathLesson, 
  LessonPlan, 
  LessonStep,
  LessonStatus,
  ActivityConfig,
} from '../types/game';

// ============================================
// TYPES
// ============================================

/**
 * Return type for useLesson hook
 */
export interface UseLessonReturn {
  // State
  /** Current lesson plan */
  lessonPlan: LessonPlan | null;
  /** Current step index */
  currentStepIndex: number;
  /** Current step */
  currentStep: LessonStep | null;
  /** Total steps in lesson */
  totalSteps: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Sun Drops earned in this lesson */
  sunDropsEarned: number;
  /** Sun Drops available in lesson */
  sunDropsMax: number;
  /** Correct answers count */
  correctAnswers: number;
  /** Wrong answers count */
  wrongAnswers: number;
  /** Whether lesson is loading */
  isLoading: boolean;
  /** Whether lesson is complete */
  isComplete: boolean;
  /** Any error */
  error: string | null;

  // Actions
  /** Load a lesson for a SkillPathLesson */
  loadLesson: (lesson: SkillPathLesson) => Promise<void>;
  /** Submit an answer for current activity */
  submitAnswer: (answer: AnswerSubmission) => Promise<ActivityResult>;
  /** Move to next step */
  nextStep: () => void;
  /** Go to previous step (for review) */
  previousStep: () => void;
  /** Reset lesson to start */
  resetLesson: () => void;
  /** End lesson and get summary */
  endLesson: () => LessonSummary;
  /** Clear error */
  clearError: () => void;
}

/**
 * Answer submission for an activity
 */
export interface AnswerSubmission {
  /** The user's answer (index for multiple choice, text for fill-blank) */
  answer: string | number | boolean;
  /** Time taken in milliseconds */
  timeMs?: number;
  /** Whether help was used */
  usedHelp?: boolean;
  /** Number of retry attempts */
  retryAttempt?: number;
}

/**
 * Result of submitting an answer
 */
export interface ActivityResult {
  /** Whether answer was correct */
  isCorrect: boolean;
  /** Sun Drops earned */
  sunDrops: number;
  /** Feedback message */
  feedback: string;
  /** Correct answer (for wrong answers) */
  correctAnswer?: string | number;
}

/**
 * Lesson completion summary
 */
export interface LessonSummary {
  /** Lesson ID */
  lessonId: string;
  /** Star rating (1-3) */
  stars: number;
  /** Sun Drops earned */
  sunDropsEarned: number;
  /** Sun Drops max */
  sunDropsMax: number;
  /** Perfect score achieved */
  isPerfect: boolean;
  /** Correct answers */
  correctAnswers: number;
  /** Wrong answers */
  wrongAnswers: number;
  /** Total steps */
  totalSteps: number;
  /** Time spent in ms */
  timeSpentMs: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Feedback messages for correct answers */
const CORRECT_FEEDBACK = [
  'Great job! 🎉',
  'Awesome! ⭐',
  'You got it! 🌟',
  'Perfect! 💫',
  'Excellent! 🏆',
  'Way to go! 🚀',
  'Fantastic! 👏',
  'Brilliant! 🌈',
];

/** Feedback messages for wrong answers */
const WRONG_FEEDBACK = [
  'Not quite, but you\'re learning! 💪',
  'Almost! Keep trying! 🌱',
  'Good effort! Practice makes perfect! 🎯',
  'Don\'t worry, you\'ll get it next time! 🌟',
];

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for managing lesson state
 * 
 * @example
 * const {
 *   lessonPlan,
 *   currentStep,
 *   loadLesson,
 *   submitAnswer,
 *   progress,
 * } = useLesson();
 * 
 * // Load lesson
 * await loadLesson(skillPathLesson);
 * 
 * // Submit answer
 * const result = await submitAnswer({ answer: 'Hola' });
 * if (result.isCorrect) {
 *   nextStep();
 * }
 */
export function useLesson(): UseLessonReturn {
  // Lesson state
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  
  // Progress tracking
  const [sunDropsEarned, setSunDropsEarned] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [wrongAnswers, setWrongAnswers] = useState<number>(0);
  
  // Status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Timing — initialized to Date.now() so endLesson() always produces a valid
  // timeSpentMs even if loadLesson() is never called (e.g. lesson passed as prop).
  const [lessonStartTime, setLessonStartTime] = useState<number>(Date.now());

  // ==========================================
  // Derived State
  // ==========================================

  const currentStep = lessonPlan?.steps[currentStepIndex] ?? null;
  const totalSteps = lessonPlan?.steps.length ?? 0;
  const progress = totalSteps > 0 
    ? Math.round((currentStepIndex / totalSteps) * 100) 
    : 0;
  const sunDropsMax = lessonPlan?.totalSunDrops ?? 0;

  // ==========================================
  // Actions
  // ==========================================

  /**
   * Load a lesson for a SkillPathLesson
   */
  const loadLesson = useCallback(async (lesson: SkillPathLesson): Promise<void> => {
    if (!canGenerateLessonPlan(lesson)) {
      setError('This lesson is locked or unavailable.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Generate lesson plan
      const plan = await generateLessonPlan({ lesson });
      
      setLessonPlan(plan);
      setCurrentStepIndex(0);
      setSunDropsEarned(0);
      setCorrectAnswers(0);
      setWrongAnswers(0);
      setIsComplete(false);
      setLessonStartTime(Date.now());
      
    } catch (err) {
      console.error('[useLesson] Failed to load lesson:', err);
      setError('Couldn\'t load your lesson. Let\'s try again!');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Submit an answer for the current activity
   */
  const submitAnswer = useCallback(async (submission: AnswerSubmission): Promise<ActivityResult> => {
    if (!currentStep) {
      return {
        isCorrect: false,
        sunDrops: 0,
        feedback: 'No activity to check',
      };
    }

    const activity = currentStep.activity;
    const isCorrect = checkAnswer(activity, submission.answer);
    
    // Calculate Sun Drops (less for retries/help)
    let sunDrops = activity.sunDrops;
    if (submission.retryAttempt && submission.retryAttempt > 0) {
      // 20% reduction per retry
      sunDrops = Math.round(sunDrops * Math.pow(0.8, submission.retryAttempt));
    }
    if (submission.usedHelp) {
      // 50% reduction for help
      sunDrops = Math.round(sunDrops * 0.5);
    }
    
    // Update stats
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setSunDropsEarned(prev => prev + sunDrops);
    } else {
      setWrongAnswers(prev => prev + 1);
      sunDrops = 0; // No drops for wrong answers
    }

    // Generate feedback
    const feedback = getRandomFeedback(isCorrect);
    
    // Get correct answer for wrong responses
    let correctAnswer: string | number | undefined;
    if (!isCorrect) {
      if (activity.type === 'multiple_choice') {
        correctAnswer = activity.options[activity.correctIndex];
      } else if (activity.type === 'true_false') {
        correctAnswer = activity.isTrue ? 'True' : 'False';
      } else if (activity.type === 'fill_blank') {
        correctAnswer = activity.correctAnswer;
      } else if (activity.type === 'translate') {
        correctAnswer = activity.acceptedAnswers[0];
      }
    }

    return {
      isCorrect,
      sunDrops,
      feedback,
      correctAnswer,
    };
  }, [currentStep]);

  /**
   * Move to the next step
   */
  const nextStep = useCallback((): void => {
    if (!lessonPlan) return;
    
    const nextIndex = currentStepIndex + 1;
    
    if (nextIndex >= totalSteps) {
      // Lesson complete
      setIsComplete(true);
    } else {
      setCurrentStepIndex(nextIndex);
    }
  }, [lessonPlan, currentStepIndex, totalSteps]);

  /**
   * Go to previous step (for review only)
   */
  const previousStep = useCallback((): void => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  /**
   * Reset lesson to start
   */
  const resetLesson = useCallback((): void => {
    setCurrentStepIndex(0);
    setSunDropsEarned(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setIsComplete(false);
    setLessonStartTime(Date.now());
  }, []);

  /**
   * End lesson and get summary
   */
  const endLesson = useCallback((): LessonSummary => {
    const stars = calculateStars(sunDropsEarned, sunDropsMax);
    const isPerfect = sunDropsEarned === sunDropsMax;
    const timeSpentMs = Date.now() - lessonStartTime;
    
    return {
      lessonId: lessonPlan?.id ?? '',
      stars,
      sunDropsEarned,
      sunDropsMax,
      isPerfect,
      correctAnswers,
      wrongAnswers,
      totalSteps,
      timeSpentMs,
    };
  }, [lessonPlan, sunDropsEarned, sunDropsMax, correctAnswers, wrongAnswers, totalSteps, lessonStartTime]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // ==========================================
  // Return
  // ==========================================

  return {
    // State
    lessonPlan,
    currentStepIndex,
    currentStep,
    totalSteps,
    progress,
    sunDropsEarned,
    sunDropsMax,
    correctAnswers,
    wrongAnswers,
    isLoading,
    isComplete,
    error,

    // Actions
    loadLesson,
    submitAnswer,
    nextStep,
    previousStep,
    resetLesson,
    endLesson,
    clearError,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if an answer is correct for an activity
 */
function checkAnswer(activity: ActivityConfig, answer: string | number | boolean): boolean {
  switch (activity.type) {
    case 'multiple_choice':
      return typeof answer === 'number' && answer === activity.correctIndex;
      
    case 'true_false':
      return typeof answer === 'boolean' && answer === activity.isTrue;
      
    case 'fill_blank':
      if (typeof answer !== 'string') return false;
      return answer.toLowerCase().trim() === activity.correctAnswer.toLowerCase().trim();
      
    case 'translate':
      if (typeof answer !== 'string') return false;
      return activity.acceptedAnswers.some(
        accepted => answer.toLowerCase().trim() === accepted.toLowerCase().trim()
      );
      
    case 'word_arrange':
      if (typeof answer !== 'string') return false;
      // Normalize whitespace for comparison
      const normalizedAnswer = answer.toLowerCase().trim().replace(/\s+/g, ' ');
      const normalizedTarget = activity.targetSentence.toLowerCase().trim().replace(/\s+/g, ' ');
      return normalizedAnswer === normalizedTarget;
      
    default:
      return false;
  }
}

/**
 * Calculate star rating from Sun Drops
 */
function calculateStars(earned: number, max: number): number {
  if (max === 0) return 0;
  const percentage = (earned / max) * 100;
  
  if (percentage >= 90) return 3;
  if (percentage >= 60) return 2;
  return 1;
}

/**
 * Get random feedback message
 */
function getRandomFeedback(isCorrect: boolean): string {
  const messages = isCorrect ? CORRECT_FEEDBACK : WRONG_FEEDBACK;
  return messages[Math.floor(Math.random() * messages.length)];
}

export default useLesson;