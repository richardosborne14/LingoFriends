/**
 * LingoFriends - Lesson Complete Screen Component
 * 
 * Displays when a lesson is finished, showing:
 * - Trophy animation
 * - Sun Drops earned vs maximum
 * - Star rating (1-3)
 * - Gift unlocked card (placeholder)
 * - Navigation buttons
 * 
 * @module LessonComplete
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SunDropIcon } from '../shared/SunDropIcon';
import { calculateStars } from '../../services/sunDropService';
import type { GiftType } from '../../types/game';

// ============================================
// TYPES
// ============================================

/**
 * Props for LessonComplete component.
 */
export interface LessonCompleteProps {
  /** Sun Drops earned in this lesson */
  sunDropsEarned: number;
  /** Maximum possible Sun Drops */
  sunDropsMax: number;
  /** Callback when user continues to path */
  onContinue: () => void;
  /** Callback when user replays the lesson */
  onReplay: () => void;
  /** Optional gift type unlocked (placeholder for Task 1.1.11) */
  giftUnlocked?: GiftType | null;
}

/**
 * Gift display configuration.
 * Will be expanded in Task 1.1.11 (Gift System).
 */
interface GiftConfig {
  emoji: string;
  name: string;
  description: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Gift configurations for display.
 * Placeholder data until Gift System is implemented.
 */
const GIFT_CONFIGS: Record<GiftType, GiftConfig> = {
  water_drop: {
    emoji: '💧',
    name: 'Water Drop',
    description: "Keep a friend's tree alive!",
  },
  sparkle: {
    emoji: '✨',
    name: 'Sparkle',
    description: 'Add some sparkle to a tree!',
  },
  seed: {
    emoji: '🌱',
    name: 'Seed',
    description: 'Start a new skill path!',
  },
  ribbon: {
    emoji: '🎀',
    name: 'Ribbon',
    description: 'Decorate a tree!',
  },
  golden_flower: {
    emoji: '🌸',
    name: 'Golden Flower',
    description: 'A rare decoration!',
  },
};

// ============================================
// ANIMATION VARIANTS
// ============================================

/**
 * Container animation for the completion screen.
 */
const containerVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
  },
};

/**
 * Trophy bounce animation.
 */
const trophyVariants = {
  initial: { scale: 0, rotate: -20 },
  animate: { 
    scale: 1, 
    rotate: 0,
    transition: { 
      type: 'spring' as const, 
      stiffness: 400, 
      damping: 15,
      delay: 0.2 
    }
  },
};

/**
 * Gift card animation.
 */
const giftVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { delay: 0.4 }
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * LessonComplete - End-of-lesson celebration screen.
 * 
 * Shows the results of a completed lesson including:
 * - Trophy animation
 * - Sun Drops earned / total
 * - Star rating (1-3 based on percentage)
 * - Optional gift unlocked
 * - Navigation options
 * 
 * @example
 * <LessonComplete
 *   sunDropsEarned={18}
 *   sunDropsMax={22}
 *   onContinue={() => navigate('/path')}
 *   onReplay={() => resetLesson()}
 * />
 */
export const LessonComplete: React.FC<LessonCompleteProps> = ({
  sunDropsEarned,
  sunDropsMax,
  onContinue,
  onReplay,
  giftUnlocked = 'water_drop', // Default gift for now
}) => {
  // Calculate star rating based on performance
  const stars = calculateStars(sunDropsEarned, sunDropsMax);
  
  // Get gift config if a gift was unlocked
  const gift = giftUnlocked ? GIFT_CONFIGS[giftUnlocked] : null;

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="text-center p-6"
    >
      {/* Trophy */}
      <motion.div 
        variants={trophyVariants}
        className="text-6xl mb-4"
      >
        🏆
      </motion.div>

      {/* Title */}
      <h2 
        className="text-2xl mb-4"
        style={{ 
          fontFamily: "'Lilita One', sans-serif",
          color: '#047857' // green-700
        }}
      >
        Lesson Done!
      </h2>

      {/* Sun Drops earned */}
      <div 
        className="flex items-center justify-center gap-2 mb-4 font-extrabold text-xl"
        style={{ color: '#B45309' }} // amber-700
      >
        <SunDropIcon size={24} glow />
        <span>{sunDropsEarned}/{sunDropsMax} Sun Drops</span>
      </div>

      {/* Star rating */}
      <div className="text-2xl mb-6">
        {[1, 2, 3].map((star) => (
          <span 
            key={star} 
            style={{ opacity: star <= stars ? 1 : 0.3 }}
          >
            ⭐
          </span>
        ))}
      </div>

      {/* Gift unlocked card */}
      {gift && (
        <motion.div
          variants={giftVariants}
          className="mx-auto max-w-[260px] rounded-2xl p-4 mb-6 border-2"
          style={{
            background: 'linear-gradient(135deg, #FDF2F8, #F0F9FF)', // pink-50 to sky-50
            borderColor: '#FBCFE8', // pink-200
          }}
        >
          <p 
            className="font-bold text-sm mb-1"
            style={{ color: '#EC4899' }} // pink-500
          >
            🎁 Gift unlocked!
          </p>
          <div className="text-3xl mb-2">
            {gift.emoji}
          </div>
          <p 
            className="font-bold text-sm mb-1"
            style={{ color: '#334155' }} // slate-700
          >
            {gift.name}
          </p>
          <p 
            className="text-xs"
            style={{ color: '#64748B' }} // slate-500
          >
            {gift.description}
          </p>
        </motion.div>
      )}

      {/* Send to friend button (placeholder) */}
      {gift && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-full max-w-[260px] mx-auto mb-4 py-3 px-6 rounded-lg font-bold text-sm"
          style={{
            background: 'linear-gradient(135deg, #F472B6, #EC4899)', // pink-400 to pink-500
            color: '#fff',
            boxShadow: '0 4px 0 #BE185D', // pink-700
          }}
          onClick={() => {
            // Placeholder - will connect to Gift System in Task 1.1.11
            console.log('Send gift to friend - not implemented yet');
          }}
        >
          Send to Friend 💌
        </motion.button>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 rounded-lg font-bold text-sm"
          style={{
            background: 'linear-gradient(135deg, #FB923C, #FDBA74)', // orange-400 to orange-300
            color: '#fff',
            boxShadow: '0 4px 0 #C2410C', // orange-700
          }}
          onClick={onContinue}
        >
          Back to Path
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 rounded-lg font-bold text-sm"
          style={{
            background: 'linear-gradient(135deg, #34D399, #10B981)', // green-400 to green-500
            color: '#fff',
            boxShadow: '0 4px 0 #047857', // green-700
          }}
          onClick={onReplay}
        >
          Replay 🔄
        </motion.button>
      </div>
    </motion.div>
  );
};

export default LessonComplete;