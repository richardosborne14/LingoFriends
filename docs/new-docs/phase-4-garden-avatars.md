# Phase 4: Garden & Avatars

**Status:** 🔲 Not started
**Estimated Time:** 14–20 hours
**Dependencies:** Phase 3 complete (lessons work end-to-end)
**Output:** Explorable 3D garden with avatar, tree interactions, and NPC encounters in lessons

---

## Task 4.1: Three.js Garden Scene (5h)

### What to Do

Create the garden scene in `src/lib/three/garden/`:

**GardenScene.ts** — The main Three.js scene manager:

```typescript
export class GardenScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: CameraControls;

  constructor(canvas: HTMLCanvasElement) { /* ... */ }

  // Public API
  init(): void;
  dispose(): void;
  resize(width: number, height: number): void;
  setTrees(trees: TreeData[]): void;
  setAvatar(options: AvatarOptions): void;
  moveAvatarTo(x: number, z: number): void;
  focusOnTree(treeId: string): void;
  getClickedObject(event: PointerEvent): string | null;
}
```

**Scene composition:**

1. **Ground plane** — Large green plane with subtle grass texture (procedural or simple repeating pattern). Slight colour variation for visual interest.

2. **Garden boundary** — Low wooden fence around the perimeter. Use simple box geometries with brown MeshToonMaterial. Or a CC0 fence model if available from Kenney.

3. **Tree plots** — Circular dirt patches where trees are planted. Each plot corresponds to a `user_tree` record. Empty plots have a subtle marking showing where a tree could go.

4. **Trees** — Growth stages rendered as increasingly complex models:
   - Stage 0 (seed): Small mound with a seed sprite
   - Stage 1-3: Simple sapling (cylinder trunk + sphere canopy, increasing size)
   - Stage 4-7: Fuller tree with MeshToonMaterial, pink blossoms appear at stage 7+
   - Stage 8-14: Full cherry blossom tree, increasingly spectacular. Particle effects (falling petals) at stage 10+.
   - Health affects colour: healthy = vibrant pink/green, unhealthy = desaturated/brown

5. **Paths** — Dirt paths connecting tree plots. Simple plane geometries with brown-ish material.

6. **Sky** — Gradient background (sunrise tones from design system: coral-100 to sky-300).

7. **Ambient particles** — Subtle floating pollen/sparkle particles. More on healthy trees, none on unhealthy ones.

**Camera controls:**
- Default view: overhead angle (~45°), showing full garden
- Pinch/scroll to zoom (orthographic feel but perspective camera)
- Drag/swipe to pan
- Min zoom: close enough to see one tree filling the screen
- Max zoom: see the entire garden
- Smooth easing on all camera movements (lerp, not snap)

**Click interaction:**
- Tap ground → avatar walks to that point
- Tap tree → avatar walks to tree, then dispatch `tree-selected` event
- Raycasting for click detection

### Svelte Integration

**GardenCanvas.svelte:**
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GardenScene } from '$lib/three/garden/GardenScene';

  let canvas: HTMLCanvasElement;
  let scene: GardenScene;

  export let trees: TreeData[] = [];
  export let avatarOptions: AvatarOptions;

  onMount(() => {
    scene = new GardenScene(canvas);
    scene.init();
    scene.setTrees(trees);
    scene.setAvatar(avatarOptions);
  });

  onDestroy(() => scene?.dispose());

  $: scene?.setTrees(trees);
</script>

<canvas bind:this={canvas} class="w-full h-full" />
```

### Acceptance Criteria
- [ ] Garden renders with green ground and fence boundary
- [ ] Trees display at correct positions from DB
- [ ] Growth stages visually distinct (at least 5 distinct stages)
- [ ] Unhealthy trees look visually wilted/brown
- [ ] Camera zoom (pinch/scroll) works smoothly
- [ ] Camera pan (drag/swipe) works smoothly
- [ ] Tap ground → avatar walks there
- [ ] Tap tree → avatar walks to tree + event fires
- [ ] No memory leaks on unmount (dispose called)
- [ ] Responsive (fills viewport on mobile)

---

## Task 4.2: Avatar System (3h)

### What to Do

Create `src/lib/three/avatars/AvatarLoader.ts`:

Use Quaternius CC0 glTF character models (download from quaternius.com).

**Recommended pack:** "Ultimate Animated Character Pack" — 50+ characters with idle + walk animations.

1. **Download and prepare:**
   - Select 1-2 base character models (one masculine, one feminine, one neutral)
   - Place `.glb` files in `static/models/avatars/`
   - Verify they have `Idle` and `Walk` animation clips

2. **AvatarLoader:**
```typescript
export class AvatarLoader {
  private loader = new GLTFLoader();
  private cache = new Map<string, GLTF>();

  async load(modelPath: string): Promise<THREE.Group>;
  applyCustomisation(model: THREE.Group, options: AvatarOptions): void;
  playAnimation(model: THREE.Group, clipName: 'Idle' | 'Walk'): void;
}
```

3. **Material customisation:**
   - Find mesh children by name (e.g., 'Shirt', 'Pants', 'Hair', 'Skin')
   - Replace materials with `MeshToonMaterial` using the user's chosen hex colors
   - This preserves the full customisation system (skinTone, hairColor, shirtColor)

4. **Animation:**
   - `Idle`: default standing animation
   - `Walk`: plays while avatar moves to destination
   - Smooth crossfade between animations (THREE.AnimationMixer)

5. **Movement:**
   - Click position → lerp avatar position over time
   - Face direction of movement
   - Play walk animation during movement, idle when stopped

### Acceptance Criteria
- [ ] glTF model loads without errors
- [ ] Material swaps apply (skin, hair, shirt colors)
- [ ] Idle animation plays smoothly
- [ ] Walk animation plays during movement
- [ ] Avatar moves to click position with smooth interpolation
- [ ] Avatar faces direction of movement

---

## Task 4.3: Tree Interaction Panel (2h)

### What to Do

When a tree is tapped in the garden, show a bottom sheet (mobile) or side panel (desktop) with:

**TreePanel.svelte:**
```
┌─────────────────────────────────────────┐
│  🌸 Introduce Yourself                  │  ← Tree/path name
│  ████████████░░░░ 2/4 lessons           │  ← Progress bar
│  ☀️ 42 SunDrops  ❤️ 85% health          │  ← Stats
│                                         │
│  ┌─ Lesson Trail ─────────────────────┐ │
│  │  ✅ Saying Your Name               │ │  ← Completed (forest fill)
│  │  │                                 │ │
│  │  ✅ How Old Are You?               │ │  ← Completed
│  │  │                                 │ │
│  │  🔴 Where Are You From?            │ │  ← Current (coral fill, pulse)
│  │  │                                 │ │
│  │  🔒 Putting It Together            │ │  ← Locked (bark-200 fill)
│  └────────────────────────────────────┘ │
│                                         │
│  Tap a lesson to start!                 │
└─────────────────────────────────────────┘
```

**Lesson trail:** Vertical connected nodes (circles on a dotted line). Visual states: completed (green + ✓), current (coral + pulse), locked (grey + 🔒).

**Tap a lesson node:**
- If completed → replay (earn partial SunDrops)
- If current → start lesson (navigate to `/lesson/[id]`)
- If locked → show "Complete the previous lesson first"

### Acceptance Criteria
- [ ] Panel appears when tree is tapped
- [ ] Tree stats display correctly from DB
- [ ] Lesson trail shows correct states
- [ ] Tapping current lesson navigates to lesson page
- [ ] Locked lessons show appropriate message
- [ ] Panel dismisses on swipe-down (mobile) or close button

---

## Task 4.4: NPC Encounters in Lessons (3h)

### What to Do

Create `src/lib/three/avatars/NPCScene.ts`:

During coaching chat steps, an NPC avatar appears in a small Three.js viewport within the lesson UI.

**NPC character selection:**
- Each lesson step gets a random NPC from a pool of 5-8 characters
- The final step of a lesson gets the "boss" NPC (slightly larger, different style)
- NPCs are Quaternius characters, different from the user's avatar

**NPCScene:**
```typescript
export class NPCScene {
  constructor(canvas: HTMLCanvasElement);
  init(): void;
  dispose(): void;
  loadCharacter(modelPath: string): Promise<void>;
  playIdle(): void;
  startSpeaking(): void;   // Enable mouth movement
  stopSpeaking(): void;    // Return to idle mouth
  setEmotion(emotion: 'happy' | 'thinking' | 'surprised'): void;
}
```

**Mouth movement:**
- If model has morph targets (visemes): animate jawOpen/mouthSmile morphs
- If no morph targets: simple jaw rotation on a bone (find 'Head' or 'Jaw' bone)
- Movement synced to audio playback: active while TTS plays, stops when audio ends
- Use a simple sine wave for open/close rhythm (not phoneme-accurate, just feels alive)

**Idle animations:**
- Subtle breathing (scale chest slightly)
- Occasional blink (if morph targets available) or head tilt
- Small weight shifts

**Layout in lesson:**
```
┌─────────────────────────────────┐
│  [NPC Canvas - 120×120px]       │
│  ┌─────────────────────────┐    │
│  │ Speech bubble with       │    │
│  │ coaching text            │    │
│  └─────────────────────────┘    │
│                                 │
│  [Discovery question area]      │
└─────────────────────────────────┘
```

### Acceptance Criteria
- [ ] NPC loads and displays with idle animation
- [ ] Mouth moves during TTS playback
- [ ] Mouth stops when audio ends
- [ ] Different NPC per lesson step
- [ ] Boss NPC on final step (visually distinct — larger, different model/color)
- [ ] Canvas is small and doesn't dominate the UI
- [ ] Disposes cleanly when lesson step changes

---

## Task 4.5: Garden Page Integration (2h)

### What to Do

**Route:** `src/routes/(app)/garden/+page.svelte`

Wire everything together:

**Server load:**
```typescript
export const load: PageServerLoad = async ({ locals }) => {
  const profile = await getProfile(locals.user!.id);
  const trees = await getUserTrees(locals.user!.id);
  return { profile, trees };
};
```

**Page component:**
1. Full-viewport GardenCanvas with user's trees and avatar
2. Tree tap → show TreePanel bottom sheet
3. Lesson tap in TreePanel → navigate to lesson
4. Display user stats in a floating header:
   ```
   ☀️ 142  |  🔥 7 day streak  |  💎 23 gems
   ```
5. Floating "+" button to plant new tree (if seeds available)

**Health decay:** On page load, calculate current health for each tree based on `lastRefreshDate` and decay formula from GAME_DESIGN.md:
- 0-2 days: 100%
- 3-5 days: 85%
- 6-10 days: 60%
- 11-14 days: 35%
- 15-21 days: 15%
- 22+ days: 5% (minimum, tree never dies)
- Apply gift buffer days before calculating

### Acceptance Criteria
- [ ] Garden loads with all user trees in correct positions
- [ ] Avatar renders with user's customisation
- [ ] Tree tapping opens panel with correct data
- [ ] Lesson navigation works end-to-end (garden → lesson → garden)
- [ ] Stats header shows real data
- [ ] Tree health visuals match calculated health
- [ ] Performance: 60fps on mid-range mobile devices
