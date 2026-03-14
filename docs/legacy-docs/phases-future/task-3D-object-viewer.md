# Task: 3D Object Viewer Dev Tool

**Status:** ✅ Complete  
**Date:** January 2026  
**Phase:** 2 — World Expansion (Dev Tooling)

---

## Overview

A dev-only 3D object viewer that lets you isolate every garden object and avatar, rotate/zoom around it, inspect its properties, and take screenshots — all without touching the live garden. The primary purpose is to speed up quality iteration on the 3D objects by giving you a clear view of each one in isolation, then making it easy to paste a screenshot into Cline and say "improve this".

---

## How to Use

### Opening the Viewer

Press **Ctrl+Shift+D** (Mac: **Cmd+Shift+D**) anywhere in the app.  
This opens the dev harness. The **🔍 Object Viewer** tab is selected by default.

You can also click the small **🧪 Dev** button in the bottom-right corner of the screen (only visible in development mode).

### Navigating Objects

The **left sidebar** groups all objects by category:

| Category | Objects |
|----------|---------|
| 🌲 Trees | oak, pine, cherry, maple, willow, palm |
| 🌸 Flowers | rose, sunflwr, tulip, lavender, daisy, poppy |
| 🌿 Plants | hedge, mushroom |
| 🪑 Furniture | bench, lantern, sign |
| ⛲ Features | fountain, pond |
| 👤 Avatar | boy/girl with full colour customisation |

Click a category to expand it, then click any object to load it in the viewport.

### Viewport Controls

| Action | How |
|--------|-----|
| Orbit / rotate | Click and drag in the canvas |
| Zoom in/out | Scroll wheel |
| Reset to default view | Click **🎯 Reset View** |
| Slow turntable spin | Click **⟳ Auto-Rotate** (toggles) |

The camera uses a **perspective projection** (not orthographic) for natural 3D inspection. The default angle is 45° azimuth, 30° elevation — the same view angle as the garden's isometric camera.

### Avatar Customisation

When the **👤 Avatar** category is selected, the right panel shows live colour pickers:

- **Gender** — boy / girl (changes hair style and proportions)
- **Shirt colour** — 8 swatches
- **Pants colour** — 4 swatches  
- **Hair colour** — 6 swatches
- **Skin tone** — 4 swatches
- **Hat style** — none / cap / wizard / crown / flower
- **Hat colour** — 6 swatches (only shown when a hat is selected)

Changes apply immediately — the avatar reloads in the viewport.

### Info Panel (right sidebar)

When an object is selected, the right panel shows:

| Field | Description |
|-------|-------------|
| **Type ID** | The string key used in `objectFactories` (e.g. `oak`) |
| **Category** | Shop category (Trees, Flowers, etc.) |
| **Cost** | Gem price from `SHOP_CATALOGUE` |
| **Animated** | Whether this object has a runtime animation (fountain, pond = Yes) |
| **Source** | The TypeScript file that contains the factory function |

### Taking Screenshots

1. Click **📸 Screenshot** in the right panel
2. A PNG file downloads automatically as `{objectId}-{timestamp}.png`
3. A thumbnail preview appears below the button
4. Click the thumbnail to re-download

The screenshot captures the current camera angle at 2× pixel ratio (retina-quality). You can use this image directly with Cline:

> "Here is a screenshot of the cherry tree. The trunk is too thin and the pink blossoms look flat. Can you improve it?"

---

## Workflow: Iterating on Object Quality

The intended workflow for improving an object:

1. **Open the viewer** (Ctrl+Shift+D → 🔍 Object Viewer)
2. **Select the object** from the left sidebar
3. **Orbit around it** to find the worst angle
4. **Take a screenshot** (📸)
5. **Paste the screenshot into Cline** with a description of the problem:
   > "This is the oak tree from `src/renderer/objects/trees.ts`. The foliage looks like three separate blobs with visible gaps. Can you tighten the sphere positions and adjust sizes so they read as a single unified canopy?"
6. **Cline edits the factory function** in the relevant file
7. **Reload the viewer** (the object reloads automatically when you click it again)
8. **Repeat** until satisfied

---

## Architecture

### Files Created

```
src/renderer/ObjectViewerRenderer.ts      — Three.js renderer (isolated from GardenRenderer)
src/components/dev/ObjectViewerHarness.tsx — React UI (3-panel layout)
```

### Files Modified

```
src/components/dev/index.ts    — Added ObjectViewerHarness export
App.tsx                        — Added 🔍 Object Viewer tab to dev harness
                               — Default tab changed to 'objects'
```

### ObjectViewerRenderer

A fully self-contained Three.js renderer that:
- Uses `THREE.PerspectiveCamera` (FOV 45) for natural 3D inspection
- Implements **manual orbit controls** (mousedown/mousemove/wheel + touch) — no external OrbitControls dependency
- Calls `objectFactory.createObject(type, 0, 0)` and resets `group.position` to origin (since `gridToWorld(0,0) = (-4.5, 0, -4.5)`)
- Runs `updateFountainAnimation` / `updatePondAnimation` for animated objects
- Uses `preserveDrawingBuffer: true` on the WebGL renderer so screenshots work at any time
- Three-point lighting (key + fill + rim) for good shape definition
- Shadow-receiving ground plane + subtle grid for scale reference

```typescript
// Typical usage:
const viewer = new ObjectViewerRenderer(canvasElement);
viewer.start();
viewer.loadObject('cherry');       // Load any factory object
viewer.loadAvatar(avatarOptions);  // Or the player avatar
viewer.setAutoRotate(true);        // Turntable mode
const png = viewer.captureScreenshot();
viewer.dispose();                  // Always call on unmount
```

### ObjectViewerHarness

React component (`src/components/dev/ObjectViewerHarness.tsx`) with:
- `useRef<ObjectViewerRenderer>` — renderer lifetime tied to component lifecycle
- `useEffect` on mount → creates renderer, loads first tree, calls `viewer.start()`
- `useEffect` on `[viewMode, selectedItem, avatarOptions]` → reloads object when selection changes
- Screenshot handler → `viewer.captureScreenshot()` + `<a>.click()` download + thumbnail preview

---

## Adding New Objects to the Viewer

When you add a new object factory (e.g., `makeCastle` in `features.ts`):

1. Register it in `featureFactories` (in `src/renderer/objects/features.ts`)
2. Add a `ShopItem` entry to `SHOP_CATALOGUE` in `src/renderer/types.ts`
3. The viewer will automatically pick it up — no viewer code changes needed

The viewer reads its object list directly from `SHOP_CATALOGUE`, filtered to exclude `TreeCare` consumables.

---

## Known Limitations

- **Learning trees** (the language-linked trees) are not listed — they use a separate `makeLearningTree()` factory in `learningTrees.ts` with different parameters (growthStage, health). You can inspect them via the existing **🌲 Tree Renderer** tab.
- **Wild decorations** (`wildDecorations.ts`), **animals** (`animals.ts`), **cabin** (`cabin.ts`), and **fence** (`fence.ts`) are not in the shop catalogue and therefore not in the viewer. If you want to inspect them, you could temporarily add them to `SHOP_CATALOGUE` as zero-cost items for testing.
- The viewer does not support multi-object scenes (e.g., see how a tree looks next to a bench). This is out of scope for isolated inspection.

---

## Confidence: 8/10

**Met:**
- [x] All shop objects viewable in isolation
- [x] Avatar with full live customisation
- [x] Orbit (drag) + zoom (scroll) controls
- [x] Auto-rotate turntable
- [x] Screenshot download at 2× resolution
- [x] Info panel: type ID, category, cost, animated flag, source file
- [x] Zero TypeScript errors
- [x] No production bundle impact (dev-only, behind `import.meta.env.DEV` gate + Ctrl+Shift+D)

**Concerns:**
- [ ] Learning trees and non-shop objects require manual SHOP_CATALOGUE entry to view (by design)
- [ ] Auto-rotate uses `clock.getDelta()` inside the tick loop which also advances elapsed time — minor potential for elapsed drift on very fast machines (non-critical for a dev tool)

**Deferred:**
- [ ] Multi-object scene preview (Phase 3)
- [ ] Export object description as text prompt for Cline (Phase 3)
