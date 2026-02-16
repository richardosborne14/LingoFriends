# Garden Renderer: Three.js Implementation Guide (for Cline)

**Replaces:** `docs/phase-1.1/task-1-1-14-pixi-upgrade.md`  
**Status:** Ready to implement  
**Phase:** D (Polish) — same position in the task sequence  
**Dependencies:** Tasks 1.1.1–1.1.13 completed (garden data layer, tree health, decoration system)  
**Estimated Time:** 10–14 hours  
**Prototype Reference:** `docs/phase-1.1/GardenV2.jsx` ← **read this first, it is the visual spec**

---

## ⚠️ CRITICAL: Two Types of Trees

This document describes the **3D rendering system for decorations**. There are TWO types of trees:

### Learning Trees (NOT in the shop)
- **Source:** Planted from SEEDS (earned via pathway completion)
- **Purpose:** Core gameplay - each tree represents a learning pathway
- **Growth:** 15 visual stages based on per-tree SunDrops
- **Interaction:** Click → Opens PathView for lessons
- **Health:** Decays without lessons, protected by gifts
- **Rendered by:** `src/renderer/objects/learningTrees.ts` (needs creation)
- **See:** `docs/phase-1.1/task-1-1-19-garden-architecture-fix.md`

### Decoration Trees (in the shop)
- **Source:** Bought with GEMS (earned from lessons/streaks)
- **Purpose:** Purely cosmetic garden decoration
- **Growth:** None - static mesh
- **Interaction:** None - just visual
- **Health:** N/A
- **Rendered by:** This document's object catalogue
- **Included in:** `SHOP_CATALOGUE` below

**Do not confuse these!** The shop catalogue below is for DECORATIONS only.

---

## Decision: Three.js Instead of PixiJS

The original plan (task-1-1-14) specified PixiJS. **This has been changed to Three.js.** The reason is architectural:

PixiJS is a 2D renderer. For an isometric Farmville-style garden with walkable depth, object placement, and rich visual effects, PixiJS requires you to manually implement depth sorting — a notoriously difficult problem where every object at the same Y row must be sorted by Z position or sprites visually overlap incorrectly. Three.js solves this for free because it is a real 3D scene graph with an orthographic isometric camera. Depth sorting, shadows, and lighting are all handled by the WebGL pipeline.

**Do not install PixiJS or @pixi/react.** These are no longer needed.

---

## Architecture Overview

The garden is a self-contained Three.js scene mounted inside a React component. React handles all UI overlays (shop panel, avatar customiser, top bar, toast messages). Three.js owns a single `<canvas>` element and handles all 3D rendering. They communicate through refs and state, never through the Three.js scene graph.

```
GardenWorld.tsx
├── <canvas ref={canvasRef} />         ← Three.js owns this
├── <TopBar />                          ← React overlay
├── <ToastMessage />                    ← React overlay  
├── <ShopPanel />                       ← React overlay
├── <AvatarCustomiser />                ← React overlay
└── <BottomBar />                       ← React overlay

GardenRenderer.ts
├── scene: THREE.Scene
├── camera: THREE.OrthographicCamera    ← Isometric, not perspective
├── renderer: THREE.WebGLRenderer
├── layers:
│   ├── backgroundLayer (sky, clouds, stars/moon/sun)
│   ├── groundLayer (tiles, fence, border)
│   ├── objectLayer (trees, decorations — all user-placed)
│   ├── avatarLayer (player character)
│   └── effectLayer (fountain particles, ripples, sun drops)
└── animationLoop (requestAnimationFrame)
```

---

## Dependencies

```bash
npm install three
npm install --save-dev @types/three
```

Do **not** install `@pixi/react`, `pixi.js`, or any PixiJS package.

---

## The Isometric Camera

This is critical. Use `OrthographicCamera`, not `PerspectiveCamera`. The isometric look comes from positioning the camera at equal distances on all three axes and pointing it at the origin.

```typescript
const FRUSTUM = 7.5; // half-height, controls zoom level (lower = closer)

const camera = new THREE.OrthographicCamera(
  -(FRUSTUM * W) / H,  // left
   (FRUSTUM * W) / H,  // right
   FRUSTUM,            // top
  -FRUSTUM,            // bottom
  0.1,                 // near
  200                  // far
);
camera.position.set(12, 12, 12);
camera.lookAt(0, 0, 0);
```

To implement **scroll-to-zoom**, adjust `FRUSTUM` and call `camera.updateProjectionMatrix()` — do not move the camera position:

```typescript
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  FRUSTUM = Math.max(3.5, Math.min(13, FRUSTUM + e.deltaY * 0.012));
  camera.left  = -(FRUSTUM * W) / H;
  camera.right =  (FRUSTUM * W) / H;
  camera.top    =  FRUSTUM;
  camera.bottom = -FRUSTUM;
  camera.updateProjectionMatrix();
}, { passive: false });
```

---

## Grid Coordinate System

All garden objects live on a `G × G` tile grid (start with G = 12). The conversion from grid coordinates to world coordinates:

```typescript
const G = 12;
const TW = 1; // tile width in world units

function gridToWorld(gx: number, gz: number) {
  return {
    x: (gx - G / 2 + 0.5) * TW,
    z: (gz - G / 2 + 0.5) * TW,
  };
}
```

Objects are placed at `y = 0`, with their geometry built upward from there. The tile surface sits at `y = TH/2` (where `TH = 0.1` is tile thickness).

**Tile grid — do not use `TW - gap`**. Tiles must be exactly `TW` wide with no subtracted gap. Any gap value causes visible grid lines in the renderer. The prototype previously used `TW - 0.03` which created outlines — this has been removed.

---

## Scene Lighting

The prototype uses an evening/night atmosphere by default. Two lighting modes will eventually support a day/night cycle (see Wishlist). For MVP, use the evening setup:

```typescript
// Very dim blue-tinted ambient — night sky
scene.add(new THREE.AmbientLight(0x5566AA, 0.16));

// Low golden sun on the horizon
const sun = new THREE.DirectionalLight(0xFF9944, 0.32);
sun.position.set(5, 10, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left   = -14;
sun.shadow.camera.right  =  14;
sun.shadow.camera.top    =  14;
sun.shadow.camera.bottom = -14;
scene.add(sun);

// Soft fill from the other side
const fill = new THREE.DirectionalLight(0x223355, 0.1);
fill.position.set(-5, 6, -5);
scene.add(fill);

// Moon point light (far away, subtle)
const moonGlow = new THREE.PointLight(0xBBCCFF, 0.18, 30);
moonGlow.position.set(-8, 14, -12);
scene.add(moonGlow);
```

**Never use `Object.assign` to set position on a Three.js object.** Position is a `Vector3` with a non-writable descriptor. Always use `.set()`:

```typescript
// ✅ Correct
light.position.set(-5, 6, -5);

// ❌ Will throw: Cannot assign to read only property 'position'
Object.assign(light, { position: { x: -5, y: 6, z: -5 } });
```

---

## Lantern Glow (Point Lights)

Each lantern contains a `THREE.PointLight` parented to the lantern group. This gives localized warm glow that illuminates nearby tiles, trees, and the avatar. Flicker is achieved by modulating intensity each frame using compound sine waves — this avoids the regularity of a single sine:

```typescript
// Inside the lantern factory function:
const light = new THREE.PointLight(0xFFAA33, 3.0, 3.4);
light.position.y = TH / 2 + 0.62; // same height as lantern box
light.userData.isLanternLight = true;
lanternGroup.add(light);

// Inside the animation loop:
scene.traverse(node => {
  if (node.isPointLight && node.userData.isLanternLight) {
    node.intensity = 2.9
      + Math.sin(t * 5.3  + node.id * 0.7) * 0.42
      + Math.sin(t * 11.1 + node.id)       * 0.18;
  }
});
```

The `node.id` term offsets each lantern so they don't all flicker in sync.

---

## Object Catalogue

All objects are built from Three.js geometry — no external sprite files or textures are required for the base implementation. The full catalogue from the prototype:

### Trees (6 styles)
| ID | Style | Key Geometry |
|----|-------|-------------|
| `oak` | Broad leaf sphere cluster | 3 overlapping SphereGeometry at different offsets |
| `pine` | Tapered cones stacked | 3 ConeGeometry, narrowing and rising |
| `cherry` | Pink blossom spheres | Same as oak but MeshLambertMaterial pink |
| `maple` | Autumn cone layers | ConeGeometry in orange/red palette |
| `willow` | Drooping strands | SphereGeometry canopy + 8 elongated sphere strands |
| `palm` | Leaning trunk + fronds | Slightly rotated cylinder + 7 BoxGeometry fronds + coconuts |

### Flowers (6 varieties)
All flowers share the same `makeFlower(gx, gz, petalColor, centerColor, numPetals)` factory. Petals are scaled `SphereGeometry` (x: 0.82, y: 0.28, z: 1.38) arranged in a ring around the center disc. This produces a convincingly flat petal shape in 3D.

| ID | Petal colour | Centre | Petals |
|----|-------------|--------|--------|
| `rose` | 0xFF1744 | 0xFFD700 | 6 |
| `sunflwr` | 0xFFD600 | 0x5C2E00 | 12 |
| `tulip` | 0xFF69B4 | 0xFFFF99 | 4 |
| `lavender` | 0x9966CC | 0x7B52AB | 8 |
| `daisy` | 0xFFFFFF | 0xFFD700 | 12 |
| `poppy` | 0xFF3300 | 0x111111 | 5 |

### Other objects
`hedge`, `mushroom`, `bench`, `lantern`, `sign`, `fountain`, `pond`  
All geometry-only, see `GardenV2.jsx` for the exact factory functions — copy them directly into `src/renderer/objects/`.

---

## Animated Effects

### Fountain Arc Particles
The fountain has 18 arc particles (`SphereGeometry` r=0.028). Each particle has a `phase` offset (0 to 1 spread uniformly across the 18 particles). Each frame:

```typescript
fountainGroup.userData.fountainDrops.forEach(drop => {
  const phase = (drop.userData.phase + t * 0.5) % 1;
  const arc   = Math.sin(phase * Math.PI);
  const r     = arc * 0.26;
  drop.position.set(
    Math.cos(drop.userData.angle) * r,
    TH / 2 + 0.43 + arc * 0.48,
    Math.sin(drop.userData.angle) * r
  );
  drop.material.opacity = Math.min(1, arc * 2);
  drop.visible = phase < 0.94;
});
```

### Pond Ripples
The pond has 3 `RingGeometry` children tagged `isRipple: true`. Each frame, scale them outward and fade opacity:

```typescript
pondGroup.children.forEach(child => {
  if (!child.userData.isRipple) return;
  const phase = (child.userData.phase + t * 0.26) % 1;
  const scale = 0.4 + phase * 4.2;
  child.scale.set(scale, scale, scale);
  child.material.opacity = (1 - phase) * 0.48;
});
```

Both effects must have `depthWrite: false` on their materials to prevent z-fighting with the water surface.

---

## Avatar System

The avatar is built procedurally from geometry in `buildCharacter(opts: AvatarOptions)`. It returns a `THREE.Group` that can be repositioned, rotated, and re-added to the scene.

### AvatarOptions type
```typescript
interface AvatarOptions {
  gender:     'boy' | 'girl';
  shirtColor: number;   // hex colour int
  pantsColor: number;
  hairColor:  number;
  skinTone:   number;
  hat:        'none' | 'cap' | 'wizard' | 'crown' | 'flower';
  hatColor:   number;
}
```

### Rebuilding on customisation change
When the user changes avatar options, remove the old group from the scene and add a new one. Preserve position and rotation:

```typescript
// In React useEffect watching avatarOpts:
const oldChar = sceneRef.current.char;
const newChar = buildCharacter(avatarOpts);
newChar.position.copy(oldChar.position);
newChar.rotation.y = oldChar.rotation.y;
scene.remove(oldChar);
scene.add(newChar);
sceneRef.current.char = newChar;
```

### Walk animation
The character walks at 3.2 world-units/second toward a target tile. The bouncing walk cycle is `position.y = Math.abs(Math.sin(t * 14)) * 0.032`. The character rotates to face the direction of travel: `char.rotation.y = Math.atan2(dx, dz)`.

---

## Garden Data Model (Pocketbase)

The rendered garden is driven entirely by data. The Pocketbase `garden_objects` collection should store:

```
garden_objects
  id         : string (PB auto)
  user_id    : string (relation → users)
  object_id  : string  (e.g. "lantern", "cherry", "fountain")
  gx         : number  (grid X, 0 to G-1)
  gz         : number  (grid Z, 0 to G-1)
  placed_at  : datetime
```

On garden load: fetch all `garden_objects` for current user → pass to renderer as the `placedObjects` array → renderer calls `makeObj(object_id, gx, gz)` for each. The `occupiedCells` Set is reconstructed from this data.

On placement: optimistically update local state + insert record to Pocketbase in background.

---

## Decoration Shop Integration

The shop catalogue is pure data. Each item has: `id`, `name`, `cost` (Sun Drops), `icon` (emoji for UI only), `category`. The full catalogue from the prototype:

```typescript
const SHOP_CATALOGUE = [
  // Trees
  { id:'oak',      name:'Oak Tree',       cost:30, icon:'🌳', cat:'Trees'     },
  { id:'pine',     name:'Pine Tree',      cost:25, icon:'🌲', cat:'Trees'     },
  { id:'cherry',   name:'Cherry',         cost:40, icon:'🌸', cat:'Trees'     },
  { id:'maple',    name:'Autumn Maple',   cost:35, icon:'🍁', cat:'Trees'     },
  { id:'willow',   name:'Weeping Willow', cost:45, icon:'🌿', cat:'Trees'     },
  { id:'palm',     name:'Palm Tree',      cost:38, icon:'🌴', cat:'Trees'     },
  // Flowers
  { id:'rose',     name:'Rose',           cost:15, icon:'🌹', cat:'Flowers'   },
  { id:'sunflwr',  name:'Sunflower',      cost:12, icon:'🌻', cat:'Flowers'   },
  { id:'tulip',    name:'Tulip',          cost:10, icon:'🌷', cat:'Flowers'   },
  { id:'lavender', name:'Lavender',       cost:10, icon:'💜', cat:'Flowers'   },
  { id:'daisy',    name:'Daisy',          cost:8,  icon:'🌼', cat:'Flowers'   },
  { id:'poppy',    name:'Poppy',          cost:10, icon:'🌺', cat:'Flowers'   },
  // Plants
  { id:'hedge',    name:'Hedge Bush',     cost:18, icon:'🌿', cat:'Plants'    },
  { id:'mushroom', name:'Mushroom',       cost:8,  icon:'🍄', cat:'Plants'    },
  // Furniture
  { id:'bench',    name:'Bench',          cost:45, icon:'🪑', cat:'Furniture' },
  { id:'lantern',  name:'Lantern',        cost:35, icon:'🏮', cat:'Furniture' },
  { id:'sign',     name:'Sign Post',      cost:20, icon:'🪧', cat:'Furniture' },
  // Features
  { id:'fountain', name:'Fountain',       cost:80, icon:'⛲', cat:'Features'  },
  { id:'pond',     name:'Pond',           cost:55, icon:'💧', cat:'Features'  },
];
```

Prices are calibrated so a learner completing 2–3 lessons earns enough for a flower, and ~10 lessons for a fountain.

---

## Task Plan Changes

The following changes replace task 1.1.14 and add a new task 1.1.17a.

### Task 1.1.14 — REWRITTEN: Three.js Garden Renderer

**Was:** PixiJS Upgrade & Assets (6–8h)  
**Now:** Three.js Isometric Garden Renderer (10–14h)

**Deliverables:**
- Remove `pixi.js` and `@pixi/react` from package.json if already installed
- Install `three` and `@types/three`
- Create `src/renderer/GardenRenderer.ts` — main renderer class
- Create `src/renderer/objects/` — one file per object type (trees, flowers, furniture, effects)
- Create `src/renderer/AvatarBuilder.ts` — procedural avatar construction
- Create `src/renderer/effects/FountainEffect.ts` — arc particle system
- Create `src/renderer/effects/RippleEffect.ts` — expanding ring system
- Modify `src/components/garden/GardenWorld.tsx` — mount Three.js canvas, wire React overlays

**Does NOT need:**
- Any external sprite/texture files (geometry-only for MVP)
- A physics engine
- Three.js loaders (no GLTF, no OBJ)

### Task 1.1.17a — NEW: Garden Shop UI (3–4h)

Connect the shop catalogue to the Sun Drop economy and Pocketbase persistence:
- Shop panel renders from `SHOP_CATALOGUE` array
- Placement writes to `garden_objects` collection
- Sun Drop balance deducted via existing `sunDropService.ts`
- Garden loads placed objects from Pocketbase on mount

### Task 1.1.17b — EXISTING (unchanged): OSS Asset Integration

This task remains as originally planned — Kenney.nl textures applied to Three.js geometry as a later enhancement using `THREE.TextureLoader`. The garden works correctly without textures; adding them is purely visual polish.

---

## Files to Create

```
src/
└── renderer/
    ├── GardenRenderer.ts          ← Main class: scene, camera, loop, raycasting
    ├── AvatarBuilder.ts           ← buildCharacter(opts) → THREE.Group
    ├── gridUtils.ts               ← gridToWorld(), worldToGrid(), GRID_SIZE constant
    ├── objects/
    │   ├── trees.ts               ← makeOak, makePine, makeCherry, makeMaple, makeWillow, makePalm
    │   ├── flowers.ts             ← makeFlower(gx, gz, petalColor, centerColor, numPetals)
    │   ├── furniture.ts           ← makeBench, makeLantern, makeSign
    │   ├── features.ts            ← makeFountain, makePond
    │   ├── plants.ts              ← makeBush, makeMushroom
    │   └── objectFactory.ts       ← makeObj(id, gx, gz) dispatcher
    └── effects/
        ├── FountainEffect.ts      ← Arc particle animation
        ├── RippleEffect.ts        ← Expanding ring animation
        └── LanternFlicker.ts      ← Per-frame intensity modulation

src/components/garden/
    └── GardenWorld.tsx            ← MODIFIED: replace SVG/CSS with Three.js canvas mount
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/garden/GardenWorld.tsx` | Replace SVG rendering with `<canvas>` + `GardenRenderer` |
| `src/types/game.ts` | Add `AvatarOptions`, `GardenObject`, `PlacedDecoration` types |
| `src/services/gardenService.ts` | Add `loadGardenObjects()`, `placeObject()`, `removeObject()` |
| `package.json` | Remove pixi.js, add three |

---

## Testing Checklist

### Renderer
- [ ] Canvas initialises at correct size
- [ ] Scene renders at 60fps on desktop
- [ ] Scroll zoom works smoothly (3.5× to 13× range)
- [ ] Hover highlight appears on tile under cursor
- [ ] Click-to-walk sends character to correct tile
- [ ] Character faces direction of travel
- [ ] No memory leaks on component unmount (call `renderer.dispose()`)

### Objects
- [ ] All 19 shop items render correctly
- [ ] Fountain arc particles animate
- [ ] Pond ripples expand and fade
- [ ] Lanterns flicker at different phases
- [ ] Lantern glow visible on surrounding tiles at night

### Avatar
- [ ] Default avatar renders
- [ ] Gender toggle changes hair geometry
- [ ] All shirt/trouser/hair/skin colour swatches apply
- [ ] All 5 hat styles render
- [ ] Hat colour swatches apply for cap/wizard/crown
- [ ] Avatar rebuilds without position reset

### Shop
- [ ] Ghost preview follows cursor
- [ ] Placement blocked on occupied tiles
- [ ] Placement blocked on path tiles
- [ ] Sun Drop balance deducted on placement
- [ ] Placed object persists after page reload (Pocketbase)

### Performance
- [ ] 60fps with 20+ objects in scene
- [ ] No frame drops during fountain/ripple animation
- [ ] Canvas resizes correctly on window resize

---

## Reference Files

- `docs/prototypes/GardenV2.jsx` — **Full working prototype. Copy factory functions directly.**
- `docs/phase-1.1/GAME_DESIGN.md` — Garden design spec (tree health states, decoration categories)
- `docs/phase-1.1/CLINE_GAME_IMPLEMENTATION.md` — Overall implementation guide

---

## Wishlist: Future Phases

The following features have been designed and discussed but are explicitly deferred from phase 1.1. They are documented here so they can be planned into phase 1.2 or 2.x. None of these should block the current implementation — the architecture choices above are made deliberately to accommodate them without rework.

---

### W1 — Day/Night Cycle
**Complexity:** Medium  
**What it is:** The sky, lighting, and atmosphere shift from dawn → day → dusk → night on a real-world timer (e.g., every 60 real minutes = one full cycle, or tied to the user's local clock).

**How to implement:**
- A `DayNightController` class tracks a normalised time value `t` (0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk)
- Each frame, lerp between keyframe states: `{ skyColor, ambientIntensity, ambientColor, sunIntensity, sunColor, sunPosition }`
- At night: stars visible (opacity 1), moon visible, lanterns glow brightly
- At noon: stars hidden, sky bright blue, lanterns dim
- Sun/moon objects move along a circular arc above the garden
- Lerp `scene.background` and `scene.fog.color` simultaneously

**Why deferred:** Requires careful keyframe design and child-friendly UX (kids using the app at 3pm should still see the cosy evening atmosphere from the prototype; the cycle should be optional or adjustable).

---

### W2 — Expandable Map
**Complexity:** Medium-High  
**What it is:** The garden starts at 12×12 tiles. Completing enough lessons or skill paths unlocks an expansion that adds a new zone — e.g. a 6-tile-wide strip on one edge, revealed with an animation. The full potential garden could reach 24×24 or 30×30.

**How to implement:**
- Grid size `G` becomes a user-level variable stored in Pocketbase (`users.garden_size`)
- Unexpanded zones are shown as a fenced-off area with a "locked" overlay
- Expansion is triggered by a backend function that increments `garden_size` and notifies the client
- The renderer reinitialises tiles for the new grid size (or incrementally adds tile meshes without full reinit)
- The camera frustum should auto-adjust to frame the full garden on expansion

**Pedagogical hook:** "Complete your Spanish basics path to unlock the East Garden" — ties directly to the skill tree system.

---

### W3 — Habitation: Log Cabin
**Complexity:** High  
**What it is:** A pre-placed log cabin occupies a fixed 3×3 tile area in the garden (e.g. top-right corner). The avatar can walk up to the door and tap to "enter." Inside is a separate scene — a cosy room the player can also decorate with furniture bought from a separate "Room Shop." In a later phase, the cabin itself can be expanded (add a second room, upgrade roof style, etc.).

**How to implement:**
- The cabin is a fixed garden object, not player-placed, rendered from geometry (log walls = CylinderGeometry stacked, pitched roof = two angled BoxGeometry panels)
- A proximity trigger zone (invisible Box3 around the door) detects when the avatar is within 1.5 tiles
- "Enter" appears as a React overlay button when triggered
- Entering transitions to a new React route/view: `RoomView` — a separate Three.js scene with top-down or isometric interior view
- Room has its own `room_objects` Pocketbase collection, same data model as `garden_objects`
- The Room Shop catalogue: rug, bookshelf, fireplace, desk, potted plant, picture frame, cat bed, etc.

**Architecture note:** The cabin interior is a completely separate Three.js scene, not a camera pan into the garden scene. This keeps complexity manageable.

---

### W4 — Avatar Collision (Object Avoidance)
**Complexity:** Medium  
**What it is:** The avatar cannot walk through trees, benches, fountains, or other solid objects. Clicking a tile that is blocked routes the avatar around it.

**How to implement:**
- Build a 2D boolean grid `walkable[gx][gz]` from the occupied cells Set
- Path through the grid using A* (a small A* implementation in ~60 lines is sufficient for a 12×12 grid)
- The avatar follows the returned path as a sequence of waypoints rather than a direct line
- Update `walkable` whenever an object is placed or removed
- Path tiles (the cross-shaped path) are always walkable regardless of occupation

**Library option:** `pathfinding.js` (MIT licence, tiny, works perfectly for grid-based movement). No need to implement A* from scratch.

---

### W5 — Realistic Water Physics
**Complexity:** High  
**What it is:** The pond surface shows a proper caustic ripple simulation. The fountain water follows actual parabolic spray physics with splash particles on landing.

**How to implement (pond):**
- Replace the flat `CylinderGeometry` water surface with a `PlaneGeometry` with high vertex count (32×32 subdivisions)
- Each frame, update vertex Y positions using a 2D wave equation or sum of sine waves at different frequencies
- Use `THREE.ShaderMaterial` for a custom water shader with refraction simulation (sample the background through a distorted UV)

**How to implement (fountain):**
- Current arc particles are approximation — upgrade to proper parabolic physics: `vy -= gravity * dt`, `y += vy * dt`
- On `y <= waterSurface`, spawn a splash: 6–8 small droplets that arc outward and fall back, fade out
- Add a `THREE.PointLight` tinted blue inside the fountain bowl that pulses slightly with the water

**Why deferred:** Requires ShaderMaterial knowledge (GLSL). Not needed for the core experience but would be a showstopper visual feature for older kids.

---

### W6 — Extended Avatar Customisation
**Complexity:** Low-Medium  
**What it is:** Beyond the current shirt/trousers/hat system, add:
- Clothing types: dress (flared skirt geometry), hoodie (different body proportions), shorts (half-length legs)
- Facial features: glasses (TorusGeometry frames), freckles (tiny dot geometry on face), blush marks
- Accessories: backpack (already partially in prototype), scarf, wings (angel/fairy), tail
- Shoe styles: trainers (box with sole), boots (taller box)

**How to implement:**
- Each clothing/accessory type is a factory function that adds geometry to the avatar group
- Store selections in `AvatarOptions` type with new optional fields
- The customiser UI adds new sections with the same swatch/button pattern already in place
- Avatar appearance is stored in Pocketbase `users` record as a JSON blob

**Why deferred:** Core game loop must feel solid first. Avatar customisation is a retention feature, not a day-one need.

---

### W7 — NPCs: Animals
**Complexity:** Medium-High  
**What it is:** Passive animal NPCs roam the garden — sheep, ducks, rabbits, a deer. They follow simple flocking/wandering behaviours. More animals appear as the garden improves (a "garden score" based on decoration count and tree health). Animals drink from the pond/fountain when nearby.

**How to implement:**
- Each NPC is a `THREE.Group` with simple geometry (sphere body, cylinder legs, sphere head)
- Behaviour is a simple state machine: `WANDER → DRINK → EAT → WANDER`
- Wander: pick a random walkable tile within range, pathfind to it, wait 3–8s, repeat
- Drink: if within 2 tiles of pond/fountain, walk toward it, play "drink" animation (head bob down/up), wait 4s
- Garden score: `(decorationCount * 2) + (averageTreeHealth / 10)` → determines NPC count (0 animals at score 0, up to 8 at score 100)
- NPC geometry is fully procedural, no external assets needed

**Why deferred:** Requires pathfinding (W4) to be implemented first. Also requires careful performance testing — 8 NPCs each running A* per movement could impact mobile.

---

### W8 — Companion Animal
**Complexity:** Medium  
**What it is:** One special animal (dog or cat, player chooses) follows the avatar everywhere. It is persistent and has its own name. It plays idle animations (sits, rolls over, sniffs) when the avatar is stationary. It reacts to lesson completion with a "happy" animation.

**How to implement:**
- The companion is a separate `THREE.Group` that follows ~1.5 tiles behind the avatar at all times
- It pathfinds toward the avatar's previous position with a slight delay
- Idle animations are keyframed rotations/position offsets (no animation library needed — manual lerp)
- Companion choice and name are stored in Pocketbase `users` record
- Reaction events are triggered by a React event emitted after lesson complete (the renderer listens via a simple event emitter)

---

### W9 — Seasonal Changes
**Complexity:** Medium  
**What it is:** The garden appearance changes with real-world seasons (or a compressed in-game season cycle). Winter: snow-covered tiles (white tile colour, snow caps on trees, bare deciduous trees). Spring: cherry blossom petals fall (particle system), flowers auto-grow. Summer: lush green, bright sky. Autumn: maple/oak leaves turn (colour interpolation on tree materials).

**How to implement:**
- A `SeasonController` reads current month (or an accelerated in-game calendar) and outputs a `season: 'spring' | 'summer' | 'autumn' | 'winter'` value
- Each tree/flower/tile factory function accepts an optional `season` parameter that changes material colours
- On season change, traverse all objects in the scene and call `updateSeason(season)` on each
- Winter adds a snow mesh (flat PlaneGeometry) slightly above tiles with a snowy white material
- Cherry trees in spring emit a particle system (200 small pink circle sprites spiraling slowly downward)
- Tree health meaning changes: in winter, a "dormant" state with bare branches is normal and doesn't penalise the player — this reinforces the real-world parallel

**Pedagogical hook:** Seasons can be tied to lesson content (e.g. learning season vocabulary in French coincides with garden showing that season).

---

### W10 — Garden Maintenance as Engagement Loop
**Complexity:** Low (design) / Medium (implementation)  
**What it is:** Beyond tree health decay, the entire garden requires care to stay looking its best. This makes consistent lesson completion feel immediately rewarding in the garden — a direct cause-and-effect the child can see.

**Proposed mechanics:**

| Item | Decays without lessons | Effect of decay | Recovery |
|------|----------------------|-----------------|----------|
| Trees | Yes (existing) | Bare branches → stump | Review lesson |
| Flowers | Yes (new) | Petals fall, stem droops | Do any lesson |
| Pond | Yes (new) | Water turns murky (darker colour) | Complete listening activity |
| Fountain | Yes (new) | Water stops (particles pause) | Complete speaking activity |
| Lawn | Yes (new) | Patches of brown tiles appear | Complete streak of 3 days |
| Lanterns | No | — | — |
| Furniture | No | — | — |

**Decay is visual and gradual** — kids never feel punished, just motivated. The garden looking beautiful is the reward for consistency, not a separate currency.

**Why activity-specific recovery:** Speaking activities reviving the fountain, listening activities reviving the pond — these create a memorable mental link between activity type and garden element. Language coaching methodology supports this kind of embodied metaphor.

---

### W11 — Things Not Yet Imagined (Open Wishlist)
Additional ideas worth exploring in later phases:
- **Weather system:** Rain (particle effect) that appears occasionally and makes the garden look extra lush
- **Garden parties:** Friend visits trigger a temporary decoration (balloons, bunting) that lasts 24 hours
- **Treasure hunting:** A buried item appears in the garden each week (glowing tile), digging it up rewards Sun Drops — requires completing a mini-lesson first
- **Garden photography:** A "photo mode" that removes UI and lets kids screenshot their garden to share
- **Seasonal events:** Halloween (carved pumpkins appear), Christmas (snow + lights), Easter (eggs hidden in garden)
- **Achievement garden markers:** Completing 100 lessons places a permanent golden statue in the garden — visible to friends

---

## Summary of Immediate Changes to Task Plan

| Task | Old plan | New plan |
|------|----------|----------|
| 1.1.14 | PixiJS Upgrade & Assets | **Three.js Isometric Garden Renderer** (this doc) |
| 1.1.17 | OSS Asset Integration | Unchanged — Kenney.nl textures applied to Three.js geometry |
| 1.1.17a | *(new)* | Garden Shop UI → Pocketbase persistence |

All other tasks (1.1.1–1.1.13, 1.1.15, 1.1.16) are **unchanged**.

The prototype file `docs/prototypes/GardenV2.jsx` is the authoritative visual reference. Cline should read it before writing any renderer code — all factory functions can be copied directly into the typed `.ts` equivalents with minimal adaptation.
