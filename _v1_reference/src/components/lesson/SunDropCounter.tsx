/**
 * LingoFriends - Sun Drop Counter Component
 * 
 * Displays the current Sun Drop count in the lesson header.
 * Shows an icon with the count and optional glow effect.
 * 
 * @module SunDropCounter
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { SunDropIcon } from '../shared/SunDropIcon';

// ============================================
// TYPES
// ============================================

/**
 * Props for SunDropCounter component.
 */
export interface SunDropCounterProps {
  /** Current Sun Drop count */
  count: number;
  /** Enable glow effect for recent changes */
  showGlow?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

/**
 * Animation for count changes.
 */
const countVariants: Variants = {
  initial: { scale: 1.2, opacity: 0.5 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20 }
  },
  exit: { scale: 0.8, opacity: 0 },
};

// ============================================
// COMPONENT
// ============================================

/**
 * SunDropCounter - Displays Sun Drop count with icon.
 * 
 * Used in the lesson header to show earned Sun Drops.
 * Animates when count changes and can show a glow effect.
 * 
 * @example
 * // Basic usage
 * <SunDropCounter count={15} />
 * 
 * @example
 * // With glow for recent change
 * <SunDropCounter count={15} showGlow />
 */
export const SunDropCounter: React.FC<SunDropCounterProps> = ({
  count,
  showGlow = false,
  className = '',
}) => {
  return (
    <div
      className={`bg-amber-100 border border-amber-300 rounded-md px-2 py-1 font-extrabold text-xs text-amber-700 flex items-center gap-1 ${className}`}
    >
      <SunDropIcon size={18} glow={showGlow} />
      <AnimatePresence mode="wait">
        <motion.span
          key={count}
          variants={countVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export default SunDropCounter;