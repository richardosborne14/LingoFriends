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
	gifts,
	skillPaths,
} from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calculateStarRating, applyCap, calculateGrowthStage } from '$lib/server/lessons/sunDropService';
import { calculateSRSUpdate, calculateNewStreak, DEFAULT_EASE_FACTOR } from '$lib/server/lessons/srsService';
import { shouldEarnGift, selectRandomGift } from '$lib/server/social/giftService';

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

	// Validate fields sent by CompletionScreen
	if (typeof b.earnedSunDrops !== 'number') error(400, 'earnedSunDrops is required');
	if (typeof b.totalSunDrops !== 'number') error(400, 'totalSunDrops is required');
	if (typeof b.accuracy !== 'number') error(400, 'accuracy is required');
	if (!Array.isArray(b.chunkResults)) error(400, 'chunkResults is required');

	// treeId — client can pass it, or we auto-look up the user's first active tree.
	// This keeps the client simple and avoids threading treeId through the lesson UI.
	let resolvedTreeId: string;
	if (typeof b.treeId === 'string') {
		resolvedTreeId = b.treeId;
	} else {
		const [firstTree] = await db
			.select({ id: userTrees.id })
			.from(userTrees)
			.where(eq(userTrees.userId, userId))
			.limit(1);
		if (!firstTree) error(404, 'No tree found for user');
		resolvedTreeId = firstTree.id;
	}

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

	// Load tree for growth stage calc — use resolvedTreeId (auto-looked up above)
	const [tree] = await db
		.select({ sunDropsEarned: userTrees.sunDropsEarned, growthStage: userTrees.growthStage })
		.from(userTrees)
		.where(and(eq(userTrees.id, resolvedTreeId), eq(userTrees.userId, userId)))
		.limit(1);

	if (!tree) error(404, 'Tree not found');

	const newTreeSunDrops = (tree.sunDropsEarned ?? 0) + sunDropsAwarded;
	const growthStage = calculateGrowthStage(newTreeSunDrops);
	const now = new Date();

	// Critical writes — these MUST succeed for the completion to be valid.
	// Profile XP/streak, tree growth, and daily progress are separated from
	// lessonHistory because the history insert has a FK constraint on skillPathId
	// that may not always be satisfiable (lessons generated ad-hoc have no skill path).
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
			.where(eq(userTrees.id, resolvedTreeId)),

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

	// Non-critical write — lesson_history has a FK on skillPathId (references skill_paths.id).
	// Ad-hoc generated lessons don't have a skill path, so this may fail.
	// Fire-and-forget: log the error but never break lesson completion over it.
	// TODO: either make skillPathId nullable in schema or add a default 'general' skill path.
	try {
		// Look up an existing skill path for this tree, or fall back to any skill path
		const [anySkillPath] = await db
			.select({ id: skillPaths.id })
			.from(skillPaths)
			.limit(1);

		if (anySkillPath) {
			await db.insert(lessonHistory).values({
				userId,
				treeId: resolvedTreeId,
				skillPathId: anySkillPath.id,
				lessonIndex: typeof b.lessonIndex === 'number' ? b.lessonIndex : 0,
				topic: typeof b.topic === 'string' ? b.topic : lessonId,
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
			});
		}
	} catch (historyErr) {
		// Non-fatal — lesson history is nice-to-have, not required for XP/streak
		console.error('[complete] lesson_history insert failed (non-fatal):', historyErr);
	}

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

	// Award a gift to the player's inventory on a perfect 3-star completion.
	// Fire-and-forget — gift failure must NEVER break lesson completion.
	let giftEarned: string | null = null;
	if (shouldEarnGift(starRating)) {
		try {
			const giftType = selectRandomGift();
			await db.insert(gifts).values({
				fromUserId: userId,
				toUserId: userId,     // starts in OWN inventory
				giftType,
				status: 'inventory',
				targetTreeId: null,
			});
			giftEarned = giftType;
		} catch (giftErr) {
			// Log but don't fail the request — lesson completion is more important
			console.error('[complete] Gift award failed (non-fatal):', giftErr);
		}
	}

	return json({
		sunDropsAwarded,
		newStreak,
		starRating,
		growthStage,
		giftEarned,   // null or gift type string — client shows earn modal if set
		message:
			starRating === 3
				? `⭐⭐⭐ Amazing! You earned ${sunDropsAwarded} SunDrops!`
				: starRating === 2
					? `⭐⭐ Great work! ${sunDropsAwarded} SunDrops earned!`
					: `⭐ You earned ${sunDropsAwarded} SunDrops — keep going!`,
	});
};
