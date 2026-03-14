# Task 2.1: AI Provider Layer

**Status:** 🔲 Not started
**Phase:** 2 (Lesson Engine)
**Confidence Target:** 8/10
**Estimated Time:** 3h
**Dependencies:** Phase 1 complete and audited
**Actual Time:** _fill after completion_

---

## Mandatory Reads

1. `.clinerules` — Rule 9 (Lesson Pipeline Architecture)
2. `03-AI-STRATEGY.md` — model assignments, provider interface spec
3. `LEARNINGS.md` — V1 entries about AI content vs structure separation

---

## Objective

Create the AI provider abstraction layer with three providers: Haiku 4.5 (smart model for lesson planning), Groq Llama 3.3 (fast model for real-time chat), and a Mock provider for testing without burning API tokens.

---

## Subtasks

### 2.1.1 — Types (`src/lib/server/ai/types.ts`)
Define `AIMessage`, `AICompletionOptions`, `AICompletionResult`, `AIProvider` interface. Copy spec from `03-AI-STRATEGY.md`.

### 2.1.2 — Haiku provider (`src/lib/server/ai/haiku.ts`)
Anthropic SDK. Model: `claude-haiku-4-5-20251001`. JSON mode via system prompt instruction. 1 retry on timeout. Latency measurement in result.

### 2.1.3 — Groq provider (`src/lib/server/ai/groq.ts`)
OpenAI-compatible API at `https://api.groq.com/openai/v1`. Model: `llama-3.3-70b-versatile`. Native JSON mode (`response_format: { type: "json_object" }`). Latency measurement.

### 2.1.4 — Mock provider (`src/lib/server/ai/mock.ts`)
Returns pre-canned ChunkFamilyContent JSON. Switchable via `AI_PROVIDER=mock` env var. Essential for tests and development without API costs.

### 2.1.5 — Router (`src/lib/server/ai/router.ts`)
`getSmartModel()` → Haiku (or Mock if AI_PROVIDER=mock). `getFastModel()` → Groq (or Mock).

### 2.1.6 — JSON utils (`src/lib/server/ai/utils.ts`)
`extractJSON(text)` — strips markdown fences, finds JSON object/array in text.

---

## 🤔 Decision Point for User

> **Mock provider:** I'll create a `MockProvider` that returns pre-canned JSON responses. This avoids burning API tokens during `npx vitest run` and Cline development sessions. An env flag `AI_PROVIDER=mock` switches to it. The mock responses will match the exact `ChunkFamilyContent` schema so all downstream tests work. Highly recommended — please confirm.

---

## Tests

```typescript
describe('extractJSON', () => {
  it('strips markdown fences', () => {});
  it('finds bare JSON objects', () => {});
  it('handles nested JSON', () => {});
  it('returns original text if no JSON found', () => {});
});

describe('MockProvider', () => {
  it('returns valid ChunkFamilyContent response', async () => {});
  it('measures latency', async () => {});
});

describe('Router', () => {
  it('returns MockProvider when AI_PROVIDER=mock', () => {});
});
```

---

## Acceptance Criteria

- [ ] All 3 providers compile (Haiku, Groq, Mock)
- [ ] Mock provider returns valid JSON for chunk family requests
- [ ] Router respects AI_PROVIDER env var
- [ ] extractJSON handles markdown fences, bare JSON, nested objects
- [ ] API keys are server-side only
- [ ] Tests: 7/7 passing
- [ ] 50%+ comments

---

## Completion

**Confidence:** ___/10
**What Was Built:** ___
**Tests:** ___/___ passing
