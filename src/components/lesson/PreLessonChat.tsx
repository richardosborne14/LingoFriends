/**
 * LingoFriends — PreLessonChat Component (Phase 3, Task 3.3)
 *
 * A short personalisation chat shown BEFORE lesson generation.
 * Professor Finch asks 1-3 quick questions to understand the learner's
 * interests. The answers are used to generate personalised chunk examples.
 *
 * RULES FOLLOWED:
 *   Rule 9:  "Skip" is always visible. Closing or skipping calls onComplete(null).
 *   Rule 12: Uses the FAST model internally (via preLessonChatService).
 *   Rule 13: Age-appropriate UI:
 *     - 7-10:  Quick-reply buttons only, 1 question
 *     - 11-14: Quick replies + optional text input, 2 questions
 *     - 15-18: Text input primary, 2-3 questions
 *
 * INTERACTION FLOW:
 *   1. Loading: fetching first question from AI
 *   2. Waiting: show question + quick replies + optional text input
 *   3. Thinking: AI generating follow-up (or summarising)
 *   4. Done: calls onComplete(personalContext)
 *
 * @module PreLessonChat
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  preLessonChatService,
  type ChatExchange,
  type ChatQuestion,
  type PreLessonChatOptions,
} from '../../services/preLessonChatService';

// ============================================================================
// TYPES
// ============================================================================

interface PreLessonChatProps {
  /** Lesson topic, e.g. "Greetings & Basics" */
  lessonTopic: string;
  /** Target language name, e.g. "German" */
  targetLanguageName: string;
  /** Learner's age group for exchange count and UI style */
  ageGroup?: '7-10' | '11-14' | '15-18';
  /** Known interests — avoids asking about things we already know */
  knownInterests?: string[];
  /**
   * Called when the chat is complete.
   * @param personalContext - Compact summary string, or null if skipped
   */
  onComplete: (personalContext: string | null) => void;
}

type ChatStatus = 'loading' | 'waiting' | 'thinking' | 'done';

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PreLessonChat — short personalisation chat before lesson generation.
 *
 * @example
 * <PreLessonChat
 *   lessonTopic="Greetings"
 *   targetLanguageName="German"
 *   ageGroup="11-14"
 *   onComplete={(ctx) => setPersonalContext(ctx)}
 * />
 */
export const PreLessonChat: React.FC<PreLessonChatProps> = ({
  lessonTopic,
  targetLanguageName,
  ageGroup = '11-14',
  knownInterests,
  onComplete,
}) => {
  const [status, setStatus] = useState<ChatStatus>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<ChatQuestion | null>(null);
  const [exchanges, setExchanges] = useState<ChatExchange[]>([]);
  const [textInput, setTextInput] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const textRef = useRef<HTMLInputElement>(null);

  // Whether to show the text input at all (age 11+)
  const showTextInput = ageGroup !== '7-10';

  const options: PreLessonChatOptions = {
    lessonTopic,
    targetLanguageName,
    ageGroup,
    knownInterests,
  };

  // ── Load first question on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    preLessonChatService
      .getFirstQuestion(options)
      .then(q => {
        if (!cancelled) {
          setCurrentQuestion(q);
          setStatus('waiting');
        }
      })
      .catch(() => {
        // AI failed — skip gracefully (Rule 9)
        if (!cancelled) onComplete(null);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Record the learner's answer and decide whether to ask a follow-up
   * or finalise the context.
   */
  async function handleAnswer(answer: string) {
    if (!currentQuestion || !answer.trim()) return;

    const newExchange: ChatExchange = { question: currentQuestion.text, answer };
    const allExchanges = [...exchanges, newExchange];
    setExchanges(allExchanges);
    setTextInput('');
    setStatus('thinking');

    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);

    try {
      // Try to get a follow-up question
      const followUp = await preLessonChatService.getFollowUpQuestion(
        options, allExchanges, nextIndex
      );

      if (followUp) {
        // More questions to ask
        setCurrentQuestion(followUp);
        setStatus('waiting');
        setTimeout(() => textRef.current?.focus(), 100);
      } else {
        // No more questions — summarise and finish
        await finalise(allExchanges);
      }
    } catch {
      // Fallback: skip summarisation, build simple context (Rule 9)
      await finalise(allExchanges);
    }
  }

  /**
   * Summarise all exchanges and call onComplete.
   */
  async function finalise(allExchanges: ChatExchange[]) {
    setStatus('done');
    try {
      const summary = await preLessonChatService.summariseContext(allExchanges, lessonTopic);
      onComplete(summary || null);
    } catch {
      // If summarisation fails, build a simple fallback (Rule 9)
      const answers = allExchanges.map(e => e.answer).join('; ');
      onComplete(answers ? `The learner mentioned: ${answers}.` : null);
    }
  }

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md mx-auto">
      {/* NPC header */}
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
          className="text-5xl"
        >
          🦉
        </motion.div>
        <div>
          <p className="font-bold text-stone-800 text-base">Professor Finch</p>
          <p className="text-stone-500 text-sm">
            Before we start, let me make this lesson just for you!
          </p>
        </div>
      </div>

      {/* Chat bubble area */}
      <div className="bg-white rounded-3xl shadow-lg border-2 border-amber-100 overflow-hidden">

        {/* Loading state */}
        {status === 'loading' && (
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-stone-400">
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                className="w-2 h-2 bg-amber-400 rounded-full inline-block"
              />
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                className="w-2 h-2 bg-amber-400 rounded-full inline-block"
              />
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                className="w-2 h-2 bg-amber-400 rounded-full inline-block"
              />
            </div>
            <p className="text-stone-400 text-sm mt-2">Thinking of a question...</p>
          </div>
        )}

        {/* Thinking (loading follow-up or summarising) */}
        {status === 'thinking' && (
          <div className="p-6 text-center">
            <p className="text-amber-600 font-bold text-sm mb-2">
              {questionIndex === 1 ? 'Personalising your lesson... ✨' : 'Got it! Making your lesson special...'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                className="w-2 h-2 bg-amber-400 rounded-full inline-block"
              />
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                className="w-2 h-2 bg-amber-400 rounded-full inline-block"
              />
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                className="w-2 h-2 bg-amber-400 rounded-full inline-block"
              />
            </div>
          </div>
        )}

        {/* Waiting for answer */}
        {status === 'waiting' && currentQuestion && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5"
            >
              {/* Professor Finch's question bubble */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
                <p className="text-stone-800 font-medium text-base leading-relaxed">
                  {currentQuestion.text}
                </p>
              </div>

              {/* Quick reply buttons */}
              {currentQuestion.quickReplies && currentQuestion.quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {currentQuestion.quickReplies.map((reply) => (
                    <motion.button
                      key={reply}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAnswer(reply)}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full text-amber-800 font-medium text-sm transition-colors"
                    >
                      {reply}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Text input for age 11+ */}
              {showTextInput && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (textInput.trim()) handleAnswer(textInput.trim());
                  }}
                  className="flex gap-2 mt-2"
                >
                  <input
                    ref={textRef}
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={ageGroup === '15-18' ? 'Type your answer...' : 'Or type here...'}
                    maxLength={100}
                    className="flex-1 px-4 py-2 rounded-xl border-2 border-stone-200 focus:border-amber-400 outline-none text-sm text-stone-700 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim()}
                    className="px-4 py-2 bg-amber-400 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl font-bold text-sm transition-colors"
                  >
                    →
                  </button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Done state — brief success message before parent transitions away */}
        {status === 'done' && (
          <div className="p-6 text-center">
            <p className="text-2xl mb-2">✨</p>
            <p className="text-stone-700 font-bold">Great! Personalising your lesson...</p>
          </div>
        )}
      </div>

      {/* Skip button — always visible (Rule 9: never blocking) */}
      {(status === 'loading' || status === 'waiting') && (
        <button
          onClick={() => onComplete(null)}
          className="w-full mt-3 py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          Skip personalisation →
        </button>
      )}
    </div>
  );
};

export default PreLessonChat;
