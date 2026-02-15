/**
 * LingoFriends - Translate Activity Component
 * 
 * Displays a source phrase and asks the user to translate it.
 * Text input with accepted alternatives support.
 * 
 * @module Translate
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ActivityConfig } from '../../../types/game';
import { calculateEarned } from '../../../services/sunDropService';
import { SunDropIcon } from './ActivityWrapper';

// ============================================
// TYPES
// ============================================

export interface TranslateProps {
  data: ActivityConfig;
  helpText: string;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onWrong: () => void;
}

interface TranslateState {
  inputValue: string;
  isCorrect: boolean | null;
  isComplete: boolean;
  attempts: number;
  usedHelp: boolean;
  showHelp: boolean;
  showCorrectAnswer: boolean;
}

// ============================================
// COMPONENT
// ============================================

/**
 * Translate - Translate the given phrase.
 * 
 * @example
 * <Translate
 *   data={{
 *     type: GameActivityType.TRANSLATE,
 *     sourcePhrase: "Good morning",
 *     correctAnswer: "bonjour",
 *     acceptedAnswers: ["bonjour", "salut"],
 *     sunDrops: 3,
 *   }}
 *   helpText="This is a common greeting"
 *   onComplete={...}
 *   onWrong={...}
 * />
 */
export const Translate: React.FC<TranslateProps> = ({
  data,
  helpText,
  onComplete,
  onWrong,
}) => {
  if (!data.sourcePhrase || !data.correctAnswer) {
    console.error('Translate: Missing required fields', data);
    return <div className="p-4 text-red-500">Error: Missing activity data</div>;
  }

  const inputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<TranslateState>({
    inputValue: '',
    isCorrect: null,
    isComplete: false,
    attempts: 0,
    usedHelp: false,
    showHelp: false,
    showCorrectAnswer: false,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Check if the answer is correct.
   * Compares against correctAnswer and acceptedAnswers.
   */
  const checkAnswer = useCallback((input: string): boolean => {
    const normalized = input.trim().toLowerCase();
    const correct = data.correctAnswer!.toLowerCase();
    
    if (normalized === correct) return true;
    
    // Check accepted alternatives
    if (data.acceptedAnswers) {
      return data.acceptedAnswers.some(
        alt => alt.toLowerCase() === normalized
      );
    }
    
    return false;
  }, [data.correctAnswer, data.acceptedAnswers]);

  const handleCheck = useCallback(() => {
    if (state.isComplete || !state.inputValue.trim()) return;

    const isCorrect = checkAnswer(state.inputValue);

    if (isCorrect) {
      const earned = calculateEarned(data.sunDrops, state.attempts > 0, state.usedHelp, 0);
      setState(prev => ({
        ...prev,
        isCorrect: true,
        isComplete: true,
      }));
      setTimeout(() => onComplete(true, earned), 900);
    } else {
      setState(prev => ({
        ...prev,
        isCorrect: false,
        attempts: prev.attempts + 1,
        showCorrectAnswer: prev.attempts >= 1, // Show answer after 2 wrong tries
      }));
      onWrong();
    }
  }, [state.isComplete, state.inputValue, state.attempts, state.usedHelp, checkAnswer, data.sunDrops, onComplete, onWrong]);

  const handleRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      inputValue: '',
      isCorrect: null,
    }));
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (state.isCorrect === false) {
        handleRetry();
      } else {
        handleCheck();
      }
    }
  }, [state.isCorrect, handleCheck, handleRetry]);

  const handleHelp = useCallback(() => {
    setState(prev => ({ ...prev, showHelp: true, usedHelp: true }));
  }, []);

  const handleCloseHelp = useCallback(() => {
    setState(prev => ({ ...prev, showHelp: false }));
  }, []);

  const reduced = state.usedHelp || state.attempts > 0;

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
          {reduced && <span className="text-[10px] text-amber-600 font-medium ml-0.5">(retry)</span>}
        </span>
      </div>

      {/* Help panel */}
      {state.showHelp && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-sky-50 border-2 border-sky-200 rounded-xl p-3 mb-3 relative"
        >
          <div className="flex gap-2">
            <span className="text-lg flex-shrink-0">🐦</span>
            <p className="font-semibold text-sm text-slate-700 leading-relaxed flex-1">{helpText}</p>
          </div>
          <button onClick={handleCloseHelp} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">✕</button>
        </motion.div>
      )}

      <p className="font-bold text-lg text-slate-800 mb-1">Translate:</p>

      {/* Source phrase */}
      <div className="bg-slate-100 rounded-xl p-3 mb-4">
        <p className="text-lg font-semibold text-slate-800 text-center">
          {data.sourcePhrase}
        </p>
        {data.hint && (
          <p className="text-xs text-slate-500 text-center mt-1">
            💡 {data.hint}
          </p>
        )}
      </div>

      {/* Input field */}
      <motion.div
        variants={{ shake: { x: [0, -5, 5, -3, 3, 0], transition: { duration: 0.4 } } }}
        animate={state.isCorrect === false ? 'shake' : undefined}
      >
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
          placeholder="Type your answer..."
          className={`w-full p-3 rounded-xl border-2 text-center font-bold text-lg outline-none transition-colors ${
            state.isComplete && state.isCorrect
              ? 'bg-green-100 border-green-500 text-green-800'
              : state.isCorrect === false
              ? 'bg-red-50 border-red-400 text-red-600'
              : 'bg-white border-slate-200 text-slate-800 focus:border-sky-400'
          }`}
        />
      </motion.div>

      {/* Wrong answer feedback */}
      {state.isCorrect === false && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-bold text-sm text-red-500 mt-2"
        >
          Not quite! 💪
        </motion.p>
      )}

      {/* Show correct answer after multiple attempts */}
      {state.showCorrectAnswer && !state.isComplete && (
        <p className="text-sm text-slate-600 mt-2">
          Correct answer: <span className="font-bold text-green-600">{data.correctAnswer}</span>
        </p>
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

export default Translate;