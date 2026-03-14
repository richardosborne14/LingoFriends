/**
 * POST /api/help/bug-report
 *
 * Saves a learner's bug report about a broken/incorrect activity.
 * The report is stored for admin review. The UI shows a reassuring message
 * immediately after submission ("Thanks! We'll fix it.").
 *
 * Request body:
 *   {
 *     lessonId: string,          // Current lesson plan ID
 *     activityType: string,      // e.g. 'multiple_choice'
 *     activityData: object,      // Full activity config snapshot
 *     reportType: string,        // 'wrong_translation' | 'nonsensical' | 'audio_problem' | 'other'
 *     userDescription?: string,  // Optional free text from learner
 *   }
 *
 * Response:
 *   201: { id: string, message: string }
 *   400: { error }
 *   401: Unauthorised
 *
 * @module routes/api/help/bug-report
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bugReports } from '$lib/server/db/schema';
import { validateBugReportType } from '$lib/services/helpAssistant';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth check — bug reports are tied to a user for admin review context
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

	// ── Validate required fields ───────────────────────────────────────────
	if (typeof b.lessonId !== 'string' || !b.lessonId.trim()) {
		error(400, 'lessonId is required');
	}
	if (typeof b.activityType !== 'string' || !b.activityType.trim()) {
		error(400, 'activityType is required');
	}
	if (typeof b.reportType !== 'string' || !validateBugReportType(b.reportType)) {
		error(400, 'reportType must be: wrong_translation | nonsensical | audio_problem | other');
	}

	// Sanitize optional description (max 500 chars to prevent abuse)
	const userDescription =
		typeof b.userDescription === 'string'
			? b.userDescription.trim().slice(0, 500) || null
			: null;

	// ── Insert bug report ──────────────────────────────────────────────────
	const [inserted] = await db
		.insert(bugReports)
		.values({
			userId: locals.user.id,
			lessonId: b.lessonId as string,
			activityType: b.activityType as string,
			// Store the full activity config as JSON for admin review
			// activityData is nullable — missing it shouldn't fail the report
			activityData: b.activityData ?? null,
			reportType: b.reportType as string,
			userDescription,
			status: 'new',
		})
		.returning({ id: bugReports.id });

	// Thank the learner — this message appears in the HelpPanel after submission
	return json(
		{
			id: inserted.id,
			message: `Thanks for letting us know! We'll look into it and fix it soon. Here's your next question!`,
		},
		{ status: 201 }
	);
};
