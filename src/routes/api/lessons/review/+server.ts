/**
 * GET /api/lessons/review?treeId=[id]
 *
 * Generates a review lesson from overdue SRS chunks for a given tree.
 *
 * This endpoint:
 *   1. Loads overdue chunks from chunk_library for the user's tree
 *   2. Calls buildReviewLesson() to assemble a LessonPlan
 *   3. Returns the plan as JSON (same shape as /api/lessons/generate)
 *
 * The review lesson page reuses the exact same /lesson/[id] route — the
 * LessonPlan.isReview flag tells the UI to show "Review" instead of "Lesson N".
 *
 * Query params:
 *   treeId: string (optional — defaults to user's first active tree)
 *
 * Response:
 *   200: { lesson: LessonPlan, overdueCount: number }
 *   401: { error: 'Unauthorised' }
 *   404: { error: 'No tree found' | 'No skill path found' }
 *
 * @module routes/api/lessons/review
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chunkLibrary, userTrees, skillPaths } from '$lib/server/db/schema';
import { eq, and, lte, isNotNull } from 'drizzle-orm';
import {
	buildReviewLesson,
	filterOverdueChunks,
	type ReviewChunk,
} from '$lib/services/reviewLessonBuilder';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	const userId = locals.user.id;
	const treeIdParam = url.searchParams.get('treeId');

	// ── Resolve the tree ────────────────────────────────────────────────────

	let resolvedTreeId: string;
	let treeName: string;

	if (treeIdParam) {
		// Client specified a tree — verify it belongs to this user.
		// Join skillPaths to get the human-readable tree/path name for the review lesson title.
		const [tree] = await db
			.select({ id: userTrees.id, pathName: skillPaths.name })
			.from(userTrees)
			.innerJoin(skillPaths, eq(userTrees.skillPathId, skillPaths.id))
			.where(and(eq(userTrees.id, treeIdParam), eq(userTrees.userId, userId)))
			.limit(1);

		if (!tree) error(404, 'Tree not found or not owned by user');
		resolvedTreeId = tree.id;
		treeName = tree.pathName ?? 'My Tree';
	} else {
		// Default: use the user's first active tree
		const [firstTree] = await db
			.select({ id: userTrees.id, pathName: skillPaths.name })
			.from(userTrees)
			.innerJoin(skillPaths, eq(userTrees.skillPathId, skillPaths.id))
			.where(eq(userTrees.userId, userId))
			.limit(1);

		if (!firstTree) error(404, 'No tree found for user');
		resolvedTreeId = firstTree.id;
		treeName = firstTree.pathName ?? 'My Tree';
	}

	// ── Load overdue chunks ─────────────────────────────────────────────────
	// Only fetch chunks with a past nextReviewDate (≤ today).
	// filterOverdueChunks() does the exact day comparison.

	const today = new Date();

	// Fetch all chunks for this user that have been studied (nextReviewDate set)
	// and are due on or before today. DB filter reduces the data scan.
	const rawChunks = await db
		.select({
			id: chunkLibrary.id,
			targetPhrase: chunkLibrary.targetPhrase,
			nativeTranslation: chunkLibrary.nativeTranslation,
			targetLanguage: chunkLibrary.targetLanguage,
			nativeLanguage: chunkLibrary.nativeLanguage,
			distractors: chunkLibrary.distractors,
			explanation: chunkLibrary.explanation,
			exampleSentence: chunkLibrary.exampleSentence,
			nextReviewDate: chunkLibrary.nextReviewDate,
		})
		.from(chunkLibrary)
		.where(
			and(
				eq(chunkLibrary.userId, userId),
				// Only chunks that have been studied (nextReviewDate is set)
				isNotNull(chunkLibrary.nextReviewDate),
				// DB-level filter: only fetch chunks due today or earlier
				lte(chunkLibrary.nextReviewDate, today)
			)
		);

	// ── Apply precise overdue filter ─────────────────────────────────────────
	// filterOverdueChunks() does exact day arithmetic and adds daysOverdue.
	// The DB lte() above is a pre-filter that reduces the result set.

	const overdueWithDays = filterOverdueChunks(rawChunks, today);

	// Cast to ReviewChunk shape (distractors may be null in DB — default to [])
	const reviewChunks: ReviewChunk[] = overdueWithDays.map((c) => ({
		id: c.id,
		targetPhrase: c.targetPhrase,
		nativeTranslation: c.nativeTranslation,
		targetLanguage: c.targetLanguage ?? 'unknown',
		nativeLanguage: c.nativeLanguage ?? 'unknown',
		distractors: (c.distractors as string[] | null) ?? [],
		explanation: c.explanation,
		exampleSentence: c.exampleSentence,
		daysOverdue: c.daysOverdue,
	}));

	// ── Build the review lesson plan ─────────────────────────────────────────

	const lesson = buildReviewLesson({
		treeId: resolvedTreeId,
		treeName,
		chunks: reviewChunks,
	});

	return json({
		lesson,
		overdueCount: reviewChunks.length,
		treeId: resolvedTreeId,
		treeName,
	});
};
