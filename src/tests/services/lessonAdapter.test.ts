/**
 * Tests for lessonAdapter (TASK-AUDIT-03).
 *
 * Tests the adaptive decision engine: signal-based injection,
 * skip-ahead offers, safety rails, and easy-win step construction.
 *
 * All tests are pure — no browser APIs, no Svelte stores.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	decideNextStep,
	buildEasyWinStep,
	type MasteredChunk,
} from '$lib/services/lessonAdapter';
import {
	createSignalTracker,
	WRONG_STREAK_THRESHOLD,
	CORRECT_STREAK_THRESHOLD,
	MAX_EASY_WINS_PER_LESSON,
} from '$lib/services/lessonSignals';
import type { LessonStep } from '$lib/types/lesson';
import { ActivityType } from '$lib/types/lesson';

// ─── Test fixtures ──────────────────────────────────────────────────────────

/** Build a minimal MC quiz step for testing */
function makeQuizStep(id = 'step-1'): LessonStep {
	return {
		id,
		tutorText: 'Try this!',
		helpText: 'Here is a hint.',
		sunDrops: 2,
		activity: {
			type: ActivityType.MULTIPLE_CHOICE,
			question: 'What does "Hund" mean?',
			options: ['Dog', 'Cat', 'Bird', 'Fish'],
			correctIndex: 0,
			targetPhrase: 'Hund',
		} as any,
	};
}

/** Build a minimal INFO step for testing */
function makeInfoStep(id = 'info-1'): LessonStep {
	return {
		id,
		tutorText: 'Learn this!',
		helpText: '',
		sunDrops: 0,
		activity: {
			type: ActivityType.INFO,
			phrase: 'Hund',
			translation: 'Dog',
			pronunciation: 'hoond',
			exampleSentence: 'Das ist ein Hund.',
			exampleTranslation: 'That is a dog.',
		} as any,
	};
}

const mastered: MasteredChunk[] = [
	{ targetPhrase: 'Hund', nativeTranslation: 'Dog' },
	{ targetPhrase: 'Katze', nativeTranslation: 'Cat' },
];

// ─── LessonSignalTracker tests ───────────────────────────────────────────────

describe('LessonSignalTracker', () => {
	it('starts with all signals at zero / false', () => {
		const tracker = createSignalTracker();
		const s = tracker.getSignals();
		expect(s.consecutiveWrong).toBe(0);
		expect(s.consecutiveCorrect).toBe(0);
		expect(s.helpUsedTotal).toBe(0);
		expect(s.easyWinsInjected).toBe(0);
		expect(s.skipsOffered).toBe(0);
		expect(s.breatherShownSinceLastEasyWin).toBe(false);
		expect(s.lastStepUsedHelp).toBe(false);
	});

	it('increments consecutiveWrong on wrong answers', () => {
		const tracker = createSignalTracker();
		tracker.recordAttempt(false, 5000);
		tracker.recordAttempt(false, 4000);
		expect(tracker.getSignals().consecutiveWrong).toBe(2);
	});

	it('resets consecutiveWrong when a correct answer follows', () => {
		const tracker = createSignalTracker();
		tracker.recordAttempt(false, 5000);
		tracker.recordAttempt(false, 4000);
		tracker.recordAttempt(true, 2000);
		expect(tracker.getSignals().consecutiveWrong).toBe(0);
	});

	it('increments consecutiveCorrect on correct answers', () => {
		const tracker = createSignalTracker();
		tracker.recordAttempt(true, 2000);
		tracker.recordAttempt(true, 1500);
		tracker.recordAttempt(true, 2200);
		tracker.recordAttempt(true, 1800);
		expect(tracker.getSignals().consecutiveCorrect).toBe(4);
	});

	it('resets consecutiveCorrect when a wrong answer follows', () => {
		const tracker = createSignalTracker();
		tracker.recordAttempt(true, 2000);
		tracker.recordAttempt(true, 1500);
		tracker.recordAttempt(false, 9000);
		expect(tracker.getSignals().consecutiveCorrect).toBe(0);
	});

	it('accumulates helpUsedTotal across multiple taps', () => {
		const tracker = createSignalTracker();
		tracker.recordHelpUsed();
		tracker.recordHelpUsed();
		tracker.recordHelpUsed();
		expect(tracker.getSignals().helpUsedTotal).toBe(3);
	});

	it('sets lastStepUsedHelp on recordHelpUsed, clears on recordAttempt', () => {
		const tracker = createSignalTracker();
		tracker.recordHelpUsed();
		expect(tracker.getSignals().lastStepUsedHelp).toBe(true);
		tracker.recordAttempt(false, 5000);
		expect(tracker.getSignals().lastStepUsedHelp).toBe(false);
	});

	it('sets breatherShownSinceLastEasyWin on recordBreather', () => {
		const tracker = createSignalTracker();
		tracker.recordBreather();
		expect(tracker.getSignals().breatherShownSinceLastEasyWin).toBe(true);
	});

	it('resets wrong streak on recordBreather (child gets a clean slate)', () => {
		const tracker = createSignalTracker();
		tracker.recordAttempt(false, 5000);
		tracker.recordAttempt(false, 5000);
		tracker.recordBreather();
		expect(tracker.getSignals().consecutiveWrong).toBe(0);
	});

	it('clears breatherShownSinceLastEasyWin and resets wrong streak on recordEasyWinInjected', () => {
		const tracker = createSignalTracker();
		tracker.recordBreather();
		tracker.recordAttempt(false, 5000);
		tracker.recordEasyWinInjected();
		const s = tracker.getSignals();
		expect(s.breatherShownSinceLastEasyWin).toBe(false);
		expect(s.consecutiveWrong).toBe(0);
		expect(s.easyWinsInjected).toBe(1);
	});

	it('increments skipsOffered on recordSkipOffered', () => {
		const tracker = createSignalTracker();
		tracker.recordSkipOffered();
		expect(tracker.getSignals().skipsOffered).toBe(1);
	});

	it('getSignals returns a copy — mutations do not affect tracker state', () => {
		const tracker = createSignalTracker();
		tracker.recordAttempt(true, 1000);
		const snap = tracker.getSignals();
		// Mutate the snapshot
		snap.consecutiveCorrect = 999;
		// Tracker state is unaffected
		expect(tracker.getSignals().consecutiveCorrect).toBe(1);
	});

	it('reset() clears all state', () => {
		const tracker = createSignalTracker();
		tracker.recordAttempt(false, 5000);
		tracker.recordAttempt(false, 5000);
		tracker.recordHelpUsed();
		tracker.recordBreather();
		tracker.reset();
		const s = tracker.getSignals();
		expect(s.consecutiveWrong).toBe(0);
		expect(s.helpUsedTotal).toBe(0);
		expect(s.breatherShownSinceLastEasyWin).toBe(false);
	});
});

// ─── decideNextStep tests ────────────────────────────────────────────────────

describe('decideNextStep', () => {
	let tracker = createSignalTracker();
	const quizStep = makeQuizStep();
	const infoStep = makeInfoStep();

	beforeEach(() => {
		tracker = createSignalTracker();
	});

	it('returns "continue" for normal signals', () => {
		tracker.recordAttempt(true, 2000);
		const decision = decideNextStep(tracker.getSignals(), quizStep, [quizStep], 0, mastered);
		expect(decision.action).toBe('continue');
	});

	it('returns "continue" after an INFO step regardless of signals', () => {
		// Even with wrong streak, INFO completions never inject
		tracker.recordAttempt(false, 5000);
		tracker.recordAttempt(false, 5000);
		const decision = decideNextStep(tracker.getSignals(), infoStep, [infoStep], 0, mastered);
		expect(decision.action).toBe('continue');
	});

	it(`returns "inject" after ${WRONG_STREAK_THRESHOLD} consecutive wrong answers`, () => {
		for (let i = 0; i < WRONG_STREAK_THRESHOLD; i++) {
			tracker.recordAttempt(false, 7000);
		}
		const decision = decideNextStep(tracker.getSignals(), quizStep, [quizStep], 0, mastered);
		expect(decision.action).toBe('inject');
	});

	it('returns "continue" when wrong streak threshold is met but no mastered content', () => {
		// No mastered chunks → can't build an easy win → continue
		for (let i = 0; i < WRONG_STREAK_THRESHOLD; i++) {
			tracker.recordAttempt(false, 7000);
		}
		const decision = decideNextStep(tracker.getSignals(), quizStep, [quizStep], 0, []);
		expect(decision.action).toBe('continue');
	});

	it('injected step is MULTIPLE_CHOICE with "Quick review!" tutor text', () => {
		for (let i = 0; i < WRONG_STREAK_THRESHOLD; i++) {
			tracker.recordAttempt(false, 7000);
		}
		const decision = decideNextStep(tracker.getSignals(), quizStep, [quizStep], 0, mastered);
		expect(decision.action).toBe('inject');
		if (decision.action === 'inject') {
			expect(decision.step.activity.type).toBe(ActivityType.MULTIPLE_CHOICE);
			expect(decision.step.tutorText).toBe('Quick review! 💪');
			expect(decision.step.isInjected).toBe(true);
			expect(decision.step.sunDrops).toBe(1);
		}
	});

	it('returns "inject" after breather modal (post-breather easy win)', () => {
		tracker.recordAttempt(true, 2000); // First establish mastered content
		tracker.recordBreather();
		const decision = decideNextStep(tracker.getSignals(), quizStep, [quizStep], 0, mastered);
		expect(decision.action).toBe('inject');
	});

	it(`returns "skip_offer" after ${CORRECT_STREAK_THRESHOLD} consecutive correct answers (with INFO targets ahead)`, () => {
		for (let i = 0; i < CORRECT_STREAK_THRESHOLD; i++) {
			tracker.recordAttempt(true, 1500);
		}
		// Build a plan with a far-ahead INFO step (new chunk)
		const steps: LessonStep[] = [
			makeQuizStep('q1'),
			makeQuizStep('q2'),
			makeQuizStep('q3'),
			makeQuizStep('q4'),
			makeInfoStep('info-new-chunk'), // 4 steps ahead — qualifies as new chunk
		];
		const decision = decideNextStep(tracker.getSignals(), quizStep, steps, 0, mastered);
		expect(decision.action).toBe('skip_offer');
	});

	it('returns "continue" for skip-offer when no INFO steps ahead', () => {
		for (let i = 0; i < CORRECT_STREAK_THRESHOLD; i++) {
			tracker.recordAttempt(true, 1500);
		}
		// No INFO steps ahead
		const steps = [makeQuizStep('q1'), makeQuizStep('q2'), makeQuizStep('q3')];
		const decision = decideNextStep(tracker.getSignals(), quizStep, steps, 0, mastered);
		expect(decision.action).toBe('continue');
	});

	it(`caps easy-win injections at ${MAX_EASY_WINS_PER_LESSON}`, () => {
		// Exhaust the injection budget
		for (let i = 0; i < MAX_EASY_WINS_PER_LESSON; i++) {
			tracker.recordEasyWinInjected();
		}
		// Now wrong streak should NOT trigger injection
		for (let i = 0; i < WRONG_STREAK_THRESHOLD; i++) {
			tracker.recordAttempt(false, 7000);
		}
		const decision = decideNextStep(tracker.getSignals(), quizStep, [quizStep], 0, mastered);
		expect(decision.action).toBe('continue');
	});

	it('caps skip offers at 1 per lesson', () => {
		// Already offered a skip
		tracker.recordSkipOffered();
		for (let i = 0; i < CORRECT_STREAK_THRESHOLD; i++) {
			tracker.recordAttempt(true, 1500);
		}
		const steps: LessonStep[] = [
			makeQuizStep(),
			makeQuizStep(),
			makeQuizStep(),
			makeQuizStep(),
			makeInfoStep('new-chunk'),
		];
		const decision = decideNextStep(tracker.getSignals(), quizStep, steps, 0, mastered);
		// Skip budget exhausted → should not offer again
		expect(decision.action).not.toBe('skip_offer');
	});
});

// ─── buildEasyWinStep tests ──────────────────────────────────────────────────

describe('buildEasyWinStep', () => {
	it('builds a MC step with the correct phrase as one option', () => {
		const chunk: MasteredChunk = { targetPhrase: 'Hund', nativeTranslation: 'Dog' };
		const step = buildEasyWinStep(chunk, [chunk]);
		expect(step.activity.type).toBe(ActivityType.MULTIPLE_CHOICE);
		const mc = step.activity as any;
		expect(mc.options).toContain('Dog');
		const correct = mc.options[mc.correctIndex];
		expect(correct).toBe('Dog');
	});

	it('has exactly 4 options', () => {
		const chunk: MasteredChunk = { targetPhrase: 'Hund', nativeTranslation: 'Dog' };
		const step = buildEasyWinStep(chunk, [chunk]);
		const mc = step.activity as any;
		expect(mc.options).toHaveLength(4);
	});

	it('uses other mastered chunks as distractors', () => {
		const chunks: MasteredChunk[] = [
			{ targetPhrase: 'Hund', nativeTranslation: 'Dog' },
			{ targetPhrase: 'Katze', nativeTranslation: 'Cat' },
			{ targetPhrase: 'Vogel', nativeTranslation: 'Bird' },
			{ targetPhrase: 'Fisch', nativeTranslation: 'Fish' },
		];
		const step = buildEasyWinStep(chunks[0], chunks);
		const mc = step.activity as any;
		// All 4 options should be from the mastered translations
		expect(mc.options).toContain('Dog');
		expect(mc.options).toContain('Cat');
		expect(mc.options).toContain('Bird');
		expect(mc.options).toContain('Fish');
	});

	it('flags the step as isInjected=true', () => {
		const chunk: MasteredChunk = { targetPhrase: 'Hund', nativeTranslation: 'Dog' };
		const step = buildEasyWinStep(chunk, [chunk]);
		expect(step.isInjected).toBe(true);
	});

	it('awards only 1 SunDrop (confidence booster, not big earner)', () => {
		const chunk: MasteredChunk = { targetPhrase: 'Hund', nativeTranslation: 'Dog' };
		const step = buildEasyWinStep(chunk, [chunk]);
		expect(step.sunDrops).toBe(1);
	});

	it('generates a unique ID each time', () => {
		const chunk: MasteredChunk = { targetPhrase: 'Hund', nativeTranslation: 'Dog' };
		const s1 = buildEasyWinStep(chunk, [chunk]);
		const s2 = buildEasyWinStep(chunk, [chunk]);
		expect(s1.id).not.toBe(s2.id);
		expect(s1.id).toContain('injected-');
	});
});
