/**
 * Task 1.4 — Onboarding Server
 *
 * Load: guard against already-onboarded users, return displayName for welcome screen.
 * Action: persist all onboarding data to profiles table, create first user_tree.
 *
 * The form collects all 6 data screens client-side, then submits everything
 * at once when the user finishes the avatar step. Server returns { success: true }
 * so the page can show the Garden Reveal screen (screen 7) before navigating.
 */

import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { profiles, skillPaths, userTrees } from '$lib/server/db/schema';

// Guard: unauthenticated users go to login; already-onboarded go to garden
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, locals.user.id),
		columns: { onboardingComplete: true },
	});

	if (profile?.onboardingComplete) {
		redirect(302, '/garden');
	}

	return {
		// Used for the welcome screen greeting
		displayName: locals.user.displayName,
	};
};

/** Valid age groups — keep in sync with schema and UI */
const AGE_GROUPS = ['7-10', '11-14', '15-18'] as const;

/** Valid language codes supported at launch */
const LANGUAGE_CODES = ['en', 'fr', 'de'] as const;

/** Avatar hex colours — basic validation (must be a valid hex) */
const hexColour = z
	.string()
	.regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid colour')
	.default('#F5D0A9');

const onboardingSchema = z.object({
	nativeLanguage: z.enum(LANGUAGE_CODES, {
		errorMap: () => ({ message: 'Please select a home language' }),
	}),
	targetLanguage: z.enum(LANGUAGE_CODES, {
		errorMap: () => ({ message: 'Please select a language to learn' }),
	}),
	ageGroup: z.enum(AGE_GROUPS, {
		errorMap: () => ({ message: 'Please select an age group' }),
	}),
	// Interests arrive as a JSON-stringified array from the form
	interestsJson: z.string().default('[]'),
	avatarSkinTone: hexColour,
	avatarHairColor: hexColour,
	avatarShirtColor: hexColour,
	avatarHat: z.enum(['none', 'cap', 'beanie', 'headband']).default('none'),
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const formData = await request.formData();
		const raw = {
			nativeLanguage: formData.get('nativeLanguage') as string,
			targetLanguage: formData.get('targetLanguage') as string,
			ageGroup: formData.get('ageGroup') as string,
			interestsJson: (formData.get('interestsJson') as string) ?? '[]',
			avatarSkinTone: (formData.get('avatarSkinTone') as string) ?? '#F5D0A9',
			avatarHairColor: (formData.get('avatarHairColor') as string) ?? '#4A3728',
			avatarShirtColor: (formData.get('avatarShirtColor') as string) ?? '#FF8A6A',
			avatarHat: (formData.get('avatarHat') as string) ?? 'none',
		};

		const parsed = onboardingSchema.safeParse(raw);
		if (!parsed.success) {
			console.error('[Onboarding] Validation failed:', parsed.error.flatten());
			return fail(400, {
				error: 'Please complete all steps and try again.',
			});
		}

		// Parse interests from JSON (submitted as a stringified array)
		let interests: string[] = [];
		try {
			const parsed_interests = JSON.parse(parsed.data.interestsJson);
			if (Array.isArray(parsed_interests)) {
				interests = parsed_interests.filter((i) => typeof i === 'string');
			}
		} catch {
			// Malformed JSON — treat as empty interests (non-blocking)
			interests = [];
		}

		const userId = locals.user.id;

		try {
			// Update profile with all onboarding data
			await db
				.update(profiles)
				.set({
					nativeLanguage: parsed.data.nativeLanguage,
					targetLanguage: parsed.data.targetLanguage,
					ageGroup: parsed.data.ageGroup,
					interests,
					avatarSkinTone: parsed.data.avatarSkinTone,
					avatarHairColor: parsed.data.avatarHairColor,
					avatarShirtColor: parsed.data.avatarShirtColor,
					avatarHat: parsed.data.avatarHat,
					onboardingComplete: true,
					updatedAt: new Date(),
				})
				.where(eq(profiles.userId, userId));

			// Find the first available skill path for this target language.
			// If none exist yet (e.g. before seeding), we skip tree creation gracefully —
			// the garden page handles the "no trees" empty state.
			const firstPath = await db.query.skillPaths.findFirst({
				where: eq(skillPaths.targetLanguage, parsed.data.targetLanguage),
				orderBy: (sp, { asc }) => asc(sp.createdAt),
			});

			if (firstPath) {
				// Check the user doesn't already have a tree for this path
				const existingTree = await db.query.userTrees.findFirst({
					where: (t, { and, eq: deq }) =>
						and(deq(t.userId, userId), deq(t.skillPathId, firstPath.id)),
				});

				if (!existingTree) {
					await db.insert(userTrees).values({
						userId,
						skillPathId: firstPath.id,
						status: 'seed',
						health: 100,
						growthStage: 0,
						// Place the first tree in the centre of the garden grid
						positionX: 0,
						positionY: 0,
					});
				}
			}
		} catch (err) {
			console.error('[Onboarding] Failed to save profile:', err);
			return fail(500, {
				error: 'Oops! Something went wrong saving your profile. Please try again!',
			});
		}

		// Return success — the page renders screen 7 (Garden Reveal)
		// and then the user clicks through to /garden themselves
		return { success: true as const };
	},
};
