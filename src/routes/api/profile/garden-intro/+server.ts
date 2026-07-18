/**
 * POST /api/profile/garden-intro
 *
 * Marks the one-time garden arrival tutorial as seen (TASK-FUN-03).
 * Idempotent — the tutorial fires from `hasSeenGardenIntro === false`, so
 * setting it true twice is harmless. No body, no response payload.
 *
 * @module routes/api/profile/garden-intro
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	await db
		.update(profiles)
		.set({ hasSeenGardenIntro: true, updatedAt: new Date() })
		.where(eq(profiles.userId, locals.user.id));

	return json({ ok: true });
};
