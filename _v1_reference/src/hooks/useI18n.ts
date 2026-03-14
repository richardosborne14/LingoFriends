/**
 * useI18n Hook - React integration for i18n service
 * 
 * Provides reactive translations that update when language changes.
 * Components using this hook will re-render when setLanguage() is called.
 * 
 * @see src/services/i18n.ts
 * @module hooks/useI18n
 */

import { useState, useEffect, useCallback } from 'react';
import {
  t,
  setLanguage,
  getLanguage,
  subscribe,
  isLanguageSupported,
  getSupportedLanguages,
  type NativeLanguage,
} from '../services/i18n';

/**
 * Hook return type
 */
export interface UseI18nReturn {
  /** Current language code */
  language: NativeLanguage;
  /** Translation function */
  t: (key: string, values?: Record<string, string | number>) => string;
  /** Change language */
  setLanguage: (lang: NativeLanguage) => void;
  /** Get all supported languages */
  getSupportedLanguages: () => Array<{ code: NativeLanguage; name: string }>;
  /** Check if language is supported */
  isLanguageSupported: (lang: string) => boolean;
}

/**
 * React hook for i18n translations.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, language, setLanguage } = useI18n();
 *   
 *   return (
 *     <div>
 *       <h1>{t('garden.title')}</h1>
 *       <button onClick={() => setLanguage('fr')}>
 *         {language === 'fr' ? ' Français' : ' Switch to French'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useI18n(): UseI18nReturn {
  // Track language to trigger re-renders
  const [currentLang, setCurrentLang] = useState<NativeLanguage>(getLanguage());
  
  // Subscribe to language changes
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setCurrentLang(getLanguage());
    });
    
    return unsubscribe;
  }, []);
  
  // Memoized translation function
  const translate = useCallback((key: string, values?: Record<string, string | number>) => {
    return t(key, values);
  }, [currentLang]); // Re-create when language changes
  
  // Change language handler
  const changeLanguage = useCallback((lang: NativeLanguage) => {
    setLanguage(lang);
  }, []);
  
  return {
    language: currentLang,
    t: translate,
    setLanguage: changeLanguage,
    getSupportedLanguages,
    isLanguageSupported,
  };
}

/**
 * Hook for just the translation function (no re-renders on language change).
 * Use this when you don't need reactive updates.
 */
export function useTranslation(): (key: string, values?: Record<string, string | number>) => string {
  const { t } = useI18n();
  return t;
}

export default useI18n;