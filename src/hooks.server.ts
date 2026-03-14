/**
 * SvelteKit Server Hooks
 *
 * Runs on every request before the route handler.
 * Validates the session cookie and attaches user/session to event.locals.
 *
 * Full Lucia auth wired in Task 0.4 — this stub ensures the app
 * won't crash in the meantime (locals default to null).
 */

import type { Handle } from '@sveltejs/kit';

// TODO (Task 0.4): Replace with full Lucia session validation
// import { lucia } from '$lib/server/auth/lucia';

export const handle: Handle = async ({ event, resolve }) => {
	// Stub: set auth locals to null until Lucia is wired up in Task 0.4
	// When Task 0.4 is complete, replace this entire block with the
	// lucia.validateSession() pattern shown in task-0.4-auth-setup.md
	event.locals.user = null;
	event.locals.session = null;

	return resolve(event);
};
