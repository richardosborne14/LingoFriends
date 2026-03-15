/**
 * Settings Page — Server Load + Form Actions
 *
 * Loads current profile settings and handles two form actions:
 *   - updatePreferences: language level + daily goal
 *   - updateAvatar: avatar customisation colours
 *
 * WHY server-side: Settings changes write to the DB and must be
 * validated server-side to prevent invalid values reaching the schema.
 *
 * @module routes/(app)/settings/+page.server
 */

import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { DAILY_CAPS } from '$lib/services/dailyCapService';

// ── Valid level values (must match DB + AI prompt expectations) ──────────────
const VALID_LEVELS = [
	'total_beginner',
	'know_some_words',
	'simple_sentences',
	'can_have_conversations',
] as const;

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect unauthenticated users to login
	if (!locals.user) redirect(302, '/login');

	// Load current profile settings
	const [profile] = await db
		.select({
			level: profiles.level,
			dailyGoal: profiles.dailyGoal,
			avatarSkinTone: profiles.avatarSkinTone,
			avatarHairColor: profiles.avatarHairColor,
			avatarShirtColor: profiles.avatarShirtColor,
			avatarHat: profiles.avatarHat,
			avatarGender: profiles.avatarGender,
			nativeLanguage: profiles.nativeLanguage,
			targetLanguage: profiles.targetLanguage,
			streakFreezesRemaining: profiles.streakFreezesRemaining,
		})
		.from(profiles)
		.where(eq(profiles.userId, locals.user.id))
		.limit(1);

	if (!profile) redirect(302, '/onboarding');

	return {
		user: locals.user,
		profile,
		// Pass cap constant to the page for showing "max X lessons"
		maxDailyGoal: DAILY_CAPS.new_lessons,
	};
};

export const actions: Actions = {
	/**
	 * Update learning preferences (level + daily goal).
	 * Called from the preferences section of the settings form.
	 */
	updatePreferences: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorised' });

		const data = await request.formData();
		const level = data.get('level') as string | null;
		const dailyGoalRaw = data.get('dailyGoal') as string | null;

		// Validate level
		if (level && !VALID_LEVELS.includes(level as (typeof VALID_LEVELS)[number])) {
			return fail(400, { error: `Invalid level: ${level}` });
		}

		// Validate dailyGoal: must be 1 to DAILY_CAPS.new_lessons (inclusive)
		const dailyGoal = dailyGoalRaw ? parseInt(dailyGoalRaw, 10) : null;
		if (dailyGoal !== null && (isNaN(dailyGoal) || dailyGoal < 1 || dailyGoal > DAILY_CAPS.new_lessons)) {
			return fail(400, {
				error: `Daily goal must be between 1 and ${DAILY_CAPS.new_lessons}`,
			});
		}

		// Build update payload — only update fields that were provided
		const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
		if (level) updatePayload.level = level;
		if (dailyGoal !== null) updatePayload.dailyGoal = dailyGoal;

		await db
			.update(profiles)
			.set(updatePayload)
			.where(eq(profiles.userId, locals.user.id));

		return { success: true, message: 'Preferences saved!' };
	},

	/**
	 * Update avatar appearance.
	 * Called from the avatar customisation section.
	 * Colours are validated as 7-char hex strings (#RRGGBB).
	 */
	updateAvatar: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorised' });

		const data = await request.formData();
		const skinTone = data.get('avatarSkinTone') as string | null;
		const hairColor = data.get('avatarHairColor') as string | null;
		const shirtColor = data.get('avatarShirtColor') as string | null;
		const hat = data.get('avatarHat') as string | null;
		const gender = data.get('avatarGender') as string | null;

		// Validate hex colours (must be #RRGGBB)
		const hexRegex = /^#[0-9A-Fa-f]{6}$/;
		for (const [name, value] of [['skinTone', skinTone], ['hairColor', hairColor], ['shirtColor', shirtColor]] as const) {
			if (value && !hexRegex.test(value)) {
				return fail(400, { error: `Invalid colour for ${name}: ${value}` });
			}
		}

		// Validate hat — allow common values or 'none'
		const VALID_HATS = ['none', 'beanie', 'cap', 'bow', 'crown'];
		if (hat && !VALID_HATS.includes(hat)) {
			return fail(400, { error: `Invalid hat: ${hat}` });
		}

		const VALID_GENDERS = ['neutral', 'masculine', 'feminine'];
		if (gender && !VALID_GENDERS.includes(gender)) {
			return fail(400, { error: `Invalid gender: ${gender}` });
		}

		const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
		if (skinTone) updatePayload.avatarSkinTone = skinTone;
		if (hairColor) updatePayload.avatarHairColor = hairColor;
		if (shirtColor) updatePayload.avatarShirtColor = shirtColor;
		if (hat) updatePayload.avatarHat = hat;
		if (gender) updatePayload.avatarGender = gender;

		await db
			.update(profiles)
			.set(updatePayload)
			.where(eq(profiles.userId, locals.user.id));

		return { success: true, message: 'Avatar updated!' };
	},
};
