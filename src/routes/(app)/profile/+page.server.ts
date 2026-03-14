/**
 * Task 1.5 — Profile Page Server
 *
 * Load: fetch the user's profile + stats for display.
 * Actions:
 *   updateName   — change display name
 *   updateInterests — replace interest list
 */

import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users, profiles } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	// Auth guard is handled by (app)/+layout.server.ts — user is guaranteed here
	const userId = locals.user!.id;

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, userId),
	});

	if (!profile) {
		// Profile missing — something went wrong at registration; send back to onboarding
		redirect(302, '/onboarding');
	}

	return {
		user: locals.user!,
		profile,
	};
};

const updateNameSchema = z.object({
	displayName: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.max(30, 'Name must be 30 characters or less')
		.regex(/^[a-zA-Z0-9 \-]+$/, 'Only letters, numbers, spaces and hyphens'),
});

export const actions: Actions = {
	/** Update the user's display name */
	updateName: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const formData = await request.formData();
		const raw = { displayName: (formData.get('displayName') as string) ?? '' };

		const parsed = updateNameSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				nameError: parsed.error.flatten().fieldErrors.displayName?.[0],
			});
		}

		try {
			await db
				.update(users)
				.set({ displayName: parsed.data.displayName, updatedAt: new Date() })
				.where(eq(users.id, userId));
		} catch (err) {
			console.error('[Profile] updateName failed:', err);
			return fail(500, { nameError: 'Could not save name. Please try again!' });
		}

		return { nameSuccess: true };
	},

	/** Replace the user's interest list */
	updateInterests: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const formData = await request.formData();
		const interestsJson = (formData.get('interestsJson') as string) ?? '[]';

		let interests: string[] = [];
		try {
			const parsed = JSON.parse(interestsJson);
			if (Array.isArray(parsed)) {
				interests = parsed.filter((i) => typeof i === 'string').slice(0, 30);
			}
		} catch {
			// Malformed JSON — save empty interests (non-critical)
		}

		try {
			await db
				.update(profiles)
				.set({ interests, updatedAt: new Date() })
				.where(eq(profiles.userId, userId));
		} catch (err) {
			console.error('[Profile] updateInterests failed:', err);
			return fail(500, { interestsError: 'Could not save interests. Please try again!' });
		}

		return { interestsSuccess: true };
	},
};
