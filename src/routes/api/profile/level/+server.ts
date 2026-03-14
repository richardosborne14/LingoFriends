/**
 * PATCH /api/profile/level
 *
 * Updates the user's proficiency level after they accept a level change
 * recommendation from the LevelBumpModal on the CompletionScreen.
 *
 * This is a one-field update — deliberately narrow to prevent clients from
 * modifying arbitrary profile fields via this endpoint.
 *
 * Request body:
 *   { level: string }  — must be a known UserLevel value
 *
 * Response:
 *   200: { level: string }  — confirms the new level
 *   400: { error }
 *   401: Unauthorised
 *
 * @module routes/api/profile/level
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { isValidLevel } from '$lib/services/levelAssessment';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const b = body as Record<string, unknown>;

	// Validate the level value before accepting it
	if (typeof b.level !== 'string' || !isValidLevel(b.level)) {
		error(400, 'level must be one of: total_beginner, know_some_words, simple_sentences, can_have_conversations');
	}

	const newLevel = b.level;

	// Update the profile — single field update is safe and intentionally narrow
	await db
		.update(profiles)
		.set({
			level: newLevel,
			updatedAt: new Date(),
		})
		.where(eq(profiles.userId, locals.user.id));

	return json({ level: newLevel });
};
