/**
 * Tests for src/lib/utils/answerMatcher.ts
 *
 * Covers: normalisation, Levenshtein distance, fuzzy matching,
 * and the main isAnswerCorrect() function with kid-learning scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
	normaliseAnswer,
	levenshteinDistance,
	getMaxFuzzyDistance,
	fuzzyMatch,
	isAnswerCorrect,
} from '$lib/utils/answerMatcher';

// ─────────────────────────────────────────────────────────────────────────────
// normaliseAnswer
// ─────────────────────────────────────────────────────────────────────────────

describe('normaliseAnswer', () => {
	it('lowercases and trims', () => {
		expect(normaliseAnswer('  Ich Heiße  ')).toBe('ich heisse');
	});

	it('converts ß to ss', () => {
		expect(normaliseAnswer('heiße')).toBe('heisse');
		expect(normaliseAnswer('Straße')).toBe('strasse');
	});

	it('strips French accents', () => {
		expect(normaliseAnswer('é')).toBe('e');
		expect(normaliseAnswer('è')).toBe('e');
		expect(normaliseAnswer('ê')).toBe('e');
		expect(normaliseAnswer('ç')).toBe('c');
		expect(normaliseAnswer('à')).toBe('a');
		expect(normaliseAnswer('Voilà')).toBe('voila');
	});

	it('strips German umlauts', () => {
		expect(normaliseAnswer('über')).toBe('uber');
		expect(normaliseAnswer('für')).toBe('fur');
		// Note: ä → a, ö → o, ü → u after NFD decomposition
		expect(normaliseAnswer('schön')).toBe('schon');
	});

	it('handles empty string', () => {
		expect(normaliseAnswer('')).toBe('');
	});

	it('handles already-normalised input', () => {
		expect(normaliseAnswer('hello')).toBe('hello');
	});

	it('preserves numbers and punctuation', () => {
		expect(normaliseAnswer('42!')).toBe('42!');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// levenshteinDistance
// ─────────────────────────────────────────────────────────────────────────────

describe('levenshteinDistance', () => {
	it('returns 0 for identical strings', () => {
		expect(levenshteinDistance('Max', 'Max')).toBe(0);
		expect(levenshteinDistance('', '')).toBe(0);
	});

	it('returns length of b when a is empty', () => {
		expect(levenshteinDistance('', 'abc')).toBe(3);
	});

	it('returns length of a when b is empty', () => {
		expect(levenshteinDistance('abc', '')).toBe(3);
	});

	it('counts a single substitution', () => {
		expect(levenshteinDistance('cat', 'bat')).toBe(1);
	});

	it('counts a single insertion', () => {
		expect(levenshteinDistance('cat', 'cats')).toBe(1);
	});

	it('counts a single deletion', () => {
		expect(levenshteinDistance('cats', 'cat')).toBe(1);
	});

	it('handles classic kitten/sitting example', () => {
		expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
	});

	it('handles heisse/heise (1 extra s)', () => {
		expect(levenshteinDistance('heisse', 'heise')).toBe(1);
	});

	it('is not commutative only when insertion≠deletion length', () => {
		// Symmetric: distance(a,b) === distance(b,a)
		expect(levenshteinDistance('abc', 'abcd')).toBe(levenshteinDistance('abcd', 'abc'));
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// getMaxFuzzyDistance
// ─────────────────────────────────────────────────────────────────────────────

describe('getMaxFuzzyDistance', () => {
	it('returns 0 for words 3 chars or less', () => {
		expect(getMaxFuzzyDistance(1)).toBe(0);
		expect(getMaxFuzzyDistance(2)).toBe(0);
		expect(getMaxFuzzyDistance(3)).toBe(0);
	});

	it('returns 1 for 4-char words', () => {
		expect(getMaxFuzzyDistance(4)).toBe(1);
	});

	it('returns 2 for 5+ char words', () => {
		expect(getMaxFuzzyDistance(5)).toBe(2);
		expect(getMaxFuzzyDistance(10)).toBe(2);
		expect(getMaxFuzzyDistance(20)).toBe(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// fuzzyMatch
// ─────────────────────────────────────────────────────────────────────────────

describe('fuzzyMatch', () => {
	it('matches identical strings', () => {
		expect(fuzzyMatch('Ich heiße Max', 'Ich heiße Max')).toBe(true);
	});

	it('matches after normalisation (different case)', () => {
		expect(fuzzyMatch('ich heisse max', 'Ich heiße Max')).toBe(true);
	});

	it('allows 1-typo in a 5-char word', () => {
		// "heise" vs "heisse" (1 char difference, 6-char word)
		expect(fuzzyMatch('Ich heise Max', 'Ich heiße Max')).toBe(true);
	});

	it('rejects completely different short word (≤3 chars)', () => {
		// "ich" vs "ach" — 1 edit but short, so exact-only
		expect(fuzzyMatch('ach bin Max', 'Ich bin Max')).toBe(false);
	});

	it('rejects wrong word count', () => {
		expect(fuzzyMatch('Ich Max', 'Ich heiße Max')).toBe(false);
	});

	it('rejects clearly wrong answer', () => {
		expect(fuzzyMatch('Ich bin Max', 'Ich heiße Max')).toBe(false);
	});

	it('handles single-word matching', () => {
		expect(fuzzyMatch('heisse', 'heiße')).toBe(true);
		expect(fuzzyMatch('Max', 'Max')).toBe(true);
		expect(fuzzyMatch('ich', 'du')).toBe(false); // 3-char, different
	});

	it('is case-insensitive', () => {
		expect(fuzzyMatch('ICH HEISSE MAX', 'Ich heiße Max')).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// isAnswerCorrect
// ─────────────────────────────────────────────────────────────────────────────

describe('isAnswerCorrect', () => {
	const correct = 'Ich heiße Max';
	const accepted = ['Ich heiße max', 'ich heiße max'];

	it('accepts the exact correct answer', () => {
		expect(isAnswerCorrect('Ich heiße Max', correct, accepted)).toBe(true);
	});

	it('accepts after normalisation (case+umlaut)', () => {
		expect(isAnswerCorrect('ich heisse max', correct, accepted)).toBe(true);
	});

	it('accepts an answer from acceptedAnswers list', () => {
		expect(isAnswerCorrect('ich heiße max', correct, accepted)).toBe(true);
	});

	it('accepts fuzzy match with 1 typo (fuzzy=true default)', () => {
		expect(isAnswerCorrect('Ich heise Max', correct, [])).toBe(true);
	});

	it('rejects fuzzy match when useFuzzy=false', () => {
		// "heise" vs "heisse" would normally fuzzy-match but not with useFuzzy=false
		expect(isAnswerCorrect('Ich heise Max', correct, [], false)).toBe(false);
	});

	it('rejects wrong answer', () => {
		expect(isAnswerCorrect('Ich bin Max', correct, accepted)).toBe(false);
	});

	it('rejects empty answer', () => {
		expect(isAnswerCorrect('', correct, accepted)).toBe(false);
	});

	it('accepts with only whitespace difference (trimmed)', () => {
		expect(isAnswerCorrect('  Ich heiße Max  ', correct, [])).toBe(true);
	});

	it('works with no acceptedAnswers array', () => {
		expect(isAnswerCorrect('Ich heiße Max', correct)).toBe(true);
	});

	// Language learning real-world scenarios
	it('accepts German without ß (common kid behaviour)', () => {
		expect(isAnswerCorrect('Ich heisse Max', 'Ich heiße Max', [])).toBe(true);
	});

	it('accepts French without accent/apostrophe (common kid behaviour)', () => {
		// "Je mappelle" vs "Je m'appelle" = 1 edit (insert apostrophe) → fuzzy ACCEPTS
		// This is correct: kids often omit apostrophes early on
		expect(isAnswerCorrect('Je mappelle', "Je m'appelle", [])).toBe(true);
		expect(isAnswerCorrect('voila', 'Voilà', [])).toBe(true); // accent stripped by normaliser
	});

	it('rejects an answer that differs by a whole word', () => {
		expect(isAnswerCorrect('Ich liebe Max', 'Ich heiße Max', [])).toBe(false);
	});
});
