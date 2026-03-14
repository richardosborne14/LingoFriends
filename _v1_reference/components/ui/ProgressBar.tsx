/**
 * LingoFriends - ProgressBar Component
 * 
 * Animated progress visualization for XP, loading, and skill mastery.
 * 
 * @module ProgressBar
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export type ProgressVariant = 'primary' | 'secondary' | 'accent' | 'streak';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (default 100) */
  max?: number;
  /** Progress bar variant */
  variant?: ProgressVariant;
  /** Progress bar size */
  size?: ProgressSize;
  /** Show percentage label */
  showLabel?: boolean;
  /** Animate the progress */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// STYLES
// ============================================

const sizeStyles: Record<ProgressSize, string> = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

const variantColors: Record<ProgressVariant, string> = {
  primary: '#58CC02',
  secondary: '#1CB0F6',
  accent: '#FF9600',
  streak: '#FF4B4B',
};

// ============================================
// COMPONENT
// ============================================

/**
 * ProgressBar - Animated progress visualization.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  animate = true,
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const color = variantColors[variant];

  return (
    <div className={className}>
      <div className={`w-full rounded-full overflow-hidden bg-[#f5f5f5] ${sizeStyles[size]}`}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={animate ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-sm text-[#737373] text-right">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
