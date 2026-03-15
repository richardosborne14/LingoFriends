/**
 * pronunciationService.test.ts — TASK-AUDIT-02
 *
 * Tests for the pronunciation comparison algorithm.
 * All functions are pure — no mocks needed.
 *
 * Coverage:
 *   - levenshtein distance calculation
 *   - normaliseText (lowercase, punctuation, accents, whitespace)
 *   - fuzzyWordMatch (exact, accent-insensitive, levenshtein threshold)
 *   - similarityToStars (threshold mapping)
 *   - sunDropsForStars (star → reward)
 *   - calculateSpeakItSunDrops (attempt bonuses)
 *   - comparePronunciation (full pipeline — perfect, partial, empty, accents)
 */

import { describe, it, expect } from 'vitest';
import {
	levenshtein,
	normaliseText,
	fuzzyWordMatch,
	similarityToStars,
	sunDropsForStars,
	calculateSpeakItSunDrops,
	comparePronunciation,
} from '$lib/services/pronunciationService';

// ─────────────────────────────────────────────────────────────────────────────
// LEVENSHTEIN
// ─────────────────────────────────────────────────────────────────────────────

describe('levenshtein', () => {
	it('returns 0 for identical strings', () => {
		expect(levenshtein('hello', 'hello')).toBe(0);
	});

	it('returns the length of b when a is empty', () => {
		expect(levenshtein('', 'hello')).toBe(5);
	});

	it('returns the length of a when b is empty', () => {
		expect(levenshtein('hello', '')).toBe(5);
	});

	it('handles single character substitution', () => {
		// "cat" → "bat": 1 substitution
		expect(levenshtein('cat', 'bat')).toBe(1);
	});

	it('handles insertion and deletion', () => {
		// "kitten" → "sitting": 3 edits
		expect(levenshtein('kitten', 'sitting')).toBe(3);
	});

	it('handles German words with umlauts', () => {
		// "heisse" vs "heiße": small edit distance
		const dist = levenshtein('heisse', 'heiße');
		expect(dist).toBeLessThanOrEqual(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// NORMALISE TEXT
// ─────────────────────────────────────────────────────────────────────────────

describe('normaliseText', () => {
	it('lowercases the input', () => {
		expect(normaliseText('Ich HEIße MAX')).toBe('ich heiße max');
	});

	it('strips punctuation', () => {
		expect(normaliseText('hello, world!')).toBe('hello world');
	});

	it('preserves accented characters', () => {
		// é, ü, ñ should be KEPT — they're part of correct spelling
		const result = normaliseText('café über niño');
		expect(result).toContain('é');
		expect(result).toContain('ü');
		expect(result).toContain('ñ');
	});

	it('collapses multiple spaces', () => {
		expect(normaliseText('ich   heiße   max')).toBe('ich heiße max');
	});

	it('trims leading and trailing whitespace', () => {
		expect(normaliseText('  hello world  ')).toBe('hello world');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// FUZZY WORD MATCH
// ─────────────────────────────────────────────────────────────────────────────

describe('fuzzyWordMatch', () => {
	it('matches identical words', () => {
		expect(fuzzyWordMatch('hello', 'hello')).toBe(true);
	});

	it('matches words differing only by accent (diacritic)', () => {
		// Whisper may transcribe "über" as "uber" — should still match
		expect(fuzzyWordMatch('uber', 'über')).toBe(true);
	});

	it('matches short words with 1 edit (levenshtein ≤ 1 for len ≤ 4)', () => {
		// "hei" vs "hej" — 1 substitution, length 3
		expect(fuzzyWordMatch('hei', 'hej')).toBe(true);
	});

	it('rejects short words with 2+ edits', () => {
		// "cat" vs "dog" — 3 substitutions — should NOT match
		expect(fuzzyWordMatch('cat', 'dog')).toBe(false);
	});

	it('matches longer words with up to 2 edits', () => {
		// "heiße" vs "heise" — 1 edit
		expect(fuzzyWordMatch('heiße', 'heise')).toBe(true);
	});

	it('rejects words with too many edits', () => {
		// "guten" vs "hello" — very different — should NOT match
		expect(fuzzyWordMatch('guten', 'hello')).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SIMILARITY TO STARS
// ─────────────────────────────────────────────────────────────────────────────

describe('similarityToStars', () => {
	it('gives 5 stars for similarity ≥ 0.95 (near-perfect)', () => {
		expect(similarityToStars(1.0)).toBe(5);
		expect(similarityToStars(0.95)).toBe(5);
	});

	it('gives 4 stars for similarity ≥ 0.80', () => {
		expect(similarityToStars(0.80)).toBe(4);
		expect(similarityToStars(0.90)).toBe(4);
	});

	it('gives 3 stars for similarity ≥ 0.60', () => {
		expect(similarityToStars(0.60)).toBe(3);
		expect(similarityToStars(0.75)).toBe(3);
	});

	it('gives 2 stars for similarity ≥ 0.35', () => {
		expect(similarityToStars(0.35)).toBe(2);
		expect(similarityToStars(0.50)).toBe(2);
	});

	it('gives 1 star (minimum) for low similarity — NEVER 0', () => {
		expect(similarityToStars(0)).toBe(1);
		expect(similarityToStars(0.1)).toBe(1);
		expect(similarityToStars(0.34)).toBe(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SUNDROPS FOR STARS
// ─────────────────────────────────────────────────────────────────────────────

describe('sunDropsForStars', () => {
	it('awards 3 SunDrops for 5 stars', () => {
		expect(sunDropsForStars(5)).toBe(3);
	});

	it('awards 2 SunDrops for 4 stars', () => {
		expect(sunDropsForStars(4)).toBe(2);
	});

	it('awards 1 SunDrop for 3 stars', () => {
		expect(sunDropsForStars(3)).toBe(1);
	});

	it('awards 0 SunDrops for 1-2 stars (no penalty)', () => {
		// No SunDrops but crucially no DEDUCTION
		expect(sunDropsForStars(2)).toBe(0);
		expect(sunDropsForStars(1)).toBe(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATE SPEAK IT SUNDROP (with attempt bonus)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateSpeakItSunDrops', () => {
	it('returns star-based reward on attempt 1', () => {
		expect(calculateSpeakItSunDrops(5, 1)).toBe(3);
		expect(calculateSpeakItSunDrops(1, 1)).toBe(0);
	});

	it('returns star-based reward on attempt 2', () => {
		expect(calculateSpeakItSunDrops(4, 2)).toBe(2);
		expect(calculateSpeakItSunDrops(2, 2)).toBe(0);
	});

	it('returns at least 1 SunDrop on attempt 3 regardless of stars', () => {
		// Perseverance bonus — tried 3 times = minimum 1 SunDrop
		expect(calculateSpeakItSunDrops(1, 3)).toBe(1);
		expect(calculateSpeakItSunDrops(2, 3)).toBe(1);
	});

	it('awards full star-based reward on attempt 3 if earned > 1', () => {
		expect(calculateSpeakItSunDrops(5, 3)).toBe(3);
		expect(calculateSpeakItSunDrops(4, 3)).toBe(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPARE PRONUNCIATION (full pipeline)
// ─────────────────────────────────────────────────────────────────────────────

describe('comparePronunciation', () => {
	it('returns 5 stars for a perfect match', () => {
		const result = comparePronunciation('Ich heiße Max', 'Ich heiße Max');
		expect(result.stars).toBe(5);
		expect(result.similarity).toBeCloseTo(1.0);
		expect(result.feedback).toBe('perfect');
		expect(result.correctWords).toHaveLength(3);
		expect(result.differentWords).toHaveLength(0);
	});

	it('handles case-insensitive matching', () => {
		const result = comparePronunciation('Ich heiße Max', 'ich heiße max');
		expect(result.stars).toBe(5);
	});

	it('handles partial match (some words correct)', () => {
		// Child says "Ich heiße" but misses "Max" entirely
		const result = comparePronunciation('Ich heiße Max', 'Ich heiße');
		// 2/3 words correct = 0.667 similarity → 3 stars
		expect(result.stars).toBeGreaterThanOrEqual(3);
		expect(result.correctWords.length).toBeGreaterThan(0);
		expect(result.differentWords).toContain('max');
	});

	it('handles empty transcript (mic heard nothing)', () => {
		const result = comparePronunciation('Ich heiße Max', '');
		// Empty transcript → minimum star score
		expect(result.stars).toBe(1);
		expect(result.similarity).toBe(0);
		expect(result.feedback).toBe('keep_trying');
		expect(result.correctWords).toHaveLength(0);
		expect(result.differentWords).toHaveLength(3); // all 3 words wrong
	});

	it('handles accent-tolerant matching (whisper drops ß)', () => {
		// Whisper often transcribes "heiße" as "heise" — should still match
		const result = comparePronunciation('Ich heiße Max', 'Ich heise Max');
		// 3/3 words should match via fuzzy — expect high score
		expect(result.stars).toBeGreaterThanOrEqual(4);
	});

	it('populates the transcript field from the raw input', () => {
		const result = comparePronunciation('Guten Morgen', 'guten morgen');
		expect(result.transcript).toBe('guten morgen');
	});

	it('handles single-word phrase (edge case)', () => {
		const result = comparePronunciation('Hallo', 'hallo');
		expect(result.stars).toBe(5);
		expect(result.correctWords).toEqual(['hallo']);
	});

	it('returns at least 1 star — never 0 (PEDAGOGY: speaking = courage)', () => {
		// Even total nonsense should give 1 star
		const result = comparePronunciation('Guten Morgen', 'xyz abc def ghi');
		expect(result.stars).toBeGreaterThanOrEqual(1);
	});
});
