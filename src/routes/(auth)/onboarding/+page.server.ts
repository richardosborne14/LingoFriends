/**
 * TASK-V2-01 — Onboarding Server (Overhauled)
 *
 * Changes from Phase 1:
 * - Added `level` field (proficiency self-report)
 * - Added `avatarGender` field ('boy' | 'girl' | 'neutral')
 * - Expanded hat options to match StepAvatar component
 * - Schema now has `level` and `firstLessonComplete` columns
 *
 * Load: guards unauthenticated/already-onboarded users.
 * Action: persists all onboarding data, creates default starter tree.
 * Returns { success: true } so the page shows the Garden Reveal screen.
 *
 * Architecture note: client-side collects all 6 steps, submits at the end.
 * We never show a "loading" spinner mid-onboarding for step submissions —
 * only on the final save (better UX: no interruptions mid-flow).
 */

import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { profiles, skillPaths, userTrees } from '$lib/server/db/schema';

// ── Guards ────────────────────────────────────────────────────────────────────

/**
 * Load function: redirect if unauthenticated or already onboarded.
 * Returns displayName for the welcome screen greeting.
 */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, locals.user.id),
		columns: { onboardingComplete: true },
	});

	// Skip onboarding entirely if already completed
	if (profile?.onboardingComplete) {
		redirect(302, '/garden');
	}

	return {
		displayName: locals.user.displayName,
	};
};

// ── Validation schemas ────────────────────────────────────────────────────────

/** Allowed language codes — keep in sync with i18n locales */
const LANGUAGE_CODES = ['en', 'fr', 'de'] as const;

/** Allowed age groups — keep in sync with UI and schema */
const AGE_GROUPS = ['7-10', '11-14', '15-18'] as const;

/**
 * Proficiency levels — self-reported during onboarding.
 * The AI will fine-tune this after 3+ lessons (see TASK-V2-05).
 */
const LEVEL_CODES = [
	'total_beginner',
	'know_some_words',
	'simple_sentences',
	'can_have_conversations',
] as const;

/** Gender codes — neutral is the androgynous/prefer-not-to-say option */
const GENDER_CODES = ['boy', 'girl', 'neutral'] as const;

/** Hat styles — must match StepAvatar.svelte HATS array */
const HAT_STYLES = ['none', 'cap', 'beanie', 'headband'] as const;

/** Hex colour validator — requires exactly #RRGGBB format */
const hexColour = z
	.string()
	.regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid colour format')
	.default('#F5D0A9');

/**
 * Full onboarding submission schema.
 * All fields are validated; bad data returns a user-friendly error.
 */
const onboardingSchema = z.object({
	nativeLanguage: z.enum(LANGUAGE_CODES, {
		errorMap: () => ({ message: 'Please select your home language' }),
	}),
	targetLanguage: z.enum(LANGUAGE_CODES, {
		errorMap: () => ({ message: 'Please select a language to learn' }),
	}),
	ageGroup: z.enum(AGE_GROUPS, {
		errorMap: () => ({ message: 'Please select your age group' }),
	}),
	// Level is optional — defaults to total_beginner if somehow missing
	level: z.enum(LEVEL_CODES).default('total_beginner'),
	// Interests arrive as a JSON-stringified array from the hidden form field
	interestsJson: z.string().default('[]'),
	// Avatar fields
	avatarGender: z.enum(GENDER_CODES).default('neutral'),
	avatarSkinTone: hexColour,
	avatarHairColor: hexColour,
	avatarShirtColor: hexColour,
	avatarHat: z.enum(HAT_STYLES).default('none'),
});

// ── Form actions ──────────────────────────────────────────────────────────────

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const formData = await request.formData();

		// Extract all fields from the submitted form
		const raw = {
			nativeLanguage:  formData.get('nativeLanguage')  as string,
			targetLanguage:  formData.get('targetLanguage')  as string,
			ageGroup:        formData.get('ageGroup')        as string,
			level:           (formData.get('level')          as string) ?? 'total_beginner',
			interestsJson:   (formData.get('interestsJson')  as string) ?? '[]',
			avatarGender:    (formData.get('avatarGender')   as string) ?? 'neutral',
			avatarSkinTone:  (formData.get('avatarSkinTone') as string) ?? '#F5D0A9',
			avatarHairColor: (formData.get('avatarHairColor') as string) ?? '#4A3728',
			avatarShirtColor: (formData.get('avatarShirtColor') as string) ?? '#FF8A6A',
			avatarHat:       (formData.get('avatarHat')      as string) ?? 'none',
		};

		const parsed = onboardingSchema.safeParse(raw);
		if (!parsed.success) {
			console.error('[Onboarding] Validation failed:', parsed.error.flatten());
			return fail(400, {
				error: 'Please complete all steps and try again.',
			});
		}

		// Parse interests — submitted as JSON string to handle multi-select array
		let interests: string[] = [];
		try {
			const parsed_interests = JSON.parse(parsed.data.interestsJson);
			if (Array.isArray(parsed_interests)) {
				// Filter to strings only, prevent injection of unexpected types
				interests = parsed_interests.filter((i): i is string => typeof i === 'string');
			}
		} catch {
			// Malformed JSON — treat as empty interests (non-blocking, not required)
			interests = [];
		}

		const userId = locals.user.id;

		try {
			// ── 1. Save all onboarding data to profile ─────────────────────────
			await db
				.update(profiles)
				.set({
					nativeLanguage:  parsed.data.nativeLanguage,
					targetLanguage:  parsed.data.targetLanguage,
					ageGroup:        parsed.data.ageGroup,
					level:           parsed.data.level,
					interests,
					avatarGender:    parsed.data.avatarGender,
					avatarSkinTone:  parsed.data.avatarSkinTone,
					avatarHairColor: parsed.data.avatarHairColor,
					avatarShirtColor: parsed.data.avatarShirtColor,
					avatarHat:       parsed.data.avatarHat,
					onboardingComplete: true,
					updatedAt: new Date(),
				})
				.where(eq(profiles.userId, userId));

			// ── 2. Create default starter tree ────────────────────────────────
			// Find the first available skill path for the chosen target language.
			// If none exist (e.g. DB not yet seeded), skip gracefully —
			// the garden handles the empty state with a "plant your first tree" prompt.
			const firstPath = await db.query.skillPaths.findFirst({
				where: eq(skillPaths.targetLanguage, parsed.data.targetLanguage),
				orderBy: (sp, { asc }) => asc(sp.createdAt),
			});

			if (firstPath) {
				// Avoid duplicates if the user somehow re-submits onboarding
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
						// Centre of garden grid — first tree always goes in the middle
						positionX: 0,
						positionY: 0,
					});
				}
			}
		} catch (err) {
			console.error('[Onboarding] Failed to save profile or create tree:', err);
			return fail(500, {
				error: 'Oops! Something went wrong saving your profile. Please try again!',
			});
		}

		// ── 3. Return success ─────────────────────────────────────────────────
		// The page component renders the Garden Reveal screen (screen 7)
		// when it sees { success: true } in the form action data.
		// The user then navigates to /garden themselves via the CTA button.
		return { success: true as const };
	},
};
