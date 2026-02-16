/**
 * Furniture Object Factories for Garden Renderer
 * 
 * Creates 3 furniture types:
 * - Bench: Wooden bench with metal legs
 * - Lantern: Post with glowing light container (animated flicker)
 * - Sign: Wooden sign post
 * 
 * All furniture is geometry-only (no external textures).
 * Lanterns include PointLight for evening atmosphere.
 * 
 * @module renderer/objects/furniture
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
// BENCH
// ============================================================================

/**
 * Create a wooden bench with metal legs.
 * Classic park bench design.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the bench
 */
export function makeBench(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Materials
  const woodMaterial = new THREE.MeshLambertMaterial({ color: 0x8B6040 });
  const metalMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
  
  // Seat - wooden plank
  const seatGeometry = new THREE.BoxGeometry(0.52, 0.05, 0.22);
  const seat = new THREE.Mesh(seatGeometry, woodMaterial);
  seat.position.y = TH / 2 + 0.21;
  group.add(seat);
  
  // Backrest - vertical wooden plank
  const backGeometry = new THREE.BoxGeometry(0.52, 0.2, 0.04);
  const back = new THREE.Mesh(backGeometry, woodMaterial);
  back.position.set(0, TH / 2 + 0.36, -0.09);
  group.add(back);
  
  // Legs - 4 metal posts
  const legPositions: Array<[lx: number, lz: number]> = [
    [-0.21, 0.08],
    [0.21, 0.08],
    [-0.21, -0.08],
    [0.21, -0.08],
  ];
  
  legPositions.forEach(([lx, lz]) => {
    const legGeometry = new THREE.BoxGeometry(0.04, 0.22, 0.04);
    const leg = new THREE.Mesh(legGeometry, metalMaterial);
    leg.position.set(lx, TH / 2 + 0.11, lz);
    group.add(leg);
  });
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// LANTERN
// ============================================================================

/**
 * Create a lantern with glowing light.
 * Includes a PointLight for evening atmosphere.
 * Lanterns flicker via animation in the renderer.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the lantern
 */
export function makeLantern(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Dark material for pole and cap
  const darkMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
  
  // Pole - dark metal post
  const poleGeometry = new THREE.CylinderGeometry(0.026, 0.026, 0.58, 5);
  const pole = new THREE.Mesh(poleGeometry, darkMaterial);
  pole.position.y = TH / 2 + 0.29;
  group.add(pole);
  
  // Lantern box - glowing yellow/orange
  const boxGeometry = new THREE.BoxGeometry(0.13, 0.16, 0.13);
  const boxMaterial = new THREE.MeshLambertMaterial({
    color: 0xFFCC44,
    emissive: 0xFFAA00,
    emissiveIntensity: 1.4,
  });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.y = TH / 2 + 0.62;
  group.add(box);
  
  // Cap - pointed top
  const capGeometry = new THREE.ConeGeometry(0.11, 0.09, 4);
  const cap = new THREE.Mesh(capGeometry, darkMaterial);
  cap.position.y = TH / 2 + 0.71;
  group.add(cap);
  
  // Glow halo - transparent sphere for visual effect
  const haloGeometry = new THREE.SphereGeometry(0.08, 6, 6);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFDD88,
    transparent: true,
    opacity: 0.3,
  });
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.position.y = TH / 2 + 0.62;
  group.add(halo);
  
  // Point light - illuminates surrounding area
  const light = new THREE.PointLight(0xFFAA33, 3.0, 3.4);
  light.position.y = TH / 2 + 0.62;
  // Mark for animation (flicker effect in renderer)
  light.userData.isLanternLight = true;
  group.add(light);
  
  // Mark group for lantern animation
  group.userData.isLantern = true;
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// SIGN POST
// ============================================================================

/**
 * Create a wooden sign post.
 * Simple decorative element for the garden.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the sign
 */
export function makeSign(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Wood material
  const woodMaterial = new THREE.MeshLambertMaterial({ color: 0x9B7B50 });
  
  // Pole - vertical post
  const poleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.52, 5);
  const pole = new THREE.Mesh(poleGeometry, woodMaterial);
  pole.position.y = TH / 2 + 0.26;
  group.add(pole);
  
  // Board - horizontal sign face
  const boardGeometry = new THREE.BoxGeometry(0.32, 0.19, 0.04);
  const board = new THREE.Mesh(boardGeometry, woodMaterial);
  board.position.y = TH / 2 + 0.47;
  group.add(board);
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// FURNITURE TYPE MAP
// ============================================================================

/**
 * Map of furniture type IDs to factory functions.
 */
export const furnitureFactories: Record<string, (gx: number, gz: number) => THREE.Group> = {
  bench:   makeBench,
  lantern: makeLantern,
  sign:    makeSign,
};