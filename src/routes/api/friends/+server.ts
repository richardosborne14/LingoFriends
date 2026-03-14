/**
 * GET /api/friends
 *
 * Returns the current user's accepted friends list with safe profile data.
 *
 * Response: SafeFriendProfile[]
 *   200: Array (empty if no friends)
 *   401: Unauthorised
 *
 * Privacy: Only safe fields are returned (sanitizeFriendProfile is mandatory).
 * No email, age, last activity, or any personally identifiable information.
 *
 * @module routes/api/friends
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and, or, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, profiles, friendships } from '$lib/server/db/schema';
import { sanitizeFriendProfile } from '$lib/server/social/friendsService';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	const userId = locals.user.id;

	// Fetch all accepted friendships involving this user (either direction)
	const rows = await db
		.select()
		.from(friendships)
		.where(
			and(
				or(eq(friendships.userA, userId), eq(friendships.userB, userId)),
				eq(friendships.status, 'accepted')
			)
		);

	if (rows.length === 0) {
		return json([]);
	}

	// Extract the OTHER user's ID from each friendship row
	const friendIds = rows.map((row) => (row.userA === userId ? row.userB : row.userA));

	// Fetch user + profile data for all friends in a single query
	const friendData = await db
		.select({ user: users, profile: profiles })
		.from(users)
		.leftJoin(profiles, eq(profiles.userId, users.id))
		.where(inArray(users.id, friendIds));

	// Sanitize and return — never expose raw DB data to the client
	const result = friendData
		.filter((row) => row.profile !== null)
		.map((row) => sanitizeFriendProfile(row.user.id, row.user, row.profile!));

	return json(result);
};
