/**
 * Tests for src/lib/server/lessons/lessonValidator.ts
 *
 * The validator is pure — no mocks needed.
 * We construct minimal LessonPlan objects and check that errors are correct.
 */

import { describe, it, expect } from 'vitest';
import { validateLessonPlan, validateActivityConfig } from '$lib/server/lessons/lessonValidator';
import { assembleLessonPlan } from '$lib/server/lessons/lessonAssembler';
import { MOCK_CHUNK_FAMILY } from '$lib/server/ai/mock';
import { ActivityType } from '$lib/types/lesson';
import type { LessonPlan, LessonStep, InfoActivity, MultipleChoiceActivity } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — build minimal valid plan structures
// ─────────────────────────────────────────────────────────────────────────────

function makeInfoStep(targetPhrase: string, id = 'step-info'): LessonStep {
	const activity: InfoActivity = {
		type: ActivityType.INFO,
		targetPhrase,
		nativeTranslation: 'My name is Max',
		sunDrops: 0,
	};
	return { id, tutorText: 'Here is a phrase', helpText: 'Help text', activity, sunDrops: 0 };
}

function makeMCStep(targetPhrase: string, id = 'step-mc'): LessonStep {
	const activity: MultipleChoiceActivity = {
		type: ActivityType.MULTIPLE_CHOICE,
		question: 'What does it mean?',
		options: ['My name is Max', 'I am hungry', 'Good morning', 'Goodbye'],
		correctIndex: 0,
		targetPhrase,
		sunDrops: 1,
	};
	return { id, tutorText: 'Quiz time!', helpText: 'Help text', activity, sunDrops: 1 };
}

/** Build a minimal valid LessonPlan with just one INFO step */
function makeMinimalPlan(steps: LessonStep[], totalSunDrops?: number): LessonPlan {
	const computed = steps.reduce((sum, s) => sum + s.sunDrops, 0);
	return {
		id: 'test-id',
		title: 'Test Lesson',
		icon: '📖',
		steps,
		totalSunDrops: totalSunDrops ?? computed,
		chunkCount: 1,
	};
}

// ─────────────────────────────────────────────────────────────────────────────

describe('validateLessonPlan — assembled lessons pass', () => {
	it('a plan assembled from MOCK_CHUNK_FAMILY passes validation', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, 'test-lesson-id');
		const result = validateLessonPlan(plan);
		expect(result.errors).toEqual([]);
		expect(result.valid).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('validateLessonPlan — plan-level checks', () => {
	it('catches missing lesson ID', () => {
		const plan = makeMinimalPlan([makeInfoStep('Ich heiße Max')]);
		(plan as LessonPlan & { id: string }).id = '';
		const result = validateLessonPlan(plan);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('lesson ID'))).toBe(true);
	});

	it('catches missing lesson title', () => {
		const plan = makeMinimalPlan([makeInfoStep('Ich heiße Max')]);
		(plan as LessonPlan & { title: string }).title = '';
		const result = validateLessonPlan(plan);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('title'))).toBe(true);
	});

	it('catches empty steps array', () => {
		const plan = makeMinimalPlan([]);
		const result = validateLessonPlan(plan);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('no steps'))).toBe(true);
	});

	it('warns on very short lesson (< 5 steps)', () => {
		const plan = makeMinimalPlan([makeInfoStep('Ich heiße Max')]);
		const result = validateLessonPlan(plan);
		expect(result.warnings.some((w) => w.includes('steps'))).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('validateLessonPlan — teach-before-test', () => {
	it('catches quiz step before INFO step for same phrase', () => {
		// MC before INFO — violation
		const plan = makeMinimalPlan([
			makeMCStep('Ich heiße Max', 'mc-first'),
			makeInfoStep('Ich heiße Max', 'info-second'),
		]);
		const result = validateLessonPlan(plan);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('never introduced'))).toBe(true);
	});

	it('accepts quiz step AFTER INFO step for same phrase', () => {
		const plan = makeMinimalPlan([
			makeInfoStep('Ich heiße Max', 'info-first'),
			makeMCStep('Ich heiße Max', 'mc-second'),
		]);
		// May have warnings but no teach-before-test error
		const result = validateLessonPlan(plan);
		expect(result.errors.filter((e) => e.includes('never introduced'))).toHaveLength(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('validateLessonPlan — SunDrop total', () => {
	it('catches SunDrop total mismatch', () => {
		const steps = [makeInfoStep('Ich heiße Max'), makeMCStep('Ich heiße Max')];
		const plan = makeMinimalPlan(steps, 999); // Wrong total
		const result = validateLessonPlan(plan);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('SunDrop total mismatch'))).toBe(true);
	});

	it('passes when totalSunDrops matches step sum', () => {
		const steps = [makeInfoStep('Ich heiße Max'), makeMCStep('Ich heiße Max')];
		const plan = makeMinimalPlan(steps); // Computed automatically
		// teach-before-test passes because INFO is first
		const result = validateLessonPlan(plan);
		expect(result.errors.filter((e) => e.includes('SunDrop total'))).toHaveLength(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('validateActivityConfig — all 8 activity types', () => {
	it('INFO: catches missing targetPhrase', () => {
		const errs = validateActivityConfig(
			{ type: ActivityType.INFO, targetPhrase: '', nativeTranslation: 'val', sunDrops: 0 },
			0
		);
		expect(errs.some((e) => e.includes('targetPhrase'))).toBe(true);
	});

	it('INFO: catches missing nativeTranslation', () => {
		const errs = validateActivityConfig(
			{ type: ActivityType.INFO, targetPhrase: 'val', nativeTranslation: '', sunDrops: 0 },
			0
		);
		expect(errs.some((e) => e.includes('nativeTranslation'))).toBe(true);
	});

	it('MULTIPLE_CHOICE: catches missing question', () => {
		const errs = validateActivityConfig(
			{
				type: ActivityType.MULTIPLE_CHOICE,
				question: '',
				options: ['a', 'b'],
				correctIndex: 0,
				targetPhrase: 'x',
				sunDrops: 1,
			},
			0
		);
		expect(errs.some((e) => e.includes('question'))).toBe(true);
	});

	it('MULTIPLE_CHOICE: catches out-of-range correctIndex', () => {
		const errs = validateActivityConfig(
			{
				type: ActivityType.MULTIPLE_CHOICE,
				question: 'Q?',
				options: ['a', 'b'],
				correctIndex: 5, // out of range
				targetPhrase: 'x',
				sunDrops: 1,
			},
			0
		);
		expect(errs.some((e) => e.includes('correctIndex'))).toBe(true);
	});

	it('FILL_BLANK: catches missing ___', () => {
		const errs = validateActivityConfig(
			{
				type: ActivityType.FILL_BLANK,
				sentence: 'No blank here',
				correctAnswer: 'Max',
				targetPhrase: 'Ich heiße Max',
				sunDrops: 2,
			},
			0
		);
		expect(errs.some((e) => e.includes('___'))).toBe(true);
	});

	it('TRANSLATE: catches missing acceptedAnswers', () => {
		const errs = validateActivityConfig(
			{
				type: ActivityType.TRANSLATE,
				sourcePhrase: 'My name is Max',
				correctAnswer: 'Ich heiße Max',
				acceptedAnswers: [], // empty
				targetPhrase: 'Ich heiße Max',
				sunDrops: 3,
			},
			0
		);
		expect(errs.some((e) => e.includes('acceptedAnswers'))).toBe(true);
	});

	it('TRUE_FALSE: catches non-boolean isTrue', () => {
		const errs = validateActivityConfig(
			{
				type: ActivityType.TRUE_FALSE,
				question: 'Is this correct?',
				isTrue: 'yes' as unknown as boolean,
				sunDrops: 1,
			},
			0
		);
		expect(errs.some((e) => e.includes('isTrue'))).toBe(true);
	});

	it('WORD_ARRANGE: catches too few scrambledWords', () => {
		const errs = validateActivityConfig(
			{
				type: ActivityType.WORD_ARRANGE,
				targetSentence: 'Ich heiße Max',
				scrambledWords: ['Ich'], // only 1
				sunDrops: 2,
			},
			0
		);
		expect(errs.some((e) => e.includes('scrambledWords'))).toBe(true);
	});

	it('MATCHING: catches fewer than 2 pairs', () => {
		const errs = validateActivityConfig(
			{
				type: ActivityType.MATCHING,
				pairs: [{ left: 'a', right: 'b' }], // only 1 pair
				sunDrops: 3,
			},
			0
		);
		expect(errs.some((e) => e.includes('pairs'))).toBe(true);
	});

	it('COACHING_CHAT: catches missing coachingText', () => {
		const errs = validateActivityConfig(
			{
				type: ActivityType.COACHING_CHAT,
				coachingText: '',
				discoveryQuestion: 'What does it mean?',
				targetPhrase: 'Ich heiße Max',
				sunDrops: 0,
			},
			0
		);
		expect(errs.some((e) => e.includes('coachingText'))).toBe(true);
	});

	it('catches negative sunDrops', () => {
		const errs = validateActivityConfig(
			{ type: ActivityType.INFO, targetPhrase: 'x', nativeTranslation: 'y', sunDrops: -1 as 0 },
			0
		);
		expect(errs.some((e) => e.includes('sunDrops'))).toBe(true);
	});
});
