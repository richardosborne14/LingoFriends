# Task 2.1.3: Cross-LLM Quality Comparison

**Status:** 🔲 Not started  
**Estimated Time:** 4–6 hours  
**Dependencies:** Tasks 2.1.1 + 2.1.2  
**Output:** `tests/e2e/08-cross-llm-comparison.ts`, `results/{timestamp}/llm-comparison.json`

---

## Objective

Run identical lesson generation requests across all three AI providers (GLM-5 via DeepInfra, Llama 3.3 via Groq, Sonnet 4.5 via Anthropic), score each on 10 pedagogical quality dimensions, and produce a structured comparison report.

---

## File to Create

```
tests/e2e/08-cross-llm-comparison.ts
```

---

## Test Matrix

Generate lessons for **every combination** of these parameters:

| Dimension | Values |
|-----------|--------|
| **Target Language** | German, French |
| **Native Language** | English, French |
| **Topic** | "Greetings", "Food & Drinks", "School" |
| **Age Group** | "7-10", "11-14", "15-18" |
| **Level** | "A1", "A2" |

That's 2 × 2 × 3 × 3 × 2 = **72 combinations** per provider, **216 total lessons**.

To keep runtime reasonable, use a **representative subset** of 12 combinations:

| # | Target | Native | Topic | Age | Level |
|---|--------|--------|-------|-----|-------|
| 1 | German | English | Greetings | 11-14 | A1 |
| 2 | German | English | Food & Drinks | 11-14 | A1 |
| 3 | German | English | School | 15-18 | A2 |
| 4 | German | French | Greetings | 7-10 | A1 |
| 5 | German | French | Food & Drinks | 11-14 | A1 |
| 6 | German | French | School | 15-18 | A2 |
| 7 | French | English | Greetings | 11-14 | A1 |
| 8 | French | English | Food & Drinks | 7-10 | A1 |
| 9 | French | English | School | 15-18 | A2 |
| 10 | English | French | Greetings | 11-14 | A1 |
| 11 | English | French | Food & Drinks | 11-14 | A1 |
| 12 | English | French | School | 7-10 | A1 |

**Total: 12 lessons × 3 providers = 36 lesson generations.**

---

## Execution Flow

```
for each combination:
  for each provider in [deepinfra, groq, anthropic]:
    1. Call AI with IDENTICAL prompt + parameters
    2. Measure response time
    3. Parse JSON response
    4. Run through lessonAssembler
    5. Run through lessonValidator
    6. Score on 10 quality dimensions via evaluator
    7. Store raw lesson + scores
```

### Rate Limiting

- DeepInfra: No special limits for normal usage
- Groq: Rate-limited (30 req/min on free tier) — add 2s delay between calls
- Anthropic: Rate-limited — add 1s delay between calls

Add configurable delay between provider calls.

---

## Quality Scoring Dimensions (10 × 0-10 scale)

### 1. Language Correctness (0-10)
**What it measures:** Are all target language phrases actually in the target language?

**Scoring:**
- 10: All target phrases confirmed in correct language, all native text in correct language
- 7-9: Minor issues (1 phrase ambiguous, accent marks missing)
- 4-6: Some phrases in wrong language or mixed languages
- 0-3: Majority of content in wrong language

**How to test:** Use language detection heuristics on each field. Check character sets (ü/ö/ä for German, é/è/ç for French), common word markers, and ensure no cross-contamination.

### 2. Teach-First Enforcement (0-10)
**What it measures:** Does the assembled lesson introduce every chunk before quizzing on it?

**Scoring:**
- 10: Every chunk has an INFO step before any quiz step
- 5: Most chunks taught first, but 1-2 have quiz before intro
- 0: No teach-first structure at all

**How to test:** Walk the step array, tracking which chunks have been introduced. Flag any quiz that references an unintroduced chunk.

### 3. Activity Variety (0-10)
**What it measures:** Does the lesson use a mix of activity types?

**Scoring:**
- 10: Uses 4+ different activity types, no consecutive duplicates
- 7-9: Uses 3 types, minimal repetition
- 4-6: Uses 2 types or has consecutive duplicates
- 0-3: Uses only 1 activity type (all multiple_choice, etc.)

**How to test:** Count unique `activity.type` values and check for consecutive duplicates.

### 4. Chunk Quality (0-10)
**What it measures:** Are the generated chunks natural language phrases (not isolated words)?

**Scoring:**
- 10: All chunks are 2+ word phrases, natural collocations, usable in conversation
- 7-9: Most chunks are phrases, 1 might be a single word
- 4-6: Mix of phrases and isolated words
- 0-3: Mostly single words (violates Lexical Approach)

**How to test:** Check word count of `targetPhrase`. Phrases should be 2-6 words. Flag single words.

### 5. Distractor Quality (0-10)
**What it measures:** Are the multiple-choice distractors plausible, in the correct language, and semantically related?

**Scoring:**
- 10: All distractors in native language, plausible (same semantic category), clearly different from correct answer
- 7-9: Distractors correct but not perfectly related (e.g., random words instead of same category)
- 4-6: Some distractors in wrong language
- 0-3: Distractors in target language (critical bug) or identical to correct answer

**How to test:** Check language of distractors vs nativeLanguage. Check that no distractor matches `nativeTranslation`.

### 6. Age Appropriateness (0-10)
**What it measures:** Is the content suitable for the specified age group?

**Scoring:**
- 10: Content clearly age-appropriate, vocabulary and themes match age group
- 7-9: Generally appropriate, minor mismatch (slightly too complex for 7-10, too simple for 15-18)
- 4-6: Noticeable mismatch
- 0-3: Inappropriate themes or vocabulary

**How to test:** For 7-10 group, check for simple vocabulary and fun themes. For 15-18, allow more complex topics. Flag any concerning content.

### 7. Interest Personalisation (0-10)
**What it measures:** Does the generated content reference the learner's stated interests?

**Scoring:**
- 10: Multiple chunks/examples reference interests naturally
- 7-9: At least one reference to interests
- 4-6: Interests mentioned but forced/awkward
- 0-3: No reference to interests at all

**How to test:** Search all text fields for interest keywords (e.g., "music", "football", "sports").

### 8. Field Completeness (0-10)
**What it measures:** Do all activities have all required fields with valid values?

**Scoring:**
- 10: Every activity has all required fields, all non-empty, all valid types
- 7-9: 1-2 minor missing optional fields
- 4-6: Some required fields missing
- 0-3: Many required fields missing (would crash the UI)

**How to test:** Run `lessonValidator.validateLessonPlan()`. Score based on error count.

### 9. i+1 Difficulty (0-10)
**What it measures:** Is the lesson at an appropriate difficulty for the specified level?

**Scoring:**
- 10: Content is clearly one step above current level, with familiar scaffolding
- 7-9: Mostly appropriate, slight over/under-targeting
- 4-6: Content too easy (repetitive basics) or too hard (advanced grammar at A1)
- 0-3: Complete mismatch (C1 content for A1 learner)

**How to test:** For A1, expect basic survival phrases (greetings, numbers, simple questions). For A2, expect slightly longer phrases and past tense. Flag content that seems way off.

### 10. Native Language Instructions (0-10)
**What it measures:** Are tutorText, helpText, and explanations in the learner's native language?

**Scoring:**
- 10: All instructional text in native language, clear and helpful
- 7-9: Most in native language, 1-2 in target language
- 4-6: Mixed languages in instructions
- 0-3: Instructions in wrong language entirely

**How to test:** Check `tutorText`, `helpText`, `usageNote`, `explanation` fields for native language markers.

---

## Output Format

### Per-Lesson Result

```json
{
  "combination": {
    "targetLanguage": "German",
    "nativeLanguage": "English",
    "topic": "Greetings",
    "ageGroup": "11-14",
    "level": "A1"
  },
  "provider": "deepinfra",
  "responseTimeMs": 3200,
  "parseSuccess": true,
  "assemblySuccess": true,
  "validationResult": { "valid": true, "errors": [], "warnings": [] },
  "scores": {
    "languageCorrectness": 10,
    "teachFirstEnforcement": 10,
    "activityVariety": 8,
    "chunkQuality": 9,
    "distractorQuality": 7,
    "ageAppropriateness": 10,
    "interestPersonalisation": 6,
    "fieldCompleteness": 10,
    "i1Difficulty": 9,
    "nativeLanguageInstructions": 10
  },
  "totalScore": 89,
  "notes": ["Distractor 'Goodbye' is too obvious for 'Good morning'"],
  "rawChunks": [ ... ],
  "rawLesson": { ... }
}
```

### Comparison Summary

```json
{
  "timestamp": "2026-03-01T14:30:00Z",
  "totalCombinations": 12,
  "providers": {
    "deepinfra": {
      "averageScore": 84.2,
      "averageResponseTimeMs": 2800,
      "failureRate": 0,
      "scoreBreakdown": {
        "languageCorrectness": 9.5,
        "teachFirstEnforcement": 10,
        "activityVariety": 8.2,
        ...
      },
      "worstCombination": { ... },
      "bestCombination": { ... }
    },
    "groq": { ... },
    "anthropic": { ... }
  },
  "recommendation": "deepinfra",
  "reasoning": "Highest average score with acceptable response times."
}
```

---

## Cline Review Pass

After all 36 lessons are generated and scored automatically, Cline should:

1. **Read 3 raw lessons per provider** (randomly selected)
2. **Manually verify** the automatic scores make sense
3. **Note any qualitative issues** the heuristic scoring missed:
   - Unnatural phrasing
   - Culturally inappropriate examples
   - Confusing or ambiguous questions
   - Missing context that would help a child understand
4. **Adjust recommendation** if qualitative review contradicts quantitative scores

---

## Execution Command

```bash
# Run comparison (takes ~5-10 minutes depending on rate limits)
npx tsx tests/e2e/test-runner.ts --only 08-cross-llm-comparison

# Run with verbose output (shows each lesson as it's generated)
npx tsx tests/e2e/test-runner.ts --only 08-cross-llm-comparison --verbose
```

---

## Acceptance Criteria

- [ ] All 36 lessons generated without crashes
- [ ] Each lesson scored on all 10 dimensions
- [ ] `llm-comparison.json` written with full results
- [ ] Summary includes per-provider averages and recommendation
- [ ] Raw lesson JSON stored for each generation (for manual review)
- [ ] Any provider that fails to return valid JSON is marked as failure (not crash)
- [ ] Rate limiting handled gracefully (retry with backoff)

---

## Notes for Cline

- Use the EXACT same system prompt for all three providers. The only variable should be the model/endpoint.
- For Anthropic, you need to convert the OpenAI-format messages to Anthropic Messages API format (system prompt goes in the `system` field, not as a message).
- If a provider fails to return valid JSON, don't crash — log the raw response, score it as 0 on all dimensions, and continue.
- Store the raw AI response text even for failures — it's valuable for debugging prompts.
- Consider adding a `--dry-run` flag that shows what would be generated without calling the APIs.
