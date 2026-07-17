# Phase 3: The Fun Phase — Master Task Plan

**Created:** 17 July 2026
**Origin:** Playtest audit (July 2026) — app is technically healthy (1,020 tests green, 0 type errors) but the game loops are half-finished and the aesthetics undermine everything.
**Goal:** Turn LingoFriends from "a lesson engine with a green rectangle" into a charming 2D world kids want to return to.
**Total Estimated Time:** 60–85 hours across 6 tasks

---

## Locked Decisions (17 July 2026, with Richard)

These were decided after playtesting. Do NOT re-litigate them mid-task.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Art direction | **2D top-down tile world.** Three.js garden and procedural avatars are removed entirely. | Procedural 3D produced "embarrassing" results twice (V1 and V2). 2D sprite/tile art with quality asset packs reaches charm immediately and AI assistants handle it far better. |
| World structure | **Full shared world.** Every user's fenced plot exists in one persistent world; friends' plots are adjacent and visitable; live presence is the end state. | "You have your plot of land, friends take up other plots, and you can go visit." Built in three playable stages (see TASK-FUN-04) so there is never a broken intermediate state. |
| Asset source | **Free asset packs** (LPC character sprites, Kenney UI/tiles, OpenGameArt/itch.io CC0). | Instant professional baseline, consistent style, walk cycles and layered clothing that map directly onto the existing avatar customiser. |
| Lesson theatre | **Avatar vs NPC face-off throughout each lesson, boss NPC at the end.** | Richard's original vision. Gives lessons stakes and a visible opponent; reuses hearts/SunDrops as battle feedback. |

---

## The Playtest Findings (what this phase fixes)

1. **The garden is an empty green rectangle.** New users spawn as a lone avatar on a flat colour with an invisible-until-zoom fence. No trees visible, no plants, no landmarks, no reason to be there.
2. **SunDrops buy nothing.** The economy has an earn side and no spend side. No shop, no decorations, no placement.
3. **The 3D aesthetic is embarrassing** (Richard's word). Avatars especially. This kills the app's credibility with kids before pedagogy even gets a chance.
4. **Lesson bug — resubmit window:** after a correct answer the activity resets and stays interactive behind the reward modal, tempting a resubmit.
5. **Lesson bug — "I'll type instead" dead-ends:** choosing text-only mode suppresses the mic but SpeakItActivity has no typed path, forcing a skip.
6. **Lessons have no theatre.** The NPC strip at the top (two tiny static figures) is decoration, not an encounter.

---

## Task Summary

| # | Task | Hours | Priority | What It Delivers |
|---|------|-------|----------|------------------|
| 01 | Lesson UX Fixes | 4–6h | 🔴 Critical, do first | Kills the resubmit window and the type-instead dead end. Independent of everything else. |
| 02 | 2D Engine Foundation | 12–16h | 🔴 Critical | Phaser 3 renderer inside SvelteKit, tile map loader, LPC avatar compositing from existing customiser options, input (WASD/tap/D-pad). Removes Three.js. |
| 03 | The Home Plot | 12–16h | 🔴 Critical | Your fenced plot, pre-populated with wild flora/paths/house, learning trees as sprites with growth stages, tap-tree → lesson panel, post-lesson growth celebration. |
| 04 | Shared World & Visiting | 14–20h | 🟠 High | World grid of plots, friends' plots rendered from DB, walk-over visiting, presence in 3 stages (static → polled → live). |
| 05 | NPC Encounters & Boss Battles | 12–16h | 🟠 High | Random sprite NPC per lesson, face-off scene, NPC "health" driven by correct answers, boss NPC finale with celebration. |
| 06 | Shop & Decorations | 10–12h | 🟠 High | Spend SunDrops on tiles/props/furniture, placement mode in your plot. Closes the economy loop. |

---

## Recommended Execution Order

```
TASK-FUN-01 (Lesson UX fixes)        ← ship immediately, nothing depends on it
        │
TASK-FUN-02 (2D Engine Foundation)   ← everything visual depends on this
        │
TASK-FUN-03 (Home Plot)              ← first "wow" moment
        ├──→ TASK-FUN-06 (Shop & Decorations)   ← needs a plot to decorate
        └──→ TASK-FUN-04 (Shared World)          ← needs a plot to multiply
TASK-FUN-05 (NPC Battles)            ← needs TASK-02 sprites only; can run parallel to 03/04
```

**Why this order:** 01 is a bug fix kids hit today. 02 is the foundation everything renders on. 03 makes the single-player experience good before we multiply it (04) or monetise attention (06). 05 only needs the sprite pipeline, so it can be parallelised if two work streams exist.

---

## What Gets Deleted

- `src/lib/three/` — entire directory (GardenScene, TreeFactory, AvatarBuilder, NPCScene, GardenCanvas)
- `@types/three` + `three` from package.json
- Three.js-specific tests (`avatarBuilder.test.ts`, parts of `gardenService.test.ts` that assert 3D specifics)

Garden *data* (user_trees, gardenService, tree health/SRS sync) is kept — only rendering changes.

---

## DB Schema Changes (cumulative across tasks)

```
plots            — world position per user: (user_id, world_x, world_y, claimed_at)
garden_items     — placed decorations: (user_id, item_id, tile_x, tile_y, placed_at)
shop_items       — catalogue: (id, name, category, price_sundrops, sprite_key, min_level?)
presence         — ephemeral positions for live stage (or in-memory map, see TASK-FUN-04)
profiles         += sprite_config jsonb (LPC layer selection derived from avatar options)
```

---

## Asset Pack Shortlist (verify licences before committing files)

| Need | Pack | Licence notes |
|------|------|---------------|
| Character sprites (walk cycles, skin tones, hair, hats, clothes — matches our customiser) | **LPC (Liberated Pixel Cup) generator layers** | CC-BY-SA / GPL dual — attribution file required in repo, fine for a free app |
| Terrain tiles, fences, plants, farm props | LPC terrain + **Kenney** pixel packs | Kenney is CC0 (no attribution needed) |
| UI (buttons, panels, icons) | Kenney UI packs | CC0 |
| NPC/boss monsters | LPC monsters, OpenGameArt CC0 sets | Check per-asset |

Rule: every imported asset gets a line in `static/assets/CREDITS.md` with source URL and licence.

---

## Success Criteria for the Phase

1. A new user's first sight of their plot makes them smile — flora, a house, their sprite avatar, visible learning trees.
2. Completing a lesson visibly grows a tree with a celebration the kid watches.
3. SunDrops can be spent, and the purchased item is visible in the world immediately.
4. A friend's plot can be visited and looks like *theirs*.
5. Lessons feel like an encounter: an NPC opponent reacts to right/wrong answers, and a boss closes the lesson.
6. Zero Three.js code remains; `npm run check` and full test suite stay green.
7. Playtest with actual kids at the end of the phase — their reaction is the real acceptance test.

---

## Risks

1. **Scope spiral on the shared world.** Mitigated by the 3-stage structure in TASK-FUN-04 — each stage ships playable.
2. **Asset licence contamination.** CC-BY-SA requires attribution; GPL-only art must be avoided if we ever close-source assets. Keep CREDITS.md current.
3. **Phaser × SvelteKit SSR.** Phaser must be client-only (`onMount` dynamic import). TASK-FUN-02 establishes the pattern once; all later tasks reuse it.
4. **Sprite consistency.** Mixing packs with different pixel densities looks bad. Pick one base tile size (16px recommended, scaled ×3) in TASK-FUN-02 and enforce it.
