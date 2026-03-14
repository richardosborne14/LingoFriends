/**
 * Tests — NPC Generator
 *
 * Tests determinism, boss NPC rules, and output shape.
 * All functions are pure — no browser/WebGL needed.
 */

import { describe, it, expect } from 'vitest';
import { generateNPC, buildLessonSeed } from '$lib/services/npcGenerator';

// ─────────────────────────────────────────────────────────────────────────────
// generateNPC — output shape
// ─────────────────────────────────────────────────────────────────────────────

describe('generateNPC — output shape', () => {
	const npc = generateNPC(0, 5, 'test-tree-abc');

	it('returns all required fields', () => {
		expect(npc).toHaveProperty('skinTone');
		expect(npc).toHaveProperty('bodyColor');
		expect(npc).toHaveProperty('hairColor');
		expect(npc).toHaveProperty('scale');
		expect(npc).toHaveProperty('isBoss');
		expect(npc).toHaveProperty('emotion');
	});

	it('skin tone is a valid hex color', () => {
		expect(npc.skinTone).toMatch(/^#[0-9A-Fa-f]{6}$/);
	});

	it('body color is a valid hex color', () => {
		expect(npc.bodyColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
	});

	it('hair color is a valid hex color', () => {
		expect(npc.hairColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
	});

	it('emotion is one of the valid values', () => {
		expect(['happy', 'thinking', 'surprised']).toContain(npc.emotion);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// generateNPC — determinism
// ─────────────────────────────────────────────────────────────────────────────

describe('generateNPC — determinism', () => {
	it('same seed + step always produces the same NPC', () => {
		const npc1 = generateNPC(2, 5, 'my-tree-xyz');
		const npc2 = generateNPC(2, 5, 'my-tree-xyz');
		expect(npc1).toEqual(npc2);
	});

	it('different step index produces different NPCs from the same seed', () => {
		const npc0 = generateNPC(0, 5, 'my-tree-xyz');
		const npc1 = generateNPC(1, 5, 'my-tree-xyz');
		// They might accidentally be the same, but with a good hash they won't be
		// We test that at least ONE field differs
		const allSame =
			npc0.skinTone === npc1.skinTone &&
			npc0.hairColor === npc1.hairColor &&
			npc0.bodyColor === npc1.bodyColor;
		expect(allSame).toBe(false);
	});

	it('different seeds produce different NPCs for the same step', () => {
		const npc1 = generateNPC(0, 5, 'tree-aaa');
		const npc2 = generateNPC(0, 5, 'tree-zzz');
		const allSame =
			npc1.skinTone === npc2.skinTone &&
			npc1.hairColor === npc2.hairColor &&
			npc1.bodyColor === npc2.bodyColor;
		expect(allSame).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// generateNPC — boss NPC rules
// ─────────────────────────────────────────────────────────────────────────────

describe('generateNPC — boss NPC rules', () => {
	it('last step (index = totalSteps - 1) is always a boss', () => {
		const boss = generateNPC(4, 5, 'test-seed');
		expect(boss.isBoss).toBe(true);
	});

	it('boss NPC always has gold body color', () => {
		const boss = generateNPC(4, 5, 'test-seed');
		expect(boss.bodyColor).toBe('#FFD84A');
	});

	it('boss NPC always has surprised emotion', () => {
		const boss = generateNPC(4, 5, 'test-seed');
		expect(boss.emotion).toBe('surprised');
	});

	it('boss NPC has scale 1.3', () => {
		const boss = generateNPC(4, 5, 'test-seed');
		expect(boss.scale).toBe(1.3);
	});

	it('non-boss NPCs have scale 1.0', () => {
		const normal = generateNPC(0, 5, 'test-seed');
		expect(normal.isBoss).toBe(false);
		expect(normal.scale).toBe(1.0);
	});

	it('non-boss NPCs do not get gold body color (most of the time)', () => {
		// Run multiple non-boss NPCs and check body colour varies
		const colors = new Set<string>();
		for (let i = 0; i < 4; i++) {
			const npc = generateNPC(i, 10, `varied-seed-${i}`);
			colors.add(npc.bodyColor);
		}
		// Should have more than one colour if truly randomised
		expect(colors.size).toBeGreaterThan(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildLessonSeed
// ─────────────────────────────────────────────────────────────────────────────

describe('buildLessonSeed', () => {
	it('combines treeId and lessonIndex into a string', () => {
		const seed = buildLessonSeed('tree-abc', 3);
		expect(seed).toBe('tree-abc-lesson-3');
	});

	it('different lessonIndex produces different seeds', () => {
		const s1 = buildLessonSeed('tree-abc', 0);
		const s2 = buildLessonSeed('tree-abc', 1);
		expect(s1).not.toBe(s2);
	});

	it('different treeIds produce different seeds', () => {
		const s1 = buildLessonSeed('tree-aaa', 0);
		const s2 = buildLessonSeed('tree-bbb', 0);
		expect(s1).not.toBe(s2);
	});
});
