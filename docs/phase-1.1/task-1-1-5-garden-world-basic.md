# Task 1.1.5: Garden World (Basic)

**Status:** ✅ Complete
**Phase:** A (Core Mechanics)
**Dependencies:** Task 1.1.4 (Path View)
**Estimated Time:** 6-8 hours
**Completed:** 2026-02-15

---

## Objective

Build the explorable garden world — the new home screen of the app. This is the most complex component, featuring avatar movement, tree interactions, and proximity detection. Start with a CSS/HTML version; PixiJS upgrade comes in Phase D.

---

## Deliverables

### Files to Create
- `src/components/garden/GardenWorld.tsx` — Main garden container
- `src/components/garden/GardenTree.tsx` — Tree sprite with health states
- `src/components/garden/GardenAvatar.tsx` — Player avatar sprite
- `src/components/garden/InteractionPanel.tsx` — Popup when near a tree
- `src/components/garden/MobileDpad.tsx` — Touch controls for mobile

---

## Visual Design

```
┌────────────────────────────────────────────────────────────┐
│  🦊 LingoFriends              🔥 3    ☀️ 42               │  ← Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│     🌻                              🌼                     │
│        ┌───────────────────────────────┐                  │
│        │   🌳 Food & Cooking    🐝      │                  │
│        │   🍕 85% healthy [💧✨]        │                  │
│        │   [📖 Open Path] [🎀 Dec] [💌 Gift] │              │
│        └───────────────────────────────┘                  │
│                     🐦                                      │
│    🌳 Animals                  🌳 Space                    │
│    🐾 90% healthy              🚀 35% 🆘                   │
│                                                            │
│              🦊 ← Avatar walking                           │
│                                                            │
│        🌳 Sports                                          │
│        ⚽ 60% 💧                                          │
│                                                            │
│  🌷        🌊 Pond 🐟              🍄                      │
│                                                            │
├────────────────────────────────────────────────────────────┤
│        🌳 Garden  │  🗺️ Path  │  👥 Friends               │  ← Tab Bar
└────────────────────────────────────────────────────────────┘
```

---

## Key Concept: The Garden IS Home

- **No separate dashboard or menu**
- User lands in the garden after login
- All skill paths are represented as trees
- Empty plots show where new trees can be planted
- Walking near a tree shows interaction panel

---

## Component Specifications

### 1. GardenWorld.tsx

**Props:**
```typescript
interface GardenWorldProps {
  trees: UserTree[];
  avatar: PlayerAvatar;
  onOpenPath: (tree: UserTree) => void;
}
```

**State:**
```typescript
interface GardenState {
  avatarPosition: { x: number; y: number };
  facing: 'up' | 'down' | 'left' | 'right';
  nearTree: UserTree | null;
}
```

**Behavior:**
1. Render garden background (grass, paths, pond, decorations)
2. Render trees at their positions
3. Render avatar at current position
4. Handle keyboard movement (arrow keys, WASD)
5. Detect proximity to trees (~70px)
6. Show/hide interaction panel based on proximity

**Garden Dimensions:**
- Width: 650px (or viewport width if smaller)
- Height: 520px
- Scrollable/follows avatar

**Reference:** See prototype `GardenView` component

---

### 2. GardenTree.tsx

**Props:**
```typescript
interface GardenTreeProps {
  tree: UserTree;
  isNear: boolean;
  onOpenPanel: () => void;
}
```

**Visual States:**
| Tree Status | Appearance |
|-------------|------------|
| Seed | 🌱 Small seedling, greyed out |
| Growing | MiniTree with partial growth |
| Bloomed | Full tree with blossoms |
| Low health | Yellowing/bare branches |
| Dying | Nearly bare, urgent indicator |

**Health Indicators:**
- **80%+**: Green badge "✓ Healthy"
- **40-79%**: Amber badge "💧 Thirsty"
- **<40%**: Red badge "🆘 Dying!" (bouncing)

---

### 3. GardenAvatar.tsx

**Props:**
```typescript
interface GardenAvatarProps {
  avatar: PlayerAvatar;
  position: { x: number; y: number };
  facing: 'up' | 'down' | 'left' | 'right';
}
```

**Behavior:**
- Smooth position interpolation
- Direction change flips sprite (left/right)
- Shadow underneath
- Walking animation (Phase D)

**Movement Speed:**
- 5 pixels per frame at 60fps
- ~300 pixels per second

---

### 4. InteractionPanel.tsx

**Props:**
```typescript
interface InteractionPanelProps {
  tree: UserTree;
  position: { x: number; y: number };
  onOpenPath: () => void;
  onDecorate: () => void;
  onGift: () => void;
  onClose: () => void;
}
```

**Actions by Tree State:**
| Tree State | Primary Action | Secondary Actions |
|------------|----------------|-------------------|
| Healthy | 📖 Open Path | 🎀 Decorate, 💌 Gift |
| Thirsty | 💧 Refresh Lesson | 🎀 Decorate, 💌 Gift |
| Dying | 🆘 Refresh NOW! | Use friend's gift |
| Growing | 📖 Continue Path | — |
| Empty plot | 🌱 Plant Seed | — |

**Visual:**
- Speech bubble style with arrow pointing to tree
- White background, blurred backdrop
- Slides in/out with animation

---

### 5. MobileDpad.tsx

**Props:**
```typescript
interface MobileDpadProps {
  onMove: (direction: 'up' | 'down' | 'left' | 'right') => void;
}
```

**Behavior:**
- Show on touch devices
- 4-way directional pad
- Tap to move 20 pixels in that direction
- Position: bottom-center, above tab bar

**Visual:**
```
      ▲
   ◀     ▶
      ▼
```

---

## Movement System

### Keyboard Controls
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
      e.preventDefault();
      keysPressed.current.add(e.key);
    }
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
    keysPressed.current.delete(e.key);
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, []);

// Game loop updates position based on keysPressed
```

### Proximity Detection
```typescript
useEffect(() => {
  const nearestTree = trees.reduce((nearest, tree) => {
    const dx = avatarPosition.x - tree.position.x;
    const dy = avatarPosition.y - tree.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < INTERACTION_DISTANCE && (!nearest || distance < nearest.dist)) {
      return { tree, dist: distance };
    }
    return nearest;
  }, null);
  
  setNearTree(nearestTree?.tree || null);
}, [avatarPosition, trees]);
```

---

## Garden Elements (Background)

**Static Elements:**
- Grass terrain (gradient with variation)
- Dirt paths connecting tree plots
- Tree plots (fixed positions)
- Pond (decorative)
- Decorations (flowers, rocks, mushrooms)

**Decorative Elements (Phase C):**
- User-placed items (hedges, benches, lanterns)
- Friend gifts (water drops, sparkles)

**Vignette:**
- Subtle darkening at edges for depth

---

## Testing Checklist

### Movement
- [x] Avatar moves with arrow keys
- [x] Avatar moves with WASD
- [x] Avatar faces direction of movement
- [x] Avatar stays within garden bounds
- [x] Movement is smooth (no jitter)

### Proximity
- [x] Interaction panel appears when near tree
- [x] Panel shows correct actions for tree state
- [x] Panel disappears when moving away
- [x] Panel doesn't show for empty plots (or shows "Plant" option)

### Tree Display
- [x] Trees show correct health states
- [x] Health indicators display correctly
- [x] Decorations appear on trees
- [x] Gift indicators visible

### Mobile
- [x] D-pad appears on touch devices
- [x] D-pad moves avatar correctly
- [x] D-pad doesn't interfere with scrolling

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Garden renders with all elements | [x] |
| Avatar movement works smoothly | [x] |
| Proximity detection triggers panels | [x] |
| Panel actions correct per state | [x] |
| Mobile D-pad functional | [x] |

---

## Reference

- **GAME_DESIGN.md** — Section 7 (Garden World)
- **CLINE_GAME_IMPLEMENTATION.md** — Step 7 Phase A
- **prototype-v4-final.jsx** — Components: `GardenView`, `dpadStyle`

---

## Notes for Future Tasks

- Three.js renderer replaces CSS/HTML (Task 1.1.14)
- Garden shop and decoration placement (Task 1.1.17)
- Gift indicators from friends (Task 1.1.11)
- Sound effects for walking (Phase D)

## See Also

- **GARDEN_THREE_IMPLEMENTATION.md** — Complete Three.js implementation guide
- **GardenV2.jsx** — Working Three.js prototype
