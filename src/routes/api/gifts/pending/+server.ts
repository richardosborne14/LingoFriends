/**
 * GET /api/gifts/pending
 *
 * Returns gifts that friends have sent to the current user (pending, unread).
 * These are gifts the user can apply to their trees.
 *
 * Response: Array of { gift, fromDisplayName }
 *   200: Array (empty if no pending gifts)
 *   401: Unauthorised
 *
 * @module routes/api/gifts/pending
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { gifts, users } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	const userId = locals.user.id;

	// Pending gifts sent by friends (fromUserId !== toUserId means it was sent, not earned)
	const pendingGifts = await db
		.select()
		.from(gifts)
		.where(
			and(
				eq(gifts.toUserId, userId),
				eq(gifts.status, 'pending'),
				ne(gifts.fromUserId, userId) // Exclude own gifts (inventory items)
			)
		);

	if (pendingGifts.length === 0) {
		return json([]);
	}

	// Get sender display names for notifications
	const senderIds = [...new Set(pendingGifts.map((g) => g.fromUserId))];
	const senders = await db
		.select({ id: users.id, displayName: users.displayName })
		.from(users)
		.where(inArray(users.id, senderIds));

	const senderMap = new Map(senders.map((s) => [s.id, s.displayName]));

	const result = pendingGifts.map((gift) => ({
		gift,
		fromDisplayName: senderMap.get(gift.fromUserId) ?? 'A friend',
	}));

	return json(result);
};
