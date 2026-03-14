/**
 * Tests — Friends Service (pure functions)
 *
 * All tests are pure unit tests — no DB, no network, no async.
 * Covers: request validation, friendship checking, privacy sanitization,
 * medal display helpers, and friend ID extraction.
 */

import { describe, it, expect } from 'vitest';
import {
	canSendRequest,
	isFriends,
	getFriendIds,
	sanitizeFriendProfile,
	getMedalIcon,
	getMedalClass,
	type FriendshipRow,
} from '$lib/server/social/friendsService';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const USER_A = 'user-aaa';
const USER_B = 'user-bbb';
const USER_C = 'user-ccc';

const ACCEPTED_ROW: FriendshipRow = {
	id: 'f-001',
	userA: USER_A,
	userB: USER_B,
	status: 'accepted',
	initiatedBy: USER_A,
};

const PENDING_ROW: FriendshipRow = {
	id: 'f-002',
	userA: USER_A,
	userB: USER_B,
	status: 'pending',
	initiatedBy: USER_A,
};

const REJECTED_ROW: FriendshipRow = {
	id: 'f-003',
	userA: USER_A,
	userB: USER_B,
	status: 'rejected',
	initiatedBy: USER_A,
};

// Reversed direction (B initiated towards A)
const PENDING_REVERSE_ROW: FriendshipRow = {
	id: 'f-004',
	userA: USER_B,
	userB: USER_A,
	status: 'pending',
	initiatedBy: USER_B,
};

// ─────────────────────────────────────────────────────────────────────────────
// canSendRequest
// ─────────────────────────────────────────────────────────────────────────────

describe('canSendRequest — self-add prevention', () => {
	it('blocks adding yourself', () => {
		const result = canSendRequest(USER_A, USER_A, []);
		expect(result.allowed).toBe(false);
		if (!result.allowed) expect(result.reason).toBe('self');
	});
});

describe('canSendRequest — no existing relationship', () => {
	it('allows request when no friendship exists', () => {
		const result = canSendRequest(USER_A, USER_B, []);
		expect(result.allowed).toBe(true);
	});

	it('allows request to a user with unrelated friendships', () => {
		// USER_A is friends with USER_C — should not block USER_A → USER_B
		const unrelated: FriendshipRow = {
			id: 'f-unrelated',
			userA: USER_A,
			userB: USER_C,
			status: 'accepted',
			initiatedBy: USER_A,
		};
		const result = canSendRequest(USER_A, USER_B, [unrelated]);
		expect(result.allowed).toBe(true);
	});
});

describe('canSendRequest — existing pending request', () => {
	it('blocks sending when a pending request already exists (A→B direction)', () => {
		const result = canSendRequest(USER_A, USER_B, [PENDING_ROW]);
		expect(result.allowed).toBe(false);
		if (!result.allowed) expect(result.reason).toBe('duplicate_pending');
	});

	it('blocks sending when a pending request exists in reversed direction (B→A)', () => {
		const result = canSendRequest(USER_A, USER_B, [PENDING_REVERSE_ROW]);
		expect(result.allowed).toBe(false);
		if (!result.allowed) expect(result.reason).toBe('duplicate_pending');
	});
});

describe('canSendRequest — existing accepted friendship', () => {
	it('blocks sending when already friends', () => {
		const result = canSendRequest(USER_A, USER_B, [ACCEPTED_ROW]);
		expect(result.allowed).toBe(false);
		if (!result.allowed) expect(result.reason).toBe('already_friends');
	});
});

describe('canSendRequest — rejected/declined', () => {
	it('allows a new request after rejection (kids can reconcile)', () => {
		const result = canSendRequest(USER_A, USER_B, [REJECTED_ROW]);
		expect(result.allowed).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// isFriends
// ─────────────────────────────────────────────────────────────────────────────

describe('isFriends', () => {
	it('returns true for accepted friendship in A→B direction', () => {
		expect(isFriends(USER_A, USER_B, [ACCEPTED_ROW])).toBe(true);
	});

	it('returns true for accepted friendship in B→A direction', () => {
		// Bidirectional: B should also see themselves as friends with A
		expect(isFriends(USER_B, USER_A, [ACCEPTED_ROW])).toBe(true);
	});

	it('returns false for pending friendship', () => {
		expect(isFriends(USER_A, USER_B, [PENDING_ROW])).toBe(false);
	});

	it('returns false for rejected friendship', () => {
		expect(isFriends(USER_A, USER_B, [REJECTED_ROW])).toBe(false);
	});

	it('returns false when no relationship exists', () => {
		expect(isFriends(USER_A, USER_B, [])).toBe(false);
	});

	it('returns false when checking against a different user pair', () => {
		// A and B are friends, but A and C are not
		expect(isFriends(USER_A, USER_C, [ACCEPTED_ROW])).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// getFriendIds
// ─────────────────────────────────────────────────────────────────────────────

describe('getFriendIds', () => {
	it('returns empty array when user has no accepted friends', () => {
		expect(getFriendIds(USER_A, [])).toHaveLength(0);
	});

	it('returns other user ID when userA', () => {
		const ids = getFriendIds(USER_A, [ACCEPTED_ROW]);
		expect(ids).toContain(USER_B);
	});

	it('returns other user ID when userB', () => {
		const ids = getFriendIds(USER_B, [ACCEPTED_ROW]);
		expect(ids).toContain(USER_A);
	});

	it('excludes pending friendships', () => {
		const ids = getFriendIds(USER_A, [PENDING_ROW]);
		expect(ids).toHaveLength(0);
	});

	it('handles multiple accepted friends', () => {
		const row2: FriendshipRow = {
			id: 'f-005',
			userA: USER_A,
			userB: USER_C,
			status: 'accepted',
			initiatedBy: USER_A,
		};
		const ids = getFriendIds(USER_A, [ACCEPTED_ROW, row2]);
		expect(ids).toContain(USER_B);
		expect(ids).toContain(USER_C);
		expect(ids).toHaveLength(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeFriendProfile — privacy guard
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER = { displayName: 'Luna', friendCode: 'LF-ABC123' };

const MOCK_PROFILE = {
	totalSunDrops: 420,
	currentStreak: 7,
	avatarSkinTone: '#F5D0A9',
	avatarHairColor: '#4A3728',
	avatarShirtColor: '#FF8A6A',
	avatarHat: 'none',
	avatarGender: 'neutral',
};

describe('sanitizeFriendProfile — data shape', () => {
	it('includes userId, displayName, friendCode', () => {
		const result = sanitizeFriendProfile(USER_A, MOCK_USER, MOCK_PROFILE);
		expect(result.userId).toBe(USER_A);
		expect(result.displayName).toBe('Luna');
		expect(result.friendCode).toBe('LF-ABC123');
	});

	it('includes streak and totalSunDrops', () => {
		const result = sanitizeFriendProfile(USER_A, MOCK_USER, MOCK_PROFILE);
		expect(result.streak).toBe(7);
		expect(result.totalSunDrops).toBe(420);
	});

	it('includes avatarOptions with all fields', () => {
		const result = sanitizeFriendProfile(USER_A, MOCK_USER, MOCK_PROFILE);
		expect(result.avatarOptions.skinTone).toBe('#F5D0A9');
		expect(result.avatarOptions.hairColor).toBe('#4A3728');
		expect(result.avatarOptions.shirtColor).toBe('#FF8A6A');
		expect(result.avatarOptions.hat).toBe('none');
		expect(result.avatarOptions.gender).toBe('neutral');
	});
});

describe('sanitizeFriendProfile — privacy enforcement', () => {
	it('does NOT include an email field', () => {
		// Cast via unknown to inspect the object as a plain dict — intentional reflection check
		const result = sanitizeFriendProfile(USER_A, MOCK_USER, MOCK_PROFILE) as unknown as Record<string, unknown>;
		expect(result['email']).toBeUndefined();
	});

	it('does NOT include an ageGroup field', () => {
		const result = sanitizeFriendProfile(USER_A, MOCK_USER, MOCK_PROFILE) as unknown as Record<string, unknown>;
		expect(result['ageGroup']).toBeUndefined();
	});

	it('does NOT include a lastActivityDate field', () => {
		const result = sanitizeFriendProfile(USER_A, MOCK_USER, MOCK_PROFILE) as unknown as Record<string, unknown>;
		expect(result['lastActivityDate']).toBeUndefined();
	});

	it('does NOT include a nativeLanguage field', () => {
		const result = sanitizeFriendProfile(USER_A, MOCK_USER, MOCK_PROFILE) as unknown as Record<string, unknown>;
		expect(result['nativeLanguage']).toBeUndefined();
	});
});

describe('sanitizeFriendProfile — null-safety', () => {
	it('defaults streak to 0 when null', () => {
		const result = sanitizeFriendProfile(USER_A, MOCK_USER, {
			...MOCK_PROFILE,
			currentStreak: null,
		});
		expect(result.streak).toBe(0);
	});

	it('defaults totalSunDrops to 0 when null', () => {
		const result = sanitizeFriendProfile(USER_A, MOCK_USER, {
			...MOCK_PROFILE,
			totalSunDrops: null,
		});
		expect(result.totalSunDrops).toBe(0);
	});

	it('defaults avatarSkinTone when null', () => {
		const result = sanitizeFriendProfile(USER_A, MOCK_USER, {
			...MOCK_PROFILE,
			avatarSkinTone: null,
		});
		expect(result.avatarOptions.skinTone).toBe('#F5D0A9');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// getMedalIcon
// ─────────────────────────────────────────────────────────────────────────────

describe('getMedalIcon', () => {
	it('rank 1 → 🥇', () => expect(getMedalIcon(1)).toBe('🥇'));
	it('rank 2 → 🥈', () => expect(getMedalIcon(2)).toBe('🥈'));
	it('rank 3 → 🥉', () => expect(getMedalIcon(3)).toBe('🥉'));
	it('rank 4 → "4"', () => expect(getMedalIcon(4)).toBe('4'));
	it('rank 10 → "10"', () => expect(getMedalIcon(10)).toBe('10'));
});

// ─────────────────────────────────────────────────────────────────────────────
// getMedalClass
// ─────────────────────────────────────────────────────────────────────────────

describe('getMedalClass', () => {
	it('self always gets coral class regardless of rank', () => {
		expect(getMedalClass(1, true)).toContain('coral');
		expect(getMedalClass(5, true)).toContain('coral');
	});

	it('rank 1 (not self) gets amber/gold class', () => {
		expect(getMedalClass(1, false)).toContain('amber');
	});

	it('rank 2 (not self) gets slate/silver class', () => {
		expect(getMedalClass(2, false)).toContain('slate');
	});

	it('rank 3 (not self) gets orange/bronze class', () => {
		expect(getMedalClass(3, false)).toContain('orange');
	});

	it('rank 4+ (not self) gets default plain class', () => {
		const cls = getMedalClass(4, false);
		expect(cls).not.toContain('amber');
		expect(cls).not.toContain('slate');
		expect(cls).not.toContain('orange');
	});
});
