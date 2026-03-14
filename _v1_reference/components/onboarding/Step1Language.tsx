/**
 * LingoFriends - Onboarding Step 1: Native Language Selection
 * 
 * First step of onboarding - user selects their native language.
 * Phase 1 only supports English and French.
 * 
 * This selection determines:
 * - UI language throughout the app
 * - Coach communication language
 * - Which target languages are available (can't learn your native)
 * 
 * @module onboarding/Step1Language
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui';
import type { NativeLanguage } from '../../types';
import { getOnboardingTranslations } from './translations';

// ============================================
// TYPES
// ============================================

export interface Step1LanguageProps {
  /** Currently selected language (if any) */
  selectedLanguage: NativeLanguage | null;
  /** Called when user selects a language */
  onSelect: (language: NativeLanguage) => void;
  /** Current display language for translations */
  displayLanguage: NativeLanguage;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Available native languages for Phase 1.
 * Only English and French are fully supported.
 */
interface LanguageOption {
  code: NativeLanguage;
  nativeName: string; // Name in that language
  englishName: string; // Name in English
  flag: string;
  available: boolean;
}

const NATIVE_LANGUAGES: LanguageOption[] = [
  { code: 'English', nativeName: 'English', englishName: 'English', flag: '🇬🇧', available: true },
  { code: 'French', nativeName: 'Français', englishName: 'French', flag: '🇫🇷', available: true },
  // Future languages (shown as coming soon)
  { code: 'Spanish', nativeName: 'Español', englishName: 'Spanish', flag: '🇪🇸', available: false },
  { code: 'German', nativeName: 'Deutsch', englishName: 'German', flag: '🇩🇪', available: false },
  { code: 'Portuguese', nativeName: 'Português', englishName: 'Portuguese', flag: '🇵🇹', available: false },
  { code: 'Italian', nativeName: 'Italiano', englishName: 'Italian', flag: '🇮🇹', available: false },
];

// Animation variants for staggered card appearance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * Step 1: Native Language Selection
 * 
 * Displays a grid of language cards. Available languages are selectable,
 * unavailable ones show "Coming soon!" badge.
 */
export function Step1Language({ 
  selectedLanguage, 
  onSelect,
  displayLanguage 
}: Step1LanguageProps) {
  const t = getOnboardingTranslations(displayLanguage);

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-[#262626] mb-2">
          {t.step1Title}
        </h2>
        <p className="text-[#737373]">
          {t.step1Subtitle}
        </p>
      </motion.div>

      {/* Language Grid */}
      <motion.div
        className="grid grid-cols-2 gap-4 w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {NATIVE_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguage === lang.code;
          const isAvailable = lang.available;

          return (
            <motion.div key={lang.code} variants={cardVariants}>
              <Card
                variant={isSelected ? 'elevated' : 'default'}
                className={`
                  relative cursor-pointer transition-all duration-200
                  ${isAvailable 
                    ? 'hover:shadow-md hover:scale-[1.02]' 
                    : 'opacity-50 cursor-not-allowed'
                  }
                  ${isSelected 
                    ? 'ring-2 ring-[#58CC02] ring-offset-2 bg-[#f0fdf4]' 
                    : ''
                  }
                `}
                padding="lg"
                onClick={() => isAvailable && onSelect(lang.code)}
              >
                {/* Coming Soon Badge */}
                {!isAvailable && (
                  <div className="absolute -top-2 -right-2 bg-[#fbbf24] text-[#78350f] text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {t.comingSoon}
                  </div>
                )}

                {/* Selected Checkmark */}
                {isSelected && (
                  <motion.div
                    className="absolute -top-2 -right-2 w-6 h-6 bg-[#58CC02] rounded-full flex items-center justify-center shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.div>
                )}

                {/* Card Content */}
                <div className="flex flex-col items-center text-center py-2">
                  {/* Flag */}
                  <span className="text-4xl md:text-5xl mb-3" role="img" aria-label={lang.englishName}>
                    {lang.flag}
                  </span>

                  {/* Native name (primary) */}
                  <span className="text-lg font-bold text-[#262626]">
                    {lang.nativeName}
                  </span>

                  {/* English name (secondary) */}
                  {lang.nativeName !== lang.englishName && (
                    <span className="text-sm text-[#737373]">
                      {lang.englishName}
                    </span>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Selection feedback */}
      {selectedLanguage && (
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-[#58CC02] font-medium">
            {t.greatChoice} ✨
          </span>
        </motion.div>
      )}
    </div>
  );
}

export default Step1Language;
