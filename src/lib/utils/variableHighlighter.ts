/**
 * LingoFriends V2 — Variable Highlighter
 *
 * Compares a core sentence frame to a variation and segments the variation
 * into "fixed" parts (from the frame) and "variable" parts (the slot filler).
 *
 * Used by:
 *   - WhatYoullLearn.svelte — highlights the variable slot in coral
 *   - lessonAssembler.ts (via extractSlotFiller) — pulls the fill-blank answer
 *
 * @example
 *   frame:     "Ich heiße ___"
 *   variation: "Ich heiße Max"
 *   result:    [{text: "Ich heiße ", isVariable: false}, {text: "Max", isVariable: true}]
 *
 * @example
 *   frame:     "___ ist mein Name"
 *   variation: "Max ist mein Name"
 *   result:    [{text: "Max", isVariable: true}, {text: " ist mein Name", isVariable: false}]
 *
 * @module utils/variableHighlighter
 */

/**
 * A segment of text with a flag indicating whether it is the variable slot.
 * The variable part gets rendered in coral in WhatYoullLearn.
 */
export interface TextSegment {
	text: string;
	isVariable: boolean;
}

/**
 * Splits a variation phrase into fixed and variable segments.
 *
 * The core frame must contain exactly one `___` placeholder.
 * Text before `___` is the prefix; text after is the suffix.
 * The characters in the variation that fall between matching prefix/suffix
 * positions are the variable slot (what gets highlighted in coral).
 *
 * Comparison is case-insensitive (frame and variation may differ in casing).
 * The original casing of the variation is preserved in the output.
 *
 * Falls back to [{text: variation, isVariable: false}] when:
 *   - coreFrame is empty or missing ___
 *   - The variation doesn't start with the prefix
 *   - The variation doesn't end with the suffix
 *
 * @param coreFrame - The sentence pattern with ___ (e.g., "Ich heiße ___")
 * @param variation - A concrete example phrase (e.g., "Ich heiße Max")
 */
export function highlightVariables(coreFrame: string, variation: string): TextSegment[] {
	// Guard: no frame or no slot placeholder → return whole variation as fixed
	if (!coreFrame?.includes('___')) {
		return [{ text: variation, isVariable: false }];
	}

	const slotIndex = coreFrame.indexOf('___');
	const prefix = coreFrame.substring(0, slotIndex); // Text before ___
	const suffix = coreFrame.substring(slotIndex + 3); // Text after ___

	// Use lowercase for matching but preserve original casing in output
	const varLower = variation.toLowerCase();
	const prefixLower = prefix.toLowerCase();
	const suffixLower = suffix.toLowerCase();

	// Prefix must match the start of the variation
	if (!varLower.startsWith(prefixLower)) {
		return [{ text: variation, isVariable: false }];
	}

	const variableStart = prefix.length;

	// Determine where the variable part ends (where suffix begins)
	let variableEnd: number;
	if (suffix.length === 0) {
		// No suffix: variable extends to the end of the string
		variableEnd = variation.length;
	} else if (varLower.endsWith(suffixLower)) {
		variableEnd = variation.length - suffix.length;
	} else {
		// Suffix doesn't match the end — fall back to unsegmented
		return [{ text: variation, isVariable: false }];
	}

	// Sanity check: variable region must be non-negative
	if (variableEnd < variableStart) {
		return [{ text: variation, isVariable: false }];
	}

	const segments: TextSegment[] = [];

	// 1. Fixed prefix (if any)
	if (variableStart > 0) {
		segments.push({ text: variation.substring(0, variableStart), isVariable: false });
	}

	// 2. Variable slot (even if empty — though empty slots are unusual)
	const variableText = variation.substring(variableStart, variableEnd);
	if (variableText.length > 0) {
		segments.push({ text: variableText, isVariable: true });
	}

	// 3. Fixed suffix (if any)
	if (variableEnd < variation.length) {
		segments.push({ text: variation.substring(variableEnd), isVariable: false });
	}

	// Edge case: if no segments produced (empty string?), return non-variable fallback
	return segments.length > 0 ? segments : [{ text: variation, isVariable: false }];
}

/**
 * Extracts just the variable text from a variation.
 * Convenience wrapper around highlightVariables.
 *
 * Returns the full variation if the frame doesn't match,
 * rather than throwing — graceful degradation.
 *
 * @example
 *   extractVariable("Ich heiße ___", "Ich heiße Max") → "Max"
 *   extractVariable("___ ist gut",   "Das ist gut")   → "Das"
 */
export function extractVariable(coreFrame: string, variation: string): string {
	const segments = highlightVariables(coreFrame, variation);
	const variable = segments.find((s) => s.isVariable);
	// If no variable segment found, the whole variation is the "answer"
	return variable?.text ?? variation;
}
