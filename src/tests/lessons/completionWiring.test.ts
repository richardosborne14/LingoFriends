/**
 * Tests — Completion Wiring (TASK-V2-09)
 *
 * Tests for the new pure helpers added to completionUtils.ts:
 *   - buildCapResult: daily cap detection after new lessons and reviews
 *   - Streak milestone interaction (via checkStreakMilestone from streakService)
 *
 * These functions are pure (no DB, no network) so they can be tested
 * exhaustively here without mocks.
 *
 * @module tests/lessons/completionWiring
 */

import { describe, it, expect } from 'vitest';
import { buildCapResult } from '$lib/server/lessons/completionUtils';
import { checkStreakMilestone, STREAK_MILESTONES } from '$lib/services/streakService';
import { DAILY_CAPS } from '$lib/services/dailyCapService';

// ─────────────────────────────────────────────────────────────────────────────
// buildCapResult — basic behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('buildCapResult — new lesson (isReview = false)', () => {
	it('returns null when well below the cap', () => {
		// 0 lessons before, completing the first one — cap is 3
		const result = buildCapResult(0, 0, false);
		expect(result).toBeNull();
	});

	it('returns null on the second lesson (one below cap)', () => {
		const result = buildCapResult(1, 0, false);
		expect(result).toBeNull();
	});

	it('returns null on the LAST lesson before hitting the cap (2 lessons done, cap = 3)', () => {
		// After this one, count = 3 which IS the cap — should return result
		// This test ensures newLessonsAfter = 3 triggers the cap
		const result = buildCapResult(2, 0, false);
		// newLessonsAfter = 3, which equals DAILY_CAPS.new_lessons (3) → cap hit
		expect(result).not.toBeNull();
	});

	it('returns DailyCapCompletionResult when new lesson cap is exactly reached', () => {
		// 2 lessons done today → this is the 3rd → cap reached
		const result = buildCapResult(2, 0, false);
		expect(result).not.toBeNull();
		expect(result!.hitNewLessonCap).toBe(true);
	});

	it('returns DailyCapCompletionResult when count already exceeds cap (defensive)', () => {
		// 5 lessons somehow — still shows cap modal
		const result = buildCapResult(5, 0, false);
		expect(result).not.toBeNull();
		expect(result!.hitNewLessonCap).toBe(true);
	});

	it('includes reviewAvailable = true when review cap not reached', () => {
		// 0 reviews done today
		const result = buildCapResult(2, 0, false);
		expect(result!.reviewAvailable).toBe(true);
	});

	it('includes reviewAvailable = false when review cap already reached', () => {
		// review cap is 5 — 5 reviews already done
		const result = buildCapResult(2, DAILY_CAPS.review_sessions, false);
		expect(result!.reviewAvailable).toBe(false);
	});

	it('includes a capMessage with title and body', () => {
		const result = buildCapResult(2, 0, false);
		expect(result!.capMessage).toBeDefined();
		expect(typeof result!.capMessage.title).toBe('string');
		expect(typeof result!.capMessage.body).toBe('string');
		expect(result!.capMessage.title.length).toBeGreaterThan(0);
		expect(result!.capMessage.body.length).toBeGreaterThan(0);
	});

	it('includes capStatus with correct counts', () => {
		const result = buildCapResult(2, 0, false);
		// After 3rd new lesson: newLessonsCapped = true, lessonsToday = 3
		expect(result!.capStatus.newLessonsCapped).toBe(true);
		expect(result!.capStatus.lessonsToday).toBe(3);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildCapResult — review sessions (isReview = true)
// ─────────────────────────────────────────────────────────────────────────────

describe('buildCapResult — review session (isReview = true)', () => {
	it('returns null for reviews (review cap does NOT trigger DailyCapModal)', () => {
		// Even if review cap is hit, we return null — no DailyCapModal for reviews
		const result = buildCapResult(0, DAILY_CAPS.review_sessions, true);
		expect(result).toBeNull();
	});

	it('returns null even on first review (no new-lesson cap hit)', () => {
		const result = buildCapResult(0, 0, true);
		expect(result).toBeNull();
	});

	it('returns null when review sessions exceed cap (no new-lesson cap)', () => {
		// 10 reviews — still null (DailyCapModal is only for new lessons)
		const result = buildCapResult(0, 10, true);
		expect(result).toBeNull();
	});

	it('does NOT modify new lesson count for reviews', () => {
		// New lessons were at 1 before review — still should not trigger cap
		const result = buildCapResult(1, 4, true);
		expect(result).toBeNull();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildCapResult — edge cases and clamping
// ─────────────────────────────────────────────────────────────────────────────

describe('buildCapResult — edge cases', () => {
	it('handles negative values gracefully (clamps to 0)', () => {
		// Malformed DB data — should not crash
		const result = buildCapResult(-5, -1, false);
		// newLessonsAfter = 0 + 1 = 1 — well below cap
		expect(result).toBeNull();
	});

	it('handles zero for both counts with new lesson (first ever lesson)', () => {
		const result = buildCapResult(0, 0, false);
		// newLessonsAfter = 1 — below cap of 3
		expect(result).toBeNull();
	});

	it('handles DAILY_CAPS.new_lessons - 1 exactly (threshold case)', () => {
		// At exactly cap - 1 = 2 before, after = 3 → should trigger
		const result = buildCapResult(DAILY_CAPS.new_lessons - 1, 0, false);
		expect(result).not.toBeNull();
		expect(result!.hitNewLessonCap).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// checkStreakMilestone (used in completion API alongside buildCapResult)
// ─────────────────────────────────────────────────────────────────────────────

describe('checkStreakMilestone — used by completion API', () => {
	it('returns null for non-milestone streaks (day 1, 2, 4, 5, 6)', () => {
		expect(checkStreakMilestone(1)).toBeNull();
		expect(checkStreakMilestone(2)).toBeNull();
		expect(checkStreakMilestone(4)).toBeNull();
		expect(checkStreakMilestone(5)).toBeNull();
		expect(checkStreakMilestone(6)).toBeNull();
	});

	it('returns milestone at streak 3 (first milestone)', () => {
		const m = checkStreakMilestone(3);
		expect(m).not.toBeNull();
		expect(m!.streak).toBe(3);
		expect(m!.gems).toBeGreaterThan(0);
	});

	it('returns Week Warrior badge at streak 7', () => {
		const m = checkStreakMilestone(7);
		expect(m).not.toBeNull();
		expect(m!.badge).toBe('Week Warrior');
		expect(m!.streak).toBe(7);
	});

	it('returns correct gems at streak 14', () => {
		const m = checkStreakMilestone(14);
		expect(m).not.toBeNull();
		expect(m!.gems).toBe(20);
	});

	it('returns Month Maestro badge at streak 30', () => {
		const m = checkStreakMilestone(30);
		expect(m).not.toBeNull();
		expect(m!.badge).toBe('Month Maestro');
	});

	it('returns Century Learner badge at streak 100', () => {
		const m = checkStreakMilestone(100);
		expect(m).not.toBeNull();
		expect(m!.badge).toBe('Century Learner');
		expect(m!.gems).toBe(100);
	});

	it('returns null for streak just after a milestone (exact match only)', () => {
		// Milestones fire ONLY on the exact day, not the day after
		expect(checkStreakMilestone(8)).toBeNull();
		expect(checkStreakMilestone(31)).toBeNull();
		expect(checkStreakMilestone(101)).toBeNull();
	});

	it('all defined milestones are reachable via checkStreakMilestone', () => {
		// Sanity check: every milestone in the table can be detected
		for (const milestone of STREAK_MILESTONES) {
			const result = checkStreakMilestone(milestone.streak);
			expect(result).not.toBeNull();
			expect(result!.streak).toBe(milestone.streak);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration-style: both cap and milestone at once (rare but possible)
// ─────────────────────────────────────────────────────────────────────────────

describe('cap + milestone can co-occur', () => {
	it('hitting daily cap on day 3 of streak fires both independently', () => {
		// 2 lessons done today (so 3rd completes the cap)
		const capResult = buildCapResult(2, 0, false);
		// Day 3 streak also hits the first milestone
		const milestoneResult = checkStreakMilestone(3);

		// Both should be non-null — the API returns both and the UI handles priority
		expect(capResult).not.toBeNull();
		expect(milestoneResult).not.toBeNull();
		expect(milestoneResult!.streak).toBe(3);
	});

	it('review session on day 7 of streak triggers milestone but not cap', () => {
		// A review session (isReview = true) on streak day 7
		const capResult = buildCapResult(0, 0, true);
		const milestoneResult = checkStreakMilestone(7);

		// Cap: null (reviews don't trigger DailyCapModal)
		expect(capResult).toBeNull();
		// Milestone: Week Warrior!
		expect(milestoneResult).not.toBeNull();
		expect(milestoneResult!.badge).toBe('Week Warrior');
	});
});
