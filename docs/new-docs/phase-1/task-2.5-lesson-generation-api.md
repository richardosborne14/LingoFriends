# Task 2.5: Lesson Generation API

**Status:** 🔲 Not started
**Phase:** 2 (Lesson Engine)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Tasks 2.2, 2.3, 2.4 all complete

---

## Mandatory Reads

1. `.clinerules` — Rule 9
2. `03-AI-STRATEGY.md` — pipeline architecture diagram

---

## Objective

Create the server endpoint that orchestrates the full lesson generation pipeline: auth check → load profile → generate chunks (AI) → assemble lesson (deterministic) → validate → return.

---

## Implementation

`src/routes/api/lessons/generate/+server.ts` — POST handler:

1. Auth check (`locals.user` required)
2. Parse body: `{ treeId, lessonIndex, personalContext? }`
3. Load user profile + learner profile from DB
4. Load skill path + lesson definition from userTree → skillPath → lessonDefinitions
5. Get existing chunks for this user+topic (to avoid duplication)
6. Call `generateChunkFamily()` with all context
7. Call `assembleLessonPlan()` with chunk content
8. Call `validateLessonPlan()` — if invalid, retry generation once, then return error
9. Return `{ plan: LessonPlan, audioMap: {} }` (audio placeholder, TTS comes in Phase 3)

---

## 🤔 Decision Point for User

> **TTS pre-generation:** This adds 2-3s to lesson load. Options:
> - **(A) Generate all audio upfront** — simpler, slower start
> - **(B) Lazy-load per step** — faster start, audio might lag
> - **(C) Background during "What You'll Learn" screen** — best UX, complex
> **Recommendation:** A for now. Upgrade to C in Phase 3 (Task 3.4).

---

## Tests

```typescript
describe('Lesson Generation API', () => {
  it('returns 401 for unauthenticated request', async () => {});
  it('generates valid lesson plan with mock AI', async () => {});
  it('generated lesson passes validator', async () => {});
  it('returns 404 for invalid tree ID', async () => {});
  it('retries on AI failure, then returns error', async () => {});
});
```

---

## Acceptance Criteria

- [ ] Full pipeline works end-to-end with mock AI
- [ ] Auth check works
- [ ] Generated lessons pass validation
- [ ] Error handling for AI failures (retry + graceful error)
- [ ] Tests: 5/5 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
