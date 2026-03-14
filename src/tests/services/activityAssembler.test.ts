/**
 * Tests for activityAssembler.ts
 *
 * All functions are pure (no AI, no Svelte, no DB) — fully testable in isolation.
 * Coverage targets:
 *   - buildTrueFalseFromChunk: all 4 variants, correct isTrue flag, sunDrops
 *   - pickTrueFalseVariant: cycling pattern, no out-of-bounds
 *   - tokenise: basic splits, edge cases (empty, extra spaces, single word)
 *   - selectWordArrangeDistractors: prefers extraWords, falls back correctly
 *   - buildWordArrangeFromChunk: correct word count, distractors included, shuffled
 *   - buildMatchingFromChunks: pairs from chunks, error on < 2 chunks
 *   - getActivityPattern: even = fill_blank/true_false, odd = word_arrange/multiple_choice
 *
 * @module tests/services/activityAssembler
 */

import { describe, it, expect } from 'vitest';
import {
	buildTrueFalseFromChunk,
	pickTrueFalseVariant,
	tokenise,
	selectWordArrangeDistractors,
	buildWordArrangeFromChunk,
	buildMatchingFromChunks,
	getActivityPattern,
	type TrueFalseVariant,
} from '$lib/services/activityAssembler';
import { ActivityType } from '$lib/types/lesson';
import type { GeneratedChunk } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal valid GeneratedChunk for testing.
 * Based on "Ich heiße Max" (My name is Max) from German.
 */
function makeChunk(overrides: Partial<GeneratedChunk> = {}): GeneratedChunk {
	return {
		targetPhrase: 'Ich heiße Max',
		nativeTranslation: 'My name is Max',
		exampleSentence: 'Hallo! Ich heiße Max.',
		usageNote: 'Used when introducing yourself',
		explanation: 'This is how you tell people your name in German',
		distractors: ['My name is Maria', 'My name is Lena', 'My name is Tom'],
		correctUsageContext: 'When meeting someone new',
		wrongUsageContexts: ['When ordering food', 'When saying goodbye', 'When asking for directions'],
		coachingText: 'Let me introduce you to a very useful phrase!',
		...overrides,
	};
}

function makeChunk2(): GeneratedChunk {
	return {
		targetPhrase: 'Ich bin müde',
		nativeTranslation: 'I am tired',
		exampleSentence: 'Nach der Schule bin ich müde.',
		usageNote: 'Describes your current state',
		explanation: 'Use this to tell someone how you are feeling',
		distractors: ['I am happy', 'I am hungry', 'I am bored'],
		correctUsageContext: 'When you want to say you need to rest',
		wrongUsageContexts: ['When you are energetic', 'When ordering coffee', 'When saying hello'],
		coachingText: 'Now let me show you how to say how you feel!',
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// buildTrueFalseFromChunk
// ─────────────────────────────────────────────────────────────────────────────

describe('buildTrueFalseFromChunk', () => {
	it('translation_correct: creates a TRUE statement using the correct translation', () => {
		const chunk = makeChunk();
		const activity = buildTrueFalseFromChunk(chunk, 'translation_correct', 1);

		expect(activity.type).toBe(ActivityType.TRUE_FALSE);
		expect(activity.isTrue).toBe(true);
		expect(activity.question).toContain(chunk.targetPhrase);
		expect(activity.question).toContain(chunk.nativeTranslation);
		expect(activity.sunDrops).toBe(1);
	});

	it('translation_wrong: creates a FALSE statement using the first distractor', () => {
		const chunk = makeChunk();
		const activity = buildTrueFalseFromChunk(chunk, 'translation_wrong', 1);

		expect(activity.type).toBe(ActivityType.TRUE_FALSE);
		expect(activity.isTrue).toBe(false);
		// The question should use the first distractor (wrong translation), not the correct one
		expect(activity.question).toContain(chunk.distractors[0]);
		expect(activity.question).not.toContain(chunk.nativeTranslation);
	});

	it('context_correct: creates a TRUE statement using the correct usage context', () => {
		const chunk = makeChunk();
		const activity = buildTrueFalseFromChunk(chunk, 'context_correct', 1);

		expect(activity.isTrue).toBe(true);
		expect(activity.question).toContain(chunk.correctUsageContext);
	});

	it('context_wrong: creates a FALSE statement using the first wrong usage context', () => {
		const chunk = makeChunk();
		const activity = buildTrueFalseFromChunk(chunk, 'context_wrong', 1);

		expect(activity.isTrue).toBe(false);
		expect(activity.question).toContain(chunk.wrongUsageContexts[0]);
		expect(activity.question).not.toContain(chunk.correctUsageContext);
	});

	it('defaults to translation_correct when no variant specified', () => {
		const chunk = makeChunk();
		const activity = buildTrueFalseFromChunk(chunk);

		expect(activity.isTrue).toBe(true);
		expect(activity.question).toContain(chunk.nativeTranslation);
	});

	it('respects custom sunDrops value', () => {
		const chunk = makeChunk();
		const activity = buildTrueFalseFromChunk(chunk, 'translation_correct', 3);
		expect(activity.sunDrops).toBe(3);
	});

	it('sets targetPhrase on all variants', () => {
		const chunk = makeChunk();
		const variants: TrueFalseVariant[] = [
			'translation_correct',
			'translation_wrong',
			'context_correct',
			'context_wrong',
		];
		for (const variant of variants) {
			const activity = buildTrueFalseFromChunk(chunk, variant);
			expect(activity.targetPhrase).toBe(chunk.targetPhrase);
		}
	});

	it('handles chunk with empty distractor list gracefully (uses fallback text)', () => {
		// Edge case: AI returned empty distractors — should not throw
		const chunk = makeChunk({ distractors: [] });
		expect(() => buildTrueFalseFromChunk(chunk, 'translation_wrong')).not.toThrow();
		const activity = buildTrueFalseFromChunk(chunk, 'translation_wrong');
		// Should use fallback text
		expect(activity.question.length).toBeGreaterThan(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// pickTrueFalseVariant
// ─────────────────────────────────────────────────────────────────────────────

describe('pickTrueFalseVariant', () => {
	it('returns translation_correct for chunk index 0', () => {
		expect(pickTrueFalseVariant(0)).toBe('translation_correct');
	});

	it('returns context_wrong for chunk index 1', () => {
		expect(pickTrueFalseVariant(1)).toBe('context_wrong');
	});

	it('returns translation_wrong for chunk index 2', () => {
		expect(pickTrueFalseVariant(2)).toBe('translation_wrong');
	});

	it('returns context_correct for chunk index 3', () => {
		expect(pickTrueFalseVariant(3)).toBe('context_correct');
	});

	it('cycles back to translation_correct for chunk index 4', () => {
		expect(pickTrueFalseVariant(4)).toBe('translation_correct');
	});

	it('never throws for very large chunk indices', () => {
		expect(() => pickTrueFalseVariant(100)).not.toThrow();
		expect(() => pickTrueFalseVariant(999)).not.toThrow();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// tokenise
// ─────────────────────────────────────────────────────────────────────────────

describe('tokenise', () => {
	it('splits a normal phrase into words', () => {
		expect(tokenise('Ich heiße Max')).toEqual(['Ich', 'heiße', 'Max']);
	});

	it('handles single-word phrases', () => {
		expect(tokenise('Hallo')).toEqual(['Hallo']);
	});

	it('filters empty strings from double spaces', () => {
		expect(tokenise('Wie  geht  es')).toEqual(['Wie', 'geht', 'es']);
	});

	it('trims leading/trailing whitespace', () => {
		expect(tokenise('  Guten Morgen  ')).toEqual(['Guten', 'Morgen']);
	});

	it('returns empty array for empty string', () => {
		expect(tokenise('')).toEqual([]);
	});

	it('returns empty array for whitespace-only string', () => {
		expect(tokenise('   ')).toEqual([]);
	});

	it('handles phrases with punctuation (keeps punctuation attached to word)', () => {
		// Punctuation is part of the word token — we don't strip it
		// This is intentional: "Hallo!" is one tile, not "Hallo" + "!"
		expect(tokenise('Hallo! Wie geht es dir?')).toEqual([
			'Hallo!',
			'Wie',
			'geht',
			'es',
			'dir?',
		]);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// selectWordArrangeDistractors
// ─────────────────────────────────────────────────────────────────────────────

describe('selectWordArrangeDistractors', () => {
	it('prefers extraWords when they are not in the correct words list', () => {
		const words = ['Ich', 'heiße', 'Max'];
		const extras = ['Luna', 'bin'];
		const distractors = selectWordArrangeDistractors(words, 1, extras);

		// Should pick from extras (not from words)
		expect(distractors).toHaveLength(1);
		expect(['Luna', 'bin']).toContain(distractors[0]);
	});

	it('filters out extras that already exist in correct words', () => {
		const words = ['Ich', 'heiße', 'Max'];
		// "Ich" is already in words — should be excluded as a distractor
		const extras = ['Ich', 'Luna'];
		const distractors = selectWordArrangeDistractors(words, 1, extras);

		// "Ich" should be filtered; only "Luna" qualifies
		expect(distractors).toEqual(['Luna']);
	});

	it('falls back to repeating a word from the phrase when no extras available', () => {
		const words = ['Ich', 'bin'];
		const distractors = selectWordArrangeDistractors(words, 1, []);

		// Should return exactly 1 distractor (fallback to words[0])
		expect(distractors).toHaveLength(1);
	});

	it('returns empty array for single-word phrases with no extras (can not safely duplicate)', () => {
		// Single word — words[0] is the only word, fallback returns []
		const words = ['Hallo'];
		const distractors = selectWordArrangeDistractors(words, 1, []);
		// The fallback for single-word phrases returns empty (words.length > 1 is false)
		expect(distractors).toEqual([]);
	});

	it('respects the requested count', () => {
		const words = ['Wie', 'geht', 'es', 'dir'];
		const extras = ['Hallo', 'bin', 'heute', 'schön'];
		const distractors = selectWordArrangeDistractors(words, 2, extras);
		expect(distractors).toHaveLength(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildWordArrangeFromChunk
// ─────────────────────────────────────────────────────────────────────────────

describe('buildWordArrangeFromChunk', () => {
	it('creates an activity with the correct type', () => {
		const chunk = makeChunk();
		const activity = buildWordArrangeFromChunk(chunk);

		expect(activity.type).toBe(ActivityType.WORD_ARRANGE);
	});

	it('sets targetSentence to the full target phrase', () => {
		const chunk = makeChunk();
		const activity = buildWordArrangeFromChunk(chunk);

		expect(activity.targetSentence).toBe(chunk.targetPhrase);
	});

	it('scrambledWords contains all words from the target phrase', () => {
		const chunk = makeChunk({ targetPhrase: 'Wie geht es dir' });
		const activity = buildWordArrangeFromChunk(chunk);
		const words = tokenise(chunk.targetPhrase);

		// Every correct word must appear in scrambledWords
		for (const word of words) {
			expect(activity.scrambledWords).toContain(word);
		}
	});

	it('scrambledWords has more entries than the original phrase (distractors added)', () => {
		const chunk = makeChunk({ targetPhrase: 'Guten Morgen' }); // 2 words
		const activity = buildWordArrangeFromChunk(chunk);

		// 2 words + at least 1 distractor = 3+
		expect(activity.scrambledWords.length).toBeGreaterThan(2);
	});

	it('uses 1 distractor for short phrases (≤3 words)', () => {
		const chunk = makeChunk({ targetPhrase: 'Ich bin' }); // 2 words
		const activity = buildWordArrangeFromChunk(chunk, []);

		// 2 correct + 1 distractor = 3
		expect(activity.scrambledWords).toHaveLength(3);
	});

	it('uses 2 distractors for longer phrases (>3 words)', () => {
		const chunk = makeChunk({ targetPhrase: 'Wie geht es dir heute' }); // 5 words
		const activity = buildWordArrangeFromChunk(chunk, ['Hallo', 'schön']);

		// 5 correct + 2 distractors = 7
		expect(activity.scrambledWords).toHaveLength(7);
	});

	it('respects custom sunDrops value', () => {
		const chunk = makeChunk();
		const activity = buildWordArrangeFromChunk(chunk, [], 3);
		expect(activity.sunDrops).toBe(3);
	});

	it('sets targetPhrase on the activity', () => {
		const chunk = makeChunk();
		const activity = buildWordArrangeFromChunk(chunk);
		expect(activity.targetPhrase).toBe(chunk.targetPhrase);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildMatchingFromChunks
// ─────────────────────────────────────────────────────────────────────────────

describe('buildMatchingFromChunks', () => {
	it('creates a MATCHING activity from 2 chunks', () => {
		const chunks = [makeChunk(), makeChunk2()];
		const activity = buildMatchingFromChunks(chunks, 3);

		expect(activity.type).toBe(ActivityType.MATCHING);
		expect(activity.pairs).toHaveLength(2);
	});

	it('pairs contain the correct left (target) and right (native) values', () => {
		const chunk1 = makeChunk();
		const chunk2 = makeChunk2();
		const activity = buildMatchingFromChunks([chunk1, chunk2], 3);

		// Both phrases must appear somewhere in left column
		const leftValues = activity.pairs.map((p) => p.left);
		const rightValues = activity.pairs.map((p) => p.right);

		expect(leftValues).toContain(chunk1.targetPhrase);
		expect(leftValues).toContain(chunk2.targetPhrase);
		expect(rightValues).toContain(chunk1.nativeTranslation);
		expect(rightValues).toContain(chunk2.nativeTranslation);
	});

	it('each pair correctly links its left and right (no cross-contamination)', () => {
		const chunk1 = makeChunk();
		const chunk2 = makeChunk2();
		const activity = buildMatchingFromChunks([chunk1, chunk2], 3);

		// For every pair, the left value's correct right should be in the same pair
		for (const pair of activity.pairs) {
			if (pair.left === chunk1.targetPhrase) {
				expect(pair.right).toBe(chunk1.nativeTranslation);
			} else if (pair.left === chunk2.targetPhrase) {
				expect(pair.right).toBe(chunk2.nativeTranslation);
			}
		}
	});

	it('throws when given fewer than 2 chunks', () => {
		const chunk = makeChunk();
		expect(() => buildMatchingFromChunks([chunk], 3)).toThrow();
		expect(() => buildMatchingFromChunks([], 3)).toThrow();
	});

	it('respects the sunDrops argument', () => {
		const chunks = [makeChunk(), makeChunk2()];
		const activity = buildMatchingFromChunks(chunks, 5);
		expect(activity.sunDrops).toBe(5);
	});

	it('handles 3+ chunks correctly', () => {
		const chunk3: GeneratedChunk = { ...makeChunk2(), targetPhrase: 'Ich lerne Deutsch', nativeTranslation: 'I am learning German' };
		const chunks = [makeChunk(), makeChunk2(), chunk3];
		const activity = buildMatchingFromChunks(chunks, 4);

		expect(activity.pairs).toHaveLength(3);
		const leftValues = activity.pairs.map((p) => p.left);
		expect(leftValues).toContain('Ich lerne Deutsch');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// getActivityPattern
// ─────────────────────────────────────────────────────────────────────────────

describe('getActivityPattern', () => {
	it('returns fill_blank + true_false for even chunk indices (0, 2, 4...)', () => {
		const pattern0 = getActivityPattern(0);
		expect(pattern0.practiceType).toBe('fill_blank');
		expect(pattern0.applyType).toBe('true_false');

		const pattern2 = getActivityPattern(2);
		expect(pattern2.practiceType).toBe('fill_blank');
		expect(pattern2.applyType).toBe('true_false');

		const pattern4 = getActivityPattern(4);
		expect(pattern4.practiceType).toBe('fill_blank');
		expect(pattern4.applyType).toBe('true_false');
	});

	it('returns word_arrange + multiple_choice for odd chunk indices (1, 3, 5...)', () => {
		const pattern1 = getActivityPattern(1);
		expect(pattern1.practiceType).toBe('word_arrange');
		expect(pattern1.applyType).toBe('multiple_choice');

		const pattern3 = getActivityPattern(3);
		expect(pattern3.practiceType).toBe('word_arrange');
		expect(pattern3.applyType).toBe('multiple_choice');
	});

	it('never returns the same practice type twice in sequence (alternates)', () => {
		const types = [0, 1, 2, 3, 4].map((i) => getActivityPattern(i).practiceType);
		// Should alternate: fill_blank, word_arrange, fill_blank, word_arrange, fill_blank
		for (let i = 1; i < types.length; i++) {
			expect(types[i]).not.toBe(types[i - 1]);
		}
	});

	it('never returns undefined for any valid index', () => {
		for (let i = 0; i < 20; i++) {
			const pattern = getActivityPattern(i);
			expect(pattern.practiceType).toBeDefined();
			expect(pattern.applyType).toBeDefined();
		}
	});
});
