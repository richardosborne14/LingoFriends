# LingoFriends Roadmap

## Overview

LingoFriends is a kid-friendly language learning app built on a solid pedagogical foundation. The project is organized into phases, each building on the previous.

**Current Phase:** Phase 3 COMPLETE → Planning Phase 4

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

## Phase 1.1: Gamification ✅ COMPLETE

**Goal:** Add the "Garden" game layer with trees, SunDrops, awards, and visual progress.

**Status:** ✅ Complete — 3D garden, skill paths, SunDrops, tree health, shop, tutorial, decorations, avatar.

---

## Phase 1.2: Pedagogy Engine ✅ COMPLETE

**Goal:** Replace static paths and vocabulary with a dynamic, research-based learning system.

**Status:** ✅ Complete — Learner model, chunk SRS, pedagogy engine, i+1 calibration, lesson generator v2, live garden data.

---

## Phase 2: World Expansion + Fixes ✅ COMPLETE

**Goal:** Multi-world map, bug fixes, activity improvements.

**Status:** ✅ Complete — World map view, activity variety improvements, lesson pipeline stabilisation.

---

## Phase 3: AI-Coached Learning ✅ COMPLETE

**Goal:** Personalised, coached lesson experience driven by the learner's interests and goals.

**Status:** ✅ Complete — See `docs/phase-3-ai-assisted-content/PHASE-3-COMPLETE.md`

### What was built
- **Pre-lesson personalisation chat** — 1-3 questions before lesson generation; context injected into AI chunk generator
- **Chunk family architecture** — ONE grammatical frame + N slot-filler variations per lesson (Rule 8)
- **COACHING_CHAT step** — 4-phase NPC interaction per chunk (intro → discover → reveal → ready); 0 SunDrops; no failure state
- **TTS pre-generation fix** — Coaching text now included in background audio cache; plays instantly
- **LessonIntroCard redesign** — Core frame shown as headline; chunks shown as slot-filler rows
- **Age-appropriate interactions** — `ageGroup` read from `profile.ageGroup` (Rule 13)

---

## Phase 4: Production + Content Expansion

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

**Phase:** Phase 3 COMPLETE ✅ — Beginning Phase 4 planning

**What's running in production:**
- Full 3D garden with live Pocketbase data (trees, SunDrops, gems, streak)
- Pedagogy engine with chunk SRS, i+1 calibration, learner profiles
- AI-powered lessons via Groq Llama 3.3 (chunk families + coaching steps)
- Pre-lesson personalisation chat with graceful skip
- COACHING_CHAT NPC steps with guided discovery (0 SunDrops, no failure state)
- TTS audio pre-generation for all lesson content including coaching text
- Google TTS multilingual voices, Groq Whisper STT

**Next Steps (Phase 4 candidates):**
1. Age collection in onboarding (currently defaults to 11-14)
2. Whisper STT integration in coaching discovery (free-text answers)
3. Smart model upgrade path (Haiku 4.5 for chunk generation)
4. Parent dashboard + progress reports
5. Multi-language expansion (Spanish, Italian)

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