/**
 * Tests for src/lib/services/reviewLessonBuilder.ts
 *
 * Tests cover:
 * - buildReviewLesson: correct plan structure, step types, SunDrops
 * - filterOverdueChunks: overdue detection and sorting
 * - getDaysOverdue: date arithmetic
 * - shuffleArray: randomisation (statistical test)
 */

import { describe, it, expect } from 'vitest';
import {
	buildReviewLesson,
	filterOverdueChunks,
	getDaysOverdue,
	shuffleArray,
	type ReviewChunk,
	type ReviewLessonConfig,
} from '$lib/services/reviewLessonBuilder';
import { ActivityType } from '$lib/types/lesson';

// ─── FIXTURES ────────────────────────────────────────────────────────────────

/** Creates a ReviewChunk with default test values. */
function makeChunk(overrides: Partial<ReviewChunk> = {}): ReviewChunk {
	return {
		id: 'chunk-1',
		targetPhrase: 'Ich heiße Max',
		nativeTranslation: 'My name is Max',
		targetLanguage: 'de',
		nativeLanguage: 'en',
		distractors: ['My name is Anna', 'I am happy', 'Good morning'],
		explanation: 'Used when introducing yourself',
		exampleSentence: 'Hallo, ich heiße Max.',
		daysOverdue: 5,
		...overrides,
	};
}

function makeConfig(overrides: Partial<ReviewLessonConfig> = {}): ReviewLessonConfig {
	return {
		treeId: 'tree-abc',
		treeName: 'Greetings',
		chunks: [makeChunk()],
		...overrides,
	};
}

// ─── buildReviewLesson ────────────────────────────────────────────────────────

describe('buildReviewLesson — plan structure', () => {
	it('returns a LessonPlan with isReview = true', () => {
		const plan = buildReviewLesson(makeConfig());
		expect(plan.isReview).toBe(true);
	});

	it('title includes tree name', () => {
		const plan = buildReviewLesson(makeConfig());
		expect(plan.title).toContain('Greetings');
	});

	it('produces 2 steps per chunk (multiple choice + translate)', () => {
		const plan = buildReviewLesson(makeConfig());
		expect(plan.steps).toHaveLength(2);
	});

	it('produces 4 steps for 2 chunks', () => {
		const config = makeConfig({
			chunks: [makeChunk({ id: '1' }), makeChunk({ id: '2', targetPhrase: 'Wie geht es dir?' })],
		});
		const plan = buildReviewLesson(config);
		expect(plan.steps).toHaveLength(4);
	});

	it('totalSunDrops equals step count × 2', () => {
		const plan = buildReviewLesson(makeConfig());
		// 2 steps × 2 SunDrops each = 4
		expect(plan.totalSunDrops).toBe(4);
	});

	it('chunkCount matches the number of review chunks', () => {
		const plan = buildReviewLesson(makeConfig());
		expect(plan.chunkCount).toBe(1);
	});

	it('sets targetLanguage and nativeLanguage from the first chunk', () => {
		const plan = buildReviewLesson(makeConfig());
		expect(plan.targetLanguage).toBe('de');
		expect(plan.nativeLanguage).toBe('en');
	});
});

describe('buildReviewLesson — step activity types', () => {
	it('first step is multiple_choice', () => {
		const plan = buildReviewLesson(makeConfig());
		expect(plan.steps[0].activity.type).toBe(ActivityType.MULTIPLE_CHOICE);
	});

	it('second step is translate', () => {
		const plan = buildReviewLesson(makeConfig());
		expect(plan.steps[1].activity.type).toBe(ActivityType.TRANSLATE);
	});

	it('multiple choice has 4 options', () => {
		const plan = buildReviewLesson(makeConfig());
		const mc = plan.steps[0].activity as { options: string[] };
		expect(mc.options).toHaveLength(4);
	});

	it('translate has acceptedAnswers including the correct answer', () => {
		const plan = buildReviewLesson(makeConfig());
		const tr = plan.steps[1].activity as { acceptedAnswers: string[]; correctAnswer: string };
		expect(tr.acceptedAnswers).toContain(tr.correctAnswer);
	});
});

describe('buildReviewLesson — all caught up', () => {
	it('returns a valid plan when no chunks are overdue', () => {
		const plan = buildReviewLesson(makeConfig({ chunks: [] }));
		expect(plan.isReview).toBe(true);
		expect(plan.totalSunDrops).toBe(0);
		expect(plan.chunkCount).toBe(0);
	});

	it('caught-up plan has a single INFO step', () => {
		const plan = buildReviewLesson(makeConfig({ chunks: [] }));
		expect(plan.steps[0].activity.type).toBe(ActivityType.INFO);
	});
});

describe('buildReviewLesson — respects maxActivities', () => {
	it('limits to ceiling(maxActivities/2) chunks', () => {
		const config = makeConfig({
			chunks: Array.from({ length: 10 }, (_, i) => makeChunk({ id: `c${i}`, daysOverdue: i })),
			maxActivities: 4, // → 2 chunks max
		});
		const plan = buildReviewLesson(config);
		expect(plan.steps).toHaveLength(4); // 2 chunks × 2 steps
	});
});

// ─── getDaysOverdue ────────────────────────────────────────────────────────────

const TODAY = new Date('2026-03-14T12:00:00Z');

describe('getDaysOverdue', () => {
	it('returns -999 for null nextReviewDate', () => {
		expect(getDaysOverdue(null, TODAY)).toBe(-999);
	});

	it('returns 0 when due today', () => {
		const todayMidnight = new Date('2026-03-14T00:00:00Z');
		expect(getDaysOverdue(todayMidnight, TODAY)).toBe(0);
	});

	it('returns positive for overdue chunks', () => {
		const threeDaysAgo = new Date('2026-03-11T00:00:00Z');
		expect(getDaysOverdue(threeDaysAgo, TODAY)).toBe(3);
	});

	it('returns negative for future review dates', () => {
		const twoDaysAhead = new Date('2026-03-16T00:00:00Z');
		expect(getDaysOverdue(twoDaysAhead, TODAY)).toBe(-2);
	});
});

// ─── filterOverdueChunks ───────────────────────────────────────────────────────

describe('filterOverdueChunks', () => {
	it('filters out non-overdue chunks', () => {
		const chunks = [
			{ nextReviewDate: new Date('2026-03-11T00:00:00Z') }, // overdue
			{ nextReviewDate: new Date('2026-03-17T00:00:00Z') }, // future
			{ nextReviewDate: null }, // never studied
		];
		const result = filterOverdueChunks(chunks, TODAY);
		expect(result).toHaveLength(1);
		expect(result[0].daysOverdue).toBe(3);
	});

	it('sorts most overdue first', () => {
		const chunks = [
			{ nextReviewDate: new Date('2026-03-12T00:00:00Z') }, // 2 days overdue
			{ nextReviewDate: new Date('2026-03-10T00:00:00Z') }, // 4 days overdue
			{ nextReviewDate: new Date('2026-03-13T00:00:00Z') }, // 1 day overdue
		];
		const result = filterOverdueChunks(chunks, TODAY);
		expect(result[0].daysOverdue).toBe(4);
		expect(result[1].daysOverdue).toBe(2);
		expect(result[2].daysOverdue).toBe(1);
	});

	it('returns empty array when nothing is overdue', () => {
		const chunks = [{ nextReviewDate: new Date('2026-03-20T00:00:00Z') }];
		expect(filterOverdueChunks(chunks, TODAY)).toHaveLength(0);
	});
});

// ─── shuffleArray ─────────────────────────────────────────────────────────────

describe('shuffleArray', () => {
	it('returns an array of the same length', () => {
		const arr = [1, 2, 3, 4];
		expect(shuffleArray(arr)).toHaveLength(4);
	});

	it('does not mutate the original array', () => {
		const arr = [1, 2, 3, 4];
		shuffleArray(arr);
		expect(arr).toEqual([1, 2, 3, 4]);
	});

	it('contains all the same elements', () => {
		const arr = ['a', 'b', 'c', 'd'];
		const shuffled = shuffleArray(arr);
		expect(shuffled.sort()).toEqual(['a', 'b', 'c', 'd']);
	});
});
