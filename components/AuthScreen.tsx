/**
 * LingoFriends - Auth Screen Component
 * 
 * Kid-friendly login and signup screen.
 * Features:
 * - Simple, colorful design
 * - Clear error messages
 * - Toggle between login and signup
 * - Native language selection for new users
 * - Password reset via email
 * 
 * @module AuthScreen
 */

import React, { useState } from 'react';
import { useAuth } from '../src/hooks/useAuth';
import { requestPasswordReset } from '../services/pocketbaseService';
import type { NativeLanguage } from '../types';

// Available native languages
const LANGUAGES: NativeLanguage[] = [
  'English', 'Spanish', 'French', 'German', 'Portuguese', 
  'Ukrainian', 'Italian', 'Chinese', 'Japanese', 'Hindi', 'Romanian'
];

/**
 * Auth Screen Component
 * 
 * Displays login or signup form based on user selection.
 * Handles all auth flow with kid-friendly messaging.
 */
export function AuthScreen() {
  // Auth context
  const { login, signup, error, clearError, isLoading } = useAuth();
  
  // Form state
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage>('English');
  
  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

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
      setValidationError('Please enter your email!');
      return false;
    }

    if (!isValidEmail(email)) {
      setValidationError('Please enter a valid email address!');
      return false;
    }

    if (mode === 'forgot') {
      return true; // Only need email for password reset
    }

    if (!password) {
      setValidationError('Please enter a password!');
      return false;
    }

    if (password.length < 8) {
      setValidationError('Password needs at least 8 characters!');
      return false;
    }

    if (mode === 'signup' && !displayName.trim()) {
      setValidationError('Please enter your name!');
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
      await signup(email, password, displayName, nativeLanguage);
    } else if (mode === 'forgot') {
      await requestPasswordReset(email);
      setResetSent(true);
    }
  };

  /**
   * Toggle between login and signup modes
   */
  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    clearError();
    setValidationError(null);
  };

  // Combined error message
  const displayError = validationError || error;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🦉</div>
          <h1 className="text-3xl font-serif text-amber-900">LingoFriends</h1>
          <p className="text-amber-700 mt-2">Learn languages with friends!</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-amber-100">
          <h2 className="text-2xl font-bold text-amber-900 text-center mb-6">
            {mode === 'login' ? 'Welcome Back! 👋' : mode === 'signup' ? 'Join the Adventure! 🚀' : 'Reset Password 🔑'}
          </h2>

          {/* Password Reset Success Message */}
          {resetSent && mode === 'forgot' && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-4">
              <span className="mr-2">✉️</span>
              Check your email! We sent a link to reset your password.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mode === 'signup' ? "Parent's Email" : 'Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="parent@example.com"
                className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                disabled={isLoading}
                autoComplete="email"
              />
              {mode === 'signup' && (
                <p className="text-xs text-gray-500 mt-1">Ask a parent to help with this!</p>
              )}
            </div>

            {/* Password (not shown for forgot mode) */}
            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  disabled={isLoading}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            )}

            {/* Signup-only fields */}
            {mode === 'signup' && (
              <>
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What should we call you?
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex"
                    className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                    disabled={isLoading}
                  />
                </div>

                {/* Native Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What language do you speak at home?
                  </label>
                  <select
                    value={nativeLanguage}
                    onChange={(e) => setNativeLanguage(e.target.value as NativeLanguage)}
                    className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition-all bg-white"
                    disabled={isLoading}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Error Message */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <span className="mr-2">😅</span>
                {displayError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full py-4 rounded-xl font-bold text-lg transition-all
                ${isLoading 
                  ? 'bg-amber-200 text-amber-600 cursor-not-allowed' 
                  : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-98 shadow-lg hover:shadow-xl'
                }
              `}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </span>
              ) : mode === 'login' ? (
                "Let's Go! 🎉"
              ) : mode === 'signup' ? (
                "Create Account! 🌟"
              ) : (
                "Send Reset Link 📧"
              )}
            </button>
          </form>

          {/* Forgot Password Link (login mode only) */}
          {mode === 'login' && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setMode('forgot');
                  clearError();
                  setValidationError(null);
                  setResetSent(false);
                }}
                className="text-sm text-gray-500 hover:text-amber-700 transition-colors"
                disabled={isLoading}
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Toggle Mode */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                if (mode === 'forgot') {
                  setMode('login');
                } else {
                  setMode(mode === 'login' ? 'signup' : 'login');
                }
                clearError();
                setValidationError(null);
                setResetSent(false);
              }}
              className="text-amber-700 hover:text-amber-900 font-medium transition-colors"
              disabled={isLoading}
            >
              {mode === 'login' ? (
                <>
                  New here? <span className="underline">Create an account</span>
                </>
              ) : mode === 'signup' ? (
                <>
                  Already have an account? <span className="underline">Log in</span>
                </>
              ) : (
                <>
                  <span className="underline">← Back to login</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-amber-600 text-sm mt-6">
          🔒 Your data is safe with us
        </p>
      </div>
    </div>
  );
}

export default AuthScreen;
