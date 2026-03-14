/**
 * Tests for src/lib/stores/lesson.ts
 *
 * Tests store initialisation, action functions, and derived value correctness.
 * Uses Svelte's get() to read store values synchronously in tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	lessonPlan,
	currentStepIndex,
	lessonResults,
	audioMap,
	helpUsedThisStep,
	lessonPhase,
	lessonError,
	currentStep,
	progress,
	isComplete,
	sunDropsEarned,
	initLesson,
	advanceStep,
	recordCorrect,
	recordWrong,
	recordHelpUsed,
	deductSunDrop,
	startActivities,
	resetLesson,
} from '$lib/stores/lesson';
import { ActivityType } from '$lib/types/lesson';
import type { LessonPlan } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

/** A minimal 3-step lesson plan for testing */
function makePlan(stepCount = 3): LessonPlan {
	const steps = Array.from({ length: stepCount }, (_, i) => ({
		id: `step-${i}`,
		tutorText: `Step ${i}`,
		helpText: `Help for step ${i}`,
		sunDrops: i + 1,
		activity: {
			type: ActivityType.INFO as ActivityType.INFO,
			targetPhrase: `Phrase ${i}`,
			nativeTranslation: `Translation ${i}`,
			sunDrops: 0 as 0,
		},
	}));

	return {
		id: 'test-lesson',
		title: 'Test Lesson',
		icon: '📖',
		coreFrame: 'Ich heiße ___',
		coreFrameTranslation: 'My name is ___',
		steps,
		totalSunDrops: steps.reduce((s, step) => s + step.sunDrops, 0),
		chunkCount: 1,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// RESET BEFORE EACH TEST
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
	resetLesson();
});

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────────────────

describe('initial state after resetLesson()', () => {
	it('lessonPlan is null', () => {
		expect(get(lessonPlan)).toBeNull();
	});

	it('currentStepIndex is 0', () => {
		expect(get(currentStepIndex)).toBe(0);
	});

	it('lessonPhase is loading', () => {
		expect(get(lessonPhase)).toBe('loading');
	});

	it('progress is 0', () => {
		expect(get(progress)).toBe(0);
	});

	it('isComplete is false', () => {
		expect(get(isComplete)).toBe(false);
	});

	it('currentStep is null', () => {
		expect(get(currentStep)).toBeNull();
	});

	it('sunDropsEarned is 0', () => {
		expect(get(sunDropsEarned)).toBe(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// initLesson
// ─────────────────────────────────────────────────────────────────────────────

describe('initLesson()', () => {
	it('sets the lesson plan', () => {
		const plan = makePlan();
		initLesson(plan);
		expect(get(lessonPlan)).toEqual(plan);
	});

	it('resets step index to 0', () => {
		const plan = makePlan();
		// Manually bump the index first
		currentStepIndex.set(2);
		initLesson(plan);
		expect(get(currentStepIndex)).toBe(0);
	});

	it('sets phase to preview', () => {
		initLesson(makePlan());
		expect(get(lessonPhase)).toBe('preview');
	});

	it('sets sunDropsMax from plan total', () => {
		const plan = makePlan(3); // 1+2+3 = 6
		initLesson(plan);
		expect(get(lessonResults).sunDropsMax).toBe(6);
	});

	it('sets sunDropsEarned to 0', () => {
		initLesson(makePlan());
		expect(get(lessonResults).sunDropsEarned).toBe(0);
	});

	it('clears any previous error', () => {
		lessonError.set('Previous error');
		initLesson(makePlan());
		expect(get(lessonError)).toBeNull();
	});

	it('sets audioMap from second argument', () => {
		initLesson(makePlan(), { hello: 'base64data' });
		expect(get(audioMap)).toEqual({ hello: 'base64data' });
	});

	it('defaults audioMap to empty object', () => {
		initLesson(makePlan());
		expect(get(audioMap)).toEqual({});
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED: currentStep and progress
// ─────────────────────────────────────────────────────────────────────────────

describe('derived currentStep', () => {
	it('returns the first step after init', () => {
		const plan = makePlan(3);
		initLesson(plan);
		expect(get(currentStep)).toEqual(plan.steps[0]);
	});

	it('returns null when lesson plan is null', () => {
		expect(get(currentStep)).toBeNull();
	});

	it('returns null when step index is past the end', () => {
		const plan = makePlan(2);
		initLesson(plan);
		currentStepIndex.set(99);
		expect(get(currentStep)).toBeNull();
	});
});

describe('derived progress', () => {
	it('returns 0 before lesson loads', () => {
		expect(get(progress)).toBe(0);
	});

	it('returns 0 at step 0 of 3', () => {
		initLesson(makePlan(3));
		expect(get(progress)).toBe(0);
	});

	it('returns 1/3 at step 1 of 3', () => {
		initLesson(makePlan(3));
		currentStepIndex.set(1);
		expect(get(progress)).toBeCloseTo(1 / 3);
	});

	it('returns 1 at step 3 of 3 (complete)', () => {
		initLesson(makePlan(3));
		currentStepIndex.set(3);
		expect(get(progress)).toBe(1);
	});
});

describe('derived isComplete', () => {
	it('is false before lesson loads', () => {
		expect(get(isComplete)).toBe(false);
	});

	it('is false at step 0 of 3', () => {
		initLesson(makePlan(3));
		expect(get(isComplete)).toBe(false);
	});

	it('is true when index equals step count', () => {
		initLesson(makePlan(3));
		currentStepIndex.set(3);
		expect(get(isComplete)).toBe(true);
	});

	it('is true when index exceeds step count', () => {
		initLesson(makePlan(3));
		currentStepIndex.set(5);
		expect(get(isComplete)).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// advanceStep
// ─────────────────────────────────────────────────────────────────────────────

describe('advanceStep()', () => {
	it('increments currentStepIndex', () => {
		initLesson(makePlan(3));
		advanceStep();
		expect(get(currentStepIndex)).toBe(1);
	});

	it('resets helpUsedThisStep', () => {
		initLesson(makePlan(3));
		helpUsedThisStep.set(true);
		advanceStep();
		expect(get(helpUsedThisStep)).toBe(false);
	});

	it('sets phase to complete when last step is done', () => {
		initLesson(makePlan(2));
		startActivities(); // move to activity phase
		advanceStep(); // step 0 → 1
		advanceStep(); // step 1 → 2 (complete)
		expect(get(lessonPhase)).toBe('complete');
	});

	it('does not go to complete before the last step', () => {
		initLesson(makePlan(3));
		startActivities();
		advanceStep(); // step 0 → 1
		expect(get(lessonPhase)).toBe('activity');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// recordCorrect / recordWrong / helpUsed / deductSunDrop
// ─────────────────────────────────────────────────────────────────────────────

describe('recordCorrect()', () => {
	it('adds SunDrops to the running total', () => {
		initLesson(makePlan());
		recordCorrect(3);
		expect(get(lessonResults).sunDropsEarned).toBe(3);
	});

	it('accumulates across multiple correct answers', () => {
		initLesson(makePlan());
		recordCorrect(2);
		recordCorrect(1);
		expect(get(lessonResults).sunDropsEarned).toBe(3);
	});

	it('increments correctCount', () => {
		initLesson(makePlan());
		recordCorrect(1);
		recordCorrect(1);
		expect(get(lessonResults).correctCount).toBe(2);
	});
});

describe('recordWrong()', () => {
	it('increments wrongCount', () => {
		initLesson(makePlan());
		recordWrong();
		recordWrong();
		expect(get(lessonResults).wrongCount).toBe(2);
	});

	it('does not change sunDropsEarned (deductSunDrop handles that)', () => {
		initLesson(makePlan());
		recordCorrect(5);
		recordWrong();
		expect(get(lessonResults).sunDropsEarned).toBe(5);
	});
});

describe('deductSunDrop()', () => {
	it('decrements sunDropsEarned by 1', () => {
		initLesson(makePlan());
		recordCorrect(3);
		deductSunDrop();
		expect(get(lessonResults).sunDropsEarned).toBe(2);
	});

	it('floors at 0 — never goes negative', () => {
		initLesson(makePlan());
		// Earned = 0, deduct should stay at 0
		deductSunDrop();
		expect(get(lessonResults).sunDropsEarned).toBe(0);
	});

	it('floors at 0 even with multiple deductions', () => {
		initLesson(makePlan());
		recordCorrect(1);
		deductSunDrop();
		deductSunDrop(); // now 0, not -1
		expect(get(lessonResults).sunDropsEarned).toBe(0);
	});
});

describe('recordHelpUsed()', () => {
	it('sets helpUsedThisStep to true', () => {
		initLesson(makePlan());
		recordHelpUsed();
		expect(get(helpUsedThisStep)).toBe(true);
	});

	it('increments helpUsed counter in results', () => {
		initLesson(makePlan());
		recordHelpUsed();
		recordHelpUsed();
		expect(get(lessonResults).helpUsed).toBe(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// startActivities
// ─────────────────────────────────────────────────────────────────────────────

describe('startActivities()', () => {
	it('transitions phase from preview to activity', () => {
		initLesson(makePlan()); // puts us in preview
		startActivities();
		expect(get(lessonPhase)).toBe('activity');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// resetLesson
// ─────────────────────────────────────────────────────────────────────────────

describe('resetLesson()', () => {
	it('clears lesson plan', () => {
		initLesson(makePlan());
		resetLesson();
		expect(get(lessonPlan)).toBeNull();
	});

	it('resets all counters to zero', () => {
		initLesson(makePlan());
		recordCorrect(5);
		recordWrong();
		resetLesson();
		const r = get(lessonResults);
		expect(r.sunDropsEarned).toBe(0);
		expect(r.correctCount).toBe(0);
		expect(r.wrongCount).toBe(0);
	});

	it('returns phase to loading', () => {
		initLesson(makePlan());
		startActivities();
		resetLesson();
		expect(get(lessonPhase)).toBe('loading');
	});
});
