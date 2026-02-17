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
export class GardenRenderer {
  private state: RendererState;
  private options: GardenRendererOptions;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private placedObjects: PlacedObject[] = [];
  private learningTrees: Map<string, THREE.Group> = new Map();
  private avatarGridPos: { gx: number; gz: number } = { gx: 6, gz: 6 };
  
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
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
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
   * Set up the scene with lights and groups.
   */
  private setupScene(): void {
    // Hemisphere light for natural outdoor lighting
    // Sky color is light blue, ground color is soft green
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3A5F0B, 0.8);
    this.state.scene.add(hemisphereLight);
    
    // Ambient light for base illumination (bright for kid-friendly look)
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
    this.state.scene.add(ambientLight);
    
    // Main directional light (sun) for shadows
    const sunLight = new THREE.DirectionalLight(0xFFFAE6, 1.2);
    sunLight.position.set(20, 40, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.001;
    this.state.scene.add(sunLight);
    
    // Soft fill light from opposite direction to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xB4D4E7, 0.3);
    fillLight.position.set(-15, 20, -10);
    this.state.scene.add(fillLight);
    
    // Object layer for placed objects
    this.state.scene.add(this.state.objectLayer);
    
    // Hover tile
    this.state.scene.add(this.state.hoverTile);
  }

  /**
   * Set up the tile floor.
   */
  private setupTiles(): void {
    // Ground plane below tiles
    const groundGeometry = new THREE.PlaneGeometry(GRID_SIZE * 2, GRID_SIZE * 2);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x0A1A0A });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.state.scene.add(ground);
    
    // Create tiles
    for (let gz = 0; gz < GRID_SIZE; gz++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const { x, z } = gridToWorld(gx, gz);
        const isPath = this.state.tilemap.has(cellKey(gx, gz));
        const color = getTileColor(gx, gz, isPath);
        
        const tileGeometry = new THREE.BoxGeometry(
          TILE_WIDTH * 0.98,
          TILE_HEIGHT,
          TILE_WIDTH * 0.98
        );
        const tileMaterial = new THREE.MeshLambertMaterial({ color });
        const tile = new THREE.Mesh(tileGeometry, tileMaterial);
        
        tile.position.set(x, TILE_HEIGHT / 2, z);
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
   * Set up mouse and resize event listeners.
   */
  private setupEventListeners(): void {
    const canvas = this.state.renderer.domElement;
    
    // Mouse move for hover effect
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // Click for avatar movement
    canvas.addEventListener('click', this.handleClick.bind(this));
    
    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));
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
          // Fire the learning tree click callback
          this.onLearningTreeClick?.({
            gx: obj.userData.gx,
            gz: obj.userData.gz,
            growthStage: obj.userData.growthStage,
            health: obj.userData.health,
            skillPathId: obj.userData.skillPathId,
          });
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
      
      // Otherwise, move avatar
      if (!isOccupied && isValidCell(gx, gz)) {
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
      
      // Update animated objects
      updatePlacedObjectAnimations(this.placedObjects, elapsed);
      
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
    
    // Dispose renderer
    this.state.renderer.dispose();
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize.bind(this));
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