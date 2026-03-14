/**
 * LingoFriends V2 — Lesson UI Utilities
 *
 * Pure functions extracted from lesson components so they can be unit-tested
 * independently of the Svelte rendering environment.
 *
 * Keeping display-logic here prevents bloat in component scripts and makes
 * the behaviour explicit and verifiable.
 *
 * @module utils/lessonUtils
 */

import { ActivityType } from '$lib/types/lesson';
import type { LessonPlan } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// LOADING STAGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Messages and emojis to cycle through on the loading screen.
 * Shown while the AI generates the lesson (~5-10 seconds).
 * Each stage advances every 2 seconds until generation completes.
 *
 * The progression is designed to feel like meaningful work:
 * thinking → creating → sounds → ready.
 */
export const LOADING_STAGES = [
	{ emoji: '🌱', text: 'Thinking about what to teach you…' },
	{ emoji: '✨', text: 'Crafting your activities…' },
	{ emoji: '🎵', text: 'Preparing the sounds…' },
	{ emoji: '🌿', text: 'Almost ready…' },
] as const;

/** How long each loading stage is shown (milliseconds) */
export const LOADING_STAGE_INTERVAL_MS = 2000;

/** Maximum number of loading stages (clamp index at this - 1) */
export const LOADING_STAGE_COUNT = LOADING_STAGES.length;

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW PHRASES EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a phrase entry for the "What you'll learn" preview list.
 */
export interface PreviewPhrase {
	phrase: string;
	translation: string;
}

/**
 * Maximum phrases shown on the lesson preview screen.
 * Cap at 4 to avoid overwhelming learners before they start.
 *
 * WHY 4: Early studies on cognitive load suggest 3-5 items is the sweet
 * spot for a pre-lesson overview. 4 gives a preview without spoiling everything.
 */
export const MAX_PREVIEW_PHRASES = 4;

/**
 * Extracts unique target phrases from INFO (INTRODUCE) steps.
 * Used by LessonLoading to render the "What you'll learn" list.
 *
 * Deduplicates by targetPhrase — if the same phrase appears in multiple
 * INFO steps, only the first occurrence is included.
 *
 * Returns empty array when the plan has no INFO steps (graceful — the
 * preview screen still renders without the phrase list).
 *
 * @param plan - The fully assembled lesson plan
 * @returns Array of phrase/translation pairs (max MAX_PREVIEW_PHRASES)
 */
export function extractPreviewPhrases(plan: LessonPlan): PreviewPhrase[] {
	const seen = new Set<string>();
	const result: PreviewPhrase[] = [];

	for (const step of plan.steps) {
		// Only INFO steps introduce new phrases worth previewing
		if (step.activity.type !== ActivityType.INFO) continue;

		const phrase = step.activity.targetPhrase;

		// Skip duplicates — same phrase may appear in multiple chunks
		if (seen.has(phrase)) continue;
		seen.add(phrase);

		result.push({
			phrase,
			translation: step.activity.nativeTranslation,
		});

		// Hard cap: stop after MAX_PREVIEW_PHRASES
		if (result.length >= MAX_PREVIEW_PHRASES) break;
	}

	return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING STAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advances the loading stage index by 1, clamping at the last stage.
 *
 * WHY clamp instead of wrap: we want the last message ("Almost ready…")
 * to persist if generation takes longer than expected. Looping back to
 * "Thinking…" after 8 seconds would feel wrong.
 *
 * @param current - Current stage index
 * @returns Next stage index (clamped at LOADING_STAGE_COUNT - 1)
 */
export function nextLoadingStage(current: number): number {
	return Math.min(current + 1, LOADING_STAGE_COUNT - 1);
}
