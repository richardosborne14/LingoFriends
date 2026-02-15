/**
 * LingoFriends - Lesson Complete Screen Component
 * 
 * Displays when a lesson is finished, showing:
 * - Trophy animation
 * - Sun Drops earned vs maximum
 * - Star rating (1-3)
 * - Gift unlocked card with send functionality
 * - Navigation buttons
 * 
 * @module LessonComplete
 * @see docs/phase-1.1/task-1-1-11-gift-system.md
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SunDropIcon } from '../shared/SunDropIcon';
import { calculateStars } from '../../services/sunDropService';
import { 
  checkGiftUnlock, 
  getGiftConfig,
  type LessonResult 
} from '../../services/giftService';
import { GiftUnlock } from '../social/GiftUnlock';
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
  /** Optional: Override auto-detected gift type */
  giftUnlocked?: GiftType | null;
  /** Number of lessons completed today (for ribbon gift logic) */
  lessonsCompletedToday?: number;
  /** Whether this completes the skill path (for seed gift logic) */
  pathComplete?: boolean;
  /** User ID for gift sending */
  userId?: string;
}

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
  giftUnlocked,
  lessonsCompletedToday = 1,
  pathComplete = false,
  userId,
}) => {
  // Calculate star rating based on performance
  const stars = calculateStars(sunDropsEarned, sunDropsMax);
  
  // Auto-detect gift type synchronously using useMemo
  const effectiveGiftType = useMemo(() => {
    // Use provided gift if available
    if (giftUnlocked !== undefined) {
      return giftUnlocked;
    }
    
    // Otherwise detect based on lesson result
    const result: LessonResult = {
      sunDropsEarned,
      sunDropsMax,
      stars,
      lessonsCompletedToday,
      pathComplete,
    };
    return checkGiftUnlock(result);
  }, [giftUnlocked, sunDropsEarned, sunDropsMax, stars, lessonsCompletedToday, pathComplete]);
  
  // Get gift config if a gift was unlocked
  const gift = effectiveGiftType ? getGiftConfig(effectiveGiftType) : null;
  
  // State for gift unlock modal
  const [showGiftUnlock, setShowGiftUnlock] = useState(false);

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

      {/* Send to friend button */}
      {gift && effectiveGiftType && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-full max-w-[260px] mx-auto mb-4 py-3 px-6 rounded-lg font-bold text-sm"
          style={{
            background: 'linear-gradient(135deg, #F472B6, #EC4899)', // pink-400 to pink-500
            color: '#fff',
            boxShadow: '0 4px 0 #BE185D', // pink-700
          }}
          onClick={() => setShowGiftUnlock(true)}
        >
          Send to Friend 💌
        </motion.button>
      )}

      {/* Gift unlock modal */}
      <AnimatePresence>
        {showGiftUnlock && effectiveGiftType && (
          <GiftUnlock
            giftType={effectiveGiftType}
            onDismiss={() => setShowGiftUnlock(false)}
            onSend={() => {
              setShowGiftUnlock(false);
              // Could navigate to friend selection or show send modal
              console.log('Send gift flow - to be connected with SendGift component');
            }}
            canSend={!!userId}
          />
        )}
      </AnimatePresence>

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