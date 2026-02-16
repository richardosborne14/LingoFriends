/**
 * Tree Object Factories for Garden Renderer
 * 
 * Creates 6 different tree types using Three.js geometry:
 * - Oak: Broad leafy tree with sphere clusters
 * - Pine: Tapered cone layers
 * - Cherry: Pink blossom tree
 * - Maple: Autumn-colored cone layers
 * - Willow: Drooping branches
 * - Palm: Leaning trunk with fronds
 * 
 * All trees are geometry-only (no external textures).
 * 
 * @module renderer/objects/trees
 */

import * as THREE from 'three';
import { gridToWorld } from '../gridUtils';
import { TILE_HEIGHT } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Half tile height for positioning objects on ground */
const TH = TILE_HEIGHT;

// ============================================================================
// OAK TREE
// ============================================================================

/**
 * Create an oak tree with broad leafy canopy.
 * Uses overlapping spheres in different shades of green.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the oak tree
 */
export function makeOak(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Trunk - brown cylinder
  const trunkGeometry = new THREE.CylinderGeometry(0.085, 0.13, 0.55, 7);
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x6B4B2A });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = TH / 2 + 0.275;
  trunk.castShadow = true;
  group.add(trunk);
  
  // Foliage - three overlapping spheres with varying greens
  const foliageData: Array<[ox: number, oy: number, oz: number, r: number, color: number]> = [
    [0, 0.8, 0, 0.42, 0x2A7A2A],      // Center - darker green
    [-0.2, 0.67, 0.12, 0.31, 0x1E6B1E], // Left-front
    [0.18, 0.64, -0.12, 0.29, 0x185A18], // Right-back
  ];
  
  foliageData.forEach(([ox, oy, oz, r, color]) => {
    const sphereGeometry = new THREE.SphereGeometry(r, 8, 8);
    const sphereMaterial = new THREE.MeshLambertMaterial({ color });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(ox, TH / 2 + oy, oz);
    sphere.castShadow = true;
    group.add(sphere);
  });
  
  // Position at grid location
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// PINE TREE
// ============================================================================

/**
 * Create a pine tree with layered cones.
 * Classic Christmas tree shape with decreasing cone sizes.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the pine tree
 */
export function makePine(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Trunk
  const trunkGeometry = new THREE.CylinderGeometry(0.05, 0.09, 0.44, 6);
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x7C5533 });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = TH / 2 + 0.22;
  trunk.castShadow = true;
  group.add(trunk);
  
  // Foliage layers - three cones
  const coneData: Array<[r: number, h: number, yOff: number, color: number]> = [
    [0.52, 0.42, 0.18, 0x145414], // Bottom - lighter
    [0.38, 0.52, 0.42, 0x145414], // Middle
    [0.24, 0.36, 0.66, 0x0E3E0E], // Top - darker
  ];
  
  coneData.forEach(([r, h, yOff, color], _index) => {
    const coneGeometry = new THREE.ConeGeometry(r, h, 7);
    const coneMaterial = new THREE.MeshLambertMaterial({ color });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = TH / 2 + 0.42 + yOff * 0.42;
    cone.castShadow = true;
    group.add(cone);
  });
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// CHERRY BLOSSOM TREE
// ============================================================================

/**
 * Create a cherry blossom tree with pink flowers.
 * Similar structure to oak but with pink foliage.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the cherry tree
 */
export function makeCherry(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Trunk
  const trunkGeometry = new THREE.CylinderGeometry(0.065, 0.1, 0.5, 7);
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x6B3A2A });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = TH / 2 + 0.25;
  trunk.castShadow = true;
  group.add(trunk);
  
  // Blossoms - pink spheres
  const blossomData: Array<[ox: number, oy: number, oz: number, r: number, color: number]> = [
    [0, 0.78, 0, 0.38, 0xFF8EC4],      // Center - lighter pink
    [-0.19, 0.67, 0.13, 0.28, 0xFF6699], // Left
    [0.17, 0.65, -0.13, 0.27, 0xFF6699], // Right
  ];
  
  blossomData.forEach(([ox, oy, oz, r, color]) => {
    const sphereGeometry = new THREE.SphereGeometry(r, 8, 8);
    const sphereMaterial = new THREE.MeshLambertMaterial({ color });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(ox, TH / 2 + oy, oz);
    sphere.castShadow = true;
    group.add(sphere);
  });
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// MAPLE TREE
// ============================================================================

/**
 * Create a maple tree with autumn colors.
 * Layered cones in oranges and reds.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the maple tree
 */
export function makeMaple(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Trunk
  const trunkGeometry = new THREE.CylinderGeometry(0.07, 0.11, 0.52, 7);
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x7A4A2A });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = TH / 2 + 0.26;
  trunk.castShadow = true;
  group.add(trunk);
  
  // Autumn foliage colors
  const palette = [0xE85D04, 0xFF9A00, 0xDC2F02];
  
  // Foliage layers
  const coneData: Array<[r: number, h: number, off: number]> = [
    [0.52, 0.52, 0],    // Bottom
    [0.4, 0.48, 0.28],  // Middle
    [0.26, 0.38, 0.52], // Top
  ];
  
  coneData.forEach(([r, h, off], index) => {
    const coneGeometry = new THREE.ConeGeometry(r, h, 7);
    const coneMaterial = new THREE.MeshLambertMaterial({ color: palette[index] });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = TH / 2 + 0.52 + off * 0.44;
    cone.castShadow = true;
    group.add(cone);
  });
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// WEEPING WILLOW TREE
// ============================================================================

/**
 * Create a weeping willow with drooping branches.
 * Central canopy with elongated strand spheres around the edge.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the willow tree
 */
export function makeWillow(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Tall trunk
  const trunkGeometry = new THREE.CylinderGeometry(0.065, 0.11, 0.85, 7);
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x6B4B2A });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = TH / 2 + 0.425;
  trunk.castShadow = true;
  group.add(trunk);
  
  // Main canopy - flattened sphere
  const canopyGeometry = new THREE.SphereGeometry(0.45, 8, 8);
  const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x3A9B3A });
  const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
  canopy.position.y = TH / 2 + 0.95;
  canopy.scale.y = 0.68; // Flatten vertically
  group.add(canopy);
  
  // Drooping strands
  const strandMaterial = new THREE.MeshLambertMaterial({ color: 0x2A7A2A });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    
    const strandGeometry = new THREE.SphereGeometry(0.12, 5, 5);
    const strand = new THREE.Mesh(strandGeometry, strandMaterial);
    strand.position.set(
      Math.cos(angle) * 0.42,
      TH / 2 + 0.44,
      Math.sin(angle) * 0.42
    );
    strand.scale.set(0.55, 1.9, 0.55); // Elongate vertically
    strand.castShadow = true;
    group.add(strand);
  }
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// PALM TREE
// ============================================================================

/**
 * Create a palm tree with leaning trunk and fronds.
 * Tropical appearance with coconuts.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the palm tree
 */
export function makePalm(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Leaning trunk
  const trunkGeometry = new THREE.CylinderGeometry(0.055, 0.095, 1.15, 7);
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0xA08050 });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = TH / 2 + 0.575;
  trunk.rotation.z = 0.09; // Slight lean
  trunk.castShadow = true;
  group.add(trunk);
  
  // Fronds - 7 box-shaped leaves at different angles
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    
    const frondGeometry = new THREE.BoxGeometry(0.62, 0.04, 0.14);
    const frondMaterial = new THREE.MeshLambertMaterial({
      color: i % 2 === 0 ? 0x2A7A2A : 0x367836, // Alternate shades
    });
    const frond = new THREE.Mesh(frondGeometry, frondMaterial);
    frond.position.set(
      Math.cos(angle) * 0.3,
      TH / 2 + 1.1,
      Math.sin(angle) * 0.3
    );
    frond.rotation.y = angle;
    frond.rotation.z = 0.32; // Tilt outward
    frond.castShadow = true;
    group.add(frond);
  }
  
  // Coconuts - two small spheres
  const coconutPositions: Array<[cx: number, cz: number]> = [
    [0.09, -0.11],
    [-0.11, -0.09],
  ];
  
  coconutPositions.forEach(([cx, cz]) => {
    const coconutGeometry = new THREE.SphereGeometry(0.07, 6, 6);
    const coconutMaterial = new THREE.MeshLambertMaterial({ color: 0x7A5523 });
    const coconut = new THREE.Mesh(coconutGeometry, coconutMaterial);
    coconut.position.set(cx, TH / 2 + 0.99, cz);
    group.add(coconut);
  });
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// TREE TYPE MAP
// ============================================================================

/**
 * Map of tree type IDs to factory functions.
 */
export const treeFactories: Record<string, (gx: number, gz: number) => THREE.Group> = {
  oak: makeOak,
  pine: makePine,
  cherry: makeCherry,
  maple: makeMaple,
  willow: makeWillow,
  palm: makePalm,
};