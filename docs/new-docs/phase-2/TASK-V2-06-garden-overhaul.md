# TASK-V2-06: Garden Overhaul — Isometric View, Shop & Tree-Based Learning

**Status:** Not Started  
**Priority:** High — the garden is the emotional core of the app  
**Estimated Time:** 14–20 hours  
**Dependencies:** TASK-V2-01 (default tree exists), TASK-V2-03 (sundrop/gem economy)  
**Covers items:** #9 (garden shop), #11 (isometric/diagonal view), #12 (tree-based learning, remove learn tab)

---

## Problem

1. The current garden is a flat top-down view that looks lifeless — you can barely see the avatar or garden features
2. There's no shop to buy flowers, decorations, or new tree seeds
3. The "Learn" tab exists as a separate navigation item, but users should access lessons by clicking on a tree in their garden
4. The garden doesn't feel like a place you want to spend time in

---

## Goals

1. Switch to an isometric/diagonal camera angle (like Animal Crossing or the v1 Three.js garden)
2. Build a garden shop with categories: flowers, decorations, furniture, tree seeds
3. Remove the "Learn" tab — tap a tree to start a lesson for that tree's language/topic
4. Make the garden feel alive and inviting

---

## Part A: Isometric Camera

### Current Problem

A pure top-down view makes everything flat — you can't see the height of trees, the avatar is just a circle, and nothing has depth or personality.

### Solution

Switch the Three.js camera to an isometric-style orthographic camera at roughly 30-45 degrees.

```typescript
// Isometric camera setup
const CAMERA_ANGLE = Math.PI / 6; // 30 degrees from horizontal
const CAMERA_ROTATION = Math.PI / 4; // 45 degrees around Y axis

function setupIsometricCamera(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const frustumSize = 12;
  const aspect = renderer.domElement.width / renderer.domElement.height;
  
  const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100
  );
  
  // Position camera diagonally
  const distance = 20;
  camera.position.set(
    distance * Math.cos(CAMERA_ROTATION) * Math.cos(CAMERA_ANGLE),
    distance * Math.sin(CAMERA_ANGLE),
    distance * Math.sin(CAMERA_ROTATION) * Math.cos(CAMERA_ANGLE)
  );
  camera.lookAt(0, 0, 0);
  
  return camera;
}
```

**Visual result:**
- Trees have visible trunks and canopies
- Avatar is visible from an angle (can see their hat, body, face direction)
- Shadows give depth cues
- The garden looks like a real place, not a map

### Camera Controls

- **Pinch zoom**: Zoom in/out on the garden (handle this on the Three.js canvas, NOT the browser viewport — prevent default on touch events)
- **Drag**: Pan the camera to look around the garden
- **Tap on object**: Select it (tree, decoration, avatar)
- **Double-tap on ground**: Avatar walks to that position

```typescript
// Prevent browser-level pinch zoom, handle in Three.js
canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length >= 2) {
    e.preventDefault(); // Prevent browser zoom
    handlePinchZoom(e); // Handle in Three.js
  }
}, { passive: false });
```

---

## Part B: Tree-Based Learning (Remove Learn Tab)

### Current Problem

There's a separate "Learn" tab in the navigation. But the design intent is that trees ARE the lessons — you tap a tree to start learning.

### Solution

1. **Remove the "Learn" tab** from bottom navigation
2. **Tap a tree → open lesson panel** for that tree's topic
3. Each tree represents a language/topic learning path
4. The tree's growth stage reflects progress

### Tree Tap Interaction

When user taps a tree in the garden:

```
┌─────────────────────────────────────────┐
│                                         │
│     🌿 My German Tree                  │
│     Level: I Know Some Words            │
│     Progress: ████░░░░░░ 40%           │
│                                         │
│     Last lesson: 2 days ago             │
│     Tree health: 💚💚💚💛🤍           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Start Next Lesson 🎓       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Water This Tree 💧 (5 ☀️)  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Review Past Lessons 📖     │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Avatar Walks to Tree

When the user taps a tree:
1. The avatar walks toward the tree (pathfinding along the garden grid)
2. When they arrive, the tree info panel slides up
3. The walk animation gives a sense of physicality

### Tree Growth Stages

Each tree has visible growth stages in the 3D scene:

| Stage | Visual | Triggers |
|-------|--------|----------|
| `seed` | Small mound of dirt with a seed | Tree just planted |
| `sprout` | Tiny green shoot | First lesson completed |
| `sapling` | Small tree trunk with a few leaves | 5 lessons completed |
| `young_tree` | Medium tree with canopy forming | 15 lessons completed |
| `mature_tree` | Full tree | 30 lessons completed |
| `flowering` | Full tree with flowers/fruit | 50+ lessons + high health |

Tree health affects appearance:
- Healthy (80-100%): Vibrant green, optional sparkle particles
- Moderate (50-79%): Slightly duller green
- Thirsty (25-49%): Yellowing leaves, drooping
- Wilting (0-24%): Brown, leaves falling (but NEVER dies — that would be cruel)

---

## Part C: Garden Shop

### Shop UI

**Create `src/lib/components/garden/GardenShop.svelte`:**

Accessible via a shop button (🏪) in the garden HUD, or by tapping a shop sign in the garden.

```
┌─────────────────────────────────────────┐
│  🌿 Garden Shop              💛 45 ☀️  │
│                               💎 12    │
├─────────────────────────────────────────┤
│  [Trees] [Flowers] [Deco] [Furniture]  │
├─────────────────────────────────────────┤
│                                         │
│  🌸 Cherry Blossom  ─── 40 ☀️  [Buy]  │
│  Pretty pink flowers in spring          │
│                                         │
│  🌲 Pine Tree  ─────── 25 ☀️  [Buy]   │
│  Stays green all year round             │
│                                         │
│  🌳 Oak Tree  ──────── 30 ☀️  [Buy]   │
│  A strong, classic tree                 │
│                                         │
│  🍁 Maple  ─────────── 35 ☀️  [Buy]   │
│  Beautiful autumn colours               │
│                                         │
│                                ... more │
└─────────────────────────────────────────┘
```

### Shop Categories & Items

```typescript
const SHOP_CATALOGUE = {
  trees: [
    // Trees that can be associated with a new learning path
    { id: 'cherry', name: 'Cherry Blossom', cost: 40, currency: 'sundrops', emoji: '🌸', description: 'Pretty pink flowers in spring' },
    { id: 'pine', name: 'Pine Tree', cost: 25, currency: 'sundrops', emoji: '🌲', description: 'Stays green all year round' },
    { id: 'oak', name: 'Oak Tree', cost: 30, currency: 'sundrops', emoji: '🌳', description: 'A strong, classic tree' },
    { id: 'maple', name: 'Maple', cost: 35, currency: 'sundrops', emoji: '🍁', description: 'Beautiful autumn colours' },
    { id: 'willow', name: 'Willow', cost: 45, currency: 'sundrops', emoji: '🌿', description: 'Graceful weeping branches' },
  ],
  flowers: [
    { id: 'rose', name: 'Rose Bush', cost: 15, currency: 'sundrops', emoji: '🌹' },
    { id: 'sunflower', name: 'Sunflower', cost: 12, currency: 'sundrops', emoji: '🌻' },
    { id: 'tulip', name: 'Tulip Patch', cost: 10, currency: 'sundrops', emoji: '🌷' },
    { id: 'lavender', name: 'Lavender', cost: 10, currency: 'sundrops', emoji: '💜' },
    { id: 'daisy', name: 'Daisies', cost: 8, currency: 'sundrops', emoji: '🌼' },
  ],
  decorations: [
    { id: 'bench', name: 'Garden Bench', cost: 20, currency: 'gems', emoji: '🪑' },
    { id: 'lantern', name: 'Lantern', cost: 15, currency: 'gems', emoji: '🏮' },
    { id: 'fountain', name: 'Fountain', cost: 40, currency: 'gems', emoji: '⛲' },
    { id: 'pond', name: 'Pond', cost: 30, currency: 'gems', emoji: '💧' },
    { id: 'sign', name: 'Sign Post', cost: 10, currency: 'gems', emoji: '🪧' },
    { id: 'mushroom', name: 'Mushrooms', cost: 5, currency: 'gems', emoji: '🍄' },
    { id: 'hedge', name: 'Hedge', cost: 8, currency: 'gems', emoji: '🌿' },
    { id: 'statue', name: 'Garden Statue', cost: 50, currency: 'gems', emoji: '🗿' },
    { id: 'bird_bath', name: 'Bird Bath', cost: 25, currency: 'gems', emoji: '🐦' },
  ],
  furniture: [
    { id: 'swing', name: 'Swing', cost: 35, currency: 'gems', emoji: '🎠' },
    { id: 'hammock', name: 'Hammock', cost: 30, currency: 'gems', emoji: '🛏️' },
    { id: 'picnic_table', name: 'Picnic Table', cost: 25, currency: 'gems', emoji: '🧺' },
    { id: 'campfire', name: 'Campfire', cost: 20, currency: 'gems', emoji: '🔥' },
  ],
};
```

### Placement Mode

After buying an item:
1. Shop closes
2. Garden enters "placement mode"
3. The item follows the user's finger/cursor on a grid
4. Valid positions show green highlight, invalid (occupied) show red
5. Tap to confirm placement
6. Satisfying "plop" animation and sound
7. Item appears in garden

For trees specifically: after placement, a modal asks "What would you like to learn with this tree?" → select a language/subject → tree becomes a learning path.

### Garden Persistence

All placed items save to the DB:

```
garden_items {
  id: string
  user_id: relation → users
  item_type: string (from catalogue id)
  category: 'tree' | 'flower' | 'decoration' | 'furniture'
  position_x: number (grid position)
  position_z: number (grid position)
  rotation: number (0, 90, 180, 270)
  metadata: json (for trees: language, level, health, stage)
  placed_at: datetime
}
```

---

## Part D: Garden Enhancements

### Garden HUD

Persistent overlay on the garden view:

```
┌─────────────────────────────────────────┐
│  ☀️ 128    💎 27         ⚙️  │ 🏪 Shop │
└─────────────────────────────────────────┘
```

### Bottom Navigation (Updated)

Remove "Learn" tab. New navigation:

```
┌─────────┬──────────┬──────────┬──────────┐
│ 🌳      │ 👤       │ 🏆       │ ⚙️      │
│ Garden  │ Profile  │ Quests   │ Settings │
└─────────┴──────────┴──────────┴──────────┘
```

"Quests" is a future feature placeholder — for now it can show daily goals like "Complete 1 lesson", "Get a 3-streak", "Water a tree".

### Ambient Life

To make the garden feel alive:
- **Butterflies**: Small sprites that drift randomly across the garden
- **Particle effects**: Subtle floating pollen/dust motes in the air
- **Shadows**: Dynamic shadows from the isometric light source
- **Day/night**: Optional — garden lighting matches local time of day

---

## Testing Checklist

- [ ] Isometric camera renders at correct angle
- [ ] Avatar visible from isometric perspective (can see hat, body)
- [ ] Trees show correct growth stage visuals
- [ ] Tree health affects visual appearance
- [ ] Pinch zoom works on garden canvas (not browser viewport)
- [ ] Drag to pan works
- [ ] Tap tree → avatar walks to tree → info panel opens
- [ ] "Start Lesson" from tree panel → generates and starts lesson
- [ ] "Learn" tab removed from navigation
- [ ] Shop opens, shows categories
- [ ] Shop shows correct currency balance
- [ ] Can buy item → currency deducted
- [ ] Insufficient currency → shows message, doesn't purchase
- [ ] Placement mode works: item follows finger, snaps to grid
- [ ] Invalid placement blocked (occupied tile)
- [ ] Placed items persist across page refreshes
- [ ] Buying a tree prompts for language/topic association
- [ ] Garden HUD shows sundrop and gem counts
- [ ] All shop text translated (en/fr)

---

## Files Created/Modified

**New files:**
- `src/lib/components/garden/GardenShop.svelte`
- `src/lib/components/garden/PlacementMode.svelte`
- `src/lib/components/garden/TreeInfoPanel.svelte`
- `src/lib/components/garden/GardenHUD.svelte`
- `src/lib/services/gardenService.ts` — item placement, persistence
- `src/lib/services/shopService.ts` — purchase logic, catalogue

**Modified files:**
- Garden renderer → isometric camera, ambient effects
- Camera controller → pinch zoom on canvas, drag to pan
- Avatar renderer → ensure it looks good from isometric angle
- Tree renderer → growth stages, health-based appearance
- Navigation → remove Learn tab, add Quests placeholder
- Bottom nav component → updated tabs
