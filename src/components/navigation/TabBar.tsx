/**
 * TabBar Component
 * 
 * Bottom navigation bar for the main app experience.
 * Provides quick access to main sections of the app.
 * 
 * Features:
 * - Garden tab (always active when on garden view)
 * - Path tab (disabled - accessed via garden only)
 * - Friends tab (placeholder for Task 1.1.11)
 * 
 * @module TabBar
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { ViewType } from '../../hooks/useNavigation';

// ============================================
// TYPES
// ============================================

/**
 * Props for TabBar component
 */
export interface TabBarProps {
  /** Current active view */
  currentView: ViewType;
  /** Callback when garden tab is clicked */
  onGarden: () => void;
  /** Callback when friends tab is clicked */
  onFriends?: () => void;
}

/**
 * Individual tab configuration
 */
interface TabConfig {
  id: ViewType | 'friends';
  label: string;
  emoji: string;
  disabled?: boolean;
  disabledReason?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TABS: TabConfig[] = [
  { id: 'garden', label: 'Garden', emoji: '🌳' },
  { 
    id: 'path', 
    label: 'Path', 
    emoji: '🗺️', 
    disabled: true, 
    disabledReason: 'Tap a tree in your garden to access the path' 
  },
  { id: 'friends', label: 'Friends', emoji: '👥' },
];

// ============================================
// STYLES
// ============================================

const tabBarStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  padding: '8px 16px',
  paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,1) 100%)',
  borderTop: '1px solid #E5E7EB',
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 100,
};

const tabButtonStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  padding: '8px 16px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  transition: 'transform 0.2s',
};

const tabEmojiStyles: React.CSSProperties = {
  fontSize: 24,
  lineHeight: 1,
};

const tabLabelStyles = (isActive: boolean, isDisabled: boolean): React.CSSProperties => ({
  fontFamily: "'Fredoka', sans-serif",
  fontSize: 11,
  fontWeight: 500,
  color: isDisabled 
    ? '#9CA3AF' // gray-400
    : isActive 
      ? '#047857' // green-700
      : '#6B7280', // gray-500
});

// ============================================
// COMPONENT
// ============================================

/**
 * TabBar Component
 * 
 * Bottom navigation with tabs for Garden, Path, and Friends.
 * The Path tab is disabled because paths are accessed by tapping trees
 * in the garden, not directly from the tab bar.
 * 
 * @example
 * <TabBar
 *   currentView="garden"
 *   onGarden={() => navigate('garden')}
 *   onFriends={() => setShowFriends(true)}
 * />
 */
export const TabBar: React.FC<TabBarProps> = ({
  currentView,
  onGarden,
  onFriends,
}) => {
  /**
   * Handle tab click
   */
  const handleTabClick = (tab: TabConfig) => {
    if (tab.disabled) return;

    switch (tab.id) {
      case 'garden':
        onGarden();
        break;
      case 'friends':
        onFriends?.();
        break;
    }
  };

  /**
   * Determine if a tab should show as active
   */
  const isTabActive = (tabId: string): boolean => {
    if (tabId === 'garden') {
      // Garden tab is active when on garden view
      return currentView === 'garden';
    }
    if (tabId === 'path') {
      // Path tab is active when on path or lesson view
      // (though it's still disabled for direct click)
      return currentView === 'path' || currentView === 'lesson';
    }
    return false;
  };

  return (
    <nav style={tabBarStyles} role="navigation" aria-label="Main navigation">
      {TABS.map((tab) => {
        const isActive = isTabActive(tab.id);
        const isDisabled = tab.disabled;

        return (
          <motion.button
            key={tab.id}
            style={tabButtonStyles}
            onClick={() => handleTabClick(tab)}
            disabled={isDisabled}
            whileHover={!isDisabled ? { scale: 1.05 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            title={isDisabled ? tab.disabledReason : undefined}
          >
            <span style={tabEmojiStyles}>{tab.emoji}</span>
            <span style={tabLabelStyles(isActive, isDisabled)}>
              {tab.label}
            </span>
            
            {/* Active indicator dot */}
            {isActive && !isDisabled && (
              <motion.div
                layoutId="tabIndicator"
                style={{
                  position: 'absolute',
                  bottom: 4,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: '#047857', // green-700
                }}
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
};

export default TabBar;