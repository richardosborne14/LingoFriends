/**
 * POST /api/friends/accept
 *
 * Accepts a pending friend request.
 *
 * Request body: { friendshipId: string }
 *
 * Response:
 *   200: { ok: true }
 *   400: Not a pending request / current user is not the recipient
 *   401: Unauthorised
 *   404: Friendship not found
 *
 * @module routes/api/friends/accept
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { friendships } from '$lib/server/db/schema';

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
	if (typeof b.friendshipId !== 'string') error(400, 'friendshipId is required');

	// Load the friendship row
	const [row] = await db
		.select()
		.from(friendships)
		.where(eq(friendships.id, b.friendshipId))
		.limit(1);

	if (!row) {
		error(404, 'Friend request not found');
	}

	// Verify current user is one of the parties
	if (row.userA !== userId && row.userB !== userId) {
		error(400, 'You are not part of this friend request');
	}

	// Only the RECIPIENT can accept (not the one who initiated)
	if (row.initiatedBy === userId) {
		error(400, 'You cannot accept your own friend request');
	}

	if (row.status !== 'pending') {
		error(400, 'This request is no longer pending');
	}

	await db
		.update(friendships)
		.set({ status: 'accepted', updatedAt: new Date() })
		.where(eq(friendships.id, row.id));

	return json({ ok: true });
};
