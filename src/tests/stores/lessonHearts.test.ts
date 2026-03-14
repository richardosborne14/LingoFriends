/**
 * Tests for hearts, streak, and reward event stores added in TASK-V2-03.
 *
 * These test the new state additions to src/lib/stores/lesson.ts.
 * The existing lesson.test.ts covers the original store functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	hearts,
	consecutiveCorrect,
	pendingReward,
	pendingPenalty,
	showBreather,
	incrementStreak,
	resetStreak,
	loseHeart,
	restoreHearts,
	setPendingReward,
	clearPendingReward,
	setPendingPenalty,
	clearPendingPenalty,
	initLesson,
	resetLesson,
} from '$lib/stores/lesson';
import { STARTING_HEARTS } from '$lib/services/rewardService';
import type { LessonPlan } from '$lib/types/lesson';
import { ActivityType } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

function makeMinimalPlan(): LessonPlan {
	return {
		id: 'test',
		title: 'Test',
		icon: '🌱',
		steps: [
			{
				id: 'step-1',
				tutorText: 'Learn',
				helpText: 'Hint',
				sunDrops: 3,
				activity: {
					type: ActivityType.INFO,
					targetPhrase: 'Hallo',
					nativeTranslation: 'Hello',
					sunDrops: 0,
				},
			},
		],
		totalSunDrops: 3,
		chunkCount: 1,
	};
}

const mockReward = {
	sunDrops: 5,
	streakBonus: 0,
	streakCount: 1,
	isStreakMilestone: false,
	message: 'Nice one!',
};

const mockPenalty = {
	sunDropsLost: 1,
	message: 'Not quite!',
};

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
	it('hearts starts at STARTING_HEARTS', () => {
		expect(get(hearts)).toBe(STARTING_HEARTS);
	});

	it('consecutiveCorrect starts at 0', () => {
		expect(get(consecutiveCorrect)).toBe(0);
	});

	it('pendingReward is null', () => {
		expect(get(pendingReward)).toBeNull();
	});

	it('pendingPenalty is null', () => {
		expect(get(pendingPenalty)).toBeNull();
	});

	it('showBreather is false', () => {
		expect(get(showBreather)).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// initLesson resets TASK-V2-03 state
// ─────────────────────────────────────────────────────────────────────────────

describe('initLesson() resets TASK-V2-03 state', () => {
	it('resets hearts to STARTING_HEARTS', () => {
		hearts.set(1); // manually deplete
		initLesson(makeMinimalPlan());
		expect(get(hearts)).toBe(STARTING_HEARTS);
	});

	it('resets consecutiveCorrect to 0', () => {
		consecutiveCorrect.set(7);
		initLesson(makeMinimalPlan());
		expect(get(consecutiveCorrect)).toBe(0);
	});

	it('clears pendingReward', () => {
		setPendingReward(mockReward);
		initLesson(makeMinimalPlan());
		expect(get(pendingReward)).toBeNull();
	});

	it('clears showBreather', () => {
		showBreather.set(true);
		initLesson(makeMinimalPlan());
		expect(get(showBreather)).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// incrementStreak / resetStreak
// ─────────────────────────────────────────────────────────────────────────────

describe('incrementStreak()', () => {
	it('increments consecutiveCorrect by 1', () => {
		incrementStreak();
		expect(get(consecutiveCorrect)).toBe(1);
	});

	it('accumulates across calls', () => {
		incrementStreak();
		incrementStreak();
		incrementStreak();
		expect(get(consecutiveCorrect)).toBe(3);
	});
});

describe('resetStreak()', () => {
	it('resets consecutiveCorrect to 0', () => {
		consecutiveCorrect.set(5);
		resetStreak();
		expect(get(consecutiveCorrect)).toBe(0);
	});

	it('resets from any value', () => {
		incrementStreak();
		incrementStreak();
		resetStreak();
		expect(get(consecutiveCorrect)).toBe(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// loseHeart / restoreHearts
// ─────────────────────────────────────────────────────────────────────────────

describe('loseHeart()', () => {
	it('decrements hearts by 1', () => {
		loseHeart();
		expect(get(hearts)).toBe(STARTING_HEARTS - 1);
	});

	it('decrements from 2 to 1', () => {
		hearts.set(2);
		loseHeart();
		expect(get(hearts)).toBe(1);
	});

	it('floors at 0 (never negative)', () => {
		hearts.set(0);
		loseHeart();
		expect(get(hearts)).toBe(0);
	});

	it('sets showBreather = true when hearts reach 0', () => {
		hearts.set(1);
		loseHeart();
		expect(get(hearts)).toBe(0);
		expect(get(showBreather)).toBe(true);
	});

	it('does NOT set showBreather when hearts go from 3 to 2', () => {
		hearts.set(3);
		loseHeart();
		expect(get(showBreather)).toBe(false);
	});

	it('does NOT set showBreather when hearts go from 2 to 1', () => {
		hearts.set(2);
		loseHeart();
		expect(get(showBreather)).toBe(false);
	});
});

describe('restoreHearts()', () => {
	it('resets hearts to STARTING_HEARTS', () => {
		hearts.set(0);
		restoreHearts();
		expect(get(hearts)).toBe(STARTING_HEARTS);
	});

	it('clears showBreather', () => {
		showBreather.set(true);
		restoreHearts();
		expect(get(showBreather)).toBe(false);
	});

	it('works from any heart count', () => {
		hearts.set(1);
		restoreHearts();
		expect(get(hearts)).toBe(STARTING_HEARTS);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// setPendingReward / clearPendingReward
// ─────────────────────────────────────────────────────────────────────────────

describe('setPendingReward()', () => {
	it('sets pendingReward to the given event', () => {
		setPendingReward(mockReward);
		expect(get(pendingReward)).toEqual(mockReward);
	});

	it('replacing an existing reward updates the store', () => {
		setPendingReward(mockReward);
		const newReward = { ...mockReward, sunDrops: 10 };
		setPendingReward(newReward);
		expect(get(pendingReward)?.sunDrops).toBe(10);
	});
});

describe('clearPendingReward()', () => {
	it('sets pendingReward to null', () => {
		setPendingReward(mockReward);
		clearPendingReward();
		expect(get(pendingReward)).toBeNull();
	});

	it('is safe to call when already null', () => {
		expect(() => clearPendingReward()).not.toThrow();
		expect(get(pendingReward)).toBeNull();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// setPendingPenalty / clearPendingPenalty
// ─────────────────────────────────────────────────────────────────────────────

describe('setPendingPenalty()', () => {
	it('sets pendingPenalty to the given event', () => {
		setPendingPenalty(mockPenalty);
		expect(get(pendingPenalty)).toEqual(mockPenalty);
	});
});

describe('clearPendingPenalty()', () => {
	it('sets pendingPenalty to null', () => {
		setPendingPenalty(mockPenalty);
		clearPendingPenalty();
		expect(get(pendingPenalty)).toBeNull();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION: streak + heart interaction
// ─────────────────────────────────────────────────────────────────────────────

describe('streak + heart interaction', () => {
	it('streak resets when heart is lost', () => {
		// Build a streak, then wrong answer loses heart + resets streak
		consecutiveCorrect.set(4);
		resetStreak(); // simulates wrong answer
		loseHeart();
		expect(get(consecutiveCorrect)).toBe(0);
		expect(get(hearts)).toBe(STARTING_HEARTS - 1);
	});

	it('restoring hearts preserves streak progress', () => {
		// Hearts and streak are independent — restore hearts doesn't change streak
		consecutiveCorrect.set(3);
		hearts.set(0);
		restoreHearts();
		// Streak should be unaffected by heart restoration
		expect(get(consecutiveCorrect)).toBe(3);
		expect(get(hearts)).toBe(STARTING_HEARTS);
	});
});
