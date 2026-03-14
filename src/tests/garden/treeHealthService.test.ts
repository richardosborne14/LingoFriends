/**
 * Tests — Tree Health Service
 *
 * Tests the decay schedule, gift buffer, visual states, and colour helpers.
 * All functions are pure — no DB or Three.js needed.
 */

import { describe, it, expect } from 'vitest';
import {
	calculateTreeHealth,
	healthFromDays,
	getHealthVisualState,
	calculateHealthAfterLesson,
	applyGiftBuffer,
	getHealthBarColor,
} from '$lib/server/lessons/treeHealthService';

// Helper: date N days ago from a fixed "now"
const NOW = new Date('2026-03-14T12:00:00Z');
function daysAgo(n: number): Date {
	const d = new Date(NOW);
	d.setDate(d.getDate() - n);
	return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// healthFromDays — decay schedule
// ─────────────────────────────────────────────────────────────────────────────

describe('healthFromDays', () => {
	it('returns 100 for 0 days elapsed', () => {
		expect(healthFromDays(0)).toBe(100);
	});

	it('returns 100 for 1 day elapsed (within 0-2 bracket)', () => {
		expect(healthFromDays(1)).toBe(100);
	});

	it('returns 100 for 2 days elapsed (last day in full-health bracket)', () => {
		expect(healthFromDays(2)).toBe(100);
	});

	it('returns 85 for exactly 3 days elapsed', () => {
		expect(healthFromDays(3)).toBe(85);
	});

	it('returns 85 for 5 days elapsed (within 3-5 bracket)', () => {
		expect(healthFromDays(5)).toBe(85);
	});

	it('returns 60 for exactly 6 days elapsed', () => {
		expect(healthFromDays(6)).toBe(60);
	});

	it('returns 60 for 10 days elapsed (within 6-10 bracket)', () => {
		expect(healthFromDays(10)).toBe(60);
	});

	it('returns 35 for exactly 11 days elapsed', () => {
		expect(healthFromDays(11)).toBe(35);
	});

	it('returns 15 for exactly 15 days elapsed', () => {
		expect(healthFromDays(15)).toBe(15);
	});

	it('returns 5 for exactly 22 days elapsed (minimum)', () => {
		expect(healthFromDays(22)).toBe(5);
	});

	it('returns 5 for 100 days elapsed (never below minimum)', () => {
		expect(healthFromDays(100)).toBe(5);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateTreeHealth — with date injection
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateTreeHealth', () => {
	it('returns 100 for a fresh refresh (0 days ago)', () => {
		expect(calculateTreeHealth(daysAgo(0), 0, NOW)).toBe(100);
	});

	it('returns 85 when 4 days have elapsed', () => {
		expect(calculateTreeHealth(daysAgo(4), 0, NOW)).toBe(85);
	});

	it('returns 5 when 30 days have elapsed (minimum)', () => {
		expect(calculateTreeHealth(daysAgo(30), 0, NOW)).toBe(5);
	});

	it('gift buffer of 3 days shifts 6-day elapsed to 3-day effective (85)', () => {
		// 6 days old, but 3-day gift buffer → effective 3 days → 85%
		expect(calculateTreeHealth(daysAgo(6), 3, NOW)).toBe(85);
	});

	it('gift buffer of 10 days can restore a 10-day-old tree to 100%', () => {
		// 10 days old + 10 day buffer → effective 0 days → 100%
		expect(calculateTreeHealth(daysAgo(10), 10, NOW)).toBe(100);
	});

	it('gift buffer does not make health exceed 100%', () => {
		// Overly generous buffer on a fresh tree — still 100
		expect(calculateTreeHealth(daysAgo(0), 99, NOW)).toBe(100);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// getHealthVisualState
// ─────────────────────────────────────────────────────────────────────────────

describe('getHealthVisualState', () => {
	it('returns full for 100%', () => expect(getHealthVisualState(100)).toBe('full'));
	it('returns full for 90%', () => expect(getHealthVisualState(90)).toBe('full'));
	it('returns good for 89%', () => expect(getHealthVisualState(89)).toBe('good'));
	it('returns good for 70%', () => expect(getHealthVisualState(70)).toBe('good'));
	it('returns fair for 69%', () => expect(getHealthVisualState(69)).toBe('fair'));
	it('returns fair for 30%', () => expect(getHealthVisualState(30)).toBe('fair'));
	it('returns poor for 29%', () => expect(getHealthVisualState(29)).toBe('poor'));
	it('returns poor for 10%', () => expect(getHealthVisualState(10)).toBe('poor'));
	it('returns critical for 9%', () => expect(getHealthVisualState(9)).toBe('critical'));
	it('returns critical for 5%', () => expect(getHealthVisualState(5)).toBe('critical'));
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateHealthAfterLesson
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateHealthAfterLesson', () => {
	it('always returns 100 (full refresh on lesson completion)', () => {
		expect(calculateHealthAfterLesson()).toBe(100);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// applyGiftBuffer
// ─────────────────────────────────────────────────────────────────────────────

describe('applyGiftBuffer', () => {
	it('shifts the date forward by the given number of days', () => {
		const base = new Date('2026-03-01T00:00:00Z');
		const result = applyGiftBuffer(base, 5);
		expect(result.getDate()).toBe(6); // March 1 + 5 = March 6
	});

	it('0 buffer days returns the same date', () => {
		const base = new Date('2026-03-14T00:00:00Z');
		const result = applyGiftBuffer(base, 0);
		expect(result.getTime()).toBe(base.getTime());
	});

	it('does not mutate the original date', () => {
		const base = new Date('2026-03-14T00:00:00Z');
		const original = base.getTime();
		applyGiftBuffer(base, 7);
		expect(base.getTime()).toBe(original);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// getHealthBarColor
// ─────────────────────────────────────────────────────────────────────────────

describe('getHealthBarColor', () => {
	it('returns green class for health >= 70', () => {
		expect(getHealthBarColor(100)).toBe('bg-forest-400');
		expect(getHealthBarColor(70)).toBe('bg-forest-400');
	});

	it('returns amber class for health 30-69', () => {
		expect(getHealthBarColor(69)).toBe('bg-sundrop-500');
		expect(getHealthBarColor(30)).toBe('bg-sundrop-500');
	});

	it('returns red class for health < 30', () => {
		expect(getHealthBarColor(29)).toBe('bg-red-500');
		expect(getHealthBarColor(5)).toBe('bg-red-500');
	});
});
