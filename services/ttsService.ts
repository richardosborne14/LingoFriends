/**
 * LingoFriends - Text-to-Speech Service
 * 
 * Uses Google Cloud Text-to-Speech API for natural multilingual voice synthesis.
 * Optimized for kid-friendly language learning with French and English voices.
 * 
 * @module ttsService
 */

import type { TargetLanguage } from '../types';

// ============================================
// CONFIGURATION
// ============================================

// Use dedicated TTS key (GCP) separate from AI Studio key (Gemini)
const GOOGLE_TTS_API_KEY = import.meta.env.VITE_GOOGLE_TTS_KEY || import.meta.env.VITE_GOOGLE_AI_KEY;
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

/**
 * Voice configurations for each supported language.
 * Using Journey voices (Google's newest, highest quality) for natural sound.
 * Journey voices handle code-switching better (mixing languages in one sentence).
 * 
 * Voice selection criteria:
 * - Highest quality available (Journey > Neural2 > WaveNet > Standard)
 * - Clear pronunciation for learners
 * - Appropriate for children (not too deep/serious)
 * - Good multilingual support
 */
const VOICE_CONFIG: Record<TargetLanguage, { languageCode: string; name: string; ssmlGender: string }> = {
  French: {
    languageCode: 'fr-FR',
    name: 'fr-FR-Journey-F', // Journey female voice - highest quality
    ssmlGender: 'FEMALE',
  },
  English: {
    languageCode: 'en-US',
    name: 'en-US-Journey-F', // Journey female voice - highest quality
    ssmlGender: 'FEMALE',
  },
  German: {
    languageCode: 'de-DE',
    name: 'de-DE-Journey-F', // Journey female voice - highest quality  
    ssmlGender: 'FEMALE',
  },
  Spanish: {
    languageCode: 'es-ES',
    name: 'es-ES-Journey-F', // Journey female voice - highest quality
    ssmlGender: 'FEMALE',
  },
  Italian: {
    languageCode: 'it-IT',
    name: 'it-IT-Journey-F', // Journey female voice - highest quality
    ssmlGender: 'FEMALE',
  },
};

/**
 * Audio configuration for TTS output.
 * MP3 chosen for broad browser compatibility and reasonable file size.
 * Note: Journey voices don't support pitch adjustment, so we omit it.
 */
const AUDIO_CONFIG = {
  audioEncoding: 'MP3' as const,
  speakingRate: 0.95, // Slightly slower for learners
  // pitch removed - Journey voices don't support pitch parameters
  volumeGainDb: 0.0,
};

// ============================================
// TYPES
// ============================================

export interface TTSOptions {
  /** Target language for voice selection */
  language: TargetLanguage;
  /** Speaking rate (0.25 to 4.0, default 0.95 for learners) */
  speakingRate?: number;
  /** Pitch adjustment (-20.0 to 20.0) */
  pitch?: number;
}

export interface TTSResult {
  /** Base64 encoded audio data */
  audioContent: string;
  /** Audio format */
  format: 'mp3';
}

interface GoogleTTSResponse {
  audioContent: string;
}

interface GoogleTTSError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

// ============================================
// AUDIO PLAYBACK STATE
// ============================================

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentAudioElement: HTMLAudioElement | null = null;

// ============================================
// LANGUAGE DETECTION (using Groq AI)
// ============================================

import { detectLanguageWithAI } from './groqService';

/**
 * Map ISO 639-1 language codes to our TargetLanguage type
 */
const ISO_TO_TARGET: Record<string, TargetLanguage> = {
  'en': 'English',
  'fr': 'French',
  'de': 'German',
  'es': 'Spanish',
  'it': 'Italian',
};

/**
 * Detect the language of text using Groq AI.
 * This is more accurate than pattern matching for mixed-language content.
 * 
 * @param text - Text to analyze
 * @returns The detected language to use for TTS
 */
export async function detectLanguage(text: string): Promise<TargetLanguage> {
  if (!text || text.length < 5) {
    console.log(`[TTS] Text too short, defaulting to English`);
    return 'English';
  }
  
  try {
    const isoCode = await detectLanguageWithAI(text);
    const language = ISO_TO_TARGET[isoCode] || 'English';
    console.log(`[TTS] Groq detected language: ${isoCode} → ${language}`);
    return language;
  } catch (error) {
    console.error('[TTS] Language detection failed, defaulting to English:', error);
    return 'English';
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Clean text for TTS by removing emojis and special characters.
 * Google TTS reads emoji names aloud (e.g., "face with tears of joy") which sounds weird.
 * 
 * @param text - Raw text with potential emojis
 * @returns Clean text suitable for TTS
 */
function cleanTextForTTS(text: string): string {
  // Remove emojis using Unicode ranges
  // This covers most common emoji ranges
  let cleaned = text
    // Remove emoji modifiers and joiners
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
    // Remove common emojis (emoticons, symbols, pictographs)
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols (sun, moon, etc.)
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
    .replace(/[\u{200D}]/gu, '')             // Zero Width Joiner
    // Remove flag emojis (regional indicators)
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    // Clean up multiple spaces left by removed emojis
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log(`[TTS] Cleaned text (removed emojis): ${text.length} → ${cleaned.length} chars`);
  return cleaned;
}

/**
 * Sleep helper for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff for API calls
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on auth errors
      if ((error as { code?: number })?.code === 401 || 
          (error as { code?: number })?.code === 403) {
        throw error;
      }
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`[TTS] Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Convert base64 MP3 to AudioBuffer for Web Audio API playback
 */
async function base64ToAudioBuffer(base64: string): Promise<AudioBuffer> {
  // Ensure we have an audio context
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  // Decode base64 to array buffer
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Decode MP3 to AudioBuffer
  return await audioContext.decodeAudioData(bytes.buffer);
}

// ============================================
// MAIN API FUNCTIONS
// ============================================

/**
 * Generate speech audio from text using Google Cloud TTS.
 * Returns base64 encoded MP3 audio.
 * 
 * @param text - Text to synthesize
 * @param options - TTS options including language
 * @returns TTSResult with audio content, or null on error
 * 
 * @example
 * const result = await generateSpeech("Bonjour!", { language: 'French' });
 * if (result) {
 *   await playAudio(result.audioContent);
 * }
 */
export async function generateSpeech(
  text: string,
  options: TTSOptions
): Promise<TTSResult | null> {
  // Validate API key
  if (!GOOGLE_TTS_API_KEY) {
    console.error('[TTS] Missing VITE_GOOGLE_AI_KEY environment variable');
    return null;
  }
  
  // Validate input
  if (!text || text.trim().length === 0) {
    console.warn('[TTS] Empty text provided');
    return null;
  }
  
  // Clean text by removing emojis and special characters
  const cleanedText = cleanTextForTTS(text);
  if (!cleanedText || cleanedText.length === 0) {
    console.warn('[TTS] Text is empty after cleaning');
    return null;
  }
  
  // Get voice config for language
  const voiceConfig = VOICE_CONFIG[options.language];
  if (!voiceConfig) {
    console.error(`[TTS] Unsupported language: ${options.language}`);
    return null;
  }
  
  // Build request body with cleaned text
  const requestBody = {
    input: {
      text: cleanedText,
    },
    voice: {
      languageCode: voiceConfig.languageCode,
      name: voiceConfig.name,
      ssmlGender: voiceConfig.ssmlGender,
    },
    audioConfig: {
      audioEncoding: AUDIO_CONFIG.audioEncoding,
      speakingRate: options.speakingRate ?? AUDIO_CONFIG.speakingRate,
      // Note: pitch parameter removed - Journey voices don't support it
      volumeGainDb: AUDIO_CONFIG.volumeGainDb,
    },
  };
  
  try {
    const result = await retryWithBackoff(async () => {
      const response = await fetch(`${GOOGLE_TTS_URL}?key=${GOOGLE_TTS_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as GoogleTTSError;
        const error = new Error(errorData.error?.message || `TTS API error: ${response.status}`);
        (error as any).code = response.status;
        throw error;
      }
      
      return response.json() as Promise<GoogleTTSResponse>;
    });
    
    if (!result.audioContent) {
      console.error('[TTS] No audio content in response');
      return null;
    }
    
    return {
      audioContent: result.audioContent,
      format: 'mp3',
    };
    
  } catch (error) {
    console.error('[TTS] Speech generation failed:', error);
    return null;
  }
}

/**
 * Play audio from base64 encoded MP3 data.
 * Uses HTML5 Audio element for simplicity and broad compatibility.
 * 
 * @param base64Audio - Base64 encoded MP3 audio
 * @param onEnd - Optional callback when audio finishes playing
 * @returns Promise that resolves when playback starts
 */
export async function playAudio(
  base64Audio: string,
  onEnd?: () => void
): Promise<void> {
  // Stop any currently playing audio
  stopAudio();
  
  try {
    // Create data URL for the audio
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;
    
    // Use HTML5 Audio element for MP3 playback
    // This is more reliable for MP3 than Web Audio API decodeAudioData
    currentAudioElement = new Audio(audioDataUrl);
    
    // Set up event handlers
    currentAudioElement.onended = () => {
      currentAudioElement = null;
      onEnd?.();
    };
    
    currentAudioElement.onerror = (e) => {
      console.error('[TTS] Audio playback error:', e);
      currentAudioElement = null;
      onEnd?.();
    };
    
    // Boost volume slightly for clarity
    currentAudioElement.volume = 1.0;
    
    // Start playback
    await currentAudioElement.play();
    
  } catch (error) {
    console.error('[TTS] Failed to play audio:', error);
    currentAudioElement = null;
    onEnd?.();
  }
}

/**
 * Stop currently playing audio.
 */
export function stopAudio(): void {
  // Stop HTML5 Audio element
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.src = '';
    currentAudioElement = null;
  }
  
  // Stop Web Audio API source (legacy)
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // Ignore errors when stopping already stopped source
    }
    currentSource = null;
  }
}

/**
 * Check if audio is currently playing.
 */
export function isPlaying(): boolean {
  if (currentAudioElement && !currentAudioElement.paused) {
    return true;
  }
  return currentSource !== null;
}

/**
 * High-level function to speak text directly.
 * Combines generateSpeech and playAudio for convenience.
 * 
 * @param text - Text to speak
 * @param language - Target language
 * @param onEnd - Optional callback when speech finishes
 * @returns Promise<boolean> - true if speech started successfully
 * 
 * @example
 * await speak("Bonjour les amis!", 'French');
 */
export async function speak(
  text: string,
  language: TargetLanguage,
  onEnd?: () => void
): Promise<boolean> {
  const result = await generateSpeech(text, { language });
  
  if (!result) {
    onEnd?.();
    return false;
  }
  
  await playAudio(result.audioContent, onEnd);
  return true;
}

// ============================================
// EXPORTS
// ============================================

export default {
  generateSpeech,
  playAudio,
  stopAudio,
  isPlaying,
  speak,
};
