# Task 2.3.10: Avatar Redesign — Friendlier, Less Uncanny

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

Redesign the 3D/rendered player avatars to look friendly and approachable — not unsettling. Current issues: no mouths when not speaking (creating an uncanny blank face), large terrifying white-sclera eyes with small irises, and generally angular/blocky proportions that don't read as cute for a kids' app. New avatars should be endearing and fun.

## Bug Addressed

- **Bug 17:** The avatars (as shown in screenshots) are visually disturbing for a children's app:
  - **No mouth** when the character is not speaking — the face has only eyes, which looks deeply uncanny
  - **Terrifying eyes** — large white sclera, small dark irises, no eyelashes or eyebrow softness — they stare blankly
  - **Hair clipping issues** — hair geometry clips through the head in some views (the "bangs" band extends as a flat rectangle across the face in profile view)
  - **Dark shadow under head** — creates an unintended gloomy, floating-head effect
  - Overall proportions are too sharp/blocky for a friendly children's aesthetic

## Design Direction

### Target aesthetic

The avatars should feel like **chibi / cartoon characters**: large heads, small bodies, big soft eyes with eyelashes, a gentle neutral/happy mouth. Think Animal Crossing villagers, or Duolingo character proportions — round, friendly, readable from a distance.

Key traits of the redesigned avatar:
- **Always has a mouth** — neutral/closed smile at rest, open mouth during speaking
- **Big, soft eyes** — large irises (fill most of the eye area), small rounded white sclera, with a 1–2px dark outline. NOT massive white eyes with tiny dots.
- **Rounded head** — less angular, slightly larger relative to body
- **Hair that doesn't clip** — hair sits ON the head, not through it. Side-swept or simple styles.
- **Warm skin tones** — at minimum, the default skin should be warm/peach, not cold grey-beige
- **Subtle ambient shadow** — softer, wider shadow blob under feet (not under the neck)

### Mouth States

The avatar should have at minimum 3 mouth states rendered:
1. **Neutral** — gentle closed smile (slight upward curve, always present)
2. **Speaking** — open mouth, showing speaking animation (triggered by TTS/audio playing)
3. **Happy** — big open smile, used on SunDrop earn celebrations

### Eye Redesign

Replace the current large-white-sclera approach with:
- Iris takes up ~70% of the eye area
- Sclera is small and barely visible
- Add a highlight dot (small white dot at top of iris) — makes eyes look alive
- Subtle eyelashes (1–2 simple lines above each eye) for softness
- Pupils are medium-sized within the iris, not tiny dots

## Implementation Approach

### Option A: Pure CSS/SVG Face (Recommended for MVP)

Rather than trying to fix the 3D mesh geometry (which has multiple intersection/clipping problems), replace the face details (eyes, nose, mouth) with **flat SVG/CSS overlays** positioned over the 3D head mesh. This is a common technique for stylised characters:

- 3D mesh provides: head shape, hair, body, clothes, skin colour
- SVG overlay provides: eyes, eyebrows, nose, mouth (2D flat, always facing camera)
- Decal/plane mesh facing the camera with transparent PNG or SVG face texture

This approach avoids all the geometry clipping and intersection issues, and gives us complete control over facial expressions.

### Option B: Revised 3D Mesh

Revisit the `src/renderer/AvatarBuilder*` files and modify the geometry:
- Increase iris size relative to eye socket
- Add mouth geometry (a simple curved plane)
- Reduce the hair geometry to sit atop the skull not through it
- Soften the angular faces with subdivision or rounder primitives

Option A is recommended for Phase 2.3 speed; Option B is the right long-term approach for Phase 3.

### Speaking Animation

The TTS service (Task 2.3.3) is adding `onStart`/`onEnd` event hooks. Use these to toggle mouth state:

```typescript
// In the avatar component:
onTTSStart(() => setMouthState('speaking'));
onTTSEnd(() => setMouthState('neutral'));
```

The "speaking" animation can be a simple loop of open/close — no need for phoneme-accurate lip-sync at MVP.

## Files to Modify

- `src/renderer/AvatarBuilder.ts` (or similar) — head/eye geometry
- `src/renderer/AvatarRenderer.ts` — rendering pipeline
- `src/components/garden/GardenAvatar.tsx` — avatar component used in garden
- `src/components/path/PathAvatar.tsx` — avatar used on skill path
- Any avatar texture/material files in `public/` or `src/data/`

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Face implementation | 3D mesh fix vs. SVG overlay | SVG overlay for Phase 2.3 (faster, more control) |
| Mouth at rest | No mouth vs. gentle closed smile | Always a gentle closed smile — no exceptions |
| Eye style | Current large-white vs. large-iris chibi | Large-iris chibi style |
| Hair clip fix | Rework geometry vs. hide problem angles | Rework geometry — the clip is very obvious in side view |
| Speaking animation | Static open mouth vs. animated | Simple open/close loop (2-frame) |
| Customisation compatibility | Fixed look vs. compatible with customisation system | Must stay compatible with hair/skin/clothing customisation |

## Visual Reference

From the screenshots provided:
- **Girl avatar (front view):** Hair clips through forehead in a flat bar. Eyes are very white with small brown irises. No mouth visible.
- **Girl avatar (3/4 view):** Hair geometry extends as flat rectangle behind head. Severe clipping visible.
- **Boy avatar (3/4 view):** Same hair clipping. Eyes appear as two tiny dark dots in large white area. No mouth.
- **Boy avatar (front view):** Slightly better proportions but still no mouth, white stare.

All four screenshots show the same core problems: no mouth, white-dominated eyes, hair clipping.

## Testing

- [ ] Avatar always displays a mouth (at rest: gentle smile)
- [ ] Eyes have large irises (not large white sclera with tiny pupils)
- [ ] Hair does not clip through head geometry in any view angle
- [ ] Mouth opens when TTS audio plays (speaking state)
- [ ] Mouth returns to neutral smile when TTS stops
- [ ] Shadow is under feet, not under neck/head
- [ ] Avatar looks friendly and non-threatening to a 7-year-old
- [ ] Hair/skin/clothing customisation still works with new face design
- [ ] Avatar renders correctly in both garden world and lesson path views

**Test scenarios:**
1. Open garden view — avatar visible — check: mouth present, eyes friendly ✓
2. Start a lesson, TTS plays — avatar opens mouth during audio ✓
3. TTS stops — avatar returns to neutral smile ✓
4. View avatar from different angles in 3D garden — no hair clipping visible ✓
5. Change hair style in customisation — new style still renders correctly without clipping ✓
6. Show avatar to a child (or child-like colleague) — ask "does this look friendly?" → yes ✓

## Confidence Scoring

### Requirements to Meet
- [ ] Mouth always visible (at minimum, neutral smile)
- [ ] Eyes redesigned to be less uncanny (large iris, small sclera)
- [ ] Hair clipping resolved
- [ ] Speaking animation connected to TTS events
- [ ] Customisation system unbroken

### Concerns
- [ ] SVG face overlay needs to always face the camera in 3D — requires a billboard plane mesh or CSS 2D overlay positioned over the 3D canvas
- [ ] The avatar customisation system (hair colours, styles) may be tightly coupled to the current geometry — verify before changing head mesh shape

### Deferred
- [ ] Phoneme-accurate lip sync → Phase 3
- [ ] Emotion expressions (sad, surprised, confused) → Phase 3
- [ ] Full facial customisation (eye shape, skin tone slider) → Phase 3

## Notes for Future Tasks

The avatar redesign in Phase 3 should move to a proper rigged character with morph targets for expressions. The SVG overlay approach here is a pragmatic MVP bridge. Document clearly in code that the SVG face is temporary.

## Learnings

TBD after implementation.
