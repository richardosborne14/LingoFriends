/**
 * useAudio Hook
 * Handles audio playback state and TTS operations
 * Provides clean interface for playing/stopping audio with loading states
 * 
 * Uses Groq AI for automatic language detection to use correct TTS voice.
 * No longer needs targetLanguage as input - detection is fully automatic.
 */
import { useState, useCallback } from 'react';
import { generateSpeech as generateTTS, playAudio, stopAudio as stopTTSAudio, detectLanguage } from '../../services/ttsService';

interface UseAudioReturn {
  /** ID of the message currently playing audio */
  playingMessageId: string | null;
  /** ID of the message currently loading audio */
  audioLoadingId: string | null;
  /** Play audio for a message, or stop if already playing */
  handlePlayAudio: (messageId: string, text: string) => Promise<void>;
  /** Stop any currently playing audio */
  stopAudio: () => void;
}

/**
 * Hook for managing TTS audio playback
 * Handles play/pause toggle, loading states, and cleanup
 * 
 * Language is automatically detected from the text content using Groq AI,
 * so no configuration is needed.
 */
export function useAudio(): UseAudioReturn {
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);

  /**
   * Stop any currently playing audio and reset state
   */
  const stopAudio = useCallback(() => {
    stopTTSAudio();
    setPlayingMessageId(null);
  }, []);

  /**
   * Play audio for a specific message
   * If the same message is already playing, stops it instead (toggle behavior)
   * 
   * Uses Groq AI to detect the language automatically:
   * - English text → English voice
   * - French text → French voice
   * - etc.
   */
  const handlePlayAudio = useCallback(async (messageId: string, text: string) => {
    // If already playing this message, stop it (toggle behavior)
    if (playingMessageId === messageId) {
      stopAudio();
      return;
    }
    
    // Stop any currently playing audio before starting new one
    stopAudio();
    
    setAudioLoadingId(messageId);
    setPlayingMessageId(messageId);
    
    // Detect language using Groq AI - this is async
    const detectedLanguage = await detectLanguage(text);
    console.log(`[useAudio] Auto-detected language: ${detectedLanguage}`);
    
    // Generate and play audio using Google Cloud TTS with detected language
    const result = await generateTTS(text, { language: detectedLanguage });
    setAudioLoadingId(null);

    if (result) {
      await playAudio(result.audioContent, () => {
        // Clear playing state when audio finishes naturally
        setPlayingMessageId(null);
      });
    } else {
      // TTS failed, clear state
      setPlayingMessageId(null);
    }
  }, [playingMessageId, stopAudio]);

  return {
    playingMessageId,
    audioLoadingId,
    handlePlayAudio,
    stopAudio,
  };
}
