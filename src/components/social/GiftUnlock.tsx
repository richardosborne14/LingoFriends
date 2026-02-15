/**
 * GiftUnlock Component
 * 
 * Displays an animated modal when a gift is unlocked after completing a lesson.
 * Shows the gift type, name, and gives options to keep or send to a friend.
 * 
 * Part of the social features in Task 1.1.11 (Gift System).
 * 
 * @module GiftUnlock
 * @see docs/phase-1.1/task-1-1-11-gift-system.md
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GiftType } from '../../types/game';
import { GIFT_CONFIGS } from '../../services/giftService';

// ============================================
// TYPES
// ============================================

/**
 * Props for GiftUnlock component.
 */
export interface GiftUnlockProps {
  /** Type of gift that was unlocked */
  giftType: GiftType;
  /** Callback when user dismisses the modal */
  onDismiss: () => void;
  /** Callback when user wants to send the gift */
  onSend?: () => void;
  /** Whether send functionality is available */
  canSend?: boolean;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

import type { Variants, Easing } from 'framer-motion';

/**
 * Overlay fade-in animation.
 */
const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Card scale and slide animation.
 */
const cardVariants: Variants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: { 
    scale: 1, 
    rotate: 0,
    opacity: 1,
    transition: { 
      type: 'spring' as const, 
      stiffness: 300, 
      damping: 25,
    },
  },
  exit: { 
    scale: 0, 
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

/**
 * Emoji bounce animation.
 */
const emojiVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: 'easeInOut' as Easing,
    },
  },
};

/**
 * Button hover animation.
 */
const buttonHover = {
  scale: 1.02,
  transition: { duration: 0.15 },
};

/**
 * Button tap animation.
 */
const buttonTap = {
  scale: 0.98,
};

// ============================================
// COMPONENT
// ============================================

/**
 * GiftUnlock - Animated modal for newly unlocked gifts.
 * 
 * Shows a celebration animation with the gift emoji and gives
 * the user options to keep it or send to a friend.
 * 
 * @example
 * <AnimatePresence>
 *   {unlockedGift && (
 *     <GiftUnlock
 *       giftType={unlockedGift}
 *       onDismiss={() => setUnlockedGift(null)}
 *       onSend={() => setShowSendModal(true)}
 *       canSend={friends.length > 0}
 *     />
 *   )}
 * </AnimatePresence>
 */
export const GiftUnlock: React.FC<GiftUnlockProps> = ({
  giftType,
  onDismiss,
  onSend,
  canSend = false,
}) => {
  const config = GIFT_CONFIGS[giftType];
  
  if (!config) {
    console.error(`[GiftUnlock] Unknown gift type: ${giftType}`);
    return null;
  }
  
  // Get background color based on rarity
  const rarityColors: Record<string, { bg: string; border: string; text: string }> = {
    common: {
      bg: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)', // green-50 to emerald-50
      border: '#86EFAC', // green-300
      text: '#16A34A', // green-600
    },
    uncommon: {
      bg: 'linear-gradient(135deg, #EFF6FF, #F0F9FF)', // blue-50 to sky-50
      border: '#93C5FD', // blue-300
      text: '#2563EB', // blue-600
    },
    rare: {
      bg: 'linear-gradient(135deg, #FAF5FF, #FDF4FF)', // purple-50 to fuchsia-50
      border: '#D8B4FE', // purple-300
      text: '#9333EA', // purple-600
    },
    legendary: {
      bg: 'linear-gradient(135deg, #FFFDF7, #FFF7ED)', // amber-50 to orange-50
      border: '#FCD34D', // amber-300
      text: '#D97706', // amber-600
    },
  };
  
  const colors = rarityColors[config.rarity] || rarityColors.common;

  return (
    <motion.div
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onDismiss}
    >
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="max-w-[300px] w-full rounded-3xl p-6 border-2 shadow-xl"
        style={{
          background: colors.bg,
          borderColor: colors.border,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="text-center font-bold text-lg mb-3"
          style={{ 
            fontFamily: "'Lilita One', sans-serif",
            color: colors.text,
          }}
        >
          🎁 Gift Unlocked!
        </div>
        
        {/* Gift emoji with bounce animation */}
        <motion.div
          variants={emojiVariants}
          animate="animate"
          className="text-center text-6xl mb-3"
        >
          {config.emoji}
        </motion.div>
        
        {/* Gift name */}
        <h2 
          className="text-center text-xl font-bold mb-2"
          style={{ color: '#334155' }} // slate-700
        >
          {config.name}
        </h2>
        
        {/* Gift description */}
        <p 
          className="text-center text-sm mb-4"
          style={{ color: '#64748B' }} // slate-500
        >
          {config.description}
        </p>
        
        {/* Buffer days indicator (if applicable) */}
        {config.bufferDays > 0 && (
          <div 
            className="text-center text-xs mb-4 px-3 py-1 rounded-full mx-auto"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              color: '#64748B',
              display: 'inline-block',
            }}
          >
            🌿 Adds {config.bufferDays} days of protection
          </div>
        )}
        
        {/* Decoration indicator */}
        {config.isDecoration && (
          <div 
            className="text-center text-xs mb-4 px-3 py-1 rounded-full mx-auto"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              color: '#64748B',
              display: 'inline-block',
            }}
          >
            ✨ Decoration for your tree
          </div>
        )}
        
        {/* Action buttons */}
        <div className="space-y-2">
          {/* Primary action - Send to friend (if available) */}
          {canSend && onSend && (
            <motion.button
              whileHover={buttonHover}
              whileTap={buttonTap}
              onClick={onSend}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #F472B6, #EC4899)', // pink-400 to pink-500
                color: '#fff',
                boxShadow: '0 4px 0 #BE185D', // pink-700
              }}
            >
              Send to Friend 💌
            </motion.button>
          )}
          
          {/* Secondary action - Keep for later */}
          <motion.button
            whileHover={buttonHover}
            whileTap={buttonTap}
            onClick={onDismiss}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm"
            style={{
              background: canSend ? 'transparent' : 'linear-gradient(135deg, #34D399, #10B981)',
              color: canSend ? '#64748B' : '#fff',
              border: canSend ? '2px solid #E2E8F0' : 'none',
              boxShadow: canSend ? 'none' : '0 4px 0 #047857',
            }}
          >
            {canSend ? 'Keep for Later' : 'Awesome!'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GiftUnlock;