/**
 * GardenWorld Component
 * 
 * React wrapper for the Three.js garden renderer.
 * Provides a declarative interface for rendering the 3D garden scene.
 * 
 * Features:
 * - Automatic renderer lifecycle management
 * - Avatar position syncing
 * - Object placement/removal
 * - Shop placement mode with ghost preview
 * - Responsive canvas sizing
 * 
 * @module components/garden/GardenWorld
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  GardenRenderer,
  AvatarOptions,
  PlacedObject,
  DEFAULT_AVATAR,
  SHOP_CATALOGUE,
  ShopItem,
  calculateGrowthStage,
} from '../../renderer';
import { TreeStatus } from '../../types/game';

// ============================================================================
// TYPES
// ============================================================================

/**
 * User tree data from game state.
 */
export interface UserTree {
  id: string;
  gridX: number;
  gridZ: number;
  sunDropsEarned: number;
  health: number;
  skillPathId: string;
  status: TreeStatus;
}

/**
 * Props for the GardenWorld component.
 */
export interface GardenWorldProps {
  /** Optional CSS class name for the container */
  className?: string;
  /** Avatar customization options */
  avatarOptions?: AvatarOptions;
  /** Initial objects to place in the garden */
  initialObjects?: PlacedObject[];
  /** Learning trees to display (from game state) */
  userTrees?: UserTree[];
  /** Called when a learning tree is clicked */
  onTreeClick?: (treeData: { skillPathId: string; gx: number; gz: number }) => void;
  /** Callback when avatar moves to a new tile */
  onAvatarMove?: (gx: number, gz: number) => void;
  /** Callback when an object is placed */
  onObjectPlace?: (objectId: string, objectType: string, gx: number, gz: number) => void;
  /** Callback when an object is removed */
  onObjectRemove?: (objectId: string) => void;
  /** Currently selected shop item for placement mode (null to exit placement mode) */
  placementModeItem?: ShopItem | null;
  /** Called when placement mode ends (successful placement or cancel) */
  onPlacementEnd?: (placed: boolean) => void;
  /** Avatar position override */
  avatarPosition?: { gx: number; gz: number };
  /**
   * User ID used to seed the ambient decoration RNG.
   * Passed straight through to GardenRenderer — same user always sees the
   * same flowers/plants layout so it feels like their personal garden.
   */
  seedUserId?: string;
}

/**
 * Ref handle for GardenWorld component.
 */
export interface GardenWorldHandle {
  /** Get the underlying renderer instance */
  getRenderer: () => GardenRenderer | null;
  /** Place an object in the garden */
  placeObject: (objectType: string, gx: number, gz: number) => PlacedObject | null;
  /** Remove an object from the garden */
  removeObject: (objectId: string) => boolean;
  /** Get all placed objects */
  getPlacedObjects: () => PlacedObject[];
  /** Update avatar appearance */
  updateAvatar: (options: AvatarOptions) => void;
  /** Set avatar position */
  setAvatarPosition: (gx: number, gz: number) => void;
  /** Get avatar position */
  getAvatarPosition: () => { gx: number; gz: number };
  /** Check if a cell is occupied */
  isCellOccupied: (gx: number, gz: number) => boolean;
  /** Capture screenshot as data URL */
  captureScreenshot: () => string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * GardenWorld - 3D garden renderer component.
 * 
 * Renders a Three.js-based isometric garden scene with:
 * - Customizable avatar
 * - Placeable decorations
 * - Click-to-walk movement
 * - Shop placement mode with ghost preview
 * 
 * @example
 * <GardenWorld
 *   avatarOptions={{ gender: 'girl', hat: 'crown' }}
 *   onAvatarMove={(gx, gz) => console.log('Moved to', gx, gz)}
 *   placementModeItem={selectedItem}
 *   onPlacementEnd={(placed) => setSelectedItem(null)}
 * />
 */
export const GardenWorld3D = React.forwardRef<GardenWorldHandle, GardenWorldProps>(
  (
    {
      className,
      avatarOptions = DEFAULT_AVATAR,
      initialObjects,
      userTrees,
      onTreeClick,
      onAvatarMove,
      onObjectPlace,
      onObjectRemove,
      placementModeItem,
      onPlacementEnd,
      avatarPosition,
      seedUserId,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<GardenRenderer | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Ref to track placement mode item - avoids stale closure in onTileClick callback.
    // The callback is created once in useEffect(() => {}, []) but we need access
    // to the current placementModeItem value on every click.
    const placementModeItemRef = useRef<ShopItem | null>(null);
    
    // Keep the ref in sync with the prop
    useEffect(() => {
      placementModeItemRef.current = placementModeItem ?? null;
    }, [placementModeItem]);

    // ==========================================================================
    // RENDERER INITIALIZATION
    // ==========================================================================

    useEffect(() => {
      if (!canvasRef.current) return;

      // Create renderer — pass seedUserId so ambient flowers/plants are seeded
      // from the user's ID giving each user a unique-but-consistent garden layout.
      const renderer = new GardenRenderer({
        canvas: canvasRef.current,
        avatarOptions,
        initialObjects,
        seedUserId,
        onAvatarMove: (gx, gz) => {
          onAvatarMove?.(gx, gz);
        },
        onObjectPlace: (objectId, gx, gz) => {
          // Get object type from placed objects
          const objects = renderer.getPlacedObjects();
          const obj = objects.find((o) => o.id === objectId);
          if (obj) {
            onObjectPlace?.(objectId, obj.objectType, gx, gz);
          }
        },
        onTileClick: (gx, gz, isOccupied) => {
          // Handle shop placement mode - use ref to avoid stale closure
          const currentItem = placementModeItemRef.current;
          if (currentItem && !isOccupied) {
            const placed = renderer.placeObject(currentItem.id, gx, gz);
            if (placed) {
              onPlacementEnd?.(true);
            }
          }
        },
      });

      // Wire up learning tree click callback
      renderer.onLearningTreeClick = (treeData) => {
        if (onTreeClick && treeData.skillPathId) {
          onTreeClick({
            skillPathId: treeData.skillPathId,
            gx: treeData.gx,
            gz: treeData.gz,
          });
        }
      };

      rendererRef.current = renderer;
      renderer.animate();
      setIsInitialized(true);

      // Cleanup on unmount
      return () => {
        renderer.dispose();
        rendererRef.current = null;
        setIsInitialized(false);
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ==========================================================================
    // LEARNING TREES SYNC
    // ==========================================================================

    useEffect(() => {
      if (!rendererRef.current || !userTrees) return;

      // Convert UserTree[] to LearningTreeOptions[] for the renderer
      const treeOptions = userTrees.map((tree) => ({
        gx: tree.gridX,
        gz: tree.gridZ,
        growthStage: calculateGrowthStage(tree.sunDropsEarned),
        health: tree.health,
        skillPathId: tree.skillPathId,
        status: tree.status,
        isDead: tree.health <= 0,
      }));

      // Sync trees to renderer
      rendererRef.current.syncLearningTrees(treeOptions);
    }, [userTrees]);

    // ==========================================================================
    // TREE CLICK CALLBACK SYNC
    // ==========================================================================

    useEffect(() => {
      if (!rendererRef.current) return;

      // Update the click callback when onTreeClick changes
      rendererRef.current.onLearningTreeClick = (treeData) => {
        if (onTreeClick && treeData.skillPathId) {
          onTreeClick({
            skillPathId: treeData.skillPathId,
            gx: treeData.gx,
            gz: treeData.gz,
          });
        }
      };
    }, [onTreeClick]);

    // ==========================================================================
    // AVATAR OPTIONS UPDATE
    // ==========================================================================

    useEffect(() => {
      if (rendererRef.current && avatarOptions) {
        rendererRef.current.updateAvatar(avatarOptions);
      }
    }, [avatarOptions]);

    // ==========================================================================
    // PLACEMENT MODE UPDATE
    // ==========================================================================

    useEffect(() => {
      if (!rendererRef.current) return;

      if (placementModeItem) {
        rendererRef.current.showGhostPreview(placementModeItem.id);
      } else {
        rendererRef.current.clearGhostPreview();
      }
    }, [placementModeItem]);

    // ==========================================================================
    // AVATAR POSITION UPDATE
    // ==========================================================================

    useEffect(() => {
      if (rendererRef.current && avatarPosition) {
        rendererRef.current.setAvatarPosition(avatarPosition.gx, avatarPosition.gz);
      }
    }, [avatarPosition]);

    // ==========================================================================
    // IMPERATIVE HANDLE
    // ==========================================================================

    React.useImperativeHandle(ref, () => ({
      getRenderer: () => rendererRef.current,
      placeObject: (objectType: string, gx: number, gz: number) => {
        return rendererRef.current?.placeObject(objectType, gx, gz) ?? null;
      },
      removeObject: (objectId: string) => {
        const result = rendererRef.current?.removeObject(objectId) ?? false;
        if (result) {
          onObjectRemove?.(objectId);
        }
        return result;
      },
      getPlacedObjects: () => {
        return rendererRef.current?.getPlacedObjects() ?? [];
      },
      updateAvatar: (options: AvatarOptions) => {
        rendererRef.current?.updateAvatar(options);
      },
      setAvatarPosition: (gx: number, gz: number) => {
        rendererRef.current?.setAvatarPosition(gx, gz);
      },
      getAvatarPosition: () => {
        return rendererRef.current?.getAvatarPosition() ?? { gx: 6, gz: 6 };
      },
      isCellOccupied: (gx: number, gz: number) => {
        return rendererRef.current?.isCellOccupied(gx, gz) ?? false;
      },
      captureScreenshot: () => {
        return rendererRef.current?.captureScreenshot() ?? '';
      },
    }));

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
      <div className={`garden-world ${className || ''}`}>
        <canvas
          ref={canvasRef}
          className="garden-canvas"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            touchAction: 'none',
          }}
        />
        {!isInitialized && (
          <div className="garden-loading">
            Loading garden...
          </div>
        )}
      </div>
    );
  }
);

GardenWorld3D.displayName = 'GardenWorld3D';

// ============================================================================
// STYLES
// ============================================================================

/**
 * CSS styles for the GardenWorld component.
 * Import these or add to your stylesheet.
 */
export const gardenWorldStyles = `
.garden-world {
  position: relative;
  width: 100%;
  height: 100%;
  /* Min-height prevents the garden from collapsing to < 300px in landscape
     when 100vh is very short (e.g. iPhone SE landscape ≈ 375px viewport). */
  min-height: 300px;
  overflow: hidden;
  background: #87CEEB;
}

.garden-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.garden-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #333;
  font-size: 1.2rem;
  font-weight: 500;
}
`;

// ============================================================================
// HELPER HOOK
// ============================================================================

/**
 * Hook for accessing the shop catalogue.
 */
export function useShopCatalogue(): ShopItem[] {
  return SHOP_CATALOGUE;
}

/**
 * Hook for accessing the shop catalogue grouped by category.
 */
export function useShopCatalogueByCategory(): Record<string, ShopItem[]> {
  return SHOP_CATALOGUE.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShopItem[]>);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GardenWorld3D;
