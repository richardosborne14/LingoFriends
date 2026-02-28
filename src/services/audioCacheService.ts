/**
 * LingoFriends - Audio Cache Service
 *
 * Manages the relationship between chunks and their cached audio.
 * Uses a two-tier caching strategy:
 *
 * 1. Session cache (Map) - Instant lookups within a single session
 * 2. PocketBase cache - Persistent storage across sessions
 *
 * Flow for audio playback:
 * 1. Check session cache (instant)
 * 2. Check PocketBase cache (fast, ~50-100ms)
 * 3. Generate via Google TTS (slow, ~300-500ms)
 * 4. Cache the result for future use
 *
 * @module audioCacheService
 * @see docs/phase-1.3-activity-improvements/task-2-tts-autoplay-caching.md
 */

import { pb } from '../../services/pocketbaseService';
import { generateSpeech } from '../../services/ttsService';
import type { TargetLanguage } from '../../types';

// ============================================
// TYPES
// ============================================

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
 * Input for pre-generation.
 */
export interface ChunkAudioRequest {
  /** Target language phrase to synthesize */
  text: string;
  /** Target language for voice selection */
  language: TargetLanguage;
  /** Optional PocketBase chunk ID for caching */
  chunkId?: string;
}

// ============================================
// SESSION CACHE
// ============================================

/**
 * In-memory cache for the current session.
 * Maps cache key → base64 audio.
 * This prevents redundant PocketBase lookups within a single session.
 *
 * Key format: chunkId (if available) or text
 */
const sessionCache = new Map<string, string>();

// ============================================
// CACHED AUDIO RETRIEVAL
// ============================================

/**
 * Check if a chunk has cached audio in PocketBase.
 * Returns the base64 audio string if found, null otherwise.
 *
 * @param chunkId - PocketBase record ID of the chunk
 */
export async function getCachedAudio(chunkId: string): Promise<string | null> {
  // Check session cache first (instant)
  if (sessionCache.has(chunkId)) {
    console.log(`[audioCacheService] Session cache hit for chunk ${chunkId}`);
    return sessionCache.get(chunkId)!;
  }

  try {
    // Fetch from PocketBase
    const record = await pb.collection('chunk_library').getOne(chunkId);
    const audioData = (record as any).audio_url;

    // Check if it's a valid base64 audio string (not a URL, not empty)
    if (audioData && typeof audioData === 'string' && audioData.length > 100) {
      // It's a base64 string stored directly
      sessionCache.set(chunkId, audioData);
      console.log(`[audioCacheService] PocketBase cache hit for chunk ${chunkId}`);
      return audioData;
    }

    // No valid audio cached
    return null;
  } catch (error) {
    // Record not found or other error - non-fatal
    console.warn('[audioCacheService] Failed to fetch cached audio:', error);
    return null;
  }
}

// ============================================
// AUDIO CACHING
// ============================================

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
    console.log(`[audioCacheService] Cached audio for chunk ${chunkId} (${audioBase64.length} bytes)`);
  } catch (error) {
    // Non-fatal — audio still plays, just won't be cached for next time
    console.warn('[audioCacheService] Failed to cache audio to PocketBase:', error);
  }
}

// ============================================
// MAIN API
// ============================================

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
  const cacheKey = chunkId || `text:${text}`;
  if (sessionCache.has(cacheKey)) {
    console.log(`[audioCacheService] Session cache hit for "${text.substring(0, 20)}..."`);
    return {
      text,
      audioBase64: sessionCache.get(cacheKey)!,
      fromCache: true,
      chunkId,
    };
  }

  // 2. Check PocketBase cache (only if we have a chunkId)
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
  console.log(`[audioCacheService] Generating TTS for "${text.substring(0, 30)}..." in ${language}`);
  const result = await generateSpeech(text, { language });
  if (!result) {
    console.warn('[audioCacheService] TTS generation failed for:', text);
    return null;
  }

  // 4. Cache for future use
  sessionCache.set(cacheKey, result.audioContent);
  if (chunkId) {
    // Fire-and-forget background cache to PocketBase
    cacheAudio(chunkId, result.audioContent).catch(() => {
      // Already logged in cacheAudio
    });
  }

  return {
    text,
    audioBase64: result.audioContent,
    fromCache: false,
    chunkId,
  };
}

// ============================================
// PRE-GENERATION
// ============================================

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
  chunks: ChunkAudioRequest[],
): Promise<Map<string, ChunkAudio>> {
  const audioMap = new Map<string, ChunkAudio>();

  if (chunks.length === 0) {
    console.log('[audioCacheService] No chunks to pre-generate');
    return audioMap;
  }

  // Deduplicate by text (same phrase might appear in multiple steps)
  const uniqueChunks = new Map<string, ChunkAudioRequest>();
  for (const chunk of chunks) {
    if (!uniqueChunks.has(chunk.text)) {
      uniqueChunks.set(chunk.text, chunk);
    }
  }

  console.log(
    `[audioCacheService] Pre-generating audio for ${uniqueChunks.size} unique chunks...`
  );

  // Generate all in parallel (Google TTS handles concurrency fine)
  const promises = Array.from(uniqueChunks.values()).map(async (chunk) => {
    const audio = await getOrGenerateAudio(chunk.text, chunk.language, chunk.chunkId);
    if (audio) {
      audioMap.set(chunk.text, audio);
    }
  });

  // Wait for all to complete (success or failure)
  const results = await Promise.allSettled(promises);

  // Count successes
  const successCount = results.filter((r) => r.status === 'fulfilled').length;

  console.log(
    `[audioCacheService] Pre-generated audio: ${audioMap.size}/${uniqueChunks.size} successful`
  );

  return audioMap;
}

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Clear the session cache.
 * Call when user logs out or switches language.
 */
export function clearSessionCache(): void {
  sessionCache.clear();
  console.log('[audioCacheService] Session cache cleared');
}

/**
 * Get session cache stats for debugging.
 */
export function getSessionCacheStats(): { size: number; keys: string[] } {
  return {
    size: sessionCache.size,
    keys: Array.from(sessionCache.keys()),
  };
}