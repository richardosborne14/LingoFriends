# Task 0.2: Project Structure & Language Module

**Status:** 🔲 Not started
**Phase:** 0 (Scaffolding)
**Confidence Target:** 9/10
**Estimated Time:** 1h
**Dependencies:** Task 0.1 complete
**Actual Time:** _fill after completion_
**Completed:** _fill after completion_

---

## Mandatory Reads Before Starting

1. `.clinerules` — Rule 3 (File Organisation) for the exact directory tree
2. `05-CLINERULES.md` (new-docs) — full file structure spec
3. `LEARNINGS.md` — "[V1 Legacy] Language code conversion — single source of truth"

---

## Objective

Create the full directory structure and the `language.ts` module — the SINGLE SOURCE OF TRUTH for language code conversion. This prevents the V1 disaster where `"German".substring(0,2)` produced `"ge"` instead of `"de"`.

---

## Subtasks

### 0.2.1 — Create all directories

```bash
# Routes
mkdir -p src/routes/\(auth\)/login
mkdir -p src/routes/\(auth\)/register
mkdir -p src/routes/\(auth\)/onboarding
mkdir -p src/routes/\(app\)/garden
mkdir -p src/routes/\(app\)/lesson/\[id\]
mkdir -p src/routes/\(app\)/friends
mkdir -p src/routes/\(app\)/profile
mkdir -p src/routes/api

# Library
mkdir -p src/lib/components/ui
mkdir -p src/lib/components/activities
mkdir -p src/lib/components/garden
mkdir -p src/lib/components/social
mkdir -p src/lib/three/garden
mkdir -p src/lib/three/avatars
mkdir -p src/lib/stores
mkdir -p src/lib/services
mkdir -p src/lib/server/ai
mkdir -p src/lib/server/db
mkdir -p src/lib/server/auth
mkdir -p src/lib/server/lessons
mkdir -p src/lib/types
mkdir -p src/lib/utils

# Tests (mirrors src structure)
mkdir -p src/tests/setup
mkdir -p src/tests/types
mkdir -p src/tests/server/db
mkdir -p src/tests/server/auth
mkdir -p src/tests/server/ai
mkdir -p src/tests/server/lessons
mkdir -p src/tests/routes
mkdir -p src/tests/components
mkdir -p src/tests/helpers

# Documentation
mkdir -p docs/phases

# Static assets
mkdir -p static/models
mkdir -p static/audio
mkdir -p static/fonts
```

---

### 0.2.2 — Create `src/lib/types/language.ts`

This file replaces all V1 language conversion logic. Every file that needs to convert between language names and codes MUST import from here. No exceptions.

```typescript
/**
 * LingoFriends V2 — Language Configuration
 *
 * SINGLE SOURCE OF TRUTH for language codes, names, TTS codes, and flags.
 * Every file that converts between language names and codes MUST import
 * from this file. No .substring(0,2). No local lookup tables.
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
 * Add new languages here — everything else derives from this.
 */
const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  de: { code: 'de', name: 'German', flag: '🇩🇪', ttsCode: 'de-DE' },
  en: { code: 'en', name: 'English', flag: '🇬🇧', ttsCode: 'en-GB' },
  fr: { code: 'fr', name: 'French', flag: '🇫🇷', ttsCode: 'fr-FR' },
  es: { code: 'es', name: 'Spanish', flag: '🇪🇸', ttsCode: 'es-ES' },
};

/** Reverse lookup: name → code (lowercase keys for case-insensitive matching) */
const NAME_TO_CODE: Record<string, LanguageCode> = {};
for (const lang of Object.values(LANGUAGES)) {
  NAME_TO_CODE[lang.name.toLowerCase()] = lang.code;
}

/**
 * Convert a language name OR code to a LanguageCode.
 *
 * Handles all formats:
 *   toCode("German")  → "de"
 *   toCode("de")      → "de"
 *   toCode("FRENCH")  → "fr"
 *   toCode(" English ") → "en"
 *
 * Throws on unrecognised input (fail-fast, no silent fallbacks).
 */
export function toCode(nameOrCode: string): LanguageCode {
  const normalised = nameOrCode.toLowerCase().trim();

  // Already a valid code?
  if (normalised in LANGUAGES) {
    return normalised as LanguageCode;
  }

  // Lookup by full name
  const code = NAME_TO_CODE[normalised];
  if (code) return code;

  throw new Error(
    `[language] Unrecognised language: "${nameOrCode}". ` +
    `Supported: ${Object.values(LANGUAGES).map(l => `${l.name} (${l.code})`).join(', ')}`
  );
}

/**
 * Convert a LanguageCode to its English display name.
 *   toName("de") → "German"
 */
export function toName(code: LanguageCode): string {
  return LANGUAGES[code]?.name
    ?? (() => { throw new Error(`[language] Unknown code: "${code}"`); })();
}

/**
 * Get the Google TTS language code for a LanguageCode.
 *   getTTSCode("de") → "de-DE"
 */
export function getTTSCode(code: LanguageCode): string {
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
 * Check if a string is a valid LanguageCode.
 */
export function isValidCode(code: string): code is LanguageCode {
  return code in LANGUAGES;
}
```

---

### 0.2.3 — Create stub route files

Create minimal `+page.svelte` files for every route so SvelteKit recognises the structure:

```svelte
<!-- src/routes/(auth)/login/+page.svelte -->
<h1>Login — Coming in Task 1.2</h1>
```

Repeat for: register, onboarding, garden, lesson/[id], friends, profile.

Create layout files:
- `src/routes/+layout.svelte` — root layout (empty for now)
- `src/routes/(auth)/+layout.svelte` — auth layout stub
- `src/routes/(app)/+layout.svelte` — app layout stub

---

## Tests

```typescript
// src/tests/types/language.test.ts
import { describe, it, expect } from 'vitest';
import { toCode, toName, getTTSCode, getFlag, getAllLanguages, isValidCode } from '$lib/types/language';

describe('toCode', () => {
  it('converts full name to code', () => {
    expect(toCode('German')).toBe('de');
    expect(toCode('French')).toBe('fr');
    expect(toCode('English')).toBe('en');
    expect(toCode('Spanish')).toBe('es');
  });

  it('is case-insensitive', () => {
    expect(toCode('german')).toBe('de');
    expect(toCode('FRENCH')).toBe('fr');
    expect(toCode('eNgLiSh')).toBe('en');
  });

  it('trims whitespace', () => {
    expect(toCode(' German ')).toBe('de');
    expect(toCode('  fr  ')).toBe('fr');
  });

  it('passes through valid codes', () => {
    expect(toCode('de')).toBe('de');
    expect(toCode('fr')).toBe('fr');
  });

  it('throws on unrecognised input', () => {
    expect(() => toCode('Klingon')).toThrow('Unrecognised language');
    expect(() => toCode('xx')).toThrow('Unrecognised language');
    expect(() => toCode('')).toThrow();
  });
});

describe('toName', () => {
  it('converts code to display name', () => {
    expect(toName('de')).toBe('German');
    expect(toName('fr')).toBe('French');
  });
});

describe('getTTSCode', () => {
  it('returns Google TTS code', () => {
    expect(getTTSCode('de')).toBe('de-DE');
    expect(getTTSCode('fr')).toBe('fr-FR');
    expect(getTTSCode('en')).toBe('en-GB');
  });
});

describe('getFlag', () => {
  it('returns flag emoji', () => {
    expect(getFlag('de')).toBe('🇩🇪');
    expect(getFlag('fr')).toBe('🇫🇷');
  });
});

describe('getAllLanguages', () => {
  it('returns all supported languages', () => {
    const all = getAllLanguages();
    expect(all.length).toBeGreaterThanOrEqual(4);
    expect(all.map(l => l.code)).toContain('de');
    expect(all.map(l => l.code)).toContain('fr');
  });
});

describe('isValidCode', () => {
  it('returns true for valid codes', () => {
    expect(isValidCode('de')).toBe(true);
    expect(isValidCode('fr')).toBe(true);
  });

  it('returns false for invalid codes', () => {
    expect(isValidCode('xx')).toBe(false);
    expect(isValidCode('ge')).toBe(false); // The V1 bug — 'ge' is NOT valid
  });
});
```

### Test Command
```bash
npx vitest run src/tests/types/language.test.ts
```

---

## Acceptance Criteria

- [ ] All directories exist (verify with `find src -type d | head -40`)
- [ ] `language.ts` compiles and exports all functions
- [ ] `isValidCode('ge')` returns `false` (the V1 bug is impossible)
- [ ] `toCode('German')` returns `'de'` (not `'ge'`)
- [ ] Route stubs load without errors (`npm run dev` → visit each page)
- [ ] Tests: 12+ passing
- [ ] Zero `.substring(0,2)` patterns in codebase (`grep -r "substring(0,2)" src/`)

---

## Completion (fill after task is done)

**Confidence:** ___/10

**What Was Built:** ___

**Decisions Made:**
| Decision | Choice | Why |
|----------|--------|-----|

**Tests:** ___/___ passing

**Notes for Future Tasks:** ___

**Learnings Added to LEARNINGS.md:** ___

**Bugs Added to BUGS.md:** ___
