# Future Phase: Cabin Interior

**Status:** 📋 Scoped — not scheduled  
**Prerequisites:** Phase 2.0.8 (Garden World Overhaul — cabin exterior built)  
**Estimated Time:** 16–24 hours  
**Last Updated:** 2026-02-28

---

## Vision

The cabin is the user's indoor personal space. While the garden represents your learning journey, the cabin is where you express yourself. Think Animal Crossing house interior — a cosy room you can decorate and personalise.

---

## Core Features

### 1. Scene Transition
- Walking to the cabin door and clicking triggers a scene transition
- Camera zooms into the door → fade to black → interior loads
- Interior is a separate Three.js scene (or same scene with camera repositioned)
- "Exit" button returns to garden

### 2. Interior Layout
- Single room to start (expandable later)
- Isometric view, same camera style as garden
- Walls, floor, and ceiling rendered
- Window that shows the garden outside (could be a simple textured plane)
- Default furniture: bed, desk, rug, bookshelf (all built from primitives)

### 3. Decoration System
- Players earn interior decorations from lessons, achievements, or the shop
- Place decorations on walls and floors
- Drag-to-position with snap grid
- Categories: furniture, wall art, rugs, lighting, plants
- Some items could be learning-themed (e.g., a globe, language flags, bookshelves that fill as you learn)

### 4. Trophy Display
- Shelves/wall that automatically display earned achievements
- Certificates for completed skill paths
- Star ratings from perfect lessons
- Streak badges

### 5. Interactive Elements (stretch)
- Bookshelf: click to review learned phrases
- Desk: shows learning stats/progress
- Mirror: avatar customisation
- Radio/music box: plays calming background music

---

## Technical Considerations

### Scene Management
- Need a scene manager to switch between garden and cabin
- Shared renderer, different scene/camera setups
- Garden state pauses while in cabin (no NPC spawning, etc.)

### Interior Decoration Persistence
- Extend `garden_objects` collection or create `cabin_objects`
- Each object: type, position (x, z on floor grid), rotation, wall attachment

### Performance
- Interior has fixed camera = can be simpler than garden
- No moving entities except player avatar
- Could be lighter weight overall

---

## Phases of Cabin Development

| Sub-phase | Scope | Est. Hours |
|-----------|-------|------------|
| 3.x.1 | Scene transition + empty room | 4–6h |
| 3.x.2 | Default furniture (non-movable) | 3–4h |
| 3.x.3 | Decoration placement system | 6–8h |
| 3.x.4 | Trophy/achievement display | 3–4h |
| 3.x.5 | Interactive elements | 4–6h |

---

## Dependencies

- Phase 2.0.8: Cabin exterior exists in garden
- Phase 2.0.12 (Shop): Cabin decorations added to shop catalogue
- Interior decoration assets: either procedural geometry or simple sprites

---

## Open Questions

1. **One room or multiple?** Start with one, expand later with "room additions" earned through milestones
2. **Should the cabin have a gameplay function?** e.g., "study room" where you can do extra review lessons, or is it purely cosmetic?
3. **Friend visits:** When multiplayer launches, can friends visit your cabin? This would require cabin state sync.
4. **Seasonal themes:** Auto-decorate for holidays/seasons? Or let users opt-in?

---

## Notes

The cabin is a "nice to have" that significantly increases the personalisation and engagement potential. It doesn't affect the core learning loop but provides aspirational goals (earn decorations) and emotional attachment to the game world. For a kids' app, the ability to "make it mine" is a powerful retention lever.
