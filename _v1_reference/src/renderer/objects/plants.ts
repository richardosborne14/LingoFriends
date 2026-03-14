/**
 * Plant Object Factories for Garden Renderer
 * 
 * Creates 2 plant types:
 * - Hedge: Round bush for decoration
 * - Mushroom: Small toadstool
 * 
 * All plants are geometry-only (no external textures).
 * 
 * @module renderer/objects/plants
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
// HEDGE BUSH
// ============================================================================

/**
 * Create a round hedge bush.
 * Multiple sphere clusters in varying greens.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the hedge
 */
export function makeHedge(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Main bush - center sphere
  const mainGeometry = new THREE.SphereGeometry(0.32, 7, 7);
  const mainMaterial = new THREE.MeshLambertMaterial({ color: 0x2A7A1A });
  const main = new THREE.Mesh(mainGeometry, mainMaterial);
  main.position.y = TH / 2 + 0.28;
  main.castShadow = true;
  group.add(main);
  
  // Additional spheres for fuller look
  const bushData: Array<[ox: number, oz: number, r: number]> = [
    [0.24, 0, 0.18],
    [-0.22, 0.09, 0.17],
    [0.07, 0.2, 0.15],
    [-0.07, -0.16, 0.13],
  ];
  
  const darkerMaterial = new THREE.MeshLambertMaterial({ color: 0x226822 });
  
  bushData.forEach(([ox, oz, r], index) => {
    const sphereGeometry = new THREE.SphereGeometry(r, 6, 6);
    const sphere = new THREE.Mesh(
      sphereGeometry,
      index % 2 === 0 ? mainMaterial : darkerMaterial
    );
    sphere.position.set(ox, TH / 2 + r + 0.08, oz);
    sphere.castShadow = true;
    group.add(sphere);
  });
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// MUSHROOM
// ============================================================================

/**
 * Create a small toadstool mushroom.
 * Red cap with white spots on a stem.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the mushroom
 */
export function makeMushroom(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Stem - white/beige cylinder
  const stemGeometry = new THREE.CylinderGeometry(0.05, 0.058, 0.2, 6);
  const stemMaterial = new THREE.MeshLambertMaterial({ color: 0xF5F5DC });
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.position.y = TH / 2 + 0.1;
  group.add(stem);
  
  // Cap - red hemisphere
  const capGeometry = new THREE.SphereGeometry(0.12, 7, 7, 0, Math.PI * 2, 0, Math.PI / 2);
  const capMaterial = new THREE.MeshLambertMaterial({ color: 0xCC2222 });
  const cap = new THREE.Mesh(capGeometry, capMaterial);
  cap.position.y = TH / 2 + 0.2;
  group.add(cap);
  
  // White spots on cap
  const spotMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const spotPositions: Array<[sx: number, sy: number, sz: number]> = [
    [0.04, 0.26, 0.04],
    [-0.048, 0.255, -0.04],
    [0.075, 0.22, -0.055],
  ];
  
  spotPositions.forEach(([sx, sy, sz]) => {
    const spotGeometry = new THREE.SphereGeometry(0.024, 4, 4);
    const spot = new THREE.Mesh(spotGeometry, spotMaterial);
    spot.position.set(sx, TH / 2 + sy - TH / 2, sz);
    group.add(spot);
  });
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// PLANT TYPE MAP
// ============================================================================

/**
 * Map of plant type IDs to factory functions.
 */
export const plantFactories: Record<string, (gx: number, gz: number) => THREE.Group> = {
  hedge:    makeHedge,
  mushroom: makeMushroom,
};