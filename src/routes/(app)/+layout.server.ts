/**
 * App Layout Server Load — Auth Guard
 *
 * Protects all routes under (app)/ — garden, lesson, friends, profile.
 * Unauthenticated users are redirected to /login.
 * Authenticated users get their profile data passed down.
 */
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Not logged in → redirect to login, preserving the intended destination
	if (!locals.user) {
		const returnTo = encodeURIComponent(url.pathname);
		redirect(302, `/login?returnTo=${returnTo}`);
	}

	return {
		user: locals.user,
	};
};
