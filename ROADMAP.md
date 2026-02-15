# LingoFriends Roadmap

## Overview

LingoFriends is a kid-friendly language learning app built on a solid pedagogical foundation. The project is organized into phases, each building on the previous.

**Current Phase:** Phase 1.1 (Gamification) → Transitioning to Phase 1.2 (Pedagogy Engine)

---

## Phase 1.0: Foundation (COMPLETE)

**Goal:** Working app with authentication, AI chat, and basic persistence.

**Status:** ✅ Complete

### Completed Tasks
- [x] Pocketbase integration (auth, profiles, sessions)
- [x] Groq AI service (Llama 3.3)
- [x] Voice services (Google TTS, Groq Whisper)
- [x] Basic chat interface
- [x] Design system and UI components
- [x] Onboarding flow
- [x] Profile management

---

## Phase 1.1: Gamification (IN PROGRESS)

**Goal:** Add the "Garden" game layer with trees, SunDrops, awards, and visual progress.

**Timeline:** See `docs/phase-1.1/phase-1.1-overview.md`

### Status

| Task | Description | Status |
|------|-------------|--------|
| 1.1.1 | Types & SunDrop Currency | ✅ Complete |
| 1.1.2 | Activity Components | ✅ Complete |
| 1.1.3 | Lesson View | ✅ Complete |
| 1.1.4 | Path View | ✅ Complete |
| 1.1.5 | Garden World (Basic) | ✅ Complete |
| 1.1.6 | App Navigation | ✅ Complete |
| 1.1.7 | Pocketbase Schema | ✅ Complete |
| 1.1.8 | Garden State Persistence | ✅ Complete |
| 1.1.9 | AI Lesson Generator | ⚠️ Needs overhaul for Phase 1.2 |
| 1.1.10 | Tree Health & Decay | ✅ Complete |
| 1.1.11 | Gift System | 🔲 Not started |
| 1.1.12 | Decoration System | 🔲 Not started |
| 1.1.13 | Seed Earning | 🔲 Not started |
| 1.1.14 | Mobile Polish | 🔲 Not started |
| 1.1.15 | Pixi Migration | 🔲 Deferred |
| 1.1.16 | Tutorial & Testing | 🔲 Not started |
| 1.1.17 | OSS Assets | 🔲 Not started |

### Important Note

**Phase 1.1 uses static skill paths and vocabulary-based lessons.** These are being replaced in Phase 1.2 with:
- Dynamic, personalized paths
- Lexical chunk-based content
- i+1 difficulty calibration
- Affective filter monitoring

See `PEDAGOGY.md` for the full pedagogical foundation.

---

## Phase 1.2: Pedagogy Engine (PLANNING COMPLETE)

**Goal:** Replace static paths and vocabulary with a dynamic, research-based learning system.

**Timeline:** 6-8 weeks after Phase 1.1 core is complete

**Documentation:** `docs/phase-1.2/phase-1.2-overview.md`

### Overview

Phase 1.2 implements four key pedagogical frameworks:
1. **Lexical Approach** (Michael Lewis) — Teaching language in chunks
2. **Input Hypothesis** (Stephen Krashen) — i+1 difficulty calibration
3. **Affective Filter** (Stephen Krashen) — Emotional monitoring and adaptation
4. **Language Coaching** — Learner-centered, goal-oriented teaching

### Tasks

| Task | Description | Dependencies | Est. Time |
|------|-------------|--------------|-----------|
| 1.2.1 | Learner Model Schema | None | 3-4 hours |
| 1.2.2 | Chunk Content Design | 1.2.1 | 4-6 hours |
| 1.2.3 | Chunk Seeding Service | 1.2.1, 1.2.2 | 3-4 hours |
| 1.2.4 | Learner Profile Service | 1.2.1 | 3-4 hours |
| 1.2.5 | Pedagogy Engine Core | 1.2.1, 1.2.4 | 6-8 hours |
| 1.2.6 | i+1 Difficulty Calibration | 1.2.5 | 4-5 hours |
| 1.2.7 | Affective Filter Monitoring | 1.2.5 | 4-5 hours |
| 1.2.8 | AI Lesson Generator v2 | 1.2.5, 1.2.6, 1.2.7 | 6-8 hours |
| 1.2.9 | Dynamic Path Generation | 1.2.5, 1.2.8 | 4-5 hours |
| 1.2.10 | Chunk SRS System | 1.2.1 | 4-5 hours |
| 1.2.11 | System Prompts Update | 1.2.8 | 3-4 hours |
| 1.2.12 | Integration Testing | All 1.2 tasks | 6-8 hours |

### What Changes from Phase 1.1

| Component | Phase 1.1 | Phase 1.2 |
|-----------|-----------|-----------|
| Content unit | `vocabulary: string[]` | `chunks: LexicalChunk[]` |
| Paths | Static skill_paths | Dynamic, personalized |
| Difficulty | Fixed (beginner/intermediate/advanced) | Dynamic i+1 |
| Adaptation | None | Affective filter monitoring |
| SRS | Basic tree health | Full chunk SRS with 4 states |
| Progress | XP and tree levels | Chunk acquisition + CEFR levels |

### Migration Path

1. **Schema Migration** — Run `migrate-pedagogy-schema.cjs` to add new collections
2. **Content Seeding** — Populate `chunk_library` and `topics` collections
3. **Code Update** — Replace skill_paths with dynamic path generation
4. **UI Update** — PathView uses chunk-based lessons
5. **Testing** — Full regression test with new pedagogy

---

## Phase 2: Social Features

**Goal:** Add friends, messaging, and leaderboards.

**Status:** 🔲 Not started

### Planned Features
- Friend code system
- Friend requests and management
- Leaderboard (friends only)
- Gift sending
- Encouragement messages

---

## Phase 3: Content Expansion

**Goal:** Expand content and add multi-language support.

**Status:** 🔲 Not started

### Planned Features
- Multiple target languages (Spanish, German)
- Native language variants
- Advanced topics
- Dictée module (French spelling)
- Possible maths module

---

## Phase 4: Production

**Goal:** Production-ready with parent features.

**Status:** 🔲 Not started

### Planned Features
- Parent dashboard
- Progress reports
- Time limits
- Analytics
- Performance optimization

---

## Architecture Overview

### Data Flow (Phase 1.2)

```
User Action
    ↓
Pedagogy Engine
    ├── Learner Profile Service (user state)
    ├── Chunk Manager (content library)
    ├── Difficulty Calibration (i+1)
    ├── Affective Filter Monitor (emotional state)
    └── SRS Service (spaced repetition)
    ↓
Lesson Generator v2
    ├── Select chunks (new + review + context)
    ├── Generate activities
    └── Personalize to learner
    ↓
Activity Components (UI)
    ↓
Record Encounter
    ├── Update chunk status
    ├── Update learner profile
    └── Adjust difficulty/filter
    ↓
Garden State (visual progress)
```

### Key Collections

| Collection | Purpose |
|------------|---------|
| `learner_profiles` | Personal learning data |
| `user_chunks` | Per-user chunk SRS state |
| `chunk_library` | All lexical chunks |
| `topics` | Content organization |
| `user_trees` | Garden visual state |
| `sun_drops` | Currency transactions |

---

## File Structure

```
docs/
├── phase-1.1/          # Gamification tasks
│   └── task-1-1-*.md
├── phase-1.2/          # Pedagogy Engine tasks
│   ├── phase-1.2-overview.md
│   └── task-1-2-*.md
├── phase-2/            # Future
├── phase-3/            # Future
├── design-system.md
├── SYSTEM_PROMPTS.md
└── README.md

src/
├── components/
│   ├── garden/         # Garden UI
│   ├── lesson/         # Lesson activities
│   ├── navigation/     # App navigation
│   └── path/           # Path view
├── services/
│   ├── pedagogyEngine.ts         # Phase 1.2
│   ├── learnerProfileService.ts  # Phase 1.2
│   ├── difficultyCalibration.ts  # Phase 1.2
│   ├── affectiveFilterMonitor.ts # Phase 1.2
│   ├── srsService.ts             # Phase 1.2
│   ├── lessonGeneratorV2.ts      # Phase 1.2
│   └── ...
├── types/
│   ├── pedagogy.ts     # Phase 1.2 types
│   └── pocketbase.ts
└── data/
    ├── topics.ts       # Topic definitions
    └── chunks/         # Chunk content by language

scripts/
├── migrate-pedagogy-schema.cjs  # Phase 1.2 schema
├── seed-topics.cjs               # Topic seeding
└── seed-chunks.cjs               # Chunk seeding
```

---

## Key Documents

| Document | Purpose |
|----------|---------|
| `PEDAGOGY.md` | Full pedagogical foundation |
| `docs/phase-1.2/phase-1.2-overview.md` | Phase 1.2 architecture |
| `docs/SYSTEM_PROMPTS.md` | AI prompt documentation |
| `.clinerules` | Project coding standards |
| `LEARNINGS.md` | Project history and lessons |

---

## Current Status

**Phase:** Transitioning from 1.1 to 1.2

**Blocking:**
- Phase 1.1 core gamification is functional
- Phase 1.2 documentation is complete
- Ready to begin Phase 1.2 implementation

**Next Steps:**
1. Review Phase 1.2 task documents
2. Begin with task 1.2.1 (Learner Model Schema)
3. Run migration scripts
4. Update existing components

---

## Confidence Scoring

Each task should achieve a confidence score of 8/10 or higher before being considered complete. See `.clinerules` for scoring criteria.

---

## Cost Estimates

| Phase | API Costs | Time |
|-------|-----------|------|
| 1.0 (Complete) | ~$50 | 4 weeks |
| 1.1 (In Progress) | ~$100 | 4 weeks |
| 1.2 (Planning) | ~$200 | 6-8 weeks |
| 2.0 (Future) | ~$150 | 3-4 weeks |

**Total MVP + Pedagogy:** ~$350-500 in API tokens

---

## Notes

- Phase 1.1's static paths and vocabulary approach will be deprecated before Phase 1.2
- The gamification layer (garden, trees, SunDrops) will be preserved and enhanced
- All new pedagogy work should follow the principles in `PEDAGOGY.md`