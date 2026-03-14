# Task: 3D Scene Editor (Dev Tooling)

**Status:** 📋 Deferred — Post-MVP  
**Phase:** Future (Phase 3+)  
**Depends on:** `task-3D-object-viewer.md` (✅ Complete)  
**Priority:** Medium — Quality-of-life for 3D asset iteration

---

## Overview

An interactive 3D editor mode built into the existing **Object Viewer** dev tool. The goal is to let you tweak 3D objects visually — without touching TypeScript — and then copy the resulting code back into the factory files.

This is **not** a full 3D modelling tool. Think of it as a "property inspector + layout helper" for the Three.js geometry-based objects already in the game. The AI workflow (screenshot → paste into Cline → edit factory function) remains the primary path; this editor is a quick no-AI alternative for simple dimension/position tweaks.

---

## Why Defer?

The Object Viewer is a dev-only tool and the current AI-assisted workflow (screenshot → Cline → edit factory) works well. The editor would be most valuable once the core game is stable and 3D object quality becomes the main area of polish. Building it in the MVP phase would be premature optimisation.

---

## User Stories

> As a developer, I want to **click a mesh** in the 3D viewport and drag sliders to adjust its position and size, so I can iterate on object proportions without reading/writing Three.js code manually.

> As a developer, I want to **add a new primitive shape** (box, sphere, cylinder, cone) to the current scene, position it visually, and then export the code to paste into the factory file.

> As a developer, I want to **copy the TypeScript code** for the current edited scene to the clipboard, so I can paste it directly into the factory function and not re-type any coordinates.

---

## Scope

### In Scope

| Feature | Description |
|---------|-------------|
| **Click-to-select** | Click a mesh in the 3D viewport to select it; a wireframe bounding box highlights it |
| **Position controls** | X/Y/Z sliders to move the selected mesh relative to its group origin |
| **Scale/dimension controls** | X/Y/Z scale sliders (effectively changes visual size since geometry is created once) |
| **Colour picker** | Hex input or swatch to change the selected mesh's `MeshLambertMaterial` colour |
| **Mesh list panel** | Sidebar list of all child meshes in the current group (name = geometry type + index) |
| **Add primitive** | Button to add Box / Sphere / Cylinder / Cone at origin, pre-selected for editing |
| **Export code** | "Copy TypeScript" button that generates factory-style code for all meshes |
| **Edit Mode toggle** | Dedicated toggle so normal view/orbit workflow is unaffected |

### Out of Scope (explicitly deferred)

| Feature | Reason |
|---------|--------|
| 3D transform gizmos (arrows in viewport) | Complex to implement correctly; sliders are sufficient |
| Undo/redo | Out of scope for dev tooling at this stage |
| Auto-save to disk | Security and complexity concerns; copy-paste is fine |
| Changing geometry segment counts | Sliders can't change subdivisions; edit factory directly |
| Multi-object scene arrangement | The viewer is single-object; this is a different tool scope |
| Rotation controls | Less commonly needed than position/scale; add later if needed |
| Texture/material type swapping | Objects use MeshLambertMaterial only; colour change is sufficient |

---

## Proposed Architecture

### Changes to `ObjectViewerRenderer.ts`

Add the following public methods:

```typescript
/**
 * Cast a ray from screen coordinates to select a child mesh of the current object.
 * Draws a BoxHelper bounding box around the selected mesh.
 * Returns the index of the selected mesh, or -1 if nothing was hit.
 */
selectMeshAt(screenX: number, screenY: number): number;

/**
 * Get a descriptor for every child mesh in the current group.
 * Used to populate the mesh list panel.
 */
getAllMeshDescriptors(): MeshDescriptor[];

/**
 * Set the position of the currently selected mesh.
 */
setSelectedMeshPosition(x: number, y: number, z: number): void;

/**
 * Set the scale of the currently selected mesh.
 */
setSelectedMeshScale(x: number, y: number, z: number): void;

/**
 * Set the colour of the currently selected mesh (hex number e.g. 0xff0000).
 */
setSelectedMeshColor(hex: number): void;

/**
 * Add a new primitive shape to the current group at origin.
 * Auto-selects the new mesh.
 */
addPrimitive(type: 'box' | 'sphere' | 'cylinder' | 'cone'): void;

/**
 * Generate TypeScript code for the current scene state.
 * Outputs factory-style code matching the existing factory file conventions.
 */
exportToTypeScript(): string;
```

New internal type:

```typescript
interface MeshDescriptor {
  index: number;
  geometryType: 'Box' | 'Sphere' | 'Cylinder' | 'Cone' | 'Other';
  position: THREE.Vector3;
  scale: THREE.Vector3;
  color: number;
}
```

**Click vs. orbit disambiguation**: Track `mousedown` position and only call `selectMeshAt()` on `mouseup` if the cursor moved less than 4px — i.e., it was a click, not a drag orbit.

---

### Changes to `ObjectViewerHarness.tsx`

```
Right panel additions (when Edit Mode is on):
┌──────────────────────────────────┐
│  🔧 Edit Mode  [ON/OFF toggle]   │
├──────────────────────────────────┤
│  SHAPES                          │
│  ▸ Sphere 0 (trunk foliage)     │ ← click to select
│  ▸ Cylinder 1 (trunk)           │
│  ▸ Box 2 (added by editor)      │
├──────────────────────────────────┤
│  SELECTED: Sphere 0              │
│  Position  X [-0.2] Y [0.67] Z  │
│  Scale     X [1.0]  Y [1.0]  Z  │
│  Colour    [████] #2A7A2A        │
├──────────────────────────────────┤
│  + Add Shape  [Box▾]  [Add]      │
├──────────────────────────────────┤
│  📋 Copy TypeScript Code         │
│  ✓ Copied!  (flash, 2 seconds)   │
└──────────────────────────────────┘
```

New React state needed:

```typescript
const [editMode, setEditMode] = useState(false);
const [selectedMeshIndex, setSelectedMeshIndex] = useState<number | null>(null);
const [meshDescriptors, setMeshDescriptors] = useState<MeshDescriptor[]>([]);
const [addShapeType, setAddShapeType] = useState<'box'|'sphere'|'cylinder'|'cone'>('box');
const [codeCopied, setCodeCopied] = useState(false);
```

---

## Export Code Format

The TypeScript export should produce code matching the existing factory style:

```typescript
// 🎨 Generated by Scene Editor
// Paste this into your factory function, replacing the existing mesh definitions.

const sphere_0_geo = new THREE.SphereGeometry(0.42, 8, 8);
const sphere_0_mat = new THREE.MeshLambertMaterial({ color: 0x2A7A2A });
const sphere_0 = new THREE.Mesh(sphere_0_geo, sphere_0_mat);
sphere_0.position.set(0, 0.80, 0);
sphere_0.scale.set(1.0, 1.0, 1.0);
sphere_0.castShadow = true;
group.add(sphere_0);

const cylinder_1_geo = new THREE.CylinderGeometry(0.085, 0.13, 0.55, 7);
const cylinder_1_mat = new THREE.MeshLambertMaterial({ color: 0x6B4B2A });
const cylinder_1 = new THREE.Mesh(cylinder_1_geo, cylinder_1_mat);
cylinder_1.position.set(0, 0.28, 0);
cylinder_1.scale.set(1.2, 1.0, 1.2);
cylinder_1.castShadow = true;
group.add(cylinder_1);
```

> Note: Since the editor uses `mesh.scale` to change dimensions rather than rebuilding geometry, the original geometry parameters are preserved in the export. If you scaled X and Z by 1.2 on the trunk, the export shows `scale.set(1.2, 1.0, 1.2)`. This is valid Three.js — the renderer will compute the correct bounding volume.

---

## Implementation Plan

When this task is picked up, implement in this order:

1. **`ObjectViewerRenderer` — raycasting + selection highlight**  
   Add `Raycaster`, `BoxHelper` for the selected mesh, and the `selectMeshAt()` method. Wire up click disambiguation in the existing mouse handler.

2. **`ObjectViewerRenderer` — position/scale/color setters**  
   Straightforward property sets on `mesh.position`, `mesh.scale`, and `(mesh.material as THREE.MeshLambertMaterial).color.setHex(hex)`.

3. **`ObjectViewerRenderer` — `getAllMeshDescriptors()`**  
   Traverse `currentObject.children`, filter for `THREE.Mesh`, inspect `.geometry.type` and `.material.color`.

4. **`ObjectViewerRenderer` — `addPrimitive()`**  
   Create a small default geometry + grey material, add to `currentObject`, call `selectMeshAt` equivalent to auto-select it.

5. **`ObjectViewerRenderer` — `exportToTypeScript()`**  
   Build a string from descriptors. Map geometry type back to constructor call with original params (stored in `userData` at creation time — add this to step 4's primitive creation).

6. **`ObjectViewerHarness` — Edit Mode UI**  
   Toggle, mesh list, selected mesh controls (sliders + colour input), Add Shape, Copy Code.

7. **Testing**  
   - Load oak tree, click trunk sphere → selection highlight appears, sliders reflect position
   - Drag a position slider → mesh moves in viewport
   - Add a box → appears at origin, gets selected
   - Copy code → paste into a factory, reload viewer, shape matches

---

## Files to Modify

```
src/renderer/ObjectViewerRenderer.ts        — Add editor methods (~150 lines)
src/components/dev/ObjectViewerHarness.tsx  — Add Edit Mode UI (~200 lines)
```

No new files required.

---

## Estimated Effort

**~4–6 hours** for a careful implementation with good TypeScript types and comments.

Complexity breakdown:
- Raycasting + BoxHelper highlight: ~1 hour
- Position/scale/color controls + setters: ~1 hour
- Mesh descriptor list + UI: ~1 hour
- Add primitive: ~30 minutes
- Export code generator: ~1 hour
- Polish + edge cases (empty group, non-Lambert materials, etc.): ~1 hour

---

## Known Edge Cases to Handle

| Case | Handling |
|------|---------|
| Object has no meshes (empty group) | Show "No shapes" in mesh list, disable controls |
| Mesh uses non-Lambert material (MeshBasicMaterial) | Colour picker still works via `.color.setHex()`; just don't assume Lambert |
| User adds shape then switches object | Warn "Unsaved changes — switching object will discard edits" with confirm dialog |
| Export when `currentObject` is null | Button disabled / grayed out |
| Fountain / pond animated objects | Editor works on the static geometry; animations may look odd while dragging sliders (acceptable for a dev tool) |
| Avatar mode | Disable Edit Mode toggle when viewing the avatar — avatar has complex builder that doesn't map to simple factory export |

---

## Confidence (Design): 8/10

**Met:**
- [x] Clear, bounded scope
- [x] Fits cleanly into existing architecture
- [x] No new dependencies (Three.js Raycaster and BoxHelper are already in Three.js core)
- [x] Export format matches existing factory conventions
- [x] Edge cases identified

**Concerns:**
- [ ] Click vs. drag disambiguation needs careful tuning (4px threshold is a guess)
- [ ] Geometry parameter recovery for export requires storing original params in `userData` at primitive creation time — easy to forget

**Deferred:**
- [ ] Transform gizmos (Phase 4+)
- [ ] Undo/redo (Phase 4+)
- [ ] Rotation controls (add if needed after initial implementation)
