/**
 * LingoFriends - Speech-to-Text Service
 * 
 * Uses Groq Whisper Large v3 for fast, accurate speech recognition.
 * Handles audio recording via MediaRecorder API and transcription.
 * 
 * @module sttService
 */

import type { TargetLanguage } from '../types';

// ============================================
// CONFIGURATION
// ============================================

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3';

/**
 * Language codes for Whisper transcription.
 * Using ISO 639-1 codes as expected by Whisper.
 */
const LANGUAGE_CODES: Record<TargetLanguage, string> = {
  French: 'fr',
  English: 'en',
  German: 'de',
  Spanish: 'es',
  Italian: 'it',
};

/**
 * Audio recording configuration.
 * WebM/Opus is well-supported and efficient for speech.
 */
const AUDIO_CONFIG = {
  mimeType: 'audio/webm;codecs=opus',
  fallbackMimeType: 'audio/webm',
  audioBitsPerSecond: 128000,
};

// ============================================
// TYPES
// ============================================

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error';

export interface TranscriptionResult {
  /** Transcribed text */
  text: string;
  /** Detected or specified language */
  language: string;
  /** Duration of audio in seconds (if available) */
  duration?: number;
}

export interface RecorderCallbacks {
  /** Called when recording state changes */
  onStateChange?: (state: RecordingState) => void;
  /** Called when transcription is complete */
  onTranscription?: (result: TranscriptionResult) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Called with audio level during recording (0-1) */
  onAudioLevel?: (level: number) => void;
}

interface GroqWhisperResponse {
  text: string;
  language?: string;
  duration?: number;
}

// ============================================
// RECORDER CLASS
// ============================================

/**
 * AudioRecorder class manages microphone access and recording.
 * Uses MediaRecorder API for cross-browser compatibility.
 */
class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private animationFrame: number | null = null;
  
  private _state: RecordingState = 'idle';
  private callbacks: RecorderCallbacks = {};
  private language: TargetLanguage = 'English';
  
  /**
   * Get current recording state
   */
  get state(): RecordingState {
    return this._state;
  }
  
  /**
   * Set callbacks for recorder events
   */
  setCallbacks(callbacks: RecorderCallbacks): void {
    this.callbacks = callbacks;
  }
  
  /**
   * Set the target language for transcription
   */
  setLanguage(language: TargetLanguage): void {
    this.language = language;
  }
  
  /**
   * Update state and notify callbacks
   */
  private setState(state: RecordingState): void {
    this._state = state;
    this.callbacks.onStateChange?.(state);
  }
  
  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    if (MediaRecorder.isTypeSupported(AUDIO_CONFIG.mimeType)) {
      return AUDIO_CONFIG.mimeType;
    }
    if (MediaRecorder.isTypeSupported(AUDIO_CONFIG.fallbackMimeType)) {
      return AUDIO_CONFIG.fallbackMimeType;
    }
    // Let browser choose default
    return '';
  }
  
  /**
   * Set up audio level monitoring
   */
  private setupAudioLevelMonitoring(stream: MediaStream): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!this.analyser || this._state !== 'recording') {
          return;
        }
        
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate average level
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        const normalizedLevel = Math.min(average / 128, 1);
        
        this.callbacks.onAudioLevel?.(normalizedLevel);
        
        this.animationFrame = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (e) {
      console.warn('[STT] Audio level monitoring not available:', e);
    }
  }
  
  /**
   * Clean up audio level monitoring
   */
  private cleanupAudioLevelMonitoring(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }
  
  /**
   * Request microphone permission and start recording
   */
  async startRecording(): Promise<boolean> {
    // Validate API key
    if (!GROQ_API_KEY) {
      const error = new Error('Missing VITE_GROQ_API_KEY environment variable');
      this.callbacks.onError?.(error);
      this.setState('error');
      return false;
    }
    
    // Check if already recording
    if (this._state === 'recording' || this._state === 'requesting') {
      console.warn('[STT] Already recording or requesting permission');
      return false;
    }
    
    this.setState('requesting');
    this.audioChunks = [];
    
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      // Create MediaRecorder with supported MIME type
      const mimeType = this.getSupportedMimeType();
      const options: MediaRecorderOptions = {
        audioBitsPerSecond: AUDIO_CONFIG.audioBitsPerSecond,
      };
      if (mimeType) {
        options.mimeType = mimeType;
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      
      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      // Handle recording stop
      this.mediaRecorder.onstop = async () => {
        await this.processRecording();
      };
      
      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('[STT] MediaRecorder error:', event);
        this.callbacks.onError?.(new Error('Recording failed'));
        this.cleanup();
        this.setState('error');
      };
      
      // Set up audio level monitoring
      this.setupAudioLevelMonitoring(this.stream);
      
      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.setState('recording');
      
      return true;
      
    } catch (error) {
      console.error('[STT] Failed to start recording:', error);
      
      // Provide kid-friendly error messages
      let friendlyError: Error;
      if ((error as Error).name === 'NotAllowedError') {
        friendlyError = new Error('Microphone access was denied. Please allow microphone access to use voice input.');
      } else if ((error as Error).name === 'NotFoundError') {
        friendlyError = new Error('No microphone found. Please connect a microphone and try again.');
      } else {
        friendlyError = new Error('Could not access the microphone. Please try again.');
      }
      
      this.callbacks.onError?.(friendlyError);
      this.cleanup();
      this.setState('error');
      return false;
    }
  }
  
  /**
   * Stop recording and process the audio
   */
  stopRecording(): void {
    if (this._state !== 'recording' || !this.mediaRecorder) {
      console.warn('[STT] Not currently recording');
      return;
    }
    
    this.setState('processing');
    this.mediaRecorder.stop();
    
    // Stop the media stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    this.cleanupAudioLevelMonitoring();
  }
  
  /**
   * Cancel recording without processing
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this._state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
    this.setState('idle');
  }
  
  /**
   * Process recorded audio and send to Whisper
   */
  private async processRecording(): Promise<void> {
    if (this.audioChunks.length === 0) {
      console.warn('[STT] No audio data recorded');
      this.callbacks.onError?.(new Error('No audio was recorded. Please try again.'));
      this.cleanup();
      this.setState('error');
      return;
    }
    
    try {
      // Create blob from chunks
      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      
      // Check minimum size (very short recordings won't transcribe well)
      if (audioBlob.size < 1000) {
        this.callbacks.onError?.(new Error('Recording was too short. Please speak a bit longer.'));
        this.cleanup();
        this.setState('error');
        return;
      }
      
      // Send to Whisper for transcription
      const result = await transcribeAudio(audioBlob, this.language);
      
      if (result) {
        this.callbacks.onTranscription?.(result);
        this.setState('idle');
      } else {
        this.callbacks.onError?.(new Error('Could not understand the audio. Please try again.'));
        this.setState('error');
      }
      
    } catch (error) {
      console.error('[STT] Processing error:', error);
      this.callbacks.onError?.(error as Error);
      this.setState('error');
    } finally {
      this.cleanup();
    }
  }
  
  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.audioChunks = [];
    this.mediaRecorder = null;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.cleanupAudioLevelMonitoring();
  }
  
  /**
   * Check if microphone is available
   */
  static async checkMicrophoneAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'audioinput');
    } catch {
      return false;
    }
  }
  
  /**
   * Check if MediaRecorder is supported
   */
  static isSupported(): boolean {
    return typeof MediaRecorder !== 'undefined' && 
           typeof navigator.mediaDevices?.getUserMedia === 'function';
  }
}

// ============================================
// TRANSCRIPTION API
// ============================================

/**
 * Send audio blob to Groq Whisper for transcription.
 * 
 * Whisper auto-detects the language - we don't force a specific language
 * because users may speak in their native language or target language.
 * 
 * @param audioBlob - Audio data as Blob
 * @param language - Hint language (no longer used - Whisper auto-detects)
 * @returns TranscriptionResult or null on error
 */
async function transcribeAudio(
  audioBlob: Blob,
  _language: TargetLanguage // Unused - Whisper auto-detects
): Promise<TranscriptionResult | null> {
  if (!GROQ_API_KEY) {
    console.error('[STT] Missing VITE_GROQ_API_KEY');
    return null;
  }
  
  try {
    // Prepare form data
    const formData = new FormData();
    
    // Determine file extension based on MIME type
    const extension = audioBlob.type.includes('webm') ? 'webm' : 
                     audioBlob.type.includes('ogg') ? 'ogg' : 
                     audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
    
    formData.append('file', audioBlob, `recording.${extension}`);
    formData.append('model', WHISPER_MODEL);
    // Let Whisper auto-detect language - don't force a specific language
    // This allows users to speak in any language (native or target)
    formData.append('response_format', 'json');
    
    // Make API request
    const response = await fetch(GROQ_WHISPER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[STT] Whisper API error:', response.status, errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }
    
    const result = await response.json() as GroqWhisperResponse;
    
    if (!result.text || result.text.trim().length === 0) {
      console.warn('[STT] Empty transcription result');
      return null;
    }
    
    return {
      text: result.text.trim(),
      language: result.language || 'auto', // Whisper returns detected language
      duration: result.duration,
    };
    
  } catch (error) {
    console.error('[STT] Transcription error:', error);
    throw error;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

/**
 * Global recorder instance for easy access.
 * Use this for simple recording scenarios.
 */
const recorder = new AudioRecorder();

// ============================================
// EXPORTS
// ============================================

export {
  AudioRecorder,
  recorder,
  transcribeAudio,
};

export default {
  AudioRecorder,
  recorder,
  transcribeAudio,
  isSupported: AudioRecorder.isSupported,
  checkMicrophoneAvailable: AudioRecorder.checkMicrophoneAvailable,
};
