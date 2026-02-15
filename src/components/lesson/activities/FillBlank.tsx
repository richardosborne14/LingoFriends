/**
 * LingoFriends - Fill in the Blank Activity Component
 * 
 * Displays a sentence with a missing word that the user must fill in.
 * Text input with check button, hint support, and retry functionality.
 * 
 * @module FillBlank
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ActivityConfig } from '../../../types/game';
import { calculateEarned } from '../../../services/sunDropService';
import { SunDropIcon } from './ActivityWrapper';

// ============================================
// TYPES
// ============================================

export interface FillBlankProps {
  /** Activity configuration */
  data: ActivityConfig;
  /** Hint text for help button */
  helpText: string;
  /** Callback when activity is completed correctly */
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  /** Callback when wrong answer is given (for penalty) */
  onWrong: () => void;
}

interface FillBlankState {
  /** Current input value */
  inputValue: string;
  /** Whether the answer state: null = pending, true = correct, false = wrong */
  isCorrect: boolean | null;
  /** Whether activity is complete */
  isComplete: boolean;
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

const shakeVariants = {
  shake: {
    x: [0, -5, 5, -3, 3, 0],
    transition: { duration: 0.4 },
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * FillBlank - Complete the sentence with the missing word.
 * 
 * Behavior:
 * - Display sentence with ___ placeholder
 * - Text input for answer (auto-focused)
 * - "Check" button to submit
 * - Hint text below if provided
 * - Correct: Call onComplete()
 * - Wrong: Show "Not quite!", reveal correct answer, allow retry
 * 
 * @example
 * <FillBlank
 *   data={{
 *     type: GameActivityType.FILL_BLANK,
 *     sentence: "Je ___ français.",
 *     correctAnswer: "parle",
 *     hint: "to speak = parler",
 *     sunDrops: 3,
 *   }}
 *   helpText="What form of the verb?"
 *   onComplete={(correct, drops) => console.log(correct, drops)}
 *   onWrong={() => console.log('Wrong!')}
 * />
 */
export const FillBlank: React.FC<FillBlankProps> = ({
  data,
  helpText,
  onComplete,
  onWrong,
}) => {
  // Validate required fields
  if (!data.sentence || !data.correctAnswer) {
    console.error('FillBlank: Missing required fields', data);
    return (
      <div className="p-4 text-red-500">
        Error: Missing activity data
      </div>
    );
  }

  const inputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<FillBlankState>({
    inputValue: '',
    isCorrect: null,
    isComplete: false,
    attempts: 0,
    usedHelp: false,
    showHelp: false,
  });

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Check the answer.
   * Case-insensitive comparison with trimmed input.
   */
  const handleCheck = useCallback(() => {
    if (state.isComplete || !state.inputValue.trim()) return;

    const userAnswer = state.inputValue.trim().toLowerCase();
    const correctAnswer = data.correctAnswer!.toLowerCase();

    if (userAnswer === correctAnswer) {
      // Correct answer
      const earned = calculateEarned(
        data.sunDrops,
        state.attempts > 0,
        state.usedHelp,
        0
      );

      setState(prev => ({
        ...prev,
        isCorrect: true,
        isComplete: true,
      }));

      setTimeout(() => {
        onComplete(true, earned);
      }, 900);
    } else {
      // Wrong answer
      setState(prev => ({
        ...prev,
        isCorrect: false,
        attempts: prev.attempts + 1,
      }));

      onWrong();
    }
  }, [state.isComplete, state.inputValue, state.attempts, state.usedHelp, data.correctAnswer, data.sunDrops, onComplete, onWrong]);

  /**
   * Handle retry after wrong answer.
   */
  const handleRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      inputValue: '',
      isCorrect: null,
    }));
    
    // Focus input after a brief delay
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  /**
   * Handle Enter key press.
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (state.isCorrect === false) {
        handleRetry();
      } else {
        handleCheck();
      }
    }
  }, [state.isCorrect, handleCheck, handleRetry]);

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

  // Split sentence for display
  const parts = data.sentence.split('___');
  const reduced = state.usedHelp || state.attempts > 0;

  // Determine input styling based on state
  const getInputStyle = (): string => {
    const baseStyle = 'border-b-3 outline-none bg-transparent text-center font-bold text-lg px-2 py-1 transition-colors';
    
    if (state.isComplete && state.isCorrect) {
      return `${baseStyle} border-green-500 bg-green-100 text-green-800 rounded-lg`;
    }
    if (state.isCorrect === false) {
      return `${baseStyle} border-red-400 bg-red-50 text-red-600 rounded-lg`;
    }
    return `${baseStyle} border-green-400 bg-green-50 text-slate-800 rounded-lg`;
  };

  return (
    <div className="bg-[#FCFFFE] rounded-2xl p-4 border-2 border-green-200 shadow-sm">
      {/* Header */}
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

      {/* Title */}
      <p className="font-bold text-lg text-slate-800 mb-1">Complete:</p>
      
      {/* Hint if provided */}
      {data.hint && (
        <p className="text-xs text-slate-400 mb-3 font-semibold">
          💡 {data.hint}
        </p>
      )}

      {/* Sentence with blank */}
      <motion.div
        className="text-lg font-semibold text-slate-800 leading-relaxed flex items-center flex-wrap gap-1"
        variants={state.isCorrect === false ? shakeVariants : undefined}
        animate={state.isCorrect === false ? 'shake' : undefined}
      >
        <span>{parts[0]}</span>
        <input
          ref={inputRef}
          type="text"
          value={state.inputValue}
          onChange={(e) => {
            setState(prev => ({
              ...prev,
              inputValue: e.target.value,
              isCorrect: prev.isCorrect === false ? null : prev.isCorrect,
            }));
          }}
          onKeyDown={handleKeyDown}
          disabled={state.isComplete}
          placeholder="?"
          className={getInputStyle()}
          style={{
            minWidth: '100px',
            width: `${Math.max(100, state.inputValue.length * 12 + 40)}px`,
          }}
        />
        {parts[1] && <span>{parts[1]}</span>}
      </motion.div>

      {/* Wrong answer feedback */}
      {state.isCorrect === false && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-bold text-sm text-red-500 mt-3"
        >
          Not quite! 💪
        </motion.p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        {state.isCorrect === null && !state.isComplete && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCheck}
            disabled={!state.inputValue.trim()}
            className="bg-[#58CC02] text-white px-6 py-3 rounded-2xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ boxShadow: '0 4px 0 0 rgba(88, 204, 2, 0.3)' }}
          >
            Check ✓
          </motion.button>
        )}
        
        {state.isCorrect === false && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRetry}
            className="bg-[#FB923C] text-white px-6 py-3 rounded-2xl font-bold text-base"
            style={{ boxShadow: '0 4px 0 0 rgba(251, 146, 60, 0.3)' }}
          >
            Retry 🔄
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default FillBlank;