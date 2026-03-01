/**
 * LingoFriends — LessonIntroCard
 *
 * Shown at the very start of a lesson, before any steps begin.
 * Gives the learner a mental map of what they'll learn — all phrases
 * listed with their translations — before any testing starts.
 *
 * Why this matters (Task 2.3.4):
 * Cognitive Load Theory says previewing material reduces anxiety and
 * helps learners build schema before being tested. Kids should NEVER
 * be surprised by a question about something they haven't seen yet.
 *
 * This card:
 *   - Shows every phrase with its translation
 *   - Uses a "Let's go!" CTA to begin
 *   - Offers a "skip intro" for returning learners
 *   - Has 0 SunDrops — it's orientation, not testing
 *
 * @module LessonIntroCard
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single chunk preview item — minimal data needed for the intro card.
 * Populated from LessonPlan.introChunks by the assembler.
 */
export interface IntroChunk {
  /** Phrase in the target language, e.g. "Guten Tag" */
  targetPhrase: string;
  /** Translation in the native language, e.g. "Hello" */
  nativeTranslation: string;
}

/**
 * Props for LessonIntroCard.
 */
export interface LessonIntroCardProps {
  /** Lesson title, e.g. "German Greetings" */
  lessonTitle: string;
  /** All chunks to be taught in this lesson */
  chunks: IntroChunk[];
  /** Called when the learner clicks "Let's go!" */
  onStart: () => void;
  /** Optional skip — for returning learners who know the material */
  onSkip?: () => void;
  /**
   * Phase 3 (Task 3.6): The core sentence frame shared by all chunks.
   * E.g. "Ich habe ___" — shown prominently as the lesson's learning pattern.
   * When absent, falls back to a plain chunk list (same as Phase 2 behaviour).
   */
  coreFrame?: string;
  /**
   * Native-language translation of the core frame.
   * E.g. "I have ___" — shown below the coreFrame for comprehension.
   */
  coreFrameTranslation?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LessonIntroCard — lesson preview before any steps begin.
 *
 * Renders a card listing all target phrases with their translations.
 * The learner must tap "Let's go!" to enter the first chunk's INFO step.
 *
 * @example
 * <LessonIntroCard
 *   lessonTitle="German Greetings"
 *   chunks={lesson.introChunks}
 *   onStart={() => setShowIntroCard(false)}
 * />
 */
export const LessonIntroCard: React.FC<LessonIntroCardProps> = ({
  lessonTitle,
  chunks,
  onStart,
  onSkip,
  coreFrame,
  coreFrameTranslation,
}) => {
  // When a coreFrame is present, show each chunk as a slot-filler variation.
  // This visually communicates that all phrases share the same pattern.
  const showFrameLayout = Boolean(coreFrame);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto"
    >
      {/* Card */}
      <div className="bg-white rounded-3xl shadow-xl border-2 border-amber-200 overflow-hidden">

        {/* Header band */}
        <div className="bg-gradient-to-r from-amber-400 to-yellow-300 px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-4xl">🌟</span>
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                Today's Lesson
              </p>
              <h1 className="text-xl font-extrabold text-amber-900 leading-tight">
                {lessonTitle}
              </h1>
            </div>
          </div>

          {/* Phase 3 (Task 3.6): Core frame banner — highlights the pattern */}
          {showFrameLayout ? (
            <div className="mt-3 bg-white/40 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-extrabold text-amber-900 tracking-tight">
                {coreFrame}
              </p>
              {coreFrameTranslation && (
                <p className="text-sm text-amber-700 mt-0.5 font-medium">
                  "{coreFrameTranslation}"
                </p>
              )}
              <p className="text-xs text-amber-700 mt-1 opacity-75">
                You'll learn {chunks.length} ways to fill the blank!
              </p>
            </div>
          ) : (
            <p className="text-sm text-amber-800 mt-2 font-medium">
              In this lesson you'll learn to say:
            </p>
          )}
        </div>

        {/* Chunk list */}
        <div className="px-5 py-4 space-y-3">
          {!showFrameLayout && (
            <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-1">
              Phrases you'll learn
            </p>
          )}
          {chunks.map((chunk, index) => (
            <motion.div
              key={chunk.targetPhrase}
              // Stagger each chunk row in for a polished feel
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.07, duration: 0.25 }}
              className="flex items-center gap-3 bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100"
            >
              {/* Numbered badge */}
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-300 text-amber-900 text-xs font-extrabold flex items-center justify-center">
                {index + 1}
              </span>

              {/* Phrase */}
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-800 text-base leading-snug block truncate">
                  {chunk.targetPhrase}
                </span>
                <span className="text-sm text-slate-500 leading-snug block truncate">
                  {chunk.nativeTranslation}
                </span>
              </div>

              {/* Arrow decoration */}
              <span className="text-amber-400 text-lg flex-shrink-0">→</span>
            </motion.div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 pt-1 space-y-3">
          {/* Primary CTA */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="w-full py-4 rounded-2xl font-extrabold text-lg text-white bg-[#58CC02] cursor-pointer transition-all"
            style={{ boxShadow: '0 4px 0 0 #46a302' }}
            aria-label="Start lesson"
          >
            Let's go! 🚀
          </motion.button>

          {/* Skip intro — subtle, for returning learners */}
          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              aria-label="Skip intro"
            >
              Already know these? Skip intro →
            </button>
          )}
        </div>
      </div>

      {/* Tip below card */}
      <p className="text-center text-xs text-slate-400 mt-3">
        You'll earn ☀️ Sun Drops as you practise each phrase
      </p>
    </motion.div>
  );
};

export default LessonIntroCard;
