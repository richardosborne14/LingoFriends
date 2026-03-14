/**
 * GET /api/gifts
 *
 * Returns the current user's gift inventory (earned, not yet sent).
 * Inventory gifts have status='inventory' and toUserId=fromUserId.
 *
 * Response: Gift[]
 *   200: Array (empty if no gifts in inventory)
 *   401: Unauthorised
 *
 * @module routes/api/gifts
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { gifts } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	const userId = locals.user.id;

	// Inventory = gifts the user earned and hasn't sent yet
	const inventory = await db
		.select()
		.from(gifts)
		.where(
			and(
				eq(gifts.toUserId, userId),
				eq(gifts.fromUserId, userId),
				eq(gifts.status, 'inventory')
			)
		);

	return json(inventory);
};
