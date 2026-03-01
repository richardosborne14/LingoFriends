# Phase 3: AI-Coached Learning — From Quiz Pipeline to Personalised Coaching

**Status:** Planning Complete  
**Priority:** P0 — This is the core product differentiator  
**Estimated Time:** 40–55 hours across 7 tasks  
**Dependencies:** Phase 1.2 (Pedagogy Engine), Phase 2.0 (AI Provider Migration)  
**Date:** 2026-03-01

---

## Executive Summary

Phase 3 transforms LingoFriends from a Duolingo-style quiz generator into a genuine AI-coached language learning experience. The current system collects user interests during onboarding but generates random, unrelated phrase quizzes. Phase 3 fixes this by:

1. **Giving the learner a voice** — A brief AI chat before each lesson gathers personal context
2. **Teaching coherent chunk families** — One frame explored through personal variations, not random phrases
3. **Replacing static flashcards with coached discovery** — Interactive AI exchanges during teach steps
4. **Finding the right AI model** — Head-to-head comparison of GLM-5, Haiku 4.5, and Sonnet 4.6
5. **Getting TTS right** — Always use the target language voice, even for mixed-language coaching

---

## The Problem

LingoFriends has two conflicting souls:

| The Vision (PEDAGOGY.md) | The Implementation (Current) |
|---------------------------|-------------------------------|
| Learner guides what they learn (coaching) | Learner clicks a pre-set path node |
| Content tailored to interests | Interests collected but decorative |
| Coherent chunk families (lexical approach) | 3 random phrases on the same vague topic |
| AI coach invites discovery | Static "New phrase: X" flashcard |
| Adapt in real-time to the learner | Fixed 5-step quiz sequence, no adaptation |

The Phase 1.2 lesson fix was necessary — it stopped crashes by separating AI content from deterministic assembly. But it also locked out the coaching and personalisation capabilities. Phase 3 adds them back with proper architecture.

---

## Architecture Change

```
CURRENT PIPELINE:
  Click lesson → "Generating..." → AI produces 3 random chunks
    → Assembler builds 5 quiz steps per chunk → Done

PHASE 3 PIPELINE:
  Click lesson → Pre-lesson chat (2-3 exchanges, optional skip)
    → AI produces 1 chunk family with personal variations
    → Assembler builds: [COACHING_CHAT → quiz steps] per chunk
    → Coaching chat is AI-guided discovery (not a quiz)
    → Quiz steps remain deterministic (stable, tested)
    → TTS always uses target language voice
```

### What Changes

| Component | Change | Risk |
|-----------|--------|------|
| Pre-lesson chat | **NEW** — reuses Help chat popup shell | Low — isolated component |
| `generateChunksForTopic()` | **REWRITE prompt** — chunk families, not random phrases | Medium — core generation |
| `lessonAssembler.ts` | **ADD** coaching chat step type | Low — additive, quiz steps unchanged |
| `LessonView.tsx` | **ADD** coaching chat renderer | Medium — new interaction pattern |
| `useLessonAudio.ts` | **MODIFY** — TTS always target language | Low — config change |
| Activity components | **UNTOUCHED** | None |
| Garden, trees, SunDrops | **UNTOUCHED** | None |
| SRS, spaced repetition | **UNTOUCHED** | None |
| Onboarding | **UNTOUCHED** | None |

### AI Model Roles

| Role | Model | Why |
|------|-------|-----|
| Lesson content generation | Best of GLM-5 / Haiku 4.5 / Sonnet 4.6 (TBD from Task 3.1) | Needs linguistic accuracy + JSON reliability |
| Pre-lesson chat | Groq Llama 3.3 | Speed matters, responses are short |
| In-lesson coaching chat | Groq Llama 3.3 | Speed matters, context is narrow |
| Help system | Groq Llama 3.3 (existing) | Already working |
| STT | Groq Whisper (existing) | Already working |
| TTS | Google Cloud TTS (existing) | Already working |

---

## Task Breakdown

| Task | Title | Time | Dependencies |
|------|-------|------|-------------|
| **3.1** | AI Model Head-to-Head | 4–6h | AI provider abstraction (2.0.5) |
| **3.2** | Chunk Family Prompt Architecture | 6–8h | Task 3.1 (winner model) |
| **3.3** | Pre-Lesson Personalisation Chat | 8–10h | Task 3.2 |
| **3.4** | Coaching Chat Step Type | 8–10h | Task 3.2 |
| **3.5** | TTS Target Language Lock | 2–3h | None (can run in parallel) |
| **3.6** | "What You'll Learn" Screen Redesign | 4–6h | Task 3.2 |
| **3.7** | Integration Testing & Age Adaptation | 4–6h | All above |

**Critical path:** 3.1 → 3.2 → 3.3 + 3.4 (parallel) → 3.7  
**Parallel track:** 3.5 can start immediately, 3.6 after 3.2

---

## Pedagogy Alignment

Every Phase 3 change maps directly to PEDAGOGY.md:

| PEDAGOGY.md Principle | Phase 3 Implementation |
|----------------------|------------------------|
| "Language consists of grammaticalised lexis" (Lewis) | Chunk families with shared frames, not random phrases |
| "Teach frames, let learners fill slots with personal content" (Lewis) | "Ich bin ___" → their name, age, country |
| "The learner owns their learning journey" (ILCA Coaching) | Pre-lesson chat gives choice; skip option for those who just want to play |
| "Ask reflective questions" (Coaching) | Coaching chat: "Can you spot which word means 'cat'?" |
| "The emotional environment IS a prerequisite" (Krashen) | Coaching chat is warm, non-graded discovery |
| "Use the learner's stated interests as content context" | Interests drive the personalisation chat and chunk generation |
| "Observe-Hypothesise-Experiment, not Present-Practise-Produce" | Coaching step = observe + hypothesise; quiz steps = experiment |
| "One-size-fits-all content" is a RED FLAG | Personal context injection ensures no two lessons are identical |

---

## Success Criteria

### Quantitative
- [ ] AI model comparison completed with documented results
- [ ] Chunk family generation produces related chunks (not random phrases)
- [ ] Pre-lesson chat completes in < 3s per exchange
- [ ] TTS always uses target language voice
- [ ] All existing tests still pass
- [ ] Lesson completion rate ≥ current baseline

### Qualitative
- [ ] A lesson about "Introduce Yourself" for a kid who likes animals produces animal-related intro phrases
- [ ] The "What You'll Learn" screen shows a coherent theme, not a grab bag
- [ ] Coaching chat feels like talking to a friendly teacher, not reading a flashcard
- [ ] Kids who skip the personalisation chat still get a good (generic) lesson
- [ ] The experience feels fundamentally different from Duolingo

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| AI model comparison shows no clear winner | Use Haiku 4.5 as safe default — Anthropic models handle structured JSON well |
| Pre-lesson chat adds too much friction for young kids | Skip button is always prominent; 7-10 age group gets tap-to-choose instead of free text |
| Coaching chat is too slow | Use Groq for real-time chat; pre-generate coaching text during lesson creation for TTS |
| Chunk families reduce variety across lessons | Track generated frames in SRS; avoid repeating the same frame within 7 days |
| GLM-5 JSON parsing fails | Add robust post-processing: strip markdown fences, extract JSON from mixed output |

---

## Files Overview

### Files to CREATE

| File | Task | Purpose |
|------|------|---------|
| `scripts/ai-model-comparison.ts` | 3.1 | Automated head-to-head test script |
| `src/components/lesson/PreLessonChat.tsx` | 3.3 | Personalisation chat before lesson generation |
| `src/components/lesson/CoachingChat.tsx` | 3.4 | In-lesson coaching exchange component |
| `src/services/preLesson/preLesonChatService.ts` | 3.3 | Manages pre-lesson AI conversation |
| `src/services/coachingChatService.ts` | 3.4 | Manages in-lesson coaching exchanges |
| `docs/phase-3/ai-model-comparison-results.md` | 3.1 | Comparison findings |

### Files to MODIFY

| File | Task | Change |
|------|------|--------|
| `src/services/aiPedagogyClient.ts` | 3.2 | New chunk family prompt architecture |
| `src/services/lessonAssembler.ts` | 3.4 | Add COACHING_CHAT step type |
| `src/types/game.ts` | 3.4 | Add COACHING_CHAT to GameActivityType |
| `src/components/lesson/LessonView.tsx` | 3.3, 3.4 | Pre-lesson chat trigger + coaching chat renderer |
| `src/hooks/useLessonAudio.ts` | 3.5 | Force target language for all TTS |
| `src/services/lessonGeneratorV2.ts` | 3.2, 3.3 | Accept personal context, pass to AI |
| `src/services/lessonPlanService.ts` | 3.3 | Wire pre-lesson chat into generation flow |
| `src/hooks/useLesson.ts` | 3.3 | Add pre-lesson chat state management |
| `src/components/lesson/LessonStepStart.tsx` | 3.6 | Show chunk family theme, not random list |

### Files NOT to touch

| File | Reason |
|------|--------|
| `src/components/lesson/activities/*.tsx` | Activity components work correctly |
| `src/services/lessonValidator.ts` | Validation logic is sound |
| `src/utils/languageUtils.ts` | Language utilities are correct |
| `src/services/pedagogyEngine.ts` | i+1 calibration is correct |
| `src/components/garden/*` | Garden is unrelated |
| `src/components/onboarding/*` | Onboarding is complete |
| `src/services/ai/*.ts` | Provider abstraction is already built |

---

## Phase 3 Completion Criteria

- [ ] AI model selected and configured as production default
- [ ] Lessons generate coherent chunk families (not random phrases)
- [ ] Pre-lesson personalisation chat functional with skip option
- [ ] Coaching chat step replaces static INFO cards
- [ ] TTS locked to target language for all audio
- [ ] "What You'll Learn" screen shows coherent theme
- [ ] Age-appropriate adaptations for 7-10, 11-14, 15-18
- [ ] Manual testing with sample lessons in German and English
- [ ] No regressions in garden, paths, onboarding, or existing activities
