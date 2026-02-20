/**
 * LingoFriends - Step 2.5: Proficiency Level Selection
 * 
 * Self-assessment step where users indicate their current level
 * in the target language using layman-friendly descriptions.
 * 
 * @module onboarding/Step2_5Proficiency
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export interface Step2_5ProficiencyProps {
  /** Currently selected proficiency level */
  selectedLevel?: ProficiencyLevel;
  /** Called when a level is selected */
  onSelect: (level: ProficiencyLevel) => void;
  /** Language for UI display */
  displayLanguage: string;
}

/** Proficiency levels aligned with CEFR */
export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2';

/** Proficiency option with layman description */
interface ProficiencyOption {
  level: ProficiencyLevel;
  label: string;
  description: string;
  emoji: string;
  examples: string[];
}

// ============================================
// CONSTANTS
// ============================================

/** Proficiency options with user-friendly descriptions */
const PROFICIENCY_OPTIONS: ProficiencyOption[] = [
  {
    level: 'A1',
    label: 'Complete Beginner',
    description: "I'm just starting out",
    emoji: '🌱',
    examples: ['I know little to nothing', 'I can say a few words like "hello"'],
  },
  {
    level: 'A2',
    label: 'Basic Speaker',
    description: "I can say some words and phrases",
    emoji: '🌿',
    examples: ['I can introduce myself', 'I know numbers and colors', 'I can order food'],
  },
  {
    level: 'B1',
    label: 'Intermediate',
    description: "I can have simple conversations",
    emoji: '🌳',
    examples: ['I can talk about my day', 'I can ask for directions', 'I can describe things'],
  },
  {
    level: 'B2',
    label: 'Upper Intermediate',
    description: "I can have regular conversations",
    emoji: '🌲',
    examples: ['I can discuss topics in depth', 'I can watch shows with subtitles', 'I can express opinions'],
  },
];

// Translations for different display languages
const TRANSLATIONS: Record<string, { title: string; subtitle: string }> = {
  English: {
    title: "What's your current level?",
    subtitle: "Be honest - we'll personalize your lessons based on this!",
  },
  Spanish: {
    title: "¿Cuál es tu nivel actual?",
    subtitle: "Sé honesto: ¡personalizaremos tus lecciones según esto!",
  },
  French: {
    title: "Quel est votre niveau actuel ?",
    subtitle: "Soyez honnête - nous personnaliserons vos leçons selon cela !",
  },
  German: {
    title: "Wie ist Ihr aktuelles Niveau?",
    subtitle: "Seien Sie ehrlich - wir passen Ihre Lektionen daran an!",
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * Step2_5Proficiency - Self-assessment of proficiency level
 * 
 * @example
 * <Step2_5Proficiency
 *   selectedLevel="A1"
 *   onSelect={(level) => console.log(level)}
 *   displayLanguage="English"
 * />
 */
export function Step2_5Proficiency({
  selectedLevel,
  onSelect,
  displayLanguage,
}: Step2_5ProficiencyProps) {
  // Get translations for the display language
  const lang = displayLanguage in TRANSLATIONS ? displayLanguage : 'English';
  const t = TRANSLATIONS[lang];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-bold text-[#262626] mb-2"
        >
          {t.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[#525252] text-sm md:text-base"
        >
          {t.subtitle}
        </motion.p>
      </div>

      {/* Proficiency Options */}
      <div className="space-y-3">
        {PROFICIENCY_OPTIONS.map((option, index) => {
          const isSelected = selectedLevel === option.level;
          
          return (
            <motion.button
              key={option.level}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelect(option.level)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-green-300 hover:bg-green-50/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Emoji icon */}
                <span className="text-3xl">{option.emoji}</span>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold text-lg ${isSelected ? 'text-green-700' : 'text-[#262626]'}`}>
                      {option.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {option.level}
                    </span>
                  </div>
                  
                  <p className={`text-sm mb-2 ${isSelected ? 'text-green-600' : 'text-[#525252]'}`}>
                    {option.description}
                  </p>
                  
                  {/* Examples - only show when selected */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 pt-2 border-t border-green-200"
                    >
                      <p className="text-xs text-green-600 font-medium mb-1">Examples:</p>
                      <ul className="text-xs text-green-700 space-y-0.5">
                        {option.examples.map((example, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <span className="text-green-400">•</span>
                            {example}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </div>
                
                {/* Checkmark */}
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-500 text-xl"
                  >
                    ✓
                  </motion.span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-center text-xs text-slate-500 mt-4">
        Don't worry if you're not sure - we'll help calibrate as you learn! 💪
      </p>
    </div>
  );
}

export default Step2_5Proficiency;