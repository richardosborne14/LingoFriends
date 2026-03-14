/**
 * Tests — Leaderboard Service (pure functions)
 *
 * All tests are pure unit tests — no DB, no network, no async.
 * Covers: entry ranking, week boundary calculation, entry builder.
 */

import { describe, it, expect } from 'vitest';
import {
	rankEntries,
	getWeekStart,
	formatDateForDB,
	buildLeaderboardEntry,
	type LeaderboardEntry,
} from '$lib/server/social/leaderboardService';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const AVATAR = {
	skinTone: '#F5D0A9',
	hairColor: '#4A3728',
	shirtColor: '#FF8A6A',
	hat: 'none' as const,
	gender: 'neutral' as const,
};

function makeEntry(
	displayName: string,
	sunDrops: number,
	isSelf = false
): LeaderboardEntry {
	return {
		userId: `user-${displayName.toLowerCase()}`,
		displayName,
		sunDrops,
		streak: 1,
		isSelf,
		avatarOptions: AVATAR,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// rankEntries
// ─────────────────────────────────────────────────────────────────────────────

describe('rankEntries — sorting', () => {
	it('sorts entries by sunDrops descending', () => {
		const entries = [
			makeEntry('Alice', 50),
			makeEntry('Bob', 120),
			makeEntry('Carol', 80),
		];
		const ranked = rankEntries(entries);
		expect(ranked[0].displayName).toBe('Bob');
		expect(ranked[1].displayName).toBe('Carol');
		expect(ranked[2].displayName).toBe('Alice');
	});

	it('assigns ranks starting at 1', () => {
		const entries = [makeEntry('A', 100), makeEntry('B', 50)];
		const ranked = rankEntries(entries);
		expect(ranked[0].rank).toBe(1);
		expect(ranked[1].rank).toBe(2);
	});

	it('handles a single entry with rank 1', () => {
		const ranked = rankEntries([makeEntry('Solo', 42)]);
		expect(ranked).toHaveLength(1);
		expect(ranked[0].rank).toBe(1);
	});

	it('returns empty array for empty input', () => {
		expect(rankEntries([])).toHaveLength(0);
	});

	it('preserves insertion order for tied entries (stable sort)', () => {
		// Two entries with identical sunDrops — order should be preserved
		const entries = [makeEntry('First', 100), makeEntry('Second', 100)];
		const ranked = rankEntries(entries);
		expect(ranked[0].displayName).toBe('First');
		expect(ranked[1].displayName).toBe('Second');
	});

	it('does NOT mutate the original array', () => {
		const entries = [makeEntry('A', 50), makeEntry('B', 100)];
		const original = [...entries];
		rankEntries(entries);
		expect(entries[0].displayName).toBe('A');
		expect(entries[1].displayName).toBe('B');
		// Confirm unchanged
		expect(entries.length).toBe(original.length);
	});
});

describe('rankEntries — isSelf flag preserved', () => {
	it('keeps isSelf=true on the self entry after sorting', () => {
		const entries = [
			makeEntry('Luna', 200, false),
			makeEntry('Me', 50, true),
			makeEntry('Max', 150, false),
		];
		const ranked = rankEntries(entries);
		const selfEntry = ranked.find((e) => e.isSelf);
		expect(selfEntry).toBeDefined();
		expect(selfEntry!.displayName).toBe('Me');
		// Self is last place in this case
		expect(selfEntry!.rank).toBe(3);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// getWeekStart
// ─────────────────────────────────────────────────────────────────────────────

describe('getWeekStart', () => {
	it('returns a Monday', () => {
		const monday = getWeekStart();
		// UTC day 1 = Monday
		expect(monday.getUTCDay()).toBe(1);
	});

	it('returns 00:00:00.000 UTC', () => {
		const monday = getWeekStart();
		expect(monday.getUTCHours()).toBe(0);
		expect(monday.getUTCMinutes()).toBe(0);
		expect(monday.getUTCSeconds()).toBe(0);
		expect(monday.getUTCMilliseconds()).toBe(0);
	});

	it('returns a date in the past or today (never future)', () => {
		const monday = getWeekStart();
		expect(monday.getTime()).toBeLessThanOrEqual(Date.now());
	});

	it('returns a date within the last 7 days', () => {
		const monday = getWeekStart();
		const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
		expect(monday.getTime()).toBeGreaterThan(sevenDaysAgo);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// formatDateForDB
// ─────────────────────────────────────────────────────────────────────────────

describe('formatDateForDB', () => {
	it('formats a known date correctly', () => {
		const date = new Date('2026-03-14T12:30:00.000Z');
		expect(formatDateForDB(date)).toBe('2026-03-14');
	});

	it('pads single-digit months and days', () => {
		const date = new Date('2026-01-05T00:00:00.000Z');
		expect(formatDateForDB(date)).toBe('2026-01-05');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildLeaderboardEntry
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PROFILE = {
	totalSunDrops: 420,
	currentStreak: 7,
	avatarSkinTone: '#F5D0A9',
	avatarHairColor: '#4A3728',
	avatarShirtColor: '#FF8A6A',
	avatarHat: 'none',
	avatarGender: 'neutral',
};

describe('buildLeaderboardEntry — period=week', () => {
	it('uses weeklySunDrops (not totalSunDrops) for the week period', () => {
		const entry = buildLeaderboardEntry(
			'user-1',
			'Luna',
			MOCK_PROFILE,
			55, // weekly
			'week',
			'other-user'
		);
		expect(entry.sunDrops).toBe(55);
	});

	it('marks isSelf=true when userId matches currentUserId', () => {
		const entry = buildLeaderboardEntry('user-1', 'Luna', MOCK_PROFILE, 55, 'week', 'user-1');
		expect(entry.isSelf).toBe(true);
	});

	it('marks isSelf=false when userId differs from currentUserId', () => {
		const entry = buildLeaderboardEntry('user-1', 'Luna', MOCK_PROFILE, 55, 'week', 'user-2');
		expect(entry.isSelf).toBe(false);
	});
});

describe('buildLeaderboardEntry — period=alltime', () => {
	it('uses totalSunDrops from profile for the alltime period', () => {
		const entry = buildLeaderboardEntry(
			'user-1',
			'Luna',
			MOCK_PROFILE,
			55, // weekly (ignored for alltime)
			'alltime',
			'other-user'
		);
		expect(entry.sunDrops).toBe(420); // profile.totalSunDrops
	});
});

describe('buildLeaderboardEntry — null safety', () => {
	const NULL_PROFILE = {
		totalSunDrops: null,
		currentStreak: null,
		avatarSkinTone: null,
		avatarHairColor: null,
		avatarShirtColor: null,
		avatarHat: null,
		avatarGender: null,
	};

	it('defaults streak to 0 when profile.currentStreak is null', () => {
		const entry = buildLeaderboardEntry('u', 'User', NULL_PROFILE, 0, 'week', 'other');
		expect(entry.streak).toBe(0);
	});

	it('defaults totalSunDrops to 0 for alltime when profile column is null', () => {
		const entry = buildLeaderboardEntry('u', 'User', NULL_PROFILE, 0, 'alltime', 'other');
		expect(entry.sunDrops).toBe(0);
	});

	it('defaults avatar fields to standard values when null', () => {
		const entry = buildLeaderboardEntry('u', 'User', NULL_PROFILE, 0, 'week', 'other');
		expect(entry.avatarOptions.skinTone).toBe('#F5D0A9');
		expect(entry.avatarOptions.hairColor).toBe('#4A3728');
	});
});
