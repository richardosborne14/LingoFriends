# LingoFriends — Master Plan

> **This is the single source of truth for what needs to be done.**
> All old phase overview docs are now secondary references. If anything contradicts this document, this document wins.

**Last updated:** 2026-02-18

---

## How This Project Is Organised

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Foundation (auth, DB, AI swap, design system, onboarding) | ✅ COMPLETE |
| **Phase 1.1** | Game-based learning redesign (garden, lessons, activities) | ✅ COMPLETE (all fix steps done) |
| **Phase 1.2** | Pedagogy engine (adaptive learning, chunk system, SRS) | 🔶 PARTIALLY COMPLETE — Tasks 1.2.1–1.2.8 done + audit fixes; Tasks C, D, E, F, G, H, I remaining |
| **Phase 2** | Social features, friends, multiplayer | 🔲 NOT STARTED |
| **Phase 3** | Advanced content, more languages | 🔲 NOT STARTED |

---

## Current State (as of 2026-02-18)

### What's Actually Working

- ✅ Full 3D garden with learning trees (click-to-walk, click tree to open path)
- ✅ Game loop: Garden → Path View → Lesson → Rewards → back to Garden
- ✅ Daytime atmosphere (sky blue, clouds, fence, checkered grass tiles)
- ✅ Currency model: Gems in shop, SunDrops per-tree, both shown in header
- ✅ Chibi avatar with toon materials, walking bob, idle breathing, eye blink
- ✅ Shop with 6 category tabs + TreeCare consumables + tree picker modal
- ✅ Shop placement mode fully wired (ghost preview → confirm → close shop)
- ✅ Pedagogy engine services (1.2.1–1.2.8): chunk system, learner profile, difficulty calibration, affective filter, lesson generator v2
- ✅ Auth, onboarding, profile (Phase 1)
- ✅ All activity component types (6 types)

### Critical Remaining Gaps

> **Task B is done:** Gems, sunDrops, streak, lesson completions, and tree care all write/read real Pocketbase. Garden trees are still mock (intentional — Task G replaces them with dynamic paths).

> **Lesson Generator V2 is never called (Task E).** The lesson flow uses `lessonPlanService` (v1 static) not the pedagogy engine. Every kid gets the same hardcoded activities.

> **Garden decoration placement is not persisted (Task E).** `GardenWorld3D.onPlacementEnd` doesn't pass gx/gz coordinates back, so `savePlacedObject()` cannot be called. Bundled into Task E.

---

## Revised Task Roadmap

### GROUP 1 — Finish the Baseline Experience
*Goal: A polished, Pocketbase-backed game that a real kid can play with persistent progress*

| # | Task | What It Is | Est. | Status |
|---|------|-----------|------|--------|
| **A** | Shop Categories & Tree Care | Categorised shop tabs, TreeCare consumables, placement mode wiring | 2-3h | ✅ DONE (2026-02-18) |
| **B** | Pocketbase Live Data Wiring | Lesson completion, tree care, gem stats all write/read real Pocketbase | 5-7h | ✅ DONE (2026-02-18) |
| **C** | Mobile Polish (1.1.15) | Touch controls, D-pad garden navigation, responsive layout, performance | 4-5h | 🔲 |
| **D** | Tutorial Flow (1.1.16) | First-time user experience: plant first tree, do first lesson, understand the loop | 4-5h | 🔲 |

### GROUP 2 — Wire the Pedagogy Brain
*Goal: The adaptive learning engine actually drives lessons — no two learners get the same experience*

| # | Task | What It Is | Est. | Status |
|---|------|-----------|------|--------|
| **E** | Wire Lesson Generator V2 | Connect LessonView/PathView to `lessonGeneratorV2` + `pedagogyEngine`; replace static lesson plan service | 3-4h | ✅ DONE (2026-02-18) |
| **F** | Chunk SRS System (1.2.10) | Implement `srsService.ts` (SM-2 algorithm), integrate with chunk encounters, connect to tree health | 3-4h | 🔲 |
| **G** | Dynamic Path Generation (1.2.9) | Replace static paths with topic-based generated paths; interests drive what trees appear | 4-5h | 🔲 |
| **H** | System Prompts Overhaul (1.2.11) | Update Professor Finch prompts for chunk-based teaching; add lesson gen, error correction, interest detection | 3-4h | 🔲 |
| **I** | Integration & E2E Testing (1.2.12) | Full pedagogy engine tests, full session flow, confidence checks | 6-8h | 🔲 |

### GROUP 3 — Phase 2
Social features, friends system, multiplayer — when Groups 1+2 are done.

---

## Fix Steps — Final Status

| Step | What | Status |
|------|------|--------|
| Step 1 | Tree-Renderer Bridge | ✅ DONE (2026-02-17) |
| Step 2 | Game Loop Wiring | ✅ DONE (2026-02-17) |
| Step 3 | Garden Atmosphere | ✅ DONE — pivoted to daytime (sky blue, sun, clouds, fence) |
| Step 4 | Currency Model Fix | ✅ DONE (2026-02-17) |
| Step 5 | Avatar Polish | ✅ DONE (2026-02-17) |
| Step 6 | Shop Categories & Tree Care | ✅ DONE (2026-02-18) |

---

## Phase 1.1 — Final Status

| Task | Name | Status |
|------|------|--------|
| 1.1.1 | Type definitions & SunDrop service | ✅ Done |
| 1.1.2 | Activity components (6 types) | ✅ Done |
| 1.1.3 | Lesson view container | ✅ Done |
| 1.1.4 | Path view (lesson select) | ✅ Done |
| 1.1.5 | Garden world basic (2D placeholder) | ✅ Done (superseded by Three.js) |
| 1.1.6 | App navigation | ✅ Done |
| 1.1.7 | Pocketbase game schema | ✅ Done (schema created; **live wiring is Task B**) |
| 1.1.8 | Garden state (useGarden) | ✅ Done |
| 1.1.9 | AI lesson generator v1 | ✅ Done (superseded by 1.2.8 v2, **wiring is Task E**) |
| 1.1.10 | Tree health & decay | ✅ Done |
| 1.1.11 | Gift system | ✅ Done |
| 1.1.12 | Decoration system | ✅ Done (merged into shop) |
| 1.1.13 | Seed earning | ✅ Done |
| 1.1.14 | Three.js garden renderer | ✅ Done |
| 1.1.15 | Mobile polish | 🔲 Task C |
| 1.1.16 | Tutorial & testing | 🔲 Task D |
| 1.1.17 | Garden shop UI | ✅ Done |
| 1.1.18 | Avatar customization | ✅ Done |
| 1.1.19–22 | Architecture fix / renderer integration | ✅ Done (via fix steps 1–6) |

---

## Phase 1.2 — Status

| Task | Name | Status |
|------|------|--------|
| 1.2.1 | Learner model schema | ✅ Done |
| 1.2.2 | Chunk content design | ✅ Done |
| 1.2.3 | Chunk generation service | ✅ Done |
| 1.2.4 | Learner profile service | ✅ Done |
| 1.2.5 | Pedagogy engine core | ✅ Done |
| 1.2.6 | Difficulty calibration | ✅ Done |
| 1.2.7 | Affective filter monitor | ✅ Done |
| 1.2.8 | Lesson generator v2 | ✅ Done (not yet wired into game — **Task E**) |
| 1.2.9 | Dynamic path generation | 🔲 Task G |
| 1.2.10 | Chunk SRS system | 🔲 Task F |
| 1.2.11 | System prompts overhaul | 🔲 Task H |
| 1.2.12 | Integration testing | 🔲 Task I |

---

## Key Reference Files

| File | What It Is |
|------|-----------|
| `docs/phase-1.1/GardenV2.jsx` | Visual reference — original spec for garden appearance |
| `docs/phase-1.1/GAME_DESIGN.md` | Source of truth for all game mechanics |
| `src/renderer/objects/learningTrees.ts` | 15-stage tree growth code |
| `src/renderer/GardenRenderer.ts` | Main Three.js renderer |
| `src/components/garden/GardenWorld3D.tsx` | React wrapper for the renderer |
| `src/renderer/types.ts` | SHOP_CATALOGUE, ShopItem, ObjectCategory |
| `src/components/garden/ShopPanel.tsx` | Shop UI with categories and tree care |
| `src/services/lessonGeneratorV2.ts` | Phase 1.2 lesson generator (not yet wired) |
| `src/services/pedagogyEngine.ts` | Central pedagogy orchestrator |
| `src/data/mockGameData.ts` | Mock tree/path data — garden trees still use this; will be replaced by Task G |
| `App.tsx` | Main app — game loop wiring lives here |

---

## Deprecated Docs

These docs are kept for reference but are superseded:

| Doc | Why Deprecated |
|-----|---------------|
| `task-1-1-5-garden-world-basic.md` | Superseded by Three.js approach |
| `task-1-1-17-oss-assets DEPRECATED.md` | Already marked deprecated |
| `task-1-1-19-garden-architecture-fix.md` | Implemented via fix steps |
| `task-1-1-20-tree-renderer-integration.md` | Done in Step 1 |
| `task-1-1-21-path-node-visualization.md` | Done in Steps 1–2 |
| `task-1-1-22-garden-dev-sandbox.md` | FlowTestHarness/TreeRendererTestHarness serve this purpose |
| `CLINE_GAME_IMPLEMENTATION.md` | References PixiJS (we use Three.js) |
| `GARDEN_THREE_IMPLEMENTATION.md` | Partially accurate but superseded by actual implementation |
| `docs/FIX-STEPS/step-6-shop-fix.md` | Completed — see task doc `task-A-shop-categories.md` |
