# TASK-AUDIT-02: Speak It Activity

**Status:** ✅ Complete  
**Completed:** 15/03/2026  
**Confidence:** 9/10  
**Actual Time:** ~2h

---

## Overview

Add a SPEAK_IT activity type to the lesson engine — the only activity where children
produce the target language vocally. Grounded in Swain's Output Hypothesis (speaking
accelerates acquisition) and the PEDAGOGY.md Affective Filter rules (never penalise
speaking — courage matters more than accuracy).

---

## What Was Built

### 1. `pronunciationService.ts` (`src/lib/services/`)
Pure service (zero browser APIs) for comparing a child's spoken transcript against
the expected phrase.

Key exports:
- `levenshtein(a, b)` — edit-distance algorithm
- `normaliseText(text)` — lowercase, strip punctuation, collapse spaces, keep accents
- `fuzzyWordMatch(word, candidate)` — exact → accent-insensitive → levenshtein threshold
- `similarityToStars(score)` — 0.0–1.0 → 1–5 stars (NEVER 0)
- `sunDropsForStars(stars)` — star → SunDrop reward
- `calculateSpeakItSunDrops(stars, attempt)` — perseverance bonus on attempt 3
- `comparePronunciation(expected, transcript)` — full pipeline → `PronunciationResult`

### 2. `SpeakItActivity.svelte` (`src/lib/components/activities/`)
Full-featured UI component:
- Auto-plays TTS on mount (listen-first, PEDAGOGY.md rule)
- 3-attempt system with best-score tracking
- Star rating display (⭐⭐⭐⭐⭐ format)
- Always encouraging feedback messages (never "wrong")
- "Skip for now" escape hatch (0 SunDrops, no penalty)
- `onComplete(true, sunDropsEarned)` — ALWAYS correct=true

### 3. Types in `lesson.ts`
- `ActivityType.SPEAK_IT` enum value added
- `SpeakItActivity` interface: `{ targetPhrase, nativeTranslation, audioKey, sunDrops }`
- `PronunciationResult` type (exported from pronunciationService)

### 4. lessonAssembler.ts
- `buildSpeakStep(chunk)` function
- Alternating placement: even chunks → SPEAK_IT after INFO; odd chunks → after RECALL

### 5. lessonValidator.ts
- `isQuizActivity()` now includes SPEAK_IT
- `extractTestedPhrase()` handles SPEAK_IT
- `validateActivityConfig()` has SPEAK_IT case (requires targetPhrase + nativeTranslation)

### 6. ActivityRouter.svelte
- SPEAK_IT case wired in, renders `<SpeakItActivity>`

### 7. i18n (en.json + fr.json)
- `speak_it` section with all UI strings

---

## Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| When to place SPEAK_IT | Alternating: even→after INFO, odd→after RECALL | Position variety prevents predictability |
| Stars floor | 1 star minimum (NEVER 0) | Affective Filter — every attempt deserves encouragement |
| Attempt 3 perseverance bonus | Min 1 SunDrop regardless of stars | Effort matters as much as accuracy |
| MicButton usage | Only `onTranscript` + `onError` props | That's all MicButton exposes |
| SPEAK_IT in isQuizActivity | Yes | Spoken production REQUIRES prior INFO introduction |

---

## Tests

- **38 tests written** in `src/tests/services/pronunciationService.test.ts`
- **991/991 total tests passing** (zero regressions)
- Covers: levenshtein, normaliseText, fuzzyWordMatch, similarityToStars,
  sunDropsForStars, calculateSpeakItSunDrops, comparePronunciation (8 scenarios)

---

## Confidence: 9/10

**Must-haves (met):**
- [x] Core pronunciation algorithm works (38 tests)
- [x] SPEAK_IT wired into assembler, validator, router
- [x] Component follows all PEDAGOGY.md rules (no penalty, no "wrong")
- [x] 991/991 tests green — no regressions
- [x] 50%+ comment ratio throughout

**Concerns:**
- [ ] SpeakItActivity.svelte — `recording` phase is never set (MicButton doesn't have onStart callback). The "Listening…" state is shown by MicButton's internal UI, not our phase state. Minor cosmetic issue.

**Deferred:**
- [ ] SPEAK_IT component render test (Svelte component tests deferred — all components tested via stores/services instead per LEARNINGS.md)

---

## Notes for Future Tasks

- TASK-AUDIT-03 (adaptive injection) needs to know that SPEAK_IT steps have `sunDrops: 3` max but the ACTUAL award depends on star rating — the `lessonStep.sunDrops` field holds the MAXIMUM, not the actual.
- The `recording` phase in SpeakItActivity is vestigial — if we add an `onStart` prop to MicButton later, we can activate it for better recording feedback.
