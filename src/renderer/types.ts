/**
 * Types for the Three.js Garden Renderer
 * 
 * These types support the isometric 3D garden visualization including:
 * - Avatar customization options
 * - Garden object placement
 * - Shop catalogue items
 * - Renderer state
 * 
 * @see docs/phase-1.1/GARDEN_THREE_IMPLEMENTATION.md
 * @module renderer/types
 */

import * as THREE from 'three';

// ============================================================================
// GRID CONSTANTS
// ============================================================================

/** Grid size (G×G tiles) */
export const GRID_SIZE = 12;

/** Tile width in world units */
export const TILE_WIDTH = 1;

/** Tile height (thickness) in world units */
export const TILE_HEIGHT = 0.1;

// ============================================================================
// AVATAR TYPES
// ============================================================================

/**
 * Avatar gender options for body/hair geometry.
 * Determines hair style and body proportions.
 */
export type AvatarGender = 'boy' | 'girl';

/**
 * Hat styles for avatar customization.
 * Each hat has unique geometry and color options.
 */
export type HatStyle = 'none' | 'cap' | 'wizard' | 'crown' | 'flower';

/**
 * Complete avatar customization options.
 * All colors are hex integers (e.g., 0xFF0000 for red).
 * 
 * @example
 * const defaultAvatar: AvatarOptions = {
 *   gender: 'boy',
 *   shirtColor: 0x4ECDC4,
 *   pantsColor: 0x3355AA,
 *   hairColor: 0x3D2B1A,
 *   skinTone: 0xFFD1A4,
 *   hat: 'none',
 *   hatColor: 0x8B0000,
 * };
 */
export interface AvatarOptions {
  /** Gender determines hair style and body shape */
  gender: AvatarGender;
  /** Shirt/torso color (hex) */
  shirtColor: number;
  /** Pants/legs color (hex) */
  pantsColor: number;
  /** Hair color (hex) */
  hairColor: number;
  /** Skin tone color (hex) */
  skinTone: number;
  /** Hat style selection */
  hat: HatStyle;
  /** Hat color (hex) - only used for cap, wizard, crown */
  hatColor: number;
}

/**
 * Default avatar configuration.
 * Used when no customization has been saved.
 */
export const DEFAULT_AVATAR: AvatarOptions = {
  gender: 'boy',
  shirtColor: 0x4ECDC4, // Teal
  pantsColor: 0x3355AA, // Navy blue
  hairColor: 0x3D2B1A,  // Brown
  skinTone: 0xFFD1A4,   // Light skin
  hat: 'none',
  hatColor: 0x8B0000,   // Dark red
};

/**
 * Color swatches for avatar customization UI.
 * Each array provides labeled color options for a clothing/item category.
 */
export const AVATAR_COLORS = {
  shirt: [
    { label: 'Teal',   value: 0x4ECDC4 },
    { label: 'Red',    value: 0xE84040 },
    { label: 'Purple', value: 0x8B5CF6 },
    { label: 'Orange', value: 0xFF8C00 },
    { label: 'Navy',   value: 0x2C3E8B },
    { label: 'Pink',   value: 0xFF69B4 },
    { label: 'Mint',   value: 0x4DBD74 },
    { label: 'Gold',   value: 0xCC9900 },
  ],
  pants: [
    { label: 'Blue',   value: 0x3355AA },
    { label: 'Brown',  value: 0x7A5533 },
    { label: 'Black',  value: 0x222222 },
    { label: 'Green',  value: 0x2E6B2E },
  ],
  hair: [
    { label: 'Brown',  value: 0x3D2B1A },
    { label: 'Blonde', value: 0xDDB800 },
    { label: 'Black',  value: 0x111111 },
    { label: 'Auburn', value: 0xBB3311 },
    { label: 'Silver', value: 0xCCCCCC },
    { label: 'Purple', value: 0x8B2FC9 },
  ],
  skin: [
    { label: 'Light',  value: 0xFFD1A4 },
    { label: 'Warm',   value: 0xF5C27A },
    { label: 'Medium', value: 0xD4956A },
    { label: 'Deep',   value: 0x8D5524 },
  ],
  hat: [
    { label: 'Red',     value: 0xAA1111 },
    { label: 'Blue',    value: 0x113399 },
    { label: 'Purple',  value: 0x6622AA },
    { label: 'Black',   value: 0x222222 },
    { label: 'Forest',  value: 0x115511 },
    { label: 'Midnight', value: 0x050530 },
  ],
} as const;

// ============================================================================
// GARDEN OBJECT TYPES
// ============================================================================

/**
 * Category for shop items and object organization.
 * TreeCare items are consumables that target learning trees (not placeable).
 */
export type ObjectCategory = 'Trees' | 'Flowers' | 'Plants' | 'Furniture' | 'Features' | 'TreeCare';

/**
 * Shop catalogue item definition.
 * Each item can be purchased with Gems (💎) and placed in the garden.
 * Gems are the global shop currency, NOT SunDrops.
 */
export interface ShopItem {
  /** Unique identifier matching object factory function */
  id: string;
  /** Display name for shop UI */
  name: string;
  /** Cost in Gems (global shop currency) */
  cost: number;
  /** Emoji icon for shop UI */
  icon: string;
  /** Category for shop filtering */
  category: ObjectCategory;
  /** 
   * Whether this is a consumable item (tree care).
   * Consumables are applied to a learning tree, NOT placed on the grid.
   */
  consumable?: boolean;
  /** Description shown in shop (mainly for consumables) */
  description?: string;
  /** Health points restored when applied to a learning tree */
  healthRestore?: number;
  /** Bonus SunDrops granted to a learning tree */
  sunDropBoost?: number;
}

/**
 * Full shop catalogue with all purchasable items.
 * 
 * Price tiers (in Gems 💎):
 * - Flowers/Plants: 3-8 gems (cheap, ~1-2 lessons)
 * - Furniture: 10-20 gems (~3-5 lessons)
 * - Trees: 15-25 gems (~4-6 lessons)
 * - Features: 20-35 gems (~5-8 lessons)
 * - Tree Care consumables: 3-10 gems (affordable upkeep)
 * 
 * TreeCare items are consumables — they restore health or boost
 * SunDrops on a specific learning tree, not placed on the grid.
 */
export const SHOP_CATALOGUE: ShopItem[] = [
  // 🌲 Decoration Trees — cosmetic, NOT learning trees
  { id: 'oak',      name: 'Oak Tree',       cost: 20, icon: '🌳', category: 'Trees' },
  { id: 'pine',     name: 'Pine Tree',      cost: 15, icon: '🌲', category: 'Trees' },
  { id: 'cherry',   name: 'Cherry',         cost: 25, icon: '🌸', category: 'Trees' },
  { id: 'maple',    name: 'Autumn Maple',   cost: 22, icon: '🍁', category: 'Trees' },
  { id: 'willow',   name: 'Weeping Willow', cost: 25, icon: '🌿', category: 'Trees' },
  { id: 'palm',     name: 'Palm Tree',      cost: 20, icon: '🌴', category: 'Trees' },
  // 🌸 Flowers — cheapest items, ~1-2 lessons each
  { id: 'rose',     name: 'Rose',           cost: 6,  icon: '🌹', category: 'Flowers' },
  { id: 'sunflwr',  name: 'Sunflower',      cost: 5,  icon: '🌻', category: 'Flowers' },
  { id: 'tulip',    name: 'Tulip',          cost: 4,  icon: '🌷', category: 'Flowers' },
  { id: 'lavender', name: 'Lavender',       cost: 4,  icon: '💜', category: 'Flowers' },
  { id: 'daisy',    name: 'Daisy',          cost: 3,  icon: '🌼', category: 'Flowers' },
  { id: 'poppy',    name: 'Poppy',          cost: 4,  icon: '🌺', category: 'Flowers' },
  // 🌿 Plants
  { id: 'hedge',    name: 'Hedge Bush',     cost: 8,  icon: '🌿', category: 'Plants' },
  { id: 'mushroom', name: 'Mushroom',       cost: 3,  icon: '🍄', category: 'Plants' },
  // 🪑 Furniture — mid-tier
  { id: 'bench',    name: 'Bench',          cost: 18, icon: '🪑', category: 'Furniture' },
  { id: 'lantern',  name: 'Lantern',        cost: 12, icon: '🏮', category: 'Furniture' },
  { id: 'sign',     name: 'Sign Post',      cost: 10, icon: '🪧', category: 'Furniture' },
  // ⛲ Features — premium decorations
  { id: 'fountain', name: 'Fountain',       cost: 35, icon: '⛲', category: 'Features' },
  { id: 'pond',     name: 'Pond',           cost: 25, icon: '💧', category: 'Features' },
  // 💧 Tree Care — consumables applied to learning trees
  {
    id: 'water',
    name: 'Water',
    cost: 3,
    icon: '💧',
    category: 'TreeCare',
    consumable: true,
    description: 'Restore 25 health to a learning tree',
    healthRestore: 25,
  },
  {
    id: 'fertilizer',
    name: 'Fertilizer',
    cost: 8,
    icon: '🧪',
    category: 'TreeCare',
    consumable: true,
    description: 'Boost a tree with +5 SunDrops',
    sunDropBoost: 5,
  },
  {
    id: 'sunlamp',
    name: 'Sun Lamp',
    cost: 5,
    icon: '☀️',
    category: 'TreeCare',
    consumable: true,
    description: 'Restore 50 health to a learning tree',
    healthRestore: 50,
  },
  {
    id: 'superfood',
    name: 'Super Food',
    cost: 10,
    icon: '✨',
    category: 'TreeCare',
    consumable: true,
    description: 'Full health restore + 3 SunDrops',
    healthRestore: 100,
    sunDropBoost: 3,
  },
];

/**
 * Object placed in the garden grid.
 * This is the runtime representation used by the renderer.
 */
export interface PlacedObject {
  /** Unique instance ID */
  id: string;
  /** Object type identifier (matches ShopItem.id) */
  objectType: string;
  /** Grid X position (0 to GRID_SIZE-1) */
  gx: number;
  /** Grid Z position (0 to GRID_SIZE-1) */
  gz: number;
  /** Three.js group reference for scene management */
  mesh?: THREE.Group;
}

/**
 * Tile type for the garden grid.
 */
export type TileType = 'grass' | 'path';

/**
 * Tile data for the garden floor.
 */
export interface Tile {
  /** Grid X position */
  gx: number;
  /** Grid Z position */
  gz: number;
  /** Tile type (affects appearance) */
  type: TileType;
  /** Three.js mesh reference */
  mesh?: THREE.Mesh;
}

// ============================================================================
// RENDERER STATE TYPES
// ============================================================================

/**
 * State for avatar movement.
 * Used for click-to-walk animation.
 */
export interface MovementTarget {
  /** Target grid X */
  gx: number;
  /** Target grid Z */
  gz: number;
}

/**
 * Internal renderer state.
 * Stores references to Three.js objects for the animation loop.
 */
export interface RendererState {
  /** Three.js scene */
  scene: THREE.Scene;
  /** Orthographic camera */
  camera: THREE.OrthographicCamera;
  /** WebGL renderer */
  renderer: THREE.WebGLRenderer;
  /** All tile meshes */
  tiles: THREE.Mesh[];
  /** Tile type map (for placement validation) */
  tilemap: Map<string, TileType>;
  /** Object container group */
  objectLayer: THREE.Group;
  /** Set of occupied cells ("gx,gz" strings) */
  occupiedCells: Set<string>;
  /** Avatar Three.js group */
  avatar: THREE.Group;
  /** Hover highlight mesh */
  hoverTile: THREE.Mesh;
  /** Raycaster for mouse interaction */
  raycaster: THREE.Raycaster;
  /** Mouse position (normalized device coordinates) */
  mouse: THREE.Vector2;
  /** Current movement target (null if idle) */
  movementTarget: MovementTarget | null;
  /** Animation clock */
  clock: THREE.Clock;
  /** Ghost preview mesh during shop placement */
  ghostPreview: THREE.Group | null;
  /** Fountain objects (for animation) */
  fountains: THREE.Group[];
  /** Pond objects (for ripple animation) */
  ponds: THREE.Group[];
  /** Current frustum zoom level */
  frustum: number;
  /** Canvas dimensions */
  dimensions: { width: number; height: number };
}

/**
 * Options for creating the garden renderer.
 */
export interface GardenRendererOptions {
  /** Canvas element to render into */
  canvas: HTMLCanvasElement;
  /** Initial placed objects (loaded from persistence) */
  initialObjects?: PlacedObject[];
  /** Initial avatar options */
  avatarOptions?: AvatarOptions;
  /** Callback when avatar walks to a tile */
  onAvatarMove?: (gx: number, gz: number) => void;
  /** Callback when an object is placed */
  onObjectPlace?: (objectId: string, gx: number, gz: number) => void;
  /** Callback when a tile is clicked (for shop placement) */
  onTileClick?: (gx: number, gz: number, isOccupied: boolean) => void;
}