/**
 * LingoFriends V2 — AI Response Utilities
 *
 * Helpers for extracting structured data from raw AI responses.
 * AI models sometimes wrap JSON in markdown fences or add preamble text —
 * these utilities strip that noise and return clean JSON strings.
 *
 * @module server/ai/utils
 */

/**
 * Extracts a JSON string from AI response text.
 *
 * Handles three common patterns from AI responses:
 *   1. JSON wrapped in ```json ... ``` fences (Anthropic models often do this)
 *   2. JSON wrapped in ``` ... ``` fences (no language tag)
 *   3. Bare JSON object/array (Groq with json_object mode)
 *   4. JSON with preamble text (e.g., "Here is the result: { ... }")
 *
 * @param text - Raw text from the AI model
 * @returns The extracted JSON string, or the original text if no extraction possible
 *
 * @example
 * extractJSON('```json\n{"key": "val"}\n```') // → '{"key": "val"}'
 * extractJSON('Here is the JSON: {"key": "val"}') // → '{"key": "val"}'
 * extractJSON('{"key": "val"}') // → '{"key": "val"}'
 */
export function extractJSON(text: string): string {
	// Strategy 1: Strip markdown fences (```json ... ``` or ``` ... ```)
	// Haiku sometimes wraps responses in fences despite being told not to
	const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenceMatch) {
		return fenceMatch[1].trim();
	}

	// Strategy 2: Find the first JSON structure (object or array) in the text.
	// We need to check which comes first — a `{` or a `[` — so we don't
	// greedily match object patterns *inside* an outer array (which would
	// return invalid JSON like `{"id": 1}, {"id": 2}` instead of the full array).
	const firstBrace = text.indexOf('{');
	const firstBracket = text.indexOf('[');

	// If `[` appears in the text AND comes before the first `{` (or there is no `{`),
	// try the array match first.
	if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
		const arrayMatch = text.match(/\[[\s\S]*\]/);
		if (arrayMatch) {
			return arrayMatch[0];
		}
	}

	// Otherwise try to extract a JSON object
	const objectMatch = text.match(/\{[\s\S]*\}/);
	if (objectMatch) {
		return objectMatch[0];
	}

	// Fallback array match (for cases where object extraction failed)
	const arrayMatchFallback = text.match(/\[[\s\S]*\]/);
	if (arrayMatchFallback) {
		return arrayMatchFallback[0];
	}

	// Fallback: return trimmed original text and let the caller handle parse errors
	return text.trim();
}

/**
 * Safely parses JSON with a descriptive error message.
 *
 * Wraps JSON.parse to provide more context in error messages,
 * making debugging AI response failures much easier.
 *
 * @param text - JSON string to parse
 * @param context - Description of what we're parsing (for error messages)
 * @throws Error with context if JSON is invalid
 */
export function parseJSON<T>(text: string, context: string = 'AI response'): T {
	try {
		return JSON.parse(text) as T;
	} catch (err) {
		// Include a preview of the bad text to help diagnose the issue
		const preview = text.length > 200 ? text.slice(0, 200) + '...' : text;
		throw new Error(
			`[ai/utils] Failed to parse ${context} as JSON.\n` +
				`Parse error: ${err instanceof Error ? err.message : String(err)}\n` +
				`Text preview: ${preview}`
		);
	}
}
