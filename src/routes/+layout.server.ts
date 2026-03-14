/**
 * Root Layout Server Load — passes user to all pages via $page.data.
 * Every child layout/page can access `data.user` without extra fetching.
 */
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
	};
};
