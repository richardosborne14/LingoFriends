# Task 2.3: Lesson Assembler

**Status:** 🔲 Not started
**Phase:** 2 (Lesson Engine)
**Confidence Target:** 9/10
**Estimated Time:** 3h
**Dependencies:** Task 2.2 complete

---

## Mandatory Reads

1. `.clinerules` — Rule 9 (teach-before-test, AI generates content not structure)
2. `04-PEDAGOGY-SUMMARY.md` — teach-first 5-step progression table with SunDrop values

---

## Objective

Create the DETERMINISTIC lesson assembly module. ZERO AI calls. Takes `ChunkFamilyContent` → builds `LessonPlan` with the teach-first 5-step progression per chunk.

---

## Implementation

`src/lib/server/lessons/lessonAssembler.ts`:

**`assembleLessonPlan(content: ChunkFamilyContent, lessonId: string): LessonPlan`**

Per chunk, build 5 steps:
1. `buildIntroduceStep` → INFO (0 SunDrops)
2. `buildRecognizeStep` → MULTIPLE_CHOICE "What does X mean?" (1 SunDrop)
3. `buildPracticeStep` → FILL_BLANK with frame slot as blank (2 SunDrops)
4. `buildRecallStep` → TRANSLATE native→target (3 SunDrops)
5. `buildApplyStep` → MULTIPLE_CHOICE "When would you say X?" (2 SunDrops)

Optional: `buildCoachingChatStep` before each chunk (0 SunDrops).
Final: `buildMatchingStep` with all chunks (3 SunDrops).

Shuffle MC option order (track correctIndex). Shuffle matching pairs. Calculate totalSunDrops.

---

## Tests

```typescript
describe('Lesson Assembler', () => {
  it('produces 5 steps per chunk + 1 matching', () => {});
  it('first step per chunk is INFO (type and 0 SunDrops)', () => {});
  it('SunDrop totals are correct (8 per chunk + 3 matching)', () => {});
  it('multiple choice options are shuffled', () => {});
  it('fill_blank sentence contains ___', () => {});
  it('matching step includes all chunks', () => {});
  it('makes ZERO AI calls', () => {}); // spy on AI provider
});
```

---

## Acceptance Criteria

- [ ] Valid LessonPlan from ChunkFamilyContent
- [ ] Teach-first order enforced per chunk (INFO always first)
- [ ] SunDrop totals correct
- [ ] MC options shuffled (run 10x, verify order varies)
- [ ] No AI calls in this file (verified by spy)
- [ ] Tests: 7/7 passing

---

## Completion

**Confidence:** ___/10
**What Was Built:** ___
**Tests:** ___/___ passing
