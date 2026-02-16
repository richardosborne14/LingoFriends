# Task 1.1.22: Garden Dev Sandbox Mode

**Status:** Not Started
**Priority:** High (for development/testing)
**Dependencies:** Task 1.1.20 (Tree-to-Renderer Integration)
**Date:** 2026-02-16

## Objective

Create a development sandbox mode for testing garden interactions, tree placement, decoration placement, and path visualization without requiring full game progression. This addresses the immediate need to test "how placing on the map works."

## The Problem

### Current State
- `DevTestHarness` exists but doesn't have a garden testing mode
- No way to test tree placement on the 3D map
- No way to test decoration shop placement
- No way to verify path node rendering
- Testing requires full game progression flow

### What's Needed
A dedicated sandbox mode that allows:
1. **Place/remove trees** at any grid position
2. **Place/remove decorations** from the shop
3. **Simulate tree states** (growth stages, health levels)
4. **Test path nodes** with different progress states
5. **Reset to defaults** quickly
6. **Inspect current state** (JSON dump of placed objects)

## Implementation Plan

### Phase 1: Sandbox Component (2-3 hours)

Create a new test harness tab for garden testing:

```typescript
// src/components/dev/GardenSandbox.tsx

import React, { useState, useCallback } from 'react';
import { GardenWorld3D, useShopCatalogueByCategory } from '../garden';
import type { PlacedObject, ShopItem } from '../../renderer';
import type { UserTree, TreeStatus } from '../../types';

/**
 * Garden Dev Sandbox - Test harness for 3D garden interactions.
 * 
 * Features:
 * - Place trees and decorations via click
 * - Adjust tree states (growth, health)
 * - Simulate path progress
 * - Export/import garden state as JSON
 */
export function GardenSandbox(): JSX.Element {
  // ============================================
  // STATE
  // ============================================
  
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [sandboxTrees, setSandboxTrees] = useState<SimulatedTree[]>([]);
  const [mode, setMode] = useState<'place' | 'inspect' | 'delete'>('place');
  
  // Simulated trees with configurable state
  const [simulatedTrees, setSimulatedTrees] = useState<SimulatedTree[]>([]);
  
  // ============================================
  // CALLBACKS
  // ============================================
  
  const handleTileClick = useCallback((gx: number, gz: number, isOccupied: boolean) => {
    if (mode === 'delete' && isOccupied) {
      // Remove object at this position
      setPlacedObjects(prev => prev.filter(obj => 
        !(obj.gx === gx && obj.gz === gz)
      ));
      return;
    }
    
    if (mode === 'place' && selectedItem && !isOccupied) {
      // Place selected item
      const newObject: PlacedObject = {
        id: `${selectedItem.id}-${Date.now()}`,
        objectType: selectedItem.id,
        gx,
        gz,
      };
      setPlacedObjects(prev => [...prev, newObject]);
    }
  }, [mode, selectedItem]);
  
  const handleTreeClick = useCallback((tree: SimulatedTree) => {
    console.log('[Sandbox] Tree clicked:', tree);
  }, []);
  
  // ============================================
  // RENDER
  // ============================================
  
  const shopByCategory = useShopCatalogueByCategory();
  
  return (
    <div className="garden-sandbox h-screen flex">
      {/* Left Panel - Controls */}
      <div className="w-80 bg-gray-100 p-4 overflow-y-auto border-r">
        <h2 className="text-xl font-bold mb-4">🌳 Garden Sandbox</h2>
        
        {/* Mode Selection */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Mode</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('place')}
              className={`px-3 py-1 rounded ${mode === 'place' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
            >
              Place
            </button>
            <button
              onClick={() => setMode('inspect')}
              className={`px-3 py-1 rounded ${mode === 'inspect' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Inspect
            </button>
            <button
              onClick={() => setMode('delete')}
              className={`px-3 py-1 rounded ${mode === 'delete' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
            >
              Delete
            </button>
          </div>
        </div>
        
        {/* Shop Items */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Shop Items</h3>
          {Object.entries(shopByCategory).map(([category, items]) => (
            <div key={category} className="mb-2">
              <h4 className="text-sm font-medium text-gray-600">{category}</h4>
              <div className="flex flex-wrap gap-1">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-2 rounded text-lg ${
                      selectedItem?.id === item.id 
                        ? 'bg-green-200 border-2 border-green-500' 
                        : 'bg-white border border-gray-300'
                    }`}
                    title={`${item.name} (${item.cost} SD)`}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Simulated Trees */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Add Learning Tree</h3>
          <button
            onClick={() => addSimulatedTree(simulatedTrees, setSimulatedTrees)}
            className="w-full px-3 py-2 bg-amber-500 text-white rounded"
          >
            + Add Tree
          </button>
          
          {simulatedTrees.length > 0 && (
            <div className="mt-2">
              <h4 className="text-sm font-medium text-gray-600">Trees ({simulatedTrees.length})</h4>
              {simulatedTrees.map((tree, idx) => (
                <TreeControl
                  key={tree.id}
                  tree={tree}
                  onUpdate={(updates) => updateTree(idx, updates, setSimulatedTrees)}
                  onRemove={() => removeTree(idx, setSimulatedTrees)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* State Export */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">State</h3>
          <button
            onClick={() => console.log('Garden State:', { placedObjects, simulatedTrees })}
            className="w-full px-3 py-2 bg-gray-500 text-white rounded mb-2"
          >
            Log State to Console
          </button>
          <button
            onClick={() => {
              setPlacedObjects([]);
              setSimulatedTrees([]);
            }}
            className="w-full px-3 py-2 bg-red-500 text-white rounded"
          >
            Reset All
          </button>
        </div>
      </div>
      
      {/* Right Panel - 3D Garden */}
      <div className="flex-1 relative">
        <GardenWorld3D
          className="h-full"
          initialObjects={placedObjects}
          onTileClick={handleTileClick}
          onObjectPlace={(id, gx, gz) => console.log('[Sandbox] Object placed:', id, gx, gz)}
        />
        
        {/* Selection indicator */}
        {selectedItem && (
          <div className="absolute top-4 left-4 bg-white/90 px-4 py-2 rounded-lg shadow">
            Placing: {selectedItem.icon} {selectedItem.name}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

interface SimulatedTree {
  id: string;
  name: string;
  gx: number;
  gz: number;
  growthStage: number;
  health: number;
  status: TreeStatus;
}

function TreeControl({ 
  tree, 
  onUpdate, 
  onRemove 
}: { 
  tree: SimulatedTree; 
  onUpdate: (updates: Partial<SimulatedTree>) => void;
  onRemove: () => void;
}): JSX.Element {
  return (
    <div className="bg-white p-2 rounded border mb-2 text-sm">
      <div className="flex justify-between items-center mb-1">
        <span className="font-medium">{tree.name}</span>
        <button onClick={onRemove} className="text-red-500 text-xs">Remove</button>
      </div>
      
      <div className="grid grid-cols-2 gap-1 text-xs">
        <label>Growth: {tree.growthStage}/14</label>
        <input
          type="range"
          min="0"
          max="14"
          value={tree.growthStage}
          onChange={(e) => onUpdate({ growthStage: parseInt(e.target.value) })}
          className="w-full"
        />
        
        <label>Health: {tree.health}%</label>
        <input
          type="range"
          min="0"
          max="100"
          value={tree.health}
          onChange={(e) => onUpdate({ health: parseInt(e.target.value) })}
          className="w-full"
        />
        
        <label>Status:</label>
        <select
          value={tree.status}
          onChange={(e) => onUpdate({ status: e.target.value as TreeStatus })}
          className="border rounded px-1"
        >
          <option value="seed">Seed</option>
          <option value="growing">Growing</option>
          <option value="bloomed">Bloomed</option>
        </select>
      </div>
    </div>
  );
}

function addSimulatedTree(
  trees: SimulatedTree[],
  setTrees: React.Dispatch<React.SetStateAction<SimulatedTree[]>>
): void {
  const newTree: SimulatedTree = {
    id: `tree-${Date.now()}`,
    name: `Tree ${trees.length + 1}`,
    gx: Math.floor(Math.random() * 10) + 1,
    gz: Math.floor(Math.random() * 10) + 1,
    growthStage: 0,
    health: 100,
    status: 'seed',
  };
  setTrees([...trees, newTree]);
}

function updateTree(
  index: number,
  updates: Partial<SimulatedTree>,
  setTrees: React.Dispatch<React.SetStateAction<SimulatedTree[]>>
): void {
  setTrees(prev => {
    const updated = [...prev];
    updated[index] = { ...updated[index], ...updates };
    return updated;
  });
}

function removeTree(
  index: number,
  setTrees: React.Dispatch<React.SetStateAction<SimulatedTree[]>>
): void {
  setTrees(prev => prev.filter((_, i) => i !== index));
}

export default GardenSandbox;
```

### Phase 2: Integrate with DevTestHarness (30 minutes)

Add the sandbox to the existing dev harness:

```typescript
// src/components/dev/DevTestHarness.tsx

import { GardenSandbox } from './GardenSandbox';

// Add to tabs
const TABS = [
  { id: 'seeds', label: 'Seeds', component: SeedTestPanel },
  { id: 'gifts', label: 'Gifts', component: GiftTestHarness },
  { id: 'shop', label: 'Shop', component: ShopTestHarness },
  { id: 'garden', label: 'Garden Sandbox', component: GardenSandbox }, // NEW
  // ... other tabs
];
```

### Phase 3: Update GardenWorld3D for Dev Mode (1 hour)

Add props needed for sandbox:

```typescript
// GardenWorld3D.tsx

export interface GardenWorldProps {
  // ... existing props ...
  
  /** Dev mode: show grid coordinates on hover */
  devMode?: boolean;
  /** Dev mode: onTileClick callback for placement */
  onTileClick?: (gx: number, gz: number, isOccupied: boolean) => void;
}

// In renderer
if (props.devMode && props.onTileClick) {
  // Show grid overlay
  // Show coordinates on hover
  // Enable click-to-place
}
```

### Phase 4: Path Sandbox Controls (1 hour)

Add path simulation controls:

```typescript
// In GardenSandbox.tsx

interface SimulatedPath {
  treeId: string;
  lessons: SimulatedLesson[];
}

interface SimulatedLesson {
  id: string;
  status: 'locked' | 'available' | 'current' | 'completed';
  stars: 0 | 1 | 2 | 3;
}

function PathControl({ 
  path, 
  onUpdate 
}: { 
  path: SimulatedPath; 
  onUpdate: (updates: Partial<SimulatedPath>) => void;
}): JSX.Element {
  return (
    <div className="bg-purple-50 p-2 rounded border mb-2">
      <h4 className="font-medium text-sm mb-2">Path Progress</h4>
      <div className="flex gap-1">
        {path.lessons.map((lesson, idx) => (
          <button
            key={lesson.id}
            onClick={() => cycleLessonStatus(path, idx, onUpdate)}
            className={`w-8 h-8 rounded flex items-center justify-center text-xs
              ${lesson.status === 'completed' ? 'bg-purple-500 text-white' : ''}
              ${lesson.status === 'current' ? 'bg-yellow-400' : ''}
              ${lesson.status === 'available' ? 'bg-green-400' : ''}
              ${lesson.status === 'locked' ? 'bg-gray-300' : ''}
            `}
          >
            {lesson.stars > 0 ? '⭐'.repeat(lesson.stars) : idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function cycleLessonStatus(
  path: SimulatedPath,
  lessonIndex: number,
  onUpdate: (updates: Partial<SimulatedPath>) => void
): void {
  const statusOrder = ['locked', 'available', 'current', 'completed'] as const;
  const lessons = [...path.lessons];
  const current = lessons[lessonIndex];
  const currentStatusIndex = statusOrder.indexOf(current.status);
  const nextStatus = statusOrder[(currentStatusIndex + 1) % 4];
  
  lessons[lessonIndex] = {
    ...current,
    status: nextStatus,
    stars: nextStatus === 'completed' ? 2 : 0,
  };
  
  onUpdate({ lessons });
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/dev/GardenSandbox.tsx` | Create | Main sandbox component |
| `src/components/dev/index.ts` | Modify | Export GardenSandbox |
| `src/components/dev/DevTestHarness.tsx` | Modify | Add garden tab |
| `src/components/garden/GardenWorld3D.tsx` | Modify | Add devMode, onTileClick props |
| `src/renderer/GardenRenderer.ts` | Modify | Add dev grid overlay |

## Acceptance Criteria

- [ ] Can toggle sandbox via Dev Harness (Ctrl+Shift+D)
- [ ] Can place decorative objects on the grid
- [ ] Can remove placed objects
- [ ] Can add simulated learning trees
- [ ] Can adjust tree growth stage (0-14)
- [ ] Can adjust tree health (0-100%)
- [ ] Can simulate path progress states
- [ ] Can log current state to console
- [ ] Can reset garden to empty

## Testing Scenarios

1. **Open sandbox**: Ctrl+Shift+D → Click "Garden" tab
2. **Place decoration**: Select flower → Click tile → Object appears
3. **Delete decoration**: Switch to delete mode → Click object → Object removed
4. **Add tree**: Click "Add Tree" → Tree appears with controls
5. **Adjust growth**: Drag slider → Tree visual changes (after Task 1.1.20)
6. **Simulate progress**: Click path nodes → Status cycles through states
7. **Export state**: Click "Log State" → JSON appears in console

## Dev Mode Features to Add Later

- Grid coordinate overlay (show gx, gz numbers)
- Highlight valid placement tiles
- Undo/redo placement
- Predefined test scenarios (e.g., "Full Garden", "One Tree at Each Stage")
- Export/import garden state as JSON file
- Screenshot capture for documentation

## Notes for Testing

When testing the connection between systems:
1. First complete Task 1.1.20 (Tree-to-Renderer Integration)
2. Then verify sandbox shows trees correctly
3. Then verify sandbox paths work (Task 1.1.21)

The sandbox will be useful for manual testing of all three integration tasks.

## Related Documentation

- `src/components/dev/DevTestHarness.tsx` - Existing dev harness
- `docs/phase-1.1/task-1-1-20-tree-renderer-integration.md` - Tree integration
- `docs/phase-1.1/task-1-1-21-path-node-visualization.md` - Path visualization