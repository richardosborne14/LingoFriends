# Task 2.3.13: Phase 2 Feature Integration Audit — Wire Up Missing World Objects

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

Multiple Phase 2 features were marked as "complete" in their task docs but are not visible or functional in the actual game. This includes the cabin on the world map, and potentially other objects/features. This task is an **integration audit**: find everything that was written but not wired up, and actually get it into the game.

## Bugs Addressed

- **Bug 19:** No cabin on the world map. Phase 2 task docs claim the cabin was completed, but it does not appear in the game. Object files likely exist in the renderer but are never instantiated in the world scene.
- **Systemic issue:** This may be a pattern — Phase 2 produced many new 3D object files, renderers, and components, but they were never connected to the actual garden/world rendering pipeline. Code was written and marked done without verifying it was visible in the game.

## Background — How This Happens

This is a classic integration gap. A developer can write a complete, well-structured component or renderer and mark the task "done" — but if the component is never imported and rendered by a parent, it exists in isolation. The files are real; the feature is not.

Common failure patterns:
1. **Object created but never added to scene** — A Three.js mesh for a cabin is built in `CabinRenderer.ts` but `createCabin()` is never called in the garden scene setup
2. **Component built but never mounted** — A React component like `<Cabin />` exists but is never included in `WorldMapView.tsx`
3. **Feature gated behind a flag** — An `ENABLE_CABIN` feature flag that was never set to `true` in production
4. **Positional issue** — The cabin renders but at coordinates that put it off-screen or underground

## What Needs to Be Built

### Step 1: Full Inventory of Phase 2 Claimed Features

Cross-reference the Phase 2 task docs against what's actually visible in the game. Create a checklist:

**From `docs/phase-2-world-expansion/phase-2.0-overview.md` (all marked ✅):**
- [ ] Cabin / player home on world map — **NOT visible** (confirmed)
- [ ] Garden world overhaul — partially visible (terrain exists but floating island issue)
- [ ] 3D avatar on lesson path — partially visible (avatar exists but has issues — see Task 2.3.10)
- [ ] NPC garden visitors — check if any NPCs appear in the garden
- [ ] World map prototype — exists but incomplete (floating island, grey blob)
- [ ] Sound system — exists in code but not wired (see Task 2.3.12)
- [ ] Tree-click UX — exists but broken (adjacent click bug — see Task 2.3.2)
- [ ] Avatar overhaul — exists but broken (uncanny face — see Task 2.3.10)
- [ ] Help system & AI coaching — exists but partially broken (see Tasks 2.3.3, 2.3.6)

### Step 2: Cabin Investigation

Search for all cabin-related code:

```bash
grep -r "cabin\|Cabin\|CABIN" src/ --include="*.ts" --include="*.tsx" -l
ls src/renderer/ | grep -i cabin
```

Expected findings:
- A `CabinRenderer.ts` or `CabinObject.ts` exists in `src/renderer/`
- It defines the cabin geometry, textures, positioning
- But it is never called from the world scene initialisation

**Fix:** Find where the world scene objects are initialised (likely in `GardenWorld3D.tsx` or the main garden renderer) and add the cabin instantiation there, at the correct world position (outside the player's fence, visible from the garden).

### Step 3: Systematic Object Audit

Run a broader audit of `src/renderer/` — list every file and check if each is actually used:

```bash
ls src/renderer/
# Then for each file, grep for its usage:
grep -r "CabinRenderer\|ShopRenderer\|NPCRenderer\|..." src/ --include="*.tsx" --include="*.ts"
```

Any renderer that has **zero usages** is a Phase 2 integration gap. Document each one.

### Step 4: World Scene Object Registration

The world scene likely has a centralised place where objects are added — an initialisation function or an object registry. Create or fix this:

```typescript
// In GardenWorld3D.tsx or the main renderer:
function initWorldObjects(scene: THREE.Scene, worldData: WorldData) {
  // Player's garden
  addGardenTiles(scene, worldData.garden);
  addFence(scene, worldData.garden);
  addGardenObjects(scene, worldData.gardenObjects); // trees, flowers, decorations
  
  // World outside fence
  addWorldTerrain(scene);
  addCabin(scene, CABIN_WORLD_POSITION);      // ← was this line missing?
  addNPCSpawnPoints(scene, worldData.npcs);   // ← was this missing?
  addDistantProps(scene);                     // ← trees, hills outside fence
}
```

### Step 5: Cabin Positioning

The cabin should be positioned:
- **Outside** the player's fence, visible from the garden view
- To one side (e.g., north-west in isometric terms, which is upper-left on screen)
- At a reasonable scale relative to the garden — not tiny, not overwhelming
- The cabin represents the player's "home base" / the LingoFriends HQ building

```typescript
const CABIN_WORLD_POSITION = new THREE.Vector3(-8, 0, -8); // outside fence, upper-left
```

## Files to Investigate

- `docs/phase-2-world-expansion/` — all task docs to build the feature inventory
- `src/renderer/` — full file listing, cross-reference against usage
- `src/components/world/WorldMapView.tsx` — what world objects are currently mounted?
- `src/components/garden/GardenWorld3D.tsx` — what scene objects are initialised?
- Any file named `*Cabin*`, `*NPC*`, `*Shop*`, `*Object*` in `src/renderer/`

## Integration Checklist Template

For each Phase 2 feature, verify:
- [ ] Code file exists
- [ ] Code compiles with no TypeScript errors  
- [ ] Component/function is imported somewhere
- [ ] Component/function is called during scene/component initialisation
- [ ] Feature is visible in the game on screen
- [ ] Feature works correctly (not just rendered)

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Cabin position | Fixed coords vs. driven by world data | Fixed for now — it's always in the same place |
| Other missing objects | Fix in this task vs. create sub-tasks | Fix simple ones (cabin, missing objects) here; complex features (NPCs, shop) get sub-tasks |
| Phase 2 "done" re-assessment | Re-open phase 2 tasks vs. document in 2.3 | Document in 2.3 with a retrospective note |

## Root Cause Retrospective

This is worth noting for future development hygiene:

> **A task is not done until it is visible in the running game.**

Going forward, every task that adds a visual feature must include a testing step that verifies:
1. The feature is visible in the actual running app (not just in a dev harness)
2. A screenshot or browser test confirms the feature renders correctly

The Phase 2 task docs had testing checklists, but they appear to have been marked complete without running the actual game to verify. The dev test harnesses in `src/components/dev/` are useful for isolated testing but do not substitute for integration testing in the full game.

## Testing

- [ ] Cabin is visible on the world map, outside the fence
- [ ] Cabin is at an appropriate scale and position
- [ ] Cabin does not overlap with the fence or garden objects
- [ ] At least 80% of Phase 2 "complete" features are confirmed visible in the running game
- [ ] Any object renderer that is unused is either wired up or explicitly removed
- [ ] No TypeScript import errors from newly-wired objects

**Test scenarios:**
1. Load world map — cabin visible in the background outside the fence ✓
2. Walk the avatar toward the fence — cabin visible in the far background ✓
3. Audit list: for each Phase 2 object, confirm visible in game ✓

## Confidence Scoring

### Requirements to Meet
- [ ] Cabin visible on world map
- [ ] Full inventory of Phase 2 features vs. what's actually wired up
- [ ] All renderer files are either used or explicitly noted as deferred

### Concerns
- [ ] The scope of unwired features may be larger than just the cabin — this audit could uncover many more integration gaps that need tracking
- [ ] Some Phase 2 features may have legitimate reasons for not being in the game yet (feature-flagged, incomplete data dependencies). These should be noted as "intentionally deferred" not "missing"

### Deferred
- [ ] Full NPC system (if Phase 2 NPC renderer exists but has data dependencies) → Phase 3 if complex
- [ ] Shop in-world object (if renderer exists) → Phase 3

## Notes for Future Tasks

**Quality Gate Addition:** Add to the phase completion checklist in `.clinerules`:
> Before marking any task complete that adds a visual/audio feature: open the running app and confirm the feature is visible/audible. Take a screenshot and note it in the task doc.

## Learnings

This sprint revealed a pattern of "paper complete" — tasks marked done where the code exists but isn't integrated. The fix is a culture/process change: demo the feature in the running app before closing a task. Add this to LEARNINGS.md.
