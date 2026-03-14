/**
 * LingoFriends - Auth Screen Component
 * 
 * Kid-friendly login and signup screen.
 * Features:
 * - Modern, colorful design using new UI components
 * - Clear error messages with i18n support
 * - Toggle between login and signup
 * - Flag toggle for UI language (EN/FR) at top of screen
 * - Native language is now selected during onboarding (not at signup)
 * - Password reset via email
 * 
 * @module AuthScreen
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../src/hooks/useAuth';
import { requestPasswordReset } from '../services/pocketbaseService';
import { Logo, Button, Input, Card } from './ui';
import { getAuthTranslations } from './onboarding/translations';

// ============================================
// CONSTANTS
// ============================================

/**
 * UI language options for the auth screen.
 * Native language is selected during onboarding, not at signup.
 */
type UILanguage = 'English' | 'French';

interface LanguageOption {
  code: UILanguage;
  flag: string;
}

const UI_LANGUAGES: LanguageOption[] = [
  { code: 'English', flag: '🇬🇧' },
  { code: 'French', flag: '🇫🇷' },
];

// Animation variants for page transitions
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2 }
  }
};

// ============================================
// COMPONENT
// ============================================

/**
 * Auth Screen Component
 * 
 * Displays login or signup form based on user selection.
 * Handles all auth flow with kid-friendly messaging.
 * UI language adapts to selected flag at top of screen.
 * Native language is collected in onboarding (Step 1).
 */
export function AuthScreen() {
  // Auth context
  const { login, signup, error, clearError, isLoading } = useAuth();
  
  // Form state
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // UI language state (for translations only - not saved to profile)
  // Native language is collected during onboarding
  const [uiLanguage, setUILanguage] = useState<UILanguage>('English');
  
  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Get translations based on selected UI language
  const t = useMemo(() => getAuthTranslations(uiLanguage), [uiLanguage]);

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /**
   * Validate form fields before submission
   */
  const validateForm = (): boolean => {
    setValidationError(null);

    if (!email.trim()) {
      setValidationError(t.errorEmail);
      return false;
    }

    if (!isValidEmail(email)) {
      setValidationError(t.errorEmailInvalid);
      return false;
    }

    if (mode === 'forgot') {
      return true;
    }

    if (!password) {
      setValidationError(t.errorPassword);
      return false;
    }

    if (password.length < 8) {
      setValidationError(t.errorPasswordLength);
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) return;

    if (mode === 'login') {
      await login(email, password);
    } else if (mode === 'signup') {
      // Use 'Learner' as default name and 'English' as default native language
      // Both are collected properly during onboarding
      await signup(email, password, 'Learner', 'English');
    } else if (mode === 'forgot') {
      await requestPasswordReset(email);
      setResetSent(true);
    }
  };

  /**
   * Switch between modes
   */
  const switchMode = (newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode);
    clearError();
    setValidationError(null);
    setResetSent(false);
  };

  /**
   * Toggle UI language (EN/FR)
   */
  const toggleUILanguage = (lang: UILanguage) => {
    setUILanguage(lang);
    // Clear any existing errors since they'll be in the old language
    setValidationError(null);
    clearError();
  };

  // Combined error message
  const displayError = validationError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#e0f2fe] flex flex-col items-center justify-center p-4">
      {/* Language Toggle - Top Right */}
      <div className="absolute top-4 right-4 flex gap-1">
        {UI_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => toggleUILanguage(lang.code)}
            className={`
              text-2xl p-2 rounded-lg transition-all
              ${uiLanguage === lang.code 
                ? 'bg-white shadow-md scale-110' 
                : 'opacity-60 hover:opacity-100 hover:bg-white/50'
              }
            `}
            aria-label={`Switch to ${lang.code}`}
          >
            {lang.flag}
          </button>
        ))}
      </div>
      
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-center mb-4">
            <Logo size="xl" animate />
          </div>
          <h1 className="text-3xl font-bold text-[#262626]">LingoFriends</h1>
          <p className="text-[#737373] mt-2">
            {uiLanguage === 'French' 
              ? 'Apprends des langues avec des amis !' 
              : 'Learn languages with friends!'}
          </p>
        </motion.div>

        {/* Auth Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-${uiLanguage}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card variant="elevated" padding="lg">
              {/* Title - Translated */}
              <h2 className="text-2xl font-bold text-[#262626] text-center mb-6">
                {mode === 'login' && t.welcomeBack}
                {mode === 'signup' && t.joinAdventure}
                {mode === 'forgot' && t.resetPassword}
              </h2>

              {/* Password Reset Success Message */}
              {resetSent && mode === 'forgot' && (
                <motion.div 
                  className="bg-[#dcfce7] border border-[#86efac] text-[#166534] px-4 py-3 rounded-2xl text-sm mb-4 flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <span>✉️</span>
                  {t.resetEmailSent}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <Input
                  type="email"
                  label={mode === 'signup' ? t.email : t.email.replace("Parent's ", '')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder={t.emailPlaceholder}
                  disabled={isLoading}
                  helperText={mode === 'signup' ? t.emailHelper : undefined}
                />

                {/* Password (not shown for forgot mode) */}
                {mode !== 'forgot' && (
                  <Input
                    type="password"
                    label={t.password}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    disabled={isLoading}
                  />
                )}

                {/* NOTE: Native language selection removed from signup */}
                {/* User selects their native language in onboarding (Step 1) */}

                {/* Error Message */}
                {displayError && (
                  <motion.div 
                    className="bg-[#fee2e2] border border-[#fecaca] text-[#991b1b] px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <span>😅</span>
                    {displayError}
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isLoading}
                >
                  {mode === 'login' && t.letsGo}
                  {mode === 'signup' && t.createAccount}
                  {mode === 'forgot' && t.sendResetLink}
                </Button>
              </form>

              {/* Forgot Password Link (login mode only) */}
              {mode === 'login' && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => switchMode('forgot')}
                    className="text-sm text-[#737373] hover:text-[#58CC02] transition-colors"
                    disabled={isLoading}
                  >
                    {t.forgotPassword}
                  </button>
                </div>
              )}

              {/* Toggle Mode */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    if (mode === 'forgot') {
                      switchMode('login');
                    } else {
                      switchMode(mode === 'login' ? 'signup' : 'login');
                    }
                  }}
                  className="text-[#1CB0F6] hover:text-[#0284c7] font-medium transition-colors"
                  disabled={isLoading}
                >
                  {mode === 'login' && (
                    <>{t.newHere} <span className="underline">{t.createAnAccount}</span></>
                  )}
                  {mode === 'signup' && (
                    <>{t.alreadyHaveAccount} <span className="underline">{t.logIn}</span></>
                  )}
                  {mode === 'forgot' && (
                    <span className="underline">{t.backToLogin}</span>
                  )}
                </button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <motion.p 
          className="text-center text-[#a3a3a3] text-sm mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {t.dataSafe}
        </motion.p>
      </div>
    </div>
  );
}

export default AuthScreen;
