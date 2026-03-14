/**
 * Friends Service — Pure business logic for the social/friends system.
 *
 * All functions are pure (no DB calls) — DB queries happen in the API routes.
 * This keeps business rules testable without requiring a live database.
 *
 * ⚠️  CHILD SAFETY RULE: sanitizeFriendProfile() MUST be called before
 * returning any user data to the client. It strips all personal information
 * (email, age group, last activity timestamps, etc.) and returns ONLY what
 * is needed to render a friend card.
 *
 * @module server/social/friendsService
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Avatar fields that are safe to expose on a friend card */
export interface FriendAvatarOptions {
	skinTone: string;
	hairColor: string;
	shirtColor: string;
	hat: string;
	gender: string;
}

/**
 * The ONLY profile data a user is allowed to see about a friend.
 * No email, no age, no last activity date, no personal details.
 */
export interface SafeFriendProfile {
	userId: string;
	displayName: string;
	friendCode: string;
	streak: number;
	totalSunDrops: number;
	avatarOptions: FriendAvatarOptions;
}

/** Minimal friendship row — subset of DB columns needed for validation */
export interface FriendshipRow {
	id: string;
	userA: string;
	userB: string;
	/** Drizzle infers string | null because the column lacks .notNull() in schema.
	 *  Null is treated as "no known status" and won't match any status string. */
	status: string | null;
	initiatedBy: string;
}

/**
 * Result of a send-request validation check.
 * 'self' — can't add yourself.
 * 'duplicate_pending' — a pending request already exists between these users.
 * 'already_friends' — they're already accepted friends.
 * Rejected friendships ARE allowed to be re-requested (kids forgive and forget).
 */
export type RequestValidationResult =
	| { allowed: true }
	| { allowed: false; reason: 'self' | 'duplicate_pending' | 'already_friends' };

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates whether a friend request can be sent from userId to targetId.
 *
 * Checks (in order):
 *   1. Cannot add yourself
 *   2. No duplicate pending request (in either direction)
 *   3. No existing accepted friendship
 *
 * Rejected friendships are treated as "no relationship" — allowed to retry.
 */
export function canSendRequest(
	userId: string,
	targetId: string,
	existingRows: FriendshipRow[]
): RequestValidationResult {
	// Rule 1: Cannot add yourself — guard first for fast exit
	if (userId === targetId) {
		return { allowed: false, reason: 'self' };
	}

	// Find any existing relationship between these two users (either direction)
	const existing = existingRows.find(
		(row) =>
			(row.userA === userId && row.userB === targetId) ||
			(row.userA === targetId && row.userB === userId)
	);

	if (!existing) {
		// No relationship at all — allow the request
		return { allowed: true };
	}

	if (existing.status === 'accepted') {
		return { allowed: false, reason: 'already_friends' };
	}

	if (existing.status === 'pending') {
		return { allowed: false, reason: 'duplicate_pending' };
	}

	// Status is 'rejected' — they can try again
	return { allowed: true };
}

/**
 * Checks whether two users have an accepted bidirectional friendship.
 * Checks both column directions since friendships are stored as (userA, userB)
 * with no guaranteed ordering.
 */
export function isFriends(
	userId: string,
	otherId: string,
	rows: FriendshipRow[]
): boolean {
	return rows.some(
		(row) =>
			row.status === 'accepted' &&
			((row.userA === userId && row.userB === otherId) ||
				(row.userA === otherId && row.userB === userId))
	);
}

/**
 * Returns the IDs of accepted friends for a given user.
 * Handles both userA and userB positions.
 */
export function getFriendIds(userId: string, rows: FriendshipRow[]): string[] {
	return rows
		.filter(
			(row) =>
				row.status === 'accepted' &&
				(row.userA === userId || row.userB === userId)
		)
		.map((row) => (row.userA === userId ? row.userB : row.userA));
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY GUARD — MANDATORY before returning data to client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips all personal information from user/profile data.
 * Returns ONLY the minimal set of fields needed to render a friend card.
 *
 * Fields that are NEVER included (child safety):
 *   ✗ email
 *   ✗ password hash
 *   ✗ ageGroup
 *   ✗ lastActivityDate
 *   ✗ nativeLanguage / targetLanguage
 *   ✗ lessonsCompleted (gamification detail, not public)
 *   ✗ interests
 *
 * @param userId   The friend's user ID (safe — not personal data)
 * @param user     Raw user row from DB
 * @param profile  Raw profile row from DB
 */
export function sanitizeFriendProfile(
	userId: string,
	user: {
		displayName: string;
		friendCode: string;
	},
	profile: {
		totalSunDrops: number | null;
		currentStreak: number | null;
		avatarSkinTone: string | null;
		avatarHairColor: string | null;
		avatarShirtColor: string | null;
		avatarHat: string | null;
		avatarGender: string | null;
	}
): SafeFriendProfile {
	return {
		userId,
		displayName: user.displayName,
		friendCode: user.friendCode,
		streak: profile.currentStreak ?? 0,
		totalSunDrops: profile.totalSunDrops ?? 0,
		avatarOptions: {
			// Default avatar values match the profile table defaults
			skinTone: profile.avatarSkinTone ?? '#F5D0A9',
			hairColor: profile.avatarHairColor ?? '#4A3728',
			shirtColor: profile.avatarShirtColor ?? '#FF8A6A',
			hat: profile.avatarHat ?? 'none',
			gender: profile.avatarGender ?? 'neutral',
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD DISPLAY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the medal emoji for a leaderboard rank position.
 * Ranks 1–3 get medal emojis; all others get their rank number as a string.
 */
export function getMedalIcon(rank: number): string {
	if (rank === 1) return '🥇';
	if (rank === 2) return '🥈';
	if (rank === 3) return '🥉';
	return String(rank);
}

/**
 * Returns Tailwind CSS border+background class for a leaderboard rank.
 * Gold/silver/bronze for top 3; coral highlight for self; plain otherwise.
 *
 * @param rank    The position (1-based)
 * @param isSelf  Whether this entry is the current user
 */
export function getMedalClass(rank: number, isSelf = false): string {
	// Self always gets coral highlight regardless of rank
	if (isSelf) return 'bg-coral-50 border-coral-300';
	if (rank === 1) return 'bg-amber-50 border-amber-300';
	if (rank === 2) return 'bg-slate-50 border-slate-300';
	if (rank === 3) return 'bg-orange-50 border-orange-200';
	return 'bg-white border-bark-100';
}
