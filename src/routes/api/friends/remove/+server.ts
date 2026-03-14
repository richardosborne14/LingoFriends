/**
 * POST /api/friends/remove
 *
 * Removes an accepted friendship (unfriend).
 *
 * Request body: { friendshipId: string }
 *
 * Response:
 *   200: { ok: true }
 *   400: Not an accepted friendship / not a party to it
 *   401: Unauthorised
 *   404: Friendship not found
 *
 * @module routes/api/friends/remove
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
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

	const [row] = await db
		.select()
		.from(friendships)
		.where(eq(friendships.id, b.friendshipId))
		.limit(1);

	if (!row) {
		error(404, 'Friendship not found');
	}

	// Verify caller is one of the parties
	if (row.userA !== userId && row.userB !== userId) {
		error(400, 'You are not part of this friendship');
	}

	// Delete the row — cascades handled by DB foreign keys
	await db.delete(friendships).where(eq(friendships.id, row.id));

	return json({ ok: true });
};
