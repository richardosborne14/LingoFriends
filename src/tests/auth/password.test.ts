/**
 * Unit tests for auth/password.ts
 *
 * Tests cover:
 *   - validatePassword     (pure function, no mocks needed)
 *   - hashPassword         (argon2 mocked)
 *   - verifyPassword       (argon2 mocked)
 *   - generateUniqueFriendCode (DB mocked)
 *
 * Native modules (argon2, postgres) are mocked so tests run without
 * a real database or compiled binaries in the test environment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock argon2 before importing password.ts ─────────────────────────────────
// argon2 is a native Node module — mock it so tests run in jsdom environment.
vi.mock('argon2', () => ({
	default: {
		argon2id: 2,
		hash: vi.fn().mockResolvedValue('$argon2id$v=19$mock_hash'),
		verify: vi.fn().mockImplementation(async (hash: string, _password: string) => {
			// The mock considers any hash that ends in "mock_hash" as valid
			return hash.endsWith('mock_hash');
		}),
	},
}));

// ── Mock the DB (postgres is native too) ─────────────────────────────────────
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn().mockResolvedValue([]), // empty = no collision
			})),
		})),
	},
	users: { id: 'id', friendCode: 'friend_code' },
}));

// ── Mock nanoid ───────────────────────────────────────────────────────────────
vi.mock('nanoid', () => ({
	nanoid: vi.fn(() => 'ABCDEF'),
}));

// Import AFTER mocks are set up
import {
	validatePassword,
	hashPassword,
	verifyPassword,
	generateUniqueFriendCode,
} from '$lib/server/auth/password';

// ─────────────────────────────────────────────────────────────────────────────

describe('validatePassword', () => {
	it('accepts a valid password of exactly 8 characters', () => {
		expect(validatePassword('abc12345').valid).toBe(true);
	});

	it('accepts a strong password', () => {
		expect(validatePassword('MyS3cur3P@ss').valid).toBe(true);
	});

	it('rejects password shorter than 8 characters', () => {
		const result = validatePassword('short');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('8');
	});

	it('rejects a single character', () => {
		expect(validatePassword('a').valid).toBe(false);
	});

	it('rejects an empty string', () => {
		expect(validatePassword('').valid).toBe(false);
	});

	it('rejects passwords longer than 128 characters', () => {
		const longPassword = 'a'.repeat(129);
		const result = validatePassword(longPassword);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('long');
	});

	it('accepts password of exactly 128 characters (boundary)', () => {
		const boundary = 'a'.repeat(128);
		expect(validatePassword(boundary).valid).toBe(true);
	});

	it('returns no error string when valid', () => {
		const result = validatePassword('validpassword');
		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('hashPassword', () => {
	it('returns a non-empty string', async () => {
		const hash = await hashPassword('mypassword');
		expect(typeof hash).toBe('string');
		expect(hash.length).toBeGreaterThan(0);
	});

	it('returns a string containing argon2 signature', async () => {
		const hash = await hashPassword('mypassword');
		expect(hash).toContain('argon2id');
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('verifyPassword', () => {
	it('returns true when hash matches (mock: any hash ending in mock_hash)', async () => {
		const hash = '$argon2id$v=19$mock_hash';
		expect(await verifyPassword(hash, 'anypassword')).toBe(true);
	});

	it('returns false for a non-matching hash', async () => {
		const badHash = '$argon2id$v=19$wrong_hash';
		expect(await verifyPassword(badHash, 'anypassword')).toBe(false);
	});

	it('returns false (not throw) for a malformed hash', async () => {
		// The real argon2.verify throws on malformed input — our wrapper catches it
		const argon2 = await import('argon2');
		vi.mocked(argon2.default.verify).mockRejectedValueOnce(new Error('Invalid hash'));
		expect(await verifyPassword('not_a_real_hash', 'password')).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('generateUniqueFriendCode', () => {
	it('returns exactly 8 characters', async () => {
		const code = await generateUniqueFriendCode();
		expect(code.length).toBe(8);
	});

	it('starts with "LF" prefix', async () => {
		const code = await generateUniqueFriendCode();
		expect(code.startsWith('LF')).toBe(true);
	});

	it('contains only uppercase alphanumeric characters', async () => {
		const code = await generateUniqueFriendCode();
		expect(code).toMatch(/^[A-Z0-9]+$/);
	});

	it('never contains ambiguous characters (0, O, 1, I, L)', async () => {
		// Run multiple times to test the character set
		for (let i = 0; i < 20; i++) {
			const code = await generateUniqueFriendCode();
			const suffix = code.slice(2); // Remove "LF" prefix
			expect(suffix).not.toMatch(/[01OIL]/);
		}
	});

	it('retries on collision and returns a unique code', async () => {
		// Simulate DB returning a collision on first attempt, then empty
		const { db } = await import('$lib/server/db');
		const mockSelect = vi.mocked(db.select);

		// First call returns a collision, second call returns empty
		mockSelect
			.mockReturnValueOnce({
				from: vi.fn(() => ({
					where: vi.fn().mockResolvedValue([{ id: 'existing-user' }]),
				})),
			} as unknown as ReturnType<typeof db.select>)
			.mockReturnValueOnce({
				from: vi.fn(() => ({
					where: vi.fn().mockResolvedValue([]), // No collision second time
				})),
			} as unknown as ReturnType<typeof db.select>);

		const code = await generateUniqueFriendCode();
		expect(code.length).toBe(8);
		expect(code.startsWith('LF')).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('friend code character set', () => {
	// Regression test: verify that multiple generated codes are in the expected set
	it('all suffix characters come from the safe alphabet', async () => {
		const SAFE_CHARS = new Set('ABCDEFGHJKMNPQRSTUVWXYZ23456789'.split(''));

		for (let i = 0; i < 10; i++) {
			const code = await generateUniqueFriendCode();
			const suffix = code.slice(2); // Remove "LF" prefix
			for (const char of suffix) {
				expect(SAFE_CHARS.has(char), `Char '${char}' not in safe alphabet`).toBe(true);
			}
		}
	});
});
