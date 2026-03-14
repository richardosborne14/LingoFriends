/**
 * POST /api/gifts/apply
 *
 * Applies a pending gift to a tree (or profile for seed gifts).
 * Gift must be in 'pending' or 'inventory' status and owned by the current user.
 *
 * Request body:
 *   { giftId: string, targetTreeId: string }
 *
 * Response:
 *   200: { ok: true, effect: string }
 *   400: Cannot apply (already used, wrong owner, etc.)
 *   401: Unauthorised
 *   404: Gift or tree not found
 *
 * @module routes/api/gifts/apply
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { gifts, userTrees, profiles } from '$lib/server/db/schema';
import { canApplyGift, calculateGiftEffect } from '$lib/server/social/giftService';
import type { GiftType } from '$lib/server/social/giftService';

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
	if (typeof b.targetTreeId !== 'string') error(400, 'targetTreeId is required');

	// Load gift and validate ownership
	const [gift] = await db
		.select()
		.from(gifts)
		.where(eq(gifts.id, b.giftId))
		.limit(1);

	if (!gift) {
		error(404, 'Gift not found');
	}

	const validation = canApplyGift(gift, userId);
	if (!validation.allowed) {
		error(400, validation.reason ?? 'Cannot apply gift');
	}

	// Load the target tree (must belong to this user)
	const [tree] = await db
		.select({
			id: userTrees.id,
			giftBufferDays: userTrees.giftBufferDays,
			decorations: userTrees.decorations,
		})
		.from(userTrees)
		.where(and(eq(userTrees.id, b.targetTreeId), eq(userTrees.userId, userId)))
		.limit(1);

	if (!tree) {
		error(404, 'Tree not found');
	}

	const giftType = gift.giftType as GiftType;
	const effect = calculateGiftEffect(
		{
			giftBufferDays: tree.giftBufferDays ?? 0,
			decorations: (tree.decorations ?? []) as { type: string; appliedAt: string }[],
		},
		giftType
	);

	const now = new Date();

	// Apply tree updates (only update fields that changed)
	if (Object.keys(effect.treeUpdates).length > 0) {
		await db
			.update(userTrees)
			.set({
				...effect.treeUpdates,
				updatedAt: now,
			})
			.where(eq(userTrees.id, b.targetTreeId));
	}

	// Apply profile updates (seed gifts add a seed to the owner's profile)
	if (effect.profileUpdates.seedsDelta) {
		await db
			.update(profiles)
			.set({
				seedsAvailable: sql`${profiles.seedsAvailable} + ${effect.profileUpdates.seedsDelta}`,
				updatedAt: now,
			})
			.where(eq(profiles.userId, userId));
	}

	// Mark gift as applied
	await db
		.update(gifts)
		.set({ status: 'applied', updatedAt: now })
		.where(eq(gifts.id, gift.id));

	// Return a friendly effect description
	const effectMessages: Record<string, string> = {
		water_drop: '💧 Tree gets 1 extra day of health!',
		sparkle: '✨ Tree gets 3 extra days of health!',
		seed: '🌱 You got a new seed to plant!',
		ribbon: '🎀 Ribbon decoration added to your tree!',
	};

	return json({
		ok: true,
		effect: effectMessages[giftType] ?? 'Gift applied!',
	});
};
