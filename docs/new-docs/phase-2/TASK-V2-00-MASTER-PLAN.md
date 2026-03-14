# LingoFriends V2 → V1 Feature Parity: Master Task Plan

**Created:** March 2026  
**Total Estimated Time:** 76–106 hours  
**Task Count:** 8 task documents covering 18 requested items + 7 bonus items

---

## Task Summary

| # | Task | Hours | Priority | Key Items Covered |
|---|------|-------|----------|-------------------|
| 01 | Onboarding & i18n | 12–16h | Critical | Language/interest/level selection, i18n, default tree |
| 02 | Lesson Flow Polish | 8–12h | Critical | First lesson auto-start, chunk explanations, TTS, fix prepare screen |
| 03 | Gamification Feedback | 8–10h | High | Sundrop modals, counter, hearts, first lesson completion explanation |
| 04 | Activity Variety | 10–14h | High | Build Sentence, STT, Matching, Listen & Type, True/False |
| 05 | AI Assistant & Levels | 10–14h | High | Help chat, bug reports, adaptive level assessment |
| 06 | Garden Overhaul | 14–20h | High | Isometric view, shop, tree-based learning, remove Learn tab |
| 07 | Avatar & NPC Encounters | 12–16h | High | Hat fix, gender selection, NPC characters in lessons |
| 08 | SRS, Streaks & Polish | 10–14h | Medium-High | Spaced repetition, daily streaks, caps, celebrations, settings |

---

## Recommended Execution Order

```
Phase A — Foundation (do first, everything depends on these)
├── TASK-V2-01: Onboarding & i18n           ← START HERE
└── TASK-V2-02: Lesson Flow Polish          ← immediately after

Phase B — Core Loop (makes lessons fun)
├── TASK-V2-03: Gamification Feedback       ← rewards make everything better
├── TASK-V2-04: Activity Variety            ← prevents boredom
└── TASK-V2-07: Avatar & NPC Encounters     ← brings lessons to life

Phase C — World Building (makes the garden worth visiting)
├── TASK-V2-06: Garden Overhaul             ← the emotional home
└── TASK-V2-05: AI Assistant & Levels       ← safety net + progression

Phase D — Retention Systems (keeps users coming back)
└── TASK-V2-08: SRS, Streaks & Polish       ← long-term engagement
```

### Why This Order?

1. **Onboarding first** because it's the entry point and i18n is needed everywhere
2. **Lesson flow** second because it gates testing everything else
3. **Gamification** next because rewards make playtesting the rest more motivating
4. **Activity variety** before NPC encounters so there's content variety when NPCs start "teaching"
5. **Avatar/NPC** can be done in parallel with garden work
6. **Garden overhaul** before AI assistant because tree-based learning replaces the Learn tab
7. **AI assistant** after garden because it references tree/lesson context
8. **SRS and polish** last because it builds on ALL other systems

---

## Dependency Graph

```
TASK-01 (Onboarding + i18n)
  ├──→ TASK-02 (Lesson Flow) ──→ TASK-03 (Gamification)
  │                                    │
  │                                    ├──→ TASK-04 (Activities)
  │                                    │
  │                                    └──→ TASK-07 (Avatar/NPC)
  │
  ├──→ TASK-06 (Garden) ──→ TASK-05 (AI Assistant)
  │
  └──→ TASK-08 (SRS/Streaks) ← depends on TASK-03 + TASK-06
```

---

## Items from Original List → Task Mapping

| # | Item | Task |
|---|------|------|
| 1 | Interests and language at beginning | TASK-V2-01 |
| 2 | Interface language change + i18n | TASK-V2-01 |
| 3 | First lesson after signup | TASK-V2-02 |
| 4 | Sundrop earn/lose modals | TASK-V2-03 |
| 5 | Sundrop counter during questions | TASK-V2-03 |
| 6 | Build sentence, STT, more variety | TASK-V2-04 |
| 7 | AI assistant chat | TASK-V2-05 |
| 8 | First lesson completion garden explanation | TASK-V2-03 |
| 9 | Garden shop | TASK-V2-06 |
| 10 | Hats on head, gender selection | TASK-V2-07 |
| 11 | Isometric garden view | TASK-V2-06 |
| 12 | Remove Learn tab, tree-based learning | TASK-V2-06 |
| 13 | Default tree on signup | TASK-V2-01 |
| 14 | Level selection in onboarding | TASK-V2-01 |
| 15 | AI level assessment | TASK-V2-05 |
| 16 | NPC conversation partner in lessons | TASK-V2-07 |
| 17 | Chunk explanation + TTS at stage start | TASK-V2-02 |
| 18 | Fix prepare lesson / continue button | TASK-V2-02 |

## Bonus Items Not in Original List

| Item | Task | Why It Matters |
|------|------|----------------|
| Spaced repetition + tree health | TASK-V2-08 | Core mechanic for long-term retention |
| Daily streak system | TASK-V2-08 | Primary daily engagement driver |
| Daily learning cap | TASK-V2-08 | Healthy engagement, LingoFriends core value |
| Celebration animations | TASK-V2-08 | Polish that makes it feel like a real game |
| Settings page | TASK-V2-08 | Essential for user control and privacy |
| Profile/stats page | TASK-V2-08 | Users need to see their progress |
| Review mode (water trees) | TASK-V2-08 | Connects SRS to garden mechanic |

---

## DB Schema Changes Required

New tables needed across all tasks:

```
garden_items       — placed decorations, flowers, furniture
bug_reports        — user-reported broken questions  
lesson_performance — per-lesson scoring metrics
chunk_srs          — spaced repetition tracking per chunk
streak_data        — daily streak tracking
```

Profile table additions:
```
profiles += {
  native_language, target_language, interests[], 
  level, gender, onboarding_complete,
  first_lesson_complete, daily_lesson_count, 
  last_lesson_date
}
```

---

## Risk Areas to Watch

1. **i18n string coverage** — easy to miss hardcoded strings. Do a grep for English text after TASK-01.
2. **Three.js performance on mobile** — the encounter scene + garden both use Three.js. Profile on low-end Android devices. Target 30fps minimum.
3. **TTS costs** — Google TTS is pay-per-character. Cache aggressively (once per chunk, store in DB).
4. **AI generation reliability** — the AI generates lesson content, chunk explanations, and help responses. Each needs retry logic and fallback behavior.
5. **Race conditions on signup** — onboarding → profile save → tree creation → lesson generation involves 4 async operations. Sequence carefully.
6. **Drag-and-drop on mobile** — "Build the Sentence" activity needs careful touch event handling. Test on real devices.

---

## Cline Usage Notes

Each task document is designed to be handed to Cline as-is. They contain:
- Problem statement (why)
- Goals (what)
- Architecture overview (how it fits)
- Step-by-step implementation (what to build)
- Code patterns and examples
- Testing checklist
- File creation/modification lists

Feed them one at a time in the recommended order. Each task should be independently testable before moving to the next.
