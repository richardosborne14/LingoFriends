/**
 * LingoFriends - Input Component
 * 
 * Kid-friendly form input with clear feedback states.
 * 
 * @module Input
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size */
  size?: InputSize;
  /** Label text */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Icon to show at start */
  leftIcon?: React.ReactNode;
  /** Icon to show at end */
  rightIcon?: React.ReactNode;
  /** Full width */
  fullWidth?: boolean;
}

// ============================================
// STYLES
// ============================================

const baseStyles = `
  w-full bg-white rounded-xl
  border-2 transition-all duration-200
  focus:outline-none
  disabled:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60
`;

const sizeStyles: Record<InputSize, string> = {
  sm: 'text-sm px-3 py-2',
  md: 'text-base px-4 py-3',
  lg: 'text-lg px-5 py-4',
};

const stateStyles = {
  default: 'border-[#e5e5e5] focus:border-[#58CC02] focus:shadow-[0_0_0_3px_rgba(88,204,2,0.1)]',
  error: 'border-[#FF4B4B] focus:border-[#FF4B4B] focus:shadow-[0_0_0_3px_rgba(255,75,75,0.1)]',
};

// ============================================
// COMPONENT
// ============================================

/**
 * Input - A kid-friendly form input component.
 * 
 * @example
 * <Input 
 *   label="What's your name?" 
 *   placeholder="Enter your name..."
 * />
 * 
 * @example
 * <Input 
 *   type="email"
 *   label="Email"
 *   error="Please enter a valid email"
 *   leftIcon={<MailIcon />}
 * />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {/* Label */}
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-[#525252] mb-1.5"
          >
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]">
              {leftIcon}
            </div>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={inputId}
            className={`
              ${baseStyles}
              ${sizeStyles[size]}
              ${hasError ? stateStyles.error : stateStyles.default}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${className}
            `.trim()}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <motion.p 
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-[#FF4B4B] flex items-center gap-1"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <span>😅</span> {error}
          </motion.p>
        )}

        {/* Helper text */}
        {!error && helperText && (
          <p 
            id={`${inputId}-helper`}
            className="mt-1.5 text-sm text-[#737373]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
