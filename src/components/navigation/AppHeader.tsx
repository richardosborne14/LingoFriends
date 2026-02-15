/**
 * AppHeader Component
 * 
 * Top navigation bar for the main app experience.
 * Displays app branding, user stats, and settings access.
 * 
 * Features:
 * - App logo/name
 * - Player avatar emoji
 * - Streak counter (🔥)
 * - SunDrop counter
 * - Settings button
 * 
 * @module AppHeader
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SunDropCounter } from '../lesson/SunDropCounter';
import { Logo } from '../../../components/ui';

// ============================================
// TYPES
// ============================================

/**
 * Props for AppHeader component
 */
export interface AppHeaderProps {
  /** Player's avatar emoji */
  avatarEmoji?: string;
  /** Current streak in days */
  streak?: number;
  /** Current SunDrops balance */
  sunDrops: number;
  /** Callback when settings is clicked */
  onSettingsClick?: () => void;
  /** Whether to show the streak (optional, defaults true) */
  showStreak?: boolean;
}

// ============================================
// STYLES
// ============================================

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
  borderBottom: '1px solid #E5E7EB',
  backdropFilter: 'blur(8px)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const leftSectionStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const avatarStyles: React.CSSProperties = {
  fontSize: 28,
  lineHeight: 1,
};

const appNameStyles: React.CSSProperties = {
  fontFamily: "'Lilita One', sans-serif",
  fontSize: 20,
  fontWeight: 400,
  color: '#047857', // green-700
  margin: 0,
};

const rightSectionStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const streakStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: "'Fredoka', sans-serif",
  fontWeight: 600,
  fontSize: 14,
  color: '#F97316', // orange-500
  background: '#FFF7ED', // orange-50
  padding: '4px 8px',
  borderRadius: 12,
};

const settingsButtonStyles: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  padding: 4,
  opacity: 0.7,
  transition: 'opacity 0.2s',
};

// ============================================
// COMPONENT
// ============================================

/**
 * AppHeader Component
 * 
 * Renders the top app header with branding and user stats.
 * 
 * @example
 * <AppHeader
 *   avatarEmoji="🦊"
 *   streak={5}
 *   sunDrops={120}
 *   onSettingsClick={() => setShowSettings(true)}
 * />
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  avatarEmoji = '🧑',
  streak = 0,
  sunDrops,
  onSettingsClick,
  showStreak = true,
}) => {
  return (
    <header style={headerStyles}>
      {/* Left: Avatar and App Name */}
      <div style={leftSectionStyles}>
        <motion.span
          style={avatarStyles}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
        >
          {avatarEmoji}
        </motion.span>
        <h1 style={appNameStyles}>
          LingoFriends
        </h1>
      </div>

      {/* Right: Stats and Settings */}
      <div style={rightSectionStyles}>
        {/* Streak counter */}
        {showStreak && streak > 0 && (
          <motion.div
            style={streakStyles}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.15 }}
          >
            <span>🔥</span>
            <span>{streak}</span>
          </motion.div>
        )}

        {/* SunDrops counter */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <SunDropCounter count={sunDrops} />
        </motion.div>

        {/* Settings button */}
        {onSettingsClick && (
          <motion.button
            style={settingsButtonStyles}
            onClick={onSettingsClick}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Settings"
          >
            ⚙️
          </motion.button>
        )}
      </div>
    </header>
  );
};

export default AppHeader;