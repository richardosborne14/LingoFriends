/**
 * SvelteKit Server Hooks — Session Validation
 *
 * Runs on every request. Validates the session cookie and
 * attaches user + session to `locals` for use in load functions and endpoints.
 *
 * If the session is valid: locals.user and locals.session are populated.
 * If the session is invalid/missing: locals.user = null, locals.session = null.
 *
 * Auth guard (redirect to /login) is handled in (app)/+layout.server.ts,
 * not here — keeping concerns separated.
 */

import type { Handle } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth/lucia';

export const handle: Handle = async ({ event, resolve }) => {
	// Read the session cookie from the request
	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		// No cookie — user is not logged in
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	// Validate the session with Lucia (checks expiry, rotates if needed)
	const { session, user } = await lucia.validateSession(sessionId);

	if (session && session.fresh) {
		// Session was rotated (approaching expiry) — set a fresh cookie
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes,
		});
	}

	if (!session) {
		// Session expired or invalid — clear the cookie
		const blankCookie = lucia.createBlankSessionCookie();
		event.cookies.set(blankCookie.name, blankCookie.value, {
			path: '/',
			...blankCookie.attributes,
		});
	}

	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};
