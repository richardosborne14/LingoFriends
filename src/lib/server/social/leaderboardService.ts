/**
 * Leaderboard Service — Pure functions for ranking and weekly boundary logic.
 *
 * All functions are pure (no DB calls) — DB queries happen in the API routes.
 *
 * Ranking rules:
 *   - Sorted descending by sunDrops
 *   - Current user is always shown regardless of position
 *   - Ties preserve insertion order (stable sort via spread+sort)
 *
 * Period logic:
 *   - 'week'    → sum daily_progress.sunDropsEarned since last Monday 00:00 UTC
 *   - 'alltime' → read profiles.totalSunDrops directly (denormalised column)
 *
 * @module server/social/leaderboardService
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A single entry on the leaderboard before ranking is applied */
export interface LeaderboardEntry {
	userId: string;
	displayName: string;
	sunDrops: number;
	streak: number;
	/** Whether this entry represents the currently logged-in user */
	isSelf: boolean;
	avatarOptions: {
		skinTone: string;
		hairColor: string;
		shirtColor: string;
		hat: string;
		gender: string;
	};
}

/** Entry with rank number attached (output of rankEntries()) */
export interface RankedEntry extends LeaderboardEntry {
	rank: number;
}

/** Valid period values for the leaderboard toggle */
export type LeaderboardPeriod = 'week' | 'alltime';

// ─────────────────────────────────────────────────────────────────────────────
// RANKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sorts leaderboard entries by sunDrops (descending) and attaches rank numbers.
 *
 * Uses a stable sort (spread + sort) so ties preserve their original order.
 * Rank starts at 1.
 */
export function rankEntries(entries: LeaderboardEntry[]): RankedEntry[] {
	// Spread to avoid mutating the input array
	const sorted = [...entries].sort((a, b) => b.sunDrops - a.sunDrops);
	return sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEK BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the start of the current ISO week (Monday 00:00:00.000 UTC).
 * Used to filter daily_progress rows for the "this week" leaderboard.
 *
 * ISO weeks start on Monday (day 1). Sunday is treated as day 0 and
 * maps to 6 days back (previous Monday).
 */
export function getWeekStart(): Date {
	const now = new Date();
	const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

	// Days to subtract to reach the most recent Monday
	const daysBack = day === 0 ? 6 : day - 1;

	const monday = new Date(now);
	monday.setUTCDate(now.getUTCDate() - daysBack);
	monday.setUTCHours(0, 0, 0, 0);
	return monday;
}

/**
 * Formats a Date as a 'YYYY-MM-DD' string suitable for Postgres date comparisons.
 * The daily_progress.date column is a Postgres `date` type stored as string.
 */
export function formatDateForDB(date: Date): string {
	return date.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a LeaderboardEntry for a single user from their DB rows.
 * Handles null/undefined defaults from optional DB columns.
 *
 * @param userId         The user's UUID
 * @param displayName    User's display name
 * @param profile        User's profile row (avatar + stats)
 * @param weeklySunDrops Sum of sunDropsEarned from daily_progress this week
 * @param period         Which metric to rank by
 * @param currentUserId  The logged-in user's ID (to mark isSelf)
 */
export function buildLeaderboardEntry(
	userId: string,
	displayName: string,
	profile: {
		totalSunDrops: number | null;
		currentStreak: number | null;
		avatarSkinTone: string | null;
		avatarHairColor: string | null;
		avatarShirtColor: string | null;
		avatarHat: string | null;
		avatarGender: string | null;
	},
	weeklySunDrops: number,
	period: LeaderboardPeriod,
	currentUserId: string
): LeaderboardEntry {
	return {
		userId,
		displayName,
		// Use weekly earned drops for 'week', total profile drops for 'alltime'
		sunDrops: period === 'week' ? weeklySunDrops : (profile.totalSunDrops ?? 0),
		streak: profile.currentStreak ?? 0,
		isSelf: userId === currentUserId,
		avatarOptions: {
			skinTone: profile.avatarSkinTone ?? '#F5D0A9',
			hairColor: profile.avatarHairColor ?? '#4A3728',
			shirtColor: profile.avatarShirtColor ?? '#FF8A6A',
			hat: profile.avatarHat ?? 'none',
			gender: profile.avatarGender ?? 'neutral',
		},
	};
}
