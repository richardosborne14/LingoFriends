/**
 * Tests: Interest categories defined in StepInterests.svelte
 *
 * Validates that:
 * 1. Every interest ID has a corresponding key in en.json
 * 2. Every interest ID has a corresponding key in fr.json
 * 3. All 4 categories are present
 * 4. Minimum interest count per category is met (UI quality check)
 * 5. No duplicate IDs across categories
 *
 * This is important because a missing i18n key causes "$_('interests.unknown')"
 * to display in the UI instead of a real label. Catching it here prevents
 * silent failures that are hard to spot during manual testing.
 */

import { describe, it, expect } from 'vitest';
import enJson from '$lib/i18n/en.json';
import frJson from '$lib/i18n/fr.json';

// ── Replicate the category structure from StepInterests.svelte ────────────────
// (Can't import Svelte components in vitest easily, so we inline the data)

const CATEGORIES = [
	{
		id: 'hobbies',
		items: ['dancing', 'drawing', 'gaming', 'cooking', 'reading', 'photography', 'crafts', 'movies'],
	},
	{
		id: 'sports',
		items: ['football', 'basketball', 'swimming', 'skateboarding', 'cycling', 'martial_arts', 'gymnastics', 'tennis'],
	},
	{
		id: 'music',
		items: ['kpop', 'rap', 'rock', 'pop', 'classical', 'electronic'],
	},
	{
		id: 'other',
		items: ['animals', 'science', 'space', 'dinosaurs', 'nature', 'travel', 'fashion', 'superheroes', 'magic', 'history'],
	},
];

/** Flattened list of all interest IDs */
const ALL_IDS = CATEGORIES.flatMap(c => c.items);

// ── Category structure ────────────────────────────────────────────────────────

describe('Interest categories structure', () => {
	it('has exactly 4 categories', () => {
		expect(CATEGORIES).toHaveLength(4);
	});

	it('has required categories: hobbies, sports, music, other', () => {
		const categoryIds = CATEGORIES.map(c => c.id);
		expect(categoryIds).toContain('hobbies');
		expect(categoryIds).toContain('sports');
		expect(categoryIds).toContain('music');
		expect(categoryIds).toContain('other');
	});

	it('has at least 5 items per category', () => {
		// Minimum variety requirement — fewer than 5 would look empty
		for (const cat of CATEGORIES) {
			expect(cat.items.length).toBeGreaterThanOrEqual(5);
		}
	});

	it('has at least 30 total interests', () => {
		// The spec requires 30+ options for sufficient personalisation
		expect(ALL_IDS.length).toBeGreaterThanOrEqual(30);
	});

	it('has no duplicate IDs across categories', () => {
		const unique = new Set(ALL_IDS);
		expect(unique.size).toBe(ALL_IDS.length);
	});
});

// ── English translations ──────────────────────────────────────────────────────

describe('English i18n coverage for interests', () => {
	it('has a translation for every category header', () => {
		for (const cat of CATEGORIES) {
			const key = `category_${cat.id}` as keyof typeof enJson.interests;
			expect(enJson.interests[key], `Missing EN key: interests.category_${cat.id}`).toBeTruthy();
		}
	});

	it('has a translation for every interest item', () => {
		for (const id of ALL_IDS) {
			const key = id as keyof typeof enJson.interests;
			expect(enJson.interests[key], `Missing EN key: interests.${id}`).toBeTruthy();
		}
	});
});

// ── French translations ───────────────────────────────────────────────────────

describe('French i18n coverage for interests', () => {
	it('has a translation for every category header', () => {
		for (const cat of CATEGORIES) {
			const key = `category_${cat.id}` as keyof typeof frJson.interests;
			expect(frJson.interests[key], `Missing FR key: interests.category_${cat.id}`).toBeTruthy();
		}
	});

	it('has a translation for every interest item', () => {
		for (const id of ALL_IDS) {
			const key = id as keyof typeof frJson.interests;
			expect(frJson.interests[key], `Missing FR key: interests.${id}`).toBeTruthy();
		}
	});
});
