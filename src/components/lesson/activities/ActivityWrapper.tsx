/**
 * LingoFriends - Activity Wrapper Component
 * 
 * Shared wrapper for all activity types providing:
 * - Help button and help panel
 * - Sun Drop value indicator
 * - Reduced reward indicator (when retry/help used)
 * 
 * @module ActivityWrapper
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================

/**
 * Props for the ActivityWrapper component.
 */
export interface ActivityWrapperProps {
  /** Sun Drop value for this activity (1-4) */
  sunDrops: number;
  /** Help text to display when help button is tapped */
  helpText: string;
  /** Whether the user has used help */
  usedHelp: boolean;
  /** Whether this is a retry attempt (wrong answer given) */
  isRetry: boolean;
  /** Callback when help button is tapped */
  onHelp: () => void;
  /** Child content (the activity component) */
  children: React.ReactNode;
}

// ============================================
// SUN DROP ICON
// ============================================

/**
 * SVG Sun Drop icon used in activity headers.
 * Matches the prototype's custom Sun Drop design.
 */
export const SunDropIcon: React.FC<{ size?: number; glow?: boolean }> = ({ 
  size = 20, 
  glow = false 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    style={{ filter: glow ? 'drop-shadow(0 0 6px #FCD34D)' : 'none' }}
  >
    <defs>
      <linearGradient id="sunDropGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FCD34D" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <radialGradient id="sunDropShine" cx="35%" cy="30%">
        <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
    {/* Drop shape */}
    <path
      d="M12 2 C12 2 5 11 5 15 C5 18.87 8.13 22 12 22 C15.87 22 19 18.87 19 15 C19 11 12 2 12 2Z"
      fill="url(#sunDropGradient)"
      stroke="#D97706"
      strokeWidth="0.8"
    />
    {/* Shine highlight */}
    <ellipse cx="9.5" cy="13" rx="3" ry="4" fill="url(#sunDropShine)" />
    {/* Ray line */}
    <line 
      x1="12" y1="15" x2="12" y2="12.5" 
      stroke="#FEF3C7" 
      strokeWidth="0.6" 
      strokeLinecap="round" 
      opacity="0.5" 
    />
  </svg>
);

// ============================================
// HELP PANEL COMPONENT
// ============================================

/**
 * Help panel that slides in when the help button is tapped.
 * Displays Professor Finch's hint text.
 */
export const HelpPanel: React.FC<{
  text: string;
  onClose: () => void;
}> = ({ text, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 12 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    className="bg-sky-50 border-2 border-sky-200 rounded-xl p-3 mb-3 relative"
  >
    <div className="flex gap-2">
      <span className="text-lg flex-shrink-0">🐦</span>
      <p className="font-semibold text-sm text-slate-700 leading-relaxed flex-1">
        {text}
      </p>
    </div>
    <button
      onClick={onClose}
      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition-colors"
      aria-label="Close help"
    >
      ✕
    </button>
  </motion.div>
);

// ============================================
// ACTIVITY HEADER COMPONENT
// ============================================

/**
 * Header displayed at the top of each activity.
 * Shows help button (left) and Sun Drop indicator (right).
 */
const ActivityHeader: React.FC<{
  sunDrops: number;
  reduced: boolean;
  onHelp: () => void;
}> = ({ sunDrops, reduced, onHelp }) => (
  <div className="flex justify-between items-center mb-3">
    {/* Help button */}
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onHelp}
      className="bg-sky-50 border-2 border-sky-200 rounded-lg px-3 py-1.5 font-bold text-xs text-sky-500 hover:bg-sky-100 transition-colors"
    >
      💬 Help
    </motion.button>
    
    {/* Sun Drop indicator */}
    <span className="bg-amber-100 border border-amber-300 rounded-md px-2 py-1 font-extrabold text-xs text-amber-700 flex items-center gap-1">
      <SunDropIcon size={14} />
      <span>{reduced ? Math.ceil(sunDrops / 2) : sunDrops}</span>
      {reduced && (
        <span className="text-[10px] text-amber-600 font-medium ml-0.5">
          (retry)
        </span>
      )}
    </span>
  </div>
);

// ============================================
// ACTIVITY WRAPPER COMPONENT
// ============================================

/**
 * ActivityWrapper - Shared wrapper for all activity types.
 * 
 * Provides consistent UI elements:
 * - Help button that reveals a hint panel
 * - Sun Drop value indicator
 * - Reduced reward display when help used or retrying
 * 
 * @example
 * <ActivityWrapper
 *   sunDrops={3}
 *   helpText="Think about what 'gardien' means..."
 *   usedHelp={usedHelp}
 *   isRetry={attempts > 0}
 *   onHelp={() => setUsedHelp(true)}
 * >
 *   <MultipleChoice ... />
 * </ActivityWrapper>
 */
export const ActivityWrapper: React.FC<ActivityWrapperProps> = ({
  sunDrops,
  helpText,
  usedHelp,
  isRetry,
  onHelp,
  children,
}) => {
  const [showHelp, setShowHelp] = useState(false);

  const handleHelp = () => {
    setShowHelp(true);
    onHelp();
  };

  const reduced = usedHelp || isRetry;

  return (
    <div className="bg-[#FCFFFE] rounded-2xl p-4 border-2 border-green-200 shadow-sm">
      <ActivityHeader
        sunDrops={sunDrops}
        reduced={reduced}
        onHelp={handleHelp}
      />
      
      <AnimatePresence>
        {showHelp && (
          <HelpPanel
            text={helpText}
            onClose={() => setShowHelp(false)}
          />
        )}
      </AnimatePresence>
      
      {children}
    </div>
  );
};

export default ActivityWrapper;