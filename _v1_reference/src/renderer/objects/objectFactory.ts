/**
 * Object Factory Dispatcher for Garden Renderer
 * 
 * Central factory that routes object creation to the appropriate
 * specialized factory (trees, flowers, furniture, features, plants).
 * 
 * Also exports animation update functions for animated objects.
 * 
 * @module renderer/objects/objectFactory
 */

import * as THREE from 'three';
import { treeFactories } from './trees';
import { flowerFactories } from './flowers';
import { furnitureFactories } from './furniture';
import { featureFactories, updateFountainAnimation, updatePondAnimation } from './features';
import { plantFactories } from './plants';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Factory function type for creating garden objects.
 */
export type ObjectFactory = (gx: number, gz: number) => THREE.Group;

// ============================================================================
// COMBINED FACTORY REGISTRY
// ============================================================================

/**
 * Combined registry of all object factories.
 * Merges trees, flowers, furniture, features, and plants.
 */
export const objectFactories: Record<string, ObjectFactory> = {
  ...treeFactories,
  ...flowerFactories,
  ...furnitureFactories,
  ...featureFactories,
  ...plantFactories,
};

// ============================================================================
// OBJECT CREATION
// ============================================================================

/**
 * Create a garden object by type ID.
 * 
 * @param objectType - The object type ID (e.g., 'oak', 'rose', 'fountain')
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns THREE.Group containing the object, or null if type not found
 * 
 * @example
 * const tree = createObject('oak', 5, 5);
 * if (tree) {
 *   scene.add(tree);
 * }
 */
export function createObject(
  objectType: string,
  gx: number,
  gz: number
): THREE.Group | null {
  const factory = objectFactories[objectType];
  if (!factory) {
    console.warn(`Unknown object type: ${objectType}`);
    return null;
  }
  return factory(gx, gz);
}

/**
 * Check if an object type is valid.
 * 
 * @param objectType - The object type ID to check
 * @returns true if the type exists in the factory registry
 */
export function isValidObjectType(objectType: string): boolean {
  return objectType in objectFactories;
}

/**
 * Get all available object type IDs.
 * 
 * @returns Array of valid object type IDs
 */
export function getObjectTypes(): string[] {
  return Object.keys(objectFactories);
}

// ============================================================================
// ANIMATION UPDATES
// ============================================================================

/**
 * Update all animated objects in a scene.
 * Call this once per frame in the animation loop.
 * 
 * Handles:
 * - Fountain water particles
 * - Pond ripple effects
 * - Lantern flicker (TODO if needed)
 * 
 * @param scene - The Three.js scene containing animated objects
 * @param time - Current elapsed time in seconds
 */
export function updateAnimatedObjects(scene: THREE.Scene, time: number): void {
  scene.traverse((object) => {
    if (object instanceof THREE.Group) {
      // Update fountain animations
      if (object.userData.isFountain) {
        updateFountainAnimation(object, time);
      }
      
      // Update pond animations
      if (object.userData.isPond) {
        updatePondAnimation(object, time);
      }
    }
  });
}

/**
 * Update animated objects from a list of placed objects.
 * More efficient than scene traversal when you have the object list.
 * 
 * @param objects - Array of placed objects with mesh references
 * @param time - Current elapsed time in seconds
 */
export function updatePlacedObjectAnimations(
  objects: Array<{ mesh?: THREE.Group }>,
  time: number
): void {
  objects.forEach(({ mesh }) => {
    if (!mesh) return;
    
    if (mesh.userData.isFountain) {
      updateFountainAnimation(mesh, time);
    }
    
    if (mesh.userData.isPond) {
      updatePondAnimation(mesh, time);
    }
  });
}

// ============================================================================
// CATEGORY HELPERS
// ============================================================================

/**
 * Object type categories for shop organization.
 */
export const OBJECT_CATEGORIES = {
  trees: Object.keys(treeFactories),
  flowers: Object.keys(flowerFactories),
  furniture: Object.keys(furnitureFactories),
  features: Object.keys(featureFactories),
  plants: Object.keys(plantFactories),
} as const;

/**
 * Get the category of an object type.
 * 
 * @param objectType - The object type ID
 * @returns Category name or undefined if not found
 */
export function getObjectCategory(objectType: string): string | undefined {
  for (const [category, types] of Object.entries(OBJECT_CATEGORIES)) {
    if (types.includes(objectType)) {
      return category;
    }
  }
  return undefined;
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { treeFactories } from './trees';
export { flowerFactories, FLOWER_CONFIGS } from './flowers';
export { furnitureFactories } from './furniture';
export { featureFactories, updateFountainAnimation, updatePondAnimation } from './features';
export { plantFactories } from './plants';