/**
 * LingoFriends - Logo Component
 * 
 * A friendly, animated speech bubble character logo.
 * Kid-friendly and represents language learning.
 * 
 * @module Logo
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps {
  /** Logo size */
  size?: LogoSize;
  /** Enable bounce animation */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// SIZE CONFIG
// ============================================

const sizeConfig: Record<LogoSize, { width: number; height: number }> = {
  sm: { width: 40, height: 40 },
  md: { width: 64, height: 64 },
  lg: { width: 96, height: 96 },
  xl: { width: 128, height: 128 },
};

// ============================================
// COMPONENT
// ============================================

/**
 * Logo - A friendly speech bubble character.
 * 
 * Features a bouncy speech bubble with expressive eyes
 * that represents language learning and communication.
 * 
 * @example
 * <Logo size="lg" animate />
 */
export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  animate = true,
  className = '',
}) => {
  const { width, height } = sizeConfig[size];
  
  const Container = animate ? motion.div : 'div';
  
  const animationProps = animate ? {
    animate: { 
      y: [0, -4, 0],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  } : {};

  return (
    <Container className={className} {...animationProps}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main speech bubble body - Green */}
        <motion.ellipse
          cx="50"
          cy="42"
          rx="42"
          ry="38"
          fill="#58CC02"
          initial={animate ? { scale: 0.95 } : undefined}
          animate={animate ? { scale: [0.95, 1, 0.95] } : undefined}
          transition={animate ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : undefined}
        />
        
        {/* Speech bubble tail - large and prominent */}
        <path
          d="M18 72 L10 85 Q8 88 6 92 Q10 88 15 83 L24 74 Q21 73 18 72 Z"
          fill="#58CC02"
        />
        
        {/* Inner highlight - lighter green */}
        <ellipse
          cx="50"
          cy="38"
          rx="35"
          ry="30"
          fill="#6BD914"
          opacity="0.5"
        />
        
        {/* Left eye - white - MOVED UP for better spacing */}
        <ellipse
          cx="35"
          cy="36"
          rx="11"
          ry="13"
          fill="white"
        />
        
        {/* Right eye - white - MOVED UP for better spacing */}
        <ellipse
          cx="65"
          cy="36"
          rx="11"
          ry="13"
          fill="white"
        />
        
        {/* Left pupil */}
        <motion.ellipse
          cx="37"
          cy="38"
          rx="5"
          ry="6"
          fill="#2d2d2d"
          animate={animate ? { 
            cx: [37, 35, 37, 39, 37],
          } : undefined}
          transition={animate ? { 
            duration: 4, 
            repeat: Infinity, 
            ease: 'easeInOut' 
          } : undefined}
        />
        
        {/* Right pupil */}
        <motion.ellipse
          cx="67"
          cy="38"
          rx="5"
          ry="6"
          fill="#2d2d2d"
          animate={animate ? { 
            cx: [67, 65, 67, 69, 67],
          } : undefined}
          transition={animate ? { 
            duration: 4, 
            repeat: Infinity, 
            ease: 'easeInOut' 
          } : undefined}
        />
        
        {/* Eye shine - left */}
        <circle cx="34" cy="34" r="2.5" fill="white" />
        
        {/* Eye shine - right */}
        <circle cx="64" cy="34" r="2.5" fill="white" />
        
        {/* Happy smile - MOVED DOWN for better spacing */}
        <path
          d="M32 56 Q50 70 68 56"
          stroke="#285500"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Blush marks - left */}
        <ellipse
          cx="20"
          cy="50"
          rx="6"
          ry="4"
          fill="#FF9600"
          opacity="0.35"
        />
        
        {/* Blush marks - right */}
        <ellipse
          cx="80"
          cy="50"
          rx="6"
          ry="4"
          fill="#FF9600"
          opacity="0.35"
        />
        

      </svg>
    </Container>
  );
};

export default Logo;