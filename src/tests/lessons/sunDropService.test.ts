/**
 * Tests for src/lib/server/lessons/sunDropService.ts
 * Pure functions — no mocks needed.
 */

import { describe, it, expect } from 'vitest';
import {
	calculateReward,
	calculateStarRating,
	calculateGems,
	getStreakMultiplier,
	applyCap,
	calculateGrowthStage,
	DAILY_SUNDROP_CAP,
} from '$lib/server/lessons/sunDropService';

describe('calculateReward', () => {
	it('full reward with no wrong attempts and no help', () => {
		expect(calculateReward(3, 0, false)).toBe(3);
	});

	it('halves reward when help is used (rounded down)', () => {
		expect(calculateReward(4, 0, true)).toBe(2);
		expect(calculateReward(3, 0, true)).toBe(1);
	});

	it('subtracts 1 per wrong attempt', () => {
		expect(calculateReward(3, 1, false)).toBe(2);
		expect(calculateReward(3, 2, false)).toBe(1);
		expect(calculateReward(3, 3, false)).toBe(0);
	});

	it('floors at 0, never returns negative', () => {
		expect(calculateReward(2, 5, false)).toBe(0);
		expect(calculateReward(1, 10, false)).toBe(0);
		expect(calculateReward(0, 0, false)).toBe(0);
	});

	it('applies penalty before halving when both wrong attempts and help used', () => {
		// base=4, wrong=2 → 4-2=2, help → floor(2/2)=1
		expect(calculateReward(4, 2, true)).toBe(1);
	});

	it('floors at 0 even with help + many wrong attempts', () => {
		expect(calculateReward(3, 5, true)).toBe(0);
	});
});

describe('calculateStarRating', () => {
	it('3 stars for 90%+ earned', () => {
		expect(calculateStarRating(27, 27)).toBe(3); // 100%
		expect(calculateStarRating(25, 27)).toBe(3); // ~92.6%
		// 24/27 = 88.9% which is below 90% threshold → 2 stars (tested separately)
	});

	it('3 stars at exactly 90%', () => {
		expect(calculateStarRating(9, 10)).toBe(3); // 90%
	});

	it('2 stars for 50-89%', () => {
		expect(calculateStarRating(15, 27)).toBe(2); // 55.5%
		expect(calculateStarRating(14, 27)).toBe(2); // ~51.8%
	});

	it('2 stars at exactly 50%', () => {
		expect(calculateStarRating(5, 10)).toBe(2); // 50%
	});

	it('1 star for less than 50%', () => {
		expect(calculateStarRating(5, 27)).toBe(1); // ~18.5%
		expect(calculateStarRating(0, 27)).toBe(1);
	});

	it('returns 1 star when max is 0 (edge case)', () => {
		expect(calculateStarRating(0, 0)).toBe(1);
	});
});

describe('getStreakMultiplier', () => {
	it('returns 1x for streak < 3', () => {
		expect(getStreakMultiplier(0)).toBe(1);
		expect(getStreakMultiplier(1)).toBe(1);
		expect(getStreakMultiplier(2)).toBe(1);
	});

	it('returns 1.5x for streak 3-6', () => {
		expect(getStreakMultiplier(3)).toBe(1.5);
		expect(getStreakMultiplier(6)).toBe(1.5);
	});

	it('returns 2x for streak 7-13', () => {
		expect(getStreakMultiplier(7)).toBe(2);
		expect(getStreakMultiplier(13)).toBe(2);
	});

	it('returns 3x for streak 14+', () => {
		expect(getStreakMultiplier(14)).toBe(3);
		expect(getStreakMultiplier(100)).toBe(3);
	});
});

describe('applyCap', () => {
	it('returns earned amount when under the cap', () => {
		expect(applyCap(20, 10)).toBe(20); // 10 + 20 = 30, under 50
	});

	it('caps at the daily limit', () => {
		expect(applyCap(30, 30)).toBe(20); // 30 already earned, 20 more to reach 50
	});

	it('returns 0 when cap is already reached', () => {
		expect(applyCap(10, 50)).toBe(0);
		expect(applyCap(10, 60)).toBe(0);
	});

	it('daily cap constant is 50', () => {
		expect(DAILY_SUNDROP_CAP).toBe(50);
	});
});

describe('calculateGrowthStage', () => {
	it('stage 0 for 0 SunDrops (seed)', () => {
		expect(calculateGrowthStage(0)).toBe(0);
	});

	it('stage 1 for 10 SunDrops (sprout)', () => {
		expect(calculateGrowthStage(10)).toBe(1);
	});

	it('stage 5 for 100 SunDrops', () => {
		expect(calculateGrowthStage(100)).toBe(5);
	});

	it('stage 14 for 900+ SunDrops (mythic)', () => {
		expect(calculateGrowthStage(900)).toBe(14);
		expect(calculateGrowthStage(9999)).toBe(14);
	});

	it('stage advances at threshold boundaries', () => {
		expect(calculateGrowthStage(9)).toBe(0); // just under stage 1
		expect(calculateGrowthStage(10)).toBe(1); // exactly at stage 1
	});
});
