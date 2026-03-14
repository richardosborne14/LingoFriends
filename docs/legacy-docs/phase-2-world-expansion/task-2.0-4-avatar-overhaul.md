# Task 2.0.4: Avatar Overhaul

**Status:** 🔲 Not started  
**Phase:** 2.0 — Wave 1 (critical path)  
**Dependencies:** None  
**Estimated Time:** 10–14 hours  
**Priority:** High — current avatars have visible defects and hurt the app's visual credibility

---

## Problem Statement

The current procedural avatars built from Three.js primitives have several issues:

1. **Rectangles on sides of heads** — The "sideburn" box meshes don't blend with the spherical head, creating visible rectangular protrusions
2. **Body proportions** are awkward — too blocky and stiff
3. **Eyes** are flat planes that look pasted-on rather than integrated
4. **Overall quality** doesn't match the charm level needed for a kids' app

What works well and should be **kept**:
- Hair styles and colours (good variety)
- Accessories (hats, etc.)
- Shirt/pants colour customisation
- The overall chibi/toon material approach
- Walk animation bob and idle breathing

What needs to be **redesigned**:
- Head shape and construction
- Eye geometry and expressiveness
- Sideburn/face framing (the rectangle bug)
- Body shape and proportions
- Overall silhouette and charm factor

Additionally, avatars in the lesson encounter screens (EncounterView) need to be **larger** so mouth animations and expressions are more visible during NPC speech.

---

## Objectives

1. Redesign the `buildCharacter()` function with improved geometry
2. Fix the head rectangle artifact
3. Create rounder, more expressive faces
4. Improve body proportions (cuter chibi style)
5. Maintain all existing customisation options (hair, hat, colours, skin tone)
6. Maintain all existing animations (walk bob, idle breathing, eye blink, mouth sync)
7. Increase avatar scale in EncounterView for better visibility
8. Keep the procedural approach — no external model files

---

## Design Direction

**Target aesthetic:** Somewhere between Animal Crossing villagers and Minecraft with shaders — cute, rounded, recognisable, but built from code.

### Head Redesign

**Current problem:** Head is a sphere with box meshes for sideburns. The boxes have sharp edges that are visible as rectangles.

**Fix:**
- Replace the head with a slightly squashed sphere (wider than tall) — `SphereGeometry` with `widthSegments: 24, heightSegments: 16` for smoothness
- Remove box-based sideburns entirely
- If facial framing is desired, use subtle colour variation on the head sphere itself (via vertex colours or a second slightly-larger sphere segment) rather than separate geometry
- Alternatively, use a `LatheGeometry` for the head to create a custom profile that's slightly flatter at the sides

```typescript
// Smoother head with custom proportions
const headGeometry = new THREE.SphereGeometry(0.38, 24, 16);
headGeometry.scale(1.0, 0.95, 0.9); // Slightly wider than deep
```

### Eye Redesign

**Current problem:** Eyes are flat circular planes placed on the head surface.

**Fix:**
- Use small sphere geometry for eyes (gives slight 3D pop)
- Add a white sclera sphere with a smaller coloured iris sphere and tiny black pupil sphere
- Slight inset into the head surface so they don't float
- Eye sockets: subtle dimples created by displacing vertices on the head mesh, or darker-shaded small spheres behind the eyes

```typescript
// Eye assembly
const eyeGroup = new THREE.Group();

// Sclera (white of eye)
const sclera = new THREE.Mesh(
  new THREE.SphereGeometry(0.065, 12, 8),
  new THREE.MeshToonMaterial({ color: 0xFFFFFF })
);

// Iris
const iris = new THREE.Mesh(
  new THREE.SphereGeometry(0.04, 10, 8),
  new THREE.MeshToonMaterial({ color: eyeColor })
);
iris.position.z = 0.035; // Push forward

// Pupil
const pupil = new THREE.Mesh(
  new THREE.SphereGeometry(0.02, 8, 6),
  new THREE.MeshToonMaterial({ color: 0x111111 })
);
pupil.position.z = 0.055;

eyeGroup.add(sclera, iris, pupil);
```

### Body Redesign

**Current problem:** Body is too rectangular/blocky.

**Fix:**
- Use a rounded box or capsule shape for the torso
- Slight taper: wider at shoulders, narrower at waist
- Arms and legs as rounded cylinders with spherical joints
- Overall shorter proportions: big head (40% of height), small body (60%)

```typescript
// Torso: Rounded box using CapsuleGeometry alternative
// Since THREE.CapsuleGeometry may not be available in r128,
// use a cylinder with sphere caps
const torso = new THREE.Group();
const torsoBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.28, 0.24, 0.4, 12),
  shirtMaterial
);
const torsoTop = new THREE.Mesh(
  new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  shirtMaterial
);
torsoTop.position.y = 0.2;
const torsoBottom = new THREE.Mesh(
  new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
  shirtMaterial
);
torsoBottom.position.y = -0.2;
torso.add(torsoBody, torsoTop, torsoBottom);
```

**IMPORTANT:** The project uses Three.js r128. `CapsuleGeometry` was introduced in r142. Use alternatives: cylinder + sphere caps, or `LatheGeometry` with a custom profile, or `ExtrudeGeometry` with a rounded rectangle shape.

### Proportions Guide

```
        ┌─────┐
        │HEAD │  ← 40% of total height
        │ ◉ ◉ │     Slightly squashed sphere
        │  ◡  │     Width > depth
        └──┬──┘
        ┌──┴──┐
        │TORSO│  ← 35% of total height
        │     │     Rounded cylinder, tapers down
        └──┬──┘
        ┌──┴──┐
        │LEGS │  ← 25% of total height
        └─────┘     Short stubby cylinders
```

Total avatar height: ~1.2 world units (adjust for encounter view scaling)

### Mouth Redesign

The current mouth for TTS lip sync should be improved:
- Use a small sphere or torus that scales on the Y axis for open/closed
- Position slightly below centre of face
- When speaking: scale Y from 0.3 (closed) to 1.0 (open) driven by audio amplitude

---

## Step-by-Step Implementation

### Step 1 — Redesign Head Geometry
- Remove old head + sideburn boxes
- Create smooth sphere head with proper proportions
- Test with all skin tone options

### Step 2 — Redesign Eyes
- Replace flat planes with 3D eye assemblies
- Position eyes on head with correct depth
- Verify blink animation still works (scale Y to 0)
- Add slight random "look around" animation for idle state

### Step 3 — Redesign Body
- Replace box torso with rounded shape
- Add arm stubs (small rounded cylinders)
- Improve leg proportions
- Verify walk animation bob still looks correct

### Step 4 — Reconnect Hair and Accessories
- Verify all hair styles attach correctly to new head shape
- Adjust hat positions for new head dimensions
- Test all colour combinations

### Step 5 — Reconnect Animations
- Walk cycle (position.y bounce)
- Idle breathing (subtle scale oscillation)
- Eye blink (sclera scale.y → 0)
- Mouth sync (scale driven by audio amplitude)
- Head/body rotation toward camera/direction of travel

### Step 6 — Increase EncounterView Avatar Scale
- **File:** `src/components/lesson/EncounterView.tsx` (or the Three.js scene within it)
- Increase avatar group scale by ~30-40%
- Adjust camera framing to accommodate larger avatars
- Ensure both user avatar and NPC avatar are clearly visible
- Mouth movements should be clearly readable at new size

### Step 7 — Update Avatar Customisation Preview
- If there's an avatar customisation screen, update it to use the new geometry
- Preview should match what appears in garden and lessons

---

## Animation Specifications

### Walk Cycle
```typescript
// Bouncing walk (existing — verify still works)
avatar.position.y = baseY + Math.abs(Math.sin(time * 14)) * 0.032;
avatar.rotation.y = Math.atan2(dx, dz); // Face direction of travel
```

### Idle Breathing
```typescript
// Subtle body scale oscillation
const breathe = 1.0 + Math.sin(time * 2) * 0.01;
avatar.torso.scale.set(breathe, 1.0 / breathe, breathe);
```

### Eye Blink
```typescript
// Random blink every 2-5 seconds
if (timeSinceLastBlink > nextBlinkTime) {
  // Close eyes
  leftEye.scale.y = 0.1;
  rightEye.scale.y = 0.1;
  // Open after 150ms
  setTimeout(() => {
    leftEye.scale.y = 1;
    rightEye.scale.y = 1;
  }, 150);
  nextBlinkTime = 2 + Math.random() * 3;
}
```

### Mouth Sync (for EncounterView NPC)
```typescript
// Driven by audio amplitude from TTS playback
const amplitude = getAudioAmplitude(); // 0-1
mouth.scale.y = 0.3 + amplitude * 0.7;
```

---

## Testing Checklist

- [ ] Head is smooth — no rectangular artifacts
- [ ] Eyes have 3D depth, not flat
- [ ] Body proportions feel chibi/cute
- [ ] All skin tones render correctly
- [ ] All hair styles attach to new head
- [ ] All hat styles position correctly on new head
- [ ] Walk animation looks natural
- [ ] Idle breathing is subtle but visible
- [ ] Eye blink works with new eye geometry
- [ ] Mouth sync visible in EncounterView
- [ ] Avatars in EncounterView are 30-40% larger than before
- [ ] Customisation preview matches garden avatar
- [ ] NPC avatars (random generation) look good
- [ ] Performance: no framerate drop from more complex geometry
- [ ] Works on mobile (polycount budget: <2000 triangles per avatar)

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/renderer/objects/characterBuilder.ts` | Complete rewrite of avatar geometry |
| `src/renderer/objects/characterAnimations.ts` | May need to extract/update animation code |
| `src/components/lesson/EncounterView.tsx` | Scale up avatar, adjust camera |
| `src/services/npcGenerator.ts` | Verify NPC generation still works with new system |
| `src/components/avatar/AvatarCustomiser.tsx` | Update preview if exists |

---

## Notes for Implementation

- **Polycount budget:** Keep each avatar under 2000 triangles. The garden may show 3-5 avatars simultaneously (user + NPCs), and the encounter view shows 2. Total scene budget of ~10k avatar triangles should be fine.
- **Material consistency:** Continue using `MeshToonMaterial` for the cel-shaded look. Use `gradientMap` with a 3-step gradient for nice toon shading.
- **Test on mobile EARLY** — complex geometry can tank framerate on low-end phones
- **Keep the old `buildCharacter` as `buildCharacterLegacy`** until the new one is verified — don't delete the working code before the replacement is solid
- The avatar system is used by: garden renderer, encounter view, path view (Task 2.0.9), NPC visitors (Task 2.0.10), and world map (Task 2.0.11). All will benefit from this overhaul.
