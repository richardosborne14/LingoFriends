/**
 * LingoFriends - Tutor Bubble Component
 * 
 * Displays Professor Finch's guidance messages during lessons.
 * Features a bird avatar (🐦) in a speech bubble layout.
 * 
 * @module TutorBubble
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';

// ============================================
// TYPES
// ============================================

/**
 * Props for TutorBubble component.
 */
export interface TutorBubbleProps {
  /** The message text to display */
  text: string;
  /** Optional avatar emoji (default: 🐦 for Professor Finch) */
  avatar?: string;
  /** Whether to fade in on mount (default: true) */
  animate?: boolean;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

/**
 * Fade in animation for the bubble appearing.
 */
const bubbleVariants: Variants = {
  initial: { opacity: 0, x: -12 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: 'spring' as const, 
      stiffness: 300, 
      damping: 25 
    }
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * TutorBubble - Professor Finch's speech bubble for lesson guidance.
 * 
 * Displays the tutor's avatar in a green circle with a speech bubble
 * containing the guidance text. Used at the start of each lesson step
 * to introduce the upcoming activity.
 * 
 * @example
 * // Default usage
 * <TutorBubble text="Let's learn match day words!" />
 * 
 * @example
 * // With custom avatar
 * <TutorBubble text="Great job!" avatar="🦉" />
 */
export const TutorBubble: React.FC<TutorBubbleProps> = ({
  text,
  avatar = '🐦',
  animate = true,
}) => {
  const content = (
    <div className="flex items-start gap-2 mb-4">
      {/* Avatar circle */}
      <div 
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg shadow-md"
        style={{
          background: 'linear-gradient(135deg, #34d399, #10b981)',
          boxShadow: '0 3px 8px rgba(16, 185, 129, 0.3)',
        }}
      >
        {avatar}
      </div>

      {/* Speech bubble */}
      <div 
        className="bg-white rounded-lg rounded-tl-sm shadow-sm max-w-[340px]"
        style={{
          border: '1.5px solid #a7f3d0',
          padding: '12px 16px',
        }}
      >
        <p 
          className="font-semibold text-base leading-relaxed"
          style={{ color: '#334155' }}
        >
          {text}
        </p>
      </div>
    </div>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={bubbleVariants}
    >
      {content}
    </motion.div>
  );
};

export default TutorBubble;