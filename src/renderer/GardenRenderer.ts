/**
 * Garden Renderer - Main Three.js Renderer Class
 * 
 * Creates and manages the isometric 3D garden scene including:
 * - Tile floor with checkerboard pattern
 * - Avatar with click-to-walk movement
 * - Placeable garden objects (trees, flowers, furniture, etc.)
 * - Hover effects and interaction
 * - Animated features (fountains, ponds)
 * 
 * @module renderer/GardenRenderer
 */

import * as THREE from 'three';
import {
  GRID_SIZE,
  TILE_WIDTH,
  TILE_HEIGHT,
  AvatarOptions,
  PlacedObject,
  RendererState,
  GardenRendererOptions,
  DEFAULT_AVATAR,
} from './types';
import {
  gridToWorld,
  worldToGrid,
  cellKey,
  isValidCell,
  generateDefaultPathTilemap,
  getTileColor,
} from './gridUtils';
import { createObject, updatePlacedObjectAnimations } from './objects/objectFactory';
import { buildAvatar } from './AvatarBuilder';
import { AtmosphereBuilder } from './AtmosphereBuilder';
import { makeLearningTree, calculateGrowthStage, type LearningTreeOptions } from './objects/learningTrees';
import { TreeStatus } from '../types/game';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default zoom level (frustum size) */
const DEFAULT_FRUSTUM = 14;

/** Avatar movement speed in world units per second */
const AVATAR_SPEED = 2.8;

/** Isometric camera angle (radians) */
const CAMERA_ANGLE = Math.PI / 4; // 45 degrees

/** Camera elevation angle (radians) */
const CAMERA_ELEVATION = Math.PI / 6; // 30 degrees from horizontal

// ============================================================================
// GARDEN RENDERER CLASS
// ============================================================================

/**
 * Main renderer class for the 3D garden.
 * 
 * Handles scene setup, rendering loop, and user interaction.
 * 
 * @example
 * const renderer = new GardenRenderer({
 *   canvas: document.getElementById('garden-canvas'),
 *   onAvatarMove: (gx, gz) => console.log(`Moved to ${gx}, ${gz}`),
 * });
 * 
 * // Start animation loop
 * renderer.animate();
 * 
 * // Place an object
 * renderer.placeObject('oak', 5, 5);
 */
// ============================================================================
// SEEDED RANDOM UTILITY
// ============================================================================

/**
 * Returns a deterministic pseudo-random number generator seeded from a string.
 * Uses the 32-bit xorshift/LCG mix so the same userId always produces the same
 * decoration layout — no surprises after a page refresh.
 *
 * @param seed - Any string (typically the PocketBase user ID)
 * @returns A function that produces numbers in [0, 1)
 */
function makeSeededRng(seed: string): () => number {
  // Hash the string to a 32-bit integer using FNV-1a
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // LCG from Numerical Recipes — fast, good enough for decoration placement
  return function () {
    h = (Math.imul(1664525, h) + 1013904223) | 0;
    return (h >>> 0) / 0x100000000;
  };
}

// ============================================================================
// GARDEN RENDERER CLASS
// ============================================================================

export class GardenRenderer {
  private state: RendererState;
  private options: GardenRendererOptions;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private placedObjects: PlacedObject[] = [];
  private learningTrees: Map<string, THREE.Group> = new Map();
  private avatarGridPos: { gx: number; gz: number } = { gx: 6, gz: 6 };
  
  /** ResizeObserver for canvas size changes (orientation, browser chrome). */
  private resizeObserver: ResizeObserver | null = null;

  /**
   * Ambient decoration meshes — flowers/plants placed at startup from the
   * seeded layout. Tracked separately so they are disposed correctly and
   * do NOT count as "occupied" cells (the avatar can walk through them).
   */
  private ambientDecorations: THREE.Group[] = [];

  /** Next blink time (elapsed seconds). Random interval 3-6s between blinks. */
  private nextBlinkTime: number = 2 + Math.random() * 3;
  /** Whether avatar is currently mid-blink */
  private isBlinking: boolean = false;
  /** When the current blink started */
  private blinkStartTime: number = 0;
  
  /**
   * Pending tree interaction — avatar walks to the tree first,
   * then this callback fires when the avatar arrives adjacent to it.
   */
  private pendingTreeInteraction: {
    gx: number;
    gz: number;
    growthStage: number;
    health: number;
    skillPathId?: string;
  } | null = null;
  
  /**
   * Callback for when a learning tree is clicked.
   * Fires with tree metadata (gx, gz, growthStage, health, skillPathId).
   */
  public onLearningTreeClick?: (treeData: {
    gx: number;
    gz: number;
    growthStage: number;
    health: number;
    skillPathId?: string;
  }) => void;

  /**
   * Create a new GardenRenderer.
   * 
   * @param options - Renderer options including canvas and callbacks
   */
  constructor(options: GardenRendererOptions) {
    this.options = options;
    this.state = this.createInitialState(options);
    this.setupScene();
    this.setupTiles();
    this.setupAvatar(options.avatarOptions);
    this.setupEventListeners();
    
    // Place any initial objects
    if (options.initialObjects) {
      options.initialObjects.forEach((obj) => {
        this.placeObject(obj.objectType, obj.gx, obj.gz, obj.id);
      });
    }

    // Seed ambient decorations (flowers/plants) once if a userId was provided.
    // Done after initial objects so flowers never conflict with them.
    if (options.seedUserId) {
      this.setupAmbientDecoration(options.seedUserId);
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Create the initial renderer state.
   */
  private createInitialState(options: GardenRendererOptions): RendererState {
    const { width, height } = options.canvas.getBoundingClientRect();
    const aspect = width / height;
    
    // Orthographic camera for isometric view
    const frustum = DEFAULT_FRUSTUM;
    const camera = new THREE.OrthographicCamera(
      -frustum * aspect / 2,
      frustum * aspect / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      1000
    );
    
    // Position camera for isometric view
    const distance = 30;
    camera.position.set(
      distance * Math.cos(CAMERA_ELEVATION) * Math.sin(CAMERA_ANGLE),
      distance * Math.sin(CAMERA_ELEVATION),
      distance * Math.cos(CAMERA_ELEVATION) * Math.cos(CAMERA_ANGLE)
    );
    camera.lookAt(0, 0, 0);
    
    // WebGL renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Scene — bright daytime sky for kid-friendly vibe
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 25, 50);
    
    return {
      scene,
      camera,
      renderer,
      tiles: [],
      tilemap: generateDefaultPathTilemap() as Map<string, 'path'>,
      objectLayer: new THREE.Group(),
      occupiedCells: new Set(),
      avatar: new THREE.Group(),
      hoverTile: this.createHoverTile(),
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      movementTarget: null,
      clock: new THREE.Clock(),
      ghostPreview: null,
      fountains: [],
      ponds: [],
      frustum,
      dimensions: { width, height },
    };
  }

  /**
   * Create the hover highlight tile.
   */
  private createHoverTile(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(TILE_WIDTH * 0.9, TILE_WIDTH * 0.9);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    return mesh;
  }

  /**
   * Set up the scene with lights, atmosphere, and groups.
   * 
   * Daytime garden lighting:
   * - Bright warm ambient
   * - Strong sunlight with shadows
   * - Cool fill from opposite side
   * - Hemisphere light for natural sky/ground bounce
   */
  private setupScene(): void {
    // Warm white ambient — bright daytime feel
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    this.state.scene.add(ambientLight);
    
    // Bright sun with shadows
    const sunLight = new THREE.DirectionalLight(0xFFF4E0, 1.2);
    sunLight.position.set(8, 15, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    const sc = sunLight.shadow.camera;
    sc.left = -14;
    sc.bottom = -14;
    sc.right = 14;
    sc.top = 14;
    this.state.scene.add(sunLight);
    
    // Cool fill from opposite side for depth
    const fillLight = new THREE.DirectionalLight(0x88AACC, 0.4);
    fillLight.position.set(-5, 6, -5);
    this.state.scene.add(fillLight);
    
    // Sky/ground hemisphere light for natural bounced light
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x44AA44, 0.3);
    this.state.scene.add(hemiLight);
    
    // Atmosphere: fence, border, clouds (skip stars/moon for daytime)
    AtmosphereBuilder.buildDaytime(this.state.scene);
    
    // Object layer for placed objects
    this.state.scene.add(this.state.objectLayer);
    
    // Hover tile
    this.state.scene.add(this.state.hoverTile);
  }

  /**
   * Set up the tile floor.
   * 
   * Tiles are full-width boxes (no gaps) matching GardenV2.jsx.
   * The green border slab is handled by AtmosphereBuilder.
   */
  private setupTiles(): void {
    // Create tiles — full TILE_WIDTH, no gaps (matches GardenV2.jsx)
    for (let gz = 0; gz < GRID_SIZE; gz++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const { x, z } = gridToWorld(gx, gz);
        const isPath = this.state.tilemap.has(cellKey(gx, gz));
        const color = getTileColor(gx, gz, isPath);
        
        const tileGeometry = new THREE.BoxGeometry(
          TILE_WIDTH,
          TILE_HEIGHT,
          TILE_WIDTH,
        );
        const tileMaterial = new THREE.MeshLambertMaterial({ color });
        const tile = new THREE.Mesh(tileGeometry, tileMaterial);
        
        tile.position.set(x, 0, z);
        tile.receiveShadow = true;
        tile.userData = { gx, gz, isTile: true };
        
        this.state.tiles.push(tile);
        this.state.scene.add(tile);
      }
    }
  }

  /**
   * Set up the avatar.
   */
  private setupAvatar(avatarOptions?: AvatarOptions): void {
    this.state.avatar = buildAvatar(avatarOptions);
    
    // Position at center
    const { gx, gz } = this.avatarGridPos;
    const { x, z } = gridToWorld(gx, gz);
    this.state.avatar.position.set(x, 0, z);
    
    this.state.scene.add(this.state.avatar);
  }

  /**
   * Set up mouse, resize, and touch event listeners.
   *
   * Uses ResizeObserver on the canvas element (rather than window.resize)
   * so we catch orientation changes and browser-chrome show/hide on mobile
   * (e.g. the address bar animating in/out on scroll).
   * window.resize is kept as a fallback for browsers without ResizeObserver.
   */
  private setupEventListeners(): void {
    const canvas = this.state.renderer.domElement;
    
    // Mouse move for hover effect
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // Click for avatar movement
    canvas.addEventListener('click', this.handleClick.bind(this));
    
    // ResizeObserver — preferred over window.resize for mobile because it
    // fires on orientation changes and browser-chrome visibility changes.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(canvas);
    } else {
      // Fallback for environments without ResizeObserver (old Android WebViews)
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Handle mouse movement for hover effect.
   */
  private handleMouseMove(event: MouseEvent): void {
    const rect = this.state.renderer.domElement.getBoundingClientRect();
    this.state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update hover tile position
    this.state.raycaster.setFromCamera(this.state.mouse, this.state.camera);
    const intersects = this.state.raycaster.intersectObjects(this.state.tiles);
    
    if (intersects.length > 0 && intersects[0].object.userData.isTile) {
      const { gx, gz } = intersects[0].object.userData;
      const { x, z } = gridToWorld(gx, gz);
      this.state.hoverTile.position.set(x, TILE_HEIGHT + 0.01, z);
      this.state.hoverTile.visible = true;
    } else {
      this.state.hoverTile.visible = false;
    }
  }

  /**
   * Handle click for avatar movement or object placement.
   */
  private handleClick(event: MouseEvent): void {
    const rect = this.state.renderer.domElement.getBoundingClientRect();
    this.state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.state.raycaster.setFromCamera(this.state.mouse, this.state.camera);
    
    // Check for clicks on learning trees first (they're above the ground)
    // We need to recursively check all children of learning tree groups
    const allTreeChildren: THREE.Object3D[] = [];
    for (const treeGroup of this.learningTrees.values()) {
      treeGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          allTreeChildren.push(child);
        }
      });
    }
    
    const treeIntersects = this.state.raycaster.intersectObjects(allTreeChildren);
    if (treeIntersects.length > 0) {
      // Walk up to find the parent tree group
      let obj = treeIntersects[0].object as THREE.Object3D;
      while (obj && obj !== this.state.scene) {
        if (obj.userData?.type === 'learningTree') {
          const treeGx = obj.userData.gx as number;
          const treeGz = obj.userData.gz as number;
          const treeData = {
            gx: treeGx,
            gz: treeGz,
            growthStage: obj.userData.growthStage as number,
            health: obj.userData.health as number,
            skillPathId: obj.userData.skillPathId as string | undefined,
          };

          // If avatar is already adjacent (within 1 tile), open immediately
          const dx = Math.abs(this.avatarGridPos.gx - treeGx);
          const dz = Math.abs(this.avatarGridPos.gz - treeGz);
          if (dx <= 1 && dz <= 1) {
            this.onLearningTreeClick?.(treeData);
            return;
          }

          // Otherwise, walk to an adjacent tile first, then open
          const adj = this.findAdjacentTile(treeGx, treeGz);
          if (adj) {
            this.pendingTreeInteraction = treeData;
            this.state.movementTarget = adj;
          }
          return; // Don't process tile clicks if we clicked a tree
        }
        obj = obj.parent!;
      }
    }
    
    // Now check tiles for avatar movement or ghost preview placement
    const intersects = this.state.raycaster.intersectObjects(this.state.tiles);
    
    if (intersects.length > 0 && intersects[0].object.userData.isTile) {
      const { gx, gz } = intersects[0].object.userData;
      const isOccupied = this.state.occupiedCells.has(cellKey(gx, gz));
      
      // If there's a ghost preview, try to place object
      if (this.state.ghostPreview) {
        this.options.onTileClick?.(gx, gz, isOccupied);
        return;
      }
      
      // Otherwise, move avatar (and cancel any pending tree interaction)
      if (!isOccupied && isValidCell(gx, gz)) {
        this.pendingTreeInteraction = null;
        this.state.movementTarget = { gx, gz };
      }
    }
  }

  /**
   * Handle window resize.
   */
  private handleResize(): void {
    const canvas = this.state.renderer.domElement;
    const { width, height } = canvas.getBoundingClientRect();
    const aspect = width / height;
    
    this.state.camera.left = -this.state.frustum * aspect / 2;
    this.state.camera.right = this.state.frustum * aspect / 2;
    this.state.camera.top = this.state.frustum / 2;
    this.state.camera.bottom = -this.state.frustum / 2;
    this.state.camera.updateProjectionMatrix();
    
    this.state.renderer.setSize(width, height);
    this.state.dimensions = { width, height };
  }

  // ==========================================================================
  // OBJECT MANAGEMENT
  // ==========================================================================

  /**
   * Place a garden object at the specified grid position.
   * 
   * @param objectType - Type of object to place (e.g., 'oak', 'rose')
   * @param gx - Grid X position
   * @param gz - Grid Z position
   * @param id - Optional ID for the object (generated if not provided)
   * @returns The placed object, or null if placement failed
   */
  placeObject(
    objectType: string,
    gx: number,
    gz: number,
    id?: string
  ): PlacedObject | null {
    // Validate position
    if (!isValidCell(gx, gz)) {
      console.warn(`Invalid grid position: (${gx}, ${gz})`);
      return null;
    }
    
    const key = cellKey(gx, gz);
    if (this.state.occupiedCells.has(key)) {
      console.warn(`Cell already occupied: (${gx}, ${gz})`);
      return null;
    }
    
    // Create object
    const mesh = createObject(objectType, gx, gz);
    if (!mesh) {
      console.warn(`Unknown object type: ${objectType}`);
      return null;
    }
    
    // Generate ID if not provided
    const objectId = id || `${objectType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Track object
    const placedObject: PlacedObject = {
      id: objectId,
      objectType,
      gx,
      gz,
      mesh,
    };
    
    this.placedObjects.push(placedObject);
    this.state.occupiedCells.add(key);
    
    // Track animated objects
    if (mesh.userData.isFountain) {
      this.state.fountains.push(mesh);
    }
    if (mesh.userData.isPond) {
      this.state.ponds.push(mesh);
    }
    
    this.state.objectLayer.add(mesh);
    
    // Notify callback
    this.options.onObjectPlace?.(objectId, gx, gz);
    
    return placedObject;
  }

  /**
   * Remove a placed object.
   * 
   * @param id - ID of the object to remove
   * @returns true if object was removed, false if not found
   */
  removeObject(id: string): boolean {
    const index = this.placedObjects.findIndex((obj) => obj.id === id);
    if (index === -1) return false;
    
    const obj = this.placedObjects[index];
    const key = cellKey(obj.gx, obj.gz);
    
    // Remove from scene
    if (obj.mesh) {
      this.state.objectLayer.remove(obj.mesh);
      
      // Dispose resources
      obj.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }
    
    // Remove from tracking
    this.state.occupiedCells.delete(key);
    this.placedObjects.splice(index, 1);
    
    // Remove from animated arrays
    this.state.fountains = this.state.fountains.filter((f) => f !== obj.mesh);
    this.state.ponds = this.state.ponds.filter((p) => p !== obj.mesh);
    
    return true;
  }

  /**
   * Get all placed objects.
   */
  getPlacedObjects(): PlacedObject[] {
    return [...this.placedObjects];
  }

  /**
   * Check if a cell is occupied.
   */
  isCellOccupied(gx: number, gz: number): boolean {
    return this.state.occupiedCells.has(cellKey(gx, gz));
  }

  // ==========================================================================
  // AVATAR MANAGEMENT
  // ==========================================================================

  /**
   * Update avatar appearance.
   */
  updateAvatar(options: AvatarOptions): void {
    // Remove old avatar
    this.state.scene.remove(this.state.avatar);
    
    // Build new avatar
    this.state.avatar = buildAvatar(options);
    
    // Restore position
    const { x, z } = gridToWorld(this.avatarGridPos.gx, this.avatarGridPos.gz);
    this.state.avatar.position.set(x, 0, z);
    
    this.state.scene.add(this.state.avatar);
  }

  /**
   * Get current avatar grid position.
   */
  getAvatarPosition(): { gx: number; gz: number } {
    return { ...this.avatarGridPos };
  }

  /**
   * Find the closest walkable tile adjacent to the given grid position.
   * Used for walk-to-tree: avatar walks to an adjacent tile, not onto the tree.
   * 
   * @param treeGx - Tree grid X
   * @param treeGz - Tree grid Z
   * @returns Adjacent tile coords, or null if none available
   */
  private findAdjacentTile(treeGx: number, treeGz: number): { gx: number; gz: number } | null {
    // Check 4 cardinal neighbors first, then diagonals
    const offsets = [
      [0, -1], [0, 1], [-1, 0], [1, 0],  // cardinal
      [-1, -1], [1, -1], [-1, 1], [1, 1], // diagonal
    ];

    // Sort by distance to avatar so we walk to the nearest adjacent tile
    const candidates = offsets
      .map(([dx, dz]) => ({ gx: treeGx + dx, gz: treeGz + dz }))
      .filter(({ gx, gz }) =>
        isValidCell(gx, gz) &&
        !this.state.occupiedCells.has(cellKey(gx, gz))
      )
      .sort((a, b) => {
        const distA = Math.abs(a.gx - this.avatarGridPos.gx) + Math.abs(a.gz - this.avatarGridPos.gz);
        const distB = Math.abs(b.gx - this.avatarGridPos.gx) + Math.abs(b.gz - this.avatarGridPos.gz);
        return distA - distB;
      });

    return candidates[0] || null;
  }

  /**
   * Instantly move avatar to a grid position.
   */
  setAvatarPosition(gx: number, gz: number): void {
    if (!isValidCell(gx, gz)) return;
    
    this.avatarGridPos = { gx, gz };
    const { x, z } = gridToWorld(gx, gz);
    this.state.avatar.position.set(x, 0, z);
    this.state.movementTarget = null;
  }

  // ==========================================================================
  // LEARNING TREE MANAGEMENT
  // ==========================================================================

  /**
   * Add or update a learning tree in the scene.
   * Creates a 3D learning tree from game state data.
   * 
   * @param options - Learning tree options (gx, gz, growthStage, health, etc.)
   */
  addLearningTree(options: LearningTreeOptions): void {
    const key = cellKey(options.gx, options.gz);
    
    // Remove existing tree at this position if any
    this.removeLearningTree(options.gx, options.gz);
    
    // Create the 3D tree using the procedural generator
    const treeGroup = makeLearningTree(options);
    
    // Add to scene and tracking map
    this.state.scene.add(treeGroup);
    this.learningTrees.set(key, treeGroup);
    
    // Mark grid cell as occupied (prevents avatar walking into trees)
    this.state.occupiedCells.add(key);
  }

  /**
   * Remove a learning tree from the scene.
   * Properly disposes of all geometries and materials.
   * 
   * @param gx - Grid X position
   * @param gz - Grid Z position
   */
  removeLearningTree(gx: number, gz: number): void {
    const key = cellKey(gx, gz);
    const existing = this.learningTrees.get(key);
    
    if (existing) {
      // Remove from scene
      this.state.scene.remove(existing);
      
      // Dispose geometries and materials to prevent memory leaks
      existing.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      
      // Remove from tracking
      this.learningTrees.delete(key);
      this.state.occupiedCells.delete(key);
    }
  }

  /**
   * Sync all learning trees from game state.
   * Call this whenever the UserTree[] array changes.
   * 
   * This efficiently updates the 3D scene to match game state:
   * - Removes trees that no longer exist
   * - Adds new trees
   * - Updates existing trees if data changed
   * 
   * @param trees - Array of tree data from game state
   */
  syncLearningTrees(trees: Array<{
    gx: number;
    gz: number;
    growthStage: number;
    health: number;
    skillPathId?: string;
    status?: TreeStatus;
    isDead?: boolean;
  }>): void {
    // Build set of new positions for efficient lookup
    const newPositions = new Set(trees.map(t => cellKey(t.gx, t.gz)));
    
    // Remove trees that no longer exist in game state
    for (const [key, group] of this.learningTrees) {
      if (!newPositions.has(key)) {
        const { gx, gz } = group.userData;
        this.removeLearningTree(gx, gz);
      }
    }
    
    // Add or update all trees from game state
    for (const tree of trees) {
      this.addLearningTree(tree);
    }
  }

  /**
   * Get all learning trees currently in the scene.
   * 
   * @returns Array of tree groups with metadata
   */
  getLearningTrees(): THREE.Group[] {
    return Array.from(this.learningTrees.values());
  }

  // ==========================================================================
  // GHOST PREVIEW (FOR SHOP)
  // ==========================================================================

  /**
   * Show a ghost preview of an object during placement mode.
   */
  showGhostPreview(objectType: string): void {
    this.clearGhostPreview();
    
    const mesh = createObject(objectType, 0, 0);
    if (!mesh) return;
    
    // Make all materials semi-transparent
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshLambertMaterial;
        material.transparent = true;
        material.opacity = 0.5;
      }
    });
    
    this.state.ghostPreview = mesh;
    this.state.scene.add(mesh);
    mesh.visible = false;
  }

  /**
   * Update ghost preview position based on hover.
   */
  updateGhostPreview(gx: number, gz: number): void {
    if (!this.state.ghostPreview) return;
    
    const { x, z } = gridToWorld(gx, gz);
    this.state.ghostPreview.position.set(x, 0, z);
    this.state.ghostPreview.visible = true;
  }

  /**
   * Clear the ghost preview.
   */
  clearGhostPreview(): void {
    if (this.state.ghostPreview) {
      this.state.scene.remove(this.state.ghostPreview);
      this.state.ghostPreview.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.state.ghostPreview = null;
    }
  }

  // ==========================================================================
  // ANIMATION LOOP
  // ==========================================================================

  /**
   * Move avatar toward target position.
   */
  private updateAvatarMovement(delta: number): void {
    if (!this.state.movementTarget) return;
    
    const targetWorld = gridToWorld(this.state.movementTarget.gx, this.state.movementTarget.gz);
    const targetPos = new THREE.Vector3(targetWorld.x, 0, targetWorld.z);
    const currentPos = this.state.avatar.position.clone();
    
    const direction = targetPos.clone().sub(currentPos);
    const distance = direction.length();
    
    if (distance < 0.05) {
      // Arrived at destination
      this.state.avatar.position.set(targetWorld.x, 0, targetWorld.z);
      this.avatarGridPos = { gx: this.state.movementTarget.gx, gz: this.state.movementTarget.gz };
      this.state.movementTarget = null;
      
      // Notify callback
      this.options.onAvatarMove?.(this.avatarGridPos.gx, this.avatarGridPos.gz);
      
      // If we were walking to a tree, fire the interaction now that we've arrived
      if (this.pendingTreeInteraction) {
        const pending = this.pendingTreeInteraction;
        this.pendingTreeInteraction = null;
        this.onLearningTreeClick?.(pending);
      }
    } else {
      // Move toward target
      direction.normalize();
      
      // Rotate avatar to face movement direction
      // Calculate angle from direction (in XZ plane)
      const targetRotation = Math.atan2(direction.x, direction.z);
      // Smoothly interpolate rotation
      const currentRotation = this.state.avatar.rotation.y;
      let rotationDiff = targetRotation - currentRotation;
      
      // Normalize rotation difference to -PI to PI
      while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      // Apply smooth rotation (lerp factor 8.0 for snappy but smooth turning)
      this.state.avatar.rotation.y = currentRotation + rotationDiff * Math.min(1, delta * 8);
      
      // Move avatar
      const moveDistance = Math.min(AVATAR_SPEED * delta, distance);
      this.state.avatar.position.add(direction.clone().multiplyScalar(moveDistance));
      
      // Walking bob — subtle Y-axis bounce for lively movement
      const walkPhase = this.state.clock.getElapsedTime() * 8; // 8 Hz bounce
      this.state.avatar.position.y = Math.abs(Math.sin(walkPhase)) * 0.06;
      
      // Update grid position
      const worldPos = {
        x: this.state.avatar.position.x,
        z: this.state.avatar.position.z,
      };
      const gridPos = worldToGrid(worldPos.x, worldPos.z);
      if (gridPos) {
        this.avatarGridPos = gridPos;
      }
    }
  }

  /**
   * Main animation loop.
   */
  animate(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    
    const tick = () => {
      if (!this.isRunning) return;
      
      const delta = this.state.clock.getDelta();
      const elapsed = this.state.clock.getElapsedTime();
      
      // Update avatar movement
      this.updateAvatarMovement(delta);
      
      // === IDLE BREATHING ===
      // When not walking, apply a subtle Y-axis sine oscillation
      if (!this.state.movementTarget) {
        const breathY = Math.sin(elapsed * 1.5) * 0.02; // slow, tiny bob
        this.state.avatar.position.y = breathY;
      }
      
      // === EYE BLINK ===
      // Occasional blink: eyes scale to 0 briefly every 3-6 seconds
      const blinkDuration = 0.12; // 120ms blink
      if (!this.isBlinking && elapsed >= this.nextBlinkTime) {
        // Start a blink
        this.isBlinking = true;
        this.blinkStartTime = elapsed;
      }
      if (this.isBlinking) {
        const blinkProgress = elapsed - this.blinkStartTime;
        // Scale eyes to 0 on Y axis during blink, then restore
        const eyeScaleY = blinkProgress < blinkDuration ? 0.1 : 1.0;
        const eyeNames = ['eye_left', 'eye_right', 'pupil_left', 'pupil_right'];
        for (const name of eyeNames) {
          const eyePart = this.state.avatar.getObjectByName(name);
          if (eyePart) {
            eyePart.scale.y = eyeScaleY;
          }
        }
        // End blink after duration
        if (blinkProgress >= blinkDuration) {
          this.isBlinking = false;
          // Schedule next blink 3-6 seconds from now
          this.nextBlinkTime = elapsed + 3 + Math.random() * 3;
        }
      }
      
      // Update animated objects (fountains, ponds)
      updatePlacedObjectAnimations(this.placedObjects, elapsed);
      
      // Update lantern flicker effect (candle-like intensity modulation)
      AtmosphereBuilder.updateLanternFlicker(this.state.objectLayer, elapsed);
      
      // Update ghost preview position
      if (this.state.ghostPreview && this.state.hoverTile.visible) {
        const intersects = this.state.raycaster.intersectObjects(this.state.tiles);
        if (intersects.length > 0 && intersects[0].object.userData.isTile) {
          const { gx, gz } = intersects[0].object.userData;
          this.updateGhostPreview(gx, gz);
        }
      } else if (this.state.ghostPreview) {
        this.state.ghostPreview.visible = false;
      }
      
      // Render
      this.state.renderer.render(this.state.scene, this.state.camera);
      
      this.animationFrameId = requestAnimationFrame(tick);
    };
    
    tick();
  }

  /**
   * Stop the animation loop.
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.stop();
    
    // Dispose tiles
    this.state.tiles.forEach((tile) => {
      tile.geometry.dispose();
      if (tile.material instanceof THREE.Material) {
        tile.material.dispose();
      }
    });
    
    // Dispose placed objects
    this.placedObjects.forEach((obj) => {
      if (obj.mesh) {
        obj.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
      }
    });
    
    // Dispose avatar
    this.state.avatar.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    
    // Dispose hover tile
    this.state.hoverTile.geometry.dispose();
    if (this.state.hoverTile.material instanceof THREE.Material) {
      this.state.hoverTile.material.dispose();
    }
    
    // Disconnect resize observer (primary resize strategy on mobile)
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    } else {
      // Only remove window listener if ResizeObserver wasn't available (fallback path)
      window.removeEventListener('resize', this.handleResize.bind(this));
    }

    // Dispose renderer
    this.state.renderer.dispose();
  }

  // ==========================================================================
  // AMBIENT DECORATION
  // ==========================================================================

  /**
   * Scatter flowers and small plants across the garden using a seeded layout.
   *
   * Rules:
   * - Avoids border tiles (gx/gz = 0 or 11) — those are the fence line
   * - Avoids the centre zone (gx 4-7, gz 4-7) — reserved for learning trees
   * - Avatar avatar spawns at (6,6), so nothing is placed there
   * - Uses a deterministic RNG so the same userId always sees the same garden
   * - Decorations are NOT added to occupiedCells — avatar walks through them
   *   (small flowers don't block movement; feels natural)
   *
   * @param userId - PocketBase user ID (seeds the RNG)
   */
  private setupAmbientDecoration(userId: string): void {
    const rng = makeSeededRng(userId);

    // Flower and plant types available as ambient decorations.
    // Bias heavily toward cheap flowers so the garden looks colourful.
    const palette = [
      'daisy', 'daisy', 'daisy',
      'tulip', 'tulip',
      'lavender', 'lavender',
      'rose',
      'poppy',
      'mushroom',
      'hedge',
    ];

    // Build candidate list — every interior tile NOT in the centre learning-tree zone
    const candidates: { gx: number; gz: number }[] = [];
    for (let gx = 1; gx <= 10; gx++) {
      for (let gz = 1; gz <= 10; gz++) {
        // Skip the learning-tree centre zone
        if (gx >= 4 && gx <= 7 && gz >= 4 && gz <= 7) continue;
        // Skip the avatar spawn tile
        if (gx === 6 && gz === 6) continue;
        candidates.push({ gx, gz });
      }
    }

    // Fisher–Yates shuffle using the seeded RNG
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = tmp;
    }

    // Place ~22 decorations (enough to feel lively without cluttering)
    const COUNT = 22;
    for (let i = 0; i < Math.min(COUNT, candidates.length); i++) {
      const { gx, gz } = candidates[i];

      // Skip if another placed object already occupies this cell
      if (this.state.occupiedCells.has(cellKey(gx, gz))) continue;

      const typeIdx = Math.floor(rng() * palette.length);
      const objectType = palette[typeIdx];

      const mesh = createObject(objectType, gx, gz);
      if (!mesh) continue;

      // Add directly to scene (not objectLayer) so shop remove doesn't touch them
      this.state.scene.add(mesh);
      this.ambientDecorations.push(mesh);
      // Note: we intentionally do NOT add to occupiedCells — avatar walks through
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get a screenshot of the current view.
   */
  captureScreenshot(): string {
    return this.state.renderer.domElement.toDataURL('image/png');
  }

  /**
   * Pointer lock for first-person mode (future feature).
   */
  requestPointerLock(): void {
    this.state.renderer.domElement.requestPointerLock();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { GRID_SIZE, TILE_WIDTH, TILE_HEIGHT } from './types';
export type { AvatarOptions, PlacedObject, GardenRendererOptions } from './types';
export { DEFAULT_AVATAR } from './types';
export { SHOP_CATALOGUE } from './types';