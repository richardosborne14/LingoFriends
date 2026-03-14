/**
 * Tests for src/lib/server/lessons/srsService.ts
 * Pure functions — no mocks needed. Dates are injected for determinism.
 */

import { describe, it, expect } from 'vitest';
import {
	calculateNextInterval,
	calculateEaseFactor,
	calculateNextReviewDate,
	calculateSRSUpdate,
	calculateNewStreak,
	DEFAULT_EASE_FACTOR,
} from '$lib/server/lessons/srsService';

const TODAY = new Date('2026-03-14T12:00:00Z');

describe('calculateNextInterval', () => {
	it('advances from 1 to 3 days on good performance', () => {
		expect(calculateNextInterval(1, 0.8)).toBe(3);
	});

	it('advances from 3 to 7 days', () => {
		expect(calculateNextInterval(3, 1.0)).toBe(7);
	});

	it('stays at 30 days (max) on perfect performance', () => {
		expect(calculateNextInterval(30, 1.0)).toBe(30);
	});

	it('resets to 1 day on poor performance (< 0.7)', () => {
		expect(calculateNextInterval(14, 0.5)).toBe(1);
		expect(calculateNextInterval(7, 0.0)).toBe(1);
	});

	it('threshold is exactly 0.7 (good ≥ 0.7)', () => {
		expect(calculateNextInterval(1, 0.7)).toBe(3); // 0.7 is good
		expect(calculateNextInterval(1, 0.69)).toBe(1); // 0.69 is poor
	});
});

describe('calculateEaseFactor', () => {
	it('default ease factor is 2.5', () => {
		expect(DEFAULT_EASE_FACTOR).toBe(2.5);
	});

	it('increases for perfect performance', () => {
		const newFactor = calculateEaseFactor(2.5, 1.0);
		expect(newFactor).toBeGreaterThan(2.5);
	});

	it('decreases for poor performance', () => {
		const newFactor = calculateEaseFactor(2.5, 0.2);
		expect(newFactor).toBeLessThan(2.5);
	});

	it('never goes below minimum ease factor (1.3)', () => {
		// Many poor performances should floor at 1.3
		let factor = DEFAULT_EASE_FACTOR;
		for (let i = 0; i < 20; i++) {
			factor = calculateEaseFactor(factor, 0.0);
		}
		expect(factor).toBeGreaterThanOrEqual(1.3);
	});
});

describe('calculateNextReviewDate', () => {
	it('adds correct number of days', () => {
		const result = calculateNextReviewDate(3, TODAY);
		const expected = new Date(TODAY);
		expected.setDate(expected.getDate() + 3);
		expected.setHours(0, 0, 0, 0);
		expect(result.toDateString()).toBe(expected.toDateString());
	});

	it('sets time to start of day (midnight)', () => {
		const result = calculateNextReviewDate(1, TODAY);
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
		expect(result.getSeconds()).toBe(0);
	});
});

describe('calculateSRSUpdate', () => {
	it('returns all required fields', () => {
		const update = calculateSRSUpdate(1, DEFAULT_EASE_FACTOR, 1.0, true);
		expect(update).toHaveProperty('srsInterval');
		expect(update).toHaveProperty('srsFactor');
		expect(update).toHaveProperty('nextReviewDate');
		expect(update).toHaveProperty('timesStudiedIncrement');
		expect(update).toHaveProperty('timesCorrectIncrement');
	});

	it('timesStudiedIncrement is always 1', () => {
		const update = calculateSRSUpdate(1, DEFAULT_EASE_FACTOR, 0.0, false);
		expect(update.timesStudiedIncrement).toBe(1);
	});

	it('timesCorrectIncrement is 1 when correct', () => {
		const update = calculateSRSUpdate(1, DEFAULT_EASE_FACTOR, 1.0, true);
		expect(update.timesCorrectIncrement).toBe(1);
	});

	it('timesCorrectIncrement is 0 when incorrect', () => {
		const update = calculateSRSUpdate(1, DEFAULT_EASE_FACTOR, 0.5, false);
		expect(update.timesCorrectIncrement).toBe(0);
	});
});

describe('calculateNewStreak', () => {
	it('returns 1 for first lesson ever (null lastActivity)', () => {
		expect(calculateNewStreak(0, null, TODAY)).toBe(1);
	});

	it('increments streak when last activity was yesterday', () => {
		const yesterday = new Date(TODAY);
		yesterday.setDate(yesterday.getDate() - 1);
		expect(calculateNewStreak(5, yesterday, TODAY)).toBe(6);
	});

	it('does not change streak when last activity was today', () => {
		const sameDay = new Date(TODAY);
		sameDay.setHours(6, 0, 0, 0); // Earlier today
		expect(calculateNewStreak(5, sameDay, TODAY)).toBe(5);
	});

	it('resets streak to 1 when 2+ days have passed', () => {
		const twoDaysAgo = new Date(TODAY);
		twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
		expect(calculateNewStreak(10, twoDaysAgo, TODAY)).toBe(1);
	});

	it('resets streak to 1 for long absence', () => {
		const monthAgo = new Date(TODAY);
		monthAgo.setDate(monthAgo.getDate() - 30);
		expect(calculateNewStreak(50, monthAgo, TODAY)).toBe(1);
	});
});
