/**
 * LingoFriends - Card Component
 * 
 * Flexible container component with rounded corners and subtle shadow.
 * 
 * @module Card
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

export interface CardProps extends HTMLMotionProps<'div'> {
  /** Card style variant */
  variant?: CardVariant;
  /** Add hover lift effect */
  hoverable?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Card contents */
  children: React.ReactNode;
}

// ============================================
// STYLES
// ============================================

const baseStyles = 'rounded-3xl transition-all duration-200';

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-[#f5f5f5] shadow-[0_4px_12px_0_rgba(0,0,0,0.08)]',
  elevated: 'bg-white shadow-[0_8px_24px_0_rgba(0,0,0,0.12)]',
  outlined: 'bg-white border-2 border-[#e5e5e5]',
  filled: 'bg-[#f5f5f5]',
};

const paddingStyles: Record<string, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

// ============================================
// COMPONENT
// ============================================

/**
 * Card - A flexible container component.
 * 
 * @example
 * <Card>
 *   <h3>Card Title</h3>
 *   <p>Card content goes here.</p>
 * </Card>
 * 
 * @example
 * <Card variant="elevated" hoverable>
 *   Interactive card with hover effect
 * </Card>
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      hoverable = false,
      padding = 'md',
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${className}
        `.trim()}
        whileHover={hoverable ? { 
          y: -4,
          boxShadow: '0 12px 32px 0 rgba(0,0,0,0.15)',
        } : {}}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

// ============================================
// SUB-COMPONENTS
// ============================================

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ 
  children, 
  className = '' 
}) => (
  <h3 className={`text-xl font-bold text-[#262626] ${className}`}>
    {children}
  </h3>
);

export interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ 
  children, 
  className = '' 
}) => (
  <p className={`text-[#737373] mt-1 ${className}`}>
    {children}
  </p>
);

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ 
  children, 
  className = '' 
}) => (
  <div className={className}>
    {children}
  </div>
);

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`mt-4 pt-4 border-t border-[#f5f5f5] ${className}`}>
    {children}
  </div>
);

export default Card;
