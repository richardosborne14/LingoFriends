/**
 * Learning Tree Renderer for LingoFriends
 * 
 * Creates procedurally generated learning trees that grow through
 * 15 stages based on SunDrops earned. Each tree represents a skill path.
 * 
 * DIFFERENT from decoration trees (oak, pine, etc. from shop):
 * - Learning trees grow from seed to full tree
 * - Each stage unlocks with SunDrops (0, 10, 25, 45, 70, 100, 140, 190, 250, 320, 400, 500, 620, 750, 900)
 * - Trees have health states (healthy, thirsty, dying)
 * - Trees are clickable to open PathView for lessons
 * 
 * @module renderer/objects/learningTrees
 * @see docs/phase-1.1/task-1-1-19-garden-architecture-fix.md
 */

import * as THREE from 'three';
import { gridToWorld } from '../gridUtils';
import { TILE_HEIGHT } from '../types';
import { TreeStatus } from '../../types/game';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Half tile height for positioning objects on ground */
const TH = TILE_HEIGHT;

/**
 * SunDrop thresholds for each growth stage.
 * Stage 0 = seed, Stage 14 = fully grown.
 */
export const GROWTH_THRESHOLDS = [0, 10, 25, 45, 70, 100, 140, 190, 250, 320, 400, 500, 620, 750, 900];

/**
 * Calculate growth stage from SunDrops earned.
 */
export function calculateGrowthStage(sunDropsEarned: number): number {
  for (let stage = GROWTH_THRESHOLDS.length - 1; stage >= 0; stage--) {
    if (sunDropsEarned >= GROWTH_THRESHOLDS[stage]) {
      return stage;
    }
  }
  return 0;
}

/**
 * Health colors for tree foliage.
 */
const HEALTH_COLORS = {
  healthy: 0x22AA22,   // Vibrant green
  thirsty: 0x88AA22,   // Yellow-green (needs water)
  dying: 0x886644,     // Brown (urgent attention needed)
  dead: 0x553322,      // Dark brown
};

/**
 * Skill path icon colors (for tree personality).
 * Each skill path gets a unique foliage tint.
 */
export const SKILL_PATH_COLORS: Record<string, number> = {
  'spanish-greetings': 0x22AA44,  // Green with teal tint
  'spanish-numbers': 0x44AA22,    // Lime green
  'spanish-colors': 0xAA44AA,     // Purple
  'spanish-food': 0xAA6622,       // Orange
  'spanish-family': 0x22AAAA,     // Teal
  'french-basics': 0x2244AA,      // Blue
  'german-greetings': 0xAAAA22,   // Yellow
  'default': 0x22AA22,            // Default green
};

// ============================================================================
// LEARNING TREE FACTORY
// ============================================================================

/**
 * Options for creating a learning tree.
 */
export interface LearningTreeOptions {
  /** Grid X position (0-11) */
  gx: number;
  /** Grid Z position (0-11) */
  gz: number;
  /** Growth stage (0-14) */
  growthStage: number;
  /** Tree health (0-100) */
  health: number;
  /** Skill path ID for color tinting */
  skillPathId?: string;
  /** Tree status */
  status?: TreeStatus;
  /** Whether tree is dead (health = 0) */
  isDead?: boolean;
}

/**
 * Create a learning tree with procedural geometry based on growth stage.
 * 
 * Growth stages:
 * - 0: Seed (small mound with sprout)
 * - 1-2: Sapling (thin trunk, small canopy)
 * - 3-5: Young tree (thicker trunk, growing canopy)
 * - 6-9: Mature tree (full trunk, lush canopy)
 * - 10-14: Grand tree (large trunk, abundant foliage)
 * 
 * @param options - Tree creation options
 * @returns THREE.Group containing the learning tree
 */
export function makeLearningTree(options: LearningTreeOptions): THREE.Group {
  const { gx, gz, growthStage, health, skillPathId, status = TreeStatus.GROWING, isDead = false } = options;
  const group = new THREE.Group();
  
  // Get base color from skill path
  const baseColor = SKILL_PATH_COLORS[skillPathId || 'default'] || SKILL_PATH_COLORS.default;
  
  // Determine health state for color
  let foliageColor: number;
  if (isDead || health <= 0) {
    foliageColor = HEALTH_COLORS.dead;
  } else if (health < 20) {
    foliageColor = HEALTH_COLORS.dying;
  } else if (health < 50) {
    foliageColor = HEALTH_COLORS.thirsty;
  } else {
    // Blend with skill path color when healthy
    foliageColor = blendColors(HEALTH_COLORS.healthy, baseColor, 0.3);
  }
  
  // Scale factors based on growth stage (0-14)
  const scale = 0.3 + (growthStage / 14) * 0.7; // 0.3 to 1.0
  const trunkHeight = 0.2 + (growthStage / 14) * 0.6; // 0.2 to 0.8
  const canopyRadius = 0.15 + (growthStage / 14) * 0.35; // 0.15 to 0.5
  
  // Seed stage (stage 0) - just a sprout (MAKE IT VISIBLE!)
  if (growthStage === 0) {
    // Dirt mound - larger and more visible
    const moundGeometry = new THREE.SphereGeometry(0.25, 12, 8);
    moundGeometry.scale(1, 0.5, 1);
    const moundMaterial = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
    const mound = new THREE.Mesh(moundGeometry, moundMaterial);
    mound.position.y = TH / 2 + 0.05;
    mound.castShadow = true;
    group.add(mound);
    
    // Sprout stem - thicker and taller
    const sproutGeometry = new THREE.CylinderGeometry(0.03, 0.05, 0.25, 8);
    const sproutMaterial = new THREE.MeshLambertMaterial({ color: foliageColor });
    const sprout = new THREE.Mesh(sproutGeometry, sproutMaterial);
    sprout.position.y = TH / 2 + 0.2;
    sprout.castShadow = true;
    group.add(sprout);
    
    // Two visible leaves
    [-1, 1].forEach(side => {
      const leafGeometry = new THREE.SphereGeometry(0.12, 8, 6);
      leafGeometry.scale(0.5, 0.25, 1);
      const leaf = new THREE.Mesh(leafGeometry, sproutMaterial);
      leaf.position.set(side * 0.12, TH / 2 + 0.35, 0);
      leaf.rotation.z = side * 0.5;
      leaf.castShadow = true;
      group.add(leaf);
    });
    
    // Add a glow ring to make it more visible
    const ringGeometry = new THREE.TorusGeometry(0.3, 0.03, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x88FF88, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = TH / 2 + 0.02;
    group.add(ring);
  }
  // Sapling stages (1-2)
  else if (growthStage <= 2) {
    // Thin trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.03, 0.05, trunkHeight, 6);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x7A5533 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = TH / 2 + trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);
    
    // Small canopy
    const canopyGeometry = new THREE.SphereGeometry(canopyRadius, 8, 6);
    const canopyMaterial = new THREE.MeshLambertMaterial({ color: foliageColor });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.y = TH / 2 + trunkHeight + canopyRadius * 0.7;
    canopy.castShadow = true;
    group.add(canopy);
  }
  // Young tree (3-5)
  else if (growthStage <= 5) {
    // Thicker trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.05, 0.08, trunkHeight, 7);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x6B4B2A });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = TH / 2 + trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);
    
    // Multiple canopy spheres
    const canopyPositions: Array<[number, number, number, number]> = [
      [0, trunkHeight + canopyRadius * 0.8, 0, canopyRadius],
      [-canopyRadius * 0.4, trunkHeight + canopyRadius * 0.5, canopyRadius * 0.3, canopyRadius * 0.7],
      [canopyRadius * 0.4, trunkHeight + canopyRadius * 0.5, -canopyRadius * 0.3, canopyRadius * 0.6],
    ];
    
    const canopyMaterial = new THREE.MeshLambertMaterial({ color: foliageColor });
    canopyPositions.forEach(([ox, oy, oz, r]) => {
      const geometry = new THREE.SphereGeometry(r, 8, 6);
      const sphere = new THREE.Mesh(geometry, canopyMaterial);
      sphere.position.set(ox, TH / 2 + oy, oz);
      sphere.castShadow = true;
      group.add(sphere);
    });
  }
  // Mature tree (6-9)
  else if (growthStage <= 9) {
    // Full trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.07, 0.11, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x6B4B2A });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = TH / 2 + trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);
    
    // Lush canopy
    const canopyRadiusLg = canopyRadius * 1.2;
    const canopyPositions: Array<[number, number, number, number]> = [
      [0, trunkHeight + canopyRadiusLg, 0, canopyRadiusLg],
      [-canopyRadiusLg * 0.5, trunkHeight + canopyRadiusLg * 0.7, canopyRadiusLg * 0.4, canopyRadiusLg * 0.8],
      [canopyRadiusLg * 0.5, trunkHeight + canopyRadiusLg * 0.7, -canopyRadiusLg * 0.4, canopyRadiusLg * 0.75],
      [0, trunkHeight + canopyRadiusLg * 0.4, canopyRadiusLg * 0.5, canopyRadiusLg * 0.6],
      [canopyRadiusLg * 0.4, trunkHeight + canopyRadiusLg * 0.4, 0, canopyRadiusLg * 0.55],
    ];
    
    const canopyMaterial = new THREE.MeshLambertMaterial({ color: foliageColor });
    canopyPositions.forEach(([ox, oy, oz, r]) => {
      const geometry = new THREE.SphereGeometry(r, 8, 6);
      const sphere = new THREE.Mesh(geometry, canopyMaterial);
      sphere.position.set(ox, TH / 2 + oy, oz);
      sphere.castShadow = true;
      group.add(sphere);
    });
  }
  // Grand tree (10-14)
  else {
    // Large trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.09, 0.14, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = TH / 2 + trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);
    
    // Abundant foliage
    const canopyRadiusGrand = canopyRadius * 1.4;
    const canopyPositions: Array<[number, number, number, number]> = [
      [0, trunkHeight + canopyRadiusGrand, 0, canopyRadiusGrand],
      [-canopyRadiusGrand * 0.55, trunkHeight + canopyRadiusGrand * 0.75, canopyRadiusGrand * 0.45, canopyRadiusGrand * 0.85],
      [canopyRadiusGrand * 0.55, trunkHeight + canopyRadiusGrand * 0.75, -canopyRadiusGrand * 0.45, canopyRadiusGrand * 0.85],
      [-canopyRadiusGrand * 0.3, trunkHeight + canopyRadiusGrand * 0.5, -canopyRadiusGrand * 0.5, canopyRadiusGrand * 0.7],
      [canopyRadiusGrand * 0.3, trunkHeight + canopyRadiusGrand * 0.5, canopyRadiusGrand * 0.5, canopyRadiusGrand * 0.7],
      [canopyRadiusGrand * 0.5, trunkHeight + canopyRadiusGrand * 0.35, 0, canopyRadiusGrand * 0.5],
      [-canopyRadiusGrand * 0.5, trunkHeight + canopyRadiusGrand * 0.35, 0, canopyRadiusGrand * 0.45],
    ];
    
    const canopyMaterial = new THREE.MeshLambertMaterial({ color: foliageColor });
    canopyPositions.forEach(([ox, oy, oz, r]) => {
      const geometry = new THREE.SphereGeometry(r, 8, 6);
      const sphere = new THREE.Mesh(geometry, canopyMaterial);
      sphere.position.set(ox, TH / 2 + oy, oz);
      sphere.castShadow = true;
      group.add(sphere);
    });
    
    // Add subtle flowers/fruit for the grandest trees (stage 12+)
    if (growthStage >= 12) {
      const fruitColor = skillPathId?.includes('fruit') ? 0xFF4444 : 0xFFFF88;
      const fruitMaterial = new THREE.MeshLambertMaterial({ color: fruitColor });
      
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const fruitGeometry = new THREE.SphereGeometry(0.04, 6, 4);
        const fruit = new THREE.Mesh(fruitGeometry, fruitMaterial);
        fruit.position.set(
          Math.cos(angle) * canopyRadiusGrand * 0.6,
          TH / 2 + trunkHeight + canopyRadiusGrand * 0.6,
          Math.sin(angle) * canopyRadiusGrand * 0.6
        );
        group.add(fruit);
      }
    }
  }
  
  // Add health indicator ring for unhealthy trees
  if (health < 50 && !isDead) {
    const indicatorColor = health < 20 ? 0xFF0000 : 0xFFAA00;
    const ringGeometry = new THREE.TorusGeometry(0.2, 0.02, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: indicatorColor });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = TH / 2 + 0.02;
    group.add(ring);
  }
  
  // Position at grid location
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  // Store metadata for interactions
  group.userData = {
    type: 'learningTree',
    gx,
    gz,
    growthStage,
    health,
    skillPathId,
    status,
    isDead,
  };
  
  return group;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Blend two hex colors together.
 */
function blendColors(color1: number, color2: number, ratio: number): number {
  const r1 = (color1 >> 16) & 0xFF;
  const g1 = (color1 >> 8) & 0xFF;
  const b1 = color1 & 0xFF;
  
  const r2 = (color2 >> 16) & 0xFF;
  const g2 = (color2 >> 8) & 0xFF;
  const b2 = color2 & 0xFF;
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return (r << 16) | (g << 8) | b;
}

/**
 * Update a learning tree's appearance after data changes.
 * Call when growth stage, health, or status changes.
 */
export function updateLearningTree(
  group: THREE.Group,
  updates: Partial<LearningTreeOptions>
): void {
  const currentData = group.userData;
  const newOptions: LearningTreeOptions = {
    gx: currentData.gx ?? 0,
    gz: currentData.gz ?? 0,
    growthStage: updates.growthStage ?? currentData.growthStage ?? 0,
    health: updates.health ?? currentData.health ?? 100,
    skillPathId: updates.skillPathId ?? currentData.skillPathId,
    status: updates.status ?? currentData.status ?? TreeStatus.GROWING,
    isDead: updates.isDead ?? currentData.isDead ?? false,
  };
  
  // Rebuild the tree (Three.js groups don't support easy child replacement)
  // This is acceptable since tree updates are rare (after lessons)
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  }
  
  // Create new mesh and add to group
  const newTree = makeLearningTree(newOptions);
  newTree.children.forEach(child => {
    group.add(child.clone());
  });
  
  // Update userData
  Object.assign(group.userData, newOptions);
}

/**
 * Get a descriptive label for growth stage.
 */
export function getGrowthStageLabel(stage: number): string {
  if (stage === 0) return 'Seed';
  if (stage <= 2) return 'Sapling';
  if (stage <= 5) return 'Young Tree';
  if (stage <= 9) return 'Mature Tree';
  if (stage <= 12) return 'Grand Tree';
  return 'Ancient Tree';
}

/**
 * Get the SunDrops needed to reach the next growth stage.
 */
export function getSunDropsToNextStage(currentStage: number): number {
  if (currentStage >= GROWTH_THRESHOLDS.length - 1) return 0;
  return GROWTH_THRESHOLDS[currentStage + 1] - GROWTH_THRESHOLDS[currentStage];
}