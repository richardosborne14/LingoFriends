/**
 * LingoFriends V2 — Language Configuration
 *
 * SINGLE SOURCE OF TRUTH for language codes, names, TTS codes, and flags.
 *
 * Every file that converts between language names and codes MUST import
 * from this module. No exceptions. No shortcuts.
 *
 * WHY: V1 used `"German".substring(0,2)` in multiple places, producing "Ge"
 * instead of "de". This caused silent failures in TTS and AI prompts.
 * See LEARNINGS.md — "[V1 Legacy] Language code conversion — single source of truth"
 *
 * @module types/language
 */

/** Supported ISO 639-1 language codes */
export type LanguageCode = 'de' | 'en' | 'fr' | 'es';

/** Configuration for a supported language */
export interface LanguageConfig {
	/** ISO 639-1 two-letter code */
	code: LanguageCode;
	/** English display name */
	name: string;
	/** Flag emoji */
	flag: string;
	/** Google TTS language code (e.g., 'de-DE') */
	ttsCode: string;
}

/**
 * Master language registry.
 * To add a new language: add ONE entry here. Everything else derives from this.
 */
const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
	de: { code: 'de', name: 'German', flag: '🇩🇪', ttsCode: 'de-DE' },
	en: { code: 'en', name: 'English', flag: '🇬🇧', ttsCode: 'en-GB' },
	fr: { code: 'fr', name: 'French', flag: '🇫🇷', ttsCode: 'fr-FR' },
	es: { code: 'es', name: 'Spanish', flag: '🇪🇸', ttsCode: 'es-ES' },
};

/** Reverse lookup: lowercase name → code (built once at module load) */
const NAME_TO_CODE: Record<string, LanguageCode> = {};
for (const lang of Object.values(LANGUAGES)) {
	NAME_TO_CODE[lang.name.toLowerCase()] = lang.code;
}

/**
 * Convert a language name OR code to a LanguageCode.
 *
 * Handles all formats:
 *   toCode("German")   → "de"   ✅
 *   toCode("de")       → "de"   ✅
 *   toCode("FRENCH")   → "fr"   ✅
 *   toCode(" English ") → "en"  ✅
 *   "German".substring(0,2) → "Ge" ❌ NEVER use this pattern
 *
 * @throws Error on unrecognised input — fail-fast, no silent fallbacks
 */
export function toCode(nameOrCode: string): LanguageCode {
	const normalised = nameOrCode.toLowerCase().trim();

	// Already a valid code?
	if (normalised in LANGUAGES) {
		return normalised as LanguageCode;
	}

	// Lookup by full English name
	const code = NAME_TO_CODE[normalised];
	if (code) return code;

	throw new Error(
		`[language] Unrecognised language: "${nameOrCode}". ` +
			`Supported: ${Object.values(LANGUAGES)
				.map((l) => `${l.name} (${l.code})`)
				.join(', ')}`
	);
}

/**
 * Convert a LanguageCode to its English display name.
 *   toName("de") → "German"
 */
export function toName(code: LanguageCode): string {
	const lang = LANGUAGES[code];
	if (!lang) throw new Error(`[language] Unknown code: "${code}"`);
	return lang.name;
}

/**
 * Get the Google TTS language code for a LanguageCode.
 *   getTTSCode("de") → "de-DE"
 */
export function getTTSCode(code: LanguageCode): string {
	// Fallback to en-GB if somehow an invalid code slips through
	return LANGUAGES[code]?.ttsCode ?? 'en-GB';
}

/**
 * Get the flag emoji for a LanguageCode.
 *   getFlag("fr") → "🇫🇷"
 */
export function getFlag(code: LanguageCode): string {
	return LANGUAGES[code]?.flag ?? '🏳️';
}

/**
 * Get all supported languages as an array.
 * Useful for rendering language pickers in onboarding.
 */
export function getAllLanguages(): LanguageConfig[] {
	return Object.values(LANGUAGES);
}

/**
 * Type guard: check if a string is a valid LanguageCode.
 * Use this before calling toCode() when handling external data.
 *
 * Note: isValidCode("ge") === false — the V1 bug is structurally impossible.
 */
export function isValidCode(code: string): code is LanguageCode {
	return code in LANGUAGES;
}
