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
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Load profile and trees in parallel — both are independent queries
	const [profileData, trees, [introRow]] = await Promise.all([
		getGardenProfile(userId),
		getUserTrees(userId),
		// TASK-FUN-03: arrival tutorial flag — separate tiny query rather than
		// widening getGardenProfile's contract (it feeds other pages too)
		db
			.select({ hasSeenGardenIntro: profiles.hasSeenGardenIntro })
			.from(profiles)
			.where(eq(profiles.userId, userId))
			.limit(1),
	]);

	if (!profileData) {
		// Profile missing — send back to onboarding
		redirect(302, '/onboarding');
	}

	return {
		trees,
		avatar: profileData.avatar,
		stats: profileData.stats,
		// Tutorial runs when the flag is unset; the page POSTs it true after
		hasSeenGardenIntro: introRow?.hasSeenGardenIntro ?? true,
		// Seeds deterministic per-user world flavour (critter roster).
		// The raw userId stays server-side out of principle — the world only
		// needs SOME stable per-user string, so it gets an opaque one.
		plotSeed: `plot-${userId}`,
	};
};
