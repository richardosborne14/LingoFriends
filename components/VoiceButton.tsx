/**
 * LingoFriends - VoiceButton Component
 * 
 * A kid-friendly voice input button with clear visual feedback.
 * Shows distinct states: idle, listening, processing, error.
 * Uses tap-to-toggle interaction for simplicity.
 * 
 * @module VoiceButton
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { recorder, RecordingState, TranscriptionResult } from '../services/sttService';
import type { TargetLanguage } from '../types';

// ============================================
// ICONS
// ============================================

const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ============================================
// TYPES
// ============================================

export interface VoiceButtonProps {
  /** Target language for transcription */
  targetLanguage: TargetLanguage;
  /** Called when transcription is complete */
  onTranscription: (text: string) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
}

// ============================================
// COMPONENT
// ============================================

/**
 * VoiceButton - A microphone button for voice input.
 * 
 * Features:
 * - Tap to start recording, tap again to stop
 * - Visual audio level indicator while recording
 * - Clear state feedback with colors and icons
 * - Kid-friendly error messages
 * 
 * @example
 * <VoiceButton 
 *   targetLanguage="French"
 *   onTranscription={(text) => handleVoiceInput(text)}
 * />
 */
const VoiceButton: React.FC<VoiceButtonProps> = ({
  targetLanguage,
  onTranscription,
  onError,
  disabled = false,
  className = '',
  size = 'medium',
}) => {
  // State
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Refs for cleanup
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Size configurations
  const sizeConfig = {
    small: {
      button: 'w-10 h-10',
      ring: 'w-14 h-14',
      icon: 'scale-75',
    },
    medium: {
      button: 'w-14 h-14',
      ring: 'w-20 h-20',
      icon: 'scale-100',
    },
    large: {
      button: 'w-18 h-18',
      ring: 'w-24 h-24',
      icon: 'scale-125',
    },
  };
  
  const currentSize = sizeConfig[size];
  
  // Set up recorder callbacks
  // Note: We don't set language anymore - Whisper auto-detects
  // This allows users to speak in any language (native or target)
  useEffect(() => {
    recorder.setCallbacks({
      onStateChange: (state) => {
        setRecordingState(state);
        
        // Clear error message when starting new recording
        if (state === 'recording' || state === 'idle') {
          setErrorMessage(null);
        }
      },
      onTranscription: (result: TranscriptionResult) => {
        onTranscription(result.text);
      },
      onError: (error) => {
        setErrorMessage(error.message);
        onError?.(error);
        
        // Auto-clear error after 5 seconds
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => {
          setErrorMessage(null);
          setRecordingState('idle');
        }, 5000);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
    });
    
    // Cleanup
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [targetLanguage, onTranscription, onError]);
  
  // Handle button click
  const handleClick = useCallback(async () => {
    if (disabled) return;
    
    if (recordingState === 'idle' || recordingState === 'error') {
      // Start recording
      await recorder.startRecording();
    } else if (recordingState === 'recording') {
      // Stop recording
      recorder.stopRecording();
    }
    // Ignore clicks during 'requesting' and 'processing' states
  }, [recordingState, disabled]);
  
  // Determine button appearance based on state
  const getButtonStyles = () => {
    const baseStyles = 'relative rounded-xl transition-all duration-200 flex items-center justify-center shadow-[0_2px_0_0_rgba(0,0,0,0.1)] focus:outline-none focus:ring-4';
    
    switch (recordingState) {
      case 'idle':
        return `${baseStyles} bg-[#f0fdf4] text-[#58CC02] border-2 border-[#86efac] hover:bg-[#dcfce7] focus:ring-[#86efac]/30`;
      case 'requesting':
        return `${baseStyles} bg-[#e5e5e5] text-[#737373] border-2 border-[#d4d4d4] cursor-wait`;
      case 'recording':
        return `${baseStyles} bg-[#FF4B4B] text-white border-2 border-[#FF4B4B] hover:bg-[#e63939] focus:ring-[#FF4B4B]/30 animate-pulse`;
      case 'processing':
        return `${baseStyles} bg-[#FFC800] text-white border-2 border-[#FFC800] cursor-wait`;
      case 'error':
        return `${baseStyles} bg-[#fee2e2] text-[#FF4B4B] border-2 border-[#fecaca] hover:bg-[#fecaca] focus:ring-[#fecaca]/30`;
      default:
        return `${baseStyles} bg-[#f0fdf4] text-[#58CC02] border-2 border-[#86efac]`;
    }
  };
  
  // Get icon based on state
  const getIcon = () => {
    switch (recordingState) {
      case 'idle':
        return <MicIcon />;
      case 'requesting':
        return <Spinner />;
      case 'recording':
        return <StopIcon />;
      case 'processing':
        return <Spinner />;
      case 'error':
        return <ErrorIcon />;
      default:
        return <MicIcon />;
    }
  };
  
  // Get helper text based on state
  const getHelperText = () => {
    switch (recordingState) {
      case 'idle':
        return 'Tap to speak';
      case 'requesting':
        return 'Requesting mic...';
      case 'recording':
        return 'Tap to stop';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Tap to retry';
      default:
        return '';
    }
  };
  
  // Check if STT is supported
  const isSupported = typeof MediaRecorder !== 'undefined';
  
  if (!isSupported) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <button
          disabled
          className={`${currentSize.button} rounded-full bg-gray-200 text-gray-400 cursor-not-allowed flex items-center justify-center`}
          title="Voice input is not supported in this browser"
        >
          <div className={currentSize.icon}>
            <MicIcon />
          </div>
        </button>
        <span className="text-xs text-gray-400 mt-1">Not supported</span>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Audio level ring (visible during recording) */}
      <div className="relative flex items-center justify-center">
        {recordingState === 'recording' && (
          <div 
            className={`absolute ${currentSize.ring} rounded-full bg-red-200 transition-transform duration-75`}
            style={{
              transform: `scale(${1 + audioLevel * 0.3})`,
              opacity: 0.5 + audioLevel * 0.5,
            }}
          />
        )}
        
        {/* Main button */}
        <button
          onClick={handleClick}
          disabled={disabled || recordingState === 'requesting' || recordingState === 'processing'}
          className={`${getButtonStyles()} ${currentSize.button} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={getHelperText()}
          title={errorMessage || getHelperText()}
        >
          <div className={currentSize.icon}>
            {getIcon()}
          </div>
        </button>
      </div>
      
      {/* Helper text */}
      <span className={`text-xs mt-2 transition-colors duration-200 ${
        recordingState === 'error' ? 'text-red-500' : 
        recordingState === 'recording' ? 'text-red-600 font-medium' : 
        'text-gray-500'
      }`}>
        {getHelperText()}
      </span>
      
      {/* Error message tooltip */}
      {errorMessage && (
        <div className="absolute bottom-full mb-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg shadow-lg max-w-[200px] text-center animate-in fade-in slide-in-from-bottom-1">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-red-500"></div>
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default VoiceButton;
