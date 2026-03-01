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
import type { TargetLanguage } from '../../../../types';
import { toLanguageCode } from '../../../utils/languageUtils';

// ============================================
// WEB SPEECH API TYPES
// ============================================

/** Browser speech recognition API — not in default TS libs */
interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface WebSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

// ============================================
// TYPES
// ============================================

export interface TranslateProps {
  data: ActivityConfig;
  helpText: string;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onWrong: () => void;
  /** Callback when user skips the question (optional - advances without reward/penalty) */
  onSkip?: () => void;
  /** Callback when user reports a broken question (optional - triggers regeneration) */
  onReport?: () => void;
  /** Whether a report is currently being processed */
  isReporting?: boolean;
  /**
   * Target language for STT recognition (e.g. 'German', 'French').
   * Drives `recognition.lang` so the browser listens in the right language.
   * Defaults to French if not provided.
   */
  targetLanguage?: TargetLanguage;
  /**
   * Opens the full AI help overlay from within this activity.
   * Shown as a secondary "Ask AI" link below the static help hint.
   */
  onOpenHelp?: () => void;
}

interface TranslateState {
  inputValue: string;
  isCorrect: boolean | null;
  isComplete: boolean;
  attempts: number;
  usedHelp: boolean;
  showHelp: boolean;
  showCorrectAnswer: boolean;
  showGiveUp: boolean;
  /** Whether STT is actively recording */
  isListening: boolean;
  /** STT error to show to the user */
  sttError: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_ATTEMPTS = 3;

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
  onSkip,
  onReport,
  isReporting,
  targetLanguage,
  onOpenHelp,
}) => {
  if (!data.sourcePhrase || !data.correctAnswer) {
    console.error('Translate: Missing required fields', data);
    return <div className="p-4 text-red-500">Error: Missing activity data</div>;
  }

  const inputRef = useRef<HTMLInputElement>(null);
  // STT recognition instance — kept in a ref so it survives re-renders
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);

  // Detect STT support once at mount (not every render)
  const sttSupported = useRef(
    typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );

  const [state, setState] = useState<TranslateState>({
    inputValue: '',
    isCorrect: null,
    isComplete: false,
    attempts: 0,
    usedHelp: false,
    showHelp: false,
    showCorrectAnswer: false,
    showGiveUp: false,
    isListening: false,
    sttError: null,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ============================================
  // STT — voice input in the target language
  // ============================================

  /**
   * Start speech recognition in the lesson's target language.
   * When a result arrives it populates the text input so the user can
   * review before hitting Check (or press Enter to confirm immediately).
   */
  const startListening = useCallback(() => {
    const WindowWithSpeech = window as unknown as {
      webkitSpeechRecognition?: new () => WebSpeechRecognition;
      SpeechRecognition?: new () => WebSpeechRecognition;
    };
    const SpeechAPI =
      WindowWithSpeech.webkitSpeechRecognition || WindowWithSpeech.SpeechRecognition;
    if (!SpeechAPI) return;

    const recognition = new SpeechAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    // Use the lesson target language so recognition matches what kids are speaking
    recognition.lang = toLanguageCode(targetLanguage ?? 'French');

    recognition.onresult = (event: WebSpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setState(prev => ({
        ...prev,
        inputValue: transcript,
        isListening: false,
        sttError: null,
        // Clear any previous wrong-answer highlight so the new transcript starts fresh
        isCorrect: prev.isCorrect === false ? null : prev.isCorrect,
      }));
    };

    recognition.onerror = () => {
      setState(prev => ({
        ...prev,
        isListening: false,
        sttError: "Couldn't hear that — try again or type below",
      }));
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState(prev => ({ ...prev, isListening: true, sttError: null }));
  }, [targetLanguage]);

  /**
   * Stop recording (user tapped mic again while listening).
   */
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
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
      const newAttempts = state.attempts + 1;
      setState(prev => ({
        ...prev,
        isCorrect: false,
        attempts: newAttempts,
        showCorrectAnswer: newAttempts >= 2, // Show answer after 2 wrong tries
        showGiveUp: newAttempts >= MAX_ATTEMPTS, // Show give up after 3 wrong tries
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

  /**
   * Handle give up - show answer and continue.
   */
  const handleGiveUp = useCallback(() => {
    setState(prev => ({
      ...prev,
      showCorrectAnswer: true,
      isComplete: true,
    }));
    
    // Continue after showing answer
    setTimeout(() => {
      onComplete(false, 0);
    }, 2000);
  }, [onComplete]);

  /**
   * Skip this question entirely.
   * Uses onSkip callback if provided, otherwise falls back to onComplete(false, 0).
   */
  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete(false, 0);
    }
  }, [onSkip, onComplete]);

  const reduced = state.usedHelp || state.attempts > 0;
  const canGiveUp = state.attempts >= MAX_ATTEMPTS && !state.isComplete;

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

      {/* Help panel — shows static hint; offers AI escalation */}
      {state.showHelp && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-sky-50 border-2 border-sky-200 rounded-xl p-3 mb-3 relative"
        >
          <div className="flex gap-2">
            <p className="font-semibold text-sm text-slate-700 leading-relaxed flex-1">{helpText}</p>
          </div>
          {/* Secondary path to full AI assistant */}
          {onOpenHelp && (
            <button
              onClick={() => { handleCloseHelp(); onOpenHelp(); }}
              className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              Ask AI for more help 🤖 →
            </button>
          )}
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

      {/* ── STT mic button (primary input) ── */}
      {/* Only shown when browser supports speech recognition and activity is not complete */}
      {sttSupported.current && !state.isComplete && (
        <div className="mb-4">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={state.isListening ? stopListening : startListening}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-colors ${
              state.isListening
                ? 'bg-red-500 text-white'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            style={{ boxShadow: state.isListening
              ? '0 4px 0 0 rgba(239,68,68,0.3)'
              : '0 4px 0 0 rgba(34,197,94,0.3)' }}
            aria-label={state.isListening ? 'Stop listening' : 'Speak your answer'}
          >
            {state.isListening ? (
              // Pulsing animation while recording
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                🔴
              </motion.span>
            ) : '🎤'}
            <span>{state.isListening ? 'Listening...' : 'Tap to speak'}</span>
          </motion.button>

          {/* STT error */}
          {state.sttError && (
            <p className="text-xs text-red-500 text-center mt-1">{state.sttError}</p>
          )}

          {/* Divider to text fallback */}
          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or type below</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
        </div>
      )}

      {/* Input field (always available as fallback) */}
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

      {/* Give up option after max attempts */}
      {canGiveUp && !state.showGiveUp && (
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

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        {state.isCorrect === null && !state.isComplete && (
          <>
            {/* Report button */}
            {onReport && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onReport}
                disabled={isReporting}
                className={`border-2 rounded-lg px-3 py-1.5 font-bold text-xs transition-colors ${
                  isReporting
                    ? 'bg-amber-50 border-amber-200 text-amber-400 cursor-wait'
                    : 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300'
                }`}
                title="Report a problem with this question"
              >
                {isReporting ? '⏳ Fixing...' : '🚩 Report'}
              </motion.button>
            )}
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

export default Translate;
