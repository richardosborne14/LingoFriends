/**
 * POST /api/gifts/send
 *
 * Sends a gift from the current user's inventory to a friend.
 * The gift must exist in the user's inventory (status='inventory', toUserId=self).
 *
 * Request body:
 *   { giftId: string, targetUserId: string, targetTreeId?: string }
 *
 * Response:
 *   200: { ok: true }
 *   400: Gift not in inventory / not friends
 *   401: Unauthorised
 *   404: Gift not found
 *
 * @module routes/api/gifts/send
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { gifts, friendships } from '$lib/server/db/schema';
import { isFriends } from '$lib/server/social/friendsService';

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
	if (typeof b.giftId !== 'string') error(400, 'giftId is required');
	if (typeof b.targetUserId !== 'string') error(400, 'targetUserId is required');

	const targetUserId = b.targetUserId as string;
	const targetTreeId = typeof b.targetTreeId === 'string' ? b.targetTreeId : null;

	// Load the gift and verify it's in the user's inventory
	const [gift] = await db
		.select()
		.from(gifts)
		.where(eq(gifts.id, b.giftId))
		.limit(1);

	if (!gift) {
		error(404, 'Gift not found');
	}

	if (gift.fromUserId !== userId || gift.toUserId !== userId || gift.status !== 'inventory') {
		error(400, "This gift is not in your inventory");
	}

	// Verify the sender is friends with the target
	const friendshipRows = await db
		.select()
		.from(friendships)
		.where(
			or(
				and(eq(friendships.userA, userId), eq(friendships.userB, targetUserId)),
				and(eq(friendships.userA, targetUserId), eq(friendships.userB, userId))
			)
		);

	if (!isFriends(userId, targetUserId, friendshipRows)) {
		error(400, "You can only send gifts to friends");
	}

	// Transfer: update toUserId to target, set status to 'pending'
	await db
		.update(gifts)
		.set({
			toUserId: targetUserId,
			targetTreeId,
			status: 'pending',
			updatedAt: new Date(),
		})
		.where(eq(gifts.id, gift.id));

	return json({ ok: true });
};
