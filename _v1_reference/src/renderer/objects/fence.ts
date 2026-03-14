/**
 * Garden Fence - Wooden fence around the garden perimeter
 * 
 * Creates a procedural wooden fence with posts and rails.
 * Leaves a gate opening for avatar entry/exit.
 * 
 * @module renderer/objects/fence
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for the fence.
 */
export interface FenceConfig {
  /** Size of the garden (fence is placed at gardenSize/2 + offset) */
  gardenSize: number;
  /** Distance from garden edge to fence */
  offset: number;
  /** Width of the gate opening (in world units) */
  gateWidth: number;
  /** Height of fence posts */
  postHeight: number;
  /** Height of fence rails */
  railHeight: number;
}

/**
 * Default fence configuration.
 */
export const DEFAULT_FENCE_CONFIG: FenceConfig = {
  gardenSize: 10,
  offset: 0.5,
  gateWidth: 1.5,
  postHeight: 0.6,
  railHeight: 0.3,
};

// ============================================================================
// FENCE BUILDER
// ============================================================================

/**
 * Build a wooden post.
 */
function buildPost(height: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(0.08, height, 0.08);
  const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Saddle brown
  const post = new THREE.Mesh(geometry, material);
  post.castShadow = true;
  post.receiveShadow = true;
  return post;
}

/**
 * Build a fence rail segment.
 */
function buildRail(length: number, height: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(length, 0.04, 0.04);
  const material = new THREE.MeshLambertMaterial({ color: 0xA0522D }); // Sienna
  const rail = new THREE.Mesh(geometry, material);
  rail.castShadow = true;
  return rail;
}

/**
 * Create the fence group with posts and rails.
 * 
 * The fence surrounds the garden with a gate opening on the south side.
 * Posts are placed at corners and at intervals along the edges.
 */
export function buildFence(config: FenceConfig = DEFAULT_FENCE_CONFIG): THREE.Group {
  const fence = new THREE.Group();
  fence.name = 'fence';
  
  const { gardenSize, offset, gateWidth, postHeight, railHeight } = config;
  const fenceDistance = gardenSize / 2 + offset; // Distance from center to fence
  
  // Post spacing (every 1.5 world units, roughly)
  const postSpacing = 1.5;
  
  // Calculate number of posts per side (excluding corners for now)
  const postsPerSide = Math.ceil(gardenSize / postSpacing);
  
  // Materials
  const postMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Saddle brown
  const railMat = new THREE.MeshLambertMaterial({ color: 0xA0522D }); // Sienna
  
  // Post geometry (shared)
  const postGeo = new THREE.BoxGeometry(0.08, postHeight, 0.08);
  
  // ========================================================================
  // CORNER POSTS
  // ========================================================================
  
  const corners = [
    { x: -fenceDistance, z: -fenceDistance }, // NW
    { x: fenceDistance, z: -fenceDistance },  // NE
    { x: fenceDistance, z: fenceDistance },   // SE
    { x: -fenceDistance, z: fenceDistance },  // SW
  ];
  
  for (const corner of corners) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(corner.x, postHeight / 2, corner.z);
    post.castShadow = true;
    fence.add(post);
  }
  
  // ========================================================================
  // SIDE POSTS AND RAILS (excluding gate area)
  // ========================================================================
  
  const halfGate = gateWidth / 2;
  
  // North side (z = -fenceDistance)
  buildFenceSide(
    fence,
    -fenceDistance,
    fenceDistance,
    -fenceDistance,
    'z', // Posts along X axis
    postHeight,
    railHeight,
    postMat,
    railMat,
    null // No gate on north side
  );
  
  // South side (z = +fenceDistance) - has gate opening
  buildFenceSide(
    fence,
    -fenceDistance,
    fenceDistance,
    fenceDistance,
    'z',
    postHeight,
    railHeight,
    postMat,
    railMat,
    { start: -halfGate, end: halfGate } // Gate opening
  );
  
  // West side (x = -fenceDistance)
  buildFenceSide(
    fence,
    -fenceDistance,
    fenceDistance,
    -fenceDistance,
    'x', // Posts along Z axis
    postHeight,
    railHeight,
    postMat,
    railMat,
    null
  );
  
  // East side (x = +fenceDistance)
  buildFenceSide(
    fence,
    -fenceDistance,
    fenceDistance,
    fenceDistance,
    'x',
    postHeight,
    railHeight,
    postMat,
    railMat,
    null
  );
  
  return fence;
}

/**
 * Build one side of the fence with posts and rails.
 */
function buildFenceSide(
  fence: THREE.Group,
  start: number,
  end: number,
  fixed: number,
  axis: 'x' | 'z',
  postHeight: number,
  railHeight: number,
  postMat: THREE.MeshLambertMaterial,
  railMat: THREE.MeshLambertMaterial,
  gate: { start: number; end: number } | null
): void {
  const postGeo = new THREE.BoxGeometry(0.08, postHeight, 0.08);
  const length = end - start;
  const postSpacing = 1.5;
  
  let prevPostPos: number | null = null;
  
  // Calculate post positions
  const postPositions: number[] = [start];
  for (let pos = start + postSpacing; pos < end; pos += postSpacing) {
    // Skip posts in gate area
    if (gate && pos >= gate.start && pos <= gate.end) continue;
    postPositions.push(pos);
  }
  postPositions.push(end);
  
  for (const pos of postPositions) {
    // Skip if this is in the gate area
    if (gate && pos >= gate.start && pos <= gate.end) {
      prevPostPos = null; // Break the rail continuity
      continue;
    }
    
    // Add post
    const post = new THREE.Mesh(postGeo, postMat);
    if (axis === 'x') {
      post.position.set(fixed, postHeight / 2, pos);
    } else {
      post.position.set(pos, postHeight / 2, fixed);
    }
    post.castShadow = true;
    fence.add(post);
    
    // Add rail segment to previous post
    if (prevPostPos !== null) {
      const railLength = pos - prevPostPos;
      const railGeo = new THREE.BoxGeometry(
        axis === 'z' ? railLength : 0.04,
        0.04,
        axis === 'x' ? railLength : 0.04
      );
      
      // Bottom rail
      const bottomRail = new THREE.Mesh(railGeo, railMat);
      const railCenter = (pos + prevPostPos) / 2;
      if (axis === 'x') {
        bottomRail.position.set(fixed, 0.15, railCenter);
      } else {
        bottomRail.position.set(railCenter, 0.15, fixed);
      }
      fence.add(bottomRail);
      
      // Top rail
      const topRail = new THREE.Mesh(railGeo, railMat);
      if (axis === 'x') {
        topRail.position.set(fixed, railHeight, railCenter);
      } else {
        topRail.position.set(railCenter, railHeight, fixed);
      }
      fence.add(topRail);
    }
    
    prevPostPos = pos;
  }
}

/**
 * Check if a world position is inside the garden fence.
 * Used to prevent placing decorations outside the fence.
 */
export function isInsideGarden(x: number, z: number, config: FenceConfig = DEFAULT_FENCE_CONFIG): boolean {
  const fenceDistance = config.gardenSize / 2 + config.offset;
  return Math.abs(x) < fenceDistance && Math.abs(z) < fenceDistance;
}

/**
 * Get the fence boundary distance from center.
 */
export function getFenceBoundary(config: FenceConfig = DEFAULT_FENCE_CONFIG): number {
  return config.gardenSize / 2 + config.offset;
}