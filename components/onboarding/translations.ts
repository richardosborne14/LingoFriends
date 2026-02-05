/**
 * LingoFriends - Onboarding & Auth Translations
 * 
 * Provides localized strings for the authentication and onboarding flows.
 * Currently supports English and French for Phase 1.
 * 
 * Usage:
 *   const t = translations[nativeLanguage] || translations.en;
 *   <h1>{t.onboarding.step1Title}</h1>
 * 
 * @module onboarding/translations
 */

import type { NativeLanguage } from '../../types';

// ============================================
// TYPES
// ============================================

export interface AuthStrings {
  welcomeBack: string;
  joinAdventure: string;
  resetPassword: string;
  email: string;
  emailPlaceholder: string;
  emailHelper: string;
  password: string;
  passwordPlaceholder: string;
  whatCallYou: string;
  namePlaceholder: string;
  whatLanguageSpeak: string;
  letsGo: string;
  createAccount: string;
  sendResetLink: string;
  forgotPassword: string;
  newHere: string;
  createAnAccount: string;
  alreadyHaveAccount: string;
  logIn: string;
  backToLogin: string;
  resetEmailSent: string;
  dataSafe: string;
  // Errors
  errorEmail: string;
  errorEmailInvalid: string;
  errorPassword: string;
  errorPasswordLength: string;
  errorName: string;
  errorGeneric: string;
}

export interface OnboardingStrings {
  // Step 1 - Native Language
  step1Title: string;
  step1Subtitle: string;
  
  // Step 2 - Subject/Target Language
  step2Title: string;
  step2Subtitle: string;
  
  // Step 3 - Interests
  step3Title: string;
  step3Subtitle: string;
  
  // Navigation
  next: string;
  back: string;
  skip: string;
  letsStart: string;
  
  // Completion
  completeTitle: string;
  completeSubtitle: string;
  startLearning: string;
  
  // Subject descriptions
  learnFrench: string;
  learnEnglish: string;
  learnGerman: string;
  learnMaths: string;
  learnScratch: string;
  comingSoon: string;
  
  // Interest categories
  hobbies: string;
  sports: string;
  music: string;
  other: string;
  
  // Encouragement
  greatChoice: string;
  awesome: string;
  perfect: string;
}

export interface TranslationSet {
  auth: AuthStrings;
  onboarding: OnboardingStrings;
}

// ============================================
// ENGLISH TRANSLATIONS
// ============================================

const en: TranslationSet = {
  auth: {
    welcomeBack: 'Welcome Back! 👋',
    joinAdventure: 'Join the Adventure! 🚀',
    resetPassword: 'Reset Password 🔑',
    email: "Parent's Email",
    emailPlaceholder: 'parent@example.com',
    emailHelper: 'Ask a parent to help with this!',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    whatCallYou: 'What should we call you?',
    namePlaceholder: 'Alex',
    whatLanguageSpeak: 'What language do you speak at home?',
    letsGo: "Let's Go! 🎉",
    createAccount: 'Create Account! 🌟',
    sendResetLink: 'Send Reset Link 📧',
    forgotPassword: 'Forgot your password?',
    newHere: 'New here?',
    createAnAccount: 'Create an account',
    alreadyHaveAccount: 'Already have an account?',
    logIn: 'Log in',
    backToLogin: '← Back to login',
    resetEmailSent: 'Check your email! We sent a link to reset your password.',
    dataSafe: '🔒 Your data is safe with us',
    // Errors
    errorEmail: 'Please enter your email!',
    errorEmailInvalid: 'Please enter a valid email address!',
    errorPassword: 'Please enter a password!',
    errorPasswordLength: 'Password needs at least 8 characters!',
    errorName: 'Please enter your name!',
    errorGeneric: "Oops! Something went wrong. Let's try again!",
  },
  onboarding: {
    // Step 1
    step1Title: "What's your native language?",
    step1Subtitle: "I'll speak to you in this language",
    
    // Step 2
    step2Title: 'What do you want to learn?',
    step2Subtitle: "Pick a language you'd like to master",
    
    // Step 3
    step3Title: 'What are your interests?',
    step3Subtitle: 'Choose as many as you like! This helps me personalize your lessons.',
    
    // Navigation
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    letsStart: "Let's Start!",
    
    // Completion
    completeTitle: "You're all set! 🎉",
    completeSubtitle: "Let's start your learning adventure!",
    startLearning: 'Start Learning!',
    
    // Subject descriptions
    learnFrench: 'Learn to speak French!',
    learnEnglish: 'Learn to speak English!',
    learnGerman: 'Learn to speak German!',
    learnMaths: 'Numbers and problem solving',
    learnScratch: 'Learn to code with Scratch',
    comingSoon: 'Coming soon!',
    
    // Interest categories
    hobbies: 'Hobbies',
    sports: 'Sports',
    music: 'Music',
    other: 'Other',
    
    // Encouragement
    greatChoice: 'Great choice!',
    awesome: 'Awesome!',
    perfect: 'Perfect!',
  },
};

// ============================================
// FRENCH TRANSLATIONS
// ============================================

const fr: TranslationSet = {
  auth: {
    welcomeBack: 'Bon retour ! 👋',
    joinAdventure: "Rejoins l'aventure ! 🚀",
    resetPassword: 'Réinitialiser 🔑',
    email: 'Email du parent',
    emailPlaceholder: 'parent@example.com',
    emailHelper: 'Demande à un parent de t\'aider !',
    password: 'Mot de passe',
    passwordPlaceholder: '••••••••',
    whatCallYou: "Comment tu t'appelles ?",
    namePlaceholder: 'Alex',
    whatLanguageSpeak: 'Quelle langue parles-tu à la maison ?',
    letsGo: "C'est parti ! 🎉",
    createAccount: 'Créer un compte ! 🌟',
    sendResetLink: 'Envoyer le lien 📧',
    forgotPassword: 'Mot de passe oublié ?',
    newHere: 'Nouveau ici ?',
    createAnAccount: 'Crée un compte',
    alreadyHaveAccount: 'Tu as déjà un compte ?',
    logIn: 'Connecte-toi',
    backToLogin: '← Retour',
    resetEmailSent: 'Vérifie tes emails ! On t\'a envoyé un lien.',
    dataSafe: '🔒 Tes données sont en sécurité',
    // Errors
    errorEmail: 'Entre ton email !',
    errorEmailInvalid: 'Entre une adresse email valide !',
    errorPassword: 'Entre un mot de passe !',
    errorPasswordLength: 'Le mot de passe doit faire au moins 8 caractères !',
    errorName: 'Entre ton prénom !',
    errorGeneric: 'Oups ! Quelque chose n\'a pas marché. Réessayons !',
  },
  onboarding: {
    // Step 1
    step1Title: 'Quelle est ta langue maternelle ?',
    step1Subtitle: 'Je te parlerai dans cette langue',
    
    // Step 2
    step2Title: "Qu'est-ce que tu veux apprendre ?",
    step2Subtitle: 'Choisis une langue que tu aimerais maîtriser',
    
    // Step 3
    step3Title: 'Quels sont tes centres d\'intérêt ?',
    step3Subtitle: 'Choisis autant que tu veux ! Ça m\'aide à personnaliser tes leçons.',
    
    // Navigation
    next: 'Suivant',
    back: 'Retour',
    skip: 'Passer',
    letsStart: 'Commencer !',
    
    // Completion
    completeTitle: 'Tu es prêt(e) ! 🎉',
    completeSubtitle: "C'est parti pour l'aventure !",
    startLearning: "C'est parti !",
    
    // Subject descriptions
    learnFrench: 'Apprends à parler français !',
    learnEnglish: 'Apprends à parler anglais !',
    learnGerman: 'Apprends à parler allemand !',
    learnMaths: 'Nombres et résolution de problèmes',
    learnScratch: 'Apprends à coder avec Scratch',
    comingSoon: 'Bientôt disponible !',
    
    // Interest categories
    hobbies: 'Loisirs',
    sports: 'Sports',
    music: 'Musique',
    other: 'Autre',
    
    // Encouragement
    greatChoice: 'Super choix !',
    awesome: 'Génial !',
    perfect: 'Parfait !',
  },
};

// ============================================
// TRANSLATIONS MAP
// ============================================

/**
 * All available translations indexed by language code.
 * Falls back to English for unsupported languages.
 */
export const translations: Record<string, TranslationSet> = {
  English: en,
  French: fr,
  // Add fallbacks for other languages (use English)
  Spanish: en,
  German: en,
  Portuguese: en,
  Ukrainian: en,
  Italian: en,
  Chinese: en,
  Japanese: en,
  Hindi: en,
  Romanian: en,
};

/**
 * Get translations for a given native language.
 * Falls back to English if language not supported.
 * 
 * @param language - The user's native language
 * @returns Translation set for that language
 */
export function getTranslations(language: NativeLanguage | string): TranslationSet {
  return translations[language] || en;
}

/**
 * Get just the auth translations for a language.
 * Useful in AuthScreen where we don't need onboarding strings.
 */
export function getAuthTranslations(language: NativeLanguage | string): AuthStrings {
  return getTranslations(language).auth;
}

/**
 * Get just the onboarding translations for a language.
 */
export function getOnboardingTranslations(language: NativeLanguage | string): OnboardingStrings {
  return getTranslations(language).onboarding;
}

export default translations;
