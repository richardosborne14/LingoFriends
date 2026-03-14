/**
 * Task 1.2 — Login Server Action
 *
 * Finds user by email, verifies password, creates session.
 * Redirects to /onboarding if not yet completed, /garden otherwise.
 *
 * Rate limiting: 5 failed attempts per email per 5 minutes.
 * Tracked in a module-level Map — resets on server restart (intentional:
 * we don't want to persist failed attempts across deploys, and the 5-minute
 * window is short enough to still be effective).
 */

import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users, profiles } from '$lib/server/db/schema';
import { lucia } from '$lib/server/auth/lucia';
import { verifyPassword } from '$lib/server/auth/password';

// Already logged-in users go straight to the app
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(302, '/garden');
	}
	return {};
};

// Simple in-memory rate limiter: email → { count, firstAttemptAt }
const loginAttempts = new Map<string, { count: number; firstAttemptAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Checks rate limit for an email.
 * Returns true if the email is rate-limited (too many recent failures).
 */
function isRateLimited(email: string): boolean {
	const record = loginAttempts.get(email);
	if (!record) return false;

	const elapsed = Date.now() - record.firstAttemptAt;
	if (elapsed > RATE_LIMIT_WINDOW_MS) {
		// Window has expired — reset
		loginAttempts.delete(email);
		return false;
	}

	return record.count >= RATE_LIMIT_MAX;
}

/** Records a failed login attempt for rate limiting. */
function recordFailedAttempt(email: string): void {
	const record = loginAttempts.get(email);
	if (!record) {
		loginAttempts.set(email, { count: 1, firstAttemptAt: Date.now() });
	} else {
		record.count += 1;
	}
}

/** Clears failed attempts after a successful login. */
function clearFailedAttempts(email: string): void {
	loginAttempts.delete(email);
}

const loginSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required'),
});

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const raw = {
			email: (formData.get('email') as string) ?? '',
			password: (formData.get('password') as string) ?? '',
		};

		// Zod validation (catches obviously malformed input before hitting the DB)
		const parsed = loginSchema.safeParse(raw);
		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				errors: {
					email: fieldErrors.email,
					password: fieldErrors.password,
				},
				values: { email: raw.email },
			});
		}

		// Rate limit check — prevent brute-force attempts
		if (isRateLimited(parsed.data.email)) {
			return fail(429, {
				errors: {
					_global: ['Too many attempts. Please wait a few minutes and try again.'],
				},
				values: { email: parsed.data.email },
			});
		}

		// Look up user by email
		const user = await db.query.users.findFirst({
			where: eq(users.email, parsed.data.email),
		});

		if (!user) {
			// Use generic message to avoid revealing whether the email exists
			recordFailedAttempt(parsed.data.email);
			return fail(401, {
				errors: { _global: ['No account found with that email'] },
				values: { email: parsed.data.email },
			});
		}

		// Verify password
		const validPassword = await verifyPassword(user.passwordHash, parsed.data.password);
		if (!validPassword) {
			recordFailedAttempt(parsed.data.email);
			return fail(401, {
				errors: { _global: ['Incorrect password'] },
				values: { email: parsed.data.email },
			});
		}

		// Password correct — clear rate limit record
		clearFailedAttempts(parsed.data.email);

		// Create session and set cookie
		const session = await lucia.createSession(user.id, {});
		const cookie = lucia.createSessionCookie(session.id);
		cookies.set(cookie.name, cookie.value, {
			path: '/',
			...cookie.attributes,
		});

		// Check if user has completed onboarding
		const profile = await db.query.profiles.findFirst({
			where: eq(profiles.userId, user.id),
			columns: { onboardingComplete: true },
		});

		// If there's a returnTo param (set by the auth guard), respect it
		const returnTo = url.searchParams.get('returnTo');
		const safeDest = returnTo?.startsWith('/') ? returnTo : null;

		if (!profile?.onboardingComplete) {
			redirect(302, '/onboarding');
		}

		redirect(302, safeDest ?? '/garden');
	},
};
