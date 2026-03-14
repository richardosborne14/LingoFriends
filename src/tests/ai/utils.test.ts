/**
 * Tests for src/lib/server/ai/utils.ts
 *
 * extractJSON must handle all the ways AI models return JSON:
 *   1. Bare JSON (ideal)
 *   2. Wrapped in ```json ... ``` fences (common with Anthropic)
 *   3. Wrapped in ``` ... ``` fences (no language tag)
 *   4. JSON buried in preamble text
 *   5. JSON arrays (less common but supported)
 */

import { describe, it, expect } from 'vitest';
import { extractJSON, parseJSON } from '$lib/server/ai/utils';

// ─────────────────────────────────────────────────────────────────────────────

describe('extractJSON', () => {
	it('returns bare JSON unchanged', () => {
		const json = '{"key": "value", "number": 42}';
		expect(extractJSON(json)).toBe(json);
	});

	it('strips ```json ... ``` markdown fences', () => {
		const input = '```json\n{"coreFrame": "Ich heiße ___"}\n```';
		const result = extractJSON(input);
		// Should be parseable as valid JSON
		expect(() => JSON.parse(result)).not.toThrow();
		expect(JSON.parse(result)).toEqual({ coreFrame: 'Ich heiße ___' });
	});

	it('strips ``` ... ``` fences without language tag', () => {
		const input = '```\n{"title": "Saying Your Name"}\n```';
		const result = extractJSON(input);
		expect(() => JSON.parse(result)).not.toThrow();
		expect(JSON.parse(result)).toEqual({ title: 'Saying Your Name' });
	});

	it('extracts JSON object from text with preamble', () => {
		const input = 'Here is the chunk family you requested:\n{"coreFrame": "Ich heiße ___", "title": "Greetings"}';
		const result = extractJSON(input);
		expect(() => JSON.parse(result)).not.toThrow();
		const parsed = JSON.parse(result);
		expect(parsed.coreFrame).toBe('Ich heiße ___');
	});

	it('extracts JSON array', () => {
		const input = 'The options are: [{"id": 1}, {"id": 2}]';
		const result = extractJSON(input);
		expect(() => JSON.parse(result)).not.toThrow();
		expect(JSON.parse(result)).toHaveLength(2);
	});

	it('returns trimmed original text when no JSON found', () => {
		// Should return the text as-is so the caller can handle the parse error
		const input = '  just some plain text with no JSON  ';
		const result = extractJSON(input);
		expect(result).toBe('just some plain text with no JSON');
	});

	it('handles nested JSON objects correctly', () => {
		const input = '{"outer": {"inner": {"deep": true}}}';
		const result = extractJSON(input);
		const parsed = JSON.parse(result);
		expect(parsed.outer.inner.deep).toBe(true);
	});

	it('fence extraction prioritises fences over bare JSON search', () => {
		// When fences are present, use them — don't also do the object match
		const input = '```json\n{"fromFence": true}\n```\nSome trailing text with {"fromText": true}';
		const result = extractJSON(input);
		const parsed = JSON.parse(result);
		// Should get the fenced version
		expect(parsed.fromFence).toBe(true);
		expect(parsed.fromText).toBeUndefined();
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('parseJSON', () => {
	it('parses valid JSON without throwing', () => {
		const result = parseJSON<{ key: string }>('{"key": "value"}');
		expect(result.key).toBe('value');
	});

	it('throws an error with context for invalid JSON', () => {
		expect(() => parseJSON('not json', 'chunk family')).toThrowError(/chunk family/);
	});

	it('includes a text preview in the error message', () => {
		expect(() => parseJSON('{ broken json', 'test context')).toThrowError(/test context/);
	});
});
