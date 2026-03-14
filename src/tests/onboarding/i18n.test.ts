/**
 * Tests: src/lib/i18n/index.ts
 *
 * Tests locale management: setLocale, getStoredLocale, SUPPORTED_LOCALES.
 * Uses jsdom environment (from vitest.config.ts) so localStorage is available.
 *
 * We test the utility functions directly — we do NOT test svelte-i18n internals
 * (that's the library's job). We test that our wrapper correctly:
 * 1. Persists locale to localStorage
 * 2. Reads locale back from localStorage
 * 3. Validates supported vs. unsupported locales
 * 4. Falls back gracefully when localStorage has garbage data
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	setLocale,
	getStoredLocale,
	SUPPORTED_LOCALES,
	type SupportedLocale,
} from '$lib/i18n';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'lf_locale';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Clear localStorage before each test to avoid cross-test contamination */
beforeEach(() => {
	localStorage.clear();
});

// ── SUPPORTED_LOCALES ─────────────────────────────────────────────────────────

describe('SUPPORTED_LOCALES', () => {
	it('contains exactly en and fr', () => {
		// Only two languages supported at launch (see i18n/en.json and fr.json)
		expect(SUPPORTED_LOCALES).toContain('en');
		expect(SUPPORTED_LOCALES).toContain('fr');
	});

	it('has exactly 2 entries', () => {
		// Guard against accidental additions — all new locales need JSON files first
		expect(SUPPORTED_LOCALES).toHaveLength(2);
	});
});

// ── setLocale ─────────────────────────────────────────────────────────────────

describe('setLocale', () => {
	it('persists en to localStorage', () => {
		setLocale('en');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
	});

	it('persists fr to localStorage', () => {
		setLocale('fr');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('fr');
	});

	it('overwrites a previous locale', () => {
		setLocale('en');
		setLocale('fr');
		// Second call should overwrite first
		expect(localStorage.getItem(STORAGE_KEY)).toBe('fr');
	});
});

// ── getStoredLocale ───────────────────────────────────────────────────────────

describe('getStoredLocale', () => {
	it('returns en when en is stored', () => {
		localStorage.setItem(STORAGE_KEY, 'en');
		expect(getStoredLocale()).toBe('en');
	});

	it('returns fr when fr is stored', () => {
		localStorage.setItem(STORAGE_KEY, 'fr');
		expect(getStoredLocale()).toBe('fr');
	});

	it('falls back to en when localStorage is empty', () => {
		// Nothing stored — should default to English
		expect(getStoredLocale()).toBe('en');
	});

	it('falls back to en when localStorage contains an unsupported locale', () => {
		// Simulate garbage data (e.g. user manually edited localStorage)
		localStorage.setItem(STORAGE_KEY, 'zh');
		// 'zh' is not in SUPPORTED_LOCALES, should fall back to 'en'
		expect(getStoredLocale()).toBe('en');
	});

	it('round-trips correctly: set then get returns same value', () => {
		const locales: SupportedLocale[] = ['en', 'fr'];
		for (const locale of locales) {
			setLocale(locale);
			expect(getStoredLocale()).toBe(locale);
		}
	});
});
