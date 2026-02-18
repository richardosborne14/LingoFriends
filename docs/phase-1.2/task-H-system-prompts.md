# Task H — System Prompts Update

**Phase:** 1.2 completion  
**Status:** 🔲 Not started  
**Depends on:** Task E (LessonGeneratorV2 wired) ✅  
**Estimated effort:** 1 hour

---

## Goal

Update `services/systemPrompts.ts` (the Phase 1.1 prompt file still used by the legacy chat interface) to align with the Phase 1.2 pedagogy architecture. The new `aiPedagogyClient.ts` has its own prompt construction, but the root-level `systemPrompts.ts` is still active in `services/groqService.ts` and needs to reflect the chunk-based, i+1 approach.

---

## Current State

`services/systemPrompts.ts` was written for Phase 1.1's vocabulary-card lesson format. It:
- Refers to "vocabulary words" and "flashcards"
- Has no concept of lexical chunks or i+1 difficulty
- Doesn't mention affective filter or confidence monitoring
- Uses a generic "language tutor" framing

`src/services/aiPedagogyClient.ts` (Phase 1.2) has its own inline prompt construction that IS chunk-aware and pedagogy-aligned, but it's used only by the lesson generator pipeline.

The root `services/systemPrompts.ts` is still imported by:
- `services/groqService.ts` — for the main chat interface
- Legacy `ChatInterface.tsx` component

---

## What Needs to Change

### `services/systemPrompts.ts` — full rewrite

Replace the vocabulary-card framing with the lexical chunk + i+1 approach:

```typescript
/**
 * System Prompts — Phase 1.2 Update
 *
 * Prompt templates aligned with the LingoFriends pedagogy framework:
 *
 * 1. Lexical Approach (Michael Lewis): Teach chunks, not isolated words.
 *    Model language in natural, contextualised chunks.
 *
 * 2. Input Hypothesis (Krashen): Pitch language at i+1.
 *    Just above the learner's current level — comprehensible but stretching.
 *
 * 3. Affective Filter: Keep anxiety low.
 *    Positive, encouraging, never condescending. Celebrate attempts.
 *
 * 4. Language Coaching: Build autonomy.
 *    Guide learners to notice patterns, not just memorise.
 *
 * @see PEDAGOGY.md for full framework explanation
 */
```

**Core system prompt update:**

```typescript
export function buildTutorSystemPrompt(params: {
  targetLanguage: string;
  nativeLanguage: string;
  learnerLevel: number;      // 0-10 from learner profile (i+1 target)
  recentChunks: string[];    // Chunks learned recently (avoid repetition)
  learnerName?: string;
}): string {
  return `
You are Lingo, a warm and encouraging language tutor for LingoFriends.
You're talking with a child aged 7–18 who is learning ${params.targetLanguage}.

## Your Teaching Approach

You use the **Lexical Approach**: teach language in natural chunks and phrases,
not isolated words. Instead of "the word for X is Y", you say "when we want to 
express X, we often say: [chunk]".

You pitch language at **i+1 level**: the learner's current level is approximately
${params.learnerLevel.toFixed(1)}/10. Introduce things slightly above that —
comprehensible with a little stretch, never overwhelming.

## Tone and Safety

- Always warm, patient, and celebratory of effort (not just success)
- Never use adult themes, violence, or scary content
- If the learner makes a mistake: "Good try! We usually say... [chunk]"
- Keep responses SHORT. Kids lose focus. 2–3 sentences maximum.
- Use emoji sparingly — 1–2 per message maximum

## Recent Learning Context

The learner has recently seen these chunks — don't repeat them this session:
${params.recentChunks.length > 0 ? params.recentChunks.join(', ') : 'None yet — this is a fresh start!'}

## Language

Respond in ${params.nativeLanguage} for explanations, ${params.targetLanguage} for examples.
`;
}
```

### Files to update

| File | Change |
|------|--------|
| `services/systemPrompts.ts` | Rewrite `buildSystemPrompt()` with chunk-aware, i+1 framing |
| `services/groqService.ts` | Update call to `buildTutorSystemPrompt()` with learner profile params |
| `services/systemPrompts.ts` | Add `buildActivityPrompt()` for activity-specific guidance |

### New exports needed

```typescript
// Current (remove/replace):
export function getSystemPrompt(language: string): string

// New:
export function buildTutorSystemPrompt(params: TutorPromptParams): string
export function buildActivityPrompt(activityType: GameActivityType): string
export function buildFeedbackPrompt(wasCorrect: boolean, chunk: string): string
```

---

## Key Prompt Patterns from PEDAGOGY.md

From `PEDAGOGY.md`:

```
"When teaching vocabulary, always present it in a natural chunk:
 ❌ 'The word for dog is Hund'
 ✅ 'When you want to talk about your pet dog, you might say: ich habe einen Hund'"

"Celebrate the attempt before correcting:
 'I love that you tried! In German we usually say...'"
```

These patterns should be baked into the system prompt, not left to the model to infer.

---

## Testing

1. Start a chat in the legacy `ChatInterface` → verify the tutor mentions chunks, not vocab cards
2. Check Groq request payload in Network tab → system prompt should reference i+1 and lexical chunks
3. Complete a lesson → check console logs for system prompt content used by `aiPedagogyClient`
4. Verify no adult content in any response (content filter still applies on top)

---

## Confidence Target: 8/10

- [x] Chunk-based framing in all system prompts
- [x] i+1 level referenced per learner profile
- [x] Affective filter tone guidelines
- [x] Kid-safety language constraints
- [ ] Dynamic recent-chunks list (requires learner profile query in groqService)
