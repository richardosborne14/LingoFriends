/**
 * GET /api/friends/search?code=LF-A3K7M2
 *
 * Searches for a user by their friend code.
 * Returns ONLY safe display data — no email, age, or personal info.
 *
 * Response:
 *   200: SafeFriendProfile (found)
 *   400: Missing ?code param
 *   404: No user with that code
 *   401: Unauthorised
 *
 * Child safety: This endpoint is the entry point for strangers finding each
 * other. It exposes ONLY displayName + avatar. Friend codes are short enough
 * to be memorable but not guessable (8 chars alphanumeric, uppercase).
 *
 * @module routes/api/friends/search
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, profiles } from '$lib/server/db/schema';
import { sanitizeFriendProfile } from '$lib/server/social/friendsService';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	const code = url.searchParams.get('code')?.trim().toUpperCase();
	if (!code) {
		error(400, 'Friend code is required');
	}

	// Look up user by friend code (codes are stored uppercase in DB)
	const [found] = await db
		.select({ user: users, profile: profiles })
		.from(users)
		.leftJoin(profiles, eq(profiles.userId, users.id))
		.where(eq(users.friendCode, code))
		.limit(1);

	if (!found || !found.profile) {
		error(404, 'No user found with that friend code');
	}

	// Return only safe fields — sanitizeFriendProfile strips personal data
	return json(sanitizeFriendProfile(found.user.id, found.user, found.profile));
};
