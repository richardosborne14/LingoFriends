/**
 * LingoFriends V2 — Client-Side Reward & Streak Service (TASK-V2-03)
 *
 * Pure functions for managing the in-lesson reward economy:
 *   - Streak bonuses (3-in-a-row, 5-in-a-row, 10-in-a-row)
 *   - Randomised encouragement / penalty messages
 *   - Reward and penalty event objects consumed by modal components
 *
 * WHY client-side, not server?: These are real-time lesson interactions.
 * The server (sunDropService.ts) handles the final lesson accounting.
 * This service handles the in-the-moment feedback layer only.
 *
 * @module services/rewardService
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A reward event to display in the RewardModal.
 * Built by buildRewardEvent() and consumed by the lesson page + RewardModal.
 */
export interface RewardEvent {
	/** Total SunDrops awarded this step (base + streak bonus) */
	sunDrops: number;
	/** Extra SunDrops from streak alone (0 if no streak bonus) */
	streakBonus: number;
	/** Current consecutive correct count (used to decide fire level) */
	streakCount: number;
	/** True when the streak just hit a milestone (3, 5, 10) */
	isStreakMilestone: boolean;
	/** Randomised encouragement message from ENCOURAGEMENT_MESSAGES */
	message: string;
}

/**
 * A penalty event to display in the PenaltyModal.
 */
export interface PenaltyEvent {
	/** SunDrops deducted (always positive number, displayed as "-N") */
	sunDropsLost: number;
	/** Gentle, non-punishing message from PENALTY_MESSAGES */
	message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK THRESHOLDS & BONUSES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Milestone streak counts that trigger bonus SunDrops and a special modal.
 *
 * WHY 3, 5, 10: These are psychologically "meaningful" numbers for kids.
 * 3 = "I'm on a roll!". 5 = "This is my day!". 10 = rare achievement.
 */
export const STREAK_MILESTONES = [3, 5, 10] as const;

/**
 * SunDrop bonus awarded at each streak milestone.
 * Indexed parallel to STREAK_MILESTONES (3→+3, 5→+5, 10→+8).
 *
 * WHY capped at 8 for 10-in-a-row: we don't want streaks to dwarf normal play.
 * The feeling of achievement is the reward, not the SunDrop count.
 */
const STREAK_BONUS_AMOUNTS: Record<number, number> = {
	3: 3,
	5: 5,
	10: 8,
};

/**
 * Returns streak bonus for the given consecutive correct count.
 *
 * Only milestone counts award bonuses (3, 5, 10).
 * Non-milestone streaks return 0 bonus — this prevents constant small bonuses
 * feeling ordinary and makes milestones feel special.
 *
 * @param streak - Current consecutive correct answer count
 * @returns Object with bonus amount and whether this is a milestone
 */
export function getStreakBonus(streak: number): { bonus: number; isMilestone: boolean } {
	const isMilestone = (STREAK_MILESTONES as readonly number[]).includes(streak);
	const bonus = STREAK_BONUS_AMOUNTS[streak] ?? 0;
	return { bonus, isMilestone };
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Positive encouragement messages rotated randomly.
 * Keep them varied so they feel fresh across a lesson session.
 * Appropriate for ages 7-18 — avoid slang or culture-specific phrases.
 */
const ENCOURAGEMENT_MESSAGES = [
	'Nice one! ⭐',
	'You got it!',
	'Amazing! 🌟',
	'Keep it up!',
	'Brilliant!',
	'Superstar! 🌟',
	'Nailed it!',
	'You rock! 🎸',
	'Perfect! ✨',
	'Great job!',
] as const;

/**
 * Gentle, non-punishing messages shown after wrong answers.
 *
 * PEDAGOGY NOTE (Krashen's Affective Filter): harsh feedback increases
 * anxiety and blocks learning. These messages redirect rather than criticise.
 */
const PENALTY_MESSAGES = [
	"Not quite, but you're getting closer!",
	'Almost! Keep going!',
	"Tricky one! You'll get it next time.",
	"Oops! But that's how we learn 😊",
	'Nearly there! Give it another go.',
	"Don't worry — practice makes perfect!",
] as const;

/**
 * Streak milestone messages keyed by milestone count.
 * These replace the normal encouragement message at milestone streaks.
 */
const STREAK_MESSAGES: Record<number, string> = {
	3: '🔥 On a roll!',
	5: '🔥🔥 ON FIRE!',
	10: '🔥🔥🔥 UNSTOPPABLE!',
};

/**
 * Returns a random encouragement message.
 * Used for non-milestone correct answers.
 */
export function getEncouragementMessage(): string {
	return ENCOURAGEMENT_MESSAGES[
		Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)
	];
}

/**
 * Returns a random, gentle penalty message.
 */
export function getPenaltyMessage(): string {
	return PENALTY_MESSAGES[Math.floor(Math.random() * PENALTY_MESSAGES.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a RewardEvent for display in the RewardModal.
 *
 * Determines the streak bonus and message automatically from the streak count.
 * The total sunDrops includes any streak bonus already.
 *
 * @param baseSunDrops - SunDrops earned from the activity itself (before bonus)
 * @param streak - Current consecutive correct count (AFTER incrementing)
 */
export function buildRewardEvent(baseSunDrops: number, streak: number): RewardEvent {
	const { bonus, isMilestone } = getStreakBonus(streak);
	const total = baseSunDrops + bonus;

	// Use streak-specific message at milestones, random encouragement otherwise
	const message = isMilestone
		? (STREAK_MESSAGES[streak] ?? getEncouragementMessage())
		: getEncouragementMessage();

	return {
		sunDrops: total,
		streakBonus: bonus,
		streakCount: streak,
		isStreakMilestone: isMilestone,
		message,
	};
}

/**
 * Builds a PenaltyEvent for display in the PenaltyModal.
 *
 * @param sunDropsLost - Number of SunDrops deducted (1 for wrong answer)
 */
export function buildPenaltyEvent(sunDropsLost: number): PenaltyEvent {
	return {
		sunDropsLost,
		message: getPenaltyMessage(),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS USED BY LESSON STORE
// ─────────────────────────────────────────────────────────────────────────────

/** Starting hearts for each lesson session */
export const STARTING_HEARTS = 3;

/** SunDrops deducted per wrong answer */
export const SUNDROP_PENALTY_PER_WRONG = 1;
