/**
 * App Layout Server Load — Auth Guard
 *
 * Protects all routes under (app)/ — garden, lesson, friends, profile.
 * Unauthenticated users are redirected to /login.
 * Authenticated but un-onboarded users are redirected to /onboarding —
 * previously they could land on an empty garden straight after registration
 * (the register flow's enhance/update cycle navigates here before the
 * friend-code screen can point them at onboarding).
 * Authenticated users get their profile data passed down.
 */
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Not logged in → redirect to login, preserving the intended destination
	if (!locals.user) {
		const returnTo = encodeURIComponent(url.pathname);
		redirect(302, `/login?returnTo=${returnTo}`);
	}

	// Logged in but never finished onboarding → send them there.
	// One indexed single-column read per navigation — acceptable cost for
	// guaranteeing no (app) page ever renders with a half-initialised profile.
	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, locals.user.id),
		columns: { onboardingComplete: true },
	});
	if (!profile?.onboardingComplete) {
		redirect(302, '/onboarding');
	}

	return {
		user: locals.user,
	};
};
