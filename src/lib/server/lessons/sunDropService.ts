/**
 * LingoFriends V2 — SunDrop Reward Service
 *
 * Pure functions for calculating SunDrop rewards and star ratings.
 * No DB calls, no AI. Used by the lesson completion API.
 *
 * Key principles from PEDAGOGY.md:
 *   - Affective filter: rewards floor at 0 — NEVER negative (no punishment)
 *   - Wrong attempts reduce reward but never below 0
 *   - Using help halves the reward (earned it with assistance)
 *   - Daily cap of 50 SunDrops prevents grinding
 *
 * @module server/lessons/sunDropService
 */

/** Daily SunDrop cap — prevents infinite grinding */
export const DAILY_SUNDROP_CAP = 50;

/**
 * Calculates the SunDrops earned for a single activity.
 *
 * Reward rules (from PEDAGOGY.md):
 *   - Base value: the nominal SunDrops for this activity type
 *   - -1 per wrong attempt (penalty floors at 0)
 *   - ÷2 if help was used (rounded down)
 *   - Final value: max(0, computed)
 *
 * WHY floor at 0: Per Krashen's Affective Filter hypothesis, punishment
 * increases anxiety and blocks learning. We never take away earned progress.
 *
 * @param baseValue - The nominal SunDrop value for this activity (0-4)
 * @param wrongAttempts - Number of wrong answers before getting it right
 * @param usedHelp - Whether the learner tapped "Ask for help"
 * @returns SunDrops earned (always ≥ 0)
 */
export function calculateReward(
	baseValue: number,
	wrongAttempts: number,
	usedHelp: boolean
): number {
	// Apply wrong attempt penalty first
	let reward = baseValue - wrongAttempts;

	// Halve the reward if help was used (but still a reward — they got it right)
	if (usedHelp) {
		reward = Math.floor(reward / 2);
	}

	// Floor at 0 — NEVER punish with negative values
	return Math.max(0, reward);
}

/**
 * Calculates the star rating for a completed lesson.
 *
 * Star thresholds (consistent with standard language app conventions):
 *   3 stars: 90%+ of max SunDrops earned
 *   2 stars: 50-89%
 *   1 star:  <50% (you always get at least 1 for completing)
 *
 * @param earned - SunDrops actually earned by the learner
 * @param max - Maximum possible SunDrops for this lesson
 * @returns 1, 2, or 3 stars
 */
export function calculateStarRating(earned: number, max: number): 1 | 2 | 3 {
	if (max <= 0) return 1; // Edge case: no SunDrops possible
	const ratio = earned / max;
	if (ratio >= 0.9) return 3;
	if (ratio >= 0.5) return 2;
	return 1;
}

/**
 * Calculates the gems earned from a lesson.
 *
 * Gems reward accuracy: the more correct answers, the more gems.
 * A streak multiplier rewards consistent daily practice.
 *
 * Formula: floor(accuracy% / 20) × streakMultiplier
 * So: 100% accuracy = 5 gems × multiplier
 *     80% accuracy  = 4 gems × multiplier
 *     60% accuracy  = 3 gems × multiplier
 *
 * @param accuracy - Lesson accuracy as a decimal (0.0 to 1.0)
 * @param currentStreak - Learner's current daily streak
 * @returns Gems earned (always ≥ 0, whole number)
 */
export function calculateGems(accuracy: number, currentStreak: number): number {
	const streakMultiplier = getStreakMultiplier(currentStreak);
	const baseGems = Math.floor((accuracy * 100) / 20);
	return Math.floor(baseGems * streakMultiplier);
}

/**
 * Returns the streak multiplier for gem calculations.
 *
 * Longer streaks give bigger bonuses to encourage daily habits.
 *   14+ days: 3× multiplier
 *   7-13 days: 2× multiplier
 *   3-6 days: 1.5× multiplier
 *   <3 days: 1× (no bonus)
 *
 * @param streak - Current daily streak length
 */
export function getStreakMultiplier(streak: number): number {
	if (streak >= 14) return 3;
	if (streak >= 7) return 2;
	if (streak >= 3) return 1.5;
	return 1;
}

/**
 * Applies the daily SunDrop cap.
 *
 * Returns the actual SunDrops to award after checking the daily cap.
 * If the learner has already hit 50 today, they get 0 more.
 *
 * @param earned - SunDrops earned this lesson
 * @param alreadyEarnedToday - SunDrops already awarded today
 * @returns Capped SunDrops to actually award
 */
export function applyCap(earned: number, alreadyEarnedToday: number): number {
	const remaining = Math.max(0, DAILY_SUNDROP_CAP - alreadyEarnedToday);
	return Math.min(earned, remaining);
}

/**
 * Calculates the new growth stage for a tree based on total SunDrops.
 *
 * Growth stage thresholds (from 02-DATABASE-SCHEMA.md):
 * 0=seed, 1=sprout, ..., 14=mythic tree
 *
 * @param totalSunDrops - Total SunDrops earned by this tree
 * @returns Growth stage (0-14)
 */
export function calculateGrowthStage(totalSunDrops: number): number {
	const thresholds = [0, 10, 25, 45, 70, 100, 140, 190, 250, 320, 400, 500, 625, 775, 900];
	let stage = 0;
	for (let i = 0; i < thresholds.length; i++) {
		if (totalSunDrops >= thresholds[i]) {
			stage = i;
		}
	}
	return stage;
}
