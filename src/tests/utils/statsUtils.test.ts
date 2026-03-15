/**
 * Tests for src/lib/utils/statsUtils.ts
 *
 * Pure functions — no mocks needed. Tests cover:
 * - getEarnedAchievements: unlock conditions
 * - buildWeeklyChart: bar heights and day labels
 * - getLevelDisplayLabel: mapping
 * - getLessonProgressToNext: milestone progress
 */

import { describe, it, expect } from 'vitest';
import {
	getEarnedAchievements,
	buildWeeklyChart,
	getLevelDisplayLabel,
	getLessonProgressToNext,
	type AchievementStats,
} from '$lib/utils/statsUtils';

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

const ZERO_STATS: AchievementStats = {
	lessonsCompleted: 0,
	longestStreak: 0,
	totalSunDrops: 0,
	treesGrown: 0,
	perfectLessons: 0,
};

describe('getEarnedAchievements', () => {
	it('returns empty array for a brand new user', () => {
		expect(getEarnedAchievements(ZERO_STATS)).toHaveLength(0);
	});

	it('unlocks First Step after 1 lesson', () => {
		const achievements = getEarnedAchievements({ ...ZERO_STATS, lessonsCompleted: 1 });
		const ids = achievements.map((a) => a.id);
		expect(ids).toContain('first_lesson');
	});

	it('unlocks Tree Grower after first tree', () => {
		const achievements = getEarnedAchievements({ ...ZERO_STATS, treesGrown: 1 });
		expect(achievements.map((a) => a.id)).toContain('first_tree');
	});

	it('unlocks streak achievements at correct thresholds', () => {
		const at3 = getEarnedAchievements({ ...ZERO_STATS, longestStreak: 3 });
		expect(at3.map((a) => a.id)).toContain('streak_3');

		const at7 = getEarnedAchievements({ ...ZERO_STATS, longestStreak: 7 });
		const ids7 = at7.map((a) => a.id);
		expect(ids7).toContain('streak_3');
		expect(ids7).toContain('week_warrior');
	});

	it('unlocks SunDrop Collector at 100 SunDrops', () => {
		const achievements = getEarnedAchievements({ ...ZERO_STATS, totalSunDrops: 100 });
		expect(achievements.map((a) => a.id)).toContain('sundrops_100');
	});

	it('does not unlock SunDrop Collector at 99', () => {
		const achievements = getEarnedAchievements({ ...ZERO_STATS, totalSunDrops: 99 });
		expect(achievements.map((a) => a.id)).not.toContain('sundrops_100');
	});

	it('all achievements have required fields', () => {
		const achievements = getEarnedAchievements({
			lessonsCompleted: 100,
			longestStreak: 100,
			totalSunDrops: 1000,
			treesGrown: 5,
			perfectLessons: 10,
		});
		for (const a of achievements) {
			expect(a.id).toBeTruthy();
			expect(a.label).toBeTruthy();
			expect(a.icon).toBeTruthy();
			expect(a.description).toBeTruthy();
		}
	});
});

// ─── WEEKLY CHART ──────────────────────────────────────────────────────────────

// Thursday 2026-03-12 for deterministic testing
const THURSDAY = new Date('2026-03-12T12:00:00.000Z');

describe('buildWeeklyChart', () => {
	it('returns 7 days', () => {
		expect(buildWeeklyChart(new Map(), THURSDAY)).toHaveLength(7);
	});

	it('starts on Monday of the current week', () => {
		const days = buildWeeklyChart(new Map(), THURSDAY);
		expect(days[0].label).toBe('Mo');
		expect(days[0].date).toBe('2026-03-09');
	});

	it('marks today correctly', () => {
		const days = buildWeeklyChart(new Map(), THURSDAY);
		const today = days.find((d) => d.isToday);
		expect(today?.label).toBe('Th');
	});

	it('sets count from the map', () => {
		const map = new Map([['2026-03-09', 3], ['2026-03-10', 1]]);
		const days = buildWeeklyChart(map, THURSDAY);
		expect(days[0].count).toBe(3); // Monday
		expect(days[1].count).toBe(1); // Tuesday
		expect(days[2].count).toBe(0); // Wednesday — not in map
	});

	it('scales bar heights relative to the busiest day', () => {
		const map = new Map([['2026-03-09', 4], ['2026-03-10', 2]]);
		const days = buildWeeklyChart(map, THURSDAY);
		// Monday (4) should be 100%, Tuesday (2) should be 50%
		expect(days[0].heightPercent).toBe(100);
		expect(days[1].heightPercent).toBe(50);
	});

	it('all days show 0% height when no lessons done', () => {
		// With no data, max = 1 (to prevent ÷0), so 0/1 = 0%
		const days = buildWeeklyChart(new Map(), THURSDAY);
		expect(days.every((d) => d.heightPercent === 0)).toBe(true);
	});
});

// ─── LEVEL DISPLAY ────────────────────────────────────────────────────────────

describe('getLevelDisplayLabel', () => {
	it('maps total_beginner to a friendly label', () => {
		expect(getLevelDisplayLabel('total_beginner')).toContain('Beginner');
	});

	it('maps can_have_conversations to a friendly label', () => {
		expect(getLevelDisplayLabel('can_have_conversations')).toContain('Conversation');
	});

	it('returns the raw string for unknown levels', () => {
		expect(getLevelDisplayLabel('some_unknown_level')).toBe('some_unknown_level');
	});
});

// ─── LESSON PROGRESS ─────────────────────────────────────────────────────────

describe('getLessonProgressToNext', () => {
	it('targets the first milestone (5) for 0 lessons', () => {
		const result = getLessonProgressToNext(0);
		expect(result.target).toBe(5);
		expect(result.percent).toBe(0);
	});

	it('shows 60% progress at 3 lessons towards 5', () => {
		const result = getLessonProgressToNext(3);
		expect(result.target).toBe(5);
		expect(result.percent).toBe(60);
	});

	it('shows 100% when at or past the highest milestone', () => {
		const result = getLessonProgressToNext(500);
		expect(result.percent).toBe(100);
	});

	it('advances to next milestone after passing one', () => {
		const result = getLessonProgressToNext(6);
		// Past 5, targeting 10. Progress = 1/5 = 20%
		expect(result.target).toBe(10);
		expect(result.percent).toBe(20);
	});
});
