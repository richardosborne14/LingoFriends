// @ts-nocheck
/**
 * Root Layout Server Load — passes user to all pages via $page.data.
 * Every child layout/page can access `data.user` without extra fetching.
 */
import type { LayoutServerLoad } from './$types';

export const load = async ({ locals }: Parameters<LayoutServerLoad>[0]) => {
	return {
		user: locals.user,
	};
};
