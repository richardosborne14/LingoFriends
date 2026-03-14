/**
 * LingoFriends V2 — Spaced Repetition Service (SM-2 inspired)
 *
 * Calculates next review dates for chunks based on performance.
 * Based on the SM-2 algorithm: good performance extends intervals,
 * poor performance resets to 1 day.
 *
 * Interval schedule: 1 → 3 → 7 → 14 → 30 days
 *
 * @module server/lessons/srsService
 */

/** SM-2 interval schedule in days */
const SRS_INTERVALS = [1, 3, 7, 14, 30];

/** Minimum ease factor — prevents intervals from shrinking to nothing */
const MIN_EASE_FACTOR = 1.3;

/** Default ease factor for new chunks (SM-2 default) */
export const DEFAULT_EASE_FACTOR = 2.5;

/**
 * Determines the next SRS interval based on performance.
 *
 * Good performance (accuracy ≥ 0.7): use next interval in schedule
 * Poor performance (accuracy < 0.7): reset to 1 day
 *
 * @param currentInterval - Current interval in days (from chunkLibrary.srsInterval)
 * @param accuracy - Performance score for this review (0.0 to 1.0)
 * @returns New interval in days
 */
export function calculateNextInterval(currentInterval: number, accuracy: number): number {
	const GOOD_THRESHOLD = 0.7;

	if (accuracy < GOOD_THRESHOLD) {
		// Poor performance — reset to beginning (frustration-free: day 1 again)
		return SRS_INTERVALS[0];
	}

	// Find the next interval up from the current one
	const currentIndex = SRS_INTERVALS.indexOf(currentInterval);

	if (currentIndex === -1) {
		// Unknown interval — find the nearest slot and advance one step
		const nextSlot = SRS_INTERVALS.find((i) => i > currentInterval) ?? SRS_INTERVALS[SRS_INTERVALS.length - 1];
		return nextSlot;
	}

	// Advance to next interval, or stay at max if already at the end
	const nextIndex = Math.min(currentIndex + 1, SRS_INTERVALS.length - 1);
	return SRS_INTERVALS[nextIndex];
}

/**
 * Calculates the new ease factor using the SM-2 formula.
 *
 * SM-2 formula: EF' = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))
 * Where q is a quality rating 0-5. We map accuracy to q:
 *   accuracy 1.0 → q=5 (perfect)
 *   accuracy 0.7 → q=3 (good)
 *   accuracy 0.0 → q=0 (complete failure)
 *
 * @param currentFactor - Current ease factor
 * @param accuracy - Performance score (0.0 to 1.0)
 * @returns New ease factor (clamped to MIN_EASE_FACTOR)
 */
export function calculateEaseFactor(currentFactor: number, accuracy: number): number {
	// Map accuracy (0-1) to quality q (0-5)
	const q = Math.round(accuracy * 5);

	// SM-2 ease factor update formula
	const newFactor = currentFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

	// Clamp to minimum — ease factor should never go too low
	return Math.max(MIN_EASE_FACTOR, newFactor);
}

/**
 * Calculates the next review date for a chunk.
 *
 * @param intervalDays - How many days until next review
 * @param fromDate - Date to calculate from (defaults to now)
 * @returns Date when this chunk should next be reviewed
 */
export function calculateNextReviewDate(intervalDays: number, fromDate: Date = new Date()): Date {
	const next = new Date(fromDate);
	next.setDate(next.getDate() + intervalDays);
	// Set to start of day for consistent comparisons
	next.setHours(0, 0, 0, 0);
	return next;
}

/**
 * Full SRS update for a single chunk after a lesson.
 *
 * Returns the new values to store in chunk_library.
 *
 * @param currentInterval - Current srs_interval_days from DB
 * @param currentFactor - Current srs_factor from DB
 * @param accuracy - How well the learner performed on this chunk (0.0 to 1.0)
 * @param correct - Whether they got it right at all
 */
export interface SRSUpdate {
	srsInterval: number;
	srsFactor: number;
	nextReviewDate: Date;
	timesStudiedIncrement: number;
	timesCorrectIncrement: number;
}

export function calculateSRSUpdate(
	currentInterval: number,
	currentFactor: number,
	accuracy: number,
	correct: boolean
): SRSUpdate {
	const newInterval = calculateNextInterval(currentInterval, accuracy);
	const newFactor = calculateEaseFactor(currentFactor, accuracy);
	const nextReviewDate = calculateNextReviewDate(newInterval);

	return {
		srsInterval: newInterval,
		srsFactor: newFactor,
		nextReviewDate,
		timesStudiedIncrement: 1,
		timesCorrectIncrement: correct ? 1 : 0,
	};
}

/**
 * Calculates the new streak based on activity dates.
 *
 * Streak rules:
 *   - lastActivityDate = yesterday → increment streak
 *   - lastActivityDate = today → no change (already counted today)
 *   - lastActivityDate > 1 day ago → reset to 1
 *   - null (first lesson ever) → streak starts at 1
 *
 * @param currentStreak - Current streak value from DB
 * @param lastActivityDate - Last time user did a lesson (null if never)
 * @param today - Current date (injectable for testing)
 * @returns New streak value
 */
export function calculateNewStreak(
	currentStreak: number,
	lastActivityDate: Date | null,
	today: Date = new Date()
): number {
	if (!lastActivityDate) {
		// First lesson ever
		return 1;
	}

	const todayMidnight = new Date(today);
	todayMidnight.setHours(0, 0, 0, 0);

	const lastMidnight = new Date(lastActivityDate);
	lastMidnight.setHours(0, 0, 0, 0);

	const diffDays = Math.round(
		(todayMidnight.getTime() - lastMidnight.getTime()) / (1000 * 60 * 60 * 24)
	);

	if (diffDays === 0) {
		// Already did a lesson today — don't double-count
		return currentStreak;
	}
	if (diffDays === 1) {
		// Did a lesson yesterday — extend the streak
		return currentStreak + 1;
	}
	// Missed at least one day — streak resets
	return 1;
}
