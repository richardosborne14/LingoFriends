/**
 * Tests for src/lib/services/streakService.ts
 *
 * Pure functions — no mocks needed. Dates are injected for determinism.
 * Tests cover: milestone detection, freeze management, week calendar.
 */

import { describe, it, expect } from 'vitest';
import {
	checkStreakMilestone,
	getEarnedStreakBadges,
	shouldResetFreezes,
	getUpdatedFreezeState,
	shouldConsumeFreeze,
	buildWeekCalendar,
	STREAK_MILESTONES,
	FREEZE_PASSES_PER_WEEK,
} from '$lib/services/streakService';

// ─── MILESTONE DETECTION ─────────────────────────────────────────────────────

describe('checkStreakMilestone', () => {
	it('returns null for non-milestone streaks', () => {
		expect(checkStreakMilestone(1)).toBeNull();
		expect(checkStreakMilestone(5)).toBeNull();
		expect(checkStreakMilestone(20)).toBeNull();
	});

	it('returns the milestone for streak = 3', () => {
		const result = checkStreakMilestone(3);
		expect(result).not.toBeNull();
		expect(result?.streak).toBe(3);
		expect(result?.gems).toBe(5);
	});

	it('returns the milestone for streak = 7 with badge', () => {
		const result = checkStreakMilestone(7);
		expect(result?.badge).toBe('Week Warrior');
		expect(result?.gems).toBe(10);
	});

	it('returns the milestone for streak = 30 with badge', () => {
		const result = checkStreakMilestone(30);
		expect(result?.badge).toBe('Month Maestro');
	});

	it('returns the milestone for streak = 100 with badge', () => {
		const result = checkStreakMilestone(100);
		expect(result?.badge).toBe('Century Learner');
	});

	it('exact match only — streak 101 does not trigger 100 milestone again', () => {
		expect(checkStreakMilestone(101)).toBeNull();
	});
});

describe('getEarnedStreakBadges', () => {
	it('returns empty array for streak 0', () => {
		expect(getEarnedStreakBadges(0)).toEqual([]);
	});

	it('returns first badge when streak >= 7', () => {
		const badges = getEarnedStreakBadges(7);
		expect(badges.length).toBe(1);
		expect(badges[0].badge).toBe('Week Warrior');
	});

	it('accumulates badges as streak increases', () => {
		const badges = getEarnedStreakBadges(100);
		// Should have: Week Warrior (7), Month Maestro (30), Century Learner (100)
		const badgeNames = badges.map((b) => b.badge);
		expect(badgeNames).toContain('Week Warrior');
		expect(badgeNames).toContain('Month Maestro');
		expect(badgeNames).toContain('Century Learner');
		expect(badges.length).toBe(3);
	});
});

// ─── FREEZE RESET ────────────────────────────────────────────────────────────

// A known Monday for testing: 2026-03-09 is a Monday
const MONDAY = new Date('2026-03-09T12:00:00Z');
// Wednesday same week
const WEDNESDAY = new Date('2026-03-11T12:00:00Z');
// Following Monday
const NEXT_MONDAY = new Date('2026-03-16T12:00:00Z');

describe('shouldResetFreezes', () => {
	it('returns true when lastResetDate is null (never reset)', () => {
		expect(shouldResetFreezes(null, WEDNESDAY)).toBe(true);
	});

	it('returns false when last reset was this week', () => {
		// Last reset was Monday, today is Wednesday
		expect(shouldResetFreezes(MONDAY, WEDNESDAY)).toBe(false);
	});

	it('returns true when last reset was last week', () => {
		// Last reset was last Monday, today is this Monday
		expect(shouldResetFreezes(MONDAY, NEXT_MONDAY)).toBe(true);
	});

	it('returns false when last reset was today', () => {
		expect(shouldResetFreezes(WEDNESDAY, WEDNESDAY)).toBe(false);
	});
});

describe('getUpdatedFreezeState', () => {
	it('resets freezes to FREEZE_PASSES_PER_WEEK on new week', () => {
		const result = getUpdatedFreezeState(0, MONDAY, NEXT_MONDAY);
		expect(result.freezesRemaining).toBe(FREEZE_PASSES_PER_WEEK);
	});

	it('keeps current freezes within the same week', () => {
		const result = getUpdatedFreezeState(1, MONDAY, WEDNESDAY);
		expect(result.freezesRemaining).toBe(1);
	});

	it('resets freezes when lastFreezeReset is null', () => {
		const result = getUpdatedFreezeState(0, null, WEDNESDAY);
		expect(result.freezesRemaining).toBe(FREEZE_PASSES_PER_WEEK);
	});
});

// ─── FREEZE CONSUMPTION ───────────────────────────────────────────────────────

describe('shouldConsumeFreeze', () => {
	it('returns true when streak was broken and freezes remain', () => {
		// Had streak of 10, calculateNewStreak returned 1 (broken), have 2 freezes
		expect(shouldConsumeFreeze(10, 1, 2)).toBe(true);
	});

	it('returns false when no freezes remain', () => {
		expect(shouldConsumeFreeze(10, 1, 0)).toBe(false);
	});

	it('returns false when streak was not broken (streak incremented)', () => {
		// Streak went from 10 to 11 — no break, no freeze needed
		expect(shouldConsumeFreeze(10, 11, 2)).toBe(false);
	});

	it('returns false when first lesson (old streak was 0)', () => {
		// Never had a streak — nothing to protect
		expect(shouldConsumeFreeze(0, 1, 2)).toBe(false);
	});

	it('returns false when streak stayed same (double lesson today)', () => {
		// Same day double lesson: calculateNewStreak returns same value
		expect(shouldConsumeFreeze(5, 5, 2)).toBe(false);
	});
});

// ─── WEEK CALENDAR ────────────────────────────────────────────────────────────

describe('buildWeekCalendar', () => {
	// Use Thursday 2026-03-12 as "today" (a known Thursday)
	const THURSDAY = new Date('2026-03-12T12:00:00.000Z');

	it('returns exactly 7 days', () => {
		const days = buildWeekCalendar(new Set(), THURSDAY);
		expect(days).toHaveLength(7);
	});

	it('starts on Monday of the current week', () => {
		const days = buildWeekCalendar(new Set(), THURSDAY);
		expect(days[0].label).toBe('Mo');
		// 2026-03-12 is Thursday (Mon = 09, Tue = 10, Wed = 11, Thu = 12)
		expect(days[0].date).toBe('2026-03-09');
	});

	it('ends on Sunday', () => {
		const days = buildWeekCalendar(new Set(), THURSDAY);
		expect(days[6].label).toBe('Su');
		expect(days[6].date).toBe('2026-03-15');
	});

	it('marks today correctly', () => {
		const days = buildWeekCalendar(new Set(), THURSDAY);
		const today = days.find((d) => d.isToday);
		expect(today?.label).toBe('Th');
		expect(today?.date).toBe('2026-03-12');
	});

	it('marks completed days from the set', () => {
		const completedDates = new Set(['2026-03-09', '2026-03-11']);
		const days = buildWeekCalendar(completedDates, THURSDAY);
		expect(days[0].completed).toBe(true); // Monday
		expect(days[1].completed).toBe(false); // Tuesday
		expect(days[2].completed).toBe(true); // Wednesday
	});

	it('days without lessons are not completed', () => {
		const days = buildWeekCalendar(new Set(), THURSDAY);
		expect(days.every((d) => !d.completed)).toBe(true);
	});

	it('STREAK_MILESTONES constant is defined and non-empty', () => {
		expect(STREAK_MILESTONES.length).toBeGreaterThan(0);
	});
});
