# LingoFriends — Master Plan

> **This is the single source of truth for what needs to be done.**
> All old phase overview docs are now secondary references. If anything contradicts this document, this document wins.

**Last updated:** 2026-02-16

---

## How This Project Is Organised

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Foundation (auth, DB, AI swap, design system, onboarding) | ✅ COMPLETE |
| **Phase 1.1** | Game-based learning redesign (garden, lessons, activities) | 🔶 PARTIALLY COMPLETE — see below |
| **Phase 1.2** | Pedagogy engine (adaptive learning, chunk system, SRS) | 🔶 PARTIALLY COMPLETE — see below |
| **Phase 2** | Social features, friends, multiplayer | 🔲 NOT STARTED |
| **Phase 3** | Advanced content, more languages | 🔲 NOT STARTED |

---

## The Problem Right Now

The 3D garden world and the game mechanics are **two completely separate systems that don't talk to each other**. Specifically:

1. `GardenRenderer` renders cosmetic shop decorations only
2. `learningTrees.ts` has working code to build 3D learning trees — but it's never called
3. `GardenContext`/`useGarden` manages `UserTree[]` game state — but the 3D scene never sees it
4. You can't click a tree in the 3D world to start a lesson
5. The atmosphere (evening sky, stars, moon, fence) from the GardenV2.jsx reference was never implemented
6. The shop uses the wrong currency (SunDrops instead of Gems)
7. The dev sandboxes (FlowTestHarness, DevTestHarness) prove the concepts work in isolation but nothing made it into the real app

**Bottom line:** The game loop `garden → click tree → path → lesson → rewards → back to garden` is broken at step 1.

---

## What's Actually Done

### Phase 1 — ✅ ALL COMPLETE
All 12 tasks done. Auth, Pocketbase, Groq AI, design system, onboarding, profile. No action needed.

### Phase 1.1 — What's Done vs What's Not

| Task | Name | Status | Notes |
|------|------|--------|-------|
| 1.1.1 | Type definitions & SunDrop service | ✅ Done | |
| 1.1.2 | Activity components (6 types) | ✅ Done | |
| 1.1.3 | Lesson view container | ✅ Done | |
| 1.1.4 | Path view (lesson select) | ✅ Done | |
| 1.1.5 | Garden world basic (2D placeholder) | ⚠️ SUPERSEDED | Replaced by Three.js approach |
| 1.1.6 | App navigation | ✅ Done | Garden→Path→Lesson routing works |
| 1.1.7 | Pocketbase game schema | ✅ Done | Collections created |
| 1.1.8 | Garden state (useGarden) | ✅ Done | But not connected to 3D |
| 1.1.9 | AI lesson generator v1 | ✅ Done | Superseded by 1.2 pedagogy engine |
| 1.1.10 | Tree health & decay | ✅ Done | Service exists, not shown in 3D |
| 1.1.11 | Gift system | ✅ Done | Service + UI components |
| 1.1.12 | Decoration system | ⚠️ PARTIAL | Types exist, wrong currency model |
| 1.1.13 | Seed earning | ✅ Done | Service exists |
| 1.1.14 | Three.js garden renderer | ⚠️ PARTIAL | Renders decorations only, not learning trees |
| 1.1.15 | Mobile polish | 🔲 Not started | |
| 1.1.16 | Tutorial & testing | 🔲 Not started | |
| 1.1.17 | Garden shop UI | ⚠️ PARTIAL | Works but wrong currency |
| 1.1.18 | Avatar customization | ✅ Done | But avatar looks "silly" - needs polish |
| 1.1.19 | Architecture correction | 🔲 NOT DONE | Doc written, code never changed |
| 1.1.20 | Tree→renderer integration | 🔲 NOT DONE | THE critical missing piece |
| 1.1.21 | Path node visualization | 🔲 NOT DONE | |
| 1.1.22 | Garden dev sandbox | ⚠️ PARTIAL | FlowTestHarness works standalone |

### Phase 1.2 — What's Done vs What's Not

| Task | Name | Status | Notes |
|------|------|--------|-------|
| 1.2.1 | Learner model schema | ✅ Done | |
| 1.2.2 | Chunk content design | ✅ Done | |
| 1.2.3 | Chunk generation service | ✅ Done | |
| 1.2.4 | Learner profile service | ✅ Done | |
| 1.2.5 | Pedagogy engine core | ✅ Done | |
| 1.2.6 | Difficulty calibration | ✅ Done | |
| 1.2.7 | Affective filter monitor | ✅ Done | |
| 1.2.8 | Lesson generator v2 | ✅ Done | |
| 1.2.9 | Dynamic paths | 🔲 Not started | Independent of garden fix |
| 1.2.10 | Chunk SRS | 🔲 Not started | Independent of garden fix |
| 1.2.11 | System prompts | 🔲 Not started | Independent of garden fix |
| 1.2.12 | Integration testing | 🔲 Not started | Needs garden working |

---

## The Fix — Step by Step

These are the remaining tasks in priority order. Complete them top to bottom.

### Step 1: Connect Learning Trees to the 3D Renderer
**File:** `docs/FIX-STEPS/step-1-tree-renderer-bridge.md`
**Priority:** 🔴 CRITICAL — Everything else depends on this

Make `GardenRenderer` able to show `UserTree` objects as 3D learning trees. The `makeLearningTree()` function in `src/renderer/objects/learningTrees.ts` already builds beautiful 15-stage growth trees. It just needs to be called by the renderer.

### Step 2: Wire the Full Game Loop in App.tsx
**File:** `docs/FIX-STEPS/step-2-game-loop-wiring.md`
**Priority:** 🔴 CRITICAL

Connect: `GardenWorld3D` ← `UserTree[]` data → `onTreeClick` → `PathView` → `LessonView` → rewards → back. All the pieces exist, they just aren't plugged together.

### Step 3: Garden Atmosphere (Match GardenV2.jsx)
**File:** `docs/FIX-STEPS/step-3-garden-atmosphere.md`
**Priority:** 🟡 HIGH

The reference `GardenV2.jsx` has an evening/night theme with stars, moon, fog, fence, checkered tiles, and dirt paths. The current renderer has none of this. Copy the atmosphere directly from GardenV2.jsx.

### Step 4: Fix Currency Model
**File:** `docs/FIX-STEPS/step-4-currency-fix.md`
**Priority:** 🟡 HIGH

- SunDrops: per-tree, earned from lessons for that skill path
- Gems: global currency, earned as bonus rewards, spent in shop
- Seeds: earned from pathway milestones, used to plant new learning trees

### Step 5: Avatar Polish
**File:** `docs/FIX-STEPS/step-5-avatar-polish.md`
**Priority:** 🟢 MEDIUM

Improve AvatarBuilder proportions and appearance.

### Step 6: Shop Currency & Categories
**File:** `docs/FIX-STEPS/step-6-shop-fix.md`
**Priority:** 🟢 MEDIUM

Update ShopPanel to use Gems, add proper categories (decorations, decoration trees, tree care items).

### Step 7: Mobile Polish
**File:** `docs/FIX-STEPS/step-7-mobile-polish.md`
**Priority:** 🟢 MEDIUM

Touch controls, responsive layout, performance on mobile.

### Step 8: Phase 1.2 Remaining Tasks
**File:** See `docs/phase-1.2/` individual task docs
**Priority:** 🟡 HIGH (independent of garden)

Tasks 1.2.9 (dynamic paths), 1.2.10 (chunk SRS), 1.2.11 (system prompts) can be done in parallel with garden fixes. Task 1.2.12 (integration testing) needs the garden working.

---

## Key Reference Files

| File | What It Is |
|------|-----------|
| `docs/phase-1.1/GardenV2.jsx` | Visual reference — THE spec for how the garden should look |
| `docs/phase-1.1/GAME_DESIGN.md` | Source of truth for all game mechanics |
| `src/renderer/objects/learningTrees.ts` | Already-built 15-stage tree growth code |
| `src/components/dev/FlowTestHarness.tsx` | Proof the full loop works (standalone) |
| `src/renderer/GardenRenderer.ts` | The renderer that needs learning tree support added |
| `src/components/garden/GardenWorld3D.tsx` | React wrapper that needs UserTree props added |

---

## Deprecated Docs

These docs are marked deprecated because they've been superseded or are misleading:

| Doc | Why Deprecated |
|-----|---------------|
| `task-1-1-5-garden-world-basic.md` | Superseded by Three.js approach (task 1.1.14) |
| `task-1-1-17-oss-assets DEPRECATED.md` | Already marked deprecated |
| `task-1-1-19-garden-architecture-fix.md` | Good concepts but never implemented; superseded by this master plan |
| `task-1-1-20-tree-renderer-integration.md` | Superseded by Step 1 in this plan |
| `task-1-1-21-path-node-visualization.md` | Superseded by Step 1 in this plan |
| `task-1-1-22-garden-dev-sandbox.md` | Superseded; FlowTestHarness already exists |
| `CLINE_GAME_IMPLEMENTATION.md` | References PixiJS (we use Three.js now) |
| `GARDEN_THREE_IMPLEMENTATION.md` | Partially accurate but missing "what's actually done" context |

See each individual doc for its deprecation notice.
