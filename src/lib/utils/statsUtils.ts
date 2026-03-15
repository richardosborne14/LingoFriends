/**
 * LingoFriends V2 — Stats Utilities
 *
 * Pure helper functions for computing profile stats and achievement data.
 * All functions are side-effect-free — no DB, no Svelte stores.
 * Designed to be shared between server-side page loaders and client-side
 * derived state.
 *
 * @module utils/statsUtils
 */

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Achievement shape — used for profile page badge display.
 */
export interface Achievement {
	/** Short unique ID for CSS/keying */
	id: string;
	/** Display label shown inside the badge */
	label: string;
	/** Emoji icon */
	icon: string;
	/** Description shown in tooltip or detail view */
	description: string;
}

/**
 * All possible achievements and their unlock conditions.
 * Evaluated in getEarnedAchievements() against actual stats.
 *
 * Order matters: earlier items are "easier" — they appear first in the UI.
 */
const ACHIEVEMENT_DEFINITIONS: Array<Achievement & {
	/** Returns true if the achievement is earned given these stats */
	check: (stats: AchievementStats) => boolean;
}> = [
	{
		id: 'first_lesson',
		label: 'First Step',
		icon: '🌱',
		description: 'Completed your first lesson!',
		check: (s) => s.lessonsCompleted >= 1,
	},
	{
		id: 'first_tree',
		label: 'Tree Grower',
		icon: '🌳',
		description: 'Grew your first tree in the garden.',
		check: (s) => s.treesGrown >= 1,
	},
	{
		id: 'streak_3',
		label: '3-Day Streak',
		icon: '🔥',
		description: 'Learned 3 days in a row!',
		check: (s) => s.longestStreak >= 3,
	},
	{
		id: 'week_warrior',
		label: 'Week Warrior',
		icon: '⚔️',
		description: 'Learned every day for a week!',
		check: (s) => s.longestStreak >= 7,
	},
	{
		id: 'ten_lessons',
		label: '10 Lessons',
		icon: '📚',
		description: 'Completed 10 lessons.',
		check: (s) => s.lessonsCompleted >= 10,
	},
	{
		id: 'sundrops_100',
		label: 'SunDrop Collector',
		icon: '☀️',
		description: 'Earned 100 SunDrops total!',
		check: (s) => s.totalSunDrops >= 100,
	},
	{
		id: 'perfect_lesson',
		label: 'Perfect Score',
		icon: '⭐',
		description: 'Got 3 stars on a lesson.',
		check: (s) => s.perfectLessons >= 1,
	},
	{
		id: 'streak_30',
		label: 'Month Maestro',
		icon: '🏆',
		description: 'Learned every day for a month!',
		check: (s) => s.longestStreak >= 30,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT STATS SHAPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stats needed to evaluate all achievement conditions.
 * Loaded from the DB by the profile page server function.
 */
export interface AchievementStats {
	lessonsCompleted: number;
	longestStreak: number;
	totalSunDrops: number;
	treesGrown: number;
	perfectLessons: number;
}

/**
 * Returns the list of achievements the user has earned.
 *
 * @param stats - User's current stats
 * @returns Array of earned Achievement objects (may be empty)
 */
export function getEarnedAchievements(stats: AchievementStats): Achievement[] {
	return ACHIEVEMENT_DEFINITIONS
		.filter((def) => def.check(stats))
		.map(({ id, label, icon, description }) => ({ id, label, icon, description }));
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY LESSON CHART
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single day's bar in the weekly lesson count chart.
 */
export interface WeeklyBarDay {
	/** 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su' */
	label: string;
	/** ISO date string e.g. '2026-03-14' */
	date: string;
	/** Number of lessons on that day */
	count: number;
	/** Bar height as 0–100 percentage (relative to max day in the week) */
	heightPercent: number;
	/** Whether this is today */
	isToday: boolean;
}

/**
 * Builds the 7-day bar chart data for the profile page's weekly activity section.
 * Bars are scaled relative to the busiest day (max = 100%).
 *
 * @param lessonCountsByDate - Map of ISO date → lesson count
 * @param today - Injectable for testing
 * @returns Array of 7 WeeklyBarDay, Monday first
 */
export function buildWeeklyChart(
	lessonCountsByDate: Map<string, number>,
	today: Date = new Date()
): WeeklyBarDay[] {
	const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

	// Use UTC midnight throughout — toISOString() outputs UTC so we must use
	// UTC methods to avoid off-by-one date strings in UTC+ timezones.
	const todayMidnight = new Date(today);
	todayMidnight.setUTCHours(0, 0, 0, 0);

	// getUTCDay(): 0=Sunday, 1=Monday,...,6=Saturday
	const daysSinceMonday = (todayMidnight.getUTCDay() + 6) % 7;
	const monday = new Date(todayMidnight);
	monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);

	const todayStr = todayMidnight.toISOString().split('T')[0];

	// Build raw counts for all 7 days
	const days: Omit<WeeklyBarDay, 'heightPercent'>[] = Array.from({ length: 7 }, (_, i) => {
		const day = new Date(monday);
		day.setUTCDate(monday.getUTCDate() + i);
		const dateStr = day.toISOString().split('T')[0];

		return {
			label: DAY_LABELS[i],
			date: dateStr,
			count: lessonCountsByDate.get(dateStr) ?? 0,
			isToday: dateStr === todayStr,
		};
	});

	// Scale bar heights relative to busiest day (prevents all bars being tiny or huge)
	const maxCount = Math.max(...days.map((d) => d.count), 1); // min 1 prevents ÷0

	return days.map((day) => ({
		...day,
		heightPercent: Math.round((day.count / maxCount) * 100),
	}));
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL DISPLAY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps profile.level (internal string) to a display label.
 * Keeps the DB values stable while allowing friendlier UI text.
 *
 * @param level - Internal level string (e.g. 'total_beginner')
 * @returns Friendly display string (e.g. 'Total Beginner ⭐')
 */
export function getLevelDisplayLabel(level: string): string {
	const map: Record<string, string> = {
		total_beginner: 'Total Beginner ⭐',
		know_some_words: 'Know Some Words ⭐⭐',
		simple_sentences: 'Simple Sentences ⭐⭐⭐',
		can_have_conversations: 'Conversations ⭐⭐⭐⭐',
	};
	return map[level] ?? level;
}

/**
 * Calculates percentage towards the next lesson milestone (10, 25, 50, 100...)
 * for the profile stats progress bar.
 *
 * @param lessonsCompleted - Total lessons done
 * @returns { current, target, percent } — values for the progress bar
 */
export function getLessonProgressToNext(lessonsCompleted: number): {
	current: number;
	target: number;
	percent: number;
} {
	// Milestones at which we show "next goal" progress
	// Increasing intervals as the user advances (each milestone is harder)
	const MILESTONES = [5, 10, 25, 50, 100, 200, 500];

	const nextMilestone = MILESTONES.find((m) => m > lessonsCompleted) ?? null;

	if (!nextMilestone) {
		// Past all milestones — show 100% always
		return { current: lessonsCompleted, target: lessonsCompleted, percent: 100 };
	}

	// Find the previous milestone to base the progress bar from
	const prevMilestone =
		MILESTONES.filter((m) => m <= lessonsCompleted).pop() ?? 0;

	const range = nextMilestone - prevMilestone;
	const progress = lessonsCompleted - prevMilestone;
	const percent = Math.round((progress / range) * 100);

	return { current: lessonsCompleted, target: nextMilestone, percent };
}
