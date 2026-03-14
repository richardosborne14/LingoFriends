/**
 * Lesson Page Server Load — /lesson/[id]
 *
 * Loads the user's profile to supply targetLanguage, nativeLanguage,
 * and optional personal context (interests) to the lesson generation call.
 *
 * The actual lesson generation happens client-side via POST /api/lessons/generate
 * (not here) so that the loading state can be shown in the browser immediately.
 *
 * If the user has no profile, redirect to /onboarding to complete setup first.
 */

import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { profiles, learnerProfiles } from '$lib/server/db/schema';
import type { LanguageCode } from '$lib/types/language';

export const load: PageServerLoad = async ({ locals }) => {
	// Auth guard is handled by (app)/+layout.server.ts — user is guaranteed here
	const userId = locals.user!.id;

	// Load the user's onboarding profile (contains language settings)
	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, userId),
	});

	if (!profile || !profile.onboardingComplete) {
		// First-time user hasn't finished onboarding — can't start a lesson yet
		redirect(302, '/onboarding');
	}

	// Optionally load the AI learner profile for adaptive personalisation
	// This provides personal context for chunk family selection (Phase 3 Rule 9)
	const learnerProfile = await db.query.learnerProfiles.findFirst({
		where: eq(learnerProfiles.userId, userId),
	});

	// Build a personal context string from interests and known facts
	// Used by the AI to select relevant chunk families (e.g. "Has a cat named Luna")
	const personalContext = buildPersonalContext(
		profile.interests ?? [],
		learnerProfile?.knownFacts ?? []
	);

	return {
		// Expose a safe subset of profile data (not the full DB row)
		profile: {
			targetLanguage: profile.targetLanguage as LanguageCode,
			nativeLanguage: profile.nativeLanguage as LanguageCode,
			ageGroup: profile.ageGroup,
			interests: profile.interests ?? [],
			// Personal context for AI chunk selection — null is valid (Rule 9)
			personalContext: personalContext || null,
		},
	};
};

/**
 * Builds a brief personal context string for AI personalisation.
 * Combines interests (from onboarding) and learned facts (from learner profile).
 *
 * WHY: The AI uses this to select chunk families that feel relevant
 * to the learner (e.g. "the learner likes dinosaurs" → Ich habe einen Dinosaurier).
 *
 * Returns null-safe empty string if nothing is available.
 */
function buildPersonalContext(
	interests: string[],
	knownFacts: { fact: string; source: string; date: string }[]
): string {
	const parts: string[] = [];

	if (interests.length > 0) {
		// Max 5 interests to keep the context prompt concise
		parts.push(`Interests: ${interests.slice(0, 5).join(', ')}`);
	}

	if (knownFacts.length > 0) {
		// Max 3 most recent facts
		const recent = knownFacts.slice(-3).map((f) => f.fact);
		parts.push(`Known facts: ${recent.join('; ')}`);
	}

	return parts.join('. ');
}
