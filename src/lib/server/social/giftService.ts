/**
 * Gift Service — Pure business logic for the gift system.
 *
 * NO DB calls in this file. All functions are pure and deterministically testable.
 * DB operations happen in the API route handlers.
 *
 * Gift types (aligned with schema's giftBufferDays + decorations columns):
 *   water_drop  — adds 1 buffer day to tree health decay timer
 *   sparkle     — adds 3 buffer days to tree health decay timer
 *   seed        — grants +1 seedsAvailable on the recipient's profile
 *   ribbon      — cosmetic decoration appended to tree.decorations array
 *
 * Status lifecycle in the gifts DB table:
 *   'inventory'  → earned by the owner, not yet sent
 *   'pending'    → sent to a friend, waiting for them to apply
 *   'applied'    → gift effect has been applied to a tree
 *   'expired'    → gift was never used (future: auto-expire after N days)
 *
 * @module server/social/giftService
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** All valid gift type identifiers */
export const GIFT_TYPES = ['water_drop', 'sparkle', 'seed', 'ribbon'] as const;
export type GiftType = (typeof GIFT_TYPES)[number];

/** Minimum tree fields needed to calculate gift application */
export interface TreeGiftFields {
	giftBufferDays: number;
	decorations: { type: string; appliedAt: string }[];
}

/**
 * Delta result returned by calculateGiftEffect().
 * Caller applies these updates to the DB — nothing is mutated here.
 */
export interface GiftEffectResult {
	/** Fields to SET on the user_trees row (only populated fields change) */
	treeUpdates: {
		giftBufferDays?: number;
		decorations?: { type: string; appliedAt: string }[];
	};
	/** Fields to change on the profiles row */
	profileUpdates: {
		/** How many seeds to ADD to seedsAvailable (always +1 for seed type) */
		seedsDelta?: number;
	};
}

/** Minimal gift row needed for ownership/status validation */
export interface GiftRow {
	id: string;
	toUserId: string;
	/** Drizzle infers string | null because the column lacks .notNull() in schema.
	 *  Null is treated as no-status and blocks application (safe default). */
	status: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EARNING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines whether a gift should be awarded based on star rating.
 * Gifts are earned only on perfect 3-star completions — keeps them special
 * and rewards accuracy rather than just finishing.
 */
export function shouldEarnGift(starsEarned: number): boolean {
	return starsEarned === 3;
}

/**
 * Selects a random gift type from the pool.
 * Uniform distribution (25% each) in Phase 5 — no rarity weighting yet.
 *
 * Math.random() is fine here; gifts are not security-sensitive.
 */
export function selectRandomGift(): GiftType {
	const index = Math.floor(Math.random() * GIFT_TYPES.length);
	return GIFT_TYPES[index];
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the emoji for a gift type.
 * Used in earn modals, friend pickers, and the gift inventory.
 */
export function getGiftEmoji(type: GiftType): string {
	const MAP: Record<GiftType, string> = {
		water_drop: '💧',
		sparkle: '✨',
		seed: '🌱',
		ribbon: '🎀',
	};
	return MAP[type];
}

/**
 * Returns a kid-friendly description of what the gift does.
 * Shown in the earn modal and inventory list.
 */
export function getGiftDescription(type: GiftType): string {
	const MAP: Record<GiftType, string> = {
		water_drop: "Keeps a friend's tree healthy for 1 extra day!",
		sparkle: "Keeps a friend's tree sparkling for 3 extra days!",
		seed: 'Lets a friend plant a brand new tree! 🌳',
		ribbon: "A pretty decoration for a friend's tree! 🎀",
	};
	return MAP[type];
}

/**
 * Returns the number of health buffer days this gift type adds to a tree.
 * Buffer days delay the tree health decay timer.
 * Returns 0 for types that don't affect health (seed, ribbon).
 */
export function getGiftBufferDays(type: GiftType): number {
	const MAP: Record<GiftType, number> = {
		water_drop: 1,
		sparkle: 3,
		seed: 0,
		ribbon: 0,
	};
	return MAP[type];
}

/**
 * Returns a display name for the gift type.
 * Used in notifications: "{Name} sent you a Water Drop! 💧"
 */
export function getGiftName(type: GiftType): string {
	const MAP: Record<GiftType, string> = {
		water_drop: 'Water Drop',
		sparkle: 'Sparkle',
		seed: 'Seed',
		ribbon: 'Ribbon',
	};
	return MAP[type];
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the effect of applying a gift to a tree.
 * Returns a delta object — the caller applies updates to the DB.
 *
 * Pure function: does NOT mutate the tree argument, does NOT call the DB.
 *
 * @param tree      Current tree state (giftBufferDays + decorations)
 * @param giftType  The gift being applied
 * @param now       ISO timestamp for decoration records (injectable for testing)
 */
export function calculateGiftEffect(
	tree: TreeGiftFields,
	giftType: GiftType,
	now: string = new Date().toISOString()
): GiftEffectResult {
	switch (giftType) {
		case 'water_drop':
			// Add 1 buffer day — delays health decay by 1 day
			return {
				treeUpdates: { giftBufferDays: tree.giftBufferDays + 1 },
				profileUpdates: {},
			};

		case 'sparkle':
			// Add 3 buffer days — a premium delay to health decay
			return {
				treeUpdates: { giftBufferDays: tree.giftBufferDays + 3 },
				profileUpdates: {},
			};

		case 'seed':
			// Seeds don't affect the tree — they go to the profile instead
			// The API route handles the profile.seedsAvailable increment
			return {
				treeUpdates: {},
				profileUpdates: { seedsDelta: 1 },
			};

		case 'ribbon':
			// Cosmetic decoration — no gameplay effect, just pretty 🎀
			return {
				treeUpdates: {
					decorations: [...tree.decorations, { type: 'ribbon', appliedAt: now }],
				},
				profileUpdates: {},
			};
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that a user is allowed to apply a given gift.
 *
 * Protects against:
 *   - Applying a gift that belongs to someone else
 *   - Double-applying an already-used gift
 *   - Using an expired gift
 */
export function canApplyGift(
	gift: GiftRow,
	userId: string
): { allowed: boolean; reason?: string } {
	if (gift.toUserId !== userId) {
		return { allowed: false, reason: 'This gift belongs to someone else' };
	}
	if (gift.status === 'applied') {
		return { allowed: false, reason: 'This gift has already been used' };
	}
	if (gift.status === 'expired') {
		return { allowed: false, reason: 'This gift has expired' };
	}
	return { allowed: true };
}
