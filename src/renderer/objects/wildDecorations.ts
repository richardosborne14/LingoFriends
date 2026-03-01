/**
 * Wild Decorations - Ambient world details outside the garden
 * 
 * Procedural decorations that make the world feel alive:
 * - Wild flowers scattered in grass
 * - Rocks and boulders
 * - Grass tufts with wind animation
 * - Distant trees (billboard sprites for performance)
 * 
 * All decorations are placed OUTSIDE the garden fence.
 * 
 * @module renderer/objects/wildDecorations
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for wild decoration spawning.
 */
export interface WildDecorationConfig {
  /** Garden size (decorations placed outside this area) */
  gardenSize: number;
  /** Total world size */
  worldSize: number;
  /** Number of flowers to spawn */
  flowerCount: number;
  /** Number of rocks to spawn */
  rockCount: number;
  /** Number of grass tufts */
  grassCount: number;
  /** Number of distant trees */
  treeCount: number;
}

/**
 * Default configuration for wild decorations.
 */
export const DEFAULT_WILD_DECORATION_CONFIG: WildDecorationConfig = {
  gardenSize: 10,
  worldSize: 30,
  flowerCount: 50,
  rockCount: 20,
  grassCount: 80,
  treeCount: 15,
};

// ============================================================================
// SEEDED RANDOM
// ============================================================================

/**
 * Create a seeded random number generator.
 * Used to ensure consistent decoration placement per user.
 */
function createSeededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff);
  };
}

// ============================================================================
// FLOWER BUILDER
// ============================================================================

/**
 * Build a procedural wild flower.
 */
function buildWildFlower(color: number): THREE.Group {
  const group = new THREE.Group();
  
  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 4);
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Forest green
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.075;
  group.add(stem);
  
  // Petals (simple cone or sphere)
  const petalGeo = new THREE.SphereGeometry(0.04, 6, 4);
  const petalMat = new THREE.MeshLambertMaterial({ color });
  const petals = new THREE.Mesh(petalGeo, petalMat);
  petals.position.y = 0.15;
  petals.scale.y = 0.6;
  group.add(petals);
  
  // Center
  const centerGeo = new THREE.SphereGeometry(0.015, 4, 4);
  const centerMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 }); // Gold
  const center = new THREE.Mesh(centerGeo, centerMat);
  center.position.y = 0.15;
  group.add(center);
  
  return group;
}

/**
 * Flower colors for variety.
 */
const FLOWER_COLORS = [
  0xFF69B4, // Hot pink
  0xFFD700, // Gold
  0xFF6347, // Tomato
  0xDA70D6, // Orchid
  0x87CEEB, // Sky blue
  0xFFFFFF, // White
];

// ============================================================================
// ROCK BUILDER
// ============================================================================

/**
 * Build a procedural rock/boulder.
 */
function buildRock(size: number): THREE.Group {
  const group = new THREE.Group();
  
  // Main rock body (irregular sphere)
  const rockGeo = new THREE.DodecahedronGeometry(size * 0.15, 0);
  const rockMat = new THREE.MeshLambertMaterial({ 
    color: 0x808080, // Gray
  });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  
  // Random rotation for variety
  rock.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  rock.scale.set(
    1 + Math.random() * 0.3,
    0.6 + Math.random() * 0.4,
    1 + Math.random() * 0.3
  );
  
  rock.castShadow = true;
  group.add(rock);
  
  return group;
}

// ============================================================================
// GRASS BUILDER
// ============================================================================

/**
 * Build a grass tuft with wind animation.
 */
function buildGrassTuft(): THREE.Group {
  const group = new THREE.Group();
  
  const bladeCount = 5 + Math.floor(Math.random() * 3);
  const bladeColors = [0x228B22, 0x32CD32, 0x2E8B57, 0x3CB371];
  
  for (let i = 0; i < bladeCount; i++) {
    const height = 0.08 + Math.random() * 0.08;
    const bladeGeo = new THREE.ConeGeometry(0.01, height, 3);
    const bladeMat = new THREE.MeshLambertMaterial({ 
      color: bladeColors[Math.floor(Math.random() * bladeColors.length)]
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    
    blade.position.set(
      (Math.random() - 0.5) * 0.05,
      height / 2,
      (Math.random() - 0.5) * 0.05
    );
    blade.rotation.set(
      (Math.random() - 0.5) * 0.3,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    );
    
    group.add(blade);
  }
  
  return group;
}

// ============================================================================
// DISTANT TREE BUILDER
// ============================================================================

/**
 * Build a distant tree (simplified billboard style).
 */
function buildDistantTree(type: 'pine' | 'oak' | 'round'): THREE.Group {
  const group = new THREE.Group();
  
  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.4, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.2;
  trunk.castShadow = true;
  group.add(trunk);
  
  const foliageMat = new THREE.MeshLambertMaterial({ 
    color: type === 'pine' ? 0x228B22 : 0x2E8B57 
  });
  
  if (type === 'pine') {
    // Cone-shaped foliage for pine
    const foliageGeo = new THREE.ConeGeometry(0.3, 0.8, 6);
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.y = 0.7;
    foliage.castShadow = true;
    group.add(foliage);
  } else if (type === 'oak') {
    // Spherical foliage for oak
    const foliageGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.y = 0.65;
    foliage.scale.y = 0.8;
    foliage.castShadow = true;
    group.add(foliage);
  } else {
    // Round foliage
    const foliageGeo = new THREE.SphereGeometry(0.3, 6, 5);
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.y = 0.55;
    foliage.castShadow = true;
    group.add(foliage);
  }
  
  return group;
}

// ============================================================================
// SCATTER FUNCTIONS
// ============================================================================

/**
 * Check if a position is outside the garden.
 */
function isOutsideGarden(x: number, z: number, gardenSize: number): boolean {
  const halfGarden = gardenSize / 2;
  const margin = 1; // Keep decorations away from fence
  return Math.abs(x) > halfGarden + margin || Math.abs(z) > halfGarden + margin;
}

/**
 * Generate positions for decorations outside the garden.
 */
function generatePositions(
  count: number,
  gardenSize: number,
  worldSize: number,
  seededRandom: () => number
): Array<{ x: number; z: number }> {
  const positions: Array<{ x: number; z: number }> = [];
  const halfWorld = worldSize / 2;
  
  for (let i = 0; i < count; i++) {
    let x: number;
    let z: number;
    let attempts = 0;
    
    do {
      x = (seededRandom() - 0.5) * worldSize;
      z = (seededRandom() - 0.5) * worldSize;
      attempts++;
    } while (!isOutsideGarden(x, z, gardenSize) && attempts < 20);
    
    if (attempts < 20) {
      positions.push({ x, z });
    }
  }
  
  return positions;
}

// ============================================================================
// MAIN BUILD FUNCTION
// ============================================================================

/**
 * Build all wild decorations for the world.
 * Returns a group that can be added to the scene and animated.
 */
export function buildWildDecorations(
  config: WildDecorationConfig = DEFAULT_WILD_DECORATION_CONFIG,
  userId?: string
): {
  group: THREE.Group;
  animate: (elapsed: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'wildDecorations';
  
  // Create seeded random from user ID (or random if no user ID)
  const seedBase = userId ? hashString(userId) : Math.random() * 1000000;
  const random = createSeededRandom(seedBase);
  
  // Animation state
  const animatedObjects: Array<{ mesh: THREE.Object3D; speed: number; phase: number }> = [];
  
  // ========================================================================
  // FLOWERS
  // ========================================================================
  
  const flowerPositions = generatePositions(
    config.flowerCount,
    config.gardenSize,
    config.worldSize,
    random
  );
  
  for (const pos of flowerPositions) {
    const color = FLOWER_COLORS[Math.floor(random() * FLOWER_COLORS.length)];
    const flower = buildWildFlower(color);
    flower.position.set(pos.x, 0, pos.z);
    flower.rotation.y = random() * Math.PI * 2;
    flower.scale.setScalar(0.8 + random() * 0.4);
    group.add(flower);
    
    // Animate flowers swaying
    animatedObjects.push({
      mesh: flower,
      speed: 1.5 + random() * 1.5,
      phase: random() * Math.PI * 2,
    });
  }
  
  // ========================================================================
  // ROCKS
  // ========================================================================
  
  const rockPositions = generatePositions(
    config.rockCount,
    config.gardenSize,
    config.worldSize,
    random
  );
  
  for (const pos of rockPositions) {
    const rock = buildRock(0.8 + random() * 0.4);
    rock.position.set(pos.x, 0, pos.z);
    rock.rotation.y = random() * Math.PI * 2;
    group.add(rock);
  }
  
  // ========================================================================
  // GRASS TUFTS
  // ========================================================================
  
  const grassPositions = generatePositions(
    config.grassCount,
    config.gardenSize,
    config.worldSize,
    random
  );
  
  for (const pos of grassPositions) {
    const grass = buildGrassTuft();
    grass.position.set(pos.x, 0, pos.z);
    grass.rotation.y = random() * Math.PI * 2;
    group.add(grass);
    
    // Animate grass swaying
    animatedObjects.push({
      mesh: grass,
      speed: 2 + random() * 2,
      phase: random() * Math.PI * 2,
    });
  }
  
  // ========================================================================
  // DISTANT TREES (at world edges)
  // ========================================================================
  
  const treeTypes: Array<'pine' | 'oak' | 'round'> = ['pine', 'oak', 'round'];
  const halfWorld = config.worldSize / 2;
  const halfGarden = config.gardenSize / 2;
  
  // Place trees around the perimeter
  for (let i = 0; i < config.treeCount; i++) {
    const type = treeTypes[Math.floor(random() * treeTypes.length)];
    const tree = buildDistantTree(type);
    
    // Position at edges
    let x: number;
    let z: number;
    
    const edge = Math.floor(random() * 4);
    const offset = (random() - 0.5) * config.worldSize * 0.8;
    
    switch (edge) {
      case 0: // North
        x = offset;
        z = -halfWorld + 1;
        break;
      case 1: // South
        x = offset;
        z = halfWorld - 1;
        break;
      case 2: // West
        x = -halfWorld + 1;
        z = offset;
        break;
      case 3: // East
        x = halfWorld - 1;
        z = offset;
        break;
      default:
        x = offset;
        z = -halfWorld + 1;
    }
    
    tree.position.set(x, 0, z);
    tree.rotation.y = random() * Math.PI * 2;
    tree.scale.setScalar(0.8 + random() * 0.4);
    group.add(tree);
  }
  
  // ========================================================================
  // ANIMATION FUNCTION
  // ========================================================================
  
  const animate = (elapsed: number) => {
    for (const obj of animatedObjects) {
      // Gentle swaying animation
      const sway = Math.sin(elapsed * obj.speed + obj.phase) * 0.05;
      obj.mesh.rotation.z = sway;
      obj.mesh.rotation.x = sway * 0.5;
    }
  };
  
  return { group, animate };
}

// ============================================================================
// HELPER
// ============================================================================

/**
 * Hash a string to a number for seeding.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}