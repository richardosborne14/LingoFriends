/**
 * Root Index Page Server Load
 * Redirects authenticated users to /garden, unauthenticated to /login.
 * The root page itself never renders — it's always a redirect.
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		// Logged in — send to the garden (main app hub)
		redirect(302, '/garden');
	} else {
		// Not logged in — send to login
		redirect(302, '/login');
	}
};
