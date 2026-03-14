/**
 * GET /api/friends/requests
 *
 * Returns pending friend requests sent TO the current user
 * (not requests they sent out themselves).
 *
 * Response: Array of { friendshipId, from: SafeFriendProfile }
 *   200: Array (empty if no pending requests)
 *   401: Unauthorised
 *
 * @module routes/api/friends/requests
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and, or, ne, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, profiles, friendships } from '$lib/server/db/schema';
import { sanitizeFriendProfile } from '$lib/server/social/friendsService';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	const userId = locals.user.id;

	// Pending requests where:
	//   - The current user is one of the parties (A or B)
	//   - Status is 'pending'
	//   - The current user did NOT initiate (someone sent it TO them)
	const rows = await db
		.select()
		.from(friendships)
		.where(
			and(
				or(eq(friendships.userA, userId), eq(friendships.userB, userId)),
				eq(friendships.status, 'pending'),
				ne(friendships.initiatedBy, userId)
			)
		);

	if (rows.length === 0) {
		return json([]);
	}

	// The sender is whoever initiated the request
	const senderIds = rows.map((row) => row.initiatedBy);

	const senderData = await db
		.select({ user: users, profile: profiles })
		.from(users)
		.leftJoin(profiles, eq(profiles.userId, users.id))
		.where(inArray(users.id, senderIds));

	// Map friendship rows to { friendshipId, from: SafeFriendProfile }
	const result = rows
		.map((row) => {
			const sender = senderData.find((s) => s.user.id === row.initiatedBy);
			if (!sender?.profile) return null;

			return {
				friendshipId: row.id,
				from: sanitizeFriendProfile(sender.user.id, sender.user, sender.profile),
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);

	return json(result);
};
