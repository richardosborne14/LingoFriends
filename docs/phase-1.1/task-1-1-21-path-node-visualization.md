# Task 1.1.21: Path Node 3D Visualization

**Status:** Not Started
**Priority:** Medium
**Dependencies:** Task 1.1.20 (Tree-to-Renderer Integration)
**Date:** 2026-02-16

## Objective

Render skill path lesson nodes in the 3D garden around each learning tree, creating a visual representation of the learning pathway. Users should see their progress through a skill path as a visual "path" winding from/around their tree.

## The Problem

### Current State
- Trees (once Task 1.1.20 is complete) will appear in 3D
- PathView shows lessons as a 2D vertical path
- No 3D representation of lesson nodes or progress
- Users can't see their pathway progress from the garden view

### What's Needed
When a user clicks a tree, they see the path view. But from the garden view, they should see:
1. **Path nodes** arranged around/near the tree
2. **Progress visualization** (completed vs locked nodes)
3. **Current lesson highlighted** 
4. **Path connection line** showing the learning journey

## Conceptual Design

```
            [Node 5] ← Locked (gray)
               |
            [Node 4] ← Completed (gold star)
               |
    [Node 2]--[Node 3]--[Current] ← Glowing/animated
       |          |
    [Node 1]------+
       |
     🌳 Tree (center)
```

Each tree has 5-8 nodes arranged in a path pattern near it. Node appearance shows status:
- **Locked**: Grayed out, transparent
- **Available**: Bright, inviting glow
- **Current**: Animated glow, "!" indicator
- **Completed**: Star badge, gold/purple

## Implementation Plan

### Phase 1: Path Node Types (1 hour)

Define types for 3D path nodes:

```typescript
// src/renderer/types.ts

/**
 * Status of a path node in 3D visualization.
 */
export type PathNodeStatus = 'locked' | 'available' | 'current' | 'completed';

/**
 * A lesson node positioned in 3D space near a tree.
 */
export interface PathNode3D {
  /** Unique identifier matching SkillPathLesson.id */
  id: string;
  /** Grid position relative to parent tree */
  localPosition: { x: number; z: number };
  /** Current status affecting visual appearance */
  status: PathNodeStatus;
  /** Star rating (0-3) for completed lessons */
  stars?: number;
  /** Parent tree ID this node belongs to */
  treeId: string;
}

/**
 * Complete path visualization for a tree.
 */
export interface TreePath3D {
  /** Tree this path belongs to */
  treeId: string;
  /** All lesson nodes for this path */
  nodes: PathNode3D[];
  /** Connection line path between nodes */
  pathLine: { x: number; z: number }[];
}
```

### Phase 2: Path Layout Algorithm (2 hours)

Calculate node positions near each tree:

```typescript
// src/renderer/pathLayoutUtils.ts

import type { SkillPathLesson, LessonStatus } from '../types/game';
import type { PathNode3D, PathNodeStatus, TreePath3D } from './types';

/**
 * Layout pattern for path nodes around a tree.
 * Nodes spiral outward from the tree center.
 */
const LAYOUT_PATTERNS = {
  // Linear path extending from tree
  linear: [
    { x: 1, z: 0 },   // Node 1
    { x: 2, z: 0 },   // Node 2
    { x: 2, z: 1 },   // Node 3 (bend)
    { x: 3, z: 1 },   // Node 4
    { x: 3, z: 2 },   // Node 5 (bend)
    { x: 4, z: 2 },   // Node 6
    { x: 4, z: 3 },   // Node 7
    { x: 5, z: 3 },   // Node 8
  ],
  // Spiral around tree
  spiral: [
    { x: 1, z: 0 },
    { x: 1, z: 1 },
    { x: 0, z: 1 },
    { x: -1, z: 1 },
    { x: -1, z: 0 },
    { x: -1, z: -1 },
    { x: 0, z: -1 },
    { x: 1, z: -1 },
  ],
};

/**
 * Generate 3D path nodes for a tree's skill path.
 */
export function generateTreePath3D(
  treeId: string,
  treePosition: { gx: number; gz: number },
  lessons: SkillPathLesson[],
  pattern: 'linear' | 'spiral' = 'linear'
): TreePath3D {
  const layoutPattern = LAYOUT_PATTERNS[pattern];
  const nodes: PathNode3D[] = lessons.map((lesson, index) => {
    // Use layout pattern, or extend if more lessons
    const basePosition = layoutPattern[index % layoutPattern.length];
    const spiralOffset = Math.floor(index / layoutPattern.length);
    
    return {
      id: lesson.id,
      localPosition: {
        x: basePosition.x + spiralOffset * 2,
        z: basePosition.z,
      },
      status: lessonStatusToNodeStatus(lesson.status),
      stars: lesson.stars > 0 ? lesson.stars : undefined,
      treeId,
    };
  });
  
  // Generate connection line
  const pathLine = nodes.map(n => n.localPosition);
  
  return { treeId, nodes, pathLine };
}

function lessonStatusToNodeStatus(status: LessonStatus): PathNodeStatus {
  switch (status) {
    case 'completed': return 'completed';
    case 'current': return 'current';
    case 'locked': return 'locked';
    default: return 'locked';
  }
}
```

### Phase 3: Node Meshes (2-3 hours)

Create visual representations for lesson nodes:

```typescript
// src/renderer/objects/pathNodes.ts

import * as THREE from 'three';
import type { PathNode3D, PathNodeStatus } from '../types';

/**
 * Create a 3D path node mesh.
 * Appearance varies based on status.
 */
export function createPathNode(node: PathNode3D): THREE.Group {
  const group = new THREE.Group();
  
  // Base sphere
  const geometry = new THREE.SphereGeometry(0.15, 16, 12);
  const material = createNodeMaterial(node.status);
  const sphere = new THREE.Mesh(geometry, material);
  group.add(sphere);
  
  // Add star for completed
  if (node.stars && node.stars > 0) {
    const starsGroup = createStarIndicator(node.stars);
    starsGroup.position.y = 0.25;
    group.add(starsGroup);
  }
  
  // Add glow for current
  if (node.status === 'current') {
    const glow = createGlowEffect();
    group.add(glow);
  }
  
  return group;
}

function createNodeMaterial(status: PathNodeStatus): THREE.MeshLambertMaterial {
  const colors: Record<PathNodeStatus, number> = {
    locked: 0x888888,      // Gray
    available: 0x4CAF50,   // Green
    current: 0xFFC107,     // Gold
    completed: 0x9C27B0,   // Purple
  };
  
  const opacities: Record<PathNodeStatus, number> = {
    locked: 0.5,
    available: 1.0,
    current: 1.0,
    completed: 1.0,
  };
  
  return new THREE.MeshLambertMaterial({
    color: colors[status],
    transparent: status === 'locked',
    opacity: opacities[status],
  });
}

function createStarIndicator(count: number): THREE.Group {
  // Create 1-3 small stars above the node
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const star = createStar();
    star.position.x = (i - (count - 1) / 2) * 0.1;
    group.add(star);
  }
  return group;
}
```

### Phase 4: Path Lines (1 hour)

Draw connecting lines between nodes:

```typescript
// src/renderer/objects/pathLines.ts

/**
 * Create a visible path line connecting lesson nodes.
 */
export function createPathLine(points: { x: number; z: number }[]): THREE.Line {
  const linePoints = points.map(p => 
    new THREE.Vector3(p.x, 0.05, p.z)
  );
  
  const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
  const material = new THREE.LineBasicMaterial({
    color: 0x4CAF50,
    linewidth: 2,
  });
  
  return new THREE.Line(geometry, material);
}
```

### Phase 5: GardenWorld3D Integration (2 hours)

Update the renderer to show paths:

```typescript
// In GardenRenderer.ts

/**
 * Add a skill path visualization to the garden.
 */
addTreePath(treePath: TreePath3D, treePosition: { gx: number; gz: number }): void {
  // Position nodes relative to tree
  for (const node of treePath.nodes) {
    const worldX = treePosition.gx + node.localPosition.x;
    const worldZ = treePosition.gz + node.localPosition.z;
    
    const nodeMesh = createPathNode(node);
    nodeMesh.position.set(worldX, 0.2, worldZ);
    this.state.objectLayer.add(nodeMesh);
    
    // Store reference for click handling
    this.pathNodes.set(node.id, { mesh: nodeMesh, node });
  }
  
  // Add connecting line
  const worldLinePoints = treePath.pathLine.map(p => ({
    x: treePosition.gx + p.x,
    z: treePosition.gz + p.z,
  }));
  const line = createPathLine(worldLinePoints);
  this.state.objectLayer.add(line);
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/renderer/types.ts` | Modify | Add PathNode3D, TreePath3D types |
| `src/renderer/pathLayoutUtils.ts` | Create | Position calculation for nodes |
| `src/renderer/objects/pathNodes.ts` | Create | Node mesh creation |
| `src/renderer/objects/pathLines.ts` | Create | Path line drawing |
| `src/renderer/GardenRenderer.ts` | Modify | Add addTreePath method |
| `src/components/garden/GardenWorld3D.tsx` | Modify | Accept paths prop |

## Acceptance Criteria

- [ ] Path nodes render near each tree in 3D
- [ ] Node appearance matches status (locked/available/current/completed)
- [ ] Completed lessons show star indicators
- [ ] Current lesson has glow/animation
- [ ] Connecting lines visible between nodes
- [ ] Clicking a node navigates to that lesson
- [ ] Paths update when lessons complete

## Testing Scenarios

1. **New tree with locked lessons**: All nodes gray/translucent
2. **Tree with current lesson**: One node glowing gold
3. **Completed lesson**: Node purple with stars
4. **Multiple paths**: Each tree has its own separate path
5. **Path not overlapping decorations**: Nodes placed correctly
6. **Click on current node**: Opens PathView to that lesson

## Design Considerations

### Visual Clarity
- Nodes should be clearly visible but not clutter the garden
- Path pattern should be intuitive to follow
- Colorblind-friendly colors needed

### Performance
- Path nodes only rendered for visible trees (culling)
- Consider LOD (Level of Detail) for distant trees
- Batch similar node meshes

### UX
- Should paths be always visible or only on tree selection?
- Consider "path preview" on hover
- Animate node completion in real-time?

## Notes for Future Tasks

This task creates the visual foundation. Follow-ups:
- **Task 1.1.22**: Dev sandbox for testing paths
- Animation when completing a lesson (node transformation)
- Sound effects for path interactions

## Related Documentation

- `docs/phase-1.1/task-1-1-4-path-view.md` - 2D path component
- `docs/phase-1.1/task-1-1-20-tree-renderer-integration.md` - Tree rendering
- `src/renderer/GardenRenderer.ts` - Current renderer implementation