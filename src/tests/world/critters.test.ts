/**
 * Tests for critter selection — TASK-FUN-03.
 *
 * The promise: "your garden has your animals". Selection must be
 * deterministic per user, valid against the species roster, and actually
 * vary across users (a constant function would pass determinism!).
 */

import { describe, it, expect } from 'vitest';
// Import from the PURE logic module — CritterSprite imports Phaser, which
// crashes under jsdom (device detection needs a real canvas 2D context)
import {
	pickCritters,
	seededRandom,
	hashString,
	CRITTER_SPECIES,
} from '$lib/world/sprites/critterLogic';

describe('pickCritters', () => {
	it('is deterministic — same user id → same roster, every time', () => {
		for (const id of ['plot-abc', 'plot-def', 'plot-user-123']) {
			expect(pickCritters(id)).toEqual(pickCritters(id));
		}
	});

	it('returns the requested number of valid species', () => {
		const roster = pickCritters('plot-someone');
		expect(roster).toHaveLength(3);
		for (const species of roster) {
			expect(Object.keys(CRITTER_SPECIES)).toContain(species);
		}
	});

	it('different users can get different rosters', () => {
		// 40 users; if every roster were identical the picker is broken.
		// (Not a flakiness risk: pickCritters is fully deterministic.)
		const rosters = new Set(
			Array.from({ length: 40 }, (_, i) => pickCritters(`plot-user-${i}`).join(','))
		);
		expect(rosters.size).toBeGreaterThan(1);
	});
});

describe('seededRandom / hashString', () => {
	it('same seed → identical sequence', () => {
		const a = seededRandom(42);
		const b = seededRandom(42);
		for (let i = 0; i < 10; i++) expect(a()).toBe(b());
	});

	it('produces values in [0, 1)', () => {
		const rand = seededRandom(hashString('plot-x'));
		for (let i = 0; i < 100; i++) {
			const v = rand();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});

	it('hashString is stable and spreads distinct inputs', () => {
		expect(hashString('plot-a')).toBe(hashString('plot-a'));
		expect(hashString('plot-a')).not.toBe(hashString('plot-b'));
	});
});
