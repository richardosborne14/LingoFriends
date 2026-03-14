/**
 * Tests for levelAssessment.ts
 *
 * Coverage:
 *  - Level navigation (getNextLevel, getPrevLevel, canBumpUp, canBumpDown)
 *  - Display names and validation
 *  - Confidence calculation (sample size and agreement factors)
 *  - assessLevel: stay / bump_up / bump_down scenarios
 *  - Message generation tone (no forbidden words)
 *  - Edge cases: empty arrays, top/bottom levels, unknown level codes
 */

import { describe, it, expect } from 'vitest';
import {
	USER_LEVELS,
	getNextLevel,
	getPrevLevel,
	canBumpUp,
	canBumpDown,
	getLevelDisplayName,
	isValidLevel,
	calculateConfidence,
	assessLevel,
	generateBumpUpMessage,
	generateBumpDownMessage,
	MIN_LESSONS_TO_ASSESS,
	type LessonPerformance,
} from '$lib/services/levelAssessment';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a lesson performance record with the given metrics */
function makePerfRecord(
	accuracy: number,
	hintsUsed: number,
	heartsLost: number,
	level = 'know_some_words'
): LessonPerformance {
	return {
		lessonId: `lesson-${Math.random()}`,
		level,
		accuracy,
		hintsUsed,
		heartsLost,
		streakMax: 5,
	};
}

/** 3 perfect-performance records: >90% accuracy, <0.5 hints, <0.3 hearts */
function perfectLessons(level = 'know_some_words'): LessonPerformance[] {
	return [
		makePerfRecord(0.95, 0, 0, level),
		makePerfRecord(0.93, 0, 0, level),
		makePerfRecord(0.97, 0, 0, level),
	];
}

/** 3 struggling-performance records: <45% accuracy, >2 hints, >2 hearts */
function strugglingLessons(level = 'know_some_words'): LessonPerformance[] {
	return [
		makePerfRecord(0.35, 3, 3, level),
		makePerfRecord(0.40, 2.5, 2.5, level),
		makePerfRecord(0.30, 3, 3, level),
	];
}

/** 3 comfortable mid-range records — no trigger */
function averageLessons(level = 'know_some_words'): LessonPerformance[] {
	return [
		makePerfRecord(0.7, 1, 1, level),
		makePerfRecord(0.75, 1, 0.5, level),
		makePerfRecord(0.65, 0.8, 1, level),
	];
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL ORDER
// ─────────────────────────────────────────────────────────────────────────────

describe('USER_LEVELS', () => {
	it('contains exactly 4 levels in ascending difficulty order', () => {
		expect(USER_LEVELS).toHaveLength(4);
		expect(USER_LEVELS[0]).toBe('total_beginner');
		expect(USER_LEVELS[3]).toBe('can_have_conversations');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

describe('getNextLevel', () => {
	it('returns the level above total_beginner', () => {
		expect(getNextLevel('total_beginner')).toBe('know_some_words');
	});

	it('returns simple_sentences above know_some_words', () => {
		expect(getNextLevel('know_some_words')).toBe('simple_sentences');
	});

	it('returns null at the top level', () => {
		expect(getNextLevel('can_have_conversations')).toBeNull();
	});

	it('returns null for an unknown level string', () => {
		expect(getNextLevel('invented_level')).toBeNull();
	});
});

describe('getPrevLevel', () => {
	it('returns the level below simple_sentences', () => {
		expect(getPrevLevel('simple_sentences')).toBe('know_some_words');
	});

	it('returns null at the bottom level', () => {
		expect(getPrevLevel('total_beginner')).toBeNull();
	});

	it('returns null for an unknown level string', () => {
		expect(getPrevLevel('invented_level')).toBeNull();
	});
});

describe('canBumpUp / canBumpDown', () => {
	it('canBumpUp is false at the top level', () => {
		expect(canBumpUp('can_have_conversations')).toBe(false);
	});

	it('canBumpUp is true at a middle level', () => {
		expect(canBumpUp('know_some_words')).toBe(true);
	});

	it('canBumpDown is false at the bottom level', () => {
		expect(canBumpDown('total_beginner')).toBe(false);
	});

	it('canBumpDown is true at a middle level', () => {
		expect(canBumpDown('simple_sentences')).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY NAMES AND VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

describe('getLevelDisplayName', () => {
	it('returns a non-empty string for all known levels', () => {
		for (const level of USER_LEVELS) {
			const name = getLevelDisplayName(level);
			expect(name.length).toBeGreaterThan(0);
		}
	});

	it('falls back to the raw code for unknown levels', () => {
		expect(getLevelDisplayName('fake_level')).toBe('fake_level');
	});

	it('includes an emoji in the display name', () => {
		// All display names use plant emojis — verify at least one has a non-ASCII char
		const name = getLevelDisplayName('total_beginner');
		expect(name).toMatch(/🌱/);
	});
});

describe('isValidLevel', () => {
	it('returns true for all known level codes', () => {
		for (const level of USER_LEVELS) {
			expect(isValidLevel(level)).toBe(true);
		}
	});

	it('returns false for an invented level code', () => {
		expect(isValidLevel('super_advanced')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isValidLevel('')).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateConfidence', () => {
	it('returns 0 for empty array', () => {
		expect(calculateConfidence([])).toBe(0);
	});

	it('returns a higher value for 5 consistent lessons than 3', () => {
		const three = [
			makePerfRecord(0.9, 0, 0),
			makePerfRecord(0.9, 0, 0),
			makePerfRecord(0.9, 0, 0),
		];
		const five = [
			...three,
			makePerfRecord(0.9, 0, 0),
			makePerfRecord(0.9, 0, 0),
		];
		expect(calculateConfidence(five)).toBeGreaterThan(calculateConfidence(three));
	});

	it('returns a lower value when lessons are inconsistent', () => {
		const consistent = [
			makePerfRecord(0.9, 0, 0),
			makePerfRecord(0.92, 0, 0),
			makePerfRecord(0.88, 0, 0),
		];
		const inconsistent = [
			makePerfRecord(0.2, 0, 0),
			makePerfRecord(0.9, 0, 0),
			makePerfRecord(0.5, 0, 0),
		];
		expect(calculateConfidence(consistent)).toBeGreaterThan(calculateConfidence(inconsistent));
	});

	it('returns value between 0 and 1', () => {
		const value = calculateConfidence(perfectLessons());
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThanOrEqual(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// CORE ASSESSMENT — assessLevel()
// ─────────────────────────────────────────────────────────────────────────────

describe('assessLevel — insufficient data', () => {
	it('returns stay when no lessons provided', () => {
		const result = assessLevel([], 'know_some_words');
		expect(result.recommendation).toBe('stay');
		expect(result.confidence).toBe(0);
	});

	it('returns stay when fewer than 3 lessons provided', () => {
		const two = [makePerfRecord(0.95, 0, 0), makePerfRecord(0.96, 0, 0)];
		const result = assessLevel(two, 'know_some_words');
		expect(result.recommendation).toBe('stay');
	});
});

describe('assessLevel — bump up scenarios', () => {
	it('recommends bump_up after 3 perfect lessons at a non-top level', () => {
		const result = assessLevel(perfectLessons(), 'know_some_words');
		expect(result.recommendation).toBe('bump_up');
		expect(result.targetLevel).toBe('simple_sentences');
	});

	it('does NOT recommend bump_up when already at the top level', () => {
		const result = assessLevel(perfectLessons('can_have_conversations'), 'can_have_conversations');
		expect(result.recommendation).toBe('stay');
	});

	it('includes a bumpUpMessage when recommending bump_up', () => {
		const result = assessLevel(perfectLessons(), 'know_some_words');
		expect(result.bumpUpMessage).toBeTruthy();
		expect(typeof result.bumpUpMessage).toBe('string');
		expect(result.bumpUpMessage!.length).toBeGreaterThan(0);
	});

	it('does NOT recommend bump_up when accuracy is below threshold (only 89%)', () => {
		// 89% - below the 90% threshold
		const borderline = [
			makePerfRecord(0.89, 0, 0),
			makePerfRecord(0.89, 0, 0),
			makePerfRecord(0.89, 0, 0),
		];
		const result = assessLevel(borderline, 'know_some_words');
		expect(result.recommendation).not.toBe('bump_up');
	});

	it('does NOT recommend bump_up when hints used is above threshold', () => {
		// Perfect accuracy but too many hints
		const highHints = [
			makePerfRecord(0.95, 1.0, 0),
			makePerfRecord(0.93, 1.0, 0),
			makePerfRecord(0.97, 1.0, 0),
		];
		const result = assessLevel(highHints, 'know_some_words');
		expect(result.recommendation).not.toBe('bump_up');
	});
});

describe('assessLevel — bump down scenarios', () => {
	it('recommends bump_down after 3 struggling lessons at a non-bottom level', () => {
		const result = assessLevel(strugglingLessons(), 'know_some_words');
		expect(result.recommendation).toBe('bump_down');
		expect(result.targetLevel).toBe('total_beginner');
	});

	it('does NOT recommend bump_down when already at the bottom level', () => {
		const result = assessLevel(strugglingLessons('total_beginner'), 'total_beginner');
		expect(result.recommendation).toBe('stay');
	});

	it('includes a bumpDownMessage when recommending bump_down', () => {
		const result = assessLevel(strugglingLessons(), 'know_some_words');
		expect(result.bumpDownMessage).toBeTruthy();
		expect(typeof result.bumpDownMessage).toBe('string');
	});

	it('does NOT recommend bump_down when accuracy is above threshold', () => {
		// Struggling hints/hearts but acceptable accuracy
		const highHintsOnly = [
			makePerfRecord(0.5, 3, 3),
			makePerfRecord(0.5, 3, 3),
			makePerfRecord(0.5, 3, 3),
		];
		const result = assessLevel(highHintsOnly, 'know_some_words');
		expect(result.recommendation).not.toBe('bump_down');
	});
});

describe('assessLevel — stay scenarios', () => {
	it('recommends stay for average performance', () => {
		const result = assessLevel(averageLessons(), 'know_some_words');
		expect(result.recommendation).toBe('stay');
	});

	it('returns only last 3 lessons for assessment (ignores older ones)', () => {
		// First 5 lessons are poor, last 3 are perfect — should bump up
		const mixed = [
			...strugglingLessons(),
			...perfectLessons(),
		];
		const result = assessLevel(mixed, 'know_some_words');
		// The last 3 (perfect) should dominate the decision
		expect(result.recommendation).toBe('bump_up');
	});

	it('returns currentLevel in the result', () => {
		const result = assessLevel(averageLessons(), 'simple_sentences');
		expect(result.currentLevel).toBe('simple_sentences');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE TONE TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('generateBumpUpMessage', () => {
	it('contains both level names', () => {
		const msg = generateBumpUpMessage('total_beginner', 'know_some_words');
		expect(msg).toContain('Just Starting');
		expect(msg).toContain('I Know Some Words');
	});

	it('does not use intimidating language', () => {
		const msg = generateBumpUpMessage('know_some_words', 'simple_sentences').toLowerCase();
		// These words should never appear in a child-friendly bump-up message
		expect(msg).not.toContain('master');
		expect(msg).not.toContain('complete');
	});

	it('mentions being able to switch back (low pressure)', () => {
		const msg = generateBumpUpMessage('know_some_words', 'simple_sentences');
		// Should contain something reassuring about changing back
		expect(msg.toLowerCase()).toMatch(/switch|change|back|settings/);
	});
});

describe('generateBumpDownMessage', () => {
	it('contains both level names', () => {
		const msg = generateBumpDownMessage('simple_sentences', 'know_some_words');
		expect(msg).toContain('Simple Sentences');
		expect(msg).toContain('I Know Some Words');
	});

	it('never uses shame or failure language', () => {
		const msg = generateBumpDownMessage('know_some_words', 'total_beginner').toLowerCase();
		// Forbidden words per PEDAGOGY.md
		expect(msg).not.toContain('failed');
		expect(msg).not.toContain('wrong');
		expect(msg).not.toContain('backwards');
		expect(msg).not.toContain('easier');
		expect(msg).not.toContain('too hard');
	});

	it('frames the lower level positively (foundation language)', () => {
		const msg = generateBumpDownMessage('know_some_words', 'total_beginner').toLowerCase();
		// Should use growth language, not retreat language
		expect(msg).toMatch(/foundation|build|solid|strong/);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANT
// ─────────────────────────────────────────────────────────────────────────────

describe('MIN_LESSONS_TO_ASSESS', () => {
	it('is exported and equals 3', () => {
		expect(MIN_LESSONS_TO_ASSESS).toBe(3);
	});
});
