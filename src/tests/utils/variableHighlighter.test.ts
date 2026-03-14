/**
 * Tests for src/lib/utils/variableHighlighter.ts
 *
 * Covers: prefix+suffix extraction, case-insensitive matching,
 * edge cases (no frame, no slot, variable at start/end), and extractVariable().
 */

import { describe, it, expect } from 'vitest';
import { highlightVariables, extractVariable } from '$lib/utils/variableHighlighter';

// ─────────────────────────────────────────────────────────────────────────────
// highlightVariables
// ─────────────────────────────────────────────────────────────────────────────

describe('highlightVariables', () => {
	// ── Standard case: variable at end ──────────────────────────────────────
	it('identifies variable at end of frame', () => {
		const result = highlightVariables('Ich heiße ___', 'Ich heiße Max');
		expect(result).toEqual([
			{ text: 'Ich heiße ', isVariable: false },
			{ text: 'Max', isVariable: true },
		]);
	});

	it('identifies variable at start of frame', () => {
		const result = highlightVariables('___ ist mein Name', 'Max ist mein Name');
		expect(result).toEqual([
			{ text: 'Max', isVariable: true },
			{ text: ' ist mein Name', isVariable: false },
		]);
	});

	it('identifies variable in the middle of frame', () => {
		const result = highlightVariables('Ich ___ Fußball', 'Ich spiele Fußball');
		expect(result).toEqual([
			{ text: 'Ich ', isVariable: false },
			{ text: 'spiele', isVariable: true },
			{ text: ' Fußball', isVariable: false },
		]);
	});

	// ── Case-insensitive matching ──────────────────────────────────────────
	it('matches prefix case-insensitively but preserves output casing', () => {
		const result = highlightVariables('ich heiße ___', 'Ich heiße Max');
		// Falls back to non-variable because lowercase prefix doesn't match "Ich "
		// Actually it should match because we use varLower.startsWith(prefixLower)
		expect(result).toEqual([
			{ text: 'Ich heiße ', isVariable: false },
			{ text: 'Max', isVariable: true },
		]);
	});

	// ── Edge cases ──────────────────────────────────────────────────────────
	it('returns whole string as non-variable when frame has no ___', () => {
		const result = highlightVariables('Ich heiße Max', 'Ich heiße Max');
		expect(result).toEqual([{ text: 'Ich heiße Max', isVariable: false }]);
	});

	it('returns whole string as non-variable when frame is empty', () => {
		const result = highlightVariables('', 'Ich heiße Max');
		expect(result).toEqual([{ text: 'Ich heiße Max', isVariable: false }]);
	});

	it('returns whole string when prefix does not match variation', () => {
		const result = highlightVariables('Du heiße ___', 'Ich heiße Max');
		expect(result).toEqual([{ text: 'Ich heiße Max', isVariable: false }]);
	});

	it('returns whole string when suffix does not match variation', () => {
		const result = highlightVariables('___ heiße ich', 'Max heiße du');
		// "du" does not end with " ich"
		expect(result).toEqual([{ text: 'Max heiße du', isVariable: false }]);
	});

	it('handles frame that is only ___', () => {
		const result = highlightVariables('___', 'Ich heiße Max');
		expect(result).toEqual([{ text: 'Ich heiße Max', isVariable: true }]);
	});

	it('handles multi-word variable slot', () => {
		const result = highlightVariables('Ich heiße ___', 'Ich heiße Professor Keks');
		expect(result).toEqual([
			{ text: 'Ich heiße ', isVariable: false },
			{ text: 'Professor Keks', isVariable: true },
		]);
	});

	it('handles variation with same prefix as frame but no extra words', () => {
		// Edge: variation = prefix only (slot is empty string)
		const result = highlightVariables('Ich heiße ___', 'Ich heiße ');
		// variableText is '' (empty) → no variable segment added
		expect(result).toEqual([{ text: 'Ich heiße ', isVariable: false }]);
	});

	// ── Real-world language examples ──────────────────────────────────────
	it('works with French frame', () => {
		const result = highlightVariables("Je m'appelle ___", "Je m'appelle Marie");
		expect(result).toEqual([
			{ text: "Je m'appelle ", isVariable: false },
			{ text: 'Marie', isVariable: true },
		]);
	});

	it('works with German frame including umlaut', () => {
		const result = highlightVariables('Ich habe ___ Geschwister', 'Ich habe zwei Geschwister');
		expect(result).toEqual([
			{ text: 'Ich habe ', isVariable: false },
			{ text: 'zwei', isVariable: true },
			{ text: ' Geschwister', isVariable: false },
		]);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// extractVariable
// ─────────────────────────────────────────────────────────────────────────────

describe('extractVariable', () => {
	it('extracts the variable part from a variation', () => {
		expect(extractVariable('Ich heiße ___', 'Ich heiße Max')).toBe('Max');
	});

	it('extracts variable at start of frame', () => {
		expect(extractVariable('___ ist mein Name', 'Marie ist mein Name')).toBe('Marie');
	});

	it('extracts multi-word variable', () => {
		expect(extractVariable('Ich heiße ___', 'Ich heiße Professor Keks')).toBe('Professor Keks');
	});

	it('returns full variation when no frame match', () => {
		expect(extractVariable('Du bist ___', 'Ich heiße Max')).toBe('Ich heiße Max');
	});

	it('returns full variation when no ___ in frame', () => {
		expect(extractVariable('Ich heiße Max', 'Ich heiße Max')).toBe('Ich heiße Max');
	});

	it('returns full variation when frame is empty', () => {
		expect(extractVariable('', 'Ich heiße Max')).toBe('Ich heiße Max');
	});
});
