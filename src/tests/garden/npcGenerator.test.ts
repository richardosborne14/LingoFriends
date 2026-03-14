/**
 * Tests for npcGenerator — TASK-V2-07 extended coverage.
 *
 * Tests cover:
 *   - Determinism (same inputs → same NPC)
 *   - Boss NPC detection (final step)
 *   - Name banks (culturally appropriate names per language)
 *   - Fallback names (unknown language)
 *   - Valid output shape (colours are hex, scale is numeric)
 *   - buildLessonSeed helper
 *   - Each step in a sequence is DIFFERENT from its neighbours
 */

import { describe, it, expect } from 'vitest';
import { generateNPC, buildLessonSeed } from '$lib/services/npcGenerator';

// Known German names from the name bank
const GERMAN_NAMES = ['Lukas', 'Emma', 'Felix', 'Mia', 'Max', 'Sophie', 'Leon', 'Lina', 'Tim', 'Hannah'];
const FRENCH_NAMES = ['Hugo', 'Léa', 'Louis', 'Chloé', 'Gabriel', 'Emma', 'Arthur', 'Jade', 'Lucas', 'Manon'];
const FALLBACK_NAMES = ['Alex', 'Sam', 'Jordan', 'Robin', 'Morgan', 'Riley', 'Casey', 'Quinn'];

describe('generateNPC', () => {

	// ── DETERMINISM ──────────────────────────────────────────────────────────

	it('returns identical NPC for same seed + step + language (deterministic)', () => {
		const npc1 = generateNPC(0, 5, 'tree-abc', 'de');
		const npc2 = generateNPC(0, 5, 'tree-abc', 'de');

		expect(npc1).toEqual(npc2);
	});

	it('returns different NPC for different seed (different tree)', () => {
		const npc1 = generateNPC(0, 5, 'tree-abc', 'de');
		const npc2 = generateNPC(0, 5, 'tree-xyz', 'de');

		// Should differ in at least one property (extremely unlikely to be identical)
		const same =
			npc1.skinTone === npc2.skinTone &&
			npc1.bodyColor === npc2.bodyColor &&
			npc1.hairColor === npc2.hairColor;
		expect(same).toBe(false);
	});

	it('returns different NPC for different step index (step 0 vs step 2)', () => {
		const npc0 = generateNPC(0, 5, 'tree-abc', 'de');
		const npc2 = generateNPC(2, 5, 'tree-abc', 'de');

		const same =
			npc0.skinTone === npc2.skinTone &&
			npc0.bodyColor === npc2.bodyColor &&
			npc0.hairColor === npc2.hairColor;
		expect(same).toBe(false);
	});

	// ── OUTPUT SHAPE ─────────────────────────────────────────────────────────

	it('returns an NPCConfig with all required fields', () => {
		const npc = generateNPC(0, 5, 'test-seed', 'de');

		expect(npc).toHaveProperty('name');
		expect(npc).toHaveProperty('skinTone');
		expect(npc).toHaveProperty('bodyColor');
		expect(npc).toHaveProperty('hairColor');
		expect(npc).toHaveProperty('scale');
		expect(npc).toHaveProperty('isBoss');
		expect(npc).toHaveProperty('emotion');
	});

	it('skinTone, bodyColor, hairColor are valid hex colour strings', () => {
		const npc = generateNPC(0, 10, 'colour-test', 'fr');
		const hexPattern = /^#[0-9A-Fa-f]{6}$/;

		expect(npc.skinTone).toMatch(hexPattern);
		expect(npc.bodyColor).toMatch(hexPattern);
		expect(npc.hairColor).toMatch(hexPattern);
	});

	it('scale is a positive number', () => {
		const npc = generateNPC(1, 5, 'scale-test', 'de');
		expect(typeof npc.scale).toBe('number');
		expect(npc.scale).toBeGreaterThan(0);
	});

	it('emotion is one of the valid emotion values', () => {
		const validEmotions = ['happy', 'thinking', 'surprised'];
		const npc = generateNPC(0, 5, 'emotion-test', 'de');
		expect(validEmotions).toContain(npc.emotion);
	});

	// ── BOSS NPC ─────────────────────────────────────────────────────────────

	it('marks the LAST step as boss (isBoss = true)', () => {
		const totalSteps = 8;
		const bossNpc = generateNPC(totalSteps - 1, totalSteps, 'boss-test', 'de');

		expect(bossNpc.isBoss).toBe(true);
	});

	it('boss NPC has scale 1.3', () => {
		const boss = generateNPC(4, 5, 'boss-scale', 'de');
		expect(boss.scale).toBe(1.3);
	});

	it('boss NPC always has surprised emotion', () => {
		const boss = generateNPC(9, 10, 'boss-emotion', 'de');
		expect(boss.emotion).toBe('surprised');
	});

	it('boss NPC always has gold bodyColor (#FFD84A)', () => {
		const boss = generateNPC(4, 5, 'boss-gold', 'de');
		expect(boss.bodyColor).toBe('#FFD84A');
	});

	it('non-boss NPCs have isBoss = false', () => {
		for (let i = 0; i < 4; i++) {
			const npc = generateNPC(i, 5, 'non-boss', 'de');
			expect(npc.isBoss).toBe(false);
		}
	});

	it('non-boss NPCs have scale 1.0', () => {
		const npc = generateNPC(0, 5, 'non-boss-scale', 'de');
		expect(npc.scale).toBe(1.0);
	});

	// ── NAME BANKS (TASK-V2-07) ───────────────────────────────────────────────

	it('returns a German name for targetLanguage "de"', () => {
		// Try multiple steps — at least one should give a German name
		const names = Array.from({ length: 10 }, (_, i) =>
			generateNPC(i, 10, 'lang-de', 'de').name
		);

		// All names should be from the German bank
		names.forEach((name) => {
			expect(GERMAN_NAMES).toContain(name);
		});
	});

	it('returns a French name for targetLanguage "fr"', () => {
		const names = Array.from({ length: 10 }, (_, i) =>
			generateNPC(i, 10, 'lang-fr', 'fr').name
		);

		names.forEach((name) => {
			expect(FRENCH_NAMES).toContain(name);
		});
	});

	it('returns a fallback name for unknown targetLanguage', () => {
		// 'klingon' is not in the name bank — should use fallback
		const names = Array.from({ length: 8 }, (_, i) =>
			generateNPC(i, 8, 'lang-unknown', 'klingon').name
		);

		names.forEach((name) => {
			expect(FALLBACK_NAMES).toContain(name);
		});
	});

	it('name is a non-empty string', () => {
		const npc = generateNPC(0, 5, 'name-check', 'de');
		expect(typeof npc.name).toBe('string');
		expect(npc.name.length).toBeGreaterThan(0);
	});

	it('name is deterministic for same inputs', () => {
		const npc1 = generateNPC(3, 8, 'name-seed', 'fr');
		const npc2 = generateNPC(3, 8, 'name-seed', 'fr');
		expect(npc1.name).toBe(npc2.name);
	});

	it('boss NPC still gets a name from the target language bank', () => {
		const boss = generateNPC(9, 10, 'boss-named', 'de');
		expect(GERMAN_NAMES).toContain(boss.name);
	});

	// ── EDGE CASES ────────────────────────────────────────────────────────────

	it('handles stepIndex 0 of 1 (single-step lesson) — returns boss NPC', () => {
		// 1-step lesson: step 0 is BOTH first AND last → boss
		const npc = generateNPC(0, 1, 'single-step', 'de');
		expect(npc.isBoss).toBe(true);
	});

	it('handles default targetLanguage (no argument)', () => {
		// Should not throw, should return valid NPC
		const npc = generateNPC(0, 5, 'no-lang');
		expect(npc.name).toBeTruthy();
		expect(npc.skinTone).toMatch(/^#[0-9A-Fa-f]{6}$/);
	});
});

// ── buildLessonSeed ──────────────────────────────────────────────────────────

describe('buildLessonSeed', () => {
	it('returns a non-empty string', () => {
		const seed = buildLessonSeed('tree-uuid-123', 0);
		expect(typeof seed).toBe('string');
		expect(seed.length).toBeGreaterThan(0);
	});

	it('includes the treeId in the seed', () => {
		const seed = buildLessonSeed('my-tree-id', 2);
		expect(seed).toContain('my-tree-id');
	});

	it('different lessonIndex produces different seed', () => {
		const seed0 = buildLessonSeed('tree-abc', 0);
		const seed1 = buildLessonSeed('tree-abc', 1);
		expect(seed0).not.toBe(seed1);
	});

	it('different treeId produces different seed', () => {
		const seedA = buildLessonSeed('tree-A', 0);
		const seedB = buildLessonSeed('tree-B', 0);
		expect(seedA).not.toBe(seedB);
	});
});
