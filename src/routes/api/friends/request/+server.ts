/**
 * POST /api/friends/request
 *
 * Sends a friend request to a user identified by their friend code.
 *
 * Request body: { friendCode: string }
 *
 * Response:
 *   201: { friendshipId } (request created)
 *   400: Validation failed (self, duplicate, already friends, missing fields)
 *   401: Unauthorised
 *   404: Target user not found
 *
 * @module routes/api/friends/request
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, friendships } from '$lib/server/db/schema';
import { canSendRequest } from '$lib/server/social/friendsService';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	const userId = locals.user.id;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const b = body as Record<string, unknown>;
	const friendCode = typeof b.friendCode === 'string' ? b.friendCode.trim().toUpperCase() : null;

	if (!friendCode) {
		error(400, 'friendCode is required');
	}

	// Resolve the friend code to a user ID
	const [target] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.friendCode, friendCode))
		.limit(1);

	if (!target) {
		error(404, 'No user found with that friend code');
	}

	// Fetch existing friendships between these two users (either direction)
	const existingRows = await db
		.select()
		.from(friendships)
		.where(
			or(
				and(eq(friendships.userA, userId), eq(friendships.userB, target.id)),
				and(eq(friendships.userA, target.id), eq(friendships.userB, userId))
			)
		);

	// Validate using pure business logic
	const validation = canSendRequest(userId, target.id, existingRows);

	if (!validation.allowed) {
		const messages: Record<string, string> = {
			self: "You can't add yourself as a friend!",
			duplicate_pending: 'A friend request is already pending between you two.',
			already_friends: "You're already friends with this person!",
		};
		error(400, messages[validation.reason] ?? 'Cannot send friend request');
	}

	// Insert the friendship row
	const [inserted] = await db
		.insert(friendships)
		.values({
			userA: userId,
			userB: target.id,
			status: 'pending',
			initiatedBy: userId,
		})
		.returning({ id: friendships.id });

	return json({ friendshipId: inserted.id }, { status: 201 });
};
