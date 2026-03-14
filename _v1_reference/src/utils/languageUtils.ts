/**
 * LingoFriends — Language Utilities
 *
 * SINGLE SOURCE OF TRUTH for language code ↔ name conversion.
 * Every file in the project that needs to convert language names to codes
 * (or vice versa) MUST import from this file. No exceptions.
 *
 * BANNED PATTERNS — grep for these and remove them:
 *   .substring(0, 2) for language conversion   ❌
 *   .slice(0, 2) for language conversion        ❌
 *   Local language lookup objects in other files ❌
 *
 * Correct usage:
 *   import { toLanguageCode } from '../utils/languageUtils';
 *   toLanguageCode("German")  → "de"  ✅
 *   toLanguageCode("de")      → "de"  ✅
 *
 * @module utils/languageUtils
 */

// ============================================================================
// LOOKUP TABLES
// ============================================================================

/**
 * Map from lowercase language name → ISO 639-1 code.
 * Add new languages here — nowhere else.
 */
const NAME_TO_CODE: Record<string, string> = {
  english: 'en',
  french: 'fr',
  german: 'de',
  spanish: 'es',
  italian: 'it',
  portuguese: 'pt',
  japanese: 'ja',
  chinese: 'zh',
  korean: 'ko',
  russian: 'ru',
  arabic: 'ar',
  hindi: 'hi',
  dutch: 'nl',
  swedish: 'sv',
  polish: 'pl',
  ukrainian: 'uk',
  romanian: 'ro',
};

/**
 * Reverse map: code → display name.
 * Built automatically from NAME_TO_CODE so they can't drift apart.
 */
const CODE_TO_NAME: Record<string, string> = {};
for (const [name, code] of Object.entries(NAME_TO_CODE)) {
  CODE_TO_NAME[code] = name.charAt(0).toUpperCase() + name.slice(1);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Convert a language name OR code to an ISO 639-1 two-letter code.
 *
 * Handles all formats a profile field might contain:
 *   toLanguageCode("German")    → "de"
 *   toLanguageCode("de")        → "de"  (passthrough)
 *   toLanguageCode("FRENCH")    → "fr"  (case-insensitive)
 *   toLanguageCode(" English ") → "en"  (whitespace trimmed)
 *
 * Falls back to "en" for completely unrecognised input and logs an error
 * so we can catch new languages that need to be added to the lookup table.
 *
 * @param language - Language name or code (any case, any whitespace)
 * @returns ISO 639-1 two-letter code
 */
export function toLanguageCode(language: string): string {
  const normalized = language.toLowerCase().trim();

  // Already a valid 2-letter code we know?
  if (normalized.length === 2 && CODE_TO_NAME[normalized]) {
    return normalized;
  }

  // Look up by full name
  const code = NAME_TO_CODE[normalized];
  if (code) return code;

  // Unknown 2-letter string — use as-is with a warning so we can diagnose it
  if (normalized.length === 2) {
    console.warn(`[languageUtils] Unknown 2-letter code "${normalized}", using as-is`);
    return normalized;
  }

  // Completely unknown — fall back to "en" so the app doesn't crash
  console.error(
    `[languageUtils] Unrecognised language: "${language}", defaulting to "en". ` +
    `Add it to NAME_TO_CODE in src/utils/languageUtils.ts if needed.`
  );
  return 'en';
}

/**
 * Convert a language code to a display name suitable for UI text.
 *
 *   toLanguageName("de")      → "German"
 *   toLanguageName("fr")      → "French"
 *   toLanguageName("German")  → "German"  (passthrough — already a name)
 *
 * @param code - ISO 639-1 code or full language name
 * @returns Capitalised display name, or the input unchanged if not found
 */
export function toLanguageName(code: string): string {
  const normalized = code.toLowerCase().trim();

  // Already a full name we recognise?
  if (NAME_TO_CODE[normalized]) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  // It's a code — look up the display name
  return CODE_TO_NAME[normalized] || code;
}

/**
 * Check whether a string is a supported ISO 639-1 language code.
 *
 * @param code - Candidate code string
 * @returns true if it's a 2-letter code in our supported set
 */
export function isValidLanguageCode(code: string): boolean {
  return code.length === 2 && CODE_TO_NAME[code.toLowerCase()] !== undefined;
}

/**
 * Get all supported languages as { code, name } pairs.
 * Useful for populating language selection dropdowns.
 *
 * @returns Array sorted alphabetically by name
 */
export function getSupportedLanguages(): Array<{ code: string; name: string }> {
  return Object.entries(CODE_TO_NAME)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
