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
    case GameActivityType.TRUE_FALSE:
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

    case GameActivityType.MATCHING:
      // Return the first pair's left side (target language)
      return activity.pairs?.[0]?.left || null;

    default:
      return null;
  }
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

  // Track current step to detect changes
  const prevStepRef = useRef<number>(-1);

  // Auto-play timer ref for cleanup
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  // ──────────────────────────────────────────────────────────────
  // Pre-generate all lesson audio on mount
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    async function pregenerate() {
      // Extract all target language phrases from the lesson
      const chunks = extractChunkPhrases(lesson, targetLanguage);

      if (chunks.length === 0) {
        console.log('[useLessonAudio] No chunks found for pre-generation');
        if (isMountedRef.current) {
          setIsPregenComplete(true);
        }
        return;
      }

      console.log(`[useLessonAudio] Pre-generating audio for ${chunks.length} chunks...`);

      const audioMap = await preGenerateLessonAudio(chunks);

      if (isMountedRef.current) {
        audioMapRef.current = audioMap;
        setIsPregenComplete(true);
        console.log(`[useLessonAudio] Pre-generation complete: ${audioMap.size} chunks ready`);
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
  // Auto-play on INFO step change
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
    // 3. Current step is an INFO step
    if (!autoPlay || currentStepIndex === prevStepRef.current) {
      prevStepRef.current = currentStepIndex;
      return;
    }

    prevStepRef.current = currentStepIndex;
    const currentStep = lesson.steps[currentStepIndex];

    if (currentStep?.activity?.type === GameActivityType.INFO) {
      const phraseText = extractStepPhrase(currentStep);
      if (phraseText) {
        // Auto-play after delay (gives the child time to read the tutor bubble)
        autoPlayTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            playPhraseAudio(phraseText);
          }
        }, autoPlayDelay);
      }
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [currentStepIndex, autoPlay, autoPlayDelay, lesson.steps, playPhraseAudio]);

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