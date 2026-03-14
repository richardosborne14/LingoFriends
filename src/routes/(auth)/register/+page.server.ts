/**
 * Task 1.1 — Registration Server Action
 *
 * Two outcomes:
 *   - Validation/conflict failure → fail() with field errors
 *   - Success → return { success: true, friendCode } so the page
 *     can show Step 2 (friend code reveal) without a redirect.
 *     The session cookie is set immediately on success so the user
 *     is authenticated before they finish onboarding.
 *
 * All fail() calls share the same error shape so the page has a
 * single, stable type to work with (no union discrimination needed).
 */

import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users, profiles, learnerProfiles } from '$lib/server/db/schema';
import { lucia } from '$lib/server/auth/lucia';
import {
	hashPassword,
	generateUniqueFriendCode,
	validatePassword,
} from '$lib/server/auth/password';

/** Unified error shape — all fields optional so all fail() calls share the same type */
interface RegisterErrors {
	displayName?: string[];
	email?: string[];
	password?: string[];
	_global?: string[];
}

// Already logged-in users don't need to register again
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(302, '/garden');
	}
	return {};
};

// Zod schema for registration fields (password strength handled separately)
const registerSchema = z.object({
	displayName: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.max(30, 'Name must be 30 characters or less')
		.regex(/^[a-zA-Z0-9 \-]+$/, 'Only letters, numbers, spaces and hyphens are allowed'),
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required'),
});

/**
 * Generates a URL-safe username from a display name.
 * Format: FirstWord-XXXX (e.g. "Max-7K2A")
 * The random suffix reduces collision probability dramatically.
 */
function generateUsername(displayName: string): string {
	const base = displayName
		.split(' ')[0]
		.replace(/[^a-zA-Z0-9]/g, '')
		.substring(0, 12);
	const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
	return `${base}-${suffix}`;
}

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const raw = {
			displayName: (formData.get('displayName') as string) ?? '',
			email: (formData.get('email') as string) ?? '',
			password: (formData.get('password') as string) ?? '',
		};

		/** Helper to return a validation failure while preserving the typed input values */
		function validationFail(errors: RegisterErrors) {
			return fail(400, {
				errors,
				values: { displayName: raw.displayName, email: raw.email },
			});
		}

		// Step 1: Zod schema validation
		const parsed = registerSchema.safeParse(raw);
		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return validationFail({
				displayName: fieldErrors.displayName,
				email: fieldErrors.email,
				password: fieldErrors.password,
			});
		}

		// Step 2: Password strength check (separate from schema — gives friendlier errors)
		const pwCheck = validatePassword(parsed.data.password);
		if (!pwCheck.valid) {
			return validationFail({ password: [pwCheck.error!] });
		}

		// Step 3: Check email uniqueness
		const existing = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, parsed.data.email));

		if (existing.length > 0) {
			return validationFail({
				email: ['An account with this email already exists'],
			});
		}

		// Step 4: Hash password and generate unique identifiers
		const passwordHash = await hashPassword(parsed.data.password);
		const friendCode = await generateUniqueFriendCode();
		let username = generateUsername(parsed.data.displayName);

		// Retry username if collision (rare but possible at scale)
		const usernameConflict = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.username, username));

		if (usernameConflict.length > 0) {
			username = generateUsername(parsed.data.displayName);
		}

		// Step 5: Persist user + profile + learner profile
		let userId: string;
		try {
			const [newUser] = await db
				.insert(users)
				.values({
					email: parsed.data.email,
					passwordHash,
					username,
					displayName: parsed.data.displayName,
					friendCode,
				})
				.returning({ id: users.id });

			userId = newUser.id;

			// Profile defaults — overwritten during onboarding
			await db.insert(profiles).values({
				userId,
				nativeLanguage: 'en',
				targetLanguage: 'de',
				ageGroup: '11-14',
				onboardingComplete: false,
			});

			// Empty learner profile — AI populates this over time
			await db.insert(learnerProfiles).values({ userId });
		} catch (err) {
			console.error('[Register] DB insert failed:', err);
			return fail(500, {
				errors: { _global: ['Oops! Something went wrong. Please try again!'] } as RegisterErrors,
				values: { displayName: parsed.data.displayName, email: parsed.data.email },
			});
		}

		// Step 6: Create session immediately — user is logged in before onboarding
		const session = await lucia.createSession(userId, {});
		const cookie = lucia.createSessionCookie(session.id);
		cookies.set(cookie.name, cookie.value, {
			path: '/',
			...cookie.attributes,
		});

		// Return friend code to trigger Step 2 on the page (no redirect yet)
		return { success: true as const, friendCode };
	},
};
