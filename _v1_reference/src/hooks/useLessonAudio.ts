/**
 * LingoFriends - Lesson Audio Hook
 *
 * A React hook for managing TTS audio during a lesson.
 *
 * Features:
 * - Pre-generates all lesson audio on mount (parallel, background)
 * - Auto-plays audio on INFO steps after a short delay
 * - Provides replay functionality for all steps
 * - Stops audio cleanly on step change or unmount
 * - Never blocks lesson progress — audio failures are silent
 *
 * Bug fixes (Task 2.3.3):
 * - Bug 3: Added pregen-complete retry effect so step 0 auto-plays
 *   even when pre-generation finishes after the initial 800ms timer
 * - Bug 9: autoPlayQueuedForStepRef prevents double-play; the key prop
 *   on AudioReplayButton in LessonView.tsx resets the spinner per-step
 *
 * @module useLessonAudio
 * @see docs/phase-1.3-activity-improvements/task-2-tts-autoplay-caching.md
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  preGenerateLessonAudio,
  getOrGenerateAudio,
  type ChunkAudio,
  type ChunkAudioRequest,
} from '../services/audioCacheService';
import { playAudio, stopAudio } from '../../services/ttsService';
import type { LessonPlan, LessonStep } from '../types/game';
import { GameActivityType } from '../types/game';
import type { TargetLanguage } from '../../types';

// ============================================
// TYPES
// ============================================

/**
 * Options for the useLessonAudio hook.
 */
export interface UseLessonAudioOptions {
  /** The full lesson plan */
  lesson: LessonPlan;
  /** Current step index */
  currentStepIndex: number;
  /** Target language for TTS voice selection */
  targetLanguage: TargetLanguage;
  /** Whether to auto-play on INFO steps (default: true) */
  autoPlay?: boolean;
  /** Delay before auto-play in ms (default: 800) */
  autoPlayDelay?: number;
}

/**
 * Return type for the useLessonAudio hook.
 */
export interface UseLessonAudioReturn {
  /** Whether audio is currently playing */
  isAudioPlaying: boolean;
  /** Whether audio is loading (generating or fetching) */
  isAudioLoading: boolean;
  /** Whether pre-generation is complete */
  isPregenComplete: boolean;
  /** Play/replay the audio for the current step's chunk */
  playChunkAudio: () => Promise<void>;
  /** Stop any currently playing audio */
  stopChunkAudio: () => void;
  /** Whether the current step has audio available */
  hasAudio: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract all target language phrases from a lesson plan.
 * Used for pre-generation.
 */
function extractChunkPhrases(
  lesson: LessonPlan,
  language: TargetLanguage,
): ChunkAudioRequest[] {
  const phrases: ChunkAudioRequest[] = [];
  const seen = new Set<string>();

  for (const step of lesson.steps) {
    const text = extractStepPhrase(step);
    if (text && !seen.has(text)) {
      seen.add(text);
      phrases.push({
        text,
        language,
        // chunkId would come from activity metadata if available
        chunkId: (step.activity as any)?.focusChunkId,
      });
    }
  }

  return phrases;
}

/**
 * Extract the target language phrase from a lesson step.
 *
 * Strategy:
 * - INFO steps: Look for the chunk text in content/title
 * - MULTIPLE_CHOICE: The question often contains the phrase
 * - TRANSLATE: sourcePhrase is the target language
 * - FILL_BLANK: The sentence contains the phrase
 * - MATCHING: Each pair's left side is target language
 * - WORD_ARRANGE: targetSentence is the phrase
 *
 * Returns null if no clear target language phrase is found.
 */
function extractStepPhrase(step: LessonStep): string | null {
  const activity = step.activity;
  if (!activity) return null;

  // Prefer explicit audio metadata (set during generation)
  const audioPhrase = (activity as any).__audioPhrase;
  if (audioPhrase) return audioPhrase;

  switch (activity.type) {
    case GameActivityType.INFO:
      // INFO steps should have the chunk as title
      return activity.title || null;

    case GameActivityType.TRANSLATE:
      // For TRANSLATE, the sourcePhrase is what we want to hear
      // But we want to play the TARGET language, which is correctAnswer
      return activity.correctAnswer || activity.sourcePhrase || null;

    case GameActivityType.FILL_BLANK:
      // The complete sentence with the blank filled
      if (activity.sentence && activity.correctAnswer) {
        return activity.sentence.replace('___', activity.correctAnswer);
      }
      return activity.correctAnswer || null;

    case GameActivityType.WORD_ARRANGE:
      return activity.targetSentence || null;

    case GameActivityType.MULTIPLE_CHOICE:
    case GameActivityType.TRUE_FALSE: {
      // For these, extract the target phrase from the question
      // Questions like: What does "Bonjour" mean? → extract "Bonjour"
      const question = activity.question || activity.statement || '';
      const match = question.match(/"([^"]+)"/);
      if (match) {
        // Check if the matched text looks like target language (non-ASCII chars, etc.)
        const extracted = match[1];
        // Simple heuristic: if it has non-ASCII chars or common target lang patterns
        if (/[^\x00-\x7F]/.test(extracted) || extracted.length > 0) {
          return extracted;
        }
      }
      return null;
    }

    case GameActivityType.MATCHING:
      // Return the first pair's left side (target language)
      return activity.pairs?.[0]?.left || null;

    case GameActivityType.COACHING_CHAT:
      // For coaching steps, return the target phrase for replay button
      // The coaching monologue itself is handled separately in extractAllAudioPhrases
      return (activity as any).targetPhrase || null;

    default:
      return null;
  }
}

/**
 * Extract coaching text for TTS playback.
 *
 * coachingText is AI-generated introductory text spoken by the NPC/Lingo
 * mascot at the start of each step. It's in the user's native language and
 * provides context, motivation, and personalisation.
 *
 * Bug fix: For COACHING_CHAT steps the coachingText lives on the ActivityConfig
 * (step.activity.coachingText), NOT on the LessonStep itself. Previously only
 * step.coachingText was checked, so the first COACHING_CHAT step (always step 0)
 * was silently skipped, causing no TTS on the very first teaching step.
 *
 * Priority order:
 *   1. step.coachingText         — set by legacy assembler or direct override
 *   2. step.activity.coachingText — set by Phase 3 assembler on COACHING_CHAT steps
 *
 * @param step - The lesson step
 * @returns The coaching text to speak, or null if not available
 */
function extractCoachingText(step: LessonStep): string | null {
  // 1. Check top-level coachingText on the step (legacy path / Task 2.0.07)
  if ((step as any).coachingText && typeof (step as any).coachingText === 'string') {
    return (step as any).coachingText;
  }
  // 2. Check coachingText on the activity itself (Phase 3 COACHING_CHAT steps)
  //    This is where the assembler stores it for all COACHING_CHAT activities.
  if (
    step.activity &&
    (step.activity as any).coachingText &&
    typeof (step.activity as any).coachingText === 'string'
  ) {
    return (step.activity as any).coachingText;
  }
  return null;
}

/**
 * Extract all audio phrases from a lesson plan including coaching text.
 * Used for pre-generation.
 */
function extractAllAudioPhrases(
  lesson: LessonPlan,
  language: TargetLanguage,
): ChunkAudioRequest[] {
  const phrases: ChunkAudioRequest[] = [];
  const seen = new Set<string>();

  for (const step of lesson.steps) {
    // Add coaching text for pre-generation.
    //
    // PHASE 3 RULE 9: ALL lesson TTS uses the TARGET language voice.
    // Even though coaching text is written in the native language with
    // target language examples embedded, we use the target language voice.
    // This produces perfect pronunciation of the target language words,
    // and a charming accent on native language words — exactly what we want.
    // The ONLY exception is the Help chat, which is not lesson audio.
    const coachingText = extractCoachingText(step);
    if (coachingText && !seen.has(coachingText)) {
      seen.add(coachingText);
      phrases.push({
        text: coachingText,
        language, // ← ALWAYS target language voice (Phase 3, Rule 9)
        chunkId: `coaching-${lesson.steps.indexOf(step)}`,
      });
    }

    // Add target language phrase
    const text = extractStepPhrase(step);
    if (text && !seen.has(text)) {
      seen.add(text);
      phrases.push({
        text,
        language,
        chunkId: (step.activity as any)?.focusChunkId,
      });
    }
  }

  return phrases;
}

// ============================================
// MAIN HOOK
// ============================================

/**
 * Hook for managing TTS audio during a lesson.
 *
 * @example
 * const {
 *   isAudioPlaying,
 *   isAudioLoading,
 *   isPregenComplete,
 *   playChunkAudio,
 *   stopChunkAudio,
 *   hasAudio,
 * } = useLessonAudio({
 *   lesson,
 *   currentStepIndex,
 *   targetLanguage: 'French',
 *   autoPlay: true,
 * });
 */
export function useLessonAudio({
  lesson,
  currentStepIndex,
  targetLanguage,
  autoPlay = true,
  autoPlayDelay = 800,
}: UseLessonAudioOptions): UseLessonAudioReturn {
  // ──────────────────────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────────────────────
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPregenComplete, setIsPregenComplete] = useState(false);

  // Audio map: chunk text → ChunkAudio
  const audioMapRef = useRef<Map<string, ChunkAudio>>(new Map());

  // Track current step to detect changes (sentinel: -1)
  const prevStepRef = useRef<number>(-1);

  // Auto-play timer ref for cleanup
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  /**
   * Tracks the step index for which we have already queued an auto-play.
   * Initialised to -2 (different from prevStepRef sentinel of -1)
   * so step 0 is always a fresh candidate on first mount.
   *
   * Pattern:
   * - When the step-change effect queues a play, it sets this to `currentStepIndex`.
   * - The pregen-complete retry checks this ref. If it already equals
   *   `currentStepIndex`, the initial timer beat pregen and we skip the retry.
   * - If it doesn't match, pregen finished before/after the timer fired but
   *   auto-play hasn't been queued yet — the retry fires.
   */
  const autoPlayQueuedForStepRef = useRef<number>(-2);

  // ──────────────────────────────────────────────────────────────
  // Pre-generate all lesson audio on mount
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    async function pregenerate() {
      // Extract ALL audio phrases — includes coaching text (for COACHING_CHAT steps)
      // AND target language phrases (for INFO, TRANSLATE, etc.).
      //
      // Phase 3 fix: previously called extractChunkPhrases() which skipped coachingText,
      // causing COACHING_CHAT steps to hit the TTS API on-demand (1-2s delay/spinner
      // on the first coaching step). extractAllAudioPhrases() includes both, so every
      // coaching intro plays instantly from cache. All audio uses the target language
      // voice — Rule 9 (TTS language lock) is enforced inside extractAllAudioPhrases.
      const chunks = extractAllAudioPhrases(lesson, targetLanguage);

      if (chunks.length === 0) {
        console.log('[useLessonAudio] No chunks found for pre-generation');
        if (isMountedRef.current) {
          setIsPregenComplete(true);
        }
        return;
      }

      console.log(`[useLessonAudio] Pre-generating audio for ${chunks.length} phrases (including coaching text)...`);

      const audioMap = await preGenerateLessonAudio(chunks);

      if (isMountedRef.current) {
        audioMapRef.current = audioMap;
        setIsPregenComplete(true);
        console.log(`[useLessonAudio] Pre-generation complete: ${audioMap.size} phrases ready`);
      }
    }

    pregenerate();

    return () => {
      isMountedRef.current = false;
    };
  }, [lesson, targetLanguage]);

  // ──────────────────────────────────────────────────────────────
  // Play audio for a specific phrase
  // ──────────────────────────────────────────────────────────────
  const playPhraseAudio = useCallback(async (phraseText: string) => {
    if (!phraseText) return;

    // Check if we have the audio pre-generated
    let audio = audioMapRef.current.get(phraseText);

    if (!audio) {
      // Audio not pre-generated — try generating on-demand
      console.log(`[useLessonAudio] Generating audio on-demand for "${phraseText.substring(0, 20)}..."`);
      setIsAudioLoading(true);

      const freshAudio = await getOrGenerateAudio(phraseText, targetLanguage);

      if (!isMountedRef.current) {
        setIsAudioLoading(false);
        return;
      }

      if (freshAudio) {
        audioMapRef.current.set(phraseText, freshAudio);
        audio = freshAudio;
      }

      setIsAudioLoading(false);
    }

    if (!audio) {
      console.warn('[useLessonAudio] Could not get audio for:', phraseText);
      return;
    }

    // Stop any currently playing audio
    stopAudio();

    // Play the audio
    setIsAudioPlaying(true);
    await playAudio(audio.audioBase64, () => {
      if (isMountedRef.current) {
        setIsAudioPlaying(false);
      }
    });
  }, [targetLanguage]);

  // ──────────────────────────────────────────────────────────────
  // Auto-play on step change (Task 2.0.07: coachingText for ALL steps)
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Clear any pending auto-play timer
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }

    // Stop any currently playing audio when step changes
    stopAudio();
    setIsAudioPlaying(false);

    // Only auto-play if:
    // 1. autoPlay is enabled
    // 2. Step actually changed (not initial mount re-render)
    if (!autoPlay || currentStepIndex === prevStepRef.current) {
      prevStepRef.current = currentStepIndex;
      return;
    }

    prevStepRef.current = currentStepIndex;
    const currentStep = lesson.steps[currentStepIndex];
    if (!currentStep) return;

    // Task 2.0.07: Play coaching text on ALL steps
    // coachingText is AI-generated intro text spoken by the NPC teacher
    const coachingText = extractCoachingText(currentStep);

    if (coachingText) {
      // Mark as queued so the pregen-complete retry doesn't double-play
      autoPlayQueuedForStepRef.current = currentStepIndex;

      // Auto-play coaching text after delay (gives UI time to settle)
      autoPlayTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          playPhraseAudio(coachingText);
        }
      }, autoPlayDelay);
    } else {
      // Fallback: For INFO steps without coachingText, play the chunk phrase
      if (currentStep?.activity?.type === GameActivityType.INFO) {
        const phraseText = extractStepPhrase(currentStep);
        if (phraseText) {
          // Mark as queued so the pregen-complete retry doesn't double-play
          autoPlayQueuedForStepRef.current = currentStepIndex;

          autoPlayTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              playPhraseAudio(phraseText);
            }
          }, autoPlayDelay);
        }
      }
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [currentStepIndex, autoPlay, autoPlayDelay, lesson.steps, playPhraseAudio]);

  // ──────────────────────────────────────────────────────────────
  // Pregen-complete retry — closes the step-0 race condition (Bug 3 fix)
  //
  // Race condition: on first render the step-change effect fires an
  // auto-play timer at T+800ms, but audioMapRef may still be empty
  // (pre-gen takes 1-3 s for a full lesson).  playPhraseAudio falls
  // back to on-demand generation which works — UNLESS the API is slow
  // or returns null, in which case step 0 silently gets no audio.
  //
  // When pre-generation finishes, check whether auto-play has already
  // been queued for the current step.  If not, queue it now — the audio
  // is in the map and will play immediately (no API call needed).
  //
  // autoPlayQueuedForStepRef is the guard:
  //   - If it equals currentStepIndex → the 800ms timer already queued
  //     a play before pregen finished.  Skip to avoid double-play.
  //   - Otherwise → pregen beat the timer (or timer failed).  Play now.
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPregenComplete || !autoPlay) return;

    // Already queued a play for this step index — don't double-play
    if (autoPlayQueuedForStepRef.current === currentStepIndex) return;

    const currentStep = lesson.steps[currentStepIndex];
    if (!currentStep) return;

    // Determine the text to play (same priority as the step-change effect)
    const coachingText = extractCoachingText(currentStep);
    const isInfoStep = currentStep.activity?.type === GameActivityType.INFO;
    const phraseText = extractStepPhrase(currentStep);

    const textToPlay = coachingText || (isInfoStep ? phraseText : null);
    if (!textToPlay) return;

    // Mark queued and schedule play — audio is in the map so latency is ~0
    autoPlayQueuedForStepRef.current = currentStepIndex;

    autoPlayTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        playPhraseAudio(textToPlay);
      }
    }, 300); // Short delay so UI has settled before audio starts

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
    // Intentionally narrow deps: only fires once when pregen completes.
    // currentStepIndex et al. are accessed via closure refs, not reactive state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPregenComplete]);

  // ──────────────────────────────────────────────────────────────
  // Cleanup on unmount
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopAudio();
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Public interface
  // ──────────────────────────────────────────────────────────────

  /**
   * Play or replay the current step's audio.
   * Toggles off if already playing.
   */
  const playChunkAudio = useCallback(async () => {
    if (isAudioPlaying) {
      // Toggle: stop if playing
      stopAudio();
      setIsAudioPlaying(false);
      return;
    }

    const currentStep = lesson.steps[currentStepIndex];
    if (!currentStep) return;

    const phraseText = extractStepPhrase(currentStep);
    if (!phraseText) {
      console.log('[useLessonAudio] No phrase found for current step');
      return;
    }

    await playPhraseAudio(phraseText);
  }, [isAudioPlaying, currentStepIndex, lesson.steps, playPhraseAudio]);

  /**
   * Stop any currently playing audio.
   */
  const stopChunkAudio = useCallback(() => {
    stopAudio();
    setIsAudioPlaying(false);
  }, []);

  // Check if current step has audio available
  const currentStep = lesson.steps[currentStepIndex];
  const phraseText = currentStep ? extractStepPhrase(currentStep) : null;
  const hasAudio = phraseText !== null;

  return {
    isAudioPlaying,
    isAudioLoading,
    isPregenComplete,
    playChunkAudio,
    stopChunkAudio,
    hasAudio,
  };
}

export default useLessonAudio;
