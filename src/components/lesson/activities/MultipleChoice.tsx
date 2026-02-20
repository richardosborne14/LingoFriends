/**
 * LingoFriends - Multiple Choice Activity Component
 * 
 * Displays a question with 4 options in a 2x2 grid.
 * Handles correct/wrong feedback, retry logic, and Sun Drop rewards.
 * 
 * @module MultipleChoice
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ActivityConfig } from '../../../types/game';
import { calculateEarned } from '../../../services/sunDropService';
import { SunDropIcon } from './ActivityWrapper';

// ============================================
// TYPES
// ============================================

/**
 * Props for MultipleChoice activity.
 */
export interface MultipleChoiceProps {
  /** Activity configuration */
  data: ActivityConfig;
  /** Hint text for help button */
  helpText: string;
  /** Callback when activity is completed correctly */
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  /** Callback when wrong answer is given (for penalty) */
  onWrong: () => void;
}

/**
 * Internal state for the MultipleChoice activity.
 */
interface MultipleChoiceState {
  /** Index of selected option */
  selectedIndex: number | null;
  /** Whether activity is complete */
  isComplete: boolean;
  /** Whether the answer was correct */
  isCorrect: boolean | null;
  /** Number of wrong attempts */
  attempts: number;
  /** Whether help has been used */
  usedHelp: boolean;
  /** Whether help panel is showing */
  showHelp: boolean;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

/**
 * Shake animation for wrong answers.
 */
const shakeVariants = {
  shake: {
    x: [0, -5, 5, -3, 3, 0],
    transition: { duration: 0.4 },
  },
};

/**
 * Pop-in animation for appearing elements.
 */
const popVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 20 },
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * MultipleChoice - 4-option quiz activity.
 * 
 * Behavior:
 * - Displays question with 4 options in 2x2 grid
 * - Tap option to select
 * - Correct: Show ✅, animate, call onComplete()
 * - Wrong: Shake animation, red flash, call onWrong(), allow retry
 * - Help button shows helpText in a blue panel
 * - Half value on retry or after help
 * 
 * @example
 * <MultipleChoice
 *   data={{
 *     type: GameActivityType.MULTIPLE_CHOICE,
 *     question: "What is 'bonjour'?",
 *     options: ["Hello", "Goodbye", "Thanks", "Please"],
 *     correctIndex: 0,
 *     sunDrops: 2,
 *   }}
 *   helpText="'Bonjour' is a greeting!"
 *   onComplete={(correct, drops) => console.log(correct, drops)}
 *   onWrong={() => console.log('Wrong!')}
 * />
 */
export const MultipleChoice: React.FC<MultipleChoiceProps> = ({
  data,
  helpText,
  onComplete,
  onWrong,
}) => {
  // Validate required fields
  if (!data.question || !data.options || data.correctIndex === undefined) {
    console.error('MultipleChoice: Missing required fields', data);
    return (
      <div className="p-4 text-red-500">
        Error: Missing activity data
      </div>
    );
  }

  const [state, setState] = useState<MultipleChoiceState>({
    selectedIndex: null,
    isComplete: false,
    isCorrect: null,
    attempts: 0,
    usedHelp: false,
    showHelp: false,
  });

  /**
   * Handle option selection.
   * Validates answer, provides feedback, and manages Sun Drop calculation.
   */
  const handleSelect = useCallback((index: number) => {
    if (state.isComplete) return;
    
    const isCorrect = index === data.correctIndex;
    
    if (isCorrect) {
      // Calculate earned Sun Drops considering retries and help usage
      const earned = calculateEarned(
        data.sunDrops,
        state.attempts > 0, // isRetry
        state.usedHelp,
        0 // No additional penalty for correct answer
      );
      
      setState(prev => ({
        ...prev,
        selectedIndex: index,
        isComplete: true,
        isCorrect: true,
      }));
      
      // Delay to show the correct feedback before completing
      setTimeout(() => {
        onComplete(true, earned);
      }, 900);
    } else {
      // Wrong answer - increment attempts and notify parent
      setState(prev => ({
        ...prev,
        selectedIndex: index,
        isCorrect: false,
        attempts: prev.attempts + 1,
      }));
      
      onWrong();
      
      // Reset after showing wrong feedback
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          selectedIndex: null,
          isCorrect: null,
        }));
      }, 700);
    }
  }, [state.isComplete, state.attempts, state.usedHelp, data.correctIndex, data.sunDrops, onComplete, onWrong]);

  /**
   * Handle help button click.
   */
  const handleHelp = useCallback(() => {
    setState(prev => ({
      ...prev,
      showHelp: true,
      usedHelp: true,
    }));
  }, []);

  /**
   * Close help panel.
   */
  const handleCloseHelp = useCallback(() => {
    setState(prev => ({
      ...prev,
      showHelp: false,
    }));
  }, []);

  /**
   * Skip this question entirely.
   */
  const handleSkip = useCallback(() => {
    onComplete(false, 0);
  }, [onComplete]);

  /**
   * Determine option styling based on state.
   */
  const getOptionStyle = (index: number): string => {
    const baseStyle = 'w-full text-left p-3 rounded-xl border-2 transition-colors font-bold text-base';
    
    // Selected correct answer
    if (state.isComplete && index === state.selectedIndex && state.isCorrect) {
      return `${baseStyle} bg-green-100 border-green-500 text-green-800`;
    }
    
    // Selected wrong answer
    if (index === state.selectedIndex && state.isCorrect === false) {
      return `${baseStyle} bg-red-50 border-red-400 text-red-600`;
    }
    
    // Show correct answer after wrong (for learning)
    if (state.isComplete && index === data.correctIndex) {
      return `${baseStyle} bg-green-100 border-green-500 text-green-800`;
    }
    
    // Default state
    return `${baseStyle} bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 cursor-pointer`;
  };

  const reduced = state.usedHelp || state.attempts > 0;

  return (
    <div className="bg-[#FCFFFE] rounded-2xl p-4 border-2 border-green-200 shadow-sm">
      {/* Header with help button and Sun Drop indicator */}
      <div className="flex justify-between items-center mb-3">
        {/* Only show help button if helpText is available */}
        {helpText ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleHelp}
            disabled={state.usedHelp}
            className={`border-2 rounded-lg px-3 py-1.5 font-bold text-xs transition-colors ${
              state.usedHelp
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-sky-50 border-sky-200 text-sky-500 hover:bg-sky-100'
            }`}
          >
            💬 Help
          </motion.button>
        ) : (
          <div /> // Empty placeholder to maintain flex layout
        )}
        
        <span className="bg-amber-100 border border-amber-300 rounded-md px-2 py-1 font-extrabold text-xs text-amber-700 flex items-center gap-1">
          <SunDropIcon size={14} />
          <span>{reduced ? Math.ceil(data.sunDrops / 2) : data.sunDrops}</span>
          {reduced && (
            <span className="text-[10px] text-amber-600 font-medium ml-0.5">
              (retry)
            </span>
          )}
        </span>
      </div>

      {/* Help panel */}
      {state.showHelp && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="bg-sky-50 border-2 border-sky-200 rounded-xl p-3 mb-3 relative"
        >
          <div className="flex gap-2">
            <span className="text-lg flex-shrink-0">🐦</span>
            <p className="font-semibold text-sm text-slate-700 leading-relaxed flex-1">
              {helpText}
            </p>
          </div>
          <button
            onClick={handleCloseHelp}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close help"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Question */}
      <p className="font-bold text-lg text-slate-800 mb-3">
        {data.question}
      </p>

      {/* Options grid (2x2 on mobile) */}
      <div className="grid grid-cols-2 gap-2">
        {data.options.map((option, index) => {
          const isSelected = index === state.selectedIndex;
          const showCorrect = state.isComplete && index === data.correctIndex;
          const showWrong = isSelected && state.isCorrect === false;
          
          return (
            <motion.button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={state.isComplete}
              variants={showWrong ? shakeVariants : undefined}
              animate={showWrong ? 'shake' : undefined}
              whileTap={!state.isComplete ? { scale: 0.98 } : undefined}
              className={getOptionStyle(index)}
              style={{
                boxShadow: state.isComplete && showCorrect 
                  ? '0 2px 0 0 #22c55e' 
                  : '0 3px 0 0 #e2e8f0',
              }}
            >
              {showCorrect && '✅ '}
              {showWrong && '❌ '}
              {option}
            </motion.button>
          );
        })}
      </div>

      {/* Skip button */}
      {!state.isComplete && (
        <div className="flex justify-end mt-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSkip}
            className="bg-slate-100 text-slate-500 px-4 py-2 rounded-full font-bold text-sm hover:bg-slate-200 transition"
          >
            Skip
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default MultipleChoice;
