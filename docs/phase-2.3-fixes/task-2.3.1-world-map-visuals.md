# Task 2.3.1: World Map Visual Fixes

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

Fix two world map rendering issues: (1) the isometric garden world looks like a floating diamond island because the terrain outside the fence is too thin or non-existent, and (2) a stray grey blob UI artefact is stuck at the top-right corner of the world map screen.

## Bugs Addressed

- **Bug 1:** World map shows a tiny sliver of ground outside the fence. The intention is a full, rich world visible beyond the fence — the garden should feel embedded in a landscape, not floating in blue sky.
- **Bug 16:** A grey blob (likely a mispositioned cloud, UI element, or stale render artefact) appears at the top-right of the world map. It does not belong there.

## What Needs to Be Built

### Bug 1 — Extend the world terrain

The isometric scene in `src/components/world/WorldMapView.tsx` (and its associated Three.js renderer) renders the garden tile grid with a fence around the perimeter. Outside the fence, the background is a flat blue/sky colour and barely any ground is visible, creating a floating-island effect.

The fix should either:
- **Extend the ground plane** significantly beyond the fence boundary so a large swath of terrain is visible in all four isometric compass directions
- **Or add decorative world elements** (hills, distant trees, rivers, pathways) outside the fence to imply a wider world — consistent with the "LingoFriends world map" design language

The world *outside* the fence is the unplayable but visually rich wider world. The fence marks the player's current garden boundary. The view should feel like a bird's-eye view of a small garden plot within a bigger world.

**Suggested approach:**
- Increase the outer ground plane radius (currently likely 1–2 tiles beyond fence) to 8–12 tiles minimum in all directions
- Apply a slightly different ground texture or colour outside the fence to distinguish it from the player's garden
- Optionally add a few decorative static props (distant trees, roads, clouds at horizon) to world-dress the area outside the fence

### Bug 16 — Remove grey blob artefact

The grey blob at the top-right likely originates from one of:
- A cloud/decoration component that is positioned relative to a wrong parent or has incorrect CSS `position: absolute` coordinates
- A Three.js object or canvas overlay that is clipping or rendering outside its intended bounds
- A UI element (tooltip, badge, notification icon) that has lost its anchor

**Approach:**
1. Inspect `src/components/world/WorldMapView.tsx` and `src/renderer/` files for any cloud, decoration, or overlay element that renders in the top-right area
2. Search for any element that may be positioned with `top-0 right-0` or similar in the world map context
3. Remove or fix the offending element

## Files to Investigate / Modify

- `src/components/world/WorldMapView.tsx` — main world map component
- `src/renderer/` — Three.js renderer files (likely `GardenRenderer.ts` or similar)
- Any CSS / Tailwind classes on world map wrapper elements
- Check `src/components/navigation/AppHeader.tsx` — the blob may be a header element leaking into the canvas area

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Terrain extension approach | Larger ground plane vs. decorative world props | Both: extend plane + add a few distant props |
| Terrain colour outside fence | Same green, slightly yellower, or patchwork | Slightly different to show it's "outside" |
| Grey blob fix | Remove element, fix positioning, or clip to bounds | Identify and remove; do not mask with overflow:hidden |

## Testing

- [ ] World map renders with visible terrain beyond all four fence sides
- [ ] The terrain outside the fence extends at least 6 tile-widths in each direction
- [ ] No floating island effect — the garden feels embedded in the world
- [ ] Top-right grey blob is completely gone
- [ ] No other rendering artefacts introduced
- [ ] Renders correctly on both desktop and mobile viewport sizes

**Test scenarios:**
1. Load world map fresh — verify terrain extends beyond fence, no grey blob
2. Resize browser window — verify terrain proportions hold
3. Scroll/pan the world map if supported — verify no clipping artefacts appear

## Confidence Scoring

### Requirements to Meet
- [ ] Terrain visible and substantial outside the fence
- [ ] Garden looks embedded, not floating
- [ ] Grey blob removed
- [ ] No new artefacts introduced

### Concerns
- [ ] Three.js scene resizing may require recalculating the camera frustum or ground plane scale
- [ ] Adding too many world props outside the fence could impact performance on low-end mobile

### Deferred
- [ ] Animated world outside fence (wind effects, wandering NPCs in the distance) → Phase 3

## Notes for Future Tasks

The "wider world" outside the fence is thematically important — eventually each language might have a distinct biome visible in the distance (German = Alpine, French = Provençal countryside, etc.). Keep the outer terrain system extensible.

## Learnings

TBD after implementation.
