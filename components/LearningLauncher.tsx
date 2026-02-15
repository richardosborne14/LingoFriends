/**
 * LearningLauncher Component
 * 
 * Entry point for learning sessions - shows subject and theme selection.
 * Replaces the immediate chat interface with a guided launch experience.
 * 
 * This component helps kids:
 * 1. See what subject they're learning (from onboarding)
 * 2. Pick a theme/interest to focus on today
 * 3. Start a personalized AI conversation
 * 
 * Reduces decision paralysis by making choices clear and fun.
 * 
 * @module components/LearningLauncher
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, Logo } from './ui';
import { findInterestById, getInterestLabel } from './onboarding/interests-data';
import type { 
  UserProfile, 
  NativeLanguage, 
  TargetSubject, 
  UserInterest 
} from '../types';

// ============================================
// TYPES
// ============================================

interface LearningLauncherProps {
  /** User profile with subject and interests */
  profile: UserProfile;
  /** Callback when user clicks Start Learning */
  onStart: (theme: string) => Promise<void>;
  /** Callback when user clicks Just Chat (skip theme selection) */
  onJustChat?: () => void;
  /** Whether the AI is generating the opening message */
  isLoading?: boolean;
}

// ============================================
// TRANSLATIONS
// ============================================

interface LauncherTranslations {
  greeting: string;
  readyToLearn: string;
  learningSubject: string;
  chooseTheme: string;
  selectTheme: string;
  generalTheme: string;
  startButton: string;
  loadingButton: string;
  noInterestsTip: string;
  locked: string;
  justChatButton: string;
}

const TRANSLATIONS: Record<'English' | 'French', LauncherTranslations> = {
  English: {
    greeting: 'Hi',
    readyToLearn: 'Ready to learn?',
    learningSubject: "I'm learning",
    chooseTheme: 'Theme for today',
    selectTheme: 'Choose a theme...',
    generalTheme: 'General',
    startButton: 'Start Learning! 🚀',
    loadingButton: 'Getting ready...',
    noInterestsTip: "💡 Add interests in your profile for more personalized lessons!",
    locked: 'Set in profile',
    justChatButton: '💬 Just Chat',
  },
  French: {
    greeting: 'Salut',
    readyToLearn: 'Prêt à apprendre ?',
    learningSubject: "J'apprends",
    chooseTheme: "Thème d'aujourd'hui",
    selectTheme: 'Choisis un thème...',
    generalTheme: 'Général',
    startButton: 'Commencer ! 🚀',
    loadingButton: 'Préparation...',
    noInterestsTip: "💡 Ajoute des centres d'intérêt dans ton profil pour des leçons personnalisées !",
    locked: 'Défini dans le profil',
    justChatButton: '💬 Discuter',
  },
};

/**
 * Get translations for a language, fallback to English
 */
function getTranslations(language: NativeLanguage): LauncherTranslations {
  if (language === 'French') return TRANSLATIONS.French;
  return TRANSLATIONS.English;
}

// ============================================
// SUBJECT DISPLAY HELPER
// ============================================

/**
 * Get display info for a subject
 * Falls back to targetLanguage if targetSubject not set (legacy profiles)
 */
function getSubjectDisplay(
  subject: TargetSubject | undefined,
  targetLanguage?: string
): { icon: string; label: string } {
  // Use subject if set, otherwise fall back to targetLanguage
  const effectiveSubject = subject || targetLanguage;
  
  switch (effectiveSubject) {
    case 'English':
      return { icon: '🇬🇧', label: 'English' };
    case 'German':
      return { icon: '🇩🇪', label: 'German' };
    case 'French':
      return { icon: '🇫🇷', label: 'French' };
    case 'Maths':
      return { icon: '🔢', label: 'Maths' };
    case 'Scratch':
      return { icon: '🧩', label: 'Scratch' };
    default:
      return { icon: '📚', label: effectiveSubject || 'Learning' };
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * LearningLauncher - Guided entry to start learning sessions
 * 
 * Shows:
 * - User's locked subject from onboarding
 * - Theme dropdown from their interests
 * - Big "Start Learning" button
 * 
 * Handles empty interests gracefully with "General" option
 */
export default function LearningLauncher({
  profile,
  onStart,
  onJustChat,
  isLoading = false,
}: LearningLauncherProps) {
  // Selected theme state
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  
  // Get translations based on native language
  const t = getTranslations(profile.nativeLanguage);
  
  // Get subject display info (falls back to targetLanguage for legacy profiles)
  const subject = getSubjectDisplay(profile.targetSubject, profile.targetLanguage);
  
  // Build theme options from user's interests
  const themeOptions = useMemo(() => {
    const options: Array<{ id: string; label: string; icon: string }> = [];
    
    // Add user's selected interests
    if (profile.selectedInterests && profile.selectedInterests.length > 0) {
      for (const interestId of profile.selectedInterests) {
        const interest = findInterestById(interestId);
        if (interest) {
          options.push({
            id: interestId,
            label: getInterestLabel(interest, profile.nativeLanguage),
            icon: interest.icon,
          });
        }
      }
    }
    
    // Always add "General" option at the end
    options.push({
      id: 'general',
      label: t.generalTheme,
      icon: '🌟',
    });
    
    return options;
  }, [profile.selectedInterests, profile.nativeLanguage, t.generalTheme]);
  
  // Whether user has any interests selected
  const hasInterests = (profile.selectedInterests?.length || 0) > 0;
  
  // Handle start click
  const handleStart = async () => {
    if (!selectedTheme || isLoading) return;
    
    // Find the label for the selected theme
    const themeOption = themeOptions.find(opt => opt.id === selectedTheme);
    const themeName = themeOption?.label || t.generalTheme;
    
    await onStart(themeName);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#e0f2fe] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card variant="elevated" padding="lg" className="text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Logo size="lg" animate />
          </div>
          
          {/* Greeting */}
          <h1 className="text-2xl md:text-3xl font-bold text-[#262626] mb-1">
            {t.greeting} {profile.name}! 👋
          </h1>
          <p className="text-[#737373] text-lg mb-8">{t.readyToLearn}</p>
          
          {/* Subject Display (Locked) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#525252] mb-2 text-left">
              {t.learningSubject}
            </label>
            <div className="relative">
              <div className="w-full px-4 py-3 bg-[#f5f5f5] border-2 border-[#e5e5e5] rounded-xl text-left flex items-center gap-3 cursor-not-allowed opacity-80">
                <span className="text-2xl">{subject.icon}</span>
                <span className="font-semibold text-[#262626] flex-1">{subject.label}</span>
                <Badge variant="neutral" size="sm">
                  🔒 {t.locked}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Theme Selector */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-[#525252] mb-2 text-left">
              {t.chooseTheme}
            </label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-[#e5e5e5] rounded-xl text-[#262626] font-medium focus:border-[#58CC02] focus:outline-none transition-colors appearance-none cursor-pointer"
              disabled={isLoading}
            >
              <option value="" disabled>
                {t.selectTheme}
              </option>
              {themeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
            
            {/* Selected theme preview */}
            {selectedTheme && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 flex justify-center"
              >
                {(() => {
                  const opt = themeOptions.find(o => o.id === selectedTheme);
                  return opt ? (
                    <Badge variant="success" size="md">
                      {opt.icon} {opt.label}
                    </Badge>
                  ) : null;
                })()}
              </motion.div>
            )}
          </div>
          
          {/* No Interests Tip */}
          {!hasInterests && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-[#737373] mb-6 bg-[#fef9c3] border border-[#fde047] rounded-lg px-3 py-2"
            >
              {t.noInterestsTip}
            </motion.p>
          )}
          
          {/* Start Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleStart}
            disabled={!selectedTheme || isLoading}
            className="text-lg py-4"
          >
            {isLoading ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block mr-2"
                >
                  ⏳
                </motion.span>
                {t.loadingButton}
              </>
            ) : (
              t.startButton
            )}
          </Button>
          
          {/* Just Chat - skip theme, go straight to Main Hall */}
          {onJustChat && (
            <button
              onClick={onJustChat}
              disabled={isLoading}
              className="mt-3 w-full py-3 text-[#737373] hover:text-[#525252] hover:bg-[#f5f5f5] rounded-xl transition-colors text-sm font-medium disabled:opacity-40"
            >
              {t.justChatButton}
            </button>
          )}
        </Card>
        
        {/* Fun decoration */}
        <motion.div
          className="text-center mt-4 text-3xl"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🦉
        </motion.div>
      </motion.div>
    </div>
  );
}
