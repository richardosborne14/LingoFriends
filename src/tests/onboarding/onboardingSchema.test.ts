/**
 * Tests: Onboarding server-side validation logic
 *
 * Validates the Zod schema behaviour for the onboarding form submission.
 * We test the logic directly (schema parsing) rather than making HTTP requests.
 *
 * Key scenarios:
 * 1. Happy path — all fields valid
 * 2. New level field — all valid values accepted
 * 3. New gender field — boy/girl/neutral all accepted
 * 4. Invalid level — rejects unknown values
 * 5. Missing required fields — returns errors
 * 6. Interests JSON parsing — handles valid, empty, and malformed input
 *
 * These tests document the server's validation contract so future
 * developers know exactly what input is/isn't accepted.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ── Re-define the schema here to test it independently ───────────────────────
// (We can't import from +page.server.ts because it has side effects)
// This mirrors the schema in the server file exactly.

const LANGUAGE_CODES = ['en', 'fr', 'de'] as const;
const AGE_GROUPS = ['7-10', '11-14', '15-18'] as const;
const LEVEL_CODES = [
	'total_beginner',
	'know_some_words',
	'simple_sentences',
	'can_have_conversations',
] as const;
const GENDER_CODES = ['boy', 'girl', 'neutral'] as const;
const HAT_STYLES = ['none', 'cap', 'beanie', 'headband'] as const;

const hexColour = z
	.string()
	.regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid colour format')
	.default('#F5D0A9');

const onboardingSchema = z.object({
	nativeLanguage: z.enum(LANGUAGE_CODES),
	targetLanguage: z.enum(LANGUAGE_CODES),
	ageGroup: z.enum(AGE_GROUPS),
	level: z.enum(LEVEL_CODES).default('total_beginner'),
	interestsJson: z.string().default('[]'),
	avatarGender: z.enum(GENDER_CODES).default('neutral'),
	avatarSkinTone: hexColour,
	avatarHairColor: hexColour,
	avatarShirtColor: hexColour,
	avatarHat: z.enum(HAT_STYLES).default('none'),
});

/** Build a valid submission object for use in tests */
function validInput(overrides: Record<string, string> = {}) {
	return {
		nativeLanguage: 'en',
		targetLanguage: 'de',
		ageGroup: '11-14',
		level: 'total_beginner',
		interestsJson: '["football","gaming"]',
		avatarGender: 'neutral',
		avatarSkinTone: '#F5D0A9',
		avatarHairColor: '#4A3728',
		avatarShirtColor: '#FF8A6A',
		avatarHat: 'none',
		...overrides,
	};
}

// ── Happy path ────────────────────────────────────────────────────────────────

describe('onboardingSchema — happy path', () => {
	it('accepts a fully valid submission', () => {
		const result = onboardingSchema.safeParse(validInput());
		expect(result.success).toBe(true);
	});

	it('returns all expected fields on success', () => {
		const result = onboardingSchema.safeParse(validInput());
		if (!result.success) throw new Error('Unexpected failure');
		expect(result.data.nativeLanguage).toBe('en');
		expect(result.data.targetLanguage).toBe('de');
		expect(result.data.ageGroup).toBe('11-14');
	});
});

// ── Level field (new in V2) ───────────────────────────────────────────────────

describe('onboardingSchema — level field', () => {
	it('accepts total_beginner', () => {
		const result = onboardingSchema.safeParse(validInput({ level: 'total_beginner' }));
		expect(result.success).toBe(true);
	});

	it('accepts know_some_words', () => {
		const result = onboardingSchema.safeParse(validInput({ level: 'know_some_words' }));
		expect(result.success).toBe(true);
	});

	it('accepts simple_sentences', () => {
		const result = onboardingSchema.safeParse(validInput({ level: 'simple_sentences' }));
		expect(result.success).toBe(true);
	});

	it('accepts can_have_conversations', () => {
		const result = onboardingSchema.safeParse(validInput({ level: 'can_have_conversations' }));
		expect(result.success).toBe(true);
	});

	it('rejects an unknown level value', () => {
		const result = onboardingSchema.safeParse(validInput({ level: 'expert' }));
		expect(result.success).toBe(false);
	});

	it('defaults to total_beginner when level is omitted', () => {
		const input = validInput();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		delete (input as any).level;
		const result = onboardingSchema.safeParse(input);
		if (!result.success) throw new Error('Unexpected failure');
		expect(result.data.level).toBe('total_beginner');
	});
});

// ── Gender field (new in V2) ──────────────────────────────────────────────────

describe('onboardingSchema — avatarGender field', () => {
	it('accepts boy', () => {
		expect(onboardingSchema.safeParse(validInput({ avatarGender: 'boy' })).success).toBe(true);
	});

	it('accepts girl', () => {
		expect(onboardingSchema.safeParse(validInput({ avatarGender: 'girl' })).success).toBe(true);
	});

	it('accepts neutral', () => {
		expect(onboardingSchema.safeParse(validInput({ avatarGender: 'neutral' })).success).toBe(true);
	});

	it('rejects unknown gender values', () => {
		expect(onboardingSchema.safeParse(validInput({ avatarGender: 'other' })).success).toBe(false);
	});

	it('defaults to neutral when gender is omitted', () => {
		const input = validInput();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		delete (input as any).avatarGender;
		const result = onboardingSchema.safeParse(input);
		if (!result.success) throw new Error('Unexpected failure');
		expect(result.data.avatarGender).toBe('neutral');
	});
});

// ── Required fields ───────────────────────────────────────────────────────────

describe('onboardingSchema — required field validation', () => {
	it('rejects missing nativeLanguage', () => {
		const result = onboardingSchema.safeParse(validInput({ nativeLanguage: '' }));
		expect(result.success).toBe(false);
	});

	it('rejects missing targetLanguage', () => {
		const result = onboardingSchema.safeParse(validInput({ targetLanguage: '' }));
		expect(result.success).toBe(false);
	});

	it('rejects missing ageGroup', () => {
		const result = onboardingSchema.safeParse(validInput({ ageGroup: '' }));
		expect(result.success).toBe(false);
	});

	it('rejects invalid hex colour for skin tone', () => {
		const result = onboardingSchema.safeParse(validInput({ avatarSkinTone: 'red' }));
		expect(result.success).toBe(false);
	});
});

// ── Interests JSON parsing ────────────────────────────────────────────────────

describe('Interests JSON parsing logic', () => {
	/**
	 * The server parses interestsJson independently, so we test the parsing
	 * logic rather than the schema field itself.
	 */
	function parseInterests(json: string): string[] {
		try {
			const parsed = JSON.parse(json);
			if (Array.isArray(parsed)) {
				return parsed.filter((i): i is string => typeof i === 'string');
			}
		} catch {
			// silent
		}
		return [];
	}

	it('parses a valid interests array', () => {
		expect(parseInterests('["football","gaming","animals"]')).toEqual(['football', 'gaming', 'animals']);
	});

	it('returns empty array for empty JSON array', () => {
		expect(parseInterests('[]')).toEqual([]);
	});

	it('returns empty array for malformed JSON', () => {
		expect(parseInterests('not valid json')).toEqual([]);
	});

	it('filters out non-string values from the array', () => {
		// Prevent injection of unexpected types
		expect(parseInterests('[1, "football", null, "gaming"]')).toEqual(['football', 'gaming']);
	});
});
