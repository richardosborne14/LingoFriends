/**
 * Tests for src/lib/server/lessons/completionUtils.ts
 *
 * All functions are pure (no DB, no network), so tests are straightforward
 * value-in / value-out assertions. No mocking needed.
 *
 * Test count target: 20+
 */

import { describe, it, expect } from 'vitest';
import {
	buildPerformanceRecord,
	isFirstLesson,
	shouldOfferLevelChange,
	serializeAssessmentForClient,
} from '$lib/server/lessons/completionUtils';
import type { PerformanceRecordParams } from '$lib/server/lessons/completionUtils';
import type { LevelAssessment } from '$lib/services/levelAssessment';

// ─────────────────────────────────────────────────────────────────────────────
// buildPerformanceRecord
// ─────────────────────────────────────────────────────────────────────────────

describe('buildPerformanceRecord', () => {
	/** Minimal valid params used across tests */
	const baseParams: PerformanceRecordParams = {
		userId: 'user-abc-123',
		lessonId: 'lesson-xyz-456',
		levelAtTime: 'know_some_words',
		accuracy: 0.85,
		hintsUsed: 2,
		heartsLost: 1,
		streakMax: 5,
	};

	it('copies userId, lessonId and levelAtTime verbatim', () => {
		const record = buildPerformanceRecord(baseParams);
		expect(record.userId).toBe('user-abc-123');
		expect(record.lessonId).toBe('lesson-xyz-456');
		expect(record.levelAtTime).toBe('know_some_words');
	});

	it('returns accuracy unchanged when it is within 0–1', () => {
		const record = buildPerformanceRecord({ ...baseParams, accuracy: 0.72 });
		expect(record.accuracy).toBe(0.72);
	});

	it('clamps accuracy above 1.0 down to 1.0', () => {
		// A malicious or buggy client could send 1.5 — clamp it
		const record = buildPerformanceRecord({ ...baseParams, accuracy: 1.5 });
		expect(record.accuracy).toBe(1.0);
	});

	it('clamps accuracy below 0 up to 0', () => {
		const record = buildPerformanceRecord({ ...baseParams, accuracy: -0.3 });
		expect(record.accuracy).toBe(0.0);
	});

	it('copies hintsUsed, heartsLost, streakMax correctly', () => {
		const record = buildPerformanceRecord({ ...baseParams, hintsUsed: 3, heartsLost: 2, streakMax: 7 });
		expect(record.hintsUsed).toBe(3);
		expect(record.heartsLost).toBe(2);
		expect(record.streakMax).toBe(7);
	});

	it('defaults all counter fields to 0 when they are 0', () => {
		const record = buildPerformanceRecord({ ...baseParams, hintsUsed: 0, heartsLost: 0, streakMax: 0 });
		expect(record.hintsUsed).toBe(0);
		expect(record.heartsLost).toBe(0);
		expect(record.streakMax).toBe(0);
	});

	it('clamps negative counter values up to 0 (defensive)', () => {
		// Should not happen from the app, but protects against bad clients
		const record = buildPerformanceRecord({ ...baseParams, hintsUsed: -1, heartsLost: -5, streakMax: -2 });
		expect(record.hintsUsed).toBe(0);
		expect(record.heartsLost).toBe(0);
		expect(record.streakMax).toBe(0);
	});

	it('sets completedAt to a recent Date (within last 5 seconds)', () => {
		const before = Date.now();
		const record = buildPerformanceRecord(baseParams);
		const after = Date.now();
		// completedAt should be a Date object
		expect(record.completedAt).toBeInstanceOf(Date);
		// And it should be within the test execution window
		const ts = record.completedAt.getTime();
		expect(ts).toBeGreaterThanOrEqual(before);
		expect(ts).toBeLessThanOrEqual(after + 100); // 100ms grace
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// isFirstLesson
// ─────────────────────────────────────────────────────────────────────────────

describe('isFirstLesson', () => {
	it('returns true when lessonsCompletedBefore is 0 (never done a lesson)', () => {
		expect(isFirstLesson(0)).toBe(true);
	});

	it('returns false when lessonsCompletedBefore is 1 (second lesson)', () => {
		expect(isFirstLesson(1)).toBe(false);
	});

	it('returns false for large lesson counts', () => {
		expect(isFirstLesson(50)).toBe(false);
	});

	it('returns true for negative values (defensive — treats as 0)', () => {
		// Negative should not occur in production but the function handles it gracefully
		expect(isFirstLesson(-1)).toBe(true);
	});

	it('returns false for 2 (well past the first lesson boundary)', () => {
		expect(isFirstLesson(2)).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// shouldOfferLevelChange
// ─────────────────────────────────────────────────────────────────────────────

describe('shouldOfferLevelChange', () => {
	it('returns true for bump_up recommendation', () => {
		const assessment: LevelAssessment = {
			recommendation: 'bump_up',
			confidence: 0.85,
			currentLevel: 'know_some_words',
			targetLevel: 'simple_sentences',
			bumpUpMessage: 'You\'re doing great!',
		};
		expect(shouldOfferLevelChange(assessment)).toBe(true);
	});

	it('returns true for bump_down recommendation', () => {
		const assessment: LevelAssessment = {
			recommendation: 'bump_down',
			confidence: 0.72,
			currentLevel: 'simple_sentences',
			targetLevel: 'know_some_words',
			bumpDownMessage: 'Let\'s build a foundation',
		};
		expect(shouldOfferLevelChange(assessment)).toBe(true);
	});

	it('returns false for stay recommendation', () => {
		const assessment: LevelAssessment = {
			recommendation: 'stay',
			confidence: 0.6,
			currentLevel: 'know_some_words',
		};
		expect(shouldOfferLevelChange(assessment)).toBe(false);
	});

	it('returns false for stay with confidence 0 (not enough data)', () => {
		// This is the most common case — most lessons return 'stay'
		const assessment: LevelAssessment = {
			recommendation: 'stay',
			confidence: 0,
			currentLevel: 'total_beginner',
		};
		expect(shouldOfferLevelChange(assessment)).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// serializeAssessmentForClient
// ─────────────────────────────────────────────────────────────────────────────

describe('serializeAssessmentForClient', () => {
	it('returns null for stay recommendation (no modal needed)', () => {
		const assessment: LevelAssessment = {
			recommendation: 'stay',
			confidence: 0.6,
			currentLevel: 'know_some_words',
		};
		expect(serializeAssessmentForClient(assessment)).toBeNull();
	});

	it('returns null for stay even with high confidence', () => {
		// Edge case: very consistent performance but in the comfortable middle range
		const assessment: LevelAssessment = {
			recommendation: 'stay',
			confidence: 0.98,
			currentLevel: 'simple_sentences',
		};
		expect(serializeAssessmentForClient(assessment)).toBeNull();
	});

	it('serialises bump_up correctly — recommendation and levels', () => {
		const assessment: LevelAssessment = {
			recommendation: 'bump_up',
			confidence: 0.82,
			currentLevel: 'know_some_words',
			targetLevel: 'simple_sentences',
			bumpUpMessage: 'You\'ve been doing brilliantly!',
		};
		const result = serializeAssessmentForClient(assessment);
		expect(result).not.toBeNull();
		expect(result!.recommendation).toBe('bump_up');
		expect(result!.currentLevel).toBe('know_some_words');
		expect(result!.targetLevel).toBe('simple_sentences');
		expect(result!.confidence).toBe(0.82);
	});

	it('serialises bump_up — uses bumpUpMessage, not bumpDownMessage', () => {
		const assessment: LevelAssessment = {
			recommendation: 'bump_up',
			confidence: 0.9,
			currentLevel: 'total_beginner',
			targetLevel: 'know_some_words',
			bumpUpMessage: 'Ready to level up? 🚀',
			// This field should be ignored for bump_up
			bumpDownMessage: 'This should never appear',
		};
		const result = serializeAssessmentForClient(assessment);
		expect(result!.message).toBe('Ready to level up? 🚀');
		expect(result!.message).not.toContain('This should never appear');
	});

	it('serialises bump_down — uses bumpDownMessage, not bumpUpMessage', () => {
		const assessment: LevelAssessment = {
			recommendation: 'bump_down',
			confidence: 0.75,
			currentLevel: 'simple_sentences',
			targetLevel: 'know_some_words',
			// This field should be ignored for bump_down
			bumpUpMessage: 'This should never appear',
			bumpDownMessage: 'Let\'s build a rock-solid foundation 🌱',
		};
		const result = serializeAssessmentForClient(assessment);
		expect(result!.message).toBe('Let\'s build a rock-solid foundation 🌱');
		expect(result!.message).not.toContain('This should never appear');
	});

	it('uses fallback message for bump_up when bumpUpMessage is undefined', () => {
		// assessLevel() always sets bumpUpMessage, but we test the fallback defensively
		const assessment: LevelAssessment = {
			recommendation: 'bump_up',
			confidence: 0.8,
			currentLevel: 'know_some_words',
			targetLevel: 'simple_sentences',
			// bumpUpMessage intentionally omitted
		};
		const result = serializeAssessmentForClient(assessment);
		expect(result!.message).toBeTruthy(); // Fallback is always non-empty
		expect(typeof result!.message).toBe('string');
	});

	it('uses fallback message for bump_down when bumpDownMessage is undefined', () => {
		const assessment: LevelAssessment = {
			recommendation: 'bump_down',
			confidence: 0.7,
			currentLevel: 'simple_sentences',
			targetLevel: 'know_some_words',
			// bumpDownMessage intentionally omitted
		};
		const result = serializeAssessmentForClient(assessment);
		expect(result!.message).toBeTruthy();
		expect(typeof result!.message).toBe('string');
	});

	it('serialised result has exactly the expected keys', () => {
		const assessment: LevelAssessment = {
			recommendation: 'bump_up',
			confidence: 0.8,
			currentLevel: 'know_some_words',
			targetLevel: 'simple_sentences',
			bumpUpMessage: 'Level up!',
		};
		const result = serializeAssessmentForClient(assessment);
		// Confirm the shape exactly — no internal implementation leak
		const keys = Object.keys(result!).sort();
		expect(keys).toEqual(['confidence', 'currentLevel', 'message', 'recommendation', 'targetLevel']);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTUAL EXCLUSIVITY (documentation test)
// ─────────────────────────────────────────────────────────────────────────────

describe('isFirstLesson + shouldOfferLevelChange mutual exclusivity', () => {
	it('isFirstLesson(0) is true but any assessment after 1 lesson should be stay (no contradiction)', () => {
		// The assessment engine needs MIN_LESSONS_TO_ASSESS = 3.
		// So if isFirstLesson returns true, the API would have called assessLevel([...])
		// with only 1 record → it would always return 'stay'.
		// This test documents the invariant, not a code path.
		expect(isFirstLesson(0)).toBe(true);

		// After 0 previous lessons, any assessment would return stay
		const stayAssessment: LevelAssessment = {
			recommendation: 'stay',
			confidence: 0,
			currentLevel: 'total_beginner',
		};
		expect(shouldOfferLevelChange(stayAssessment)).toBe(false);
	});
});
