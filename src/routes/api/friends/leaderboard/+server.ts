/**
 * GET /api/friends/leaderboard?period=week|alltime
 *
 * Returns the leaderboard for the current user's friend group (friends + self).
 * Sorted descending by SunDrops for the selected period.
 *
 * Query params:
 *   period — 'week' (default) or 'alltime'
 *
 * Response: RankedEntry[]
 *   200: Ranked array (empty if no friends yet — shows only self)
 *   401: Unauthorised
 *
 * @module routes/api/friends/leaderboard
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and, or, inArray, gte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, profiles, friendships, dailyProgress } from '$lib/server/db/schema';
import {
	rankEntries,
	buildLeaderboardEntry,
	getWeekStart,
	formatDateForDB,
	type LeaderboardPeriod,
} from '$lib/server/social/leaderboardService';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	const userId = locals.user.id;
	const periodParam = url.searchParams.get('period') ?? 'week';
	const period: LeaderboardPeriod = periodParam === 'alltime' ? 'alltime' : 'week';

	// Get accepted friend IDs (same logic as /api/friends)
	const friendshipRows = await db
		.select()
		.from(friendships)
		.where(
			and(
				or(eq(friendships.userA, userId), eq(friendships.userB, userId)),
				eq(friendships.status, 'accepted')
			)
		);

	const friendIds = friendshipRows.map((row) =>
		row.userA === userId ? row.userB : row.userA
	);

	// Include self — you always see your own position
	const allIds = [userId, ...friendIds];

	// Fetch user + profile data for all participants
	const participantData = await db
		.select({ user: users, profile: profiles })
		.from(users)
		.leftJoin(profiles, eq(profiles.userId, users.id))
		.where(inArray(users.id, allIds));

	// For weekly period: sum daily_progress since last Monday
	const weeklyDropMap = new Map<string, number>();

	if (period === 'week') {
		const weekStartStr = formatDateForDB(getWeekStart());

		const weeklyRows = await db
			.select({
				userId: dailyProgress.userId,
				total: sql<number>`COALESCE(SUM(${dailyProgress.sunDropsEarned}), 0)`.as('total'),
			})
			.from(dailyProgress)
			.where(
				and(
					inArray(dailyProgress.userId, allIds),
					gte(dailyProgress.date, weekStartStr)
				)
			)
			.groupBy(dailyProgress.userId);

		for (const row of weeklyRows) {
			weeklyDropMap.set(row.userId, Number(row.total));
		}
	}

	// Build leaderboard entries (null-safe)
	const entries = participantData
		.filter((row) => row.profile !== null)
		.map((row) =>
			buildLeaderboardEntry(
				row.user.id,
				row.user.displayName,
				row.profile!,
				weeklyDropMap.get(row.user.id) ?? 0,
				period,
				userId
			)
		);

	return json(rankEntries(entries));
};
