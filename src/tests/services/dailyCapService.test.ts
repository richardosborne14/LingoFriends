/**
 * Tests for src/lib/services/dailyCapService.ts
 *
 * Pure functions — no DB required. Tests cover:
 * - calculateCapStatus: cap detection, remaining counts
 * - getDailyCapMessage: varies by lesson count
 * - isFullDayCompletion: bonus trigger logic
 */

import { describe, it, expect } from 'vitest';
import {
	calculateCapStatus,
	getDailyCapMessage,
	isFullDayCompletion,
	DAILY_CAPS,
} from '$lib/services/dailyCapService';

describe('calculateCapStatus — new lesson cap', () => {
	it('not capped with 0 lessons today', () => {
		const status = calculateCapStatus(0, 0);
		expect(status.newLessonsCapped).toBe(false);
		expect(status.anyCapped).toBe(false);
	});

	it('not capped with 2 new lessons (under the 3 cap)', () => {
		const status = calculateCapStatus(2, 0);
		expect(status.newLessonsCapped).toBe(false);
		expect(status.newLessonsRemaining).toBe(1);
	});

	it('capped after exactly 3 new lessons', () => {
		const status = calculateCapStatus(3, 0);
		expect(status.newLessonsCapped).toBe(true);
		expect(status.anyCapped).toBe(true);
		expect(status.newLessonsRemaining).toBe(0);
	});

	it('capped after more than 3 new lessons (defensive)', () => {
		const status = calculateCapStatus(5, 0);
		expect(status.newLessonsCapped).toBe(true);
		expect(status.newLessonsRemaining).toBe(0);
	});
});

describe('calculateCapStatus — review cap', () => {
	it('review not capped with 0 review sessions', () => {
		const status = calculateCapStatus(0, 0);
		expect(status.reviewCapped).toBe(false);
	});

	it('review capped after reaching review_sessions limit', () => {
		const status = calculateCapStatus(0, DAILY_CAPS.review_sessions);
		expect(status.reviewCapped).toBe(true);
	});
});

describe('calculateCapStatus — total lessons', () => {
	it('tracks total lesson count correctly', () => {
		const status = calculateCapStatus(2, 3);
		expect(status.lessonsToday).toBe(5);
	});

	it('caps both new and review when total cap hit', () => {
		// Hit total_lessons = 6
		const status = calculateCapStatus(3, 3);
		expect(status.newLessonsCapped).toBe(true);
		expect(status.reviewCapped).toBe(true);
	});
});

describe('calculateCapStatus — completedFullDay', () => {
	it('completedFullDay is false below the new lesson cap', () => {
		const status = calculateCapStatus(2, 0);
		expect(status.completedFullDay).toBe(false);
	});

	it('completedFullDay is true when new lessons hit the cap', () => {
		const status = calculateCapStatus(3, 0);
		expect(status.completedFullDay).toBe(true);
	});
});

describe('calculateCapStatus — negative inputs (defensive)', () => {
	it('handles negative inputs gracefully', () => {
		const status = calculateCapStatus(-1, -5);
		expect(status.newLessonsCapped).toBe(false);
		expect(status.lessonsToday).toBe(0);
	});
});

describe('getDailyCapMessage', () => {
	it('returns "Amazing work" for 3+ lessons', () => {
		const msg = getDailyCapMessage(3);
		expect(msg.title).toMatch(/amazing/i);
	});

	it('returns "Great session" for 2 lessons', () => {
		const msg = getDailyCapMessage(2);
		expect(msg.title).toMatch(/great/i);
	});

	it('returns "Well done" for 1 lesson', () => {
		const msg = getDailyCapMessage(1);
		expect(msg.title).toMatch(/well done/i);
	});

	it('always returns a body string', () => {
		expect(getDailyCapMessage(0).body).toBeTruthy();
		expect(getDailyCapMessage(3).body).toBeTruthy();
	});
});

describe('isFullDayCompletion', () => {
	it('returns true when the user just hit the cap (was at cap - 1)', () => {
		// cap is 3, so if they had 2 before this lesson, this lesson hits it
		expect(isFullDayCompletion(DAILY_CAPS.new_lessons - 1)).toBe(true);
	});

	it('returns false before the cap', () => {
		expect(isFullDayCompletion(0)).toBe(false);
		expect(isFullDayCompletion(1)).toBe(false);
	});

	it('returns false after the cap (already past)', () => {
		expect(isFullDayCompletion(DAILY_CAPS.new_lessons)).toBe(false);
		expect(isFullDayCompletion(10)).toBe(false);
	});
});
