# Task 1.1.14: Three.js Isometric Garden Renderer

**Status:** ✅ Completed
**Phase:** D (Polish)
**Dependencies:** Tasks 1.1.1–1.1.13 (garden data layer, tree health, decoration system)
**Completed:** 2026-02-16

---

## Objective

Replace the CSS/SVG garden rendering with a Three.js isometric renderer. This provides proper depth sorting, lighting, shadows, and animated effects that would be difficult to achieve with 2D approaches.

**Reference:** `docs/phase-1.1/GARDEN_THREE_IMPLEMENTATION.md` — Full implementation guide
**Prototype:** `docs/phase-1.1/GardenV2.jsx` — Working Three.js prototype (copy factory functions directly)

---

## Why Three.js Instead of PixiJS

The original plan specified PixiJS. **This has been changed to Three.js** for architectural reasons:

- PixiJS is a 2D renderer requiring manual depth sorting for isometric scenes
- Three.js with an orthographic camera handles depth, shadows, and lighting automatically
- The prototype already uses Three.js with excellent results
- Geometry-only approach means no external assets needed for MVP

**Do not install PixiJS or @pixi/react.**

---

## Implementation Summary

### Files Created

```
src/renderer/
├── GardenRenderer.ts              ← Main class: scene, camera, loop, raycasting
├── AvatarBuilder.ts               ← buildAvatar(opts) → THREE.Group
├── gridUtils.ts                   ← gridToWorld(), worldToGrid(), GRID_SIZE
├── types.ts                       ← AvatarOptions, GardenObject, PlacedObject, ShopItem
├── index.ts                       ← Barrel exports
└── objects/
    ├── trees.ts                   ← makeOak, makePine, makeCherry, makeApple, makeWillow, makeMaple
    ├── flowers.ts                 ← makeFlower(gx, gz, petalColor, centerColor, numPetals)
    ├── furniture.ts               ← makeBench, makeLantern, makeBirdBath
    ├── features.ts                ← makeFountain, makePond
    ├── plants.ts                  ← makeHedge, makeMushroom
    └── objectFactory.ts           ← createObject(type, gx, gz) dispatcher

src/components/garden/
└── GardenWorld3D.tsx              ← React wrapper with forwardRef, hooks
```

### Dependencies Added
```bash
npm install three @types/three
```

---

## Key Implementation Details

### 1. Isometric Camera Setup

```typescript
const FRUSTUM = 14; // Controls zoom level
const CAMERA_ANGLE = Math.PI / 4;     // 45 degrees rotation
const CAMERA_ELEVATION = Math.PI / 6; // 30 degrees from horizontal

const camera = new THREE.OrthographicCamera(
  -(FRUSTUM * aspect) / 2,
   (FRUSTUM * aspect) / 2,
   FRUSTUM / 2,
  -FRUSTUM / 2,
  0.1,
  1000
);
```

### 2. Grid Coordinate System

- **Grid size:** 12×12 tiles (GRID_SIZE = 12)
- **Tile width:** 1.2 world units (TILE_WIDTH = 1.2)
- **Tile height:** 0.15 world units (TILE_HEIGHT = 0.15)
- **Conversion:** `gridToWorld(gx, gz)` returns `{x, z}` world coordinates

### 3. Scene Lighting (Bright Daytime)

Implemented for kid-friendly bright visuals:

- **HemisphereLight:** Sky blue (0x87CEEB) + ground green (0x3A5F0B), intensity 0.8
- **AmbientLight:** White (0xFFFFFF), intensity 0.7
- **DirectionalLight (Sun):** Warm white (0xFFFAE6), intensity 1.2, casts shadows
- **FillLight:** Soft blue (0xB4D4E7), intensity 0.3 from opposite direction

### 4. Object Catalogue (20 Items)

| Category | Objects |
|----------|---------|
| Trees | oak, pine, cherry, apple, willow, maple |
| Flowers | rose, sunflower, tulip, lavender, daisy, poppy |
| Plants | hedge, mushroom |
| Furniture | bench, lantern, bird_bath |
| Features | fountain, pond |

All objects are geometry-only — no external textures required.

### 5. Animated Effects

- **Fountain:** 18 arc particles with sine-wave trajectory
- **Pond:** 3 expanding ripple rings with fading opacity
- **Trees:** Subtle sway animation

### 6. Avatar Features

- **Click-to-walk:** Click any tile to navigate
- **Rotation:** Smooth rotation interpolation to face movement direction
- **Customization:** Gender, skin tone, hair color, shirt color, pants color, hat

---

## React Integration

The Three.js renderer mounts inside a React component:

```tsx
const GardenWorld3D = React.forwardRef<GardenWorldHandle, GardenWorldProps>(
  ({ avatarOptions, initialObjects, onAvatarMove, placementModeItem, ... }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<GardenRenderer | null>(null);

    useEffect(() => {
      if (!canvasRef.current) return;
      const renderer = new GardenRenderer({ canvas: canvasRef.current, ... });
      rendererRef.current = renderer;
      renderer.animate();
      return () => renderer.dispose();
    }, []);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
  }
);
```

---

## Testing Checklist

### Renderer
- [x] Canvas initializes at correct size
- [x] Scene renders at 60fps on desktop
- [x] Hover highlight appears on tile under cursor
- [x] Click-to-walk sends character to correct tile
- [x] Character faces direction of travel (smooth rotation interpolation)
- [x] No memory leaks on component unmount

### Objects
- [x] All 20 shop items render correctly
- [x] Fountain arc particles animate
- [x] Pond ripples expand and fade
- [x] Object factory dispatcher works

### Avatar
- [x] Default avatar renders
- [x] Gender toggle changes geometry
- [x] Color swatches apply correctly
- [x] Hat styles render

### Lighting
- [x] Bright, kid-friendly scene (not dark/night mode)
- [x] Shadows render properly
- [x] Sky blue background

### Performance
- [x] 60fps with 20+ objects in scene
- [x] No frame drops during animations
- [x] Canvas resizes on window resize

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Three.js renderer initializes | ✅ |
| All 20 objects render from geometry | ✅ |
| Avatar customization works | ✅ |
| Animated effects run smoothly | ✅ |
| 60fps performance | ✅ |
| Bright daytime lighting | ✅ |
| Avatar rotation | ✅ |

---

## Known Limitations

1. **No game data integration yet** — Trees/flowers render via `initialObjects` prop, but `useGarden` state integration is Task 1.1.12
2. **No zoom controls** — Can be added via mouse wheel in future
3. **No pathfinding** — Avatar walks through obstacles (future enhancement)

---

## Reference Files

- **`src/renderer/GardenRenderer.ts`** — Main renderer class
- **`src/renderer/AvatarBuilder.ts`** — Avatar geometry builder
- **`src/renderer/types.ts`** — TypeScript types and shop catalogue
- **`src/components/garden/GardenWorld3D.tsx`** — React wrapper component
- **`docs/phase-1.1/GARDEN_THREE_IMPLEMENTATION.md`** — Implementation guide

---

## Future Enhancements (Post-MVP)

These are documented in GARDEN_THREE_IMPLEMENTATION.md but explicitly deferred:

- Day/night cycle
- Expandable map (12×12 → 24×24)
- Zoom controls (mouse wheel)
- Avatar collision/pathfinding
- Realistic water physics
- Extended avatar customization
- NPC animals
- Companion pet
- Seasonal changes
- Garden maintenance mechanics