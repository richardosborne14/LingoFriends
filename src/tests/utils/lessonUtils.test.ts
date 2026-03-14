/**
 * Tests for src/lib/utils/lessonUtils.ts
 *
 * Pure functions for lesson UI display logic:
 *   - extractPreviewPhrases()
 *   - nextLoadingStage()
 *   - LOADING_STAGES constants
 */

import { describe, it, expect } from 'vitest';
import {
	extractPreviewPhrases,
	nextLoadingStage,
	LOADING_STAGES,
	LOADING_STAGE_COUNT,
	MAX_PREVIEW_PHRASES,
} from '$lib/utils/lessonUtils';
import { ActivityType } from '$lib/types/lesson';
import type { LessonPlan, LessonStep } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

/** Helper: creates an INFO step */
function makeInfoStep(id: string, phrase: string, translation: string): LessonStep {
	return {
		id,
		tutorText: 'Learn this',
		helpText: 'Hint',
		sunDrops: 0,
		activity: {
			type: ActivityType.INFO,
			targetPhrase: phrase,
			nativeTranslation: translation,
			sunDrops: 0,
		},
	};
}

/** Helper: creates a non-INFO step (multiple choice) */
function makeQuizStep(id: string, phrase: string): LessonStep {
	return {
		id,
		tutorText: 'Try this',
		helpText: 'Hint',
		sunDrops: 3,
		activity: {
			type: ActivityType.MULTIPLE_CHOICE,
			question: `What does "${phrase}" mean?`,
			options: ['A', 'B', 'C', 'D'],
			correctIndex: 0,
			targetPhrase: phrase,
			sunDrops: 3,
		},
	};
}

/** Creates a minimal valid LessonPlan */
function makePlan(steps: LessonStep[]): LessonPlan {
	return {
		id: 'test-plan',
		title: 'Test',
		icon: '🌱',
		steps,
		totalSunDrops: 12,
		chunkCount: 2,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// extractPreviewPhrases
// ─────────────────────────────────────────────────────────────────────────────

describe('extractPreviewPhrases()', () => {
	it('returns empty array when plan has no steps', () => {
		const plan = makePlan([]);
		expect(extractPreviewPhrases(plan)).toEqual([]);
	});

	it('returns empty array when plan has only non-INFO steps', () => {
		const plan = makePlan([
			makeQuizStep('q1', 'Hallo'),
			makeQuizStep('q2', 'Danke'),
		]);
		expect(extractPreviewPhrases(plan)).toEqual([]);
	});

	it('extracts phrase and translation from a single INFO step', () => {
		const plan = makePlan([makeInfoStep('i1', 'Hallo', 'Hello')]);
		expect(extractPreviewPhrases(plan)).toEqual([
			{ phrase: 'Hallo', translation: 'Hello' },
		]);
	});

	it('extracts phrases from multiple INFO steps', () => {
		const plan = makePlan([
			makeInfoStep('i1', 'Hallo', 'Hello'),
			makeInfoStep('i2', 'Danke', 'Thank you'),
		]);
		const result = extractPreviewPhrases(plan);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ phrase: 'Hallo', translation: 'Hello' });
		expect(result[1]).toEqual({ phrase: 'Danke', translation: 'Thank you' });
	});

	it('deduplicates when the same phrase appears in multiple INFO steps', () => {
		const plan = makePlan([
			makeInfoStep('i1', 'Hallo', 'Hello'),
			makeInfoStep('i2', 'Hallo', 'Hello again'), // duplicate phrase
		]);
		const result = extractPreviewPhrases(plan);
		// Only the first occurrence should be included
		expect(result).toHaveLength(1);
		expect(result[0].phrase).toBe('Hallo');
		expect(result[0].translation).toBe('Hello'); // first translation wins
	});

	it('skips non-INFO steps between INFO steps', () => {
		const plan = makePlan([
			makeInfoStep('i1', 'Hallo', 'Hello'),
			makeQuizStep('q1', 'Hallo'),
			makeInfoStep('i2', 'Danke', 'Thank you'),
			makeQuizStep('q2', 'Danke'),
		]);
		const result = extractPreviewPhrases(plan);
		expect(result).toHaveLength(2);
		expect(result.map((p) => p.phrase)).toEqual(['Hallo', 'Danke']);
	});

	it(`caps at MAX_PREVIEW_PHRASES (${MAX_PREVIEW_PHRASES}) even with more INFO steps`, () => {
		// Create more INFO steps than the max
		const steps = Array.from({ length: MAX_PREVIEW_PHRASES + 3 }, (_, i) =>
			makeInfoStep(`i${i}`, `Phrase ${i}`, `Translation ${i}`)
		);
		const plan = makePlan(steps);
		const result = extractPreviewPhrases(plan);
		expect(result).toHaveLength(MAX_PREVIEW_PHRASES);
	});

	it('returns phrases in order of first appearance', () => {
		const phrases = ['Hallo', 'Tschüss', 'Danke'];
		const plan = makePlan(
			phrases.map((p, i) => makeInfoStep(`i${i}`, p, `trans-${i}`))
		);
		const result = extractPreviewPhrases(plan);
		expect(result.map((r) => r.phrase)).toEqual(phrases);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// nextLoadingStage
// ─────────────────────────────────────────────────────────────────────────────

describe('nextLoadingStage()', () => {
	it('advances from 0 to 1', () => {
		expect(nextLoadingStage(0)).toBe(1);
	});

	it('advances from 1 to 2', () => {
		expect(nextLoadingStage(1)).toBe(2);
	});

	it('clamps at last stage index (does not wrap)', () => {
		const lastIndex = LOADING_STAGE_COUNT - 1;
		expect(nextLoadingStage(lastIndex)).toBe(lastIndex);
	});

	it('clamps even if called with an out-of-range high value', () => {
		const lastIndex = LOADING_STAGE_COUNT - 1;
		expect(nextLoadingStage(99)).toBe(lastIndex);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// LOADING_STAGES constant
// ─────────────────────────────────────────────────────────────────────────────

describe('LOADING_STAGES constant', () => {
	it('has at least 2 stages', () => {
		expect(LOADING_STAGES.length).toBeGreaterThanOrEqual(2);
	});

	it('every stage has an emoji and text', () => {
		for (const stage of LOADING_STAGES) {
			expect(stage.emoji).toBeTruthy();
			expect(stage.text).toBeTruthy();
		}
	});

	it('LOADING_STAGE_COUNT matches actual array length', () => {
		expect(LOADING_STAGE_COUNT).toBe(LOADING_STAGES.length);
	});

	it('last stage text conveys "almost ready" meaning', () => {
		// The last stage should reassure the learner generation is finishing
		const lastStage = LOADING_STAGES[LOADING_STAGES.length - 1];
		expect(lastStage.text.toLowerCase()).toMatch(/almost|ready|soon/);
	});
});
