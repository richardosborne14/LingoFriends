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

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SunDropCounter } from '../lesson/SunDropCounter';
import { Logo } from '../../../components/ui';
import { SoundManager } from '../../services/soundManager';

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
  /** Current SunDrops balance (total across all trees) */
  sunDrops: number;
  /** Current Gem balance (global shop currency) */
  gems?: number;
  /** Callback when settings is clicked */
  onSettingsClick?: () => void;
  /** Callback when world map is clicked */
  onWorldMapClick?: () => void;
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
/**
 * Gem counter style — purple to distinguish from SunDrops.
 */
const gemStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: "'Fredoka', sans-serif",
  fontWeight: 600,
  fontSize: 14,
  color: '#7C3AED', // purple-600
  background: '#F5F3FF', // purple-50
  padding: '4px 8px',
  borderRadius: 12,
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  avatarEmoji = '🧑',
  streak = 0,
  sunDrops,
  gems,
  onSettingsClick,
  onWorldMapClick,
  showStreak = true,
}) => {
  // Sound toggle state - persists across the app via SoundManager singleton
  const [isMuted, setIsMuted] = useState(() => SoundManager.isMuted());
  
  /**
   * Toggle sound on/off.
   * Kids often play in quiet environments where sound isn't appropriate.
   */
  const toggleMute = () => {
    if (isMuted) {
      SoundManager.setMuted(false);
      setIsMuted(false);
    } else {
      SoundManager.setMuted(true);
      setIsMuted(true);
    }
  };

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

        {/* Gem counter (global shop currency) */}
        {gems !== undefined && (
          <motion.div
            style={gemStyles}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.18 }}
          >
            <span>💎</span>
            <span>{gems}</span>
          </motion.div>
        )}

        {/* SunDrops counter (total learning progress across trees) */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <SunDropCounter count={sunDrops} />
        </motion.div>

        {/* World map button */}
        {onWorldMapClick && (
          <motion.button
            style={settingsButtonStyles}
            onClick={onWorldMapClick}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="World map"
            title="World map"
          >
            🌍
          </motion.button>
        )}

        {/* Sound toggle button */}
        <motion.button
          style={settingsButtonStyles}
          onClick={toggleMute}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {isMuted ? '🔇' : '🔊'}
        </motion.button>

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