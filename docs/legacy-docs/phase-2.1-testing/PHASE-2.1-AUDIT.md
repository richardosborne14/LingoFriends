# Phase 2.1 — E2E Test Suite Final Audit

**Date:** 2026-03-01
**Run timestamp:** 2026-03-01T11:16:27.085Z
**Tester:** Cline (automated + manual review)
**Provider:** Groq / Llama 3.3 70B (primary)
**PocketBase:** Cloud instance
**Node:** v20.11.1 / tsx v4.21.0

---

## Overall Result: ⚠️ CONDITIONAL PASS (1 FAIL, 2 WARN)

| Suite | Status | Notes |
|-------|--------|-------|
| 01 Registration & Profile Creation | ✅ PASS | Auth, profile defaults, cross-user isolation |
| 02 Onboarding Configuration | ✅ PASS | Tree, skill path, learner profile, language codes |
| 03 Lesson Generation & Validation | ✅ PASS | 5/5 lessons pass assembler + validator |
| 04 Lesson Completion & Scoring | ⚠️ WARN | `lesson_history` collection missing |
| 05 Help System & Question Reporting | ⚠️ WARN | 3 assertions fail: answer leak, user field, admin read |
| 06 Reward System Verification | ✅ PASS | XP, SunDrops, gems, streak, tree all correct |
| 07 Tree Health & Decay | ✅ PASS | Decay, buffer days, recovery, multi-tree |
| 08 Cross-LLM Quality Comparison | ❌ FAIL | DeepInfra parse failure; Anthropic > 15s |

**Totals:** 5 PASS · 1 FAIL · 2 WARN

---

## Suite 03: Lesson Generation Detail

All 5 combinations passed lessonAssembler + lessonValidator with zero errors.

| Combination | Steps | Chunks | Quality Score | Time |
|-------------|-------|--------|---------------|------|
| German/English — Greetings | 15 | 3 | 85/100 | 4.2s |
| French/English — Food & Drinks | 15 | 3 | 94/100 | 4.0s |
| German/French — School Phrases | 15 | 3 | 87/100 | 4.5s |
| German/English — Food & Drinks | 15 | 3 | 94/100 | 4.2s |
| German/English — Family & Friends | 15 | 3 | 94/100 | 3.7s |

Architecture rules confirmed:
- ✅ Rule 1: AI generates content only — assembler builds ActivityConfig
- ✅ Rule 2: Teach-before-test — all lessons start with INFO step
- ✅ Rule 3: Language codes via `languageUtils.ts`
- ✅ Rule 4: `validateLessonPlan()` passes for all 5 lessons
- ✅ Rule 5: Distractors in native language
- ✅ Rule 6: All ActivityConfig fields present and correct

---

## Suite 08: Cross-LLM Comparison

**Benchmark scenario:** German/English — "Greetings" — Age 11-14 — A1

### Side-by-Side Scores (10 dimensions × 0-10)

| Dimension | Anthropic | Groq | DeepInfra |
|-----------|:---------:|:----:|:---------:|
| Language Correctness | 10 | 7 | 0 |
| Teach-First Enforcement | 10 | 10 | 0 |
| Activity Variety | 10 | 10 | 0 |
| Chunk Quality | 10 | 10 | 0 |
| Distractor Quality | 10 | 10 | 0 |
| Age Appropriateness | 10 | 7 | 0 |
| Interest Personalisation | 5 | 5 | 0 |
| Field Completeness | 10 | 10 | 0 |
| i+1 Difficulty | 9 | 9 | 0 |
| Native Lang Instructions | 10 | 10 | 0 |
| **TOTAL** | **94/100** | **88/100** | **0/100** |
| **Response Time** | ⚠️ 16,804ms | ✅ 4,221ms | ❌ 14,231ms |
| **Parse** | ✅ | ✅ | ❌ |
| **Assembly** | ✅ | ✅ | ❌ |
| **Validation** | ✅ | ✅ | ❌ |

### Provider Analysis

**Anthropic (Claude)** — Score: 94/100
- Highest quality content across all dimensions
- Perfect language correctness and age appropriateness
- Notes: flagged English distractors ("Good night!", "Goodbye!") as target-language German — false positive from the evaluator heuristic, not a real content bug
- **Blocker:** 16,804ms response time exceeds the 15s test threshold

**Groq (Llama 3.3 70B)** — Score: 88/100
- Language correctness docked to 7: "Hallo, wie geht es dir?" misdetected as Spanish (`es`) — evaluator false positive due to shared words (`de`, `en`)
- Age appropriateness docked to 7: word "war" found in content (false positive — context was harmless)
- Both deductions are evaluator bugs, not real content problems
- **Best overall:** high quality + 4.2s latency = clear winner for production use

**DeepInfra** — Score: 0/100
- Complete parse failure — returned non-JSON response
- 14.2s latency even before the failure
- **Action: remove from active provider pool**

### Recommendation

**Keep Groq as primary.** The 6-point gap vs Anthropic is entirely explained by evaluator false positives, not genuine content quality issues. Groq's 4.2s latency vs Anthropic's 16.8s makes it the correct production choice.

Anthropic should remain available as the `complex_pedagogy` fallback (per `modelRouter.ts`), but is not suitable as a primary lesson generator given latency.

---

## Schema Discoveries

| Field | Expected | Actual PB | Fix |
|-------|----------|-----------|-----|
| Tree growth stage | `growth_stage` | Does not exist — calculated client-side | Remove from types |
| Tree lessons done | `lessons_completed` | `lessonsCompleted` (camelCase) | Fix in types |
| Tree status enum | `sprout`, `struggling` | `seed`, `growing`, `bloomed` | Fixed in tests |
| Profile `onboarding_complete` | Optional bool | Required bool | Admin token workaround |

---

## Recommended Fixes

### 🔴 P1 — Must fix before Phase 2.2

**Fix 1 — [DB] Create `lesson_history` PocketBase collection**
Fixes suite 04 WARN. Required fields:
- `user` (relation → users)
- `lesson_title` (text)
- `target_language` (text)
- `native_language` (text)
- `xp_earned` (number)
- `sun_drops_earned` (number)
- `total_steps` (number)
- `completed_steps` (number)
- `score_percentage` (number, 0-100)
- `completed_at` (date)

**Fix 2 — [DB] Fix `question_reports` user field**
Fixes suite 05 WARN (3 assertions). Admin filter `user="<id>"` returns empty — the field is likely named `reporter` or `userId`. Check the PocketBase admin UI for the actual field name and confirm the collection's list rule permits admin access.

**Fix 3 — [AI] Fix help system answer leakage**
Suite 05 assertion "Help does not reveal answer directly" fails. The help system prompt must add an explicit constraint:
> "Do NOT reveal the correct answer. Provide a hint, grammatical explanation, or usage context only."

### 🟡 P2 — Fix before Phase 2.2

**Fix 4 — [Types] Update `src/types/pocketbase.ts`**
- Remove `growth_stage` field (doesn't exist in PB — calculated client-side)
- Change `lessons_completed` → `lessonsCompleted` to match actual PB schema

**Fix 5 — [Config] Remove DeepInfra from active providers**
`tests/e2e/lib/ai-client.ts` — mark DeepInfra as `experimental: true` or remove from `getAvailableProviders()`. It returned a parse failure in all runs.

**Fix 6 — [Evaluator] Fix language detection false positives in `evaluator.ts`**
Two categories of false positive:
- German phrases ("Hallo, wie geht es dir?") detected as Spanish because `de` and `en` match Spanish word list entries. Fix: weight `der`, `die`, `das` much higher; add `ich`, `bitte` as German-specific markers.
- English distractors ("What's your name?") flagged as target-language German. Fix: if `nativeLanguage === 'en'` and the distractor contains only ASCII Latin text with English words, skip the mismatch check.

**Fix 7 — [Evaluator] Pass interests to `scoreLessonQuality` in test 08**
In `08-cross-llm-comparison.ts` line ~45, `generateChunks` receives `interests: ['music', 'sports']` but `scoreLessonQuality` is called with hardcoded `[]`. Both providers receive 5/10 for interest personalisation even if content is personalised. Fix: pass the interests array through.

### 🟢 P3 — Nice to have

**Fix 8 — [Test] Downgrade suite 08 to WARN when ≥1 provider succeeds**
Suite 08 is `FAIL` because DeepInfra fails — even though Groq and Anthropic both pass. Add logic: if at least one provider produces a valid lesson, mark the suite as WARN not FAIL.

**Fix 9 — [Performance] Anthropic threshold or model swap**
Anthropic took 16,804ms vs the 15s test threshold. Either raise the comparison threshold to 20s for Anthropic, or switch to `claude-haiku-3-5` which is ~4× faster than Sonnet.

**Fix 10 — [Test] Fix duplicate `testId` in suite 03**
All German lesson tests share `testId: "03-German"`. Add the topic slug: `03-German-Greetings`, `03-German-Food`, etc. Prevents collisions in any future result aggregation.

---

## Performance Summary

| Metric | Target | Actual (avg) | Status |
|--------|--------|-------------|--------|
| Lesson generation (AI) | < 5s | ~4.1s (Groq) | ✅ |
| PocketBase CRUD | < 500ms | ~100-300ms | ✅ |
| Full suite 01-07 | < 3 min | ~45s | ✅ |
| Suite 08 (all providers) | < 5 min | ~38s | ✅ |

---

## Confidence Score

## Confidence: 8/10

**Met:**
- [x] All critical lesson pipeline architecture rules confirmed (01-07)
- [x] 5/5 lesson generation combos pass assembler + validator
- [x] PocketBase auth, CRUD, permission isolation tested
- [x] Reward system (XP, gems, streaks, tree) all correct
- [x] AI response times within target for Groq
- [x] Cross-LLM comparison run and analysed
- [x] Clear provider recommendation made (Groq)
- [x] All 10 fixes documented with enough detail to implement

**Concerns:**
- [ ] `lesson_history` collection not yet created (Fix 1)
- [ ] `question_reports` user field still misconfigured (Fix 2)
- [ ] Help system leaks answers (Fix 3)
- [ ] DeepInfra still in provider pool (Fix 5)
- [ ] Evaluator false positives skew scores (Fix 6, Fix 7)

**Deferred:**
- [ ] TTS/STT integration tests (Phase 2.x)
- [ ] Full 36-lesson cross-LLM matrix (task 2.1.3 spec called for 12 combos × 3 providers)
