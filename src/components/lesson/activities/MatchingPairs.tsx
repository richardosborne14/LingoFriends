/**
 * LingoFriends - Matching Pairs Activity Component
 * 
 * Two-column layout where users match left items to right items.
 * Tap an item from each column to create a match.
 * 
 * @module MatchingPairs
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityConfig } from '../../../types/game';
import { calculateEarned } from '../../../services/sunDropService';
import { SunDropIcon } from './ActivityWrapper';

// ============================================
// TYPES
// ============================================

export interface MatchingPairsProps {
  data: ActivityConfig;
  helpText: string;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onWrong: () => void;
}

/** A single match item with its match status */
interface MatchItem {
  left: string;
  right: string;
  leftSelected: boolean;
  rightSelected: boolean;
  matched: boolean;
}

interface MatchingState {
  /** All match items with their state */
  items: MatchItem[];
  /** Currently selected left item index */
  selectedLeft: number | null;
  /** Currently selected right item index */
  selectedRight: number | null;
  /** Number of correct matches */
  matchesCount: number;
  /** Total pairs to match */
  totalPairs: number;
  /** Whether activity is complete */
  isComplete: boolean;
  /** Number of wrong attempts */
  attempts: number;
  /** Whether help has been used */
  usedHelp: boolean;
  showHelp: boolean;
}

// ============================================
// HELPERS
// ============================================

/** Shuffle array for display */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ============================================
// COMPONENT
// ============================================

/**
 * MatchingPairs - Match items from two columns.
 * 
 * @example
 * <MatchingPairs
 *   data={{
 *     type: GameActivityType.MATCHING,
 *     pairs: [
 *       { left: "Bonjour", right: "Hello" },
 *       { left: "Au revoir", right: "Goodbye" },
 *     ],
 *     sunDrops: 3,
 *   }}
 *   helpText="Match the French words to their English meanings"
 *   onComplete={...}
 *   onWrong={...}
 * />
 */
export const MatchingPairs: React.FC<MatchingPairsProps> = ({
  data,
  helpText,
  onComplete,
  onWrong,
}) => {
  if (!data.pairs || data.pairs.length === 0) {
    console.error('MatchingPairs: Missing pairs data', data);
    return <div className="p-4 text-red-500">Error: Missing activity data</div>;
  }

  // Shuffle left and right columns independently
  const { leftItems, rightItems, correctMatches } = useMemo(() => {
    const pairs = data.pairs!;
    const left = shuffleArray(pairs.map((p, i) => ({ text: p.left, index: i })));
    const right = shuffleArray(pairs.map((p, i) => ({ text: p.right, index: i })));
    // Map left index -> right index for correct matches
    const matches: Record<number, number> = {};
    pairs.forEach((_, i) => {
      matches[i] = i; // Same indices in the original data
    });
    return {
      leftItems: left,
      rightItems: right,
      correctMatches: matches,
    };
  }, [data.pairs]);

  const [state, setState] = useState<MatchingState>({
    items: data.pairs!.map(p => ({
      left: p.left,
      right: p.right,
      leftSelected: false,
      rightSelected: false,
      matched: false,
    })),
    selectedLeft: null,
    selectedRight: null,
    matchesCount: 0,
    totalPairs: data.pairs!.length,
    isComplete: false,
    attempts: 0,
    usedHelp: false,
    showHelp: false,
  });

  // Track which original indices are matched
  const [matchedIndices, setMatchedIndices] = useState<Set<number>>(new Set());

  /**
   * Handle tapping a left item
   */
  const handleSelectLeft = useCallback((originalIndex: number) => {
    if (state.isComplete || matchedIndices.has(originalIndex)) return;
    
    setState(prev => ({
      ...prev,
      selectedLeft: originalIndex,
      selectedRight: null, // Reset right selection
    }));
  }, [state.isComplete, matchedIndices]);

  /**
   * Handle tapping a right item
   */
  const handleSelectRight = useCallback((originalIndex: number) => {
    if (state.isComplete || matchedIndices.has(originalIndex) || state.selectedLeft === null) return;

    // Check if the match is correct
    const isMatch = state.selectedLeft === originalIndex;

    if (isMatch) {
      // Correct match
      const newMatched = new Set(matchedIndices);
      newMatched.add(originalIndex);
      setMatchedIndices(newMatched);

      const newCount = state.matchesCount + 1;
      const isComplete = newCount === state.totalPairs;

      setState(prev => ({
        ...prev,
        selectedLeft: null,
        selectedRight: null,
        matchesCount: newCount,
        isComplete,
      }));

      if (isComplete) {
        const earned = calculateEarned(data.sunDrops, state.attempts > 0, state.usedHelp, 0);
        setTimeout(() => onComplete(true, earned), 600);
      }
    } else {
      // Wrong match
      setState(prev => ({
        ...prev,
        attempts: prev.attempts + 1,
        selectedLeft: null,
      }));
      onWrong();
    }
  }, [state.isComplete, state.selectedLeft, state.matchesCount, state.totalPairs, state.attempts, state.usedHelp, matchedIndices, data.sunDrops, onComplete, onWrong]);

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

      <p className="font-bold text-lg text-slate-800 mb-2">Match the pairs:</p>
      <p className="text-xs text-slate-500 mb-3">
        {state.matchesCount}/{state.totalPairs} matched
      </p>

      {/* Two columns */}
      <div className="flex gap-4">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-2">
          {leftItems.map((item) => {
            const isMatched = matchedIndices.has(item.index);
            const isSelected = state.selectedLeft === item.index;
            
            return (
              <motion.button
                key={`left-${item.index}`}
                onClick={() => handleSelectLeft(item.index)}
                disabled={state.isComplete || isMatched}
                whileTap={{ scale: 0.98 }}
                className={`p-3 rounded-xl border-2 text-left font-bold text-sm transition-colors ${
                  isMatched
                    ? 'bg-green-100 border-green-500 text-green-800'
                    : isSelected
                    ? 'bg-sky-100 border-sky-400 text-sky-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {isMatched && '✅ '}
                {item.text}
              </motion.button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="flex-1 flex flex-col gap-2">
          {rightItems.map((item) => {
            const isMatched = matchedIndices.has(item.index);
            
            return (
              <motion.button
                key={`right-${item.index}`}
                onClick={() => handleSelectRight(item.index)}
                disabled={state.isComplete || isMatched || state.selectedLeft === null}
                whileTap={{ scale: 0.98 }}
                className={`p-3 rounded-xl border-2 text-left font-bold text-sm transition-colors ${
                  isMatched
                    ? 'bg-green-100 border-green-500 text-green-800'
                    : state.selectedLeft !== null && !isMatched
                    ? 'bg-white border-slate-300 text-slate-700 hover:border-green-400'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                {isMatched && '✅ '}
                {item.text}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      {state.selectedLeft !== null && !state.isComplete && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-sky-600 font-medium text-center mt-3"
        >
          Now tap the matching item on the right →
        </motion.p>
      )}
    </div>
  );
};

export default MatchingPairs;