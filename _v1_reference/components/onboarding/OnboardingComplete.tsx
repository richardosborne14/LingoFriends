/**
 * LingoFriends - Onboarding Complete Screen
 * 
 * Celebratory screen shown after completing all onboarding steps.
 * Includes confetti animation and a call-to-action to start learning.
 * 
 * @module onboarding/OnboardingComplete
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Logo } from '../ui';
import type { NativeLanguage, TargetSubject } from '../../types';
import { getOnboardingTranslations } from './translations';

// ============================================
// TYPES
// ============================================

export interface OnboardingCompleteProps {
  /** User's native language for translations */
  displayLanguage: NativeLanguage;
  /** What they're learning */
  targetSubject: TargetSubject;
  /** Number of interests selected */
  interestsCount: number;
  /** Called when user clicks start */
  onStart: () => void;
  /** Loading state while saving */
  isLoading?: boolean;
}

// ============================================
// CONFETTI COMPONENT
// ============================================

/**
 * Simple confetti animation using CSS/framer-motion
 * Lightweight alternative to heavy confetti libraries
 */
function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: ['#58CC02', '#1CB0F6', '#FF4B4B', '#FFC800', '#CE82FF'][
        Math.floor(Math.random() * 5)
      ],
      size: 8 + Math.random() * 8,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: window.innerHeight + 100,
            opacity: [1, 1, 0],
            rotate: Math.random() > 0.5 ? 360 : -360,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

/**
 * Onboarding Complete Screen
 * 
 * Shows a celebration animation and summary before entering the app.
 */
export function OnboardingComplete({ 
  displayLanguage, 
  targetSubject,
  interestsCount,
  onStart,
  isLoading = false,
}: OnboardingCompleteProps) {
  const t = getOnboardingTranslations(displayLanguage);
  const [showConfetti, setShowConfetti] = useState(true);

  // Stop confetti after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-md mx-auto text-center px-4">
      {/* Confetti! */}
      {showConfetti && <Confetti />}

      {/* Animated Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          delay: 0.2,
        }}
        className="mb-6"
      >
        <Logo size="xl" animate />
      </motion.div>

      {/* Title */}
      <motion.h1
        className="text-3xl md:text-4xl font-bold text-[#262626] mb-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {t.completeTitle}
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="text-lg text-[#737373] mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {t.completeSubtitle}
      </motion.p>

      {/* Summary Card */}
      <motion.div
        className="w-full bg-[#f0fdf4] rounded-2xl p-6 mb-8 border-2 border-[#dcfce7]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="space-y-4">
          {/* What you're learning */}
          <div className="flex items-center justify-between">
            <span className="text-[#525252]">
              {displayLanguage === 'French' ? 'Tu apprends' : "You're learning"}
            </span>
            <span className="font-bold text-[#262626] flex items-center gap-2">
              {targetSubject === 'English' && '🇬🇧'}
              {targetSubject === 'German' && '🇩🇪'}
              {targetSubject === 'Maths' && '🔢'}
              {targetSubject === 'Scratch' && '🐱'}
              {targetSubject}
            </span>
          </div>

          {/* Interests count */}
          <div className="flex items-center justify-between">
            <span className="text-[#525252]">
              {displayLanguage === 'French' ? 'Centres d\'intérêt' : 'Interests'}
            </span>
            <span className="font-bold text-[#262626]">
              {interestsCount > 0 
                ? `${interestsCount} ${displayLanguage === 'French' ? 'sélectionnés' : 'selected'} ✨` 
                : displayLanguage === 'French' ? 'Aucun (on découvrira !)' : "None (we'll discover!)"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="w-full"
      >
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onStart}
          isLoading={isLoading}
        >
          {t.startLearning} 🚀
        </Button>
      </motion.div>

      {/* Fun message */}
      <motion.p
        className="mt-6 text-sm text-[#a3a3a3]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {displayLanguage === 'French' 
          ? 'Prêt(e) pour une aventure linguistique ?' 
          : 'Ready for a language adventure?'}
      </motion.p>
    </div>
  );
}

export default OnboardingComplete;
