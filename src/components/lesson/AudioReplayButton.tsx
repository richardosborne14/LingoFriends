/**
 * LingoFriends - Audio Replay Button Component
 *
 * A kid-friendly, animated audio button that appears on lesson steps.
 *
 * Visual states:
 * - Idle: Speaker icon with subtle pulse animation (inviting tap)
 * - Loading: Spinning indicator
 * - Playing: Sound wave animation with glow
 *
 * Sizes:
 * - lg: Large, centered on INFO steps (main interaction)
 * - md: Medium for general use
 * - sm: Small, corner position on quiz steps (secondary action)
 *
 * @module AudioReplayButton
 * @see docs/phase-1.3-activity-improvements/task-2-tts-autoplay-caching.md
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export interface AudioReplayButtonProps {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether audio is loading */
  isLoading: boolean;
  /** Callback to play or stop audio */
  onPress: () => void;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label text shown below button */
  label?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
}

// ============================================
// SIZE CONFIGURATION
// ============================================

const SIZE_CONFIG = {
  sm: {
    button: 'w-10 h-10',
    icon: 'text-lg',
    label: 'text-xs',
    gap: 'gap-0.5',
  },
  md: {
    button: 'w-14 h-14',
    icon: 'text-2xl',
    label: 'text-sm',
    gap: 'gap-1',
  },
  lg: {
    button: 'w-20 h-20',
    icon: 'text-4xl',
    label: 'text-base',
    gap: 'gap-2',
  },
} as const;

// ============================================
// COMPONENT
// ============================================

/**
 * AudioReplayButton - Kid-friendly audio replay button.
 *
 * Placed prominently on INFO steps and as a secondary action on quiz steps.
 * The button toggles between play and stop states.
 *
 * @example
 * // Large button for INFO steps
 * <AudioReplayButton
 *   isPlaying={isAudioPlaying}
 *   isLoading={isAudioLoading}
 *   onPress={playChunkAudio}
 *   size="lg"
 *   label="Tap to hear again"
 * />
 *
 * // Small button for quiz steps
 * <AudioReplayButton
 *   isPlaying={isAudioPlaying}
 *   isLoading={isAudioLoading}
 *   onPress={playChunkAudio}
 *   size="sm"
 * />
 */
export const AudioReplayButton: React.FC<AudioReplayButtonProps> = ({
  isPlaying,
  isLoading,
  onPress,
  size = 'md',
  label,
  disabled = false,
}) => {
  const s = SIZE_CONFIG[size];

  return (
    <div className={`flex flex-col items-center ${s.gap}`}>
      <motion.button
        className={`
          ${s.button} rounded-full flex items-center justify-center
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
          ${isPlaying
            ? 'bg-blue-500 shadow-lg shadow-blue-300/50'
            : isLoading
              ? 'bg-amber-100 shadow-md'
              : 'bg-blue-100 hover:bg-blue-200 shadow-md'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={disabled ? undefined : onPress}
        disabled={disabled || isLoading}
        whileTap={disabled ? undefined : { scale: 0.9 }}
        animate={isPlaying ? {
          boxShadow: [
            '0 0 0 0 rgba(59, 130, 246, 0.4)',
            '0 0 0 15px rgba(59, 130, 246, 0)',
          ],
        } : {}}
        transition={isPlaying ? {
          duration: 1.2,
          repeat: Infinity,
          ease: 'easeOut',
        } : {}}
        aria-label={isPlaying ? 'Stop audio' : isLoading ? 'Loading audio...' : 'Play audio'}
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
          // Sound wave animation (playing state)
          <motion.span
            className={`${s.icon} text-white`}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            🔊
          </motion.span>
        ) : (
          // Speaker icon (idle state)
          <motion.span
            className={`${s.icon} text-blue-600`}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            🔈
          </motion.span>
        )}
      </motion.button>

      {/* Optional label below button */}
      {label && (
        <motion.span
          className={`${s.label} text-stone-500 font-medium text-center`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
};

// ============================================
// COMPACT VARIANT
// ============================================

/**
 * Compact audio button for embedding in activity headers.
 * A simplified version without the label, for inline use.
 */
export const CompactAudioButton: React.FC<{
  isPlaying: boolean;
  isLoading: boolean;
  onPress: () => void;
  disabled?: boolean;
}> = ({ isPlaying, isLoading, onPress, disabled = false }) => {
  return (
    <motion.button
      className={`
        w-8 h-8 rounded-full flex items-center justify-center
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-400
        ${isPlaying
          ? 'bg-blue-500 text-white'
          : 'bg-stone-100 hover:bg-blue-100 text-stone-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onClick={disabled ? undefined : onPress}
      disabled={disabled || isLoading}
      whileTap={disabled ? undefined : { scale: 0.85 }}
      aria-label={isPlaying ? 'Stop audio' : 'Play audio'}
    >
      {isLoading ? (
        <motion.span
          className="text-sm"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          ⏳
        </motion.span>
      ) : isPlaying ? (
        <span className="text-sm">🔊</span>
      ) : (
        <span className="text-sm">🔈</span>
      )}
    </motion.button>
  );
};

export default AudioReplayButton;