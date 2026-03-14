/**
 * Garden Object Service
 * 
 * Manages placed decorations and objects in the 3D garden.
 * Handles CRUD operations for the garden_objects collection in Pocketbase.
 * 
 * Features:
 * - Load user's placed objects
 * - Place new objects (validates grid position)
 * - Remove objects
 * - Move objects to new positions
 * 
 * @module services/gardenObjectService
 * @see docs/phase-1.1/task-1-1-17-garden-shop-ui.md
 */

import { pb, getCurrentUserId } from '../../services/pocketbaseService';
import type { GardenObjectRecord } from '../types/pocketbase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Domain type for a placed garden object.
 * This is the application-level representation.
 */
export interface GardenObject {
  /** Unique record ID from Pocketbase */
  id: string;
  /** User ID who owns this object */
  userId: string;
  /** Object type identifier (matches ShopItem.id) */
  objectId: string;
  /** Grid X position (0-11) */
  gx: number;
  /** Grid Z position (0-11) */
  gz: number;
  /** When the object was placed */
  placedAt: string;
}

/**
 * Data required to place a new object.
 */
export interface PlaceObjectData {
  /** Object type identifier (e.g., "oak", "fountain") */
  objectId: string;
  /** Grid X position (0-11) */
  gx: number;
  /** Grid Z position (0-11) */
  gz: number;
}

/**
 * Result of a placement operation.
 */
export interface PlaceObjectResult {
  success: boolean;
  object?: GardenObject;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Grid size constant (12x12 garden) */
const GRID_SIZE = 12;

/** Collection name in Pocketbase */
const COLLECTION = 'garden_objects';

/** Whether to use mock data (for development without Pocketbase) */
const USE_MOCK_DATA = false;

/** Mock objects for development */
const MOCK_OBJECTS: GardenObject[] = [
  { id: 'mock-1', userId: 'mock-user', objectId: 'oak', gx: 2, gz: 3, placedAt: new Date().toISOString() },
  { id: 'mock-2', userId: 'mock-user', objectId: 'rose', gx: 5, gz: 5, placedAt: new Date().toISOString() },
  { id: 'mock-3', userId: 'mock-user', objectId: 'lantern', gx: 8, gz: 8, placedAt: new Date().toISOString() },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate grid position.
 * @returns true if valid, false otherwise
 */
function isValidPosition(gx: number, gz: number): boolean {
  return (
    Number.isInteger(gx) &&
    Number.isInteger(gz) &&
    gx >= 0 &&
    gx < GRID_SIZE &&
    gz >= 0 &&
    gz < GRID_SIZE
  );
}

/**
 * Convert Pocketbase record to domain type.
 */
function recordToGardenObject(record: GardenObjectRecord): GardenObject {
  return {
    id: record.id,
    userId: record.user,
    objectId: record.object_id,
    gx: record.gx,
    gz: record.gz,
    placedAt: record.placed_at || record.created,
  };
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Garden Object Service
 * 
 * Provides CRUD operations for garden decorations.
 * All methods are async and return promises.
 */
export const gardenObjectService = {
  /**
   * Get all garden objects for a user.
   * 
   * @param userId - The user ID to fetch objects for
   * @returns Array of placed garden objects
   * 
   * @example
   * const objects = await gardenObjectService.getUserObjects(userId);
   * console.log(`User has ${objects.length} objects in their garden`);
   */
  async getUserObjects(userId: string): Promise<GardenObject[]> {
    if (USE_MOCK_DATA) {
      return MOCK_OBJECTS.filter((obj) => obj.userId === userId);
    }

    try {
      const records = await pb
        .collection(COLLECTION)
        .getList<GardenObjectRecord>(1, 200, {
          filter: `user = "${userId}"`,
          sort: '-placed_at',
        });

      return records.items.map(recordToGardenObject);
    } catch (error) {
      console.error('[gardenObjectService] Failed to get user objects:', error);
      throw error;
    }
  },

  /**
   * Get a single garden object by ID.
   * 
   * @param objectId - The object record ID
   * @returns The garden object or null if not found
   */
  async getObject(objectId: string): Promise<GardenObject | null> {
    if (USE_MOCK_DATA) {
      return MOCK_OBJECTS.find((obj) => obj.id === objectId) || null;
    }

    try {
      const record = await pb
        .collection(COLLECTION)
        .getOne<GardenObjectRecord>(objectId);
      return recordToGardenObject(record);
    } catch (error) {
      if ((error as { status?: number })?.status === 404) {
        return null;
      }
      console.error('[gardenObjectService] Failed to get object:', error);
      throw error;
    }
  },

  /**
   * Place a new object in the garden.
   * 
   * Validates that:
   * - Position is within grid bounds (0-11)
   * - User doesn't already have an object at this position
   * 
   * @param userId - The user placing the object
   * @param data - Object type and position
   * @returns Result with the placed object or error
   * 
   * @example
   * const result = await gardenObjectService.placeObject(userId, {
   *   objectId: 'oak',
   *   gx: 5,
   *   gz: 7,
   * });
   * if (result.success) {
   *   console.log('Placed:', result.object);
   * }
   */
  async placeObject(
    userId: string,
    data: PlaceObjectData
  ): Promise<PlaceObjectResult> {
    // Validate position
    if (!isValidPosition(data.gx, data.gz)) {
      return {
        success: false,
        error: `Invalid position (${data.gx}, ${data.gz}). Must be 0-${GRID_SIZE - 1}.`,
      };
    }

    if (USE_MOCK_DATA) {
      const newObject: GardenObject = {
        id: `mock-${Date.now()}`,
        userId,
        objectId: data.objectId,
        gx: data.gx,
        gz: data.gz,
        placedAt: new Date().toISOString(),
      };
      MOCK_OBJECTS.push(newObject);
      return { success: true, object: newObject };
    }

    try {
      // Check if position is already occupied
      const existing = await pb
        .collection(COLLECTION)
        .getList<GardenObjectRecord>(1, 1, {
          filter: `user = "${userId}" && gx = ${data.gx} && gz = ${data.gz}`,
        });

      if (existing.items.length > 0) {
        return {
          success: false,
          error: 'This position is already occupied.',
        };
      }

      // Create the object
      const record = await pb.collection(COLLECTION).create<GardenObjectRecord>({
        user: userId,
        object_id: data.objectId,
        gx: data.gx,
        gz: data.gz,
        placed_at: new Date().toISOString(),
      });

      return {
        success: true,
        object: recordToGardenObject(record),
      };
    } catch (error) {
      console.error('[gardenObjectService] Failed to place object:', error);
      return {
        success: false,
        error: 'Failed to place object. Please try again.',
      };
    }
  },

  /**
   * Remove an object from the garden.
   * 
   * @param objectId - The object record ID to remove
   * @returns true if removed, false if not found
   */
  async removeObject(objectId: string): Promise<boolean> {
    if (USE_MOCK_DATA) {
      const index = MOCK_OBJECTS.findIndex((obj) => obj.id === objectId);
      if (index === -1) return false;
      MOCK_OBJECTS.splice(index, 1);
      return true;
    }

    try {
      await pb.collection(COLLECTION).delete(objectId);
      return true;
    } catch (error) {
      if ((error as { status?: number })?.status === 404) {
        return false;
      }
      console.error('[gardenObjectService] Failed to remove object:', error);
      throw error;
    }
  },

  /**
   * Move an object to a new position.
   * 
   * @param objectId - The object record ID to move
   * @param gx - New grid X position
   * @param gz - New grid Z position
   * @returns The updated object or null if failed
   */
  async moveObject(
    objectId: string,
    gx: number,
    gz: number
  ): Promise<GardenObject | null> {
    // Validate position
    if (!isValidPosition(gx, gz)) {
      console.error(`[gardenObjectService] Invalid position: (${gx}, ${gz})`);
      return null;
    }

    if (USE_MOCK_DATA) {
      const obj = MOCK_OBJECTS.find((o) => o.id === objectId);
      if (!obj) return null;
      obj.gx = gx;
      obj.gz = gz;
      return obj;
    }

    try {
      const record = await pb
        .collection(COLLECTION)
        .update<GardenObjectRecord>(objectId, { gx, gz });
      return recordToGardenObject(record);
    } catch (error) {
      console.error('[gardenObjectService] Failed to move object:', error);
      throw error;
    }
  },

  /**
   * Clear all objects for a user (useful for testing/reset).
   * 
   * @param userId - The user ID to clear objects for
   * @returns Number of objects removed
   */
  async clearUserObjects(userId: string): Promise<number> {
    if (USE_MOCK_DATA) {
      const count = MOCK_OBJECTS.filter((obj) => obj.userId === userId).length;
      // Remove in-place
      for (let i = MOCK_OBJECTS.length - 1; i >= 0; i--) {
        if (MOCK_OBJECTS[i].userId === userId) {
          MOCK_OBJECTS.splice(i, 1);
        }
      }
      return count;
    }

    try {
      const records = await pb
        .collection(COLLECTION)
        .getList<GardenObjectRecord>(1, 200, {
          filter: `user = "${userId}"`,
        });

      await Promise.all(
        records.items.map((record) => pb.collection(COLLECTION).delete(record.id))
      );

      return records.items.length;
    } catch (error) {
      console.error('[gardenObjectService] Failed to clear objects:', error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time changes for user's garden objects.
   * 
   * @param userId - The user ID to subscribe to
   * @param callback - Called when objects change
   * @returns Unsubscribe function
   * 
   * @example
   * const unsubscribe = gardenObjectService.subscribe(userId, (action, object) => {
   *   if (action === 'create') console.log('Object placed:', object);
   *   if (action === 'delete') console.log('Object removed:', object);
   * });
   * // Later: unsubscribe();
   */
  subscribe(
    userId: string,
    callback: (action: 'create' | 'update' | 'delete', object: GardenObject) => void
  ): () => void {
    if (USE_MOCK_DATA) {
      console.warn('[gardenObjectService] Real-time subscriptions not available in mock mode');
      return () => {};
    }

    let unsubscribe: (() => void) | null = null;

    pb.collection(COLLECTION)
      .subscribe('*', (event) => {
        // Only process events for this user
        const record = event.record as unknown as GardenObjectRecord;
        if (record.user !== userId) return;

        const object = recordToGardenObject(record);
        callback(event.action as 'create' | 'update' | 'delete', object);
      })
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch((error) => {
        console.error('[gardenObjectService] Failed to subscribe:', error);
      });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export default gardenObjectService;