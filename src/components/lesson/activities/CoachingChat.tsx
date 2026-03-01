/**
 * LingoFriends — CoachingChat Activity (Phase 3, Task 3.4)
 *
 * A guided discovery step where the learner "discovers" the meaning of a new
 * phrase by tapping one of three options. This replaces the static InfoDisplay
 * card as Step 1 of the teach-first progression.
 *
 * KEY BEHAVIOURS (from .clinerules Phase 3 Rules 10, 13, 14):
 *
 *   Rule 10: COACHING_CHAT is NEVER graded.
 *     - 0 SunDrops always
 *     - Wrong answers get encouragement, not "WRONG" feedback
 *     - The correct answer is always revealed after any choice
 *
 *   Rule 13: Age-appropriate interactions.
 *     - Currently: tap-to-choose 3 options for all ages
 *     - Phase 4: free-text input for age 15-18
 *
 *   Rule 14: Graceful degradation.
 *     - If discoveryQuestion or discoveryOptions are absent, falls back to a
 *       simple "Tap to continue" view showing the phrase + translation.
 *       This path should NOT occur in normal use (the assembler only creates
 *       COACHING_CHAT steps when coaching fields are present), but is here
 *       as a safety net for corrupted or legacy LessonPlan data.
 *
 * FLOW:
 *   1. INTRO   — NPC coaching text shown as text (TTS handled by useLessonAudio)
 *   2. DISCOVER — Tap one of 3 options to guess the meaning
 *   3. REVEAL  — Warm follow-up + correct answer highlighted + pattern note
 *   4. READY   — "Let's practise!" button calls onComplete(true, 0)
 *
 * @module CoachingChat
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActivityConfig } from '../../../types/game';

// ============================================
// TYPES
// ============================================

type CoachingPhase = 'intro' | 'discover' | 'reveal' | 'ready';

interface CoachingChatProps {
  /** Activity config — must be type COACHING_CHAT */
  data: ActivityConfig;
  /** Called when learner is ready to move on. Always (true, 0) — no scoring. */
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Returns an encouraging, varied response based on whether the learner was
 * correct or not. CoachingChat never says "Wrong!" — Rule 10.
 */
function getEncouragement(wasCorrect: boolean): string {
  if (wasCorrect) {
    const correct = [
      '🌟 Yes! You got it!',
      '✨ Exactly right!',
      '🎉 Great guess!',
      '💫 Spot on!',
    ];
    return correct[Math.floor(Math.random() * correct.length)];
  }
  const almost = [
    '🤔 Good try! Let\'s see the answer.',
    '💪 Almost! Here\'s what it means.',
    '👍 Nice try! The answer is...',
    '🌈 Keep going — here\'s the meaning!',
  ];
  return almost[Math.floor(Math.random() * almost.length)];
}

// ============================================
// COMPONENT
// ============================================

/**
 * CoachingChat — guided discovery activity for COACHING_CHAT steps.
 *
 * @example
 * <CoachingChat
 *   data={activity}
 *   onComplete={(correct, drops) => handleNext(correct, drops)}
 * />
 */
export const CoachingChat: React.FC<CoachingChatProps> = ({ data, onComplete }) => {
  const [phase, setPhase] = useState<CoachingPhase>('intro');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [encouragement, setEncouragement] = useState('');

  // ── Check for coaching fields (Phase 3 Rule 14 — graceful fallback) ─────
  const hasDiscovery =
    data.discoveryQuestion &&
    data.discoveryOptions &&
    data.discoveryOptions.length >= 2 &&
    typeof data.discoveryCorrectIndex === 'number';

  // ── PHASE TRANSITIONS ────────────────────────────────────────────────────

  /**
   * Move from INTRO → DISCOVER (or directly to READY if no discovery fields).
   */
  function handleIntroNext() {
    if (hasDiscovery) {
      setPhase('discover');
    } else {
      // Graceful fallback: no discovery — just show phrase and move on
      setPhase('ready');
    }
  }

  /**
   * Learner taps one of the discovery options.
   * Reveals the answer with encouragement — no failure state.
   */
  function handleOptionTap(index: number) {
    if (phase !== 'discover') return;
    const wasCorrect = index === data.discoveryCorrectIndex;
    setSelectedIndex(index);
    setEncouragement(getEncouragement(wasCorrect));
    setPhase('reveal');
  }

  /**
   * Learner is done reviewing the reveal — move to READY.
   */
  function handleRevealNext() {
    setPhase('ready');
  }

  /**
   * Learner taps "Let's practise!" — complete the coaching step.
   * Always passes (true, 0) — coaching is never graded (Rule 10).
   */
  function handleReady() {
    onComplete(true, 0);
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="coaching-chat rounded-2xl overflow-hidden shadow-lg bg-white">
      {/* NPC header bar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border-b border-amber-100">
        <span className="text-3xl" role="img" aria-label="NPC teacher">🦉</span>
        <div>
          <p className="font-bold text-amber-900 text-sm">Professor Finch</p>
          <p className="text-amber-600 text-xs">Your language coach</p>
        </div>
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">

          {/* ── PHASE 1: INTRO ─────────────────────────────────────── */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Coaching text (NPC spoken intro — audio handled by useLessonAudio) */}
              <div className="bg-amber-50 rounded-xl p-4 mb-5 border border-amber-100">
                <p className="text-stone-700 leading-relaxed text-base">
                  {data.coachingText || `Let's learn a new phrase: "${data.targetPhrase}"!`}
                </p>
              </div>

              {/* Phrase preview */}
              {data.targetPhrase && (
                <div className="text-center my-5">
                  <p className="text-3xl font-bold text-amber-700 mb-1">{data.targetPhrase}</p>
                  {/* Hide translation here — it's what the learner will "discover" */}
                  <p className="text-stone-400 text-sm italic">
                    {hasDiscovery ? 'Can you guess what this means?' : data.nativeTranslation}
                  </p>
                </div>
              )}

              <button
                onClick={handleIntroNext}
                className="w-full mt-4 py-3 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors text-base"
              >
                {hasDiscovery ? "Let me guess! →" : "Got it! →"}
              </button>
            </motion.div>
          )}

          {/* ── PHASE 2: DISCOVER ──────────────────────────────────── */}
          {phase === 'discover' && hasDiscovery && (
            <motion.div
              key="discover"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Discovery question */}
              <div className="text-center mb-5">
                <p className="text-xl font-bold text-amber-700 mb-1">
                  {data.targetPhrase}
                </p>
                <p className="text-stone-700 font-medium text-base">
                  {data.discoveryQuestion}
                </p>
              </div>

              {/* Options — tap to choose */}
              <div className="space-y-3">
                {data.discoveryOptions!.map((option, index) => (
                  <motion.button
                    key={index}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleOptionTap(index)}
                    className="w-full py-3.5 px-5 text-left bg-stone-50 hover:bg-amber-50 border-2 border-stone-200 hover:border-amber-300 rounded-xl text-stone-700 font-medium transition-all text-base"
                  >
                    <span className="text-amber-600 font-bold mr-2">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </motion.button>
                ))}
              </div>

              {/* Skip option — learner can always move on (non-blocking) */}
              <button
                onClick={() => {
                  setSelectedIndex(null);
                  setEncouragement('💡 Here\'s the answer:');
                  setPhase('reveal');
                }}
                className="w-full mt-4 py-2 text-stone-400 hover:text-stone-600 text-sm underline transition-colors"
              >
                I'm not sure — show me the answer
              </button>
            </motion.div>
          )}

          {/* ── PHASE 3: REVEAL ────────────────────────────────────── */}
          {phase === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Encouragement header */}
              <p className="text-lg font-bold text-stone-800 mb-4 text-center">
                {encouragement}
              </p>

              {/* Options with correct answer revealed */}
              {hasDiscovery && data.discoveryOptions && (
                <div className="space-y-2 mb-4">
                  {data.discoveryOptions.map((option, index) => {
                    const isCorrect = index === data.discoveryCorrectIndex;
                    const wasSelected = index === selectedIndex;
                    let style = 'bg-stone-50 border-stone-200 text-stone-500';
                    if (isCorrect) {
                      style = 'bg-green-50 border-green-400 text-green-800 font-bold';
                    } else if (wasSelected && !isCorrect) {
                      style = 'bg-rose-50 border-rose-200 text-rose-400';
                    }
                    return (
                      <div
                        key={index}
                        className={`w-full py-3 px-5 border-2 rounded-xl text-base flex items-center gap-2 ${style}`}
                      >
                        <span className="font-bold">
                          {isCorrect ? '✓' : wasSelected ? '✗' : String.fromCharCode(65 + index) + '.'}
                        </span>
                        {option}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Follow-up message */}
              {data.discoveryFollowUp && (
                <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-100">
                  <p className="text-stone-700 text-sm leading-relaxed">
                    {data.discoveryFollowUp}
                  </p>
                </div>
              )}

              {/* Pattern highlight — reinforces chunk family concept */}
              {data.patternHighlight && (
                <div className="bg-blue-50 rounded-xl p-3 mb-4 border border-blue-100 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5" aria-hidden>💡</span>
                  <p className="text-blue-700 text-sm font-medium leading-relaxed">
                    {data.patternHighlight}
                  </p>
                </div>
              )}

              <button
                onClick={handleRevealNext}
                className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors text-base"
              >
                Got it! →
              </button>
            </motion.div>
          )}

          {/* ── PHASE 4: READY ─────────────────────────────────────── */}
          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Phrase + translation summary before quiz steps begin */}
              <div className="my-6">
                <p className="text-4xl font-bold text-amber-700 mb-2">
                  {data.targetPhrase}
                </p>
                <p className="text-xl text-stone-500">
                  {data.nativeTranslation && `= "${data.nativeTranslation}"`}
                </p>
              </div>

              <p className="text-stone-600 mb-6">
                Now let's practise with some fun activities! 🎯
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReady}
                className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-md transition-all text-lg"
              >
                Let's practise! 🌟
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default CoachingChat;
