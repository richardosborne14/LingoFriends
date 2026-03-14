# Task 2.2: Chunk Family Generator

**Status:** 🔲 Not started
**Phase:** 2 (Lesson Engine)
**Confidence Target:** 8/10
**Estimated Time:** 4h
**Dependencies:** Task 2.1 complete
**Actual Time:** _fill after completion_

---

## Mandatory Reads

1. `.clinerules` — Rule 9
2. `03-AI-STRATEGY.md` — chunk family prompt design (system + user prompt)
3. `04-PEDAGOGY-SUMMARY.md` — lexical approach, chunk families explained

---

## Objective

Create the core AI call that produces pedagogically correct **chunk families** — one sentence frame explored through personal variations. The AI generates CONTENT only (phrases, translations, distractors). It NEVER generates ActivityConfig or lesson structure.

---

## Implementation

`src/lib/server/lessons/chunkGenerator.ts`:

1. **`buildSystemPrompt(params)`** — The chunk family system prompt from `03-AI-STRATEGY.md`. Explains what a chunk family is, gives GOOD and BAD examples, specifies output format.

2. **`buildUserPrompt(params)`** — Topic, learner's interests, personal context (from pre-lesson chat), age group, existing chunks to avoid repeating.

3. **`generateChunkFamily(params): Promise<ChunkFamilyContent>`** — Calls smart model, extracts JSON, validates structure, retries once on failure.

**Input:** `ChunkGenerationParams` { topic, targetLanguage, nativeLanguage, ageGroup, interests, personalContext?, existingChunks? }

**Output:** `ChunkFamilyContent` { coreFrame (with ___), coreFrameTranslation, title, chunks[] } where each chunk has: targetPhrase, nativeTranslation, exampleSentence, usageNote, explanation, distractors (3, in native language), correctUsageContext, wrongUsageContexts (3), coachingText.

**Validation:** coreFrame contains `___`, exactly 3 chunks, all fields present, distractors in native language.

---

## 🤔 Decision Point for User

> **Chunk count by age:** The prompt requests 3 chunks. For 7-10 year olds, 3 chunks × 5 steps = 15 activities might feel long. Should chunk count vary?
> - 7-10: 2 chunks (10 activities, ~5 min)
> - 11-14: 3 chunks (15 activities, ~8 min)
> - 15-18: 3 chunks (15 activities + coaching chat, ~10 min)
> **Recommendation:** Yes, vary by age. Please confirm.

---

## Tests

```typescript
describe('Chunk Family Generator', () => {
  it('generates valid chunk family from mock provider', async () => {});
  it('core frame contains blank slot (___)', async () => {});
  it('produces correct number of chunks', async () => {});
  it('all chunks have all required fields', async () => {});
  it('distractors are in native language (not target)', async () => {});
  it('retries on malformed AI response', async () => {});
  it('throws after max retries exhausted', async () => {});
  it('personalContext reflected in at least 1 chunk when provided', async () => {});
});
```

---

## Acceptance Criteria

- [ ] `generateChunkFamily()` produces valid JSON from mock provider
- [ ] Core frame contains `___`
- [ ] All chunks use the same frame pattern
- [ ] Distractors in native language
- [ ] Personal context reflected when provided
- [ ] Retry logic works
- [ ] Tests: 8/8 passing

---

## Completion

**Confidence:** ___/10
**What Was Built:** ___
**Tests:** ___/___ passing
