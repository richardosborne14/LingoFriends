# TASK-FUN-02: 2D Engine Foundation — Phaser, Tiles, Sprite Avatars

**Status:** ✅ Complete
**Completed:** 18 July 2026
**Confidence:** 9/10
**Actual Time:** ~1 session (estimated: 12–16h)
**Priority:** 🔴 Critical — every visual task builds on this
**Dependencies:** None (TASK-FUN-01 can land first or in parallel)
**Decision Reference:** Master plan locked decisions — 2D tile world, free asset packs

---

## ✅ Completion Summary

### What Was Built

Phaser 3.90 runs client-only inside `WorldCanvas.svelte` (dynamic import in
onMount — SSR never sees Phaser). The garden page renders a fenced grass plot
(LPC terrain atlas tilemap with fence collision), learning-tree sprites driven
by TreeData (growth stage → sapling/young/mature frame, health → green/pale/dead
sheet), and a composited LPC avatar that walks in 4 directions via WASD/arrows
and tap-to-walk. Tree taps open the existing TreePanel. Three.js is fully
removed — the lesson EncounterScene banner was rebuilt as a sprite face-off
using the same compositing pipeline (kid sees the SAME character in lessons
and garden; NPC look derived deterministically from NPCConfig).

`src/lib/world/`: WorldCanvas.svelte, EventBus.ts (typed, per-instance),
game.ts, scenes/{BootScene,PlotScene}.ts, sprites/{lpcLayers,compositor,AvatarSprite}.ts,
assets.ts (single manifest: paths, tile indices, LPC frame geometry).
Assets: `static/assets/{characters,tiles,props}/` + CREDITS.md (48 PNGs, ~4MB).

### Decisions Made (deviations & clarifications)

| Decision | Choice | Why |
|----------|--------|-----|
| Tile size | **32px base, ×2 zoom** (doc said 16px ×3) | LPC terrain ships on a 32px grid; LPC 64px characters are proportioned for it (~1.5 tiles tall). 16px would force non-LPC tiles that clash with the characters. Same on-screen chunkiness. |
| Body type | **LPC teen body for all genders** | Kid-appropriate proportions; best clothing support (t-shirt supports teen+female only, not adult male). |
| Head | **Separate head layer** (male/female × 6 skins) | Modern LPC bodies are HEADLESS — body sheets contain only torso/limbs. Found via browser testing (decapitated avatar). Draw order: body → shirt → head → hair → hat. |
| Colour mapping | Nearest authored LPC palette variant (per task doc) | Documented in lpcLayers.ts tables; NPC hexes snap via RGB distance. |
| Hats | cap→feather cap, beanie→knit bobble hat, headband→thick yellow band, legacy crown→gold crown | No baseball cap/beanie exists in LPC for teen; these read correctly at 64px and match the customiser emoji. |
| Terrain authoring | Data-array tilemap (no Tiled yet) | Placeholder plot is a uniform field + perimeter. Tiled JSON pipeline lands with TASK-FUN-03's hand-authored plot. |
| Compositing | Walk band only (832×256), cached by recipe key | Rows 8–11 identical across both LPC sheet layouts (classic 1344px / expanded 2944px); tiny textures; extend band list when TASK-FUN-05 needs hurt/emote anims. |
| EncounterScene | Sprite `<img>` + CSS animation, NOT a second Phaser instance | It's UI chrome; same props contract (userAvatar, npcConfig, isSpeaking); TASK-FUN-05 replaces it with the real battle theatre. |

### Tests

- 33 world tests written (lpcLayers 13, EventBus 9, assets manifest 11); suite: **1034/1034 green**, `npm run check` 0 errors
- The load-bearing test: all 4,320 customiser combinations resolve to layer files that exist on disk
- Browser verification: ✅ Pass — 2 fresh accounts (girl/brown/purple/teal/headband; boy/light/black/red/cap) composite correctly, walk with keys + tap, tree tap opens TreePanel, garden→lesson→garden reboots cleanly, 0 console errors; lesson EncounterScene shows avatar vs NPC sprites

### Notes for Future Tasks

- **Always include the head layer** when compositing any LPC character (body sheets are headless)
- Tile indices for the terrain atlas are in `assets.ts` (grass 737, dirt 713, fence 589/590) — verified visually; add new ones there + test
- Registry (`trees`, `avatarOptions`, `bus`) is the Svelte→Phaser data path; EventBus is Phaser→Svelte only
- `positionX/Y` on user_trees is legacy 3D metres; PlotScene maps 1m→1 tile around plot centre and spreads stacked (0,0) trees rightward — TASK-FUN-03 should assign real tile positions
- Onboarding drive scripts: interests step needs 3 picks; option-card buttons include disabled "coming soon" languages (use :enabled)

---

---

## Mandatory Reads

1. `.clinerules` (always)
2. `TASK-FUN-00-MASTER-PLAN.md` — locked decisions, asset shortlist, deletion list
3. `src/lib/three/` — the code being replaced (understand its public surface: `GardenCanvas.svelte` props/events are the contract the garden page expects)
4. `src/routes/(auth)/onboarding/+page.server.ts` + `StepAvatar.svelte` — existing avatar options (type, skin tone, hair colour, shirt colour, hat) that must map onto sprite layers
5. `src/lib/types/garden.ts` — TreeData/AvatarOptions types (keep the data contracts, change the rendering)

---

## Problem

The Three.js garden renders procedural geometry that looks amateurish and has no path to charm. We are replacing the rendering layer with a 2D tile/sprite engine while keeping all data contracts (trees, avatar options, stats) intact.

---

## Goals

1. Phaser 3 running client-only inside a Svelte component, replacing `GardenCanvas.svelte` with the same props/events contract (`trees`, `avatarOptions`, `treeSelected` event) so the garden page barely changes.
2. Tile map pipeline: maps authored in **Tiled** (free editor), exported JSON, loaded by Phaser. One base tile size: **16px, rendered at 3× zoom** (crisp with `pixelArt: true`).
3. LPC avatar compositing: existing customiser choices (boy/girl/either, 6 skin tones, 6 hair colours, 8 shirt colours, 4 hats) map to layered LPC spritesheets composited at runtime into one animated character with 4-direction walk cycles.
4. Input: WASD/arrows on desktop, tap-to-walk on touch (pathless straight-line walk is fine for now), on-screen D-pad optional fallback.
5. Asset pipeline conventions: `static/assets/{tiles,characters,props,ui}/`, `CREDITS.md` with licence per pack.
6. Three.js fully removed; dependencies cleaned; tests migrated.

---

## Key Decisions (made here, reused by all later tasks)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Engine | **Phaser 3** (not Pixi, not raw canvas) | Tilemaps, sprite animation, camera, arcade physics and input come built-in; enormous documentation corpus means AI assistants generate correct code; Tiled JSON support is first-class. |
| Integration | Dynamic `import('phaser')` inside `onMount` in a single `WorldCanvas.svelte`; game instance destroyed in `onDestroy` | Phaser touches `window` at import time — must never run during SSR. One wrapper, one pattern, reused everywhere. |
| Svelte ↔ Phaser bridge | A typed `EventBus` (mitt or a 20-line emitter): Svelte → Phaser via registry methods, Phaser → Svelte via events (`tree-selected`, `npc-reached`, `plot-entered`) | Keeps UI (panels, modals, HUD) in Svelte where it belongs; Phaser only renders the world. |
| Avatar rendering | Composite LPC layers to a single texture per avatar at load time (draw layers to an offscreen canvas → `textures.addCanvas`) | One draw call per character; recolouring (hair/shirt tint) done once at composite time, not per frame. |
| Tile size | 16px base, ×3 zoom | Matches LPC/Kenney pixel density; ×3 gives the cosy chunky look of the reference screenshot. |

---

## Implementation Steps

### Step 1 — Install & scaffold
`npm i phaser`. Create `src/lib/world/` (new home, parallel to soon-dead `three/`):
```
src/lib/world/
├── WorldCanvas.svelte      — mount/destroy wrapper, props in, events out
├── EventBus.ts             — typed emitter shared by Svelte and Phaser
├── scenes/BootScene.ts     — asset loading + loading bar
├── scenes/PlotScene.ts     — placeholder green field w/ walkable avatar (proves the stack)
├── sprites/AvatarSprite.ts — LPC compositing + walk animation registration
└── assets.ts               — manifest: keys → file paths (single source of truth)
```

### Step 2 — Asset import
Download LPC character base + hair + clothing + hat layers (all skin tones), one LPC/Kenney terrain set (grass, dirt path, water edge, fence), a props sheet (bushes, rocks, flowers, house). Normalise into `static/assets/`, write `CREDITS.md`. Verify every sheet is 16px-grid (LPC characters are 64×64 frames — that's fine, they stand ~1.5 tiles tall, standard for LPC worlds).

### Step 3 — Avatar compositing
`buildAvatarTexture(options: AvatarOptions): Promise<string>` — draws base(skin tone) → clothes(tinted shirt colour) → hair(tinted hair colour) → hat onto an offscreen canvas per animation frame grid, registers as a Phaser texture, returns the key. Register `walk-{up,down,left,right}` + `idle-{dir}` animations from the LPC universal frame layout. Colour tinting: LPC layers ship in limited palettes — prefer selecting the nearest palette variant over runtime hue-shift; document the mapping from our 6 hair/8 shirt colours to LPC variants.

### Step 4 — Movement & camera
Arcade physics body on the avatar; WASD/arrows velocity movement with directional animation switching; tap/click sets a walk target (straight line, stop on arrival or collision). Camera follows avatar, bounded to map, `roundPixels: true`.

### Step 5 — Contract migration & Three.js removal
Point `garden/+page.svelte` at `WorldCanvas` (props unchanged; `PlotScene` consumes `trees` even if it renders simple placeholder sprites — real plot visuals are TASK-FUN-03). Delete `src/lib/three/`, remove `three` + `@types/three`, delete/rewrite 3D-specific tests. `npm run check` green.

---

## Testing

- [ ] Unit: avatar option → LPC layer mapping (every combination resolves to real files)
- [ ] Unit: EventBus typing round-trip; assets manifest paths exist (fs check in test)
- [ ] Manual: create two accounts with different avatar options — both composite correctly, walk with keys and tap
- [ ] Manual: navigate garden → lesson → back 5× — no leaked Phaser instances (check `game.destroy` runs; watch heap)
- [ ] `npm run check` + full suite green with Three.js gone

## Acceptance Criteria

1. The garden route renders a Phaser world with your composited sprite avatar walking in 4 directions.
2. Avatar faithfully reflects all onboarding customiser choices.
3. No Three.js anywhere in the dependency tree.
4. `CREDITS.md` lists every asset pack with source and licence.

## Files

**Create:** `src/lib/world/**` (above), `static/assets/**`, `static/assets/CREDITS.md`
**Modify:** `src/routes/(app)/garden/+page.svelte`, `package.json`, `src/lib/types/garden.ts` (add `spriteConfig` if needed)
**Delete:** `src/lib/three/**`, `src/tests/garden/avatarBuilder.test.ts` (replace with compositing tests)
