/**
 * Tests — Gift Service (pure functions)
 *
 * All tests are pure unit tests — no DB, no network, no async.
 * Covers: earning, display helpers, application logic, and validation.
 */

import { describe, it, expect } from 'vitest';
import {
	shouldEarnGift,
	selectRandomGift,
	getGiftEmoji,
	getGiftDescription,
	getGiftBufferDays,
	getGiftName,
	calculateGiftEffect,
	canApplyGift,
	GIFT_TYPES,
	type GiftType,
	type TreeGiftFields,
} from '$lib/server/social/giftService';

// ─────────────────────────────────────────────────────────────────────────────
// shouldEarnGift
// ─────────────────────────────────────────────────────────────────────────────

describe('shouldEarnGift', () => {
	it('returns true for exactly 3 stars', () => {
		expect(shouldEarnGift(3)).toBe(true);
	});

	it('returns false for 2 stars', () => {
		expect(shouldEarnGift(2)).toBe(false);
	});

	it('returns false for 1 star', () => {
		expect(shouldEarnGift(1)).toBe(false);
	});

	it('returns false for 0 stars', () => {
		expect(shouldEarnGift(0)).toBe(false);
	});

	it('returns false for values above 3', () => {
		// Guard against unexpected values
		expect(shouldEarnGift(4)).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// selectRandomGift
// ─────────────────────────────────────────────────────────────────────────────

describe('selectRandomGift', () => {
	it('returns a valid gift type', () => {
		const result = selectRandomGift();
		expect(GIFT_TYPES).toContain(result);
	});

	it('returns all types eventually (probabilistic, 200 runs)', () => {
		// With 4 types and 200 runs, probability of missing any type ≈ 0.00000002%
		const seen = new Set<GiftType>();
		for (let i = 0; i < 200; i++) {
			seen.add(selectRandomGift());
		}
		expect(seen.size).toBe(4);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('getGiftEmoji', () => {
	it('water_drop → 💧', () => expect(getGiftEmoji('water_drop')).toBe('💧'));
	it('sparkle → ✨', () => expect(getGiftEmoji('sparkle')).toBe('✨'));
	it('seed → 🌱', () => expect(getGiftEmoji('seed')).toBe('🌱'));
	it('ribbon → 🎀', () => expect(getGiftEmoji('ribbon')).toBe('🎀'));
});

describe('getGiftName', () => {
	it('water_drop → Water Drop', () => expect(getGiftName('water_drop')).toBe('Water Drop'));
	it('sparkle → Sparkle', () => expect(getGiftName('sparkle')).toBe('Sparkle'));
	it('seed → Seed', () => expect(getGiftName('seed')).toBe('Seed'));
	it('ribbon → Ribbon', () => expect(getGiftName('ribbon')).toBe('Ribbon'));
});

describe('getGiftDescription', () => {
	it('returns a non-empty string for every type', () => {
		for (const type of GIFT_TYPES) {
			expect(getGiftDescription(type).length).toBeGreaterThan(0);
		}
	});
});

describe('getGiftBufferDays', () => {
	it('water_drop → 1 day', () => expect(getGiftBufferDays('water_drop')).toBe(1));
	it('sparkle → 3 days', () => expect(getGiftBufferDays('sparkle')).toBe(3));
	it('seed → 0 days (no decay effect)', () => expect(getGiftBufferDays('seed')).toBe(0));
	it('ribbon → 0 days (cosmetic only)', () => expect(getGiftBufferDays('ribbon')).toBe(0));
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateGiftEffect
// ─────────────────────────────────────────────────────────────────────────────

const BASE_TREE: TreeGiftFields = {
	giftBufferDays: 0,
	decorations: [],
};

const TREE_WITH_BUFFER: TreeGiftFields = {
	giftBufferDays: 2,
	decorations: [],
};

const TREE_WITH_DECO: TreeGiftFields = {
	giftBufferDays: 0,
	decorations: [{ type: 'ribbon', appliedAt: '2026-01-01T00:00:00.000Z' }],
};

describe('calculateGiftEffect — water_drop', () => {
	it('adds 1 buffer day to a tree with 0', () => {
		const result = calculateGiftEffect(BASE_TREE, 'water_drop');
		expect(result.treeUpdates.giftBufferDays).toBe(1);
	});

	it('adds 1 buffer day on top of existing buffer', () => {
		const result = calculateGiftEffect(TREE_WITH_BUFFER, 'water_drop');
		expect(result.treeUpdates.giftBufferDays).toBe(3);
	});

	it('has no profile updates', () => {
		const result = calculateGiftEffect(BASE_TREE, 'water_drop');
		expect(result.profileUpdates).toEqual({});
	});

	it('does not modify the input tree object', () => {
		calculateGiftEffect(TREE_WITH_BUFFER, 'water_drop');
		// Original tree should be untouched (pure function)
		expect(TREE_WITH_BUFFER.giftBufferDays).toBe(2);
	});
});

describe('calculateGiftEffect — sparkle', () => {
	it('adds 3 buffer days to a tree with 0', () => {
		const result = calculateGiftEffect(BASE_TREE, 'sparkle');
		expect(result.treeUpdates.giftBufferDays).toBe(3);
	});

	it('adds 3 buffer days on top of existing buffer', () => {
		const result = calculateGiftEffect(TREE_WITH_BUFFER, 'sparkle');
		expect(result.treeUpdates.giftBufferDays).toBe(5);
	});

	it('has no profile updates', () => {
		const result = calculateGiftEffect(BASE_TREE, 'sparkle');
		expect(result.profileUpdates).toEqual({});
	});
});

describe('calculateGiftEffect — seed', () => {
	it('returns seedsDelta of 1', () => {
		const result = calculateGiftEffect(BASE_TREE, 'seed');
		expect(result.profileUpdates.seedsDelta).toBe(1);
	});

	it('has no tree updates', () => {
		const result = calculateGiftEffect(BASE_TREE, 'seed');
		expect(result.treeUpdates).toEqual({});
	});
});

describe('calculateGiftEffect — ribbon', () => {
	it('appends a ribbon decoration to an empty decorations array', () => {
		const FIXED_TIME = '2026-03-14T12:00:00.000Z';
		const result = calculateGiftEffect(BASE_TREE, 'ribbon', FIXED_TIME);
		expect(result.treeUpdates.decorations).toHaveLength(1);
		expect(result.treeUpdates.decorations![0]).toEqual({
			type: 'ribbon',
			appliedAt: FIXED_TIME,
		});
	});

	it('preserves existing decorations when adding a new ribbon', () => {
		const FIXED_TIME = '2026-03-14T12:00:00.000Z';
		const result = calculateGiftEffect(TREE_WITH_DECO, 'ribbon', FIXED_TIME);
		expect(result.treeUpdates.decorations).toHaveLength(2);
		expect(result.treeUpdates.decorations![0].type).toBe('ribbon');
		expect(result.treeUpdates.decorations![1].type).toBe('ribbon');
	});

	it('has no profile updates', () => {
		const result = calculateGiftEffect(BASE_TREE, 'ribbon');
		expect(result.profileUpdates).toEqual({});
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// canApplyGift
// ─────────────────────────────────────────────────────────────────────────────

describe('canApplyGift', () => {
	const userId = 'user-abc';

	it('allows applying a pending gift owned by the user', () => {
		const gift = { id: 'gift-1', toUserId: userId, status: 'pending' };
		expect(canApplyGift(gift, userId).allowed).toBe(true);
	});

	it('allows applying an inventory gift owned by the user', () => {
		const gift = { id: 'gift-1', toUserId: userId, status: 'inventory' };
		expect(canApplyGift(gift, userId).allowed).toBe(true);
	});

	it('blocks applying a gift that belongs to someone else', () => {
		const gift = { id: 'gift-1', toUserId: 'other-user', status: 'pending' };
		const result = canApplyGift(gift, userId);
		expect(result.allowed).toBe(false);
		expect(result.reason).toMatch(/someone else/i);
	});

	it('blocks double-applying an already-applied gift', () => {
		const gift = { id: 'gift-1', toUserId: userId, status: 'applied' };
		const result = canApplyGift(gift, userId);
		expect(result.allowed).toBe(false);
		expect(result.reason).toMatch(/already been used/i);
	});

	it('blocks applying an expired gift', () => {
		const gift = { id: 'gift-1', toUserId: userId, status: 'expired' };
		const result = canApplyGift(gift, userId);
		expect(result.allowed).toBe(false);
		expect(result.reason).toMatch(/expired/i);
	});
});
