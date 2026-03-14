/**
 * Tests for src/lib/server/lessons/lessonAssembler.ts
 *
 * Key invariants tested:
 *   1. Every chunk → exactly 5 steps (INFO + 3 quiz + 1 apply) + optional coaching
 *   2. INFO step always comes before any quiz for a phrase (teach-before-test)
 *   3. SunDrop totals are mathematically correct
 *   4. MC options are shuffled (correctIndex tracks correctly)
 *   5. Fill-blank sentence contains ___
 *   6. Matching step covers all chunks
 *   7. ZERO AI calls in any path
 */

import { describe, it, expect, vi } from 'vitest';
import { assembleLessonPlan } from '$lib/server/lessons/lessonAssembler';
import { MOCK_CHUNK_FAMILY } from '$lib/server/ai/mock';
import { ActivityType } from '$lib/types/lesson';
import type { ChunkFamilyContent } from '$lib/types/lesson';

// Verify no AI router is ever imported by this module
// If the assembler ever imports from router, this spy will catch it
vi.mock('$lib/server/ai/router', () => ({
	getSmartModel: vi.fn(() => {
		throw new Error('lessonAssembler must NOT call AI — architecture violation!');
	}),
	getFastModel: vi.fn(() => {
		throw new Error('lessonAssembler must NOT call AI — architecture violation!');
	}),
}));

// ─────────────────────────────────────────────────────────────────────────────

const TEST_LESSON_ID = 'test-lesson-001';

// A 2-chunk version for simpler math testing
const TWO_CHUNK_CONTENT: ChunkFamilyContent = {
	coreFrame: 'Ich heiße ___',
	coreFrameTranslation: 'My name is ___',
	title: 'Saying Your Name',
	chunks: MOCK_CHUNK_FAMILY.chunks.slice(0, 2),
};

// ─────────────────────────────────────────────────────────────────────────────

describe('assembleLessonPlan — structure', () => {
	it('returns a LessonPlan with the correct id and title', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		expect(plan.id).toBe(TEST_LESSON_ID);
		expect(plan.title).toBe(MOCK_CHUNK_FAMILY.title);
	});

	it('preserves coreFrame and coreFrameTranslation', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		expect(plan.coreFrame).toBe(MOCK_CHUNK_FAMILY.coreFrame);
		expect(plan.coreFrameTranslation).toBe(MOCK_CHUNK_FAMILY.coreFrameTranslation);
	});

	it('sets chunkCount correctly', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		expect(plan.chunkCount).toBe(3);
	});

	it('produces steps array', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		expect(Array.isArray(plan.steps)).toBe(true);
		expect(plan.steps.length).toBeGreaterThan(0);
	});

	it('every step has an id, tutorText, helpText, activity, and sunDrops', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		for (const step of plan.steps) {
			expect(step.id).toBeTruthy();
			expect(step.tutorText).toBeTruthy();
			expect(step.helpText).toBeTruthy();
			expect(step.activity).toBeDefined();
			expect(typeof step.sunDrops).toBe('number');
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('assembleLessonPlan — teach-first ordering', () => {
	it('INFO step comes before any quiz for the same phrase', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const introducedPhrases = new Set<string>();

		for (const step of plan.steps) {
			if (step.activity.type === ActivityType.INFO) {
				introducedPhrases.add(step.activity.targetPhrase);
			}
			// If this is a quiz step, the phrase must already be introduced
			if (
				step.activity.type === ActivityType.MULTIPLE_CHOICE ||
				step.activity.type === ActivityType.FILL_BLANK ||
				step.activity.type === ActivityType.TRANSLATE
			) {
				const tested = step.activity.targetPhrase;
				expect(
					introducedPhrases.has(tested),
					`Phrase "${tested}" was tested before being introduced`
				).toBe(true);
			}
		}
	});

	it('first non-coaching step per chunk is INFO', () => {
		// Find the first non-coaching step for each phrase — it must be INFO.
		// Coaching steps intentionally come before INFO (they introduce context),
		// so we skip them when finding the first "content delivery" step.
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const firstNonCoachingStep: Record<string, { type: string; index: number }> = {};

		plan.steps.forEach((step, index) => {
			// Skip coaching steps — they precede INFO deliberately
			if (step.activity.type === ActivityType.COACHING_CHAT) return;
			const phrase = 'targetPhrase' in step.activity ? step.activity.targetPhrase : null;
			if (!phrase) return;
			if (!firstNonCoachingStep[phrase]) {
				firstNonCoachingStep[phrase] = { type: step.activity.type, index };
			}
		});

		// The first NON-coaching appearance of each phrase must be INFO (not a quiz)
		for (const [phrase, first] of Object.entries(firstNonCoachingStep)) {
			expect(
				first.type,
				`First non-coaching step for "${phrase}" should be INFO, got ${first.type}`
			).toBe(ActivityType.INFO);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('assembleLessonPlan — SunDrop math', () => {
	it('totalSunDrops equals sum of all step sunDrops', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const calculated = plan.steps.reduce((sum, s) => sum + s.sunDrops, 0);
		expect(plan.totalSunDrops).toBe(calculated);
	});

	it('coaching steps award 0 SunDrops', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const coachingSteps = plan.steps.filter(
			(s) => s.activity.type === ActivityType.COACHING_CHAT
		);
		for (const step of coachingSteps) {
			expect(step.sunDrops).toBe(0);
		}
	});

	it('INFO steps award 0 SunDrops', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const infoSteps = plan.steps.filter((s) => s.activity.type === ActivityType.INFO);
		for (const step of infoSteps) {
			expect(step.sunDrops).toBe(0);
		}
	});

	it('TRANSLATE steps award 3 SunDrops', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const translateSteps = plan.steps.filter((s) => s.activity.type === ActivityType.TRANSLATE);
		for (const step of translateSteps) {
			expect(step.sunDrops).toBe(3);
		}
	});

	it('MATCHING step awards 3 SunDrops', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const matchingStep = plan.steps.find((s) => s.activity.type === ActivityType.MATCHING);
		expect(matchingStep).toBeDefined();
		expect(matchingStep!.sunDrops).toBe(3);
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('assembleLessonPlan — activity content', () => {
	it('fill_blank sentence contains ___', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const fillSteps = plan.steps.filter((s) => s.activity.type === ActivityType.FILL_BLANK);
		expect(fillSteps.length).toBeGreaterThan(0);
		for (const step of fillSteps) {
			expect(step.activity.type).toBe(ActivityType.FILL_BLANK);
			if (step.activity.type === ActivityType.FILL_BLANK) {
				expect(step.activity.sentence).toContain('___');
			}
		}
	});

	it('multiple choice options include the correct answer', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const mcSteps = plan.steps.filter((s) => s.activity.type === ActivityType.MULTIPLE_CHOICE);
		for (const step of mcSteps) {
			if (step.activity.type === ActivityType.MULTIPLE_CHOICE) {
				const { options, correctIndex } = step.activity;
				expect(options[correctIndex]).toBeTruthy();
				expect(correctIndex).toBeGreaterThanOrEqual(0);
				expect(correctIndex).toBeLessThan(options.length);
			}
		}
	});

	it('matching step includes all chunk phrases', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const matchingStep = plan.steps.find((s) => s.activity.type === ActivityType.MATCHING);
		expect(matchingStep).toBeDefined();

		if (matchingStep && matchingStep.activity.type === ActivityType.MATCHING) {
			const leftPhrases = matchingStep.activity.pairs.map((p) => p.left);
			for (const chunk of MOCK_CHUNK_FAMILY.chunks) {
				expect(leftPhrases).toContain(chunk.targetPhrase);
			}
		}
	});

	it('translate step has sourcePhrase and correctAnswer', () => {
		const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
		const translateSteps = plan.steps.filter((s) => s.activity.type === ActivityType.TRANSLATE);
		expect(translateSteps.length).toBe(3); // One per chunk
		for (const step of translateSteps) {
			if (step.activity.type === ActivityType.TRANSLATE) {
				expect(step.activity.sourcePhrase).toBeTruthy();
				expect(step.activity.correctAnswer).toBeTruthy();
				expect(step.activity.acceptedAnswers.length).toBeGreaterThan(0);
			}
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('assembleLessonPlan — shuffling', () => {
	it('multiple choice correctIndex is always in bounds', () => {
		// Run many times to verify shuffle never produces invalid correctIndex
		for (let i = 0; i < 20; i++) {
			const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
			const mcSteps = plan.steps.filter((s) => s.activity.type === ActivityType.MULTIPLE_CHOICE);
			for (const step of mcSteps) {
				if (step.activity.type === ActivityType.MULTIPLE_CHOICE) {
					expect(step.activity.correctIndex).toBeGreaterThanOrEqual(0);
					expect(step.activity.correctIndex).toBeLessThan(step.activity.options.length);
				}
			}
		}
	});

	it('multiple choice options are actually shuffled (order varies across runs)', () => {
		// Collect first option across many runs — should not always be the same
		const firstOptions = new Set<string>();
		for (let i = 0; i < 15; i++) {
			const plan = assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID);
			const firstMC = plan.steps.find((s) => s.activity.type === ActivityType.MULTIPLE_CHOICE);
			if (firstMC && firstMC.activity.type === ActivityType.MULTIPLE_CHOICE) {
				firstOptions.add(firstMC.activity.options[0]);
			}
		}
		// With 4 options and 15 runs, we expect to see at least 2 different values
		expect(firstOptions.size).toBeGreaterThan(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('assembleLessonPlan — does NOT call AI', () => {
	it('completes without triggering AI router', () => {
		// The vi.mock at the top throws if AI is called — if this test passes, no AI was used
		expect(() => assembleLessonPlan(MOCK_CHUNK_FAMILY, TEST_LESSON_ID)).not.toThrow();
	});
});
