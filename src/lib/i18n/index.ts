/**
 * LingoFriends V2 — i18n Initialisation
 *
 * Uses svelte-i18n for runtime locale switching.
 * Supported locales: 'en' (English), 'fr' (French).
 *
 * Key design decisions:
 * - Locales are loaded lazily (only the selected language is downloaded)
 * - Initial locale is read from localStorage (survives page refresh)
 *   and falls back to browser navigator language, then 'en'
 * - When a user selects their native language in onboarding, call
 *   setLocale(code) — this switches the UI immediately (reactive)
 * - The selected locale is always mirrored to localStorage so it
 *   persists before the profile DB record is loaded
 *
 * Usage:
 *   import { _, locale } from 'svelte-i18n';
 *   import { setLocale } from '$lib/i18n';
 *   $locale         // current locale code ('en' | 'fr')
 *   $_('onboarding.next')    // translated string
 *   setLocale('fr') // switch language immediately
 */

import { register, init, getLocaleFromNavigator, locale } from 'svelte-i18n';

/** Key used to persist locale selection in localStorage */
const LOCALE_STORAGE_KEY = 'lf_locale';

/** Supported locale codes — keep in sync with JSON files */
export type SupportedLocale = 'en' | 'fr';

/** All locales we have translation files for */
export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'fr'];

/** Default fallback — English is always the safety net */
const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * Register both locale files for lazy loading.
 * Vite will code-split these into separate chunks.
 */
register('en', () => import('./en.json'));
register('fr', () => import('./fr.json'));

/**
 * Determine the best initial locale:
 * 1. localStorage value (set during previous session)
 * 2. Browser navigator language (abbreviated to 2 chars)
 * 3. Default ('en')
 *
 * We do NOT wait for the DB profile to load before setting
 * locale — that would cause a flash of untranslated text.
 */
function getInitialLocale(): string {
	// Check localStorage first — persists across refreshes
	if (typeof window !== 'undefined') {
		const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
		if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
			return stored;
		}
	}

	// Try browser language (e.g. "fr-FR" → "fr")
	const navigatorLocale = getLocaleFromNavigator();
	if (navigatorLocale) {
		const twoChar = navigatorLocale.substring(0, 2).toLowerCase() as SupportedLocale;
		if (SUPPORTED_LOCALES.includes(twoChar)) {
			return twoChar;
		}
	}

	return DEFAULT_LOCALE;
}

/**
 * Initialise svelte-i18n with lazy loading and smart locale detection.
 * Called once from the root layout. Safe to call multiple times (init is idempotent).
 */
export function initI18n(): void {
	init({
		fallbackLocale: DEFAULT_LOCALE,
		initialLocale: getInitialLocale(),
	});
}

/**
 * Switch the app locale immediately and persist to localStorage.
 * Call this when the user selects their native language in onboarding
 * or changes language in Settings.
 *
 * @param code - 'en' | 'fr'
 */
export function setLocale(code: SupportedLocale): void {
	// Update the svelte-i18n locale store — all $_ references update reactively
	locale.set(code);

	// Persist to localStorage so the locale survives page refresh
	// (before the user's profile is loaded from the DB)
	if (typeof window !== 'undefined') {
		window.localStorage.setItem(LOCALE_STORAGE_KEY, code);
	}
}

/**
 * Read the currently active locale from localStorage.
 * Used server-side or before the store is available.
 *
 * @returns current locale code, defaults to 'en'
 */
export function getStoredLocale(): SupportedLocale {
	if (typeof window === 'undefined') return DEFAULT_LOCALE;
	const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
	// Validate against supported locales — reject garbage data (e.g. 'zh', null, '')
	// without this check, an unsupported locale would propagate and cause missing translations
	if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
		return stored as SupportedLocale;
	}
	return DEFAULT_LOCALE;
}

// Re-export the locale store so callers can do: import { locale } from '$lib/i18n'
export { locale };
