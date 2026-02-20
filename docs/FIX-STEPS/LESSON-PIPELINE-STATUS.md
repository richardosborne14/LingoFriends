# Lesson Generation Pipeline — Current Status

**Last updated:** 2026-02-20  
**Status:** ✅ WORKING — Full lesson flow complete end-to-end  
**Commit:** 5d938dd (and 856deda before it)

---

## What Works Right Now

A user can:
1. Complete onboarding (language selection, interests)
2. Enter the garden → click their first tree → open PathView
3. Click a lesson step → lesson generates in ~2-3s
4. Play through all 15 steps (5 per chunk × 3 chunks):
   - **INTRODUCE** → sees German phrase + translation (INFO, no quiz)
   - **RECOGNIZE** → multiple choice "what does X mean?" (native language options)
   - **PRACTICE** → fill in the blank (last word of phrase)
   - **RECALL** → translate from English to German (text input)
   - **APPLY** → multiple choice "when would you say X?" (usage context)
5. Lesson completes → SunDrops awarded → back to garden

---

## The 4 Bugs That Were Blocking This (Now Fixed)

### Bug 1: `generateLesson()` still used the OLD deprecated path
**File:** `src/services/lessonGeneratorV2.ts`  
**Symptom:** Lesson generated but content was wrong / AI produced bad JSON  
**Root cause:** The method body still called `aiPedagogyClient.generateLesson()` — the old method that asked the AI to generate full ActivityConfig JSON. The new imports (`assembleLessonPlan`, `validateLessonPlan`, `generateChunksForTopic`) were imported but never used.  
**Fix:** Rewrote `generateLesson()` body to use the correct V2 pipeline: `generateChunksForTopic()` → `assembleLessonPlan()` → `validateLessonPlan()`.

### Bug 2: Hardcoded fallback always served French
**File:** `src/services/lessonGeneratorV2.ts`  
**Symptom:** Even German learners always got French content in the fallback  
**Root cause:** `getTopicStarters()` matched language by full name string (`langCode === 'German'`), but by the time it was called, `langCode` was an ISO code (`'de'`). So `'de' === 'German'` was always `false` → always fell back to the French branch.  
**Fix:** Replaced `getTopicStarters()` with `getHardcodedStarterChunks(langCode)` that switches on ISO codes (`'de'`, `'fr'`, `'es'`).

### Bug 3: learner_profiles create always 400
**File:** PocketBase `learner_profiles` collection schema  
**Symptom:** `[LearnerProfileService] Error creating profile: ClientResponseError 400`  
**Root cause:** 13 numeric counter fields (`current_level`, `total_sessions`, etc.) were `required: true`. PocketBase treats numeric `0` as "blank" for required validation, so every new profile failed immediately.  
**Fix:** Patched all 13 number fields to `required: false` via admin API. Counter fields that legitimately start at 0 must never be `required: true` in PocketBase.

### Bug 4: Translate step crashed with "Missing activity data"
**File:** `src/services/lessonAssembler.ts` + `src/components/lesson/activities/Translate.tsx`  
**Symptom:** Lesson played fine for 3 steps then crashed at step 4 (RECALL/TRANSLATE)  
**Root cause:** `Translate.tsx` line 72 guards on `!data.correctAnswer`, but `buildRecallStep()` only set `acceptedAnswers` (the array of variants), not `correctAnswer` (the canonical string). The `.clinerules` contract was also wrong — it said translate only needs `sourcePhrase` + `acceptedAnswers`.  
**Fix:** Added `correctAnswer: chunk.targetPhrase` to `buildRecallStep()`. Updated `lessonValidator.ts` to enforce this as a blocking error. Updated `.clinerules` Rule 6 to include `correctAnswer` in the translate contract.

---

## Current Architecture (As-Built)

```
App.tsx → handleStartLesson(lesson)
  ↓
lessonPlanService.generateLessonPlan({ lesson, targetLanguage })
  ├── Gets auth userId
  ├── Gets/creates learner profile (PocketBase or in-memory fallback)
  ├── pedagogyEngine.prepareSession()
  └── lessonGeneratorV2.generateLesson({ sessionPlan, profile })
        ├── [AI PATH] aiPedagogyClient.generateChunksForTopic()
        │     └── Groq API → Llama 3.3 → JSON chunk content
        └── [FALLBACK] getHardcodedStarterChunks(langCode)
              ↓ (both paths feed into same assembler)
        lessonAssembler.assembleLessonPlan(content, lessonId)
              ↓
        lessonValidator.validateLessonPlan(plan)
              ↓
        LessonPlan { id, title, steps[], totalSunDrops }
              ↓
LessonView renders steps one at a time
ActivityRouter → correct activity component
```

### Key invariants (enforced by validator before render):
- Every TRANSLATE step has `sourcePhrase` + `correctAnswer` + `acceptedAnswers`
- Every FILL_BLANK step has `sentence` (with `___`) + `correctAnswer`
- Every MULTIPLE_CHOICE step has `question` + 4 `options` + `correctIndex` in bounds
- Every INFO step has `title` or `content`
- Every step has a `sunDrops` number in range [0, 4]
- First step of every chunk is always an INFO step (teach-before-test)

---

## Known Non-Blocking Noise in Console

These errors appear but do NOT affect lesson generation:

```
chunk_library/records: 400 (Bad Request)
```
This is from the OLD `pedagogyEngine` → `chunkGeneratorService` path which tries to store chunks to `chunk_library`. The V2 pipeline bypasses `chunk_library` entirely. The `chunk_library` schema has stricter field requirements (required select fields). This is from dead code that will be removed in a future cleanup task.

---

## File Ownership After Fix

| File | Responsibility | Status |
|------|---------------|--------|
| `src/utils/languageUtils.ts` | ISO code ↔ name conversion | ✅ Single source of truth |
| `src/services/aiPedagogyClient.ts` | Calls Groq, returns chunk content | ✅ `generateChunksForTopic()` wired |
| `src/services/lessonAssembler.ts` | Builds LessonPlan from chunks | ✅ `correctAnswer` added to translate |
| `src/services/lessonValidator.ts` | Validates before render | ✅ Enforces translate `correctAnswer` |
| `src/services/lessonGeneratorV2.ts` | Orchestrates full pipeline | ✅ V2 path wired, fallback uses ISO codes |
| `src/services/lessonPlanService.ts` | Entry point, gets profile | ✅ Passes `targetLanguage` to profile |
| `src/services/learnerProfileService.ts` | Profile CRUD + in-memory fallback | ✅ |
| PocketBase `learner_profiles` | Stores learner state | ✅ 13 number fields patched to optional |
| `scripts/setup-learner-profiles.mjs` | Creates PB collections | ✅ Use for clean installs |

---

## What Was Archived

The following docs in `docs/FIX-STEPS/archive/` capture the debugging history:
- `lesson-quality-fix.md` — The intermediate quality improvements
- `step-*.md` files — Earlier UI/garden fixes

The planning docs (`TASK-LESSON-FIX-EXECUTION-PLAN.md`, `REFERENCE-LESSON-ARCHITECTURE.md`) remain as reference for the architecture — they are accurate descriptions of the design even though the actual implementation had additional bugs that weren't captured in those plans.

---

## Next Steps (Not This Task)

1. **Remove dead chunk_library writes** — `chunkGeneratorService.ts` still tries to write to `chunk_library` on every session. Either fix the schema or remove the write (V2 pipeline doesn't use it).
2. **Add more fallback languages** — Current hardcoded fallback only has German→English and English for French speakers. Add Spanish, Italian, etc.
3. **SRS integration** — `srsService.ts` exists but lesson results aren't being fed back to it yet.
4. **Lesson completion → tree health** — The `treeHealthService` should receive signal when a lesson completes.
