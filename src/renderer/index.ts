/**
 * Garden Renderer Module
 * 
 * Provides Three.js-based 3D garden rendering capabilities including:
 * - Isometric tile-based garden visualization
 * - Customizable avatar with clothing and hat options
 * - Placeable garden objects (trees, flowers, furniture, features, plants)
 * - Animated objects (fountains, ponds)
 * - Click-to-walk avatar movement
 * - Object placement with ghost preview
 * 
 * @example
 * import { GardenRenderer, SHOP_CATALOGUE, DEFAULT_AVATAR } from '@/renderer';
 * 
 * const renderer = new GardenRenderer({
 *   canvas: document.getElementById('canvas'),
 *   avatarOptions: DEFAULT_AVATAR,
 *   onAvatarMove: (gx, gz) => console.log('Moved to', gx, gz),
 * });
 * 
 * renderer.animate();
 * renderer.placeObject('oak', 5, 5);
 */

// ============================================================================
// MAIN EXPORTS
// ============================================================================

export { GardenRenderer } from './GardenRenderer';
export { AtmosphereBuilder } from './AtmosphereBuilder';
export { buildAvatar, positionAvatarAtGrid, positionAvatarAtWorld } from './AvatarBuilder';

// ============================================================================
// TYPES
// ============================================================================

export type {
  AvatarOptions,
  HatStyle,
  AvatarGender,
  ShopItem,
  ObjectCategory,
  PlacedObject,
  TileType,
  Tile,
  MovementTarget,
  RendererState,
  GardenRendererOptions,
} from './types';

export {
  GRID_SIZE,
  TILE_WIDTH,
  TILE_HEIGHT,
  DEFAULT_AVATAR,
  AVATAR_COLORS,
  SHOP_CATALOGUE,
} from './types';

// ============================================================================
// OBJECT FACTORIES
// ============================================================================

export {
  createObject,
  isValidObjectType,
  getObjectTypes,
  getObjectCategory,
  OBJECT_CATEGORIES,
  objectFactories,
  updateAnimatedObjects,
  updatePlacedObjectAnimations,
} from './objects/objectFactory';

// Individual object factories for direct access
export { treeFactories, makeOak, makePine, makeCherry, makeMaple, makeWillow, makePalm } from './objects/trees';
export { flowerFactories, makeFlower, FLOWER_CONFIGS } from './objects/flowers';
export { furnitureFactories, makeBench, makeLantern, makeSign } from './objects/furniture';
export { featureFactories, makeFountain, makePond, updateFountainAnimation, updatePondAnimation } from './objects/features';
export { plantFactories, makeHedge, makeMushroom } from './objects/plants';

// ============================================================================
// LEARNING TREES
// ============================================================================

export {
  makeLearningTree,
  calculateGrowthStage,
  updateLearningTree,
  getGrowthStageLabel,
  getSunDropsToNextStage,
  GROWTH_THRESHOLDS,
  SKILL_PATH_COLORS,
} from './objects/learningTrees';

export type { LearningTreeOptions } from './objects/learningTrees';

// ============================================================================
// GRID UTILITIES
// ============================================================================

export {
  gridToWorld,
  worldToGrid,
  getGroundY,
  cellKey,
  parseCellKey,
  isValidCell,
  getAdjacentCells,
  gridDistance,
  worldDistance,
  generateDefaultPathTilemap,
  isPathCell,
  getTileColor,
} from './gridUtils';
