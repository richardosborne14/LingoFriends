/**
 * LingoFriends - Onboarding Step 3: Interests Selection
 * 
 * Third and final step of onboarding - user selects their interests.
 * Multi-select with toggle chips organized by category.
 * 
 * These interests help the AI personalize:
 * - Conversation topics
 * - Lesson examples
 * - Vocabulary choices
 * 
 * @module onboarding/Step3Interests
 */

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NativeLanguage } from '../../types';
import { getOnboardingTranslations } from './translations';
import { 
  INTEREST_CATEGORIES, 
  getInterestLabel, 
  getCategoryLabel 
} from './interests-data';

// ============================================
// TYPES
// ============================================

export interface Step3InterestsProps {
  /** Currently selected interest IDs */
  selectedInterests: string[];
  /** Called when interests change */
  onSelect: (interests: string[]) => void;
  /** Current display language for translations */
  displayLanguage: NativeLanguage;
}

// ============================================
// ANIMATIONS
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const chipVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2 }
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * Step 3: Interests Selection
 * 
 * Displays categorized interest chips that can be toggled on/off.
 * Users can select as many as they like (or skip entirely).
 */
export function Step3Interests({ 
  selectedInterests, 
  onSelect,
  displayLanguage 
}: Step3InterestsProps) {
  const t = getOnboardingTranslations(displayLanguage);

  /**
   * Toggle an interest selection
   * Uses useCallback with proper dependencies to avoid stale closure issues
   */
  const toggleInterest = useCallback((interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      // Remove it
      onSelect(selectedInterests.filter(id => id !== interestId));
    } else {
      // Add it
      onSelect([...selectedInterests, interestId]);
    }
  }, [selectedInterests, onSelect]);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-[#262626] mb-2">
          {t.step3Title}
        </h2>
        <p className="text-[#737373]">
          {t.step3Subtitle}
        </p>
      </motion.div>

      {/* Selected count */}
      <AnimatePresence mode="wait">
        {selectedInterests.length > 0 && (
          <motion.div
            className="mb-4 text-sm text-[#58CC02] font-medium"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {selectedInterests.length} selected ✨
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interest Categories - scroll handled by parent container */}
      <div className="w-full space-y-6 px-2 pb-4">
        {INTEREST_CATEGORIES.map((category, categoryIndex) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1 }}
          >
            {/* Category Header */}
            <h3 className="text-sm font-semibold text-[#525252] uppercase tracking-wide mb-3">
              {getCategoryLabel(category, displayLanguage)}
            </h3>

            {/* Interest Chips */}
            <motion.div
              className="flex flex-wrap gap-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {category.interests.map((interest) => {
                const isSelected = selectedInterests.includes(interest.id);

                return (
                  <motion.button
                    key={interest.id}
                    type="button"
                    variants={chipVariants}
                    onClick={() => toggleInterest(interest.id)}
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-2 rounded-full
                      text-sm font-medium transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-[#58CC02] focus:ring-offset-2
                      ${isSelected
                        ? 'bg-[#58CC02] text-white shadow-md scale-105'
                        : 'bg-white border-2 border-[#e5e5e5] text-[#525252] hover:border-[#58CC02] hover:bg-[#f0fdf4]'
                      }
                    `}
                    whileHover={{ scale: isSelected ? 1.05 : 1.02 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Emoji icon */}
                    <span className="text-base" role="img" aria-hidden="true">
                      {interest.icon}
                    </span>
                    
                    {/* Label */}
                    <span>
                      {getInterestLabel(interest, displayLanguage)}
                    </span>

                    {/* Checkmark for selected */}
                    {isSelected && (
                      <motion.svg
                        className="w-4 h-4 ml-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </motion.svg>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Selection feedback / encouragement */}
      <motion.div
        className="mt-4 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {selectedInterests.length === 0 ? (
          <span className="text-[#a3a3a3] text-sm">
            {t.skip} →
          </span>
        ) : selectedInterests.length < 3 ? (
          <span className="text-[#737373] text-sm">
            {t.greatChoice} 
          </span>
        ) : (
          <span className="text-[#58CC02] font-medium">
            {t.perfect} 🎉
          </span>
        )}
      </motion.div>
    </div>
  );
}

export default Step3Interests;
