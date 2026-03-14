/**
 * Grid Utility Functions for Garden Renderer
 * 
 * Handles coordinate conversion between grid space and world space.
 * The garden uses a 12×12 isometric grid where each tile is 1 world unit.
 * 
 * Grid coordinates: (gx, gz) where 0 ≤ gx,gz < GRID_SIZE
 * World coordinates: (x, y, z) where y is vertical (0 = ground level)
 * 
 * @module renderer/gridUtils
 */

import { GRID_SIZE, TILE_WIDTH, TILE_HEIGHT } from './types';

// ============================================================================
// COORDINATE CONVERSION
// ============================================================================

/**
 * Convert grid coordinates to world coordinates.
 * 
 * The grid is centered at world origin (0, 0, 0).
 * Grid cell (0, 0) is at the top-left corner when viewed in isometric.
 * Grid cell (G-1, G-1) is at the bottom-right corner.
 * 
 * @param gx - Grid X position (0 to GRID_SIZE-1)
 * @param gz - Grid Z position (0 to GRID_SIZE-1)
 * @returns World coordinates {x, z} - y is always 0 for tile centers
 * 
 * @example
 * // Center of the grid
 * gridToWorld(6, 6) // Returns { x: 0, z: 0 }
 * 
 * // Top-left corner
 * gridToWorld(0, 0) // Returns { x: -5.5, z: -5.5 }
 * 
 * // Bottom-right corner
 * gridToWorld(11, 11) // Returns { x: 5.5, z: 5.5 }
 */
export function gridToWorld(gx: number, gz: number): { x: number; z: number } {
  return {
    x: (gx - GRID_SIZE / 2 + 0.5) * TILE_WIDTH,
    z: (gz - GRID_SIZE / 2 + 0.5) * TILE_WIDTH,
  };
}

/**
 * Convert world coordinates to grid coordinates.
 * 
 * @param x - World X position
 * @param z - World Z position
 * @returns Grid coordinates {gx, gz} or null if outside grid bounds
 * 
 * @example
 * // Center of the grid
 * worldToGrid(0, 0) // Returns { gx: 6, gz: 6 }
 * 
 * // Outside bounds
 * worldToGrid(10, 10) // Returns null
 */
export function worldToGrid(x: number, z: number): { gx: number; gz: number } | null {
  const gx = Math.floor(x / TILE_WIDTH + GRID_SIZE / 2 - 0.5);
  const gz = Math.floor(z / TILE_WIDTH + GRID_SIZE / 2 - 0.5);
  
  if (gx < 0 || gx >= GRID_SIZE || gz < 0 || gz >= GRID_SIZE) {
    return null;
  }
  
  return { gx, gz };
}

/**
 * Get the ground Y position (top of tile) for a given vertical offset.
 * 
 * @param yOffset - Additional height above the tile surface
 * @returns World Y position
 */
export function getGroundY(yOffset: number = 0): number {
  return TILE_HEIGHT / 2 + yOffset;
}

// ============================================================================
// GRID UTILITIES
// ============================================================================

/**
 * Generate a unique key for a grid cell.
 * Used for Set and Map storage of occupied cells.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns String key "gx,gz"
 */
export function cellKey(gx: number, gz: number): string {
  return `${gx},${gz}`;
}

/**
 * Parse a cell key back into grid coordinates.
 * 
 * @param key - Cell key string "gx,gz"
 * @returns Grid coordinates or null if invalid format
 */
export function parseCellKey(key: string): { gx: number; gz: number } | null {
  const parts = key.split(',');
  if (parts.length !== 2) return null;
  
  const gx = parseInt(parts[0], 10);
  const gz = parseInt(parts[1], 10);
  
  if (isNaN(gx) || isNaN(gz)) return null;
  
  return { gx, gz };
}

/**
 * Check if grid coordinates are within bounds.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns true if within grid bounds
 */
export function isValidCell(gx: number, gz: number): boolean {
  return gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE;
}

/**
 * Get all adjacent cells (4-directional, not diagonal).
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @returns Array of valid adjacent cell coordinates
 */
export function getAdjacentCells(gx: number, gz: number): Array<{ gx: number; gz: number }> {
  const adjacent: Array<{ gx: number; gz: number }> = [];
  
  const directions = [
    { dx: 0, dz: -1 }, // North
    { dx: 1, dz: 0 },  // East
    { dx: 0, dz: 1 },  // South
    { dx: -1, dz: 0 }, // West
  ];
  
  for (const { dx, dz } of directions) {
    const newGx = gx + dx;
    const newGz = gz + dz;
    
    if (isValidCell(newGx, newGz)) {
      adjacent.push({ gx: newGx, gz: newGz });
    }
  }
  
  return adjacent;
}

/**
 * Calculate the distance between two grid cells (Manhattan distance).
 * 
 * @param from - Starting cell
 * @param to - Target cell
 * @returns Manhattan distance
 */
export function gridDistance(
  from: { gx: number; gz: number },
  to: { gx: number; gz: number }
): number {
  return Math.abs(to.gx - from.gx) + Math.abs(to.gz - from.gz);
}

/**
 * Calculate the world distance between two grid cells (Euclidean).
 * 
 * @param from - Starting cell
 * @param to - Target cell
 * @returns Euclidean distance in world units
 */
export function worldDistance(
  from: { gx: number; gz: number },
  to: { gx: number; gz: number }
): number {
  const fromWorld = gridToWorld(from.gx, from.gz);
  const toWorld = gridToWorld(to.gx, to.gz);
  
  const dx = toWorld.x - fromWorld.x;
  const dz = toWorld.z - fromWorld.z;
  
  return Math.sqrt(dx * dx + dz * dz);
}

// ============================================================================
// PATH GENERATION
// ============================================================================

/**
 * Generate the default path tilemap for the garden.
 * Creates a cross-shaped path through the center of the garden.
 * 
 * @returns Map of cell keys to tile types ('path' or undefined for grass)
 */
export function generateDefaultPathTilemap(): Map<string, 'path'> {
  const tilemap = new Map<string, 'path'>();
  const center = Math.floor(GRID_SIZE / 2);
  
  // Horizontal path (left to right through center)
  for (let i = 0; i < GRID_SIZE; i++) {
    tilemap.set(cellKey(i, center), 'path');
  }
  
  // Vertical path (top to bottom through center)
  for (let i = 0; i < GRID_SIZE; i++) {
    tilemap.set(cellKey(center, i), 'path');
  }
  
  return tilemap;
}

/**
 * Check if a cell is a path tile.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @param tilemap - Tile type map
 * @returns true if the cell is a path
 */
export function isPathCell(gx: number, gz: number, tilemap: Map<string, 'path'>): boolean {
  return tilemap.has(cellKey(gx, gz));
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Get the tile color based on position and type for checkerboard pattern.
 * 
 * @param gx - Grid X position
 * @param gz - Grid Z position
 * @param isPath - Whether this is a path tile
 * @returns Hex color value
 */
export function getTileColor(gx: number, gz: number, isPath: boolean): number {
  const isAlternate = (gx + gz) % 2 === 1;
  
  if (isPath) {
    // Dirt path colors
    return isAlternate ? 0x4A3C26 : 0x574830;
  } else {
    // Grass colors
    return isAlternate ? 0x143C14 : 0x103510;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { GRID_SIZE, TILE_WIDTH, TILE_HEIGHT };