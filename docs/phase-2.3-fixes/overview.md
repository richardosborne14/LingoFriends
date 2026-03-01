# Phase 2.3 — Bug Fix Sprint

**Source:** Post-Phase-2 / 2.1 / 2.2 QA session — visual & functional issues identified by product review
**Total tasks:** 13
**Goal:** Fix all 19 identified bugs across world map, lesson system, avatar, AI help, sundrop mechanics, sound, and unwired Phase 2 features before moving to Phase 2.4

---

## Bug List Summary

| # | Original Bug | Task | Priority | Area |
|---|---|---|---|---|
| 1 | World map looks like floating island — world outside fence is too thin | 2.3.1 | 🔴 P1 | World Map |
| 16 | Grey blob stuck at top-right of world map screen | 2.3.1 | 🔴 P1 | World Map |
| 2 | Clicking square adjacent to tree activates it incorrectly | 2.3.2 | 🔴 P1 | Garden Interaction |
| 3 | Opening a new lesson step doesn't auto-play 'Learn Something New!' TTS | 2.3.3 | 🔴 P1 | Lesson Audio |
| 9 | Audio spinning icon starts on 2nd lesson step, keeps spinning on wrong steps | 2.3.3 | 🔴 P1 | Lesson Audio |
| 8 | Help popup uses browser native TTS, not Google TTS | 2.3.3 | 🟡 P2 | Lesson Audio |
| 4 | Lesson steps show example phrases instead of chunk-by-chunk breakdown | 2.3.4 | 🔴 P1 | Lesson Content |
| 13 | Lesson intro doesn't announce all phrases to be learned upfront | 2.3.4 | 🔴 P1 | Lesson Content |
| 5 | +0 SunDrops shown on 'Learn Something New' INFO step | 2.3.5 | 🟡 P2 | SunDrops |
| 6 | -1 SunDrop mechanic caps at 1 instead of going to 0 | 2.3.5 | 🟡 P2 | SunDrops |
| 7 | Help button separate from AI assistant button — should be merged | 2.3.6 | 🟡 P2 | AI Help UX |
| 11 | AI help modal takes over full screen — should be inline | 2.3.6 | 🟡 P2 | AI Help UX |
| 12 | Translate questions don't encourage STT voice input | 2.3.7 | 🟡 P2 | STT / Voice |
| 10 | Questions are repetitive — same types recycled, low variety | 2.3.8 | 🔴 P1 | Activity Variety |
| 15 | Completing a lesson step didn't unlock the next step | 2.3.9 | 🔴 P1 | Lesson Progression |
| 17 | Avatars look creepy — no mouths when silent, terrifying eyes | 2.3.10 | 🟡 P2 | Avatar |
| 14 | Pigeon emoji next to lesson instructions should be removed | 2.3.11 | 🟢 P3 | UI Cleanup |
| 18 | No sounds on correct/wrong answers or lesson step completion | 2.3.12 | 🔴 P1 | Sound |
| 19 | No cabin on world map — Phase 2 features exist in code but not wired into the game | 2.3.13 | 🔴 P1 | Integration |

---

## Task List

| Task | Priority | Component | Description |
|------|----------|-----------|-------------|
| [2.3.1](task-2.3.1-world-map-visuals.md) | 🔴 P1 | World Map | Fix floating island + remove grey blob artefact |
| [2.3.2](task-2.3.2-tree-click-radius.md) | 🔴 P1 | Garden | Fix tree click hit-testing to exact tile only |
| [2.3.3](task-2.3.3-lesson-audio-tts.md) | 🔴 P1 | Lesson Audio | Auto-play TTS, fix spinning icon, use Google TTS in help |
| [2.3.4](task-2.3.4-lesson-content-structure.md) | 🔴 P1 | Lesson Content | Chunk-by-chunk phrase breakdown + lesson intro |
| [2.3.5](task-2.3.5-sundrop-mechanics.md) | 🟡 P2 | SunDrops | Hide +0 on INFO steps, fix -1 floor-at-zero bug |
| [2.3.6](task-2.3.6-ai-help-ux.md) | 🟡 P2 | AI Help UX | Merge help + AI assistant, inline modal |
| [2.3.7](task-2.3.7-stt-translate.md) | 🟡 P2 | STT / Voice | Encourage STT as primary input on Translate activities |
| [2.3.8](task-2.3.8-activity-variety.md) | 🔴 P1 | Activities | Enforce teach-first progression, true activity variety |
| [2.3.9](task-2.3.9-lesson-step-unlock.md) | 🔴 P1 | Lesson Flow | Fix lesson step completion not unlocking next step |
| [2.3.10](task-2.3.10-avatar-redesign.md) | 🟡 P2 | Avatar | Redesign avatars — mouths, friendlier eyes, less uncanny |
| [2.3.11](task-2.3.11-ui-cleanup.md) | 🟢 P3 | UI | Remove pigeon emoji from lesson step instructions |
| [2.3.12](task-2.3.12-sound-effects.md) | 🔴 P1 | Sound | Wire up correct/wrong/complete sound effects |
| [2.3.13](task-2.3.13-phase2-feature-integration.md) | 🔴 P1 | Integration | Audit Phase 2 features — wire up cabin + other unwired objects |

---

## Acceptance Criteria for Phase 2.3 Complete

- [ ] World map shows full terrain beyond fence (not a floating island)
- [ ] Grey blob artefact removed from world map
- [ ] Tree click only activates on the exact tree tile
- [ ] Lesson step auto-plays TTS header on open
- [ ] Audio spinning icon only spins when actively playing
- [ ] Help popup uses Google TTS
- [ ] Lesson steps teach chunk-by-chunk (not raw example phrases)
- [ ] Lesson intro announces all phrases to be learned
- [ ] INFO steps show no SunDrop indicator (not +0)
- [ ] -1 SunDrop penalty correctly reduces to 0 (no floor at 1)
- [ ] Single combined AI assistant button — highly visible, inviting
- [ ] AI help panel is inline / side-panel, not full-screen modal
- [ ] Translate activity shows microphone as primary input option
- [ ] Activity sequence follows proper teach-first 5-step progression per chunk
- [ ] Completing a lesson step unlocks the next step correctly
- [ ] Avatars have mouths, friendly eyes, not uncanny
- [ ] Pigeon emoji removed from lesson step instructions
- [ ] Sound effects play on correct answer, wrong answer, and lesson step completion
- [ ] Cabin visible on the world map outside the fence
- [ ] Full audit of Phase 2 renderers/components — all are either wired up or explicitly deferred
- [ ] New process rule: no visual/audio feature marked done without being verified in the running game
