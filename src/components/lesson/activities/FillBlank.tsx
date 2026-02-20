/**
 * LingoFriends - Fill in the Blank Activity Component
 * 
 * Displays a sentence with a missing word that the user must fill in.
 * Text input with check button, hint support, retry functionality,
 * and give-up option after 3 attempts.
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
  /** Whether to show the answer (after give up) */
  showAnswer: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_ATTEMPTS = 3;

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
 * - After 3 wrong attempts: Show "Give Up" option
 * - Give Up reveals answer and allows continuation
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
      <div className="bg-[#FCFFFE] rounded-2xl p-4 border-2 border-red-200 shadow-sm">
        <div className="text-center">
          <span className="text-4xl">😅</span>
          <p className="text-red-600 font-medium mt-2">Oops! This question seems broken.</p>
          <p className="text-slate-500 text-sm mt-1">Let's skip to the next one.</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onComplete(true, 0)}
            className="mt-4 px-6 py-2 bg-green-500 text-white rounded-full font-bold text-sm hover:bg-green-600 transition"
          >
            Skip →
          </motion.button>
        </div>
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
    showAnswer: false,
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
    // Handle multiple accepted answers if available
    const acceptedAnswers = data.acceptedAnswers || [data.correctAnswer!];
    const isCorrect = acceptedAnswers.some(
      answer => answer.toLowerCase() === userAnswer
    );

    if (isCorrect) {
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
      const newAttempts = state.attempts + 1;
      setState(prev => ({
        ...prev,
        isCorrect: false,
        attempts: newAttempts,
      }));

      onWrong();
    }
  }, [state.isComplete, state.inputValue, state.attempts, state.usedHelp, data, onComplete, onWrong]);

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
   * Handle give up - show answer and continue.
   */
  const handleGiveUp = useCallback(() => {
    setState(prev => ({
      ...prev,
      showAnswer: true,
      isComplete: true,
    }));
    
    // Continue after showing answer
    setTimeout(() => {
      onComplete(false, 0);
    }, 2000);
  }, [onComplete]);

  /**
   * Skip this question entirely.
   */
  const handleSkip = useCallback(() => {
    onComplete(false, 0);
  }, [onComplete]);

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
  const canGiveUp = state.attempts >= MAX_ATTEMPTS && !state.isComplete;

  // Determine input styling based on state
  const getInputStyle = (): string => {
    const baseStyle = 'border-b-3 outline-none bg-transparent text-center font-bold text-lg px-2 py-1 transition-colors';
    
    if (state.showAnswer) {
      return `${baseStyle} border-amber-500 bg-amber-100 text-amber-800 rounded-lg`;
    }
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
        {/* Help button */}
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
          <div />
        )}
        
        {/* Attempt counter and sun drops */}
        <div className="flex items-center gap-2">
          {state.attempts > 0 && !state.isComplete && (
            <span className="text-xs text-slate-500">
              {state.attempts}/{MAX_ATTEMPTS} tries
            </span>
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
          value={state.showAnswer ? data.correctAnswer : state.inputValue}
          onChange={(e) => {
            if (!state.showAnswer) {
              setState(prev => ({
                ...prev,
                inputValue: e.target.value,
                isCorrect: prev.isCorrect === false ? null : prev.isCorrect,
              }));
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={state.isComplete || state.showAnswer}
          placeholder="?"
          className={getInputStyle()}
          style={{
            minWidth: '100px',
            width: `${Math.max(100, (state.showAnswer ? data.correctAnswer : state.inputValue).length * 12 + 40)}px`,
          }}
        />
        {parts[1] && <span>{parts[1]}</span>}
      </motion.div>

      {/* Wrong answer feedback */}
      {state.isCorrect === false && !canGiveUp && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-bold text-sm text-red-500 mt-3"
        >
          Not quite! {MAX_ATTEMPTS - state.attempts} tries left 💪
        </motion.p>
      )}

      {/* Give up option */}
      {canGiveUp && !state.showAnswer && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-amber-50 border-2 border-amber-200 rounded-xl"
        >
          <p className="font-bold text-sm text-amber-700 mb-2">
            Need help? The answer is: <span className="text-amber-900">{data.correctAnswer}</span>
          </p>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              className="px-4 py-2 bg-sky-500 text-white rounded-full font-bold text-sm hover:bg-sky-600 transition"
            >
              Try Again 🔄
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleGiveUp}
              className="px-4 py-2 bg-amber-500 text-white rounded-full font-bold text-sm hover:bg-amber-600 transition"
            >
              Got It, Continue →
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Show answer after give up */}
      {state.showAnswer && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-amber-50 border-2 border-amber-200 rounded-xl"
        >
          <p className="font-bold text-sm text-amber-700">
            ✓ The answer is: <span className="text-amber-900">{data.correctAnswer}</span>
          </p>
          <p className="text-xs text-amber-600 mt-1">Continuing...</p>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        {/* Check button */}
        {state.isCorrect === null && !state.isComplete && !state.showAnswer && (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCheck}
              disabled={!state.inputValue.trim()}
              className="bg-[#58CC02] text-white px-6 py-3 rounded-2xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ boxShadow: '0 4px 0 0 rgba(88, 204, 2, 0.3)' }}
            >
              Check ✓
            </motion.button>
            {/* Skip button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSkip}
              className="bg-slate-100 text-slate-500 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-slate-200 transition"
            >
              Skip
            </motion.button>
          </>
        )}
        
        {/* Retry button */}
        {state.isCorrect === false && !canGiveUp && (
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