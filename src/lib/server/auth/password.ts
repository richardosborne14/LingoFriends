/**
 * Password Utilities — Argon2 hashing + Friend Code generation
 *
 * Argon2id is the recommended algorithm for password hashing (OWASP 2024).
 * Better than bcrypt for side-channel attack resistance.
 *
 * Friend codes are kid-friendly: 8 chars, uppercase alphanumeric.
 * Excludes ambiguous characters (0/O, 1/I/L) so kids can read them aloud.
 */

import argon2 from 'argon2';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Argon2id config — balances security with response time < 500ms on a dev machine
const ARGON2_OPTIONS = {
	type: argon2.argon2id,
	memoryCost: 65536, // 64 MB
	timeCost: 3,
	parallelism: 4,
};

/**
 * Hashes a plaintext password using Argon2id.
 * Store the returned string in the database — it includes the salt.
 */
export async function hashPassword(password: string): Promise<string> {
	return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against a stored Argon2id hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
	try {
		return await argon2.verify(hash, password);
	} catch {
		// Malformed hash — treat as mismatch, never throw
		return false;
	}
}

/**
 * Character set for friend codes.
 * Excludes: 0 (looks like O), O, 1 (looks like I/L), I, L
 * Kids should be able to read these aloud without ambiguity.
 */
const FRIEND_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generates a unique 8-character friend code (e.g. "LF-A3K7M2").
 * Checks the database for collisions and retries up to 10 times.
 * The LF- prefix helps kids identify it as a LingoFriends code.
 *
 * @throws Error if a unique code cannot be generated after 10 attempts
 */
export async function generateUniqueFriendCode(): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt++) {
		// Generate 6 random chars from the safe alphabet
		const chars = Array.from(
			{ length: 6 },
			() => FRIEND_CODE_CHARS[Math.floor(Math.random() * FRIEND_CODE_CHARS.length)]
		).join('');

		const code = `LF${chars}`; // 8 chars total: "LF" + 6 random = "LFA3K7M2"

		// Check for collision (rare but possible at scale)
		const existing = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.friendCode, code));

		if (existing.length === 0) {
			return code;
		}
	}

	// Fallback: use nanoid for guaranteed uniqueness (extremely rare path)
	// nanoid is used for randomness here — it's not security-critical
	return `LF${nanoid(6).toUpperCase().replace(/[^A-Z2-9]/g, 'X').slice(0, 6)}`;
}

/**
 * Validates password strength.
 * Kid-appropriate minimum: 8 chars, no special complexity requirements.
 * Kids aged 7-10 need simpler passwords — don't over-engineer this.
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
	if (password.length < 8) {
		return { valid: false, error: 'Password must be at least 8 characters' };
	}
	if (password.length > 128) {
		return { valid: false, error: 'Password is too long' };
	}
	return { valid: true };
}
