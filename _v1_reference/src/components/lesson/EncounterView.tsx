/**
 * LingoFriends - Encounter View Component
 *
 * Displays the "meeting your language buddy" scene at the top of every lesson step.
 * Previously used a Three.js EncounterScene with blocky 3D avatars — replaced with
 * a clean 2D CSS illustration so the lesson loads faster, looks better on all
 * screens, and doesn't require WebGL.
 *
 * Layout: sky-gradient strip with Lingo mascot (left) and a language buddy (right).
 * The buddy's speech bubble pulses gently while audio is playing.
 *
 * @module components/lesson/EncounterView
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export interface EncounterViewProps {
  /** Current lesson step index (0-based) — used to vary NPC appearance */
  stepIndex: number;
  /** Total steps in the lesson */
  totalSteps: number;
  /** Lesson ID (kept for prop compatibility; not used in 2D renderer) */
  lessonId: string;
  /** Whether audio is currently playing — drives speech bubble animation */
  isAudioPlaying: boolean;
  /** Optional fixed height in px (default: 140) */
  height?: number;
}

// ============================================================================
// HELPER DATA
// ============================================================================

/**
 * Language buddy characters — rotate deterministically based on step index.
 * Each entry has an emoji face and a background colour for their avatar circle.
 */
const BUDDIES = [
  { emoji: '😊', bg: 'bg-blue-400',   name: 'Max'   },
  { emoji: '🌟', bg: 'bg-purple-400', name: 'Luna'  },
  { emoji: '🦊', bg: 'bg-orange-400', name: 'Felix' },
  { emoji: '🐻', bg: 'bg-amber-500',  name: 'Bruno' },
  { emoji: '🐱', bg: 'bg-pink-400',   name: 'Mia'   },
  { emoji: '🐸', bg: 'bg-green-400',  name: 'Leo'   },
];

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EncounterView — clean 2D companion scene above the lesson activity.
 *
 * @example
 * <EncounterView
 *   stepIndex={0}
 *   totalSteps={10}
 *   lessonId={lesson.id}
 *   isAudioPlaying={isAudioPlaying}
 * />
 */
export const EncounterView: React.FC<EncounterViewProps> = ({
  stepIndex,
  totalSteps,
  lessonId,
  isAudioPlaying,
  height = 140,
}) => {
  // Pick a consistent buddy for this step (wraps around)
  const buddy = BUDDIES[stepIndex % BUDDIES.length];

  // Final step gets a gold star badge — "boss" moment
  const isFinalStep = stepIndex === totalSteps - 1;

  return (
    <div
      className="w-full relative overflow-hidden"
      style={{ height }}
    >
      {/* Sky gradient background — soft and friendly */}
      <div
        className={`absolute inset-0 ${
          isFinalStep
            ? 'bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-50'
            : 'bg-gradient-to-br from-sky-100 via-blue-50 to-green-50'
        }`}
      />

      {/* Subtle ground strip */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-green-100/60 to-transparent" />

      {/* Characters */}
      <div className="relative h-full flex items-end justify-center gap-16 pb-3 px-6">

        {/* === LEFT: Lingo mascot === */}
        <div className="flex flex-col items-center gap-1">
          <motion.div
            animate={isAudioPlaying
              ? { scale: [1, 1.06, 1, 1.06, 1], y: [0, -3, 0] }
              : { scale: 1, y: 0 }
            }
            transition={{ duration: 0.5, repeat: isAudioPlaying ? Infinity : 0, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-md border-2 border-white"
          >
            {/* Lingo face — matches the app logo mascot */}
            <span className="text-2xl select-none" role="img" aria-label="Lingo">😄</span>
          </motion.div>

          {/* Speech wave — only visible while audio plays */}
          {isAudioPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-0.5 items-end h-3"
            >
              {[0.3, 0.6, 1, 0.7, 0.4].map((h, i) => (
                <motion.span
                  key={i}
                  animate={{ scaleY: [h, 1, h] }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.07 }}
                  className="w-1 rounded-full bg-green-400"
                  style={{ height: '100%', transformOrigin: 'bottom' }}
                />
              ))}
            </motion.div>
          )}

          <p className="text-[10px] font-bold text-green-700 tracking-wide">Lingo</p>
        </div>

        {/* === RIGHT: Language buddy === */}
        <div className="flex flex-col items-center gap-1">
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className={`w-14 h-14 rounded-full ${buddy.bg} flex items-center justify-center shadow-md border-2 border-white`}
          >
            <span className="text-2xl select-none" role="img" aria-label={buddy.name}>
              {buddy.emoji}
            </span>
          </motion.div>

          {/* Idle bob animation */}
          <p className="text-[10px] font-bold text-stone-500 tracking-wide">{buddy.name}</p>
        </div>

      </div>

      {/* Final step badge */}
      {isFinalStep && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
          className="absolute top-2 right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow"
        >
          ⭐ Final step!
        </motion.div>
      )}
    </div>
  );
};

export default EncounterView;
