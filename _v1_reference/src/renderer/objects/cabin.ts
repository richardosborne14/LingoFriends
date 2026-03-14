/**
 * Cabin Exterior - Decorative cabin in the garden corner
 * 
 * A simple cabin structure that adds visual interest to the garden.
 * When clicked, shows "Coming soon!" toast notification.
 * 
 * @module renderer/objects/cabin
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for the cabin.
 */
export interface CabinConfig {
  /** Position offset from garden corner */
  position: { x: number; z: number };
  /** Scale multiplier */
  scale: number;
}

/**
 * Default cabin configuration.
 * Positioned in the corner of the garden, away from the center.
 */
export const DEFAULT_CABIN_CONFIG: CabinConfig = {
  position: { x: -3.5, z: -3.5 }, // NW corner
  scale: 1,
};

// ============================================================================
// CABIN BUILDER
// ============================================================================

/**
 * Build a procedural cabin structure.
 * Uses box primitives for a cozy, low-poly look.
 */
export function buildCabin(config: CabinConfig = DEFAULT_CABIN_CONFIG): THREE.Group {
  const cabin = new THREE.Group();
  cabin.name = 'cabin';
  
  // Materials
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Saddle brown
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Dark brown
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x4A3728 }); // Wood dark
  const windowMat = new THREE.MeshLambertMaterial({ color: 0xADD8E6 }); // Light blue (glass)
  const chimneyMat = new THREE.MeshLambertMaterial({ color: 0xA0522D }); // Sienna
  
  // Main body (log cabin style)
  const bodyWidth = 1.2;
  const bodyHeight = 0.8;
  const bodyDepth = 1.0;
  
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth),
    wallMat
  );
  body.position.y = bodyHeight / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  cabin.add(body);
  
  // Log details - horizontal beams for log cabin effect
  const beamGeo = new THREE.BoxGeometry(bodyWidth * 1.02, 0.08, bodyDepth * 1.02);
  for (let y = 0.1; y < bodyHeight - 0.1; y += 0.2) {
    const beam = new THREE.Mesh(beamGeo, wallMat);
    beam.position.y = y + 0.04;
    beam.castShadow = true;
    cabin.add(beam);
  }
  
  // Roof (triangular prism using a cone geometry - cut in half)
  const roofHeight = 0.5;
  const roofGeo = new THREE.ConeGeometry(0.9, roofHeight, 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = bodyHeight + roofHeight / 2;
  roof.rotation.y = Math.PI / 4; // Align vertices with walls
  roof.scale.set(1, 1, 0.7); // Flatten for pitched roof aesthetic
  roof.castShadow = true;
  cabin.add(roof);
  
  // Alternative: A-Frame roof using box
  const roofBoxGeo = new THREE.BoxGeometry(bodyWidth * 1.3, 0.15, bodyDepth * 1.15);
  const roofBoxLeft = new THREE.Mesh(roofBoxGeo, roofMat);
  roofBoxLeft.position.set(-0.25, bodyHeight + 0.15, 0);
  roofBoxLeft.rotation.z = 0.4;
  roofBoxLeft.castShadow = true;
  cabin.add(roofBoxLeft);
  
  const roofBoxRight = new THREE.Mesh(roofBoxGeo, roofMat);
  roofBoxRight.position.set(0.25, bodyHeight + 0.15, 0);
  roofBoxRight.rotation.z = -0.4;
  roofBoxRight.castShadow = true;
  cabin.add(roofBoxRight);
  
  // Door (center front)
  const doorWidth = 0.25;
  const doorHeight = 0.45;
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, doorHeight, 0.05),
    doorMat
  );
  door.position.set(0, doorHeight / 2 + 0.02, bodyDepth / 2 + 0.01);
  door.castShadow = true;
  cabin.add(door);
  
  // Door frame
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x2C1810 });
  const frameGeo = new THREE.BoxGeometry(0.03, doorHeight + 0.04, 0.03);
  
  // Left frame
  const leftFrame = new THREE.Mesh(frameGeo, frameMat);
  leftFrame.position.set(-doorWidth / 2, doorHeight / 2 + 0.02, bodyDepth / 2 + 0.02);
  cabin.add(leftFrame);
  
  // Right frame
  const rightFrame = new THREE.Mesh(frameGeo, frameMat);
  rightFrame.position.set(doorWidth / 2, doorHeight / 2 + 0.02, bodyDepth / 2 + 0.02);
  cabin.add(rightFrame);
  
  // Top frame
  const topFrameGeo = new THREE.BoxGeometry(doorWidth + 0.06, 0.03, 0.03);
  const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
  topFrame.position.set(0, doorHeight + 0.04, bodyDepth / 2 + 0.02);
  cabin.add(topFrame);
  
  // Door handle
  const handleGeo = new THREE.SphereGeometry(0.02, 8, 8);
  const handleMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 }); // Gold
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(doorWidth / 2 - 0.05, doorHeight / 2, bodyDepth / 2 + 0.05);
  cabin.add(handle);
  
  // Windows (two on each side of door)
  const windowGeo = new THREE.BoxGeometry(0.18, 0.15, 0.02);
  
  // Left window
  const leftWindow = new THREE.Mesh(windowGeo, windowMat);
  leftWindow.position.set(-0.35, 0.45, bodyDepth / 2 + 0.01);
  cabin.add(leftWindow);
  
  // Window frame
  const windowFrameGeo = new THREE.BoxGeometry(0.04, 0.15, 0.03);
  const leftWindowFrame = new THREE.Mesh(windowFrameGeo, frameMat);
  leftWindowFrame.position.set(-0.35, 0.45, bodyDepth / 2 + 0.02);
  cabin.add(leftWindowFrame);
  
  // Right window
  const rightWindow = new THREE.Mesh(windowGeo, windowMat);
  rightWindow.position.set(0.35, 0.45, bodyDepth / 2 + 0.01);
  cabin.add(rightWindow);
  
  const rightWindowFrame = new THREE.Mesh(windowFrameGeo, frameMat);
  rightWindowFrame.position.set(0.35, 0.45, bodyDepth / 2 + 0.02);
  cabin.add(rightWindowFrame);
  
  // Window cross bars
  const crossH = new THREE.BoxGeometry(0.18, 0.02, 0.03);
  const crossV = new THREE.BoxGeometry(0.02, 0.15, 0.03);
  
  [-0.35, 0.35].forEach(xPos => {
    const hBar = new THREE.Mesh(crossH, frameMat);
    hBar.position.set(xPos, 0.45, bodyDepth / 2 + 0.02);
    cabin.add(hBar);
    
    const vBar = new THREE.Mesh(crossV, frameMat);
    vBar.position.set(xPos, 0.45, bodyDepth / 2 + 0.02);
    cabin.add(vBar);
  });
  
  // Chimney (on the roof)
  const chimneyWidth = 0.15;
  const chimneyHeight = 0.35;
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(chimneyWidth, chimneyHeight, chimneyWidth),
    chimneyMat
  );
  chimney.position.set(0.3, bodyHeight + roofHeight / 2 + chimneyHeight / 2, -0.2);
  chimney.castShadow = true;
  cabin.add(chimney);
  
  // Chimney cap
  const capGeo = new THREE.BoxGeometry(chimneyWidth + 0.04, 0.04, chimneyWidth + 0.04);
  const cap = new THREE.Mesh(capGeo, chimneyMat);
  cap.position.set(0.3, bodyHeight + roofHeight / 2 + chimneyHeight, -0.2);
  cabin.add(cap);
  
  // Foundation (slightly larger than body)
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWidth + 0.1, 0.08, bodyDepth + 0.1),
    new THREE.MeshLambertMaterial({ color: 0x696969 }) // Dim gray
  );
  foundation.position.y = 0.04;
  foundation.receiveShadow = true;
  cabin.add(foundation);
  
  // Steps
  const stepGeo = new THREE.BoxGeometry(0.4, 0.06, 0.15);
  const step = new THREE.Mesh(stepGeo, new THREE.MeshLambertMaterial({ color: 0x808080 }));
  step.position.set(0, 0.03, bodyDepth / 2 + 0.1);
  step.receiveShadow = true;
  cabin.add(step);
  
  // Apply position and scale from config
  cabin.position.set(config.position.x, 0, config.position.z);
  cabin.scale.setScalar(config.scale);
  
  return cabin;
}

/**
 * Get the bounding box for click detection.
 * Used for detecting clicks on the cabin.
 */
export function getCabinBounds(config: CabinConfig = DEFAULT_CABIN_CONFIG): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  const { position, scale } = config;
  const halfWidth = 0.8 * scale;
  const halfDepth = 0.65 * scale;
  
  return {
    minX: position.x - halfWidth,
    maxX: position.x + halfWidth,
    minZ: position.z - halfDepth,
    maxZ: position.z + halfDepth,
  };
}

/**
 * Check if a world position is within the cabin bounds.
 */
export function isInsideCabin(
  x: number,
  z: number,
  config: CabinConfig = DEFAULT_CABIN_CONFIG
): boolean {
  const bounds = getCabinBounds(config);
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}