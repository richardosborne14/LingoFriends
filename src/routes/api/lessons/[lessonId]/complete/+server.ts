/**
 * POST /api/lessons/[lessonId]/complete
 *
 * Saves lesson completion results and awards SunDrops.
 * Updates: lesson_history, user_trees, profiles (streak/totals),
 *          daily_progress, chunk_library (SRS).
 *
 * Request body:
 *   {
 *     treeId: string,           // Which tree to water (userTrees.id)
 *     skillPathId: string,      // Required for lesson_history
 *     lessonIndex: number,      // Lesson number within skill path
 *     topic: string,            // Lesson topic label
 *     earnedSunDrops: number,   // SunDrops scored by the user
 *     totalSunDrops: number,    // Max possible SunDrops for this lesson
 *     accuracy: number,         // Fraction correct (0.0 to 1.0)
 *     durationSeconds?: number,
 *     activitiesCompleted?: number,
 *     activitiesTotal?: number,
 *     helpUsed?: number,
 *     personalContext?: string,
 *     chunkResults: Array<{     // Per-chunk SRS data
 *       targetPhrase: string,
 *       nativeTranslation: string,
 *       correct: boolean,
 *       wrongAttempts: number,
 *     }>
 *   }
 *
 * Response:
 *   200: { sunDropsAwarded, newStreak, starRating, growthStage }
 *   400: { error }
 *   401: { error: 'Unauthorised' }
 *
 * @module routes/api/lessons/[lessonId]/complete
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	profiles,
	lessonHistory,
	userTrees,
	chunkLibrary,
	dailyProgress,
} from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calculateStarRating, applyCap, calculateGrowthStage } from '$lib/server/lessons/sunDropService';
import { calculateSRSUpdate, calculateNewStreak, DEFAULT_EASE_FACTOR } from '$lib/server/lessons/srsService';

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const b = body as Record<string, unknown>;
	const lessonId = params.lessonId;
	const userId = locals.user.id;

	// Validate required fields
	if (typeof b.treeId !== 'string') error(400, 'treeId is required');
	if (typeof b.skillPathId !== 'string') error(400, 'skillPathId is required');
	if (typeof b.topic !== 'string') error(400, 'topic is required');
	if (typeof b.earnedSunDrops !== 'number') error(400, 'earnedSunDrops is required');
	if (typeof b.totalSunDrops !== 'number') error(400, 'totalSunDrops is required');
	if (typeof b.accuracy !== 'number') error(400, 'accuracy is required');
	if (!Array.isArray(b.chunkResults)) error(400, 'chunkResults is required');

	const requested = Math.max(0, Math.round(b.earnedSunDrops as number));
	const maxDrops = Math.max(0, Math.round(b.totalSunDrops as number));
	const accuracy = Math.min(1, Math.max(0, b.accuracy as number));
	const todayStr = new Date().toISOString().split('T')[0];

	// Load today's progress for the daily cap
	const [today] = await db
		.select({ sunDropsEarned: dailyProgress.sunDropsEarned })
		.from(dailyProgress)
		.where(and(eq(dailyProgress.userId, userId), eq(dailyProgress.date, todayStr)))
		.limit(1);

	const sunDropsToday = today?.sunDropsEarned ?? 0;
	const sunDropsAwarded = applyCap(requested, sunDropsToday);

	// Load profile for streak
	const [profile] = await db
		.select({ currentStreak: profiles.currentStreak, lastActivityDate: profiles.lastActivityDate })
		.from(profiles)
		.where(eq(profiles.userId, userId))
		.limit(1);

	if (!profile) error(404, 'Profile not found');

	const newStreak = calculateNewStreak(
		profile.currentStreak ?? 0,
		profile.lastActivityDate ? new Date(profile.lastActivityDate) : null
	);
	const starRating = calculateStarRating(requested, maxDrops);

	// Load tree for growth stage calc
	const [tree] = await db
		.select({ sunDropsEarned: userTrees.sunDropsEarned, growthStage: userTrees.growthStage })
		.from(userTrees)
		.where(and(eq(userTrees.id, b.treeId as string), eq(userTrees.userId, userId)))
		.limit(1);

	if (!tree) error(404, 'Tree not found');

	const newTreeSunDrops = (tree.sunDropsEarned ?? 0) + sunDropsAwarded;
	const growthStage = calculateGrowthStage(newTreeSunDrops);
	const now = new Date();

	// Parallel writes: profile, tree, lesson_history, daily_progress
	await Promise.all([
		db
			.update(profiles)
			.set({
				totalSunDrops: sql`${profiles.totalSunDrops} + ${sunDropsAwarded}`,
				currentStreak: newStreak,
				longestStreak: sql`GREATEST(${profiles.longestStreak}, ${newStreak})`,
				lastActivityDate: now,
				lessonsCompleted: sql`${profiles.lessonsCompleted} + 1`,
				updatedAt: now,
			})
			.where(eq(profiles.userId, userId)),

		db
			.update(userTrees)
			.set({
				sunDropsEarned: newTreeSunDrops,
				growthStage,
				lessonsCompleted: sql`${userTrees.lessonsCompleted} + 1`,
				lastRefreshDate: now,
				updatedAt: now,
			})
			.where(eq(userTrees.id, b.treeId as string)),

		db.insert(lessonHistory).values({
			userId,
			treeId: b.treeId as string,
			skillPathId: b.skillPathId as string,
			lessonIndex: typeof b.lessonIndex === 'number' ? b.lessonIndex : 0,
			topic: b.topic as string,
			sunDropsEarned: sunDropsAwarded,
			sunDropsMax: maxDrops,
			accuracy,
			starsEarned: starRating,
			timeSpentSeconds: typeof b.durationSeconds === 'number' ? Math.round(b.durationSeconds) : 0,
			activitiesCompleted: typeof b.activitiesCompleted === 'number' ? b.activitiesCompleted : 0,
			activitiesTotal: typeof b.activitiesTotal === 'number' ? b.activitiesTotal : 0,
			helpUsed: typeof b.helpUsed === 'number' ? b.helpUsed : 0,
			personalContext: typeof b.personalContext === 'string' ? b.personalContext : null,
			completedAt: now,
		}),

		// Upsert daily progress row
		db
			.insert(dailyProgress)
			.values({
				userId,
				date: todayStr,
				sunDropsEarned: sunDropsAwarded,
				lessonsCompleted: 1,
				activitiesCompleted: typeof b.activitiesCompleted === 'number' ? b.activitiesCompleted : 0,
				timeSpentSeconds: typeof b.durationSeconds === 'number' ? Math.round(b.durationSeconds) : 0,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: [dailyProgress.userId, dailyProgress.date],
				set: {
					sunDropsEarned: sql`${dailyProgress.sunDropsEarned} + ${sunDropsAwarded}`,
					lessonsCompleted: sql`${dailyProgress.lessonsCompleted} + 1`,
					updatedAt: now,
				},
			}),
	]);

	// Update SRS for each chunk (sequential — depends on existing row state)
	const chunkResults = b.chunkResults as Array<{
		targetPhrase: string;
		nativeTranslation: string;
		correct: boolean;
		wrongAttempts: number;
	}>;

	for (const result of chunkResults) {
		if (!result.targetPhrase) continue;

		const [existing] = await db
			.select({
				id: chunkLibrary.id,
				srsInterval: chunkLibrary.srsInterval,
				srsFactor: chunkLibrary.srsFactor,
				timesStudied: chunkLibrary.timesStudied,
				timesCorrect: chunkLibrary.timesCorrect,
			})
			.from(chunkLibrary)
			.where(and(eq(chunkLibrary.userId, userId), eq(chunkLibrary.targetPhrase, result.targetPhrase)))
			.limit(1);

		// Accuracy degrades by 20% per wrong attempt, minimum 0.5 if still correct
		const chunkAccuracy = result.correct
			? Math.max(0.5, 1.0 - result.wrongAttempts * 0.2)
			: 0.0;

		const srs = calculateSRSUpdate(
			existing?.srsInterval ?? 1,
			existing?.srsFactor ?? DEFAULT_EASE_FACTOR,
			chunkAccuracy,
			result.correct
		);

		if (existing) {
			await db
				.update(chunkLibrary)
				.set({
					srsInterval: srs.srsInterval,
					srsFactor: srs.srsFactor,
					nextReviewDate: srs.nextReviewDate,
					timesStudied: (existing.timesStudied ?? 0) + 1,
					timesCorrect: (existing.timesCorrect ?? 0) + (result.correct ? 1 : 0),
					lastStudied: now,
					updatedAt: now,
				})
				.where(eq(chunkLibrary.id, existing.id));
		}
	}

	return json({
		sunDropsAwarded,
		newStreak,
		starRating,
		growthStage,
		message:
			starRating === 3
				? `⭐⭐⭐ Amazing! You earned ${sunDropsAwarded} SunDrops!`
				: starRating === 2
					? `⭐⭐ Great work! ${sunDropsAwarded} SunDrops earned!`
					: `⭐ You earned ${sunDropsAwarded} SunDrops — keep going!`,
	});
};
