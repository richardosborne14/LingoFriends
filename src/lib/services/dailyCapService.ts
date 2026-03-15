/**
 * LingoFriends V2 — Daily Cap Service
 *
 * Enforces daily lesson limits to promote healthy engagement.
 *
 * WHY a cap exists: LingoFriends is designed for kids and should NOT exploit
 * the engagement mechanics that cause unhealthy app addiction. Spaced
 * repetition also works best when learning is spread across days rather than
 * massed in a single session. The cap respects both values.
 *
 * Cap resets at midnight LOCAL time (approximated via the date string from
 * dailyProgress, which uses the server's UTC date). For kids using the app
 * primarily in one timezone, this is accurate enough.
 *
 * @module services/dailyCapService
 */

// ─────────────────────────────────────────────────────────────────────────────
// CAP CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Daily lesson limits.
 * Tuned by pedagogical guidance (see PEDAGOGY.md — distributed practice).
 *
 * new_lessons: caps "first encounter" sessions. Prevents overload.
 * review_sessions: review is less cognitively demanding, so a higher cap.
 * total_lessons: hard ceiling for any combination.
 */
export const DAILY_CAPS = {
	/**
	 * Maximum NEW lessons per day.
	 * New lessons introduce unfamiliar material — high cognitive load.
	 * 3 is the sweet spot for meaningful progress without exhaustion.
	 */
	new_lessons: 3,

	/**
	 * Maximum review sessions per day.
	 * Review is easier (familiar material) but still benefits from spacing.
	 * 5 allows thorough review catch-up without grinding.
	 */
	review_sessions: 5,

	/**
	 * Absolute total lessons ceiling per day (new + review combined).
	 * Acts as a safety net even if the specific caps are raised.
	 */
	total_lessons: 6,

	/**
	 * Bonus SunDrops for completing the full daily allowance.
	 * Rewarding reaching the cap (not exceeding it) encourages
	 * healthy "done for today" completion without grinding.
	 */
	full_day_bonus_sundrops: 10,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// CAP STATUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of checking the daily cap.
 * All properties are client-safe (no DB internals).
 */
export interface DailyCapStatus {
	/** True if the user has hit their new-lesson cap for today */
	newLessonsCapped: boolean;
	/** True if the user has hit their review cap for today */
	reviewCapped: boolean;
	/** True if either cap is hit (new OR review) */
	anyCapped: boolean;
	/** Lessons completed today (new + review) */
	lessonsToday: number;
	/** How many new lessons remain before hitting the cap */
	newLessonsRemaining: number;
	/** How many review sessions remain before hitting the cap */
	reviewSessionsRemaining: number;
	/** True if the user completed the full daily allowance (earns bonus SunDrops) */
	completedFullDay: boolean;
}

/**
 * Calculates the daily cap status from raw daily progress counts.
 *
 * Pure function — all DB interaction is in the calling server code.
 * This approach makes the logic fully testable without a DB connection.
 *
 * @param newLessonsToday - Count of new lessons completed today
 * @param reviewSessionsToday - Count of review sessions completed today
 * @returns DailyCapStatus object for the caller to act on
 */
export function calculateCapStatus(
	newLessonsToday: number,
	reviewSessionsToday: number
): DailyCapStatus {
	// Clamp negative values (defensive — shouldn't happen with a healthy DB)
	const newCount = Math.max(0, newLessonsToday);
	const reviewCount = Math.max(0, reviewSessionsToday);
	const totalCount = newCount + reviewCount;

	const newLessonsCapped =
		newCount >= DAILY_CAPS.new_lessons || totalCount >= DAILY_CAPS.total_lessons;

	const reviewCapped =
		reviewCount >= DAILY_CAPS.review_sessions || totalCount >= DAILY_CAPS.total_lessons;

	const newLessonsRemaining = Math.max(
		0,
		Math.min(
			DAILY_CAPS.new_lessons - newCount,
			DAILY_CAPS.total_lessons - totalCount
		)
	);

	const reviewSessionsRemaining = Math.max(
		0,
		Math.min(
			DAILY_CAPS.review_sessions - reviewCount,
			DAILY_CAPS.total_lessons - totalCount
		)
	);

	// "Full day" = hit the new-lesson cap specifically (not just total).
	// Review sessions are optional catch-up, not the "primary" daily learning.
	const completedFullDay = newCount >= DAILY_CAPS.new_lessons;

	return {
		newLessonsCapped,
		reviewCapped,
		anyCapped: newLessonsCapped,
		lessonsToday: totalCount,
		newLessonsRemaining,
		reviewSessionsRemaining,
		completedFullDay,
	};
}

/**
 * Returns a friendly message to display when the user hits the new-lesson cap.
 * Varies based on how many lessons they completed (encouraging, not scolding).
 *
 * WHY this is in the service layer: The message copy is a game design decision
 * (pedagogy-adjacent) and should be co-located with the cap constants, not
 * scattered across UI components.
 *
 * @param lessonsCompleted - Total lessons done today
 * @returns Object with title + body text for the DailyCapModal
 */
export function getDailyCapMessage(lessonsCompleted: number): { title: string; body: string } {
	// All completions earn the same positive framing — no guilt tripping
	if (lessonsCompleted >= DAILY_CAPS.new_lessons) {
		return {
			title: `🌟 Amazing work today!`,
			body: `You've completed ${lessonsCompleted} lessons today. That's the perfect amount!\n\nYour brain needs time to absorb everything you've learned. Come back tomorrow for more! 🌅`,
		};
	}
	if (lessonsCompleted >= 2) {
		return {
			title: `⭐ Great session!`,
			body: `You've done ${lessonsCompleted} lessons today — really impressive!\n\nRest up and come back tomorrow. Spaced repetition is how champions learn. 🏆`,
		};
	}
	return {
		title: `✅ Well done!`,
		body: `You've done ${lessonsCompleted} lesson today. Every lesson counts!\n\nCome back tomorrow to keep building your streak. 🔥`,
	};
}

/**
 * Returns true if the lesson count exactly equals the full-day threshold.
 * Used by the completion API to decide whether to award the full-day bonus.
 *
 * "Exactly equals" rather than "≥" to ensure the bonus is awarded once
 * (on the lesson that tips the user to the cap), not on every subsequent lesson.
 *
 * @param lessonsCompletedBeforeThisOne - Count BEFORE the lesson just saved
 */
export function isFullDayCompletion(lessonsCompletedBeforeThisOne: number): boolean {
	// The lesson just completed tips the user from (cap - 1) to cap
	return lessonsCompletedBeforeThisOne === DAILY_CAPS.new_lessons - 1;
}
