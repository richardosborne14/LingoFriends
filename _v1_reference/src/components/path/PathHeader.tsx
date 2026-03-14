/**
 * PathHeader Component
 * 
 * Header component for the Path View that displays the skill path
 * title, icon, and progress information. Includes a back button
 * to return to the garden view.
 * 
 * @module PathHeader
 */

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Props for the PathHeader component
 */
export interface PathHeaderProps {
  /** Skill path icon (emoji) */
  icon: string;
  /** Skill path name */
  name: string;
  /** Number of completed lessons */
  completedCount: number;
  /** Total number of lessons */
  totalCount: number;
  /** Callback when back button is clicked */
  onBack: () => void;
}

/**
 * PathHeader Component
 * 
 * Displays the skill path header with:
 * - Back button to return to garden
 * - Skill path icon and name
 * - Progress text showing completed/total lessons
 * 
 * @param props - Component props
 * @returns Header component for path view
 * 
 * @example
 * <PathHeader
 *   icon="⚽"
 *   name="Sports Talk"
 *   completedCount={2}
 *   totalCount={4}
 *   onBack={() => navigate('/garden')}
 * />
 */
export const PathHeader: React.FC<PathHeaderProps> = ({
  icon,
  name,
  completedCount,
  totalCount,
  onBack,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-6"
    >
      {/* Back button - positioned absolutely on the left */}
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-slate-100 
                     hover:bg-slate-200 active:bg-slate-300
                     border-none rounded-lg px-3 py-2
                     font-semibold text-sm text-slate-600
                     cursor-pointer transition-colors
                     flex items-center gap-1"
          aria-label="Back to garden"
        >
          <span>←</span>
          <span className="hidden sm:inline">Garden</span>
        </motion.button>

        {/* Center content */}
        <div className="px-12">
          {/* Skill path icon */}
          <div className="text-4xl mb-2" role="img" aria-label={name}>
            {icon}
          </div>

          {/* Skill path name */}
          <h2 className="font-['Nunito'] font-bold text-2xl text-green-800 mb-1">
            {name}
          </h2>

          {/* Progress text */}
          <p className="font-['Nunito'] font-medium text-sm text-slate-500">
            {completedCount} of {totalCount} lesson{totalCount !== 1 ? 's' : ''} complete
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default PathHeader;