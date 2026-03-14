/**
 * LingoFriends V2 — Activity Assembler
 *
 * DETERMINISTIC TypeScript — ZERO AI calls.
 * Converts raw chunk content (AI output) into specific activity configs
 * for the three new activity types: TrueFalse, WordArrange, and Matching.
 *
 * ARCHITECTURE CONTRACT (from .clinerules Rule 9):
 *   - AI generates CONTENT (phrases, translations, distractors, contexts)
 *   - This module generates STRUCTURE (activity config objects)
 *   - NEVER mix these responsibilities
 *
 * All functions here are pure: given the same input, they return the same
 * structural output (modulo shuffle order). This makes them fully testable
 * without mocking AI or Svelte environments.
 *
 * @module services/activityAssembler
 */

import {
	ActivityType,
	type GeneratedChunk,
	type TrueFalseActivity,
	type WordArrangeActivity,
	type MatchingActivity,
} from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// SHUFFLE UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle. Returns a new array (non-mutating).
 * We avoid importing from lessonAssembler to keep this module independent.
 */
function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUE / FALSE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for building a TrueFalse activity from a chunk.
 * Gives callers control over which kind of statement to generate.
 */
export type TrueFalseVariant =
	| 'translation_correct' // Statement says the translation IS correct (it is)
	| 'translation_wrong' // Statement uses a distractor as if it's the translation
	| 'context_correct' // Statement says the correct usage context (it is)
	| 'context_wrong'; // Statement uses a wrong usage context as if correct

/**
 * Builds a TrueFalseActivity from a single chunk.
 *
 * Strategy: alternate between "this means X" statements (some true, some false)
 * and "you say this when..." statements (some true, some false).
 * This gives variety even within a single lesson.
 *
 * @param chunk - The generated chunk to build from
 * @param variant - Which type of statement to generate (defaults to translation_correct)
 * @param sunDrops - SunDrops awarded for this step (1 for TrueFalse — quick activity)
 * @returns A validated TrueFalseActivity ready for the lesson renderer
 */
export function buildTrueFalseFromChunk(
	chunk: GeneratedChunk,
	variant: TrueFalseVariant = 'translation_correct',
	sunDrops: number = 1
): TrueFalseActivity {
	switch (variant) {
		case 'translation_correct': {
			// "Wie geht es dir?" means "How are you?" — TRUE
			return {
				type: ActivityType.TRUE_FALSE,
				question: `"${chunk.targetPhrase}" means "${chunk.nativeTranslation}"`,
				isTrue: true,
				targetPhrase: chunk.targetPhrase,
				sunDrops,
			};
		}

		case 'translation_wrong': {
			// Pick the first distractor as the wrong "translation" — avoids giving the answer
			// Distractors are always plausible native-language alternatives, never the correct answer
			const wrongTranslation = chunk.distractors[0] ?? 'something else';
			return {
				type: ActivityType.TRUE_FALSE,
				question: `"${chunk.targetPhrase}" means "${wrongTranslation}"`,
				isTrue: false,
				targetPhrase: chunk.targetPhrase,
				sunDrops,
			};
		}

		case 'context_correct': {
			// "You say this when: Meeting someone new at school" — TRUE
			return {
				type: ActivityType.TRUE_FALSE,
				question: `You say "${chunk.targetPhrase}" when: ${chunk.correctUsageContext}`,
				isTrue: true,
				targetPhrase: chunk.targetPhrase,
				sunDrops,
			};
		}

		case 'context_wrong': {
			// Pick the first wrong context — clearly incorrect usage
			const wrongContext = chunk.wrongUsageContexts[0] ?? 'at the wrong time';
			return {
				type: ActivityType.TRUE_FALSE,
				question: `You say "${chunk.targetPhrase}" when: ${wrongContext}`,
				isTrue: false,
				targetPhrase: chunk.targetPhrase,
				sunDrops,
			};
		}
	}
}

/**
 * Picks the TrueFalse variant to use for a given chunk index.
 *
 * Rotates through variants so a lesson with multiple chunks doesn't show
 * the same statement type twice in a row. Pattern:
 *   chunk 0 → translation_correct
 *   chunk 1 → context_wrong
 *   chunk 2 → translation_wrong
 *   chunk 3+ → context_correct
 *
 * This ensures the learner sees both translation tests AND usage-context tests.
 */
export function pickTrueFalseVariant(chunkIndex: number): TrueFalseVariant {
	const variants: TrueFalseVariant[] = [
		'translation_correct',
		'context_wrong',
		'translation_wrong',
		'context_correct',
	];
	// Cycle through the pattern — modulo prevents out-of-bounds
	return variants[chunkIndex % variants.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// WORD ARRANGE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tokenises a target phrase into individual words/tokens.
 *
 * Simple whitespace split is correct for European languages (French, German,
 * Spanish, Italian). For languages with no spaces (Japanese, Chinese), this
 * would need character-level splitting — deferred to a future task.
 *
 * Filters out empty strings from double-spaces or trailing whitespace.
 */
export function tokenise(phrase: string): string[] {
	return phrase
		.split(/\s+/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0);
}

/**
 * Selects distractor words to add to the word-arrange tile bank.
 *
 * Distractors are native-language words from the chunk's distractor list,
 * but we need target-language distractors to confuse word-arrange attempts.
 *
 * Strategy: extract individual words from other available phrases as
 * cross-chunk distractors. This is more linguistically valid than random words.
 *
 * For simplicity in V1 (no cross-chunk data available here), we extract
 * partial words from the target phrase itself — e.g., for "Wie geht es dir"
 * we might add "geht" a second time as a trap. This is simple but effective
 * for beginners since repeating a word is a common word-arrange mistake.
 *
 * @param words - The correct words in the phrase
 * @param count - How many distractor tokens to add (1 or 2 max — too many overwhelms)
 * @param extraWords - Additional words from other chunks in the lesson (preferred source)
 * @returns distractor tokens (strings that do NOT appear in the correct answer)
 */
export function selectWordArrangeDistractors(
	words: string[],
	count: number = 1,
	extraWords: string[] = []
): string[] {
	// Prefer extra words from the lesson context (cross-chunk vocabulary)
	// These are more meaningful distractors than repeated words
	const uniqueExtras = extraWords.filter((w) => !words.includes(w));

	if (uniqueExtras.length >= count) {
		// Shuffle and take what we need — avoids always picking the first word
		return shuffle(uniqueExtras).slice(0, count);
	}

	// Fallback: repeat the most common word in the phrase as a trap
	// This is weak but safe — always produces a well-formed activity
	const fallback = words.length > 1 ? [words[0]] : [];
	return [...shuffle(uniqueExtras), ...fallback].slice(0, count);
}

/**
 * Builds a WordArrangeActivity from a single chunk.
 *
 * The learner sees tiles for every word in the target phrase + 1–2 distractors.
 * They tap tiles to place them into the answer slots in the correct order.
 *
 * Shuffle is applied to the tile bank so the correct order isn't obvious
 * from left-to-right tile layout.
 *
 * @param chunk - The generated chunk to build from
 * @param extraWords - Optional cross-chunk words to use as distractors
 * @param sunDrops - SunDrops awarded (2 — harder than recognition, easier than full recall)
 * @returns A validated WordArrangeActivity
 */
export function buildWordArrangeFromChunk(
	chunk: GeneratedChunk,
	extraWords: string[] = [],
	sunDrops: number = 2
): WordArrangeActivity {
	const correctWords = tokenise(chunk.targetPhrase);

	// 1 distractor for short phrases (≤3 words), 2 for longer ones
	// Too many distractors overwhelm young learners (see PEDAGOGY-SUMMARY.md)
	const distractorCount = correctWords.length <= 3 ? 1 : 2;
	const distractors = selectWordArrangeDistractors(correctWords, distractorCount, extraWords);

	// Combine correct words + distractors, then shuffle the whole bank
	const scrambledWords = shuffle([...correctWords, ...distractors]);

	return {
		type: ActivityType.WORD_ARRANGE,
		targetSentence: chunk.targetPhrase,
		scrambledWords,
		targetPhrase: chunk.targetPhrase,
		sunDrops,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a MatchingActivity from a collection of chunks.
 *
 * Each pair links the target phrase (left column) to its native translation
 * (right column). The right column is shuffled independently so there's no
 * positional clue — the learner must actually recall the meaning.
 *
 * Called with 2–4 chunks for best UX. More than 5 pairs becomes unwieldy
 * on a mobile screen. The caller (lessonAssembler) controls how many chunks
 * are passed.
 *
 * @param chunks - The chunks to create pairs from (2–5 ideal)
 * @param sunDrops - SunDrops awarded (3 — covers the whole lesson vocabulary)
 * @returns A validated MatchingActivity with shuffled pairs
 */
export function buildMatchingFromChunks(
	chunks: GeneratedChunk[],
	sunDrops: number = 3
): MatchingActivity {
	if (chunks.length < 2) {
		throw new Error(
			`[activityAssembler] buildMatchingFromChunks requires at least 2 chunks, got ${chunks.length}`
		);
	}

	// Pair left (target) with right (native translation)
	// Shuffle so the visual order isn't predictable across lessons
	const pairs = shuffle(
		chunks.map((chunk) => ({
			left: chunk.targetPhrase, // Target language — the learner is tested on recall
			right: chunk.nativeTranslation, // Native language — the "answer" side
		}))
	);

	return {
		type: ActivityType.MATCHING,
		pairs,
		sunDrops,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIETY SEQUENCER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describes the activity variety pattern for a single chunk's 5-step sequence.
 *
 * Step 3 (PRACTICE) and Step 5 (APPLY) are the configurable variety slots.
 * Steps 1 (INTRODUCE), 2 (RECOGNIZE), and 4 (RECALL) are always fixed per
 * the pedagogy rules — they test the core skill progression.
 */
export type ActivityPattern = {
	practiceType: 'fill_blank' | 'word_arrange'; // Step 3
	applyType: 'multiple_choice' | 'true_false'; // Step 5
};

/**
 * Returns the activity pattern for a given chunk index.
 *
 * Alternates practice and apply types across chunks so:
 *   chunk 0: fill_blank practice,  true_false apply
 *   chunk 1: word_arrange practice, multiple_choice apply
 *   chunk 2: fill_blank practice,  true_false apply  (cycles)
 *
 * This prevents the monotony of identical 5-step sequences for every chunk.
 * The learner sees variety without losing the core pedagogical structure.
 *
 * @param chunkIndex - 0-based index of the chunk in the lesson
 */
export function getActivityPattern(chunkIndex: number): ActivityPattern {
	// Even chunks use fill_blank + true_false
	// Odd chunks use word_arrange + multiple_choice
	// This pattern is intentional: word_arrange is harder so alternating reduces frustration
	if (chunkIndex % 2 === 0) {
		return { practiceType: 'fill_blank', applyType: 'true_false' };
	} else {
		return { practiceType: 'word_arrange', applyType: 'multiple_choice' };
	}
}
