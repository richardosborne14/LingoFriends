/**
 * LingoFriends - Button Component
 * 
 * Kid-friendly, chunky button with playful animations.
 * Follows Duolingo-inspired design system.
 * 
 * @module Button
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  /** Button style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Show loading spinner */
  isLoading?: boolean;
  /** Icon to show before text */
  leftIcon?: React.ReactNode;
  /** Icon to show after text */
  rightIcon?: React.ReactNode;
  /** Make button full width */
  fullWidth?: boolean;
  /** Button contents */
  children: React.ReactNode;
}

// ============================================
// STYLES
// ============================================

const baseStyles = `
  inline-flex items-center justify-center gap-2
  font-bold rounded-2xl
  transition-colors duration-200
  focus:outline-none
  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  select-none
`;

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#58CC02] text-white hover:bg-[#4CAF00]',
  secondary: 'bg-[#1CB0F6] text-white hover:bg-[#0284c7]',
  accent: 'bg-[#FF9600] text-white hover:bg-[#d97706]',
  ghost: 'bg-transparent text-[#525252] hover:bg-[#f5f5f5]',
  danger: 'bg-[#FF4B4B] text-white hover:bg-[#dc2626]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm px-4 py-2 min-h-[36px]',
  md: 'text-base px-6 py-3 min-h-[44px]',
  lg: 'text-lg px-8 py-4 min-h-[52px]',
};

// Shadow styles for 3D effect (except ghost)
const shadowStyles: Record<ButtonVariant, string> = {
  primary: 'shadow-[0_4px_0_0_rgba(0,0,0,0.15)]',
  secondary: 'shadow-[0_4px_0_0_rgba(0,0,0,0.15)]',
  accent: 'shadow-[0_4px_0_0_rgba(0,0,0,0.15)]',
  ghost: '',
  danger: 'shadow-[0_4px_0_0_rgba(0,0,0,0.15)]',
};

// ============================================
// LOADING SPINNER
// ============================================

const LoadingSpinner = () => (
  <svg 
    className="animate-spin h-5 w-5" 
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// ============================================
// COMPONENT
// ============================================

/**
 * Button - A playful, kid-friendly button component.
 * 
 * Features:
 * - Multiple variants (primary, secondary, accent, ghost, danger)
 * - Three sizes (sm, md, lg)
 * - Framer Motion tap/hover animations
 * - Loading state with spinner
 * - Icon support (left and right)
 * 
 * @example
 * <Button variant="primary" onClick={handleClick}>
 *   Start Learning! 🚀
 * </Button>
 * 
 * @example
 * <Button variant="secondary" size="lg" isLoading>
 *   Saving...
 * </Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const hasNonGhostShadow = variant !== 'ghost';

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${shadowStyles[variant]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `.trim()}
        // Framer Motion animations
        whileHover={isDisabled ? {} : { 
          y: hasNonGhostShadow ? -2 : 0,
          scale: 1.02,
        }}
        whileTap={isDisabled ? {} : { 
          y: 0,
          scale: 0.98,
          boxShadow: hasNonGhostShadow ? '0 2px 0 0 rgba(0,0,0,0.15)' : undefined,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading && <LoadingSpinner />}
        
        {/* Left icon */}
        {!isLoading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        {/* Button text */}
        <span>{children}</span>
        
        {/* Right icon */}
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
