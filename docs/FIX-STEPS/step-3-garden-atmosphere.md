# Step 3: Garden Atmosphere (Match GardenV2.jsx)

**Priority:** 🟡 HIGH
**Estimated effort:** 3-4 hours
**Depends on:** Step 1 (renderer must work first)

---

## Goal

Transform the 3D garden from a bright, generic scene into the magical evening garden from `docs/phase-1.1/GardenV2.jsx`. The reference prototype is the visual spec — copy its values directly.

---

## What GardenV2.jsx Has (That We Don't)

### Background & Fog
```javascript
scene.background = new THREE.Color(0x080F1C);  // Deep night sky
scene.fog = new THREE.FogExp2(0x080F1C, 0.025);
```
**Current:** Bright greenish background, no fog.

### Lighting
```javascript
// Very dim ambient
ambientLight = new THREE.AmbientLight(0x5566AA, 0.16);

// Low golden sun (barely there)
directionalLight = new THREE.DirectionalLight(0xFF9944, 0.32);
directionalLight.position.set(5, 6, 3);

// Soft fill from opposite side
fillLight = new THREE.DirectionalLight(0x6688CC, 0.12);
fillLight.position.set(-5, 4, -5);

// Moon point light
moonLight = new THREE.PointLight(0xAABBFF, 0.3, 20);
moonLight.position.set(8, 10, -5);
```
**Current:** Hemisphere light + bright ambient + strong directional. Way too bright.

### Stars (55 points)
```javascript
for (let i = 0; i < 55; i++) {
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 4, 4),
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
  );
  star.position.set(
    (Math.random() - 0.5) * 30,
    8 + Math.random() * 6,
    (Math.random() - 0.5) * 30
  );
  scene.add(star);
}
```
**Current:** No stars.

### Moon + Glow
```javascript
// Moon sphere
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xEEEEDD })
);
moon.position.set(8, 10, -5);

// Moon glow (larger transparent sphere)
const moonGlow = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 16, 16),
  new THREE.MeshBasicMaterial({
    color: 0xAABBFF,
    transparent: true,
    opacity: 0.15,
  })
);
moonGlow.position.copy(moon.position);
```
**Current:** No moon.

### Clouds (3 dark wisps)
```javascript
for (let i = 0; i < 3; i++) {
  const cloud = new THREE.Mesh(
    new THREE.SphereGeometry(1.5 + Math.random(), 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0x1A2035,
      transparent: true,
      opacity: 0.4,
    })
  );
  cloud.scale.set(2, 0.4, 1);
  cloud.position.set(-5 + i * 8, 9 + Math.random() * 2, -3 + Math.random() * 4);
}
```
**Current:** No clouds.

### Ground Tiles (Checkered + Path)
```javascript
const GRID_SIZE = 12;
const TILE_WIDTH = 1;

// Two green shades for grass
const GRASS_DARK = 0x2D5A1E;
const GRASS_LIGHT = 0x3A6B2A;

// Brown shades for dirt path
const PATH_DARK = 0x5C4033;
const PATH_LIGHT = 0x6B4F3A;

// Cross-shaped path through center
function isPathTile(x, z) {
  const cx = Math.floor(GRID_SIZE / 2);
  const cz = Math.floor(GRID_SIZE / 2);
  return x === cx || x === cx - 1 || z === cz || z === cz - 1;
}
```
**Current:** Simple uniform green tiles.

### Fence
```javascript
// Posts at every 2 tiles along perimeter, connected by rails
// Post: cylinder (0.06 radius, 0.5 tall, brown 0x5C3A1E)
// Rail: box (0.03 × 0.03 × spacing, brown 0x4A2E15) at 0.2 and 0.4 height
```
**Current:** No fence.

### Green Border
```javascript
// Flat green border slightly below and larger than the tile grid
const border = new THREE.Mesh(
  new THREE.BoxGeometry(GRID_SIZE + 1, 0.05, GRID_SIZE + 1),
  new THREE.MeshLambertMaterial({ color: 0x1A4010 })
);
border.position.set(GRID_SIZE/2 - 0.5, -0.05, GRID_SIZE/2 - 0.5);
```
**Current:** No border.

---

## Implementation Approach

### Option A: Add atmosphere methods to GardenRenderer (Recommended)

Add a `setupAtmosphere()` method called during initialization:

```typescript
private setupAtmosphere(): void {
  // Replace current lighting with GardenV2 values
  // Add stars, moon, clouds, fence, checkered ground
}
```

### Option B: Create separate AtmosphereBuilder

If the renderer is getting too large, extract into `src/renderer/AtmosphereBuilder.ts`.

---

## Files to Modify

1. `src/renderer/GardenRenderer.ts` — Replace lighting, background, add atmosphere
2. Possibly new: `src/renderer/AtmosphereBuilder.ts` (if extracting)

## Files to NOT Modify

- `docs/phase-1.1/GardenV2.jsx` — This is the reference, don't change it

---

## Testing Checklist

- [ ] Dark evening sky background
- [ ] Stars visible in the sky
- [ ] Moon with glow effect visible
- [ ] Dark clouds floating
- [ ] Fog gives depth
- [ ] Checkered grass tiles (two green shades)
- [ ] Cross-shaped dirt path through center
- [ ] Fence with posts and rails around perimeter
- [ ] Green border beneath the garden
- [ ] Learning trees still visible and clickable
- [ ] Avatar still visible and walks correctly
- [ ] Performance acceptable (target 60fps on desktop, 30fps mobile)
