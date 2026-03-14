/**
 * LingoFriends - Badge Component
 * 
 * Small labels and tags for status indicators, XP rewards, etc.
 * 
 * @module Badge
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  /** Badge style variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Icon to show before text */
  icon?: React.ReactNode;
  /** Animate on mount */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Badge contents */
  children: React.ReactNode;
}

// ============================================
// STYLES
// ============================================

const baseStyles = 'inline-flex items-center gap-1 font-bold rounded-full';

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-[#dcfce7] text-[#3d8c00]',
  secondary: 'bg-[#e0f2fe] text-[#0369a1]',
  accent: 'bg-[#fef3c7] text-[#b45309]',
  success: 'bg-[#dcfce7] text-[#166534]',
  warning: 'bg-[#fef9c3] text-[#854d0e]',
  error: 'bg-[#fee2e2] text-[#991b1b]',
  neutral: 'bg-[#f5f5f5] text-[#525252]',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

// ============================================
// COMPONENT
// ============================================

/**
 * Badge - A small label component for tags, status, and XP.
 * 
 * @example
 * <Badge variant="primary">New</Badge>
 * 
 * @example
 * <Badge variant="accent" icon="⭐" animate>
 *   +50 XP
 * </Badge>
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  animate = false,
  className = '',
  children,
}) => {
  const Component = animate ? motion.span : 'span';
  
  const animationProps = animate ? {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 25,
    },
  } : {};

  return (
    <Component
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `.trim()}
      {...animationProps}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </Component>
  );
};

// ============================================
// SPECIALTY BADGES
// ============================================

export interface XPBadgeProps {
  amount: number;
  animate?: boolean;
  className?: string;
}

/**
 * XPBadge - Specialized badge for XP rewards.
 */
export const XPBadge: React.FC<XPBadgeProps> = ({ 
  amount, 
  animate = true,
  className = '' 
}) => (
  <Badge 
    variant="accent" 
    icon="⭐" 
    animate={animate}
    className={className}
  >
    +{amount} XP
  </Badge>
);

export interface StreakBadgeProps {
  days: number;
  animate?: boolean;
  className?: string;
}

/**
 * StreakBadge - Specialized badge for streak counts.
 */
export const StreakBadge: React.FC<StreakBadgeProps> = ({ 
  days, 
  animate = false,
  className = '' 
}) => (
  <Badge 
    variant="accent" 
    icon="🔥" 
    animate={animate}
    className={className}
  >
    {days} day{days !== 1 ? 's' : ''}
  </Badge>
);

export interface LevelBadgeProps {
  level: string;
  className?: string;
}

/**
 * LevelBadge - Specialized badge for user levels.
 */
export const LevelBadge: React.FC<LevelBadgeProps> = ({ 
  level, 
  className = '' 
}) => (
  <Badge variant="primary" icon="🏆" className={className}>
    {level}
  </Badge>
);

export default Badge;
