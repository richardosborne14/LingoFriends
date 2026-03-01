/**
 * ObjectViewerRenderer — Isolated 3D Object Inspector
 *
 * A standalone Three.js renderer for examining individual garden objects
 * (trees, flowers, furniture, features) and the player avatar in isolation.
 *
 * Features:
 * - Perspective camera (better than orthographic for close inspection)
 * - Manual orbit controls: drag to rotate, scroll to zoom
 * - Auto-rotate turntable mode
 * - Ground grid reference plane for scale
 * - Screenshot capture via canvas.toDataURL()
 * - Animated objects (fountain, pond) play their animations here too
 *
 * Design intent: dev-only tool for iterating on 3D object quality.
 * Not shipped to production — gated behind VITE_DEBUG_MODE.
 *
 * @module renderer/ObjectViewerRenderer
 */

import * as THREE from 'three';
import { createObject, updateFountainAnimation, updatePondAnimation } from './objects/objectFactory';
import { buildAvatar } from './AvatarBuilder';
import { AvatarOptions, DEFAULT_AVATAR } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Background colour — dark neutral so object colours read clearly */
const BG_COLOR = 0x1a1a2e;

/** Grid colour — subtle so it doesn't fight the object */
const GRID_COLOR = 0x2a2a4a;

/** Initial camera distance */
const DEFAULT_RADIUS = 3.2;

/** Minimum zoom distance */
const MIN_RADIUS = 0.8;

/** Maximum zoom distance */
const MAX_RADIUS = 12;

/** Default camera azimuth angle (radians) — 45° so we see front-left face */
const DEFAULT_AZIMUTH = Math.PI / 4;

/** Default camera elevation angle (radians) — 30° above horizontal */
const DEFAULT_ELEVATION = 0.52;

/** Auto-rotate speed (radians per second) */
const AUTO_ROTATE_SPEED = 0.6;

/** Mouse drag sensitivity for orbit */
const ORBIT_SENSITIVITY = 0.008;

/** Scroll wheel zoom sensitivity */
const ZOOM_SENSITIVITY = 0.0012;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for what the viewer is currently displaying.
 */
export interface ViewerObjectInfo {
  /** Object type ID (e.g. 'oak', 'rose', 'fountain') */
  objectType: string;
  /** Display name */
  name: string;
  /** Emoji icon */
  icon: string;
  /** Category (Trees, Flowers, etc.) */
  category: string;
  /** Gem cost */
  cost: number;
  /** Whether the object has runtime animations */
  isAnimated: boolean;
  /** Whether it's the avatar (special case) */
  isAvatar: boolean;
}

// ============================================================================
// OBJECT VIEWER RENDERER CLASS
// ============================================================================

/**
 * Isolated 3D viewer renderer.
 *
 * Manages its own Three.js scene entirely separately from GardenRenderer.
 * Use loadObject() or loadAvatar() to swap what's being displayed.
 * Call dispose() when the component unmounts.
 *
 * @example
 * const viewer = new ObjectViewerRenderer(canvasRef.current);
 * viewer.loadObject('cherry');
 * viewer.setAutoRotate(true);
 *
 * // In cleanup:
 * viewer.dispose();
 */
export class ObjectViewerRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();
  private animationId: number | null = null;
  private isRunning = false;

  // ── Active object ──────────────────────────────────────────────────────────
  private currentObject: THREE.Group | null = null;
  private isFountain = false;
  private isPond = false;

  // ── Orbit state ────────────────────────────────────────────────────────────
  private azimuth = DEFAULT_AZIMUTH;
  private elevation = DEFAULT_ELEVATION;
  private radius = DEFAULT_RADIUS;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private autoRotate = false;

  // ── Resize observer ────────────────────────────────────────────────────────
  private resizeObserver: ResizeObserver | null = null;

  /**
   * Create the viewer and attach it to a canvas element.
   *
   * @param canvas - The HTMLCanvasElement to render into
   */
  constructor(canvas: HTMLCanvasElement) {
    // ── Renderer ──
    const { width, height } = canvas.getBoundingClientRect();
    // preserveDrawingBuffer must be set at construction time so screenshots
    // (toDataURL) work correctly even after the next requestAnimationFrame.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width || 600, height || 400);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Scene ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);
    // Subtle fog to match the dark bg (no hard clipping at edges)
    this.scene.fog = new THREE.FogExp2(BG_COLOR, 0.03);

    // ── Camera ──
    const aspect = (width || 600) / (height || 400);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 100);
    this.updateCameraPosition();

    // ── Lighting ──
    this.setupLighting();

    // ── Ground grid ──
    this.addGroundGrid();

    // ── Resize + input ──
    this.setupEventListeners(canvas);
  }

  // ==========================================================================
  // SCENE SETUP
  // ==========================================================================

  /**
   * Configure the lighting for object inspection.
   *
   * Three-point lighting setup (key + fill + rim) gives good shape definition
   * without washing out the object or creating harsh shadows.
   */
  private setupLighting(): void {
    // Bright ambient so even dark-coloured objects are readable
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    // Key light — warm, slightly above and to the right
    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    keyLight.position.set(3, 5, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    this.scene.add(keyLight);

    // Fill light — cool, from the left, softer
    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.4);
    fillLight.position.set(-3, 3, -2);
    this.scene.add(fillLight);

    // Rim light — behind and below for silhouette pop
    const rimLight = new THREE.DirectionalLight(0x8888cc, 0.3);
    rimLight.position.set(0, -1, -5);
    this.scene.add(rimLight);
  }

  /**
   * Add a subtle ground grid for scale reference.
   *
   * Uses a custom grid mesh rather than THREE.GridHelper so we can match
   * the dark background colour precisely.
   */
  private addGroundGrid(): void {
    // Shadow-receiving ground plane (invisible but catches shadows)
    const groundGeo = new THREE.PlaneGeometry(10, 10);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = 'shadowPlane';
    this.scene.add(ground);

    // Visible grid lines
    const gridHelper = new THREE.GridHelper(4, 8, GRID_COLOR, GRID_COLOR);
    gridHelper.position.y = 0.001; // Just above the shadow plane to avoid z-fighting
    gridHelper.name = 'gridHelper';
    // Make the grid slightly transparent
    (gridHelper.material as THREE.Material).opacity = 0.35;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);

    // Origin dot — small circle to mark world center
    const dotGeo = new THREE.CircleGeometry(0.04, 12);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = 0.002;
    dot.name = 'originDot';
    this.scene.add(dot);
  }

  // ==========================================================================
  // ORBIT CAMERA
  // ==========================================================================

  /**
   * Recompute the camera position from spherical coordinates.
   * Called whenever azimuth, elevation, or radius changes.
   */
  private updateCameraPosition(): void {
    // Clamp elevation so we never go below the ground or straight overhead
    this.elevation = Math.max(0.08, Math.min(Math.PI / 2 - 0.05, this.elevation));

    const x = this.radius * Math.cos(this.elevation) * Math.sin(this.azimuth);
    const y = this.radius * Math.sin(this.elevation);
    const z = this.radius * Math.cos(this.elevation) * Math.cos(this.azimuth);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0.3, 0); // Look slightly above ground (centre of most objects)
  }

  /**
   * Reset camera to default viewing angle and distance.
   */
  resetCamera(): void {
    this.azimuth = DEFAULT_AZIMUTH;
    this.elevation = DEFAULT_ELEVATION;
    this.radius = DEFAULT_RADIUS;
    this.updateCameraPosition();
  }

  /**
   * Toggle auto-rotate turntable mode.
   */
  setAutoRotate(value: boolean): void {
    this.autoRotate = value;
  }

  // ==========================================================================
  // OBJECT LOADING
  // ==========================================================================

  /**
   * Load a garden object by type ID (e.g. 'oak', 'fountain').
   *
   * Removes the current object, creates the new one, centers it, and optionally
   * adjusts the camera distance to fit the object's bounding box.
   *
   * @param objectType - Object type ID matching objectFactories keys
   */
  loadObject(objectType: string): void {
    this.clearCurrentObject();

    // Create the object at grid (0,0). gridToWorld(0,0) = (-4.5, 0, -4.5)
    // so we need to reset the group position to origin.
    const group = createObject(objectType, 0, 0);
    if (!group) {
      console.warn(`[ObjectViewerRenderer] Unknown object type: ${objectType}`);
      return;
    }

    // Reset the grid-world offset so the object sits at origin
    group.position.set(0, 0, 0);

    // Track animation types
    this.isFountain = group.userData.isFountain === true;
    this.isPond = group.userData.isPond === true;

    this.currentObject = group;
    this.scene.add(group);

    // Auto-fit camera to bounding box
    this.fitCameraToObject(group);
  }

  /**
   * Load the player avatar with custom options.
   *
   * @param options - Avatar customisation options (defaults to DEFAULT_AVATAR)
   */
  loadAvatar(options: AvatarOptions = DEFAULT_AVATAR): void {
    this.clearCurrentObject();

    const avatarGroup = buildAvatar(options);
    // Avatar is already built at origin (no grid offset)
    this.currentObject = avatarGroup;
    this.scene.add(avatarGroup);

    // Fit camera — avatar is taller than most objects
    this.fitCameraToObject(avatarGroup, 1.5);
  }

  /**
   * Remove and dispose the currently displayed object.
   */
  private clearCurrentObject(): void {
    if (!this.currentObject) return;

    this.scene.remove(this.currentObject);
    this.currentObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          (child.material as THREE.Material).dispose();
        }
      }
    });

    this.currentObject = null;
    this.isFountain = false;
    this.isPond = false;
  }

  /**
   * Adjust camera radius so the object fills the viewport comfortably.
   *
   * @param object - The object to fit
   * @param scaleFactor - Multiplier on the computed distance (default 1.2 = 20% padding)
   */
  private fitCameraToObject(object: THREE.Group, scaleFactor = 1.2): void {
    // Compute the bounding sphere
    const box = new THREE.Box3().setFromObject(object);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    if (sphere.radius === 0) return;

    // Use field-of-view to get the minimum distance needed
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const minDist = (sphere.radius / Math.sin(fovRad / 2)) * scaleFactor;

    this.radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, minDist));
    this.updateCameraPosition();
  }

  // ==========================================================================
  // INPUT HANDLING
  // ==========================================================================

  /**
   * Register mouse, touch, and scroll listeners for orbit control.
   * Also attaches a ResizeObserver for responsive canvas sizing.
   */
  private setupEventListeners(canvas: HTMLCanvasElement): void {
    // Mouse orbit
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: true });

    // Touch orbit (single-finger drag)
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });

    // Resize
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize(canvas));
      this.resizeObserver.observe(canvas);
    }
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    // Horizontal drag → orbit around Y axis (azimuth)
    this.azimuth -= dx * ORBIT_SENSITIVITY;
    // Vertical drag → elevation
    this.elevation += dy * ORBIT_SENSITIVITY;
    this.updateCameraPosition();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    this.radius += e.deltaY * ZOOM_SENSITIVITY;
    this.radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, this.radius));
    this.updateCameraPosition();
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - this.lastMouseX;
    const dy = e.touches[0].clientY - this.lastMouseY;
    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;

    this.azimuth -= dx * ORBIT_SENSITIVITY;
    this.elevation += dy * ORBIT_SENSITIVITY;
    this.updateCameraPosition();
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  /**
   * Handle canvas resize — updates camera aspect and renderer dimensions.
   */
  private handleResize(canvas: HTMLCanvasElement): void {
    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ==========================================================================
  // ANIMATION LOOP
  // ==========================================================================

  /**
   * Start the render loop.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const tick = (): void => {
      if (!this.isRunning) return;

      const elapsed = this.clock.getElapsedTime();

      // Auto-rotate: slowly spin azimuth
      if (this.autoRotate && !this.isDragging) {
        this.azimuth += AUTO_ROTATE_SPEED * this.clock.getDelta();
        // getDelta() advances the clock — use elapsed for animation, delta for rotate
        this.updateCameraPosition();
      }

      // Animated object updates
      if (this.currentObject) {
        if (this.isFountain) updateFountainAnimation(this.currentObject, elapsed);
        if (this.isPond) updatePondAnimation(this.currentObject, elapsed);
      }

      this.renderer.render(this.scene, this.camera);
      this.animationId = requestAnimationFrame(tick);
    };

    tick();
  }

  /**
   * Stop the render loop.
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // ==========================================================================
  // SCREENSHOT
  // ==========================================================================

  /**
   * Capture the current frame as a PNG data URL.
   *
   * The renderer uses preserveDrawingBuffer=true so this works at any time,
   * not just immediately after the render call.
   *
   * @returns PNG data URL (can be used directly as img.src or downloaded)
   */
  captureScreenshot(): string {
    // Force an extra render so we always capture the latest frame
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Dispose all Three.js resources and remove event listeners.
   * Must be called when the component unmounts to prevent memory leaks.
   */
  dispose(): void {
    this.stop();
    this.clearCurrentObject();

    // Dispose scene objects
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          (child.material as THREE.Material).dispose();
        }
      }
    });

    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove global mouse listeners (they were on window, not canvas)
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));

    this.renderer.dispose();
  }
}
