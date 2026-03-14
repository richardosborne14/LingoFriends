/**
 * /friends page server load function.
 *
 * Loads in parallel:
 *   1. Accepted friends list (with safe profiles)
 *   2. Pending incoming requests
 *   3. Weekly leaderboard (default period)
 *   4. Current user's friend code (for sharing)
 *
 * The user's own friend code is displayed so they can share it with others.
 *
 * @module routes/(app)/friends/+page.server
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { eq, and, or, inArray, gte, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, profiles, friendships, dailyProgress } from '$lib/server/db/schema';
import { sanitizeFriendProfile } from '$lib/server/social/friendsService';
import {
	rankEntries,
	buildLeaderboardEntry,
	getWeekStart,
	formatDateForDB,
} from '$lib/server/social/leaderboardService';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const userId = locals.user.id;

	// All accepted friendships for this user
	const acceptedRows = await db
		.select()
		.from(friendships)
		.where(
			and(
				or(eq(friendships.userA, userId), eq(friendships.userB, userId)),
				eq(friendships.status, 'accepted')
			)
		);

	const friendIdMap = new Map(
		acceptedRows.map((row) => [
			row.userA === userId ? row.userB : row.userA,
			row.id, // friendship row ID (for remove button)
		])
	);
	const friendIds = [...friendIdMap.keys()];

	// Pending requests sent TO this user
	const pendingRows = await db
		.select()
		.from(friendships)
		.where(
			and(
				or(eq(friendships.userA, userId), eq(friendships.userB, userId)),
				eq(friendships.status, 'pending'),
				ne(friendships.initiatedBy, userId)
			)
		);

	// Fetch user+profile data for friends + pending request senders
	const senderIds = pendingRows.map((r) => r.initiatedBy);
	const allQueryIds = [...new Set([...friendIds, ...senderIds])];

	const userData =
		allQueryIds.length > 0
			? await db
					.select({ user: users, profile: profiles })
					.from(users)
					.leftJoin(profiles, eq(profiles.userId, users.id))
					.where(inArray(users.id, allQueryIds))
			: [];

	// Build safe friend list (include friendshipId for remove button)
	const friends = friendIds
		.map((fid) => {
			const found = userData.find((u) => u.user.id === fid);
			if (!found?.profile) return null;
			return {
				friendshipId: friendIdMap.get(fid)!,
				profile: sanitizeFriendProfile(found.user.id, found.user, found.profile),
			};
		})
		.filter((f): f is NonNullable<typeof f> => f !== null);

	// Build pending requests list
	const pendingRequests = pendingRows
		.map((row) => {
			const sender = userData.find((u) => u.user.id === row.initiatedBy);
			if (!sender?.profile) return null;
			return {
				friendshipId: row.id,
				from: sanitizeFriendProfile(sender.user.id, sender.user, sender.profile),
			};
		})
		.filter((r): r is NonNullable<typeof r> => r !== null);

	// Weekly leaderboard (self + friends)
	const allLeaderboardIds = [userId, ...friendIds];

	const [selfUser] = await db
		.select({ user: users, profile: profiles })
		.from(users)
		.leftJoin(profiles, eq(profiles.userId, users.id))
		.where(eq(users.id, userId))
		.limit(1);

	const allParticipants = selfUser
		? [{ user: selfUser.user, profile: selfUser.profile }, ...userData.filter((u) => friendIds.includes(u.user.id))]
		: userData.filter((u) => friendIds.includes(u.user.id));

	const weekStartStr = formatDateForDB(getWeekStart());
	const weeklyRows =
		allLeaderboardIds.length > 0
			? await db
					.select({
						userId: dailyProgress.userId,
						total: sql<number>`COALESCE(SUM(${dailyProgress.sunDropsEarned}), 0)`.as('total'),
					})
					.from(dailyProgress)
					.where(
						and(
							inArray(dailyProgress.userId, allLeaderboardIds),
							gte(dailyProgress.date, weekStartStr)
						)
					)
					.groupBy(dailyProgress.userId)
			: [];

	const weeklyMap = new Map(weeklyRows.map((r) => [r.userId, Number(r.total)]));

	const leaderboardEntries = allParticipants
		.filter((p) => p.profile !== null)
		.map((p) =>
			buildLeaderboardEntry(
				p.user.id,
				p.user.displayName,
				p.profile!,
				weeklyMap.get(p.user.id) ?? 0,
				'week',
				userId
			)
		);

	return {
		friends,
		pendingRequests,
		weeklyLeaderboard: rankEntries(leaderboardEntries),
		myFriendCode: locals.user.friendCode ?? '',
	};
};
