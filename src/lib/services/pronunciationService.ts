/**
 * pronunciationService.ts — TASK-AUDIT-02: Speak It Activity
 *
 * Pure-function service for comparing a child's spoken attempt against the
 * expected target phrase. Used by SpeakItActivity.svelte after Whisper STT
 * returns the transcript.
 *
 * CRITICAL PEDAGOGY RULES (see PEDAGOGY.md — Affective Filter):
 * - NEVER return 0 stars — every attempt earns at least 1 star (speaking = courage)
 * - ALWAYS start feedback with what they got RIGHT (strengths-based approach)
 * - NEVER say "wrong" or "incorrect" — use "close", "almost", "keep trying"
 * - Every star tier has an encouraging message, even the lowest
 *
 * @module services/pronunciationService
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Star rating for a pronunciation attempt.
 * 5 is perfect, 1 is a brave first try.
 * NEVER 0 — speaking takes courage regardless of accuracy.
 */
export type StarRating = 1 | 2 | 3 | 4 | 5;

/**
 * Feedback category used to select i18n message keys.
 * Maps to entries in the `pronunciation.feedback` i18n namespace.
 */
export type FeedbackCategory = 'perfect' | 'great' | 'good' | 'close' | 'keep_trying';

/**
 * Full result from comparing a child's spoken attempt to the expected phrase.
 */
export interface PronunciationResult {
	/** 1-5 stars. Never 0. */
	stars: StarRating;
	/**
	 * Similarity ratio from 0 to 1.
	 * 1.0 = exact word-for-word match after normalisation.
	 */
	similarity: number;
	/** Feedback category for selecting the i18n message */
	feedback: FeedbackCategory;
	/** The raw Whisper transcript (what the child said) */
	transcript: string;
	/** Words the child got correct (for positive reinforcement) */
	correctWords: string[];
	/**
	 * Words that were different from the expected phrase.
	 * Used to hint at the "tricky part" in feedback messages.
	 * Empty if the child got everything right.
	 */
	differentWords: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVENSHTEIN DISTANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the Levenshtein edit distance between two strings.
 *
 * Classic dynamic-programming implementation.
 * O(m*n) time and space where m, n are the string lengths.
 *
 * Used for fuzzy word matching — allows 1-2 character differences to
 * account for accent errors and minor mispronunciations in Whisper output.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Number of single-character edits required to transform a into b
 */
export function levenshtein(a: string, b: string): number {
	// Early exits for trivial cases
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	// Build the DP matrix
	// Row i corresponds to a[0..i-1], column j corresponds to b[0..j-1]
	const matrix: number[][] = [];

	for (let i = 0; i <= a.length; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= b.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1,     // deletion
				matrix[i][j - 1] + 1,     // insertion
				matrix[i - 1][j - 1] + cost // substitution
			);
		}
	}

	return matrix[a.length][b.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALISATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises a phrase for comparison.
 *
 * Operations:
 * - Lowercase
 * - Strip punctuation EXCEPT accented characters (é, ü, ñ etc.)
 *   Accented chars are KEPT because they're part of correct spelling.
 *   We strip them separately in the fuzzy match if needed.
 * - Collapse whitespace
 * - Trim
 *
 * @param text - Raw text to normalise
 * @returns Normalised text suitable for word-level comparison
 */
export function normaliseText(text: string): string {
	return text
		.toLowerCase()
		// Remove punctuation except accented Latin chars and spaces
		// Unicode range U+00C0–U+024F covers most European accented chars
		.replace(/[^\w\s\u00C0-\u024F]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Strips diacritics (accents) from a string.
 * Used for SECONDARY comparison only — we first try WITH accents, then without.
 * Example: "heiße" → "heisse" (approximate)
 */
function stripDiacritics(text: string): string {
	return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// FUZZY WORD MATCHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if two words should be considered "the same" for pronunciation scoring.
 *
 * Strategy (in order of precision):
 * 1. Exact match after normalisation
 * 2. Exact match after also stripping diacritics (accent errors)
 * 3. Levenshtein ≤ 1 for words ≤ 4 chars (short words: one typo allowed)
 * 4. Levenshtein ≤ 2 for words > 4 chars (longer words: two edits allowed)
 *
 * WHY this threshold: Whisper transcription of children's accented speech
 * often adds/removes 1-2 characters. Being too strict demotivates kids.
 * Being too loose makes the star rating meaningless.
 *
 * @param a - First word (already normalised)
 * @param b - Second word (already normalised)
 * @returns true if the words should be counted as matching
 */
export function fuzzyWordMatch(a: string, b: string): boolean {
	// 1. Exact match
	if (a === b) return true;

	// 2. Match after stripping accents
	const aStripped = stripDiacritics(a);
	const bStripped = stripDiacritics(b);
	if (aStripped === bStripped) return true;

	// 3/4. Levenshtein distance — threshold depends on word length
	// Short words (≤ 4 chars) are less forgiving because there's less room for error
	const maxDist = b.length <= 4 ? 1 : 2;
	return levenshtein(a, b) <= maxDist;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAR RATING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a similarity ratio (0-1) to a star rating (1-5).
 *
 * Thresholds are INTENTIONALLY generous — children are still developing
 * pronunciation and Whisper may mishear accented speech.
 * See PEDAGOGY.md — Krashen's Affective Filter: never stack failures.
 *
 * @param similarity - Word-match ratio from 0 to 1
 * @returns Star rating from 1 (keep trying) to 5 (perfect)
 */
export function similarityToStars(similarity: number): StarRating {
	if (similarity >= 0.95) return 5; // Near-perfect — every word matched
	if (similarity >= 0.80) return 4; // Great — one word slightly off
	if (similarity >= 0.60) return 3; // Good — getting there
	if (similarity >= 0.35) return 2; // Close — recognisable attempt
	return 1;                         // Brave try — keep going!
	// NOTE: 0 stars is NEVER returned (PEDAGOGY.md — speaking = courage)
}

/**
 * Maps a star rating to its feedback category.
 * Category is used as an i18n key for the feedback message.
 */
export function starsTofeedback(stars: StarRating): FeedbackCategory {
	const map: Record<StarRating, FeedbackCategory> = {
		5: 'perfect',
		4: 'great',
		3: 'good',
		2: 'close',
		1: 'keep_trying',
	};
	return map[stars];
}

// ─────────────────────────────────────────────────────────────────────────────
// SUNDROP AWARDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates SunDrops earned for a pronunciation attempt.
 *
 * RULE: Pronunciation activity NEVER deducts SunDrops (no penalty).
 * Maximum possible is 3 SunDrops (for 5 stars).
 *
 * After 3 total attempts at any score, always award 1 SunDrop minimum —
 * sustained effort (trying three times) deserves recognition.
 *
 * @param stars - Star rating (1-5)
 * @param attemptNumber - Which attempt this is (1, 2, or 3)
 * @returns SunDrops to award (0-3, but at least 1 on the 3rd attempt)
 */
export function calculateSpeakItSunDrops(stars: StarRating, attemptNumber: number): number {
	// After 3 attempts, always reward effort — perseverance matters
	if (attemptNumber >= 3) {
		const earned = sunDropsForStars(stars);
		return Math.max(1, earned); // Minimum 1 for reaching attempt 3
	}
	return sunDropsForStars(stars);
}

/**
 * Pure star → SunDrops mapping.
 * Exported separately so tests can verify the scale independently.
 *
 * 5 stars: 3 SunDrops — excellent pronunciation
 * 4 stars: 2 SunDrops — great attempt
 * 3 stars: 1 SunDrop  — good effort
 * 1-2 stars: 0 SunDrops — but NO penalty (speaking is still brave)
 */
export function sunDropsForStars(stars: StarRating): number {
	if (stars === 5) return 3;
	if (stars === 4) return 2;
	if (stars === 3) return 1;
	return 0; // Stars 1-2: no reward, but crucially NO deduction
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPARISON FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compares a child's spoken attempt against the expected target phrase.
 *
 * Algorithm:
 * 1. Normalise both strings (lowercase, strip punctuation, keep accented chars)
 * 2. Split into words
 * 3. For each expected word: check if any transcript word fuzzy-matches it
 * 4. Similarity = correct words / total expected words
 * 5. Convert to star rating and feedback category
 *
 * @param expected  - The target phrase the child was asked to say
 * @param transcript - What Whisper heard from the child
 * @returns PronunciationResult with stars, similarity, feedback, and word breakdown
 */
export function comparePronunciation(expected: string, transcript: string): PronunciationResult {
	// Normalise both strings to remove punctuation and case differences
	const normExpected = normaliseText(expected);
	const normTranscript = normaliseText(transcript);

	// Split into words for word-level comparison
	// Word-level is more meaningful than character-level for language learning
	const expectedWords = normExpected.split(/\s+/).filter(Boolean);
	const transcriptWords = normTranscript.split(/\s+/).filter(Boolean);

	// Handle empty transcript — Whisper returned nothing (mic issue, silence, etc.)
	if (transcriptWords.length === 0) {
		return {
			stars: 1,
			similarity: 0,
			feedback: 'keep_trying',
			transcript,
			correctWords: [],
			differentWords: expectedWords,
		};
	}

	// Check each expected word against all transcript words
	// We use "any transcript word matches" rather than positional matching
	// because word order varies with children's pronunciation
	const correctWords: string[] = [];
	const differentWords: string[] = [];

	for (const expectedWord of expectedWords) {
		const matched = transcriptWords.some((tw) => fuzzyWordMatch(tw, expectedWord));
		if (matched) {
			correctWords.push(expectedWord);
		} else {
			differentWords.push(expectedWord);
		}
	}

	// Similarity is the fraction of expected words the child got right
	const similarity = expectedWords.length > 0
		? correctWords.length / expectedWords.length
		: 0;

	const stars = similarityToStars(similarity);
	const feedback = starsTofeedback(stars);

	return {
		stars,
		similarity,
		feedback,
		transcript,
		correctWords,
		differentWords,
	};
}
