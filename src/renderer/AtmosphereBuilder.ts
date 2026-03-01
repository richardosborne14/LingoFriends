/**
 * Atmosphere Builder for the Evening Garden Scene
 * 
 * Adds all atmospheric elements to match the GardenV2.jsx reference:
 * - Stars scattered across the night sky
 * - Moon with soft glow
 * - Dark wispy clouds
 * - Wooden fence around the perimeter
 * - Green border beneath the tile grid
 * 
 * Extracted from GardenRenderer to keep the main class focused on
 * interaction/rendering while this handles pure visual decoration.
 * 
 * @see docs/phase-1.1/GardenV2.jsx — Visual reference (don't modify)
 * @module renderer/AtmosphereBuilder
 */

import * as THREE from 'three';
import { GRID_SIZE, TILE_WIDTH, TILE_HEIGHT } from './types';

// ============================================================================
// CONSTANTS — Copied directly from GardenV2.jsx
// ============================================================================

/** Deep night sky color used for background, fog, and sky elements */
const NIGHT_SKY = 0x080F1C;

/** Number of stars in the sky */
const STAR_COUNT = 55;

/** Moon position — matches GardenV2.jsx */
const MOON_POS = { x: -8, y: 14, z: -12 };

/** Cloud definitions — [x, y, z, scale] from GardenV2.jsx */
const CLOUD_CONFIGS: [number, number, number, number][] = [
  [-4, 9, -10, 1.0],
  [1, 10, -12, 1.2],
  [6, 8.5, -9, 0.9],
  [9, 9, -8, 1.1],
  [-7, 8.5, -7, 0.85],
];

/** Fence post material color (dark brown) */
const FENCE_POST_COLOR = 0x5A3A1A;

/** Fence rail material color (medium brown) */
const FENCE_RAIL_COLOR = 0x7A5530;

/** Green border beneath tile grid */
const BORDER_COLOR = 0x0F2E0A;

// ============================================================================
// ATMOSPHERE BUILDER
// ============================================================================

/**
 * Static utility class that adds atmospheric elements to the garden scene.
 * 
 * All methods are static — no instance needed.
 * Call `build()` once during scene setup, then `updateLanternFlicker()`
 * each frame in the animation loop.
 */
export class AtmosphereBuilder {
  /**
   * Add all atmosphere elements to the scene (night mode).
   * Call this once during GardenRenderer.setupScene().
   * 
   * @param scene - The Three.js scene to decorate
   */
  static build(scene: THREE.Scene): void {
    AtmosphereBuilder.addStars(scene);
    AtmosphereBuilder.addMoon(scene);
    AtmosphereBuilder.addClouds(scene);
    AtmosphereBuilder.addFence(scene);
    AtmosphereBuilder.addBorder(scene);
  }

  /**
   * Add daytime atmosphere elements (no stars/moon, white clouds).
   * Used for bright kid-friendly garden during daytime testing.
   *
   * On mobile (viewport < 768px) we render 4 clouds instead of 5.
   * The GPU budget saved is small but meaningful on mid-range Android:
   * each cloud is 5 spheres × draw call, so we save ~5 draw calls per frame.
   *
   * @param scene - The Three.js scene to decorate
   */
  static buildDaytime(scene: THREE.Scene): void {
    AtmosphereBuilder.addOuterTerrain(scene);
    AtmosphereBuilder.addDaytimeClouds(scene);
    AtmosphereBuilder.addFence(scene);
    AtmosphereBuilder.addBorder(scene);
  }

  // ==========================================================================
  // STARS
  // ==========================================================================

  /**
   * Add scattered stars to the night sky.
   * 55 tiny white spheres at varying heights above the garden.
   * 
   * Distribution matches GardenV2.jsx:
   * - X: spread ±17 around center
   * - Y: 11–18 (well above the garden)
   * - Z: -10 to -22 (behind the camera's viewpoint for depth)
   */
  private static addStars(scene: THREE.Scene): void {
    for (let i = 0; i < STAR_COUNT; i++) {
      // Varying star sizes for visual interest
      const radius = 0.04 + Math.random() * 0.06;
      const geometry = new THREE.SphereGeometry(radius, 3, 3);
      const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
      const star = new THREE.Mesh(geometry, material);

      // Position spread across the sky — matches GardenV2.jsx distribution
      star.position.set(
        (Math.random() - 0.5) * 34,
        11 + Math.random() * 7,
        -10 + Math.random() * -12,
      );

      scene.add(star);
    }
  }

  // ==========================================================================
  // MOON
  // ==========================================================================

  /**
   * Add moon sphere with a soft point-light glow.
   * 
   * Uses MeshBasicMaterial so it appears self-lit (unaffected by scene lighting).
   * The point light creates a subtle bluish-white glow on nearby geometry.
   */
  private static addMoon(scene: THREE.Scene): void {
    // Moon sphere — slightly warm white
    const moonGeometry = new THREE.SphereGeometry(0.7, 10, 10);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xEEEECC });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(MOON_POS.x, MOON_POS.y, MOON_POS.z);
    scene.add(moon);

    // Moon glow — subtle point light for ambient moonlight effect
    const moonGlow = new THREE.PointLight(0xBBCCFF, 0.18, 30);
    moonGlow.position.set(MOON_POS.x, MOON_POS.y, MOON_POS.z);
    scene.add(moonGlow);
  }

  // ==========================================================================
  // CLOUDS
  // ==========================================================================

  /**
   * Build a single cloud cluster from overlapping spheres.
   * Matches the `makeCloud()` function in GardenV2.jsx.
   * 
   * @param cx - Cloud center X
   * @param cy - Cloud center Y
   * @param cz - Cloud center Z
   * @param scale - Scale multiplier for size variation
   */
  private static makeCloud(
    cx: number,
    cy: number,
    cz: number,
    scale: number = 1,
  ): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshLambertMaterial({ color: 0xBBCCDD });

    // 5 overlapping blobs form a cloud shape
    const blobs: [number, number][] = [
      [0, 0],
      [-0.72, 0.14],
      [0.72, 0.1],
      [-0.36, 0.36],
      [0.36, 0.3],
    ];

    blobs.forEach(([bx, by]) => {
      const radius = (0.38 + Math.abs(bx) * 0.08) * scale;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 6, 6),
        material,
      );
      sphere.position.set(bx * scale, by * scale, 0);
      group.add(sphere);
    });

    group.position.set(cx, cy, cz);
    return group;
  }

  /**
   * Add dark wispy clouds to the sky.
   * 5 cloud groups at positions from GardenV2.jsx.
   */
  private static addClouds(scene: THREE.Scene): void {
    CLOUD_CONFIGS.forEach(([x, y, z, s]) => {
      scene.add(AtmosphereBuilder.makeCloud(x, y, z, s));
    });
  }

  /**
   * Add bright white fluffy clouds for daytime sky.
   *
   * Uses MeshBasicMaterial (not MeshLambertMaterial) so cloud spheres are
   * always pure white regardless of directional light direction.  With
   * MeshLambertMaterial, faces turned away from the sun become grey —
   * which is what caused the "grey blob" artefact (Bug 16, Task 2.3.1).
   *
   * Mobile perf: cap at 4 clouds on small viewports (< 768px).
   * Each cloud is 5 sphere draw calls, so skipping one saves ~5 draw calls/frame.
   */
  private static addDaytimeClouds(scene: THREE.Scene): void {
    // Inline mobile check — avoids importing React ecosystem into a Three.js module
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const configs = isMobile ? CLOUD_CONFIGS.slice(0, 4) : CLOUD_CONFIGS;

    configs.forEach(([x, y, z, s]) => {
      const group = new THREE.Group();
      // MeshBasicMaterial: unlit, always crisp white — no grey shading from sun angle
      const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

      const blobs: [number, number][] = [
        [0, 0],
        [-0.72, 0.14],
        [0.72, 0.1],
        [-0.36, 0.36],
        [0.36, 0.3],
      ];

      blobs.forEach(([bx, by]) => {
        const radius = (0.45 + Math.abs(bx) * 0.1) * s;
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 6, 6),
          material,
        );
        sphere.position.set(bx * s, by * s, 0);
        group.add(sphere);
      });

      group.position.set(x, y, z);
      scene.add(group);
    });
  }

  // ==========================================================================
  // OUTER TERRAIN
  // ==========================================================================

  /**
   * Add a large flat grass plane that extends beyond the fence on all sides.
   *
   * Without this, the scene background colour (sky blue) bleeds through
   * underneath the fence — making it look like the garden is floating in the
   * sky rather than sitting in a meadow.  The plane sits just below tile
   * surface level so it seamlessly extends the green border slab outward.
   *
   * Dimensions: 50×50 world units (fence is ±5, so this extends ~20 units
   * past the fence in each direction — well beyond any camera frustum crop).
   *
   * Using MeshLambertMaterial so it picks up sun + hemisphere lighting, which
   * gives it a natural warmth that matches the tile colours.
   */
  private static addOuterTerrain(scene: THREE.Scene): void {
    // Slightly muted meadow green — different from the dark border (0x0F2E0A)
    // but cohesive with the garden palette.  A little yellow-green keeps it
    // looking sunny rather than murky.
    const terrainMaterial = new THREE.MeshLambertMaterial({ color: 0x4A7C2F });

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      terrainMaterial,
    );

    // PlaneGeometry is XY — rotate 90° so it lies flat in the XZ plane
    plane.rotation.x = -Math.PI / 2;

    // Position just below tile surface so it doesn't z-fight with the border slab
    // Tile top surface is at y=0; border slab top is at y ≈ -0.025; we go to -0.06
    plane.position.set(0, -0.06, 0);
    plane.receiveShadow = true;

    scene.add(plane);
  }

  // ==========================================================================
  // FENCE
  // ==========================================================================

  /**
   * Add wooden fence around the garden perimeter.
   * 
   * Posts at every tile boundary along all 4 edges.
   * Two horizontal rails at different heights on each side.
   * 
   * The fence sits just outside the tile grid to frame the garden.
   */
  private static addFence(scene: THREE.Scene): void {
    const postMat = new THREE.MeshLambertMaterial({ color: FENCE_POST_COLOR });
    const railMat = new THREE.MeshLambertMaterial({ color: FENCE_RAIL_COLOR });
    const halfG = GRID_SIZE / 2;

    // Posts along all 4 edges
    // GardenV2 places posts at each tile boundary (0..G) along perimeter
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = (i - halfG) * TILE_WIDTH;

      // Posts along X-axis edges (front and back)
      [-halfG * TILE_WIDTH, halfG * TILE_WIDTH].forEach((edgeZ) => {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.4, 0.07),
          postMat,
        );
        post.position.set(pos, TILE_HEIGHT / 2 + 0.2, edgeZ);
        scene.add(post);
      });

      // Posts along Z-axis edges (left and right)
      [-halfG * TILE_WIDTH, halfG * TILE_WIDTH].forEach((edgeX) => {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.4, 0.07),
          postMat,
        );
        post.position.set(edgeX, TILE_HEIGHT / 2 + 0.2, pos);
        scene.add(post);
      });
    }

    // Horizontal rails at two heights along each edge
    // ry offsets match GardenV2.jsx: -0.05 and 0.15 (relative to post center)
    [-0.05, 0.15].forEach((ry) => {
      [-halfG * TILE_WIDTH, halfG * TILE_WIDTH].forEach((side) => {
        // Rails running along X-axis (front/back edges)
        const xRail = new THREE.Mesh(
          new THREE.BoxGeometry(GRID_SIZE * TILE_WIDTH + 0.1, 0.04, 0.04),
          railMat,
        );
        xRail.position.set(0, TILE_HEIGHT / 2 + ry + 0.2, side);
        scene.add(xRail);

        // Rails running along Z-axis (left/right edges)
        const zRail = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.04, GRID_SIZE * TILE_WIDTH + 0.1),
          railMat,
        );
        zRail.position.set(side, TILE_HEIGHT / 2 + ry + 0.2, 0);
        scene.add(zRail);
      });
    });
  }

  // ==========================================================================
  // BORDER
  // ==========================================================================

  /**
   * Add a green border slab beneath the tile grid.
   * 
   * Slightly larger than the grid (0.6 units padding) and positioned
   * just below the tiles so edges peek out around the garden perimeter.
   */
  private static addBorder(scene: THREE.Scene): void {
    const borderGeometry = new THREE.BoxGeometry(
      GRID_SIZE * TILE_WIDTH + 0.6,
      TILE_HEIGHT * 0.5,
      GRID_SIZE * TILE_WIDTH + 0.6,
    );
    const borderMaterial = new THREE.MeshLambertMaterial({ color: BORDER_COLOR });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);

    // Sit just below the tile surface
    border.position.set(0, -TILE_HEIGHT * 0.3, 0);
    scene.add(border);
  }

  // ==========================================================================
  // ANIMATION UPDATES
  // ==========================================================================

  /**
   * Update lantern light flicker effect each frame.
   * 
   * Traverses the object layer looking for lantern point lights and
   * applies a sine-wave intensity modulation for a candle-like effect.
   * 
   * Must be called from the animation loop with the current elapsed time.
   * 
   * @param objectLayer - The Three.js group containing placed objects
   * @param elapsed - Total elapsed time in seconds (from Clock.getElapsedTime())
   */
  static updateLanternFlicker(objectLayer: THREE.Group, elapsed: number): void {
    objectLayer.traverse((node) => {
      // Only flicker point lights explicitly tagged as lantern lights
      if (
        node instanceof THREE.PointLight &&
        node.userData.isLanternLight
      ) {
        // Dual-frequency sine wave for organic candle flicker
        // Matches GardenV2.jsx: base 2.9, slow wobble ±0.42, fast flicker ±0.18
        node.intensity =
          2.9 +
          Math.sin(elapsed * 5.3 + node.id * 0.7) * 0.42 +
          Math.sin(elapsed * 11.1 + node.id) * 0.18;
      }
    });
  }
}
