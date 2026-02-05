/**
 * LingoFriends - Onboarding Components
 * 
 * Barrel export for all onboarding-related components.
 * Import from '@/components/onboarding' for easy access.
 * 
 * @module onboarding
 */

// Main container
export { OnboardingContainer } from './OnboardingContainer';
export type { OnboardingContainerProps, OnboardingData } from './OnboardingContainer';

// Step components
export { StepIndicator } from './StepIndicator';
export type { StepIndicatorProps } from './StepIndicator';

export { Step0DisplayName } from './Step0DisplayName';
export { Step1Language } from './Step1Language';
export type { Step1LanguageProps } from './Step1Language';

export { Step2Subject } from './Step2Subject';
export type { Step2SubjectProps } from './Step2Subject';

export { Step3Interests } from './Step3Interests';
export type { Step3InterestsProps } from './Step3Interests';

export { OnboardingComplete } from './OnboardingComplete';
export type { OnboardingCompleteProps } from './OnboardingComplete';

// Translations
export { 
  translations, 
  getTranslations,
  getAuthTranslations,
  getOnboardingTranslations,
} from './translations';
export type { 
  TranslationSet,
  AuthStrings,
  OnboardingStrings,
} from './translations';

// Interest data
export {
  INTEREST_CATEGORIES,
  getInterestLabel,
  getCategoryLabel,
  findInterestById,
  getAllInterestIds,
  formatSelectedInterests,
} from './interests-data';
export type {
  Interest,
  InterestCategory,
} from './interests-data';
