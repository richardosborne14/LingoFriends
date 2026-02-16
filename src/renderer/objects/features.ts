/**
 * Feature Object Factories for Garden Renderer
 * 
 * Creates animated garden features:
 * - Fountain: Stone fountain with water arc particles
 * - Pond: Water pond with lily pads and ripple rings
 * 
 * Both include animated effects that run in the renderer loop.
 * 
 * @module renderer/objects/features
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
// FOUNTAIN
// ============================================================================

/**
 * Create a stone fountain with animated water particles.
 * Water arcs up from a central column and falls back.
 * Animation handled in the renderer's animation loop.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the fountain
 */
export function makeFountain(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Materials
  const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const waterMaterial = new THREE.MeshLambertMaterial({ color: 0x3A9FD6 });
  
  // Base basin - tapered cylinder
  const basinGeometry = new THREE.CylinderGeometry(0.4, 0.33, 0.16, 13);
  const basin = new THREE.Mesh(basinGeometry, stoneMaterial);
  basin.position.y = TH / 2 + 0.08;
  group.add(basin);
  
  // Water surface - flat circle
  const surfGeometry = new THREE.CircleGeometry(0.32, 13);
  const surf = new THREE.Mesh(surfGeometry, waterMaterial);
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = TH / 2 + 0.155;
  group.add(surf);
  
  // Central column
  const colGeometry = new THREE.CylinderGeometry(0.058, 0.058, 0.34, 8);
  const col = new THREE.Mesh(colGeometry, stoneMaterial);
  col.position.y = TH / 2 + 0.245;
  group.add(col);
  
  // Top bowl
  const bowlGeometry = new THREE.CylinderGeometry(0.18, 0.14, 0.09, 11);
  const bowl = new THREE.Mesh(bowlGeometry, stoneMaterial);
  bowl.position.y = TH / 2 + 0.41;
  group.add(bowl);
  
  // Water arc particles - 18 droplets
  const dropMaterial = new THREE.MeshLambertMaterial({
    color: 0xAADDFF,
    transparent: true,
  });
  
  const drops: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i++) {
    const dropGeometry = new THREE.SphereGeometry(0.028, 4, 4);
    const drop = new THREE.Mesh(dropGeometry, dropMaterial.clone());
    
    // Store animation data in userData
    drop.userData = {
      angle: (i / 18) * Math.PI * 2,
      phase: i / 18,
    };
    
    drops.push(drop);
    group.add(drop);
  }
  
  // Store drops for animation
  group.userData.fountainDrops = drops;
  group.userData.isFountain = true;
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

/**
 * Update fountain animation each frame.
 * Moves water droplets in a parabolic arc.
 * 
 * @param fountain - The fountain group
 * @param time - Current elapsed time in seconds
 */
export function updateFountainAnimation(fountain: THREE.Group, time: number): void {
  const drops = fountain.userData.fountainDrops as THREE.Mesh[] | undefined;
  if (!drops) return;
  
  drops.forEach((drop) => {
    const phase = ((drop.userData.phase as number) + time * 0.5) % 1;
    const arc = Math.sin(phase * Math.PI);
    const r = arc * 0.26;
    
    drop.position.set(
      Math.cos(drop.userData.angle as number) * r,
      TH / 2 + 0.43 + arc * 0.48,
      Math.sin(drop.userData.angle as number) * r
    );
    
    const material = drop.material as THREE.MeshLambertMaterial;
    material.opacity = Math.min(1, arc * 2);
    
    drop.visible = phase < 0.94;
  });
}

// ============================================================================
// POND
// ============================================================================

/**
 * Create a pond with lily pads and ripple effects.
 * Ripples expand outward and fade over time.
 * Animation handled in the renderer's animation loop.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the pond
 */
export function makePond(gx: number, gz: number): THREE.Group {
  const group = new THREE.Group();
  
  // Outer rim - stone edge
  const rimGeometry = new THREE.CylinderGeometry(0.49, 0.44, 0.08, 14);
  const rimMaterial = new THREE.MeshLambertMaterial({ color: 0x777777 });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.position.y = TH / 2 + 0.04;
  group.add(rim);
  
  // Water surface - dark blue
  const waterGeometry = new THREE.CylinderGeometry(0.41, 0.41, 0.04, 14);
  const waterMaterial = new THREE.MeshLambertMaterial({ color: 0x0E4A8A });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.position.y = TH / 2 + 0.02;
  group.add(water);
  
  // Lily pads
  const lilyMaterial = new THREE.MeshLambertMaterial({ color: 0x2A7A1A });
  const lilyPositions: Array<[lx: number, lz: number]> = [
    [0.15, 0.12],
    [-0.18, -0.08],
  ];
  
  lilyPositions.forEach(([lx, lz]) => {
    const lilyGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.01, 8);
    const lily = new THREE.Mesh(lilyGeometry, lilyMaterial);
    lily.position.set(lx, TH / 2 + 0.042, lz);
    group.add(lily);
  });
  
  // Ripple rings - 3 expanding rings
  for (let i = 0; i < 3; i++) {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x5599BB,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    
    const ringGeometry = new THREE.RingGeometry(0.06, 0.095, 18);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = TH / 2 + 0.046;
    
    // Store animation data
    ring.userData = {
      phase: i / 3,
      isRipple: true,
    };
    
    group.add(ring);
  }
  
  // Mark for animation
  group.userData.isPond = true;
  
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

/**
 * Update pond animation each frame.
 * Expands ripple rings outward and fades them.
 * 
 * @param pond - The pond group
 * @param time - Current elapsed time in seconds
 */
export function updatePondAnimation(pond: THREE.Group, time: number): void {
  pond.children.forEach((child) => {
    if (!child.userData.isRipple) return;
    
    const mesh = child as THREE.Mesh;
    const phase = ((child.userData.phase as number) + time * 0.26) % 1;
    const scale = 0.4 + phase * 4.2;
    
    mesh.scale.set(scale, scale, scale);
    
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.opacity = (1 - phase) * 0.48;
  });
}

// ============================================================================
// FEATURE TYPE MAP
// ============================================================================

/**
 * Map of feature type IDs to factory functions.
 */
export const featureFactories: Record<string, (gx: number, gz: number) => THREE.Group> = {
  fountain: makeFountain,
  pond:     makePond,
};