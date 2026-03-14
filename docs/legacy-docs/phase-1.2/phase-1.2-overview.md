# Phase 1.2 — Pedagogy Engine & AI Integration

**Status:** 🟡 In Progress (Tasks 1–8 complete, G and H remaining)  
**Started:** ~Jan 2026  
**Last updated:** Feb 2026

---

## Phase Goal

Replace the Phase 1.1 mock lesson generator with a real, pedagogy-informed AI pipeline that:

1. Maintains a **learner model** (chunk acquisition, confidence, SRS intervals)
2. Generates **i+1 difficulty** lessons using the Krashen Input Hypothesis
3. Applies the **Lexical Approach** (chunks, not isolated words)
4. Monitors the **Affective Filter** to detect and adapt to learner struggle
5. Uses **Groq Llama 3.3** to generate contextual, kid-safe activities

---

## Task Status

### ✅ Completed Tasks

| Task | File | Description |
|------|------|-------------|
| 1.2-1 | `task-1.2-1-learner-model-schema.md` | PocketBase schema for learner model (`learner_profiles`, `chunk_exposures`) |
| 1.2-2 | `task-1.2-2-chunk-content-design.md` | Lexical chunk data model and content taxonomy |
| 1.2-3 | `task-1.2-3-chunk-generation-service.md` | `chunkGeneratorService.ts` — AI generates chunks from topic |
| 1.2-4 | `task-1.2-4-learner-profile-service.md` | `learnerProfileService.ts` — PB CRUD + confidence scoring |
| 1.2-5 | `task-1.2-5-pedagogy-engine-core.md` | `pedagogyEngine.ts` — i+1 targeting, session planning |
| 1.2-6 | `task-1.2-6-difficulty-calibration.md` | `difficultyCalibration.ts` — Krashen i+1 maths |
| 1.2-7 | `task-1.2-7-affective-filter.md` | `affectiveFilterMonitor.ts` — struggle detection |
| 1.2-8 | `task-1.2-8-lesson-generator-v2.md` | `lessonGeneratorV2.ts` — AI lesson generation |
| Task E | `task-G-dynamic-paths.md` (ref) | Wire V2 generator into `lessonPlanService.ts` (live pipeline) |
| Task F | — | Post-lesson SRS write-back in `gameProgressService.ts` |

### 🔲 Remaining Tasks

| Task | Doc | Description | Priority |
|------|-----|-------------|----------|
| G | `task-G-dynamic-paths.md` | Real skill path unlock from PB `user_trees` data | HIGH |
| H | `task-H-system-prompts.md` | Update legacy `systemPrompts.ts` to chunk/i+1 framing | MEDIUM |

---

## Architecture Summary

```
User taps lesson node
        ↓
lessonPlanService.generateLessonPlan()
        ↓
[auth check] → no auth → generateMockLessonPlan() (fallback)
        ↓
learnerProfileService.getOrCreateProfile(userId)
  → PB: learner_profiles table
        ↓
pedagogyEngine.prepareSession(userId, { topic, duration })
  → difficultyCalibration: i+1 level targeting
  → chunkManager: select target/review/context chunks
  → affectiveFilterMonitor: check for struggle signals
  → Returns: SessionPlan
        ↓
lessonGeneratorV2.generateLesson({ userId, sessionPlan, profile })
  → aiPedagogyClient.generateLesson(request)
  → Groq Llama 3.3: generates activities (quiz, fill-blank, matching)
  → Converts GeneratedLesson → LessonPlan
        ↓
LessonView renders activities
        ↓
handleLessonComplete() in App.tsx
  → saveLessonCompletion() → PB user_trees, profile
  → postLessonSRSUpdate(stars)
     → learnerProfileService.updateConfidence()
     → learnerProfileService.updateChunkStats()
```

---

## Key Services

| Service | Location | Purpose |
|---------|----------|---------|
| `learnerProfileService` | `src/services/learnerProfileService.ts` | PB CRUD, confidence, SRS stats |
| `pedagogyEngine` | `src/services/pedagogyEngine.ts` | Session planning, i+1 targeting |
| `chunkManager` | `src/services/chunkManager.ts` | Chunk CRUD, SRS scheduling |
| `difficultyCalibration` | `src/services/difficultyCalibration.ts` | i+1 maths, level calculation |
| `affectiveFilterMonitor` | `src/services/affectiveFilterMonitor.ts` | Struggle detection, adaptation |
| `lessonGeneratorV2` | `src/services/lessonGeneratorV2.ts` | Orchestrates AI lesson generation |
| `aiPedagogyClient` | `src/services/aiPedagogyClient.ts` | Groq API calls with pedagogy context |
| `lessonPlanService` | `src/services/lessonPlanService.ts` | Entry point from App.tsx |
| `gameProgressService` | `src/services/gameProgressService.ts` | PB writes + SRS update |

---

## PocketBase Collections Added in Phase 1.2

| Collection | Purpose |
|-----------|---------|
| `learner_profiles` | Per-user learner model (confidence, level, chunk counts) |
| `chunk_exposures` | SRS log: every chunk encounter with correctness and timing |
| `lexical_chunks` | Chunk library by topic and difficulty |

Migration scripts:
- `scripts/migrate-learner-profile.cjs`
- `scripts/migrate-pedagogy-schema.cjs`

---

## Pedagogical Frameworks

Full explanation in `PEDAGOGY.md`. Summary:

| Framework | Author | Implementation |
|-----------|--------|---------------|
| Lexical Approach | Michael Lewis | Chunks as first-class content |
| Input Hypothesis | Stephen Krashen | i+1 difficulty in `difficultyCalibration.ts` |
| Affective Filter | Stephen Krashen | `affectiveFilterMonitor.ts` |
| Language Coaching | Various | Learner autonomy in prompts |

---

## Known Limitations / Phase 1.3 Backlog

- **Per-activity SRS** — `reportActivityCompletion()` requires per-chunk correct/incorrect data that `LessonResult` doesn't yet surface. Currently using coarse star-rating signal only. Fix in Phase 1.3 by adding `activityResults` to `LessonResult`.
- **Dynamic paths** — Path node unlock still uses mock data. **Task G** addresses this.
- **Legacy chat interface** — `ChatInterface.tsx` still uses Phase 1.1 prompts. **Task H** addresses this.
- **Chunk seed data** — `lexical_chunks` table is populated by AI on first use. Pre-seeding common beginner chunks would speed up first session.
- **Real-time activity adaptation** — `affectiveFilterMonitor` is wired but `LessonView` doesn't call `pedagogyEngine.reportActivityCompletion()` in real-time. Phase 1.3.

---

## Commit History (Phase 1.2)

```
86dd3a0  [AI] Add: Post-lesson SRS write-back (Task F)
03b85ce  [AI] Add: Wire LessonGeneratorV2 into lesson pipeline (Task E)
24dbe71  [Fix] tutorialComplete PB schema + migration
af99bc4  [AI] Add: Tutorial flow (Task D)
...      Tasks A, B, C (shop categories, PB wiring, mobile polish)
...      Tasks 1.2-1 through 1.2-8 (pedagogy engine)
```

---

## Phase 1.2 Completion Criteria

- [x] Learner profile persisted in PocketBase
- [x] i+1 difficulty targeting active
- [x] AI generates real lesson content via Groq
- [x] SRS signals written back after every lesson
- [ ] Skill path nodes unlock dynamically from real progress (Task G)
- [ ] System prompts aligned with pedagogy framework (Task H)

**Phase 1.2 is ~85% complete.** Tasks G and H are the remaining pieces before moving to Phase 2 (Friends & Social).
