# Task 2.2.6: Fix Evaluator False Positives

**Status:** Not started
**Priority:** 🟡 P2
**Confidence target:** 8/10
**Fixes:** Groq scored 88 instead of ~94 due to heuristic bugs in `evaluator.ts`

---

## Objective

The lesson quality evaluator in `tests/e2e/lib/evaluator.ts` has two categories of false positive that artificially lower Groq's score. These aren't real content problems — they're bugs in the language detection heuristic. Fixing them gives accurate scores for future cross-LLM runs.

---

## False Positive 1 — German Phrases Detected as Spanish

**What happens:** `detectLanguage("Hallo, wie geht es dir?")` returns `"es"` (Spanish) instead of `"de"` (German).

**Why:** The Spanish word list includes `de` and `en`, which appear as standalone prepositions in German ("Wie geht es **dir**?"). The scoring function docks `languageCorrectness` from 10 → 7.

**Fix in `detectLanguage()`:**

```typescript
// Add stronger German-specific markers
const LANG_MARKERS: Record<string, { chars: string[]; words: string[] }> = {
  de: {
    chars: ['ü','ö','ä','ß'],
    words: [
      'der','die','das','ist','und','ich','ein','eine','nicht','mit',
      'zu','auf','für','von','hallo','bitte','danke','wie','geht','sie',
      'mein','dein','wir','ihr','haben','sein','werden','kann'
    ]
  },
  // ...
};
```

Also increase the char match bonus — German umlauts (ü, ö, ä, ß) should be near-conclusive:

```typescript
for (const ch of markers.chars) {
  if (lower.includes(ch)) scores[code] += 8;  // was: 3
}
```

---

## False Positive 2 — English Distractors Flagged as Target Language

**What happens:** English distractors like "What's your name?", "I'm lost", "I don't speak German" are flagged as being in German (the target language), docking `languageCorrectness`.

**Why:** The check assumes anything that's not clearly native-language must be target-language. English words like "don't" and "I" can score weakly for German in ambiguous cases.

**Fix in `scoreLanguageCorrectness()`:**

```typescript
// If native language is English, skip distractor language check
// — we can't reliably distinguish English from German using word markers alone
// when distractors are short phrases
if (nCode === 'en') {
  // Only check that distractors aren't obviously in the target language
  // (i.e., contain target-language chars like ü/ö/ä/ß for German)
  const hasTargetChars = LANG_MARKERS[tCode]?.chars.some(ch => d.toLowerCase().includes(ch));
  if (hasTargetChars) {
    notes.push(`Distractor "${d}" contains target language characters`);
    issues++;
  }
} else {
  // Original check for non-English native languages
  const dLang = detectLanguage(d);
  if (dLang === tCode && tCode !== nCode) {
    notes.push(`Distractor "${d}" appears to be in target language`);
  }
}
```

---

## False Positive 3 — "war" Flagged as Inappropriate Content

**What happens:** The word "war" appears in German content but is flagged by `scoreAgeAppropriateness()` as potentially inappropriate. In German, "war" is the past tense of "sein" (to be) — "Ich war..." = "I was...". It's completely harmless.

**Fix:** Add a language-aware filter to the inappropriate content check:

```typescript
// Only flag English bad words in English content
// German "war" = "was" (past tense of sein) — not the English word "war"
if (targetLang !== 'German' || badWord !== 'war') {
  // apply check
}
```

Or more robustly: skip the `badWords` check on `targetPhrase` (which is in the target language) and only apply it to `nativeTranslation`, `explanation`, and `usageNote` (which are in the native language).

---

## Interest Personalisation Fix

**What happens:** Both Groq and Anthropic score 5/10 for interest personalisation. The `generateChunks` call in test 08 passes `interests: ['music', 'sports']` but `scoreLessonQuality` is called with `[]`.

**Fix in `08-cross-llm-comparison.ts`:**

```typescript
// Store the interests used for generation
const interests = ['music', 'sports'];

// ... generate chunks with those interests ...
await ai.generateChunks(provider, { ..., interests });

// Pass them to the scorer
const score = scoreLessonQuality({
  ...
  // evaluator.ts already has scoreInterestPersonalisation() —
  // it just needs the interests array passed in
  // Find where scoreLessonQuality is called and add: interests
});
```

Note: `scoreLessonQuality` in `evaluator.ts` calls `scoreInterestPersonalisation(chunks, [])` hardcoded. The `[]` needs to be the actual interests array. Pass interests as a parameter.

---

## Files to Update

- **`tests/e2e/lib/evaluator.ts`** — language detection, distractor check, inappropriate content check
- **`tests/e2e/08-cross-llm-comparison.ts`** — pass interests to scorer

---

## Acceptance Criteria

- [ ] Re-running suite 08: Groq `languageCorrectness` ≥ 9 (was 7)
- [ ] Re-running suite 08: Groq `ageAppropriateness` = 10 (was 7)
- [ ] Interest personalisation score reflects actual content (not always 5)
- [ ] No false positives in evaluator notes for Groq or Anthropic
