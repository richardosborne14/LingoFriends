/**
 * /lesson index redirect.
 *
 * WHY: The nav bar links to /lesson but the actual lesson page lives at
 * /lesson/[id]. When no ID is given, redirect to /lesson/new — the lesson
 * page treats "new" as a sentinel to generate a fresh lesson from the user's
 * profile on the client side.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	// "new" is the conventional sentinel ID — the lesson page handles it
	redirect(302, '/lesson/new');
};
