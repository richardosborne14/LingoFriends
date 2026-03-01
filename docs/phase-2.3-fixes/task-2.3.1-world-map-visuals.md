# Task 2.3.1 — World Map Visuals

**Status:** ✅ COMPLETE  
**Commit:** c9da917

---

## Problem

The garden scene had two visual issues:

1. **Grey blob cloud** — one cloud (x=9, y=9, z=-8) appeared grey instead of white because `MeshLambertMaterial` applies directional shading; faces turned away from the sun rendered dark.
2. **Garden floating in sky** — below and beyond the fence, the sky-blue scene background (`0x87CEEB`) was visible, making the garden appear to float rather than sit in a meadow.

---

## Fix

### 1. Cloud material → MeshBasicMaterial

**File:** `src/renderer/AtmosphereBuilder.ts` — `addDaytimeClouds()`

Changed the cloud sphere material from `MeshLambertMaterial` to `MeshBasicMaterial`:

```typescript
// Before — shading makes shadowed faces go grey:
const material = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });

// After — unlit, always pure white regardless of sun angle:
const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
```

`MeshBasicMaterial` is correct for clouds because they scatter light diffusely and appear uniformly bright in daytime. Night clouds still use `MeshLambertMaterial` (`0xBBCCDD`) as intended.

### 2. Outer terrain plane

**File:** `src/renderer/AtmosphereBuilder.ts` — new `addOuterTerrain()` method  
**Called from:** `buildDaytime()` (before fence and border)

A 50×50 world-unit `PlaneGeometry` (meadow green `0x4A7C2F`) placed at `y=-0.06`:

- Covers far beyond the fence (fence at ±6, plane extends to ±25) — well outside any camera frustum crop
- Sits 0.06 units below tile top surface — no z-fighting with the dark border slab
- `MeshLambertMaterial` so it picks up sun + hemisphere light warmth
- `receiveShadow: true` for fence post shadows

```typescript
private static addOuterTerrain(scene: THREE.Scene): void {
  const terrainMaterial = new THREE.MeshLambertMaterial({ color: 0x4A7C2F });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), terrainMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0, -0.06, 0);
  plane.receiveShadow = true;
  scene.add(plane);
}
```

---

## Result

- Clouds render as clean white blobs across all viewing angles
- The garden sits on a meadow that fills the full camera viewport, no sky bleed-through

---

## Confidence: 9/10

**Met:**
- [x] Grey cloud fixed (MeshBasicMaterial)
- [x] Outer terrain fills gap beyond fence
- [x] No z-fighting (y offset correct)
- [x] TypeScript compiles cleanly

**Concerns:**
- [ ] Cloud at x=9 extends slightly into scene bounds — could be pushed further back in a future visual polish pass
