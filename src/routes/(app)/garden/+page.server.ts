/**
 * Garden Page — Server Load
 *
 * Fetches:
 *   - User's profile (avatar options + stats)
 *   - All user trees (with health calculated, skill path data, lesson steps)
 *
 * Redirects to /onboarding if profile is missing.
 * Auth guard is in (app)/+layout.server.ts — user is guaranteed here.
 *
 * @module routes/(app)/garden/+page.server
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGardenProfile, getUserTrees } from '$lib/server/garden/gardenService';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Load profile and trees in parallel — both are independent queries
	const [profileData, trees] = await Promise.all([
		getGardenProfile(userId),
		getUserTrees(userId),
	]);

	if (!profileData) {
		// Profile missing — send back to onboarding
		redirect(302, '/onboarding');
	}

	return {
		trees,
		avatar: profileData.avatar,
		stats: profileData.stats,
	};
};
