/**
 * LingoFriends - Encounter Scene Renderer
 *
 * A self-contained Three.js scene for NPC encounters in lessons.
 * Renders two avatars facing each other with idle animations.
 *
 * Features:
 * - User avatar (left) facing NPC avatar (right)
 * - Idle animations: blink, breathe, head sway
 * - NPC mouth animation driven by audio state
 * - Boss NPCs with glow effect and larger scale
 * - Entrance animations (fade, slide, drop, boss_dramatic)
 * - Transparent background (CSS gradient shows through)
 *
 * @module renderer/EncounterScene
 * @see docs/phase-1.3-activity-improvements/task-3-npc-avatar-encounters.md
 */

import * as THREE from 'three';
import { buildAvatar } from './AvatarBuilder';
import type { AvatarOptions } from './types';
import type { NPCConfig } from '../services/npcGenerator';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Camera field of view for portrait shot */
const CAMERA_FOV = 35;

/** Camera Y position (eye level) */
const CAMERA_Y = 1.1;

/** Camera Z position (distance from subjects) */
const CAMERA_Z = 3.5;

/** User avatar position (left side) */
const USER_POSITION = new THREE.Vector3(-0.6, 0, 0.3);

/** NPC avatar position (right side) */
const NPC_POSITION = new THREE.Vector3(0.6, 0, -0.3);

/** User rotation (facing camera-right, toward NPC) */
const USER_ROTATION_Y = Math.PI * 0.25;    // 45° (facing diagonally toward camera and right)

/** NPC rotation (facing camera-left, toward user) */
const NPC_ROTATION_Y = -Math.PI * 0.25;    // -45° (facing diagonally toward camera and left)

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

/** Minimum ms between blinks */
const BLINK_INTERVAL_MIN = 2000;

/** Maximum ms between blinks */
const BLINK_INTERVAL_MAX = 5000;

/** How long eyes stay closed during blink (ms) */
const BLINK_DURATION = 150;

/** Breathing animation speed (cycles per second) */
const BREATH_SPEED = 1.5;

/** Breathing animation amplitude (vertical displacement) */
const BREATH_AMPLITUDE = 0.01;

/** Head sway speed (cycles per second) */
const SWAY_SPEED = 0.4;

/** Head sway amplitude (horizontal displacement) */
const SWAY_AMPLITUDE = 0.03;

/** Head sway tilt (rotation in radians) */
const SWAY_TILT = 0.02;

/** How much the mouth opens (scale multiplier) */
const MOUTH_OPEN_SCALE_Y = 2.5;

/** Smoothing factor for mouth animation */
const MOUTH_SMOOTHING = 0.15;

/** Duration of entrance animations (ms) */
const ENTRANCE_DURATION = 800;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for creating an EncounterScene.
 */
export interface EncounterSceneOptions {
  /** User's avatar options (from their profile) */
  userAvatar: AvatarOptions;
  /** NPC configuration (from npcGenerator) */
  npc: NPCConfig;
  /** Canvas element to render into */
  canvas: HTMLCanvasElement;
  /** Width of the canvas */
  width: number;
  /** Height of the canvas */
  height: number;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * EncounterScene — renders two avatars facing each other in a portrait scene.
 *
 * Features:
 * - User avatar (left) faces NPC avatar (right) at diagonal
 * - Both have idle animations: blink, breathe, sway
 * - NPC has mouth animation driven by audio amplitude
 * - Boss NPCs have glow effect and larger scale
 * - Entrance animations when NPC appears
 *
 * Usage:
 * ```ts
 * const scene = new EncounterScene({ userAvatar, npc, canvas, width, height });
 * scene.start();
 * scene.setMouthOpenness(0.5); // During TTS playback
 * scene.dispose(); // On unmount
 * ```
 */
export class EncounterScene {
  // ── Three.js Core ──────────────────────────────────────────────
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // ── Avatar Groups ──────────────────────────────────────────────
  private userGroup: THREE.Group;
  private npcGroup: THREE.Group;

  // ── Animated Parts ─────────────────────────────────────────────
  private userEyeLeft: THREE.Mesh | null = null;
  private userEyeRight: THREE.Mesh | null = null;
  private npcEyeLeft: THREE.Mesh | null = null;
  private npcEyeRight: THREE.Mesh | null = null;
  private npcMouth: THREE.Mesh | null = null;

  // ── Boss Glow Effect ───────────────────────────────────────────
  private glowMesh: THREE.Mesh | null = null;

  // ── Animation State ────────────────────────────────────────────
  private animationId: number = 0;
  private clock = new THREE.Clock();
  private userNextBlink = 0;
  private npcNextBlink = 0;
  private userBlinking = false;
  private npcBlinking = false;
  private blinkStartTime = 0;

  // ── Mouth Animation State ──────────────────────────────────────
  private targetMouthOpenness = 0;
  private currentMouthOpenness = 0;
  private originalMouthScaleY = 1;

  // ── Entrance Animation State ───────────────────────────────────
  private entranceProgress = 0;
  private entranceType: NPCConfig['entrance'];
  private entranceComplete = false;

  // ── NPC Config Reference ───────────────────────────────────────
  private npcConfig: NPCConfig;

  // ===========================================================================
  // CONSTRUCTOR
  // ===========================================================================

  constructor(options: EncounterSceneOptions) {
    const { userAvatar, npc, canvas, width, height } = options;
    this.npcConfig = npc;
    this.entranceType = npc.entrance;

    // ── Renderer setup ──
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,  // Transparent background — CSS gradient shows through
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ── Scene ──
    this.scene = new THREE.Scene();
    // No background — transparent, CSS gradient shows through

    // ── Camera ──
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      width / height,
      0.1,
      50,
    );
    this.camera.position.set(0, CAMERA_Y, CAMERA_Z);
    this.camera.lookAt(0, CAMERA_Y - 0.1, 0); // Slightly below eye level

    // ── Lighting ──
    this.setupLighting();

    // ── Build avatars ──
    this.userGroup = buildAvatar(userAvatar);
    this.npcGroup = buildAvatar(npc.avatar);

    // Position and rotate
    this.userGroup.position.copy(USER_POSITION);
    this.userGroup.rotation.y = USER_ROTATION_Y;

    this.npcGroup.position.copy(NPC_POSITION);
    this.npcGroup.rotation.y = NPC_ROTATION_Y;

    // Scale boss NPCs
    if (npc.scale !== 1.0) {
      this.npcGroup.scale.setScalar(npc.scale);
    }

    // ── Find animated parts ──
    this.findAnimatableParts(this.userGroup, 'user');
    this.findAnimatableParts(this.npcGroup, 'npc');

    // ── Boss glow effect ──
    if (npc.hasGlow && npc.glowColor) {
      this.createGlowEffect(npc.glowColor);
    }

    // ── Add to scene ──
    this.scene.add(this.userGroup);
    this.scene.add(this.npcGroup);

    // ── Initial entrance state ──
    this.setupEntranceStart();

    // ── Set initial blink timers ──
    this.userNextBlink = this.randomBlinkDelay();
    this.npcNextBlink = this.randomBlinkDelay();
  }

  // ===========================================================================
  // SETUP METHODS
  // ===========================================================================

  /**
   * Set up the scene lighting.
   * Uses a combination of ambient, key, and fill lights for a natural look.
   */
  private setupLighting(): void {
    // Soft ambient so both avatars are evenly lit
    const ambient = new THREE.AmbientLight(0xFFFFFF, 0.7);
    this.scene.add(ambient);

    // Key light from above-right — gives dimension
    const keyLight = new THREE.DirectionalLight(0xFFF5E1, 0.8);
    keyLight.position.set(2, 3, 2);
    this.scene.add(keyLight);

    // Fill light from left — prevents harsh shadows on user avatar
    const fillLight = new THREE.DirectionalLight(0xE1F0FF, 0.3);
    fillLight.position.set(-2, 2, 1);
    this.scene.add(fillLight);
  }

  /**
   * Find eye and mouth meshes in an avatar group.
   * The AvatarBuilder creates these with specific names.
   */
  private findAnimatableParts(group: THREE.Group, owner: 'user' | 'npc'): void {
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const name = child.name.toLowerCase();

      if (name === 'eye_left' || name === 'eyeleft') {
        if (owner === 'user') this.userEyeLeft = child;
        else this.npcEyeLeft = child;
      }
      if (name === 'eye_right' || name === 'eyeright') {
        if (owner === 'user') this.userEyeRight = child;
        else this.npcEyeRight = child;
      }
      if (name === 'mouth') {
        if (owner === 'npc') {
          this.npcMouth = child;
          this.originalMouthScaleY = child.scale.y;
        }
      }
    });
  }

  /**
   * Create a glow ring effect behind the boss NPC.
   */
  private createGlowEffect(color: number): void {
    const glowGeometry = new THREE.RingGeometry(0.5, 0.8, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.copy(NPC_POSITION);
    this.glowMesh.position.y += 0.8; // Behind head
    this.glowMesh.rotation.y = NPC_ROTATION_Y;
    this.scene.add(this.glowMesh);
  }

  /**
   * Set up the NPC's initial position for entrance animation.
   */
  private setupEntranceStart(): void {
    switch (this.entranceType) {
      case 'slide_left':
        this.npcGroup.position.x = -3; // Off-screen left
        break;
      case 'slide_right':
        this.npcGroup.position.x = 3; // Off-screen right
        break;
      case 'drop':
        this.npcGroup.position.y = 3; // Above screen
        break;
      case 'boss_dramatic':
        this.npcGroup.scale.setScalar(0); // Start invisible, scale up
        this.npcGroup.position.copy(NPC_POSITION); // In place, but tiny
        break;
      case 'fade':
      default:
        // Handled by opacity — set all materials transparent
        this.setGroupOpacity(this.npcGroup, 0);
        break;
    }
  }

  /**
   * Set opacity for all meshes in a group.
   */
  private setGroupOpacity(group: THREE.Group, opacity: number): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshToonMaterial;
        mat.transparent = true;
        mat.opacity = opacity;
      }
    });
  }

  // ===========================================================================
  // ANIMATION LOOP
  // ===========================================================================

  /**
   * Start the animation loop.
   */
  start(): void {
    this.clock.start();
    this.animate();
  }

  /**
   * Main animation loop.
   */
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Entrance animation
    if (!this.entranceComplete) {
      this.updateEntrance(delta);
    }

    // Idle animations
    this.updateBreathing(elapsed);
    this.updateHeadSway(elapsed);
    this.updateBlink(elapsed);

    // Mouth animation (NPC only, driven by audio)
    this.updateMouth();

    // Boss glow pulse
    if (this.glowMesh) {
      (this.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(elapsed * 2) * 0.1;
      this.glowMesh.rotation.z = elapsed * 0.5; // Slow rotation
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Update entrance animation.
   */
  private updateEntrance(delta: number): void {
    this.entranceProgress = Math.min(1, this.entranceProgress + delta / (ENTRANCE_DURATION / 1000));
    const t = this.easeOutBack(this.entranceProgress);

    switch (this.entranceType) {
      case 'slide_left':
      case 'slide_right':
        this.npcGroup.position.x = THREE.MathUtils.lerp(
          this.entranceType === 'slide_left' ? -3 : 3,
          NPC_POSITION.x,
          t,
        );
        break;
      case 'drop':
        this.npcGroup.position.y = THREE.MathUtils.lerp(3, NPC_POSITION.y, t);
        break;
      case 'boss_dramatic':
        // Scale up with overshoot
        const scale = this.npcConfig.scale * t;
        this.npcGroup.scale.setScalar(scale);
        // Rotate in dramatically
        this.npcGroup.rotation.y = NPC_ROTATION_Y + (1 - t) * Math.PI * 2;
        break;
      case 'fade':
      default:
        this.setGroupOpacity(this.npcGroup, t);
        break;
    }

    if (this.entranceProgress >= 1) {
      this.entranceComplete = true;
    }
  }

  /**
   * Subtle breathing animation — body bobs up and down.
   */
  private updateBreathing(elapsed: number): void {
    const breathOffset = Math.sin(elapsed * BREATH_SPEED * Math.PI * 2) * BREATH_AMPLITUDE;
    // Offset NPC breathing slightly so they're not in sync
    const npcBreathOffset = Math.sin((elapsed + 0.5) * BREATH_SPEED * Math.PI * 2) * BREATH_AMPLITUDE;

    this.userGroup.position.y = USER_POSITION.y + breathOffset;
    // Only modify NPC y if entrance is complete
    if (this.entranceComplete) {
      this.npcGroup.position.y = NPC_POSITION.y + npcBreathOffset;
    }
  }

  /**
   * Gentle head sway — makes characters feel alive.
   */
  private updateHeadSway(elapsed: number): void {
    // User sways slowly
    const userSway = Math.sin(elapsed * SWAY_SPEED * Math.PI * 2) * SWAY_AMPLITUDE;
    this.userGroup.rotation.z = userSway * SWAY_TILT;

    // NPC sways at a slightly different rate (so they're not synchronised)
    const npcSway = Math.sin((elapsed + 1.2) * SWAY_SPEED * 0.8 * Math.PI * 2) * SWAY_AMPLITUDE;
    if (this.entranceComplete) {
      this.npcGroup.rotation.z = npcSway * SWAY_TILT;
    }
  }

  /**
   * Blink animation — eyes close briefly at random intervals.
   */
  private updateBlink(elapsed: number): void {
    const now = elapsed * 1000; // Convert to ms

    // User blink
    if (!this.userBlinking && now >= this.userNextBlink) {
      this.userBlinking = true;
      this.blinkStartTime = now;
      this.setEyesClosed(this.userEyeLeft, this.userEyeRight, true);
    }
    if (this.userBlinking && now - this.blinkStartTime > BLINK_DURATION) {
      this.userBlinking = false;
      this.setEyesClosed(this.userEyeLeft, this.userEyeRight, false);
      this.userNextBlink = now + this.randomBlinkDelay();
    }

    // NPC blink (offset timing)
    if (!this.npcBlinking && now >= this.npcNextBlink) {
      this.npcBlinking = true;
      this.blinkStartTime = now;
      this.setEyesClosed(this.npcEyeLeft, this.npcEyeRight, true);
    }
    if (this.npcBlinking && now - this.blinkStartTime > BLINK_DURATION) {
      this.npcBlinking = false;
      this.setEyesClosed(this.npcEyeLeft, this.npcEyeRight, false);
      this.npcNextBlink = now + this.randomBlinkDelay();
    }
  }

  /**
   * Blink by scaling eyes to zero height.
   */
  private setEyesClosed(
    eyeLeft: THREE.Mesh | null,
    eyeRight: THREE.Mesh | null,
    closed: boolean,
  ): void {
    const scaleY = closed ? 0.1 : 1;
    if (eyeLeft) eyeLeft.scale.y = scaleY;
    if (eyeRight) eyeRight.scale.y = scaleY;
  }

  /**
   * Update NPC mouth based on audio amplitude.
   * Smoothly interpolates to target openness.
   */
  private updateMouth(): void {
    if (!this.npcMouth) return;

    // Smooth interpolation toward target
    this.currentMouthOpenness += (this.targetMouthOpenness - this.currentMouthOpenness) * MOUTH_SMOOTHING;

    // Scale the mouth mesh vertically
    this.npcMouth.scale.y = this.originalMouthScaleY + this.currentMouthOpenness * MOUTH_OPEN_SCALE_Y;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Set the NPC's mouth openness.
   * Called externally by the audio system during TTS playback.
   *
   * @param openness - 0 (closed) to 1 (fully open)
   */
  setMouthOpenness(openness: number): void {
    this.targetMouthOpenness = Math.max(0, Math.min(1, openness));
  }

  /**
   * Resize the renderer (e.g., on window resize).
   */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Clean up all resources.
   * MUST be called on component unmount to prevent memory leaks.
   */
  dispose(): void {
    cancelAnimationFrame(this.animationId);

    // Dispose all geometries and materials
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Get a random blink delay within the configured range.
   */
  private randomBlinkDelay(): number {
    return BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN);
  }

  /**
   * Ease out with slight overshoot — nice for entrances.
   */
  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EncounterScene;