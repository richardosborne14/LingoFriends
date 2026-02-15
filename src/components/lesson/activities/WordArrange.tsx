/**
 * LingoFriends - Word Arrange Activity Component
 * 
 * Displays scrambled words that the user arranges into a sentence.
 * Tap to move words between available and answer zones.
 * 
 * @module WordArrange
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityConfig } from '../../../types/game';
import { calculateEarned } from '../../../services/sunDropService';
import { SunDropIcon } from './ActivityWrapper';

// ============================================
// TYPES
// ============================================

export interface WordArrangeProps {
  data: ActivityConfig;
  helpText: string;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onWrong: () => void;
}

interface WordArrangeState {
  /** Words currently in the answer zone */
  placedWords: string[];
  /** Words still in the available zone */
  availableWords: string[];
  /** Answer state: null = pending, true = correct, false = wrong */
  isCorrect: boolean | null;
  /** Whether activity is complete */
  isComplete: boolean;
  /** Number of wrong attempts */
  attempts: number;
  /** Whether help has been used */
  usedHelp: boolean;
  showHelp: boolean;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const shakeVariants = {
  shake: {
    x: [0, -4, 4, -2, 2, 0],
    transition: { duration: 0.4 },
  },
};

const wordChipVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
  },
  exit: { scale: 0, opacity: 0 },
};

// ============================================
// COMPONENT
// ============================================

/**
 * WordArrange - Arrange scrambled words into correct sentence.
 * 
 * @example
 * <WordArrange
 *   data={{
 *     type: GameActivityType.WORD_ARRANGE,
 *     targetSentence: "The striker scored a goal",
 *     scrambledWords: ["scored", "The", "goal", "striker", "a"],
 *     sunDrops: 3,
 *   }}
 *   helpText="Start with 'The'"
 *   onComplete={...}
 *   onWrong={...}
 * />
 */
export const WordArrange: React.FC<WordArrangeProps> = ({
  data,
  helpText,
  onComplete,
  onWrong,
}) => {
  // Validate required fields
  if (!data.targetSentence || !data.scrambledWords) {
    console.error('WordArrange: Missing required fields', data);
    return (
      <div className="p-4 text-red-500">
        Error: Missing activity data
      </div>
    );
  }

  const [state, setState] = useState<WordArrangeState>({
    placedWords: [],
    availableWords: [...data.scrambledWords],
    isCorrect: null,
    isComplete: false,
    attempts: 0,
    usedHelp: false,
    showHelp: false,
  });

  /**
   * Move a word from available to placed.
   */
  const handlePlaceWord = useCallback((word: string, index: number) => {
    if (state.isComplete || state.isCorrect !== null) return;
    
    setState(prev => ({
      ...prev,
      placedWords: [...prev.placedWords, word],
      availableWords: prev.availableWords.filter((_, i) => i !== index),
      isCorrect: null,
    }));
  }, [state.isComplete, state.isCorrect]);

  /**
   * Move a word from placed back to available.
   */
  const handleRemoveWord = useCallback((word: string, index: number) => {
    if (state.isComplete) return;
    
    setState(prev => ({
      ...prev,
      placedWords: prev.placedWords.filter((_, i) => i !== index),
      availableWords: [...prev.availableWords, word],
      isCorrect: null,
    }));
  }, [state.isComplete]);

  /**
   * Check the arranged answer.
   */
  const handleCheck = useCallback(() => {
    if (state.isComplete || state.placedWords.length === 0) return;

    const userAnswer = state.placedWords.join(' ');
    const isCorrect = userAnswer === data.targetSentence;

    if (isCorrect) {
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
      setState(prev => ({
        ...prev,
        isCorrect: false,
        attempts: prev.attempts + 1,
      }));

      onWrong();
    }
  }, [state.isComplete, state.placedWords, state.attempts, state.usedHelp, data.targetSentence, data.sunDrops, onComplete, onWrong]);

  /**
   * Reset after wrong answer.
   */
  const handleRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      placedWords: [],
      availableWords: [...data.scrambledWords!],
      isCorrect: null,
    }));
  }, [data.scrambledWords]);

  const handleHelp = useCallback(() => {
    setState(prev => ({
      ...prev,
      showHelp: true,
      usedHelp: true,
    }));
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

      <p className="font-bold text-lg text-slate-800 mb-3">Build the sentence:</p>

      {/* Answer drop zone */}
      <motion.div
        variants={state.isCorrect === false ? shakeVariants : undefined}
        animate={state.isCorrect === false ? 'shake' : undefined}
        className={`min-h-[48px] rounded-xl p-3 border-2 border-dashed mb-3 flex flex-wrap gap-2 ${
          state.isComplete && state.isCorrect
            ? 'bg-green-100 border-green-500'
            : state.isCorrect === false
            ? 'bg-red-50 border-red-400'
            : 'bg-slate-50 border-slate-300'
        }`}
      >
        {state.placedWords.length === 0 && (
          <span className="text-slate-400 text-sm italic">Tap words to build your answer...</span>
        )}
        <AnimatePresence>
          {state.placedWords.map((word, index) => (
            <motion.button
              key={`placed-${index}-${word}`}
              variants={wordChipVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              onClick={() => handleRemoveWord(word, index)}
              disabled={state.isComplete}
              className="bg-white border-2 border-green-400 rounded-lg px-3 py-1.5 font-bold text-base text-slate-800 shadow-sm hover:bg-green-50 transition-colors disabled:cursor-default"
            >
              {word}
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Available words */}
      <div className="flex flex-wrap gap-2 mb-3">
        <AnimatePresence>
          {state.availableWords.map((word, index) => (
            <motion.button
              key={`available-${index}-${word}`}
              variants={wordChipVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              whileTap={{ scale: 0.9 }}
              onClick={() => handlePlaceWord(word, index)}
              disabled={state.isComplete}
              className="bg-white border-2 border-slate-200 rounded-lg px-3 py-1.5 font-bold text-base text-slate-600 shadow-sm hover:border-slate-300 transition-colors disabled:cursor-default"
            >
              {word}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Wrong answer feedback */}
      {state.isCorrect === false && (
        <p className="font-bold text-sm text-red-500 mb-3">
          Answer: "{data.targetSentence}"
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!state.isComplete && state.placedWords.length > 0 && state.isCorrect === null && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCheck}
            className="bg-[#58CC02] text-white px-6 py-3 rounded-2xl font-bold text-base"
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

export default WordArrange;