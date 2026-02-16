# Task 1.1.20: Tree-to-Renderer Integration

**Status:** Not Started
**Priority:** High
**Dependencies:** Task 1.1.14 (Three.js Garden Renderer), Task 1.1.8 (Garden State)
**Date:** 2026-02-16

## Objective

Bridge the gap between the `UserTree` domain model (learning trees linked to skill paths) and the `GardenRenderer` (Three.js 3D visualization). Currently these systems are completely disconnected - the renderer only shows cosmetic decorations, not learning trees.

## The Problem

### Current State
- `UserTree` in `src/types/game.ts` has `gridPosition: { gx, gz }` but renderer doesn't use it
- `GardenWorld3D` accepts `initialObjects?: PlacedObject[]` but App.tsx passes nothing
- No visual representation of skill path progress in the 3D garden
- Clicking on a tree should open PathView, but trees aren't even rendered

### What Works
- `GardenRenderer` can place/remove decorative objects at grid positions
- `UserTree` includes position, health, growth stage, decorations
- `PathView` component shows lessons when given a tree
- The navigation hook `useNavigation` has `goToPath(tree)` action

### What's Missing
1. Conversion from `UserTree[]` to `PlacedObject[]`
2. Tree mesh that shows health/growth state visually
3. Click detection on tree objects
4. Callback wiring from renderer to `onOpenPath`

## Implementation Plan

### Phase 1: Data Bridge (2-3 hours)

Create a service that converts UserTree to renderer format:

```typescript
// src/services/treeRendererBridge.ts

import type { UserTree, TreeStatus } from '../types/game';
import type { PlacedObject } from '../renderer/types';

/**
 * Convert a learning tree to a placed object for rendering.
 */
export function userTreeToPlacedObject(tree: UserTree): PlacedObject {
  return {
    id: tree.id,
    objectType: getTreeObjectType(tree),
    gx: tree.gridPosition.gx,
    gz: tree.gridPosition.gz,
  };
}

/**
 * Determine tree mesh type based on growth stage.
 * Maps growthStage (0-14) to visual tree types.
 */
function getTreeObjectType(tree: UserTree): string {
  // Seed/seedling stage
  if (tree.growthStage < 3) return 'seedling';
  // Young tree
  if (tree.growthStage < 7) return 'young_tree';
  // Growing tree
  if (tree.growthStage < 11) return 'growing_tree';
  // Mature tree
  return 'mature_tree';
}

/**
 * Convert all user trees to placed objects.
 */
export function userTreesToPlacedObjects(trees: UserTree[]): PlacedObject[] {
  return trees.map(userTreeToPlacedObject);
}
```

### Phase 2: Tree Meshes (3-4 hours)

Add tree meshes to the object factory that respond to health/growth:

```typescript
// src/renderer/objects/learningTrees.ts

/**
 * Create a learning tree mesh with health and growth visualization.
 * 
 * Features:
 * - Size scales with growthStage (0-14)
 * - Color/leaves affected by health (0-100)
 * - Decorations attached if present
 * - Click target for path navigation
 */
export function createLearningTree(
  growthStage: number,
  health: number,
  decorations: string[]
): THREE.Group {
  const group = new THREE.Group();
  
  // Trunk height based on growth
  const trunkHeight = 0.5 + (growthStage / 14) * 1.5;
  
  // Create trunk
  const trunkGeom = new THREE.CylinderGeometry(0.1, 0.15, trunkHeight);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = trunkHeight / 2;
  group.add(trunk);
  
  // Create foliage (health affects color)
  const foliageHealth = health / 100;
  const foliageColor = new THREE.Color().setHSL(
    0.3, // Green hue
    0.6 + foliageHealth * 0.4, // Saturation
    0.3 + foliageHealth * 0.3 // Lightness
  );
  
  const foliageGeom = new THREE.SphereGeometry(
    0.3 + (growthStage / 14) * 0.5,
    8,
    6
  );
  const foliageMat = new THREE.MeshLambertMaterial({ color: foliageColor });
  const foliage = new THREE.Mesh(foliageGeom, foliageMat);
  foliage.position.y = trunkHeight + 0.3;
  group.add(foliage);
  
  return group;
}
```

### Phase 3: Click Handling (2 hours)

Wire up tree clicks to path navigation:

```typescript
// Update GardenWorld3D props

export interface GardenWorldProps {
  // ... existing props ...
  
  /** Learning trees to render (converted to PlacedObjects internally) */
  learningTrees?: UserTree[];
  
  /** Callback when a learning tree is clicked */
  onTreeClick?: (tree: UserTree) => void;
}
```

### Phase 4: App.tsx Integration (1 hour)

Update App.tsx to pass trees to renderer:

```typescript
// In GameApp component

const userTreeObjects = useMemo(() => 
  userTreesToPlacedObjects(trees),
  [trees]
);

return (
  <GardenWorld3D
    className="h-[calc(100vh-180px)]"
    avatarOptions={DEFAULT_AVATAR}
    initialObjects={userTreeObjects}
    onTreeClick={handleOpenPath}
  />
);
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/treeRendererBridge.ts` | Create | UserTree → PlacedObject conversion |
| `src/renderer/objects/learningTrees.ts` | Create | Learning tree meshes with growth/health |
| `src/renderer/objectFactory.ts` | Modify | Add learning tree factory functions |
| `src/renderer/types.ts` | Modify | Add LearningTreeObject type |
| `src/renderer/GardenRenderer.ts` | Modify | Support learning tree clicks |
| `src/components/garden/GardenWorld3D.tsx` | Modify | Add onTreeClick prop |
| `App.tsx` | Modify | Wire trees to renderer |

## Acceptance Criteria

- [ ] Learning trees appear in 3D garden at their grid positions
- [ ] Tree appearance reflects growth stage (size increases)
- [ ] Tree appearance reflects health (color/foliage)
- [ ] Clicking a tree opens PathView for that skill path
- [ ] Decorating a tree shows visual decorations on 3D mesh
- [ ] Trees can be placed via seed UI
- [ ] Unit tests for treeRendererBridge
- [ ] Console logs validate tree rendering

## Testing Scenarios

1. **Fresh user with no trees**: Empty garden, no crashes
2. **User with one tree**: Tree appears at correct position
3. **User with multiple trees**: All trees render correctly
4. **Tree at different growth stages**: Visual size difference
5. **Tree at different health levels**: Color/foliage variation
6. **Click on tree**: PathView opens for correct skill path

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Performance with many trees | Use instanced meshes for similar trees |
| Click detection precision | Test with various tree sizes |
| Growth stage animation jarring | Use smooth transitions, not instant changes |

## Notes for Future Tasks

This task focuses on basic tree rendering. Follow-up tasks:
- **Task 1.1.21**: Path nodes visualization around trees
- **Task 1.1.22**: Garden dev sandbox for testing
- **Task 1.1.23**: Tree placement from seed menu

## Related Documentation

- `docs/phase-1.1/GARDEN_THREE_IMPLEMENTATION.md`
- `docs/phase-1.1/task-1-1-19-garden-architecture-fix.md`
- `docs/phase-1.1/task-1-1-8-garden-state.md`