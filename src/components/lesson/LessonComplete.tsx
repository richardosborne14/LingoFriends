/**
 * LingoFriends - Lesson Complete Screen Component
 * 
 * Displays when a lesson is finished, showing:
 * - Trophy animation
 * - Sun Drops earned vs maximum
 * - Gems earned (NEW - based on accuracy and streak)
 * - Star rating (1-3)
 * - Streak achievement (if milestone reached)
 * - Pathway completion seeds (if path finished)
 * - Navigation buttons
 * 
 * Updated in Phase 1.1.11 for new reward economy:
 * - Gifts are no longer auto-unlocked from lessons
 * - Gems are earned based on accuracy and streaks
 * - Seeds are awarded for pathway completion (×2)
 * - Achievements can trigger special rewards
 * 
 * @module LessonComplete
 * @see docs/phase-1.1/task-1-1-11-gift-system.md
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SunDropIcon } from '../shared/SunDropIcon';
import { calculateStars } from '../../services/sunDropService';
import { 
  calculateGemEarning,
  getStreakAchievement,
  formatGems,
  type GemAchievement 
} from '../../services/gemService';

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
  /** Current streak in days (for gem multiplier) */
  currentStreak?: number;
  /** Whether this completes the skill path (for seed reward) */
  pathComplete?: boolean;
  /** Callback when user wants to share seeds (after path complete) */
  onShareSeeds?: () => void;
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
 * Reward card animation.
 */
const rewardVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { delay: 0.4 }
  },
};

/**
 * Achievement pop animation.
 */
const achievementVariants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: 'spring' as const, 
      stiffness: 500, 
      damping: 20,
      delay: 0.6 
    }
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
 * - Gems earned (with streak multiplier)
 * - Star rating (1-3 based on percentage)
 * - Streak achievement celebration (if milestone)
 * - Seeds earned (if path complete)
 * - Navigation options
 * 
 * @example
 * <LessonComplete
 *   sunDropsEarned={18}
 *   sunDropsMax={22}
 *   currentStreak={5}
 *   onContinue={() => navigate('/path')}
 *   onReplay={() => resetLesson()}
 * />
 */
export const LessonComplete: React.FC<LessonCompleteProps> = ({
  sunDropsEarned,
  sunDropsMax,
  onContinue,
  onReplay,
  currentStreak = 0,
  pathComplete = false,
  onShareSeeds,
}) => {
  // Calculate star rating based on performance
  const stars = calculateStars(sunDropsEarned, sunDropsMax);
  
  // Calculate gems earned
  const gemResult = calculateGemEarning(sunDropsEarned, sunDropsMax, currentStreak);
  
  // Check for streak achievement
  const streakAchievement = getStreakAchievement(currentStreak);
  
  // Calculate accuracy percentage
  const accuracyPercent = sunDropsMax > 0 
    ? Math.round((sunDropsEarned / sunDropsMax) * 100) 
    : 0;

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
      <motion.div
        variants={rewardVariants}
        className="flex items-center justify-center gap-2 mb-2 font-extrabold text-xl"
        style={{ color: '#B45309' }} // amber-700
      >
        <SunDropIcon size={24} glow />
        <span>{sunDropsEarned}/{sunDropsMax} Sun Drops</span>
      </motion.div>

      {/* Gems earned */}
      <motion.div
        variants={rewardVariants}
        className="flex items-center justify-center gap-2 mb-4 font-extrabold text-xl"
        style={{ color: '#7C3AED' }} // purple-600
      >
        <span className="text-2xl">💎</span>
        <span>+{gemResult.totalGems} Gems</span>
      </motion.div>

      {/* Streak multiplier indicator */}
      {gemResult.streakMultiplier > 1 && (
        <motion.div
          variants={rewardVariants}
          className="text-sm mb-2 px-3 py-1 rounded-full inline-block"
          style={{
            background: 'linear-gradient(135deg, #FCD34D, #F59E0B)', // yellow-300 to amber-500
            color: '#78350F', // amber-900
          }}
        >
          🔥 {currentStreak}-day streak! ×{gemResult.streakMultiplier} bonus!
        </motion.div>
      )}

      {/* Star rating */}
      <div className="text-2xl mb-4">
        {[1, 2, 3].map((star) => (
          <span 
            key={star} 
            style={{ opacity: star <= stars ? 1 : 0.3 }}
          >
            ⭐
          </span>
        ))}
      </div>

      {/* Accuracy display */}
      <div 
        className="text-sm mb-4"
        style={{ color: '#64748B' }} // slate-500
      >
        Accuracy: {accuracyPercent}%
      </div>

      {/* Streak achievement celebration */}
      {streakAchievement && (
        <motion.div
          variants={achievementVariants}
          className="mx-auto max-w-[260px] rounded-2xl p-4 mb-4 border-2"
          style={{
            background: 'linear-gradient(135deg, #FEF3C7, #FCD34D)', // amber-50 to yellow-300
            borderColor: '#F59E0B', // amber-500
          }}
        >
          <p 
            className="font-bold text-lg mb-2"
            style={{ color: '#B45309' }} // amber-700
          >
            🎉 {currentStreak} Day Streak!
          </p>
          <p 
            className="text-sm mb-2"
            style={{ color: '#78350F' }} // amber-900
          >
            +{streakAchievement.bonusGems} bonus gems!
          </p>
          {streakAchievement.giftType && (
            <p className="text-2xl">
              {streakAchievement.giftType === 'golden_flower' ? '🌸' : '🎀'}
            </p>
          )}
        </motion.div>
      )}

      {/* Pathway completion - Seeds awarded */}
      {pathComplete && (
        <motion.div
          variants={achievementVariants}
          className="mx-auto max-w-[260px] rounded-2xl p-4 mb-4 border-2"
          style={{
            background: 'linear-gradient(135deg, #D1FAE5, #6EE7B7)', // green-100 to green-300
            borderColor: '#10B981', // green-500
          }}
        >
          <p 
            className="font-bold text-lg mb-2"
            style={{ color: '#047857' }} // green-700
          >
            🌱 Pathway Complete!
          </p>
          <p 
            className="text-sm mb-2"
            style={{ color: '#065F46' } // green-800
          }
          >
            You earned 2 seeds!
          </p>
          <p 
            className="text-xs"
            style={{ color: '#064E3B' }} // green-900
          >
            Plant one and share one with a friend!
          </p>
          {onShareSeeds && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-3 px-4 py-2 rounded-lg font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #34D399, #10B981)',
                color: '#fff',
                boxShadow: '0 2px 0 #047857',
              }}
              onClick={onShareSeeds}
            >
              Share Seed 💌
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Gem breakdown (collapsible in future) */}
      <motion.div
        variants={rewardVariants}
        className="text-xs mb-4"
        style={{ color: '#94A3B8' }} // slate-400
      >
        {gemResult.baseGems} base gems
        {gemResult.streakMultiplier > 1 && ` × ${gemResult.streakMultiplier} streak bonus`}
      </motion.div>

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