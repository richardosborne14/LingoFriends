/**
 * LingoFriends - True/False Activity Component
 * 
 * Displays a statement that the user marks as True or False.
 * Simple binary choice with big, kid-friendly buttons.
 * 
 * @module TrueFalse
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ActivityConfig } from '../../../types/game';
import { calculateEarned } from '../../../services/sunDropService';
import { SunDropIcon } from './ActivityWrapper';

// ============================================
// TYPES
// ============================================

export interface TrueFalseProps {
  data: ActivityConfig;
  helpText: string;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onWrong: () => void;
}

interface TrueFalseState {
  /** Selected answer: null = pending */
  selected: boolean | null;
  /** Answer correctness */
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
// COMPONENT
// ============================================

/**
 * TrueFalse - Mark statement as true or false.
 * 
 * @example
 * <TrueFalse
 *   data={{
 *     type: GameActivityType.TRUE_FALSE,
 *     statement: "'Bonjour' means 'Goodbye'",
 *     correctAnswer: false,
 *     sunDrops: 1,
 *   }}
 *   helpText="Bonjour is a greeting..."
 *   onComplete={...}
 *   onWrong={...}
 * />
 */
export const TrueFalse: React.FC<TrueFalseProps> = ({
  data,
  helpText,
  onComplete,
  onWrong,
}) => {
  if (data.isTrue === undefined || !data.statement) {
    console.error('TrueFalse: Missing required fields', data);
    return <div className="p-4 text-red-500">Error: Missing activity data</div>;
  }

  const [state, setState] = useState<TrueFalseState>({
    selected: null,
    isCorrect: null,
    isComplete: false,
    attempts: 0,
    usedHelp: false,
    showHelp: false,
  });

  const handleSelect = useCallback((value: boolean) => {
    if (state.isComplete) return;

    const isCorrect = value === data.isTrue;

    if (isCorrect) {
      const earned = calculateEarned(data.sunDrops, state.attempts > 0, state.usedHelp, 0);
      setState(prev => ({
        ...prev,
        selected: value,
        isCorrect: true,
        isComplete: true,
      }));
      setTimeout(() => onComplete(true, earned), 900);
    } else {
      setState(prev => ({
        ...prev,
        selected: value,
        isCorrect: false,
        attempts: prev.attempts + 1,
      }));
      onWrong();
      setTimeout(() => {
        setState(prev => ({ ...prev, selected: null, isCorrect: null }));
      }, 700);
    }
  }, [state.isComplete, state.attempts, state.usedHelp, data.isTrue, data.sunDrops, onComplete, onWrong]);

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

      <p className="font-bold text-lg text-slate-800 mb-4">{data.statement}</p>

      {/* True/False buttons */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSelect(true)}
          disabled={state.isComplete}
          className={`flex-1 py-4 rounded-2xl font-bold text-xl border-2 transition-colors ${
            state.isComplete && state.selected === true && state.isCorrect
              ? 'bg-green-100 border-green-500 text-green-800'
              : state.selected === true && state.isCorrect === false
              ? 'bg-red-50 border-red-400 text-red-600'
              : 'bg-white border-green-400 text-green-700 hover:bg-green-50'
          }`}
          style={{ boxShadow: state.isComplete && state.selected === true ? '0 2px 0 0 #22c55e' : '0 4px 0 0 rgba(34, 197, 94, 0.3)' }}
        >
          {state.isComplete && state.selected === true && state.isCorrect && '✅ '}
          {state.selected === true && state.isCorrect === false && '❌ '}
          True
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSelect(false)}
          disabled={state.isComplete}
          className={`flex-1 py-4 rounded-2xl font-bold text-xl border-2 transition-colors ${
            state.isComplete && state.selected === false && state.isCorrect
              ? 'bg-green-100 border-green-500 text-green-800'
              : state.selected === false && state.isCorrect === false
              ? 'bg-red-50 border-red-400 text-red-600'
              : 'bg-white border-red-400 text-red-700 hover:bg-red-50'
          }`}
          style={{ boxShadow: state.isComplete && state.selected === false ? '0 2px 0 0 #22c55e' : '0 4px 0 0 rgba(239, 68, 68, 0.3)' }}
        >
          {state.isComplete && state.selected === false && state.isCorrect && '✅ '}
          {state.selected === false && state.isCorrect === false && '❌ '}
          False
        </motion.button>
      </div>
    </div>
  );
};

export default TrueFalse;