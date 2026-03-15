/**
 * LingoFriends V2 — Streak Service
 *
 * Handles daily streak logic: milestone rewards, streak freeze mechanics,
 * and week calendar generation for the profile page display.
 *
 * WHY a separate module from srsService: srsService handles the raw streak
 * *calculation* (how many days in a row). This service handles the *game
 * layer* on top — rewards for hitting milestones, freeze management, and
 * UI-level utilities. Two different concerns, two modules.
 *
 * STREAK FREEZE: Users get 2 auto-activating freeze passes per week.
 * This prevents the "I broke my streak, why bother" demoralisation that
 * kills engagement. Resets to 2 every Monday (UTC).
 *
 * @module services/streakService
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Milestone definitions: streak length → gem reward.
 * Gems are the premium currency earned without purchase.
 * Values chosen to feel meaningful but not game-breaking.
 */
export const STREAK_MILESTONES: { streak: number; gems: number; badge?: string }[] = [
	{ streak: 3, gems: 5 },
	{ streak: 7, gems: 10, badge: 'Week Warrior' },
	{ streak: 14, gems: 20 },
	{ streak: 30, gems: 50, badge: 'Month Maestro' },
	{ streak: 100, gems: 100, badge: 'Century Learner' },
];

/**
 * Number of freeze passes replenished each week.
 * 2 passes = roughly 1 forgiven missed day per 3-4 days. Enough to be
 * meaningful without undermining the habit-building purpose of streaks.
 */
export const FREEZE_PASSES_PER_WEEK = 2;

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether the given streak value hits a milestone.
 * Called after each lesson completion (with the *new* streak value).
 *
 * Returns the milestone object if it's a milestone day, null otherwise.
 * The caller is responsible for awarding the gems and displaying the badge.
 *
 * @param newStreak - The streak count AFTER today's lesson
 * @returns Milestone hit, or null if no milestone today
 */
export function checkStreakMilestone(
	newStreak: number
): { streak: number; gems: number; badge?: string } | null {
	// Exact match only — milestones fire on the exact day, not every day after
	return STREAK_MILESTONES.find((m) => m.streak === newStreak) ?? null;
}

/**
 * Returns all milestones the user has already passed (streak >= milestone).
 * Used on the profile page to render achievement badges.
 *
 * @param currentStreak - User's current streak
 * @returns Array of earned milestone objects (may be empty)
 */
export function getEarnedStreakBadges(
	currentStreak: number
): { streak: number; gems: number; badge?: string }[] {
	// Filter to milestones with named badges that the user has reached
	return STREAK_MILESTONES.filter(
		(m) => m.badge !== undefined && currentStreak >= m.streak
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK FREEZE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the weekly freeze counter needs resetting.
 * Resets happen every Monday (UTC weekday 1 = Monday).
 *
 * Why UTC: Avoids timezone edge cases in tests and across users in different
 * timezones. Reset at start of UTC Monday is "fair enough" for all timezones.
 *
 * @param lastResetDate - When the freeze counter was last reset (null = never)
 * @param today - Current date (injectable for testing)
 */
export function shouldResetFreezes(
	lastResetDate: Date | null,
	today: Date = new Date()
): boolean {
	if (!lastResetDate) {
		// Never reset — definitely needs resetting
		return true;
	}

	// Find the most recent Monday on or before today
	const todayMidnight = new Date(today);
	todayMidnight.setUTCHours(0, 0, 0, 0);

	// getUTCDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
	// daysSinceMonday: 0 on Monday, 6 on Sunday
	const daysSinceMonday = (todayMidnight.getUTCDay() + 6) % 7;
	const mostRecentMonday = new Date(todayMidnight);
	mostRecentMonday.setUTCDate(mostRecentMonday.getUTCDate() - daysSinceMonday);

	// Reset needed if last reset was before this week's Monday
	const lastResetMidnight = new Date(lastResetDate);
	lastResetMidnight.setUTCHours(0, 0, 0, 0);

	return lastResetMidnight < mostRecentMonday;
}

/**
 * Calculates updated freeze values after a lesson is completed.
 *
 * If the last reset was before this week, reset to FREEZE_PASSES_PER_WEEK.
 * The freeze count itself is not decremented here — freezes are consumed only
 * when the streak calculation detects a *missed* day, which happens in the
 * completion handler when calculateNewStreak returns 1 (reset) instead of
 * incrementing.
 *
 * @param currentFreezes - Current freeze passes remaining
 * @param lastFreezeReset - When freezes were last reset (null = never)
 * @param today - Current date (injectable for testing)
 * @returns { freezesRemaining, lastFreezeReset } — new values to write to DB
 */
export function getUpdatedFreezeState(
	currentFreezes: number,
	lastFreezeReset: Date | null,
	today: Date = new Date()
): { freezesRemaining: number; lastFreezeReset: Date } {
	if (shouldResetFreezes(lastFreezeReset, today)) {
		// New week — replenish all freeze passes
		return {
			freezesRemaining: FREEZE_PASSES_PER_WEEK,
			lastFreezeReset: today,
		};
	}
	// Same week — keep current value
	return {
		freezesRemaining: currentFreezes,
		lastFreezeReset: lastFreezeReset ?? today,
	};
}

/**
 * Determines whether a streak freeze should be consumed on this lesson.
 *
 * A freeze is consumed when:
 *   1. The streak was broken (new streak = 1 but old streak > 1)
 *   2. There are freezes remaining
 *
 * When a freeze is consumed, the streak should be restored to oldStreak + 1.
 *
 * @param oldStreak - Streak value BEFORE today's lesson
 * @param calculatedNewStreak - What calculateNewStreak returned (1 = broken)
 * @param freezesRemaining - How many freeze passes the user has
 * @returns Whether to consume a freeze (true) or accept the reset (false)
 */
export function shouldConsumeFreeze(
	oldStreak: number,
	calculatedNewStreak: number,
	freezesRemaining: number
): boolean {
	// A freeze only helps when the streak was actually broken
	const streakBroken = calculatedNewStreak === 1 && oldStreak > 1;
	const hasFreezes = freezesRemaining > 0;
	return streakBroken && hasFreezes;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEK CALENDAR BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape of a single day in the weekly calendar display.
 */
export interface WeekDay {
	/** 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su' */
	label: string;
	/** ISO date string, e.g. '2026-03-14' */
	date: string;
	/** Whether the user completed a lesson on this day */
	completed: boolean;
	/** Whether this day is today */
	isToday: boolean;
}

/**
 * Builds the 7-day weekly calendar array for the profile/stats page.
 * Always starts from Monday of the current week.
 *
 * @param completedDates - Set of ISO date strings when lessons were done
 * @param today - Current date (injectable for testing)
 * @returns Array of 7 WeekDay objects, Monday first
 */
export function buildWeekCalendar(
	completedDates: Set<string>,
	today: Date = new Date()
): WeekDay[] {
	const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

	// Use UTC midnight to avoid local-timezone offset shifting the date string.
	// toISOString() always outputs UTC, so we must use UTC methods throughout
	// to keep date strings consistent (avoiding off-by-one when UTC offset > 0).
	const todayMidnight = new Date(today);
	todayMidnight.setUTCHours(0, 0, 0, 0);

	// getUTCDay(): 0=Sunday, 1=Monday,...,6=Saturday
	// daysSinceMonday: 0 on Monday, 6 on Sunday
	const daysSinceMonday = (todayMidnight.getUTCDay() + 6) % 7;
	const monday = new Date(todayMidnight);
	monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);

	const todayStr = todayMidnight.toISOString().split('T')[0];

	// Build array of 7 days starting from Monday
	return Array.from({ length: 7 }, (_, i) => {
		const day = new Date(monday);
		day.setUTCDate(monday.getUTCDate() + i);
		const dateStr = day.toISOString().split('T')[0];

		return {
			label: DAY_LABELS[i],
			date: dateStr,
			completed: completedDates.has(dateStr),
			isToday: dateStr === todayStr,
		};
	});
}
