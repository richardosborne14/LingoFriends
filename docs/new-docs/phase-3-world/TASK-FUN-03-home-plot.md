# TASK-FUN-03: The Home Plot — A Garden Worth Coming Home To

**Status:** 🔲 Not started
**Priority:** 🔴 Critical — the first-impression fix
**Estimated Time:** 12–16 hours
**Dependencies:** TASK-FUN-02 (2D engine, avatar sprite)
**Playtest Finding:** #1 — "you're a weird looking avatar in an empty green space… the initial garden shouldn't be blank"

---

## Mandatory Reads

1. `.clinerules` (always)
2. `TASK-FUN-00-MASTER-PLAN.md` — locked decisions
3. `src/lib/server/garden/gardenService.ts` — tree data, health, SRS decay (data layer is KEPT)
4. `src/lib/components/garden/TreePanel.svelte` — bottom sheet contract (kept, restyled only if time allows)
5. `docs/legacy-docs/phase-1.1/GAME_DESIGN.md` — the original garden vision (tone reference)

---

## Problem

A new user spawns as a lone figure on a flat green field. The fence is off-screen, trees may not exist yet, and there is nothing wild, ambient, or personal. The "emotional home" — the app's core retention concept — reads as an empty lot.

---

## Goals

1. Every plot is born furnished: authored base map with terrain variety (grass tones, dirt path, pond corner), perimeter fence with a gate, a small house, wild flora (bushes, flowers, rocks, stumps), and 2–3 ambient critters (rabbit/butterfly/bird wander loops).
2. Learning trees are the visual heroes: sprite trees with **5 growth stages** (seed → sprout → sapling → healthy → blooming) driven by existing tree health/SRS data, planted at authored anchor spots.
3. Wilting is visible and legible: low-health trees droop/brown (stage art, not a filter) with a "💧 needs water" hover puff — pulls kids into the existing review flow instead of pushing.
4. Tap a tree → existing TreePanel opens (contract unchanged).
5. **The growth moment:** returning from a completed lesson, the camera pans to the lesson's tree, it grows to its new stage with a bounce + sparkle + sound, SunDrops fly to the counter. This is the payoff loop the app has never had.
6. First-arrival micro-tutorial: NPC guide sprite at the gate walks you to your first tree (3 short speech bubbles max, skippable).

---

## Implementation Steps

### Step 1 — Author the base plot map (Tiled)
One `plot-base.json` (~30×22 tiles): layers `ground`, `paths`, `flora`, `collision`, plus object layers `tree-anchors` (8–10 positions), `house`, `spawn`, `gate`, `critter-zones`. Authored once, shared by all users — personalisation comes from trees + (TASK-FUN-06) decorations rendered on top.

### Step 2 — TreeSprite with growth stages
`sprites/TreeSprite.ts`: maps `TreeData.health`/stage to one of 5 textures (reuse the tiered thresholds pattern from LEARNINGS.md 2026-02-15). Wilted = dedicated droopy art for stages when `health < 31`. Interactive (tap → `tree-selected` on the EventBus). Trees occupy anchors in creation order.

### Step 3 — Ambient life
Port V1's random-walk critter state machine (`_v1_reference/src/renderer/objects/animals.ts` — idle/walk/pause with bounds) to Phaser sprites in ~60 lines. 2–3 critters per plot, chosen deterministically from user id so *your* garden has *your* animals.

### Step 4 — The growth moment
Lesson completion already invalidates garden data on return. Add: completion API response includes `treeId` + `previousStage` + `newStage`; garden page passes a `celebrate` param via the EventBus; `PlotScene` pans camera → plays grow tween (scale-up bounce + particle sparkle + `soundService` chime) → emits `celebration-done` → Svelte shows the SunDrop tally toast. If stage didn't change, play a smaller leaf-shimmer so completion is *always* acknowledged in-world.

### Step 5 — Arrival tutorial
`hasSeenGardenIntro` flag on profile. Guide NPC (distinct LPC character) at the gate: bubble 1 "This is YOUR garden!", walks to first tree, bubble 2 "Tap a tree to learn — lessons make it grow!", bubble 3 "Earn SunDrops 🌞 to decorate!" then waves and exits through the gate. Skippable with one tap. Speech bubbles are Svelte overlays positioned via EventBus coordinates (keep text out of canvas for i18n).

---

## Testing

- [ ] Unit: health → stage mapping incl. wilt thresholds; critter selection deterministic per user
- [ ] Unit: completion payload carries stage transition
- [ ] Manual: fresh account → furnished plot, tutorial runs once, first tree reachable
- [ ] Manual: complete a lesson → camera pan + growth celebration → tally toast
- [ ] Manual: artificially age a tree (SQL) → wilted art + water flow still works
- [ ] Suite green

## Acceptance Criteria

1. A brand-new user's plot contains ≥ 15 visible non-tree elements and feels *placed*, not random.
2. Tree growth stages are readable at a glance from across the plot.
3. The post-lesson growth moment plays end-to-end in < 4 seconds and can't be missed.
4. Tutorial shows exactly once, is skippable, and is fully i18n'd (en + fr).

## Files

**Create:** `static/maps/plot-base.json`, `src/lib/world/scenes/PlotScene.ts` (real version), `src/lib/world/sprites/TreeSprite.ts`, `src/lib/world/sprites/CritterSprite.ts`, `src/lib/world/tutorial.ts`
**Modify:** `src/routes/(app)/garden/+page.svelte` (+server for `hasSeenGardenIntro`), `src/routes/api/lessons/[lessonId]/complete/+server.ts` (stage transition in response), `src/lib/i18n/{en,fr}.json`, `src/lib/server/db/schema.ts` (profile flag)
