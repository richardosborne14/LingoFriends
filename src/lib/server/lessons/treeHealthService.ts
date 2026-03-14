/**
 * LingoFriends V2 — Tree Health Service
 *
 * Calculates tree health based on spaced repetition schedules.
 * Tree health is the GAME MANIFESTATION of SRS — trees decay when
 * the learner hasn't reviewed the corresponding skill path on time.
 *
 * Health is calculated on-the-fly at garden page load (not stored),
 * so it always reflects the true elapsed time since last review.
 * The DB value is only updated on lesson completion (reset to 100).
 *
 * WHY on-the-fly: Avoids stale DB values (would need a background job
 * to update health continuously). Simple and accurate.
 *
 * Decay schedule (from task-4.6-tree-health-decay.md):
 *   0-2 days since last lesson:  100%
 *   3-5 days:                    85%
 *   6-10 days:                   60%
 *   11-14 days:                  35%
 *   15-21 days:                  15%
 *   22+ days:                    5% (minimum — trees NEVER die)
 *
 * Gift buffer: Friends can send water drops (+1 day), sparkles (+3 days).
 * The buffer effectively delays the decay by shifting the "last refresh date"
 * forward by N days before the decay calculation.
 *
 * @module server/lessons/treeHealthService
 */

import type { UserTree } from '$lib/server/db/schema';
import type { TreeHealthState } from '$lib/types/garden';

// ─────────────────────────────────────────────────────────────────────────────
// DECAY SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decay breakpoints: [daysElapsed, healthPercent].
 * Sorted ascending by days elapsed — first match wins.
 *
 * Trees never go below 5% (minimum) — this is an intentional game design
 * decision to keep kids engaged without feeling like they've "lost" their tree.
 */
const DECAY_BREAKPOINTS: [number, number][] = [
	[0, 100],
	[3, 85],
	[6, 60],
	[11, 35],
	[15, 15],
	[22, 5],
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the current health for a tree based on time elapsed since
 * the last lesson and any gift buffer days.
 *
 * @param lastRefreshDate - When the last lesson was completed for this tree
 * @param giftBufferDays - Extra days of protection from friend gifts
 * @param now - Current date (injectable for testing)
 * @returns Health percentage 5-100
 */
export function calculateTreeHealth(
	lastRefreshDate: Date,
	giftBufferDays: number = 0,
	now: Date = new Date()
): number {
	// Shift the "last refresh" forward by the gift buffer
	// This effectively pretends the learner reviewed N days later
	const effectiveRefresh = new Date(lastRefreshDate);
	effectiveRefresh.setDate(effectiveRefresh.getDate() + giftBufferDays);

	// Calculate days elapsed since effective refresh
	const msPerDay = 1000 * 60 * 60 * 24;
	const daysElapsed = Math.max(
		0,
		Math.floor((now.getTime() - effectiveRefresh.getTime()) / msPerDay)
	);

	return healthFromDays(daysElapsed);
}

/**
 * Maps elapsed days to health percentage using the decay schedule.
 *
 * @param daysElapsed - Days since last lesson (after gift buffer applied)
 * @returns Health percentage 5-100
 */
export function healthFromDays(daysElapsed: number): number {
	// Walk decay breakpoints from highest days to lowest to find the bracket
	// E.g. 8 days elapsed → we passed [6, 60] but not [11, 35] → 60%
	let health = 5; // minimum — always find at least this
	for (const [days, percent] of DECAY_BREAKPOINTS) {
		if (daysElapsed >= days) {
			health = percent;
		}
	}
	// DECAY_BREAKPOINTS is sorted ascending, so the last match is the
	// deepest bracket we fell into — which gives us the right health value.
	// Walk from end to find the correct bucket:
	for (let i = DECAY_BREAKPOINTS.length - 1; i >= 0; i--) {
		const [days, percent] = DECAY_BREAKPOINTS[i];
		if (daysElapsed >= days) {
			return percent;
		}
	}
	return 100; // fallback (shouldn't reach here for daysElapsed >= 0)
}

/**
 * Calculates tree health from a UserTree DB row.
 * Convenience wrapper around calculateTreeHealth.
 *
 * @param tree - Full UserTree record from DB
 * @param now - Injectable current date for testing
 * @returns Health percentage 5-100
 */
export function calculateTreeHealthFromRow(tree: UserTree, now: Date = new Date()): number {
	if (!tree.lastRefreshDate) {
		// Tree has never been refreshed — treat as very old
		return 5;
	}
	return calculateTreeHealth(tree.lastRefreshDate, tree.giftBufferDays ?? 0, now);
}

/**
 * Maps a health percentage to a visual state tier.
 * Used to select colours, geometry variants, and UI indicators.
 *
 * Tier boundaries designed for visual clarity — kids need to
 * read the tree's state at a glance without counting percentages.
 *
 * @param health - Health percentage 0-100
 * @returns One of 5 visual state strings
 */
export function getHealthVisualState(health: number): TreeHealthState {
	if (health >= 90) return 'full';
	if (health >= 70) return 'good';
	if (health >= 30) return 'fair';
	if (health >= 10) return 'poor';
	return 'critical';
}

/**
 * Calculates the health value to restore when a lesson is completed.
 * Always 100 — completing a lesson fully refreshes the tree.
 *
 * This is intentional: partial completion would create anxiety about
 * "did I do enough?" We want lessons to feel completely rewarding.
 */
export function calculateHealthAfterLesson(): number {
	return 100;
}

/**
 * Returns the effective "last refresh date" after applying gift buffer days.
 * Used to display the real grace period deadline in the TreePanel.
 *
 * @param lastRefreshDate - Raw last refresh from DB
 * @param giftBufferDays - Buffer days applied by friend gifts
 * @returns Effective refresh date (shifted forward by buffer days)
 */
export function applyGiftBuffer(lastRefreshDate: Date, giftBufferDays: number): Date {
	const effective = new Date(lastRefreshDate);
	effective.setDate(effective.getDate() + giftBufferDays);
	return effective;
}

/**
 * Returns the health bar colour class (Tailwind) for a given health level.
 * Used in TreePanel health bar and garden tooltips.
 *
 * @param health - Health percentage 0-100
 * @returns Tailwind bg colour class
 */
export function getHealthBarColor(health: number): string {
	if (health >= 70) return 'bg-forest-400';
	if (health >= 30) return 'bg-sundrop-500';
	return 'bg-red-500';
}
