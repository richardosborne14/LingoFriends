/**
 * Tests for language.ts — Single Source of Truth
 *
 * These tests verify that the V1 bug is structurally impossible:
 * `isValidCode("ge")` must return false.
 * `toCode("German")` must return "de", not "ge".
 */

import { describe, it, expect } from 'vitest';
import {
	toCode,
	toName,
	getTTSCode,
	getFlag,
	getAllLanguages,
	isValidCode
} from '$lib/types/language';

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

	it('passes through valid codes unchanged', () => {
		expect(toCode('de')).toBe('de');
		expect(toCode('fr')).toBe('fr');
		expect(toCode('en')).toBe('en');
		expect(toCode('es')).toBe('es');
	});

	it('throws on unrecognised input', () => {
		expect(() => toCode('Klingon')).toThrow('[language]');
		expect(() => toCode('xx')).toThrow('[language]');
		expect(() => toCode('')).toThrow();
	});

	// The V1 bug test — "German".substring(0,2) produced "Ge" which is invalid
	it('does NOT accept "ge" (the V1 substring bug result)', () => {
		expect(() => toCode('Ge')).toThrow();
		expect(() => toCode('ge')).toThrow();
	});
});

describe('toName', () => {
	it('converts code to English display name', () => {
		expect(toName('de')).toBe('German');
		expect(toName('fr')).toBe('French');
		expect(toName('en')).toBe('English');
		expect(toName('es')).toBe('Spanish');
	});
});

describe('getTTSCode', () => {
	it('returns the correct Google TTS language code', () => {
		expect(getTTSCode('de')).toBe('de-DE');
		expect(getTTSCode('fr')).toBe('fr-FR');
		expect(getTTSCode('en')).toBe('en-GB');
		expect(getTTSCode('es')).toBe('es-ES');
	});
});

describe('getFlag', () => {
	it('returns the correct flag emoji', () => {
		expect(getFlag('de')).toBe('🇩🇪');
		expect(getFlag('fr')).toBe('🇫🇷');
		expect(getFlag('en')).toBe('🇬🇧');
		expect(getFlag('es')).toBe('🇪🇸');
	});
});

describe('getAllLanguages', () => {
	it('returns all supported languages as an array', () => {
		const all = getAllLanguages();
		expect(all.length).toBeGreaterThanOrEqual(4);
		const codes = all.map((l) => l.code);
		expect(codes).toContain('de');
		expect(codes).toContain('fr');
		expect(codes).toContain('en');
		expect(codes).toContain('es');
	});

	it('each entry has code, name, flag, and ttsCode', () => {
		for (const lang of getAllLanguages()) {
			expect(lang.code).toBeTruthy();
			expect(lang.name).toBeTruthy();
			expect(lang.flag).toBeTruthy();
			expect(lang.ttsCode).toBeTruthy();
		}
	});
});

describe('isValidCode', () => {
	it('returns true for valid codes', () => {
		expect(isValidCode('de')).toBe(true);
		expect(isValidCode('fr')).toBe(true);
		expect(isValidCode('en')).toBe(true);
		expect(isValidCode('es')).toBe(true);
	});

	it('returns false for invalid codes', () => {
		expect(isValidCode('xx')).toBe(false);
		expect(isValidCode('Ge')).toBe(false); // The V1 substring bug result
		expect(isValidCode('ge')).toBe(false); // Same bug, lowercase
		expect(isValidCode('German')).toBe(false); // Full names are not codes
		expect(isValidCode('')).toBe(false);
	});
});
