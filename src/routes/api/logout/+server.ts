/**
 * Task 1.3 — Logout Endpoint
 *
 * POST /api/logout
 *
 * Invalidates the Lucia session and clears the cookie.
 * Must be called via a POST form (not a plain link) to prevent
 * CSRF-style logout attacks from third-party pages.
 *
 * The profile page and app layout both have a logout form
 * that POSTs to this endpoint.
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lucia } from '$lib/server/auth/lucia';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.session) {
		// Invalidate the session in the database so the token can't be reused
		await lucia.invalidateSession(locals.session.id);
	}

	// Replace the session cookie with a blank/expired one
	const blankCookie = lucia.createBlankSessionCookie();
	cookies.set(blankCookie.name, blankCookie.value, {
		path: '/',
		...blankCookie.attributes,
	});

	// Send them back to login — no returnTo, fresh start
	redirect(302, '/login');
};
