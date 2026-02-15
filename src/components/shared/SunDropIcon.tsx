/**
 * LingoFriends - Sun Drop Icon Component
 * 
 * Custom SVG icon for the Sun Drop currency used throughout the app.
 * Supports normal, glowing, and broken variants.
 * 
 * The Sun Drop is the core reward currency in LingoFriends, replacing XP.
 * 
 * @module SunDropIcon
 */

import React from 'react';

// ============================================
// TYPES
// ============================================

/**
 * Props for SunDropIcon component.
 */
export interface SunDropIconProps {
  /** Icon size in pixels (default: 20) */
  size?: number;
  /** Enable glow effect for reward animations */
  glow?: boolean;
  /** Show broken variant for penalty display */
  broken?: boolean;
  /** Additional CSS class */
  className?: string;
}

// ============================================
// NORMAL SUN DROP ICON
// ============================================

/**
 * Normal Sun Drop SVG with golden gradient.
 * Represents earned currency in the game.
 */
const NormalSunDrop: React.FC<{ size: number; glow: boolean }> = ({ size, glow }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ filter: glow ? 'drop-shadow(0 0 6px #FCD34D)' : 'none' }}
  >
    <defs>
      {/* Main gradient - golden amber */}
      <linearGradient id="sunDropGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FCD34D" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    {/* Drop shape body */}
    <path
      d="M12 2 C12 2 5 11 5 15 C5 18.87 8.13 22 12 22 C15.87 22 19 18.87 19 15 C19 11 12 2 12 2Z"
      fill="url(#sunDropGradient)"
      stroke="#D97706"
      strokeWidth="0.8"
    />
    {/* Shine highlight - simple ellipse */}
    <ellipse cx="9.5" cy="13" rx="2.5" ry="3.5" fill="#FEF3C7" opacity="0.6" />
    {/* Subtle ray line */}
    <line
      x1="12"
      y1="15"
      x2="12"
      y2="12.5"
      stroke="#FEF3C7"
      strokeWidth="0.6"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

// ============================================
// BROKEN SUN DROP ICON
// ============================================

/**
 * Broken Sun Drop SVG for penalty/wrong answer display.
 * Red-tinted with crack lines to show loss.
 */
const BrokenSunDrop: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ filter: 'drop-shadow(0 0 4px #EF4444)' }}
  >
    <defs>
      {/* Broken gradient - red tones */}
      <linearGradient id="brokenSunDropGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FCA5A5" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
    </defs>
    {/* Cracked drop shape */}
    <path
      d="M12 2 C12 2 5 11 5 15 C5 18.87 8.13 22 12 22 C15.87 22 19 18.87 19 15 C19 11 12 2 12 2Z"
      fill="url(#brokenSunDropGradient)"
      stroke="#DC2626"
      strokeWidth="0.8"
    />
    {/* Crack line - zigzag pattern */}
    <path
      d="M10 10 L13 14 L10 16 L13 19"
      fill="none"
      stroke="#7F1D1D"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    {/* Additional cracks for emphasis */}
    <path
      d="M9 8 L10.5 11"
      fill="none"
      stroke="#7F1D1D"
      strokeWidth="0.6"
      strokeLinecap="round"
      opacity="0.6"
    />
    <path
      d="M14 10 L12.5 12"
      fill="none"
      stroke="#7F1D1D"
      strokeWidth="0.6"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * SunDropIcon - SVG icon for Sun Drop currency.
 * 
 * Used throughout the app to display earned rewards and penalties.
 * Three variants: normal (default), glowing (for animations), broken (for penalties).
 * 
 * @example
 * // Default usage
 * <SunDropIcon />
 * 
 * @example
 * // With glow effect for rewards
 * <SunDropIcon size={36} glow />
 * 
 * @example
 * // Broken variant for penalties
 * <SunDropIcon size={24} broken />
 */
export const SunDropIcon: React.FC<SunDropIconProps> = ({
  size = 20,
  glow = false,
  broken = false,
  className,
}) => {
  return (
    <span className={className} aria-label={broken ? 'Broken Sun Drop' : 'Sun Drop'}>
      {broken ? (
        <BrokenSunDrop size={size} />
      ) : (
        <NormalSunDrop size={size} glow={glow} />
      )}
    </span>
  );
};

export default SunDropIcon;