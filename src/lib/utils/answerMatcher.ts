/**
 * LingoFriends V2 — Answer Matching Utilities
 *
 * Pure functions for comparing user answers to correct answers.
 * Used by FillBlankActivity, TranslateActivity, and WordArrangeActivity.
 *
 * Matching strategy (kid-friendly, per task-3.2 decisions):
 *   1. Normalise: lowercase + trim + strip diacritics
 *   2. Exact match after normalisation
 *   3. Optional fuzzy: adaptive Levenshtein tolerance by word length
 *      (≤3 chars = exact, 4 chars = 1 edit, 5+ chars = 2 edits)
 *
 * WHY we strip diacritics: kids learning German/French will often omit
 * umlauts/accents early on — "heiße" and "heisse" should count as correct.
 *
 * @module utils/answerMatcher
 */

// ─────────────────────────────────────────────────────────────────────────────
// NORMALISATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises a string for answer comparison.
 *
 * Steps:
 *   1. Trim leading/trailing whitespace
 *   2. Lowercase
 *   3. NFD decomposition + strip combining diacritical marks (é→e, ü→u, ß→ss handled separately)
 *
 * Note on ß: German "ß" normalises to "ss" via the lowercase mapping in some locales.
 * We explicitly handle it to avoid "Ich heiße" vs "Ich heisse" mismatches.
 */
export function normaliseAnswer(text: string): string {
	return (
		text
			.trim()
			.toLowerCase()
			// ß is a common German char that kids may type as ss
			.replace(/ß/g, 'ss')
			// NFD splits accented chars into base + combining mark (é → e + ́)
			// then we strip the combining marks
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVENSHTEIN DISTANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the Levenshtein edit distance between two strings.
 * Classic O(m×n) DP — acceptable for short words/phrases.
 *
 * @example
 *   levenshteinDistance("kitten", "sitting") → 3
 *   levenshteinDistance("Max", "Max")        → 0
 *   levenshteinDistance("heiße", "heise")    → 1 (extra e)
 */
export function levenshteinDistance(a: string, b: string): number {
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	// Allocate the DP matrix
	const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
		const row = new Array<number>(b.length + 1).fill(0);
		row[0] = i;
		return row;
	});

	for (let j = 0; j <= b.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			if (a[i - 1] === b[j - 1]) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j] + 1, // deletion
					matrix[i][j - 1] + 1, // insertion
					matrix[i - 1][j - 1] + 1 // substitution
				);
			}
		}
	}

	return matrix[a.length][b.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// FUZZY MATCHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the maximum allowed Levenshtein distance for a "kid-friendly" fuzzy match.
 *
 * WHY this scale: "ich" and "ach" have distance 1 but are completely different words.
 * Strict tolerance on short words prevents false positives while still being forgiving
 * on longer words where kids commonly make typos.
 *
 *   ≤ 3 chars → 0 (exact match only — too easy to mis-match short words)
 *   4 chars   → 1 (e.g., "habe" vs "hbae" → ok)
 *   5+ chars  → 2 (e.g., "heiße" vs "heise" → ok)
 */
export function getMaxFuzzyDistance(wordLength: number): number {
	if (wordLength <= 3) return 0;
	if (wordLength <= 4) return 1;
	return 2;
}

/**
 * Checks if two strings are a fuzzy match.
 *
 * For multi-word phrases, EACH word is checked with adaptive tolerance.
 * Word count must match — we don't attempt sequence alignment.
 *
 * @example
 *   fuzzyMatch("Ich heise Max", "Ich heiße Max")  → true  (1 edit in middle word)
 *   fuzzyMatch("Ich bin Max",   "Ich heiße Max")  → false (completely different word)
 */
export function fuzzyMatch(userAnswer: string, correctAnswer: string): boolean {
	const userNorm = normaliseAnswer(userAnswer);
	const correctNorm = normaliseAnswer(correctAnswer);

	// Fast path: exact normalised match
	if (userNorm === correctNorm) return true;

	const userWords = userNorm.split(/\s+/);
	const correctWords = correctNorm.split(/\s+/);

	// Word count must match — a missing word is not a typo
	if (userWords.length !== correctWords.length) return false;

	// Every word must fuzzy-match its counterpart
	for (let i = 0; i < correctWords.length; i++) {
		const maxDist = getMaxFuzzyDistance(correctWords[i].length);
		const dist = levenshteinDistance(userWords[i], correctWords[i]);
		if (dist > maxDist) return false;
	}

	return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ANSWER CHECKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a user's answer is correct.
 *
 * Checks all accepted answers (including correctAnswer) in order:
 *   1. Exact normalised match
 *   2. Fuzzy match (if enabled)
 *
 * @param userAnswer    - What the user typed
 * @param correctAnswer - The canonical correct answer
 * @param acceptedAnswers - Additional accepted variations (e.g., contractions, alt spellings)
 * @param useFuzzy      - Allow fuzzy matching (default: true, for TranslateActivity)
 *                        Set false for activities needing exact answers (future)
 *
 * @example
 * isAnswerCorrect("ich heisse max", "Ich heiße Max", []) → true  (normalised)
 * isAnswerCorrect("Ich heise Max",  "Ich heiße Max", []) → true  (fuzzy)
 * isAnswerCorrect("Ich bin Max",    "Ich heiße Max", []) → false
 */
export function isAnswerCorrect(
	userAnswer: string,
	correctAnswer: string,
	acceptedAnswers: string[] = [],
	useFuzzy = true
): boolean {
	const userNorm = normaliseAnswer(userAnswer);
	const allAccepted = [correctAnswer, ...acceptedAnswers];

	// 1. Exact normalised match against any accepted answer
	for (const accepted of allAccepted) {
		if (userNorm === normaliseAnswer(accepted)) return true;
	}

	// 2. Fuzzy match against any accepted answer
	if (useFuzzy) {
		for (const accepted of allAccepted) {
			if (fuzzyMatch(userAnswer, accepted)) return true;
		}
	}

	return false;
}
