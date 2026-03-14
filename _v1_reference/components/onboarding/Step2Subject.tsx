/**
 * LingoFriends - Onboarding Step 2: Subject/Target Language Selection
 * 
 * Second step of onboarding - user selects what they want to learn.
 * Phase 1 supports: English, French, German (as target languages)
 * Plus grayed-out "Coming soon" options for Maths and Scratch.
 * 
 * Logic:
 * - Can't learn your native language
 * - If native = English → can learn French or German
 * - If native = French → can learn English or German
 * 
 * @module onboarding/Step2Subject
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, Badge } from '../ui';
import type { NativeLanguage, TargetSubject, SubjectType } from '../../types';
import { getOnboardingTranslations } from './translations';

// ============================================
// TYPES
// ============================================

export interface Step2SubjectProps {
  /** User's native language (to filter out) */
  nativeLanguage: NativeLanguage;
  /** Currently selected subject (if any) */
  selectedSubject: TargetSubject | null;
  /** Called when user selects a subject */
  onSelect: (subject: TargetSubject, type: SubjectType) => void;
  /** Current display language for translations */
  displayLanguage: NativeLanguage;
}

// ============================================
// CONSTANTS
// ============================================

interface SubjectOption {
  id: TargetSubject;
  type: SubjectType;
  icon: string;
  flag?: string; // For languages
  /** Function to check if available based on native language */
  isAvailable: (nativeLang: NativeLanguage) => boolean;
  /** Is this a coming soon feature? */
  comingSoon: boolean;
  /** Translation key for description */
  descriptionKey: 'learnEnglish' | 'learnFrench' | 'learnGerman' | 'learnMaths' | 'learnScratch';
}

const SUBJECTS: SubjectOption[] = [
  {
    id: 'English',
    type: 'language',
    icon: '🇬🇧',
    flag: '🇬🇧',
    isAvailable: (native) => native !== 'English',
    comingSoon: false,
    descriptionKey: 'learnEnglish',
  },
  {
    id: 'German',
    type: 'language',
    icon: '🇩🇪',
    flag: '🇩🇪',
    isAvailable: () => true, // Anyone can learn German
    comingSoon: false,
    descriptionKey: 'learnGerman',
  },
  // NOTE: French as target is not available in Phase 1, but structure supports it
  // Uncomment when ready:
  // {
  //   id: 'French' as TargetSubject,
  //   type: 'language',
  //   icon: '🇫🇷',
  //   flag: '🇫🇷',
  //   isAvailable: (native) => native !== 'French',
  //   comingSoon: false,
  //   descriptionKey: 'learnFrench',
  // },
  {
    id: 'Maths',
    type: 'maths',
    icon: '🔢',
    isAvailable: () => false, // Coming soon
    comingSoon: true,
    descriptionKey: 'learnMaths',
  },
  {
    id: 'Scratch',
    type: 'coding',
    icon: '🐱',
    isAvailable: () => false, // Coming soon
    comingSoon: true,
    descriptionKey: 'learnScratch',
  },
];

// Animation variants
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
 * Step 2: Subject/Target Language Selection
 * 
 * Shows available learning subjects based on user's native language.
 * Coming soon subjects are grayed out with badge.
 */
export function Step2Subject({ 
  nativeLanguage,
  selectedSubject, 
  onSelect,
  displayLanguage 
}: Step2SubjectProps) {
  const t = getOnboardingTranslations(displayLanguage);

  // Filter subjects based on native language
  const availableSubjects = SUBJECTS.filter(
    subject => subject.isAvailable(nativeLanguage) || subject.comingSoon
  );

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
          {t.step2Title}
        </h2>
        <p className="text-[#737373]">
          {t.step2Subtitle}
        </p>
      </motion.div>

      {/* Subject Grid */}
      <motion.div
        className="grid grid-cols-2 gap-4 w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {availableSubjects.map((subject) => {
          const isSelected = selectedSubject === subject.id;
          const isAvailable = subject.isAvailable(nativeLanguage);
          const isComingSoon = subject.comingSoon;

          return (
            <motion.div key={subject.id} variants={cardVariants}>
              <Card
                variant={isSelected ? 'elevated' : 'default'}
                className={`
                  relative cursor-pointer transition-all duration-200
                  ${isAvailable && !isComingSoon
                    ? 'hover:shadow-md hover:scale-[1.02]' 
                    : 'opacity-50 cursor-not-allowed'
                  }
                  ${isSelected 
                    ? 'ring-2 ring-[#58CC02] ring-offset-2 bg-[#f0fdf4]' 
                    : ''
                  }
                `}
                padding="lg"
                onClick={() => {
                  if (isAvailable && !isComingSoon) {
                    onSelect(subject.id, subject.type);
                  }
                }}
              >
                {/* Coming Soon Badge */}
                {isComingSoon && (
                  <div className="absolute -top-2 -right-2 bg-[#fbbf24] text-[#78350f] text-xs font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
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
                  {/* Icon/Flag */}
                  <span className="text-4xl md:text-5xl mb-3" role="img" aria-label={subject.id}>
                    {subject.icon}
                  </span>

                  {/* Subject name */}
                  <span className="text-lg font-bold text-[#262626]">
                    {subject.id}
                  </span>

                  {/* Description */}
                  <span className="text-sm text-[#737373] mt-1">
                    {t[subject.descriptionKey]}
                  </span>

                  {/* Subject type badge (for non-language subjects) */}
                  {subject.type !== 'language' && (
                    <Badge 
                      variant={subject.type === 'maths' ? 'secondary' : 'accent'} 
                      size="sm"
                      className="mt-2"
                    >
                      {subject.type === 'maths' ? '🔢 Math' : '💻 Coding'}
                    </Badge>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Selection feedback */}
      {selectedSubject && (
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-[#58CC02] font-medium">
            {t.awesome} 🎯
          </span>
        </motion.div>
      )}
    </div>
  );
}

export default Step2Subject;
