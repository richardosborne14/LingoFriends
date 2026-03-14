# Task 2.4: Lesson Validator

**Status:** 🔲 Not started
**Phase:** 2 (Lesson Engine)
**Confidence Target:** 9/10
**Estimated Time:** 2h
**Dependencies:** Task 2.3 complete

---

## Mandatory Reads

1. `.clinerules` — Rule 9 (activity type field requirements)

---

## Objective

Create a pure validation function that catches structural errors before lessons reach the UI. No AI, no side effects, no network calls.

---

## Implementation

`src/lib/server/lessons/lessonValidator.ts`:

```typescript
export function validateLessonPlan(plan: LessonPlan): ValidationResult {
  // 1. Plan-level: id, title, steps non-empty
  // 2. Teach-before-test: track introduced phrases, error if quiz tests untaught phrase
  // 3. Per-activity field validation (8 types, see table)
  // 4. SunDrop total = sum of step sunDrops
  // 5. Chunk coherence heuristic (warning only)
}
```

**Per-activity required fields:**

| Type | Required Fields |
|------|----------------|
| INFO | targetPhrase, nativeTranslation |
| MULTIPLE_CHOICE | question, options (≥2), correctIndex |
| FILL_BLANK | sentence (with ___), correctAnswer |
| TRANSLATE | sourcePhrase, correctAnswer |
| TRUE_FALSE | question, isTrue |
| WORD_ARRANGE | targetSentence, scrambledWords |
| MATCHING | pairs (≥2, each with left+right) |
| COACHING_CHAT | coachingText, discoveryQuestion |

---

## Tests

```typescript
describe('Lesson Validator', () => {
  it('valid lesson passes with no errors', () => {});
  it('catches missing lesson ID', () => {});
  it('catches missing lesson title', () => {});
  it('catches empty steps array', () => {});
  it('catches teach-before-test violation', () => {});
  it('catches missing required activity fields per type', () => {});
  it('catches SunDrop total mismatch', () => {});
  it('warns on very short lesson', () => {});
});
```

---

## Acceptance Criteria

- [ ] Valid lessons pass with no errors
- [ ] Every missing field produces a specific error message
- [ ] Teach-before-test violation caught
- [ ] All 8 activity types validated
- [ ] Pure function, no side effects
- [ ] Tests: 8/8 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
