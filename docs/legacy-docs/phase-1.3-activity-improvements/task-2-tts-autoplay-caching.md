# Task: TTS Auto-Play & Audio Caching

**Status:** Not Started  
**Phase:** Post-1.2 (Lesson Quality)  
**Dependencies:** Task 4 (Voice Services — complete), Task 1.2.8 (Lesson Generator V2)  
**Estimated Time:** 5–7 hours  
**Priority:** High — audio modelling is critical for language acquisition

---

## Problem Statement

Duolingo's greatest strength is constant oral modelling: you HEAR every phrase before and during practice. LingoFriends has TTS working (`ttsService.ts` with Google Cloud TTS Journey voices) but it's only used on-demand via a speaker button. The learning science is clear: children need to hear the target language phrase modelled **automatically** when it's first introduced, and be able to replay it on demand.

Currently:
- TTS exists and works well, including mixed-language pronunciation
- The `chunk_library` schema has an `audio_url` field (unused)
- Audio is generated on every playback — wasteful and slow
- No audio auto-plays during lessons

**Goal:** Auto-play TTS when teaching new chunks, cache generated audio in PocketBase so it's instant on replay, and make audio a first-class element of every lesson.

---

## Objectives

1. **Auto-play TTS on INFO steps** — When a lesson step introduces a new chunk, automatically play the target language audio after a short delay
2. **Cache audio in PocketBase** — Store generated TTS audio (base64 MP3) on the `chunk_library` record so it never needs regenerating
3. **Replay button on all steps** — Every step that mentions a target language phrase should have a prominent, kid-friendly replay button
4. **Pre-generate audio during lesson generation** — Generate TTS for all chunks in the lesson plan before the lesson starts, so playback is instant
5. **Audio state management** — Clean hook for managing playback across lesson steps

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                 Lesson Generation                     │
│  ┌────────────────────────────────────────────────┐  │
│  │ lessonGeneratorV2.ts                           │  │
│  │                                                │  │
│  │ After generating lesson plan:                  │  │
│  │ 1. Collect all target language phrases         │  │
│  │ 2. Check chunk_library for cached audio        │  │
│  │ 3. Generate TTS for uncached phrases           │  │
│  │ 4. Store audio on chunk_library records        │  │
│  │ 5. Attach audio data to lesson steps           │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│                 Lesson Playback                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ useLessonAudio.ts (NEW hook)                   │  │
│  │                                                │  │
│  │ - Manages audio queue for current step         │  │
│  │ - Auto-plays on INFO step mount                │  │
│  │ - Exposes replay() for manual trigger          │  │
│  │ - Handles interruption when step changes       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ LessonView.tsx / ActivityRouter.tsx             │  │
│  │                                                │  │
│  │ - Shows speaker button on every step           │  │
│  │ - INFO steps: auto-play with visual indicator  │  │
│  │ - Quiz steps: replay on demand                 │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1 — Audio Cache Service

**File:** `src/services/audioCacheService.ts` (NEW)

This service manages the relationship between chunks and their cached audio.

```typescript
// src/services/audioCacheService.ts

import { pb } from '../../services/pocketbaseService';
import { generateSpeech } from '../../services/ttsService';
import type { TargetLanguage } from '../../types';

/**
 * Audio data for a chunk, either from cache or freshly generated.
 */
export interface ChunkAudio {
  /** The chunk text this audio is for */
  text: string;
  /** Base64 encoded MP3 audio */
  audioBase64: string;
  /** Whether this was loaded from cache (true) or generated fresh (false) */
  fromCache: boolean;
  /** Chunk library record ID (for saving back to cache) */
  chunkId?: string;
}

/**
 * In-memory cache for the current session.
 * Maps chunk text → base64 audio.
 * This prevents redundant PocketBase lookups within a single session.
 */
const sessionCache = new Map<string, string>();

/**
 * Check if a chunk has cached audio in PocketBase.
 * Returns the base64 audio string if found, null otherwise.
 *
 * @param chunkId - PocketBase record ID of the chunk
 */
export async function getCachedAudio(chunkId: string): Promise<string | null> {
  // Check session cache first
  if (sessionCache.has(chunkId)) {
    return sessionCache.get(chunkId)!;
  }

  try {
    const record = await pb.collection('chunk_library').getOne(chunkId);
    const audioUrl = record.audio_url;

    if (audioUrl && audioUrl.length > 100) {
      // It's a base64 string stored directly
      sessionCache.set(chunkId, audioUrl);
      return audioUrl;
    }

    return null;
  } catch (error) {
    console.warn('[audioCacheService] Failed to fetch cached audio:', error);
    return null;
  }
}

/**
 * Save generated audio back to the chunk_library record.
 * Fire-and-forget — audio plays immediately, caching happens in background.
 *
 * @param chunkId - PocketBase record ID
 * @param audioBase64 - Base64 encoded MP3
 */
export async function cacheAudio(chunkId: string, audioBase64: string): Promise<void> {
  // Update session cache immediately
  sessionCache.set(chunkId, audioBase64);

  // Save to PocketBase in background
  try {
    await pb.collection('chunk_library').update(chunkId, {
      audio_url: audioBase64,
    });
    console.log(`[audioCacheService] Cached audio for chunk ${chunkId}`);
  } catch (error) {
    // Non-fatal — audio still plays, just won't be cached for next time
    console.warn('[audioCacheService] Failed to cache audio:', error);
  }
}

/**
 * Generate (or retrieve from cache) audio for a chunk.
 *
 * Flow:
 * 1. Check session cache (instant)
 * 2. Check PocketBase cache (fast)
 * 3. Generate via Google TTS (slow, ~500ms)
 * 4. Cache the result for future use
 *
 * @param text - The target language text to synthesize
 * @param language - Target language for voice selection
 * @param chunkId - Optional PocketBase chunk ID for caching
 */
export async function getOrGenerateAudio(
  text: string,
  language: TargetLanguage,
  chunkId?: string,
): Promise<ChunkAudio | null> {
  // 1. Check session cache
  const cacheKey = chunkId || text;
  if (sessionCache.has(cacheKey)) {
    return {
      text,
      audioBase64: sessionCache.get(cacheKey)!,
      fromCache: true,
      chunkId,
    };
  }

  // 2. Check PocketBase cache
  if (chunkId) {
    const cached = await getCachedAudio(chunkId);
    if (cached) {
      return {
        text,
        audioBase64: cached,
        fromCache: true,
        chunkId,
      };
    }
  }

  // 3. Generate fresh audio via Google TTS
  const result = await generateSpeech(text, { language });
  if (!result) {
    console.warn('[audioCacheService] TTS generation failed for:', text);
    return null;
  }

  // 4. Cache for future use
  sessionCache.set(cacheKey, result.audioContent);
  if (chunkId) {
    // Fire-and-forget background cache
    cacheAudio(chunkId, result.audioContent).catch(() => {});
  }

  return {
    text,
    audioBase64: result.audioContent,
    fromCache: false,
    chunkId,
  };
}

/**
 * Pre-generate audio for all chunks in a lesson.
 * Called during lesson loading, before the lesson starts.
 *
 * Generates all audio in parallel for speed.
 * Any failures are silent — the lesson still works, just without audio for that chunk.
 *
 * @param chunks - Array of { text, language, chunkId } for each phrase
 * @returns Map of chunk text → ChunkAudio
 */
export async function preGenerateLessonAudio(
  chunks: Array<{ text: string; language: TargetLanguage; chunkId?: string }>,
): Promise<Map<string, ChunkAudio>> {
  const audioMap = new Map<string, ChunkAudio>();

  // Deduplicate by text (same phrase might appear in multiple steps)
  const uniqueChunks = new Map<string, typeof chunks[0]>();
  for (const chunk of chunks) {
    if (!uniqueChunks.has(chunk.text)) {
      uniqueChunks.set(chunk.text, chunk);
    }
  }

  // Generate all in parallel (Google TTS handles concurrency fine)
  const promises = Array.from(uniqueChunks.values()).map(async (chunk) => {
    const audio = await getOrGenerateAudio(chunk.text, chunk.language, chunk.chunkId);
    if (audio) {
      audioMap.set(chunk.text, audio);
    }
  });

  await Promise.allSettled(promises);

  console.log(
    `[audioCacheService] Pre-generated audio: ${audioMap.size}/${uniqueChunks.size} successful`
  );

  return audioMap;
}

/**
 * Clear the session cache.
 * Call when user logs out or switches language.
 */
export function clearSessionCache(): void {
  sessionCache.clear();
}
```

---

### Step 2 — Lesson Audio Hook

**File:** `src/hooks/useLessonAudio.ts` (NEW)

A clean React hook that manages audio for the current lesson step.

```typescript
// src/hooks/useLessonAudio.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  preGenerateLessonAudio,
  type ChunkAudio,
} from '../services/audioCacheService';
import { playAudio, stopAudio, isPlaying } from '../../services/ttsService';
import type { LessonPlan, LessonStep } from '../types/game';
import { GameActivityType } from '../types/game';
import type { TargetLanguage } from '../../types';

interface UseLessonAudioOptions {
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

interface UseLessonAudioReturn {
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

/**
 * Hook for managing TTS audio during a lesson.
 *
 * Features:
 * - Pre-generates all lesson audio on mount (parallel, background)
 * - Auto-plays audio on INFO steps after a short delay
 * - Provides replay functionality for all steps
 * - Stops audio cleanly on step change or unmount
 * - Never blocks lesson progress — audio failures are silent
 */
export function useLessonAudio({
  lesson,
  currentStepIndex,
  targetLanguage,
  autoPlay = true,
  autoPlayDelay = 800,
}: UseLessonAudioOptions): UseLessonAudioReturn {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPregenComplete, setIsPregenComplete] = useState(false);

  // Audio map: chunk text → ChunkAudio
  const audioMapRef = useRef<Map<string, ChunkAudio>>(new Map());

  // Track current step to detect changes
  const prevStepRef = useRef<number>(-1);

  // Auto-play timer ref for cleanup
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ──────────────────────────────────────────────────────────────
  // Pre-generate all lesson audio on mount
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function pregenerate() {
      // Extract all target language phrases from the lesson
      const chunks = extractChunkPhrases(lesson, targetLanguage);

      if (chunks.length === 0) {
        setIsPregenComplete(true);
        return;
      }

      const audioMap = await preGenerateLessonAudio(chunks);

      if (!cancelled) {
        audioMapRef.current = audioMap;
        setIsPregenComplete(true);
      }
    }

    pregenerate();

    return () => { cancelled = true; };
  }, [lesson, targetLanguage]);

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
    // 4. Pre-generation is complete (or at least this chunk is ready)
    if (!autoPlay || currentStepIndex === prevStepRef.current) {
      prevStepRef.current = currentStepIndex;
      return;
    }

    prevStepRef.current = currentStepIndex;
    const currentStep = lesson.steps[currentStepIndex];

    if (currentStep?.activity?.type === GameActivityType.INFO) {
      // Auto-play after delay (gives the child time to read the tutor bubble)
      autoPlayTimerRef.current = setTimeout(() => {
        playCurrentStepAudio();
      }, autoPlayDelay);
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [currentStepIndex, autoPlay, isPregenComplete]);

  // ──────────────────────────────────────────────────────────────
  // Cleanup on unmount
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAudio();
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Play audio for the current step
  // ──────────────────────────────────────────────────────────────
  const playCurrentStepAudio = useCallback(async () => {
    const currentStep = lesson.steps[currentStepIndex];
    if (!currentStep) return;

    const phraseText = extractStepPhrase(currentStep);
    if (!phraseText) return;

    const audio = audioMapRef.current.get(phraseText);
    if (!audio) {
      // Audio not pre-generated — try generating on-demand
      setIsAudioLoading(true);
      const { getOrGenerateAudio } = await import('../services/audioCacheService');
      const freshAudio = await getOrGenerateAudio(phraseText, targetLanguage);
      setIsAudioLoading(false);

      if (freshAudio) {
        audioMapRef.current.set(phraseText, freshAudio);
        setIsAudioPlaying(true);
        await playAudio(freshAudio.audioBase64, () => setIsAudioPlaying(false));
      }
      return;
    }

    setIsAudioPlaying(true);
    await playAudio(audio.audioBase64, () => setIsAudioPlaying(false));
  }, [currentStepIndex, lesson, targetLanguage]);

  // ──────────────────────────────────────────────────────────────
  // Public interface
  // ──────────────────────────────────────────────────────────────
  const playChunkAudio = useCallback(async () => {
    if (isAudioPlaying) {
      stopAudio();
      setIsAudioPlaying(false);
      return;
    }
    await playCurrentStepAudio();
  }, [isAudioPlaying, playCurrentStepAudio]);

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

// ──────────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────────

/**
 * Extract all target language phrases from a lesson plan.
 * Used for pre-generation.
 */
function extractChunkPhrases(
  lesson: LessonPlan,
  language: TargetLanguage,
): Array<{ text: string; language: TargetLanguage; chunkId?: string }> {
  const phrases: Array<{ text: string; language: TargetLanguage; chunkId?: string }> = [];
  const seen = new Set<string>();

  for (const step of lesson.steps) {
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

  switch (activity.type) {
    case GameActivityType.INFO:
      // INFO steps should have the chunk as title or content
      return activity.title || activity.content || null;

    case GameActivityType.TRANSLATE:
      return activity.sourcePhrase || null;

    case GameActivityType.FILL_BLANK:
      // The sentence with blank filled in
      if (activity.sentence && activity.correctAnswer) {
        return activity.sentence.replace('___', activity.correctAnswer);
      }
      return null;

    case GameActivityType.WORD_ARRANGE:
      return activity.targetSentence || null;

    case GameActivityType.MULTIPLE_CHOICE:
    case GameActivityType.TRUE_FALSE:
      // For these, the target phrase might be in the question
      // But it's often in the native language — only return if
      // we have a focusChunkId linking to a chunk with known text
      return null;

    case GameActivityType.MATCHING:
      // Return the first pair's left side (target language)
      // The full matching audio would be handled differently
      return activity.pairs?.[0]?.left || null;

    default:
      return null;
  }
}
```

---

### Step 3 — Wire Audio into LessonView

**File:** `src/components/lesson/LessonView.tsx` (MODIFY)

Add the audio hook and UI elements to the existing LessonView.

```typescript
// Add import at top of file:
import { useLessonAudio } from '../../hooks/useLessonAudio';

// Inside the LessonView component, after existing state declarations:

// Audio management
const {
  isAudioPlaying,
  isAudioLoading,
  isPregenComplete,
  playChunkAudio,
  stopChunkAudio,
  hasAudio,
} = useLessonAudio({
  lesson,
  currentStepIndex: state.currentStepIndex,
  targetLanguage: profile?.targetLanguage ?? 'French', // Pass from parent
  autoPlay: true,
  autoPlayDelay: 800, // 800ms delay before auto-play on INFO steps
});
```

**Note:** `LessonView` currently receives `lesson` and callbacks as props. The `targetLanguage` needs to be passed down from `App.tsx`. Add it to `LessonViewProps`:

```typescript
export interface LessonViewProps {
  lesson: LessonPlan;
  onComplete: (result: LessonResult) => void;
  onExit: () => void;
  targetLanguage?: TargetLanguage; // NEW
}
```

---

### Step 4 — Audio Replay Button Component

**File:** `src/components/lesson/AudioReplayButton.tsx` (NEW)

A kid-friendly, animated audio button that appears on lesson steps.

```typescript
// src/components/lesson/AudioReplayButton.tsx

import React from 'react';
import { motion } from 'framer-motion';

interface AudioReplayButtonProps {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether audio is loading */
  isLoading: boolean;
  /** Callback to play or stop audio */
  onPress: () => void;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label text */
  label?: string;
}

/**
 * Kid-friendly audio replay button.
 *
 * Visual states:
 * - Idle: Speaker icon with subtle pulse animation (inviting tap)
 * - Loading: Spinning indicator
 * - Playing: Sound wave animation with glow
 *
 * Placed prominently on INFO steps and as a secondary action on quiz steps.
 */
export const AudioReplayButton: React.FC<AudioReplayButtonProps> = ({
  isPlaying,
  isLoading,
  onPress,
  size = 'md',
  label,
}) => {
  const sizeMap = {
    sm: { button: 'w-10 h-10', icon: 'text-lg', label: 'text-xs' },
    md: { button: 'w-14 h-14', icon: 'text-2xl', label: 'text-sm' },
    lg: { button: 'w-20 h-20', icon: 'text-4xl', label: 'text-base' },
  };
  const s = sizeMap[size];

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        className={`
          ${s.button} rounded-full flex items-center justify-center
          ${isPlaying
            ? 'bg-blue-500 shadow-lg shadow-blue-300'
            : 'bg-blue-100 hover:bg-blue-200'
          }
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-400
        `}
        onClick={onPress}
        disabled={isLoading}
        whileTap={{ scale: 0.9 }}
        animate={isPlaying ? {
          boxShadow: [
            '0 0 0 0 rgba(59, 130, 246, 0.4)',
            '0 0 0 12px rgba(59, 130, 246, 0)',
          ],
        } : {}}
        transition={isPlaying ? {
          duration: 1.5,
          repeat: Infinity,
        } : {}}
        aria-label={isPlaying ? 'Stop audio' : 'Play audio'}
      >
        {isLoading ? (
          // Loading spinner
          <motion.span
            className={`${s.icon}`}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            ⏳
          </motion.span>
        ) : isPlaying ? (
          // Sound wave animation
          <span className={`${s.icon} text-white`}>🔊</span>
        ) : (
          // Speaker icon
          <span className={`${s.icon} text-blue-600`}>🔈</span>
        )}
      </motion.button>

      {label && (
        <span className={`${s.label} text-stone-500 font-medium`}>
          {label}
        </span>
      )}
    </div>
  );
};
```

---

### Step 5 — Integrate Audio Button into Lesson UI

**File:** `src/components/lesson/LessonView.tsx` (MODIFY)

Add the audio button in two locations:

**1. Prominently on INFO steps (large, centered, auto-plays):**

In the render section, after the `TutorBubble` and before/alongside the activity:

```tsx
{/* Audio replay button — prominent on INFO steps, compact on quiz steps */}
{hasAudio && (
  <div className={`flex justify-center ${
    currentStep?.activity?.type === GameActivityType.INFO
      ? 'my-6'  // Large gap on INFO steps — it's the main interaction
      : 'my-2'  // Compact on quiz steps — secondary to the activity
  }`}>
    <AudioReplayButton
      isPlaying={isAudioPlaying}
      isLoading={isAudioLoading}
      onPress={playChunkAudio}
      size={currentStep?.activity?.type === GameActivityType.INFO ? 'lg' : 'sm'}
      label={currentStep?.activity?.type === GameActivityType.INFO
        ? (isAudioPlaying ? 'Playing...' : 'Tap to hear again')
        : undefined
      }
    />
  </div>
)}
```

**2. On quiz steps, add a small replay button near the question:**

This should be positioned in the activity header area. Modify `ActivityWrapper.tsx` (or the individual activity components) to accept an optional `audioButton` prop:

```tsx
// In ActivityWrapper.tsx or similar shared wrapper:
{audioButton && (
  <div className="absolute top-2 right-2">
    {audioButton}
  </div>
)}
```

---

### Step 6 — Update Lesson Generation to Include Audio Metadata

**File:** `src/services/lessonGeneratorV2.ts` (MODIFY)

After generating the lesson plan, tag each step with audio metadata so the UI knows what phrase to play:

```typescript
/**
 * Post-process the generated lesson to attach audio metadata.
 * This tells the useLessonAudio hook which phrase to play for each step.
 */
function attachAudioMetadata(
  lesson: LessonPlan,
  sessionPlan: SessionPlan,
): LessonPlan {
  for (const step of lesson.steps) {
    const activity = step.activity;
    if (!activity) continue;

    // Find the matching chunk from the session plan
    const focusChunkId = (activity as any).focusChunkId;
    const chunk = focusChunkId
      ? [...sessionPlan.targetChunks, ...sessionPlan.reviewChunks]
          .find(c => c.id === focusChunkId)
      : null;

    // Attach audio metadata
    (activity as any).__audioPhrase = chunk?.text
      || activity.title
      || activity.sourcePhrase
      || activity.targetSentence
      || null;
    (activity as any).__audioChunkId = focusChunkId || null;
  }

  return lesson;
}
```

---

### Step 7 — Update `extractStepPhrase` to Use Audio Metadata

Update the `extractStepPhrase` function in `useLessonAudio.ts` to prefer the attached metadata:

```typescript
function extractStepPhrase(step: LessonStep): string | null {
  const activity = step.activity;
  if (!activity) return null;

  // Prefer explicit audio metadata (set during generation)
  const metadata = (activity as any).__audioPhrase;
  if (metadata) return metadata;

  // Fallback to type-specific extraction
  // ... (existing switch statement)
}
```

---

## Audio UX Design

### INFO Steps (Teaching New Chunks)

```
┌──────────────────────────────────────────┐
│  🦉 "Let's learn a new phrase!           │
│      In French, we say..."               │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │    "Bonjour, comment ça va?"     │    │
│  │                                  │    │
│  │  = "Hello, how are you?"         │    │
│  └──────────────────────────────────┘    │
│                                          │
│           🔊  [auto-plays]               │
│        Tap to hear again                 │
│                                          │
│        [Continue →]                      │
└──────────────────────────────────────────┘
```

The audio auto-plays 800ms after the step renders. The large speaker button pulses gently to show it's tappable for replay. The "Continue" button appears after the audio finishes (or after 3 seconds if audio fails).

### Quiz Steps (Practice)

```
┌──────────────────────────────────────────┐
│  What does "Bonjour" mean?          🔈  │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │  Hello   │  │ Goodbye  │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ Thank you│  │  Please  │             │
│  └──────────┘  └──────────┘             │
└──────────────────────────────────────────┘
```

Small speaker icon in the top-right corner. Tap to hear the phrase. Not auto-play — the child focuses on the activity.

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/audioCacheService.ts` | **CREATE** | Audio caching with PB + session cache |
| `src/hooks/useLessonAudio.ts` | **CREATE** | Lesson audio state management hook |
| `src/components/lesson/AudioReplayButton.tsx` | **CREATE** | Kid-friendly audio play button |
| `src/components/lesson/LessonView.tsx` | **MODIFY** | Wire audio hook, add buttons |
| `src/services/lessonGeneratorV2.ts` | **MODIFY** | Attach audio metadata post-generation |
| `App.tsx` | **MODIFY** | Pass `targetLanguage` to LessonView |

---

## Testing Checklist

### Audio Cache
- [ ] First playback generates TTS and caches to PocketBase `audio_url`
- [ ] Second playback of same chunk uses cached audio (no TTS API call)
- [ ] Session cache prevents redundant PB lookups
- [ ] Cache failure doesn't break audio playback

### Auto-Play
- [ ] Audio auto-plays on INFO steps after 800ms delay
- [ ] Auto-play does NOT trigger on quiz steps
- [ ] Changing steps stops the previous audio
- [ ] Unmounting LessonView stops audio and clears timers

### Pre-Generation
- [ ] All lesson chunks have audio pre-generated before lesson starts
- [ ] Failed pre-generation doesn't prevent lesson from starting
- [ ] Pre-generation status is logged for debugging

### Replay Button
- [ ] Large button on INFO steps with "Tap to hear again" label
- [ ] Small button on quiz steps (top-right corner)
- [ ] Button toggles: tap to play, tap again to stop
- [ ] Loading state shown while generating
- [ ] Playing state shows pulsing animation

### Mixed Language
- [ ] French phrases use French TTS voice
- [ ] Mixed French/English text pronounces correctly (Google Journey voices handle this)
- [ ] German phrases use German TTS voice

---

## Pedagogical Rationale

From `PEDAGOGY.md`:

> **Krashen's Input Hypothesis:** Learners acquire language when they receive comprehensible input at i+1. **Audio modelling is a critical form of input** — hearing the correct pronunciation establishes the phonological pattern in the learner's mind before they attempt production.

> **Lexical Approach:** Chunks must be encountered as whole units. **Hearing a chunk spoken as a fluid phrase** (not word-by-word) reinforces that it's a single lexical unit, not assembled from parts.

Auto-playing audio on INFO steps ensures every learner hears the chunk modelled correctly at least once. The replay button lets them listen repeatedly — research shows that multiple exposures to the same audio input significantly improve both comprehension and later production accuracy.

---

## Notes for Cline

- The existing `ttsService.ts` and `useAudio.ts` are for the OLD chat-based interface. The new `useLessonAudio.ts` hook is specifically for lessons and should NOT replace the old hook — both may coexist.
- Google TTS Journey voices are excellent at mixed-language text. If the INFO step says `In French, we say "Bonjour, comment ça va?"`, use French as the TTS language — it will pronounce the English parts with a slight accent but the French perfectly. This is intentional and pedagogically appropriate.
- The `audio_url` field on `chunk_library` currently stores strings. Base64 MP3 for a short phrase is typically 20-50KB — well within PocketBase's text field limits. If this becomes a concern later, switch to PocketBase file storage.
- Do NOT block the lesson start on pre-generation. Show a small loading indicator if needed, but let the child start immediately. Audio for the first step should be ready within ~500ms.
