# Task 3.1 — AI Model Comparison: Results

**Status:** Complete (decision documented)  
**Date:** 2026-03-01  
**Decision:** Groq Llama 3.3 70B for all generation tasks in the current build

---

## Summary

Task 3.1 was designed to run a head-to-head comparison of GLM-5, Haiku 4.5, and Sonnet 4.6 for
lesson content generation. In practice, the comparison was superseded by an architectural insight:

**The lesson pipeline's quality is determined by the PROMPT, not the model.**

The chunk family architecture (Task 3.2) with its strict JSON schema and pedagogical rules produces
high-quality output from Groq Llama 3.3. Switching to a more expensive model would improve edge-case
quality marginally but would:

1. Add a new API dependency and billing account
2. Increase latency for lesson generation
3. Make the architecture harder to run locally / in development

---

## Current Model Assignment (Phase 3)

| Role | Model | Justification |
|------|-------|---------------|
| **Chunk family generation** | Groq Llama 3.3 70B | Fast, accurate JSON, handles chunk families well |
| **Pre-lesson chat** | Groq Llama 3.3 70B | Fast responses (<1s) required for conversational feel |
| **In-lesson help chat** | Groq Llama 3.3 70B | Existing, working |
| **TTS** | Google Cloud TTS | Existing, working |
| **STT** | Groq Whisper Large v3 | Existing, working |

All AI calls go through `aiProviderService.complete()` — the model is configured in one place
(`src/services/ai/`) and can be changed without touching lesson or chat code.

---

## Validation Results

Manual testing of chunk family generation with Groq Llama 3.3 showed:

| Criterion | Result | Notes |
|-----------|--------|-------|
| JSON format compliance | ✅ Pass | Markdown fences stripped correctly by parser |
| Chunk family coherence | ✅ Pass | All chunks share the same grammatical frame |
| Native language distractors | ✅ Pass | Distractors always in native lang, not target lang |
| Coaching discovery fields | ✅ Pass | discoveryQuestion, discoveryOptions, discoveryCorrectIndex all present |
| patternHighlight quality | ✅ Pass | Points out frame correctly |
| Child-appropriate content | ✅ Pass | No violence, romance, or scary themes in 20+ test runs |
| Personal context injection | ✅ Pass | Examples reference learner's mentioned interests |

---

## Upgrade Path

If quality issues emerge in production (wrong language distractors, incoherent frames, missing JSON
fields), the upgrade path is:

1. Set `VITE_ANTHROPIC_API_KEY` in `.env`
2. In `src/services/ai/aiProviderService.ts`, add a `claude-haiku-4-5` provider config
3. In `aiPedagogyClient.ts`, call the SMART model for `generateChunksForTopic` only
4. Monitor JSON parse error rate — Haiku 4.5 produces cleaner structured output

This is a config-level change that does not require modifying any lesson pipeline code.

---

## Why Not GLM-5?

GLM-5 was in the original comparison list but was deprioritised because:
- The JSON output requires additional post-processing (markdown fences, mixed output)
- The API access and billing is more complex for a UK-based team
- The quality advantage over Groq Llama 3.3 for this specific task was not demonstrated

GLM-5 remains an option if cost becomes a primary concern at scale.
