/**
 * Flower Object Factory for Garden Renderer
 * 
 * Creates 6 flower types using a single parameterized factory function:
 * - Rose (red petals, gold center, 6 petals)
 * - Sunflower (yellow petals, brown center, 12 petals)
 * - Tulip (pink petals, yellow center, 4 petals)
 * - Lavender (purple petals, dark purple center, 8 petals)
 * - Daisy (white petals, gold center, 12 petals)
 * - Poppy (red/orange petals, black center, 5 petals)
 * 
 * All flowers are geometry-only (no external textures).
 * 
 * @module renderer/objects/flowers
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
// FLOWER FACTORY
// ============================================================================

/**
 * Flower configuration for predefined flower types.
 */
interface FlowerConfig {
  /** Petal color (hex) */
  petalColor: number;
  /** Center color (hex) */
  centerColor: number;
  /** Number of petals */
  numPetals: number;
}

/**
 * Predefined flower configurations.
 * Each flower has unique colors and petal count.
 */
export const FLOWER_CONFIGS: Record<string, FlowerConfig> = {
  rose:     { petalColor: 0xFF1744, centerColor: 0xFFD700, numPetals: 6  },
  sunflwr:  { petalColor: 0xFFD600, centerColor: 0x5C2E00, numPetals: 12 },
  tulip:    { petalColor: 0xFF69B4, centerColor: 0xFFFF99, numPetals: 4  },
  lavender: { petalColor: 0x9966CC, centerColor: 0x7B52AB, numPetals: 8  },
  daisy:    { petalColor: 0xFFFFFF, centerColor: 0xFFD700, numPetals: 12 },
  poppy:    { petalColor: 0xFF3300, centerColor: 0x111111, numPetals: 5  },
};

/**
 * Create a flower with customizable petals.
 * 
 * The flower is built from:
 * - A green stem (cylinder)
 * - A leaf (flattened sphere)
 * - Multiple petals arranged in a ring
 * - A center disc (sphere)
 * 
 * Petals are scaled spheres that appear flat and petal-like.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @param petalColor - Hex color for petals
 * @param centerColor - Hex color for center
 * @param numPetals - Number of petals (typically 4-12)
 * @returns THREE.Group containing the flower
 */
export function makeFlower(
  gx: number,
  gz: number,
  petalColor: number = 0xFF69B4,
  centerColor: number = 0xFFD700,
  numPetals: number = 6
): THREE.Group {
  const group = new THREE.Group();
  
  // Stem material (shared by stem and leaf)
  const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x2A7A1A });
  
  // Stem - thin green cylinder
  const stemGeometry = new THREE.CylinderGeometry(0.018, 0.022, 0.26, 5);
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.position.y = TH / 2 + 0.13;
  group.add(stem);
  
  // Leaf - flattened sphere on one side
  const leafGeometry = new THREE.SphereGeometry(0.09, 5, 5);
  const leaf = new THREE.Mesh(leafGeometry, stemMaterial);
  leaf.position.set(0.09, TH / 2 + 0.11, 0);
  leaf.scale.set(1.5, 0.33, 0.85); // Flatten to leaf shape
  group.add(leaf);
  
  // Petals - arranged in a ring around center
  const petalMaterial = new THREE.MeshLambertMaterial({ color: petalColor });
  
  for (let i = 0; i < numPetals; i++) {
    const angle = (i / numPetals) * Math.PI * 2;
    
    // Petal is a scaled sphere to appear flat
    const petalGeometry = new THREE.SphereGeometry(0.078, 6, 6);
    const petal = new THREE.Mesh(petalGeometry, petalMaterial);
    
    // Position in a ring around the center
    petal.position.set(
      Math.cos(angle) * 0.105,
      TH / 2 + 0.285,
      Math.sin(angle) * 0.105
    );
    
    // Scale to flatten into petal shape
    petal.scale.set(0.82, 0.28, 1.38);
    
    // Rotate to face outward from center
    petal.rotation.y = angle;
    
    group.add(petal);
  }
  
  // Center disc - slightly raised above petals
  const centerGeometry = new THREE.SphereGeometry(0.072, 7, 7);
  const centerMaterial = new THREE.MeshLambertMaterial({ color: centerColor });
  const center = new THREE.Mesh(centerGeometry, centerMaterial);
  center.position.y = TH / 2 + 0.295;
  group.add(center);
  
  // Position at grid location
  const { x, z } = gridToWorld(gx, gz);
  group.position.set(x, 0, z);
  
  return group;
}

// ============================================================================
// CONVENIENCE FACTORIES
// ============================================================================

/**
 * Create a rose (red petals, gold center).
 */
export function makeRose(gx: number, gz: number): THREE.Group {
  const config = FLOWER_CONFIGS.rose;
  return makeFlower(gx, gz, config.petalColor, config.centerColor, config.numPetals);
}

/**
 * Create a sunflower (yellow petals, brown center).
 */
export function makeSunflower(gx: number, gz: number): THREE.Group {
  const config = FLOWER_CONFIGS.sunflwr;
  return makeFlower(gx, gz, config.petalColor, config.centerColor, config.numPetals);
}

/**
 * Create a tulip (pink petals, yellow center).
 */
export function makeTulip(gx: number, gz: number): THREE.Group {
  const config = FLOWER_CONFIGS.tulip;
  return makeFlower(gx, gz, config.petalColor, config.centerColor, config.numPetals);
}

/**
 * Create lavender (purple petals, dark purple center).
 */
export function makeLavender(gx: number, gz: number): THREE.Group {
  const config = FLOWER_CONFIGS.lavender;
  return makeFlower(gx, gz, config.petalColor, config.centerColor, config.numPetals);
}

/**
 * Create a daisy (white petals, gold center).
 */
export function makeDaisy(gx: number, gz: number): THREE.Group {
  const config = FLOWER_CONFIGS.daisy;
  return makeFlower(gx, gz, config.petalColor, config.centerColor, config.numPetals);
}

/**
 * Create a poppy (red/orange petals, black center).
 */
export function makePoppy(gx: number, gz: number): THREE.Group {
  const config = FLOWER_CONFIGS.poppy;
  return makeFlower(gx, gz, config.petalColor, config.centerColor, config.numPetals);
}

// ============================================================================
// FLOWER TYPE MAP
// ============================================================================

/**
 * Map of flower type IDs to factory functions.
 */
export const flowerFactories: Record<string, (gx: number, gz: number) => THREE.Group> = {
  rose:     makeRose,
  sunflwr:  makeSunflower,
  tulip:    makeTulip,
  lavender: makeLavender,
  daisy:    makeDaisy,
  poppy:    makePoppy,
};