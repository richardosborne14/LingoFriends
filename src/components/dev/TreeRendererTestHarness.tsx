/**
 * Tree Renderer Test Harness
 * 
 * Visual test component for verifying learning trees render correctly in the 3D garden.
 * Tests various growth stages, health levels, and click interactions.
 * 
 * @module components/dev/TreeRendererTestHarness
 */

import React, { useState } from 'react';
import { GardenWorld3D, type UserTree } from '../garden/GardenWorld3D';
import { TreeStatus } from '../../types/game';

/**
 * Test harness for learning tree rendering.
 * 
 * Shows 8 test trees demonstrating:
 * - Different growth stages (seed → grand tree)
 * - Different health levels (healthy → dying → dead)
 * - Click interactions
 * 
 * Usage: Add to DevTestHarness or render directly for testing.
 */
export function TreeRendererTestHarness() {
  const [clickedTree, setClickedTree] = useState<string | null>(null);
  const [showTrees, setShowTrees] = useState(true);

  // Mock tree data for visual testing
  const mockTrees: UserTree[] = [
    // Row 1: Growth stages (all healthy)
    {
      id: 'tree-seed',
      gridX: 1,
      gridZ: 1,
      sunDropsEarned: 0,
      health: 100,
      skillPathId: 'spanish-greetings',
      status: TreeStatus.GROWING,
    },
    {
      id: 'tree-sapling',
      gridX: 3,
      gridZ: 1,
      sunDropsEarned: 25,
      health: 100,
      skillPathId: 'spanish-numbers',
      status: TreeStatus.GROWING,
    },
    {
      id: 'tree-young',
      gridX: 5,
      gridZ: 1,
      sunDropsEarned: 100,
      health: 100,
      skillPathId: 'spanish-colors',
      status: TreeStatus.GROWING,
    },
    {
      id: 'tree-mature',
      gridX: 7,
      gridZ: 1,
      sunDropsEarned: 320,
      health: 100,
      skillPathId: 'spanish-food',
      status: TreeStatus.GROWING,
    },
    {
      id: 'tree-grand',
      gridX: 9,
      gridZ: 1,
      sunDropsEarned: 900,
      health: 100,
      skillPathId: 'spanish-family',
      status: TreeStatus.GROWING,
    },

    // Row 2: Health levels (all mature trees)
    {
      id: 'tree-healthy',
      gridX: 2,
      gridZ: 4,
      sunDropsEarned: 320,
      health: 100,
      skillPathId: 'french-basics',
      status: TreeStatus.GROWING,
    },
    {
      id: 'tree-thirsty',
      gridX: 5,
      gridZ: 4,
      sunDropsEarned: 320,
      health: 40,
      skillPathId: 'german-greetings',
      status: TreeStatus.GROWING,
    },
    {
      id: 'tree-dying',
      gridX: 8,
      gridZ: 4,
      sunDropsEarned: 320,
      health: 10,
      skillPathId: 'spanish-greetings',
      status: TreeStatus.GROWING,
    },
  ];

  const handleTreeClick = (treeData: { skillPathId: string; gx: number; gz: number }) => {
    console.log('🌳 Tree clicked:', treeData);
    setClickedTree(`${treeData.skillPathId} at (${treeData.gx}, ${treeData.gz})`);
  };

  const handleToggleTrees = () => {
    setShowTrees(!showTrees);
  };

  return (
    <div className="tree-renderer-test-harness" style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Control Panel */}
      <div style={{
        padding: '16px',
        background: '#f5f5f5',
        borderBottom: '2px solid #ccc',
        fontFamily: 'monospace',
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>
          🌳 Tree Renderer Test Harness
        </h2>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <button
            onClick={handleToggleTrees}
            style={{
              padding: '8px 16px',
              background: showTrees ? '#4CAF50' : '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {showTrees ? '✓ Trees Visible' : '✗ Trees Hidden'}
          </button>
          
          <div style={{ flex: 1, padding: '8px', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
            {clickedTree ? (
              <span>🖱️ Last clicked: <strong>{clickedTree}</strong></span>
            ) : (
              <span>👆 Click a tree to test interaction</span>
            )}
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
          <strong>Test Scenarios:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li><strong>Row 1 (top):</strong> Growth stages - Seed (0 drops) → Grand tree (900 drops)</li>
            <li><strong>Row 2 (bottom):</strong> Health levels - Healthy (100%) → Thirsty (40%) → Dying (10%)</li>
            <li><strong>Colors:</strong> Each tree has a different skill path color</li>
            <li><strong>Interaction:</strong> Click any tree to verify raycasting works</li>
          </ul>
        </div>
      </div>

      {/* 3D Garden Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <GardenWorld3D
          userTrees={showTrees ? mockTrees : []}
          onTreeClick={handleTreeClick}
        />
      </div>
    </div>
  );
}

export default TreeRendererTestHarness;
