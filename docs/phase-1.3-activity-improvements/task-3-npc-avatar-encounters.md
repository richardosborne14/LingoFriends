# Task: NPC Avatar Encounters in Lessons

**Status:** Not Started  
**Phase:** Post-1.2 (Lesson Experience)  
**Dependencies:** Task 1.1.14 (Three.js Garden Renderer), Task 1.1.18 (Avatar Customization), TTS Auto-Play Task  
**Estimated Time:** 10–14 hours  
**Priority:** High — this is what transforms lessons from exercises into adventures

---

## Vision

When the learner enters a lesson step, they don't just see a question on a white screen. They see their **own avatar face-to-face with a randomly generated NPC character** — like meeting someone in an RPG who speaks the target language. The NPC "speaks" the chunk (via TTS), their mouth moves, both characters have idle animations (blinking, breathing, subtle head movement), and the encounter feels alive.

Each lesson step spawns a **new random NPC** — different appearance, like meeting different people in a village. The **final step** of every lesson is a "boss encounter" with a visually distinct, slightly larger NPC with special effects (crown, glow, dramatic entrance).

The child never thinks "I'm doing a language exercise." They think "I'm meeting characters and learning what they're saying."

---

## Objectives

1. **NPC Generator** — Randomly generate NPC avatars with varied gender, skin tone, hair colour, clothing, and hat for each lesson step
2. **Encounter Scene** — A Three.js rendered scene showing the user's avatar and NPC facing each other at a diagonal angle, like an RPG conversation
3. **Idle Animations** — Both avatars blink, breathe (subtle body bob), and have slight head/limb movement
4. **Mouth Animation** — NPC's mouth opens and closes in sync with TTS audio playback (basic amplitude-driven, not phoneme-level)
5. **Final Boss** — The last step of every lesson spawns a visually distinct "boss" NPC with crown, larger size, gold tint, and dramatic entrance animation
6. **Seamless Integration** — The encounter scene renders ABOVE the activity UI, using the upper portion of the lesson screen

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Lesson Screen Layout                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              EncounterScene (Three.js)                 │   │
│  │                                                       │   │
│  │     👤 User Avatar    ←─ diagonal ─→    👤 NPC       │   │
│  │     (from profile)       facing         (random)      │   │
│  │                                                       │   │
│  │     Both: idle animations (blink, breathe, sway)      │   │
│  │     NPC: mouth sync during TTS playback               │   │
│  │                                                       │   │
│  │     Background: soft gradient, subtle particles       │   │
│  │     Boss: crown, glow, larger, dramatic entrance      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Activity UI (existing React components)     │   │
│  │                                                       │   │
│  │  🦉 Tutor bubble + Activity (MC / FB / WA / etc.)    │   │
│  │  🔈 Audio replay button                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1 — NPC Generator Service

**File:** `src/services/npcGenerator.ts` (NEW)

Generates random NPC configurations. Uses the same `AvatarOptions` type from `src/renderer/types.ts` that the garden avatar uses.

```typescript
// src/services/npcGenerator.ts

import type { AvatarOptions, HatStyle } from '../renderer/types';

/**
 * NPC personality/role — affects visual style and encounter flavour.
 * The NPC's role is cosmetic; it doesn't affect the lesson content.
 */
export type NPCRole =
  | 'villager'    // Normal NPC, varied appearance
  | 'merchant'    // Slightly fancier clothes
  | 'scholar'     // Glasses (if we add them), books
  | 'adventurer'  // Cap/hat, bold colours
  | 'boss';       // Final step — crown, gold, larger

export interface NPCConfig {
  /** Avatar visual options (same type as user avatar) */
  avatar: AvatarOptions;
  /** NPC role for encounter style */
  role: NPCRole;
  /** Scale multiplier (1.0 = normal, 1.3 = boss) */
  scale: number;
  /** Whether this NPC has a glow effect */
  hasGlow: boolean;
  /** Glow colour (hex) if hasGlow is true */
  glowColor?: number;
  /** Entrance animation style */
  entrance: 'fade' | 'slide_left' | 'slide_right' | 'drop' | 'boss_dramatic';
  /** Unique seed for reproducibility (so replaying the lesson gives the same NPC) */
  seed: number;
}

// ── Randomisation pools ──────────────────────────────────────────

const SKIN_TONES = [
  0xF4C7AB,  // Light
  0xE8B896,  // Medium-light
  0xD4956B,  // Medium
  0xB87A4B,  // Medium-dark
  0x8B5E3C,  // Dark
  0xFCE4C7,  // Very light
  0xC68642,  // Warm brown
];

const HAIR_COLORS = [
  0x4A3728,  // Dark brown
  0x8B4513,  // Light brown
  0xD4A574,  // Blonde
  0xFF6B35,  // Auburn
  0x1C1C1C,  // Black
  0x6B4C9A,  // Purple (fun!)
  0xFF69B4,  // Pink (fun!)
  0x2E8B57,  // Green (fun!)
  0x4169E1,  // Blue (fun!)
];

const SHIRT_COLORS = [
  0x5B9BD5,  // Blue
  0xFF6B6B,  // Red
  0x4CAF50,  // Green
  0xFFA726,  // Orange
  0x9C27B0,  // Purple
  0xFF69B4,  // Pink
  0x00BCD4,  // Teal
  0xFFEB3B,  // Yellow
  0xE91E63,  // Magenta
  0x3F51B5,  // Indigo
];

const TROUSER_COLORS = [
  0x3A5A8C,  // Dark blue
  0x5D4037,  // Brown
  0x37474F,  // Dark grey
  0x1B5E20,  // Dark green
  0x4A148C,  // Dark purple
  0x263238,  // Navy
  0x8B0000,  // Dark red
];

const HATS: HatStyle[] = ['none', 'none', 'none', 'cap', 'tophat', 'beanie', 'flower-crown'];
// 'none' has higher probability — most NPCs don't wear hats

const HAT_COLORS = [
  0xFF0000, 0x00FF00, 0x0000FF, 0xFFD700,
  0xFF69B4, 0x9C27B0, 0x00BCD4, 0xFF5722,
];

const ENTRANCES: NPCConfig['entrance'][] = [
  'fade', 'slide_left', 'slide_right', 'drop',
];

// ── Seeded random ──────────────────────────────────────────────

/**
 * Simple seeded PRNG (mulberry32).
 * Gives consistent results for the same seed,
 * so replaying a lesson shows the same NPCs.
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Generate a random NPC for a lesson step.
 *
 * @param stepIndex - Current step index (0-based)
 * @param totalSteps - Total steps in the lesson
 * @param lessonSeed - Seed derived from lesson ID for reproducibility
 * @returns NPCConfig with all visual and behavioural properties
 */
export function generateNPC(
  stepIndex: number,
  totalSteps: number,
  lessonSeed: number,
): NPCConfig {
  // Combine lesson seed with step index for unique-per-step results
  const rand = seededRandom(lessonSeed + stepIndex * 7919);

  const isFinalStep = stepIndex === totalSteps - 1;

  // Boss NPC for final step
  if (isFinalStep) {
    return generateBossNPC(rand);
  }

  // Normal NPC
  const gender: 'boy' | 'girl' = rand() > 0.5 ? 'boy' : 'girl';
  const hat = pick(HATS, rand);

  return {
    avatar: {
      gender,
      skinTone: pick(SKIN_TONES, rand),
      hairColor: pick(HAIR_COLORS, rand),
      shirtColor: pick(SHIRT_COLORS, rand),
      pantsColor: pick(TROUSER_COLORS, rand),
      hat,
      hatColor: hat !== 'none' ? pick(HAT_COLORS, rand) : 0,
    },
    role: 'villager',
    scale: 1.0,
    hasGlow: false,
    entrance: pick(ENTRANCES, rand),
    seed: lessonSeed + stepIndex,
  };
}

/**
 * Generate a "boss" NPC for the final lesson step.
 * Visually distinct: crown, gold tint, larger, dramatic entrance.
 */
function generateBossNPC(rand: () => number): NPCConfig {
  const gender: 'boy' | 'girl' = rand() > 0.5 ? 'boy' : 'girl';

  return {
    avatar: {
      gender,
      skinTone: pick(SKIN_TONES, rand),
      hairColor: pick(HAIR_COLORS, rand),
      // Boss has gold-tinted clothing
      shirtColor: 0xFFD700, // Gold shirt
      pantsColor: 0x8B6914, // Dark gold trousers
      hat: 'flower-crown',  // Crown for the boss — uses flower-crown as base
      hatColor: 0xFFD700,   // Gold crown
    },
    role: 'boss',
    scale: 1.3,            // 30% larger than normal NPCs
    hasGlow: true,
    glowColor: 0xFFD700,   // Gold glow
    entrance: 'boss_dramatic',
    seed: 0,
  };
}

/**
 * Generate a deterministic seed from a lesson ID string.
 */
export function lessonIdToSeed(lessonId: string): number {
  let hash = 0;
  for (let i = 0; i < lessonId.length; i++) {
    const char = lessonId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

---

### Step 2 — Encounter Scene Renderer

**File:** `src/renderer/EncounterScene.ts` (NEW)

A self-contained Three.js scene that renders two avatars facing each other. This is separate from the garden renderer — it's a small, focused scene for the lesson UI.

```typescript
// src/renderer/EncounterScene.ts

import * as THREE from 'three';
import { buildAvatar } from './AvatarBuilder';
import type { AvatarOptions } from './types';
import type { NPCConfig } from '../services/npcGenerator';

// ── Constants ──────────────────────────────────────────────────

/** Scene dimensions — the canvas is a banner at the top of the lesson */
const SCENE_ASPECT = 16 / 9;

/** Camera settings for a close-up portrait shot */
const CAMERA_FOV = 35;
const CAMERA_Y = 1.1;     // Eye level
const CAMERA_Z = 3.5;     // Distance from subjects

/** Avatar positions — facing each other at a diagonal */
const USER_POSITION = new THREE.Vector3(-0.6, 0, 0.3);
const NPC_POSITION = new THREE.Vector3(0.6, 0, -0.3);

/** User faces right (toward NPC), NPC faces left (toward user) */
const USER_ROTATION_Y = Math.PI * 0.25;   // 45° right
const NPC_ROTATION_Y = Math.PI * -0.75;   // 135° left (facing user)

// ── Animation Constants ────────────────────────────────────────

/** Blink timing */
const BLINK_INTERVAL_MIN = 2000;  // Min ms between blinks
const BLINK_INTERVAL_MAX = 5000;  // Max ms between blinks
const BLINK_DURATION = 150;       // ms — how long eyes stay closed

/** Breathing — subtle body bob */
const BREATH_SPEED = 1.5;         // Cycles per second
const BREATH_AMPLITUDE = 0.01;    // Vertical displacement

/** Head sway — gentle, living movement */
const SWAY_SPEED = 0.4;           // Cycles per second
const SWAY_AMPLITUDE = 0.03;      // Horizontal displacement
const SWAY_TILT = 0.02;           // Rotation in radians

/** Mouth animation — driven by audio amplitude */
const MOUTH_OPEN_SCALE_Y = 2.5;   // How much the mouth opens
const MOUTH_SMOOTHING = 0.15;     // Lerp factor for smooth mouth movement

// ── Types ──────────────────────────────────────────────────────

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

// ── Main Class ─────────────────────────────────────────────────

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
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private userGroup: THREE.Group;
  private npcGroup: THREE.Group;

  // References to animated parts
  private userEyeLeft: THREE.Mesh | null = null;
  private userEyeRight: THREE.Mesh | null = null;
  private npcEyeLeft: THREE.Mesh | null = null;
  private npcEyeRight: THREE.Mesh | null = null;
  private npcMouth: THREE.Mesh | null = null;

  // Glow effect for boss NPCs
  private glowMesh: THREE.Mesh | null = null;

  // Animation state
  private animationId: number = 0;
  private clock = new THREE.Clock();
  private userNextBlink = 0;
  private npcNextBlink = 0;
  private userBlinking = false;
  private npcBlinking = false;
  private blinkStartTime = 0;

  // Mouth animation state (driven externally by audio)
  private targetMouthOpenness = 0;
  private currentMouthOpenness = 0;
  private originalMouthScaleY = 1;

  // Entrance animation state
  private entranceProgress = 0;
  private entranceType: NPCConfig['entrance'];
  private entranceDuration = 800; // ms

  // NPC config for reference
  private npcConfig: NPCConfig;

  constructor(options: EncounterSceneOptions) {
    const { userAvatar, npc, canvas, width, height } = options;
    this.npcConfig = npc;
    this.entranceType = npc.entrance;

    // ── Renderer setup ──
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,  // Transparent background — blends with CSS gradient
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
    this.camera.lookAt(0, CAMERA_Y - 0.1, 0); // Slightly below eye level for a natural feel

    // ── Lighting ──
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
    // NPC starts off-screen for entrance animation
    this.setupEntranceStart();

    // ── Set initial blink timers ──
    this.userNextBlink = this.randomBlinkDelay();
    this.npcNextBlink = this.randomBlinkDelay();
  }

  /**
   * Find eye and mouth meshes in an avatar group.
   * The AvatarBuilder creates these as child meshes with specific names or positions.
   *
   * IMPORTANT: The current AvatarBuilder doesn't name meshes.
   * Cline should add `mesh.name = 'eye_left'` etc. in AvatarBuilder.ts
   * OR find them by position/material colour:
   * - Eyes: small white spheres near top of head
   * - Mouth: small dark mesh below eyes
   */
  private findAnimatableParts(group: THREE.Group, owner: 'user' | 'npc'): void {
    // Traverse the group and find parts by name
    // If names aren't set, fall back to geometry/position heuristics
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

  // ── Animation Loop ──────────────────────────────────────────

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
    if (this.entranceProgress < 1) {
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
      this.glowMesh.material.opacity = 0.2 + Math.sin(elapsed * 2) * 0.1;
      this.glowMesh.rotation.z = elapsed * 0.5; // Slow rotation
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Update entrance animation.
   */
  private updateEntrance(delta: number): void {
    this.entranceProgress = Math.min(1, this.entranceProgress + delta / (this.entranceDuration / 1000));
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
    if (this.entranceProgress >= 1) {
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
    if (this.entranceProgress >= 1) {
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

  // ── Public API ──────────────────────────────────────────────

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

  // ── Helpers ──────────────────────────────────────────────────

  private randomBlinkDelay(): number {
    return BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN);
  }

  /** Ease out with slight overshoot — nice for entrances */
  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
```

---

### Step 3 — React Wrapper Component

**File:** `src/components/lesson/EncounterView.tsx` (NEW)

React component that wraps the Three.js encounter scene and wires it to the lesson state.

```typescript
// src/components/lesson/EncounterView.tsx

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { EncounterScene } from '../../renderer/EncounterScene';
import { generateNPC, lessonIdToSeed, type NPCConfig } from '../../services/npcGenerator';
import type { AvatarOptions } from '../../renderer/types';
import { DEFAULT_AVATAR } from '../../renderer/types';

interface EncounterViewProps {
  /** User's avatar options from their profile */
  userAvatar?: AvatarOptions;
  /** Current lesson step index */
  stepIndex: number;
  /** Total steps in the lesson */
  totalSteps: number;
  /** Lesson ID for deterministic NPC generation */
  lessonId: string;
  /** Whether audio is currently playing (drives mouth animation) */
  isAudioPlaying: boolean;
  /** Height of the encounter scene in pixels */
  height?: number;
}

/**
 * EncounterView — renders the RPG-style avatar encounter at the top of the lesson.
 *
 * Each step generates a new NPC. The final step is a "boss" encounter.
 * Mouth animation is driven by the `isAudioPlaying` prop.
 *
 * For mouth sync: When audio is playing, we use a simple oscillation
 * to approximate mouth movement. For more accurate sync, we'd need
 * an AudioAnalyser feeding amplitude values.
 */
export const EncounterView: React.FC<EncounterViewProps> = ({
  userAvatar = DEFAULT_AVATAR,
  stepIndex,
  totalSteps,
  lessonId,
  isAudioPlaying,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EncounterScene | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate NPC config for current step (memoized so it doesn't flicker)
  const npcConfig = useMemo(() => {
    const seed = lessonIdToSeed(lessonId);
    return generateNPC(stepIndex, totalSteps, seed);
  }, [stepIndex, totalSteps, lessonId]);

  // ── Scene lifecycle ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;

    // Dispose previous scene
    sceneRef.current?.dispose();

    // Create new scene for this step's NPC
    const scene = new EncounterScene({
      userAvatar,
      npc: npcConfig,
      canvas,
      width,
      height,
    });

    scene.start();
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [npcConfig, userAvatar, height]);

  // ── Mouth animation driven by audio state ──
  useEffect(() => {
    if (!sceneRef.current) return;

    if (!isAudioPlaying) {
      sceneRef.current.setMouthOpenness(0);
      return;
    }

    // Simulate mouth movement with oscillation while audio plays.
    // A more advanced approach would use Web Audio API's AnalyserNode
    // to get real amplitude data. This is a good v1.
    let animFrame: number;
    const startTime = Date.now();

    const animateMouth = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      // Oscillate between 0.1 and 0.8 at ~6Hz (natural speech rate)
      const openness = 0.1 + Math.abs(Math.sin(elapsed * Math.PI * 6)) * 0.7;
      // Add some randomness for natural feel
      const jitter = (Math.random() - 0.5) * 0.15;
      sceneRef.current?.setMouthOpenness(Math.max(0, Math.min(1, openness + jitter)));
      animFrame = requestAnimationFrame(animateMouth);
    };

    animateMouth();

    return () => {
      cancelAnimationFrame(animFrame);
      sceneRef.current?.setMouthOpenness(0);
    };
  }, [isAudioPlaying]);

  // ── Resize handler ──
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !sceneRef.current) return;
      sceneRef.current.resize(container.clientWidth, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  // Boss encounter has a gradient background
  const isBoss = npcConfig.role === 'boss';

  return (
    <div
      ref={containerRef}
      className={`w-full relative overflow-hidden rounded-b-2xl ${
        isBoss
          ? 'bg-gradient-to-b from-amber-100 via-yellow-50 to-transparent'
          : 'bg-gradient-to-b from-sky-100 via-blue-50 to-transparent'
      }`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Boss label */}
      {isBoss && (
        <div className="absolute top-2 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-bounce">
          ⭐ Final Challenge!
        </div>
      )}
    </div>
  );
};
```

---

### Step 4 — Wire into LessonView

**File:** `src/components/lesson/LessonView.tsx` (MODIFY)

Add the encounter scene above the activity area:

```tsx
// Add import:
import { EncounterView } from './EncounterView';

// In the render section, BEFORE the main content area:

return (
  <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50">
    {/* ... existing overlay animations ... */}

    {/* Header bar (existing) */}
    {/* ... */}

    {/* NEW: Encounter scene — NPC avatar facing user avatar */}
    {!state.isComplete && (
      <EncounterView
        userAvatar={userAvatarOptions}  // From user profile or context
        stepIndex={state.currentStepIndex}
        totalSteps={lesson.steps.length}
        lessonId={lesson.id}
        isAudioPlaying={isAudioPlaying}
        height={180}
      />
    )}

    {/* Main content area (existing) */}
    <main className="p-6 max-w-lg mx-auto">
      {/* ... tutor bubble, activity, audio button ... */}
    </main>
  </div>
);
```

**Note on `userAvatarOptions`:** The user's avatar options need to be passed through from wherever they're stored. If the user has customized their avatar (Task 1.1.18), pull from PocketBase/profile state. If not, use `DEFAULT_AVATAR` from `src/renderer/types.ts`.

---

### Step 5 — Required AvatarBuilder Modifications

**File:** `src/renderer/AvatarBuilder.ts` (MODIFY)

The current AvatarBuilder creates meshes without names. Add names to key meshes so the EncounterScene can find them for animation:

```typescript
// In buildAvatar(), when creating the eye meshes, add names:

// ===== EYES =====
const eyeGeometry = new THREE.SphereGeometry(0.045, 8, 8);

const eyeLeft = new THREE.Mesh(eyeGeometry, whiteMaterial);
eyeLeft.name = 'eye_left';  // ADD THIS
eyeLeft.position.set(-0.08, TH / 2 + 0.9, 0.2);
group.add(eyeLeft);

const eyeRight = new THREE.Mesh(eyeGeometry, whiteMaterial);
eyeRight.name = 'eye_right';  // ADD THIS
eyeRight.position.set(0.08, TH / 2 + 0.9, 0.2);
group.add(eyeRight);

// Pupils
const pupilGeometry = new THREE.SphereGeometry(0.025, 8, 8);
const pupilLeft = new THREE.Mesh(pupilGeometry, blackMaterial);
pupilLeft.position.set(-0.08, TH / 2 + 0.9, 0.23);
group.add(pupilLeft);

const pupilRight = new THREE.Mesh(pupilGeometry, blackMaterial);
pupilRight.position.set(0.08, TH / 2 + 0.9, 0.23);
group.add(pupilRight);

// ===== MOUTH =====
const mouthGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.02);
const mouthMaterial = new THREE.MeshToonMaterial({ color: 0xCC4444 });
const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
mouth.name = 'mouth';  // ADD THIS
mouth.position.set(0, TH / 2 + 0.78, 0.22);
group.add(mouth);
```

**IMPORTANT:** Check the existing AvatarBuilder code carefully. If it already creates eyes and mouth meshes, just add `.name` properties. If it doesn't create a mouth mesh, add one.

---

### Step 6 — Audio-Driven Mouth Sync (Advanced, Optional Enhancement)

For a more accurate mouth sync (v2 improvement), use the Web Audio API's AnalyserNode to get real amplitude data from the TTS audio:

**File:** `src/hooks/useAudioAmplitude.ts` (NEW, OPTIONAL)

```typescript
// src/hooks/useAudioAmplitude.ts

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook that provides real-time audio amplitude from an AudioContext.
 * Used to drive mouth animation with actual audio volume.
 *
 * OPTIONAL ENHANCEMENT: The EncounterView works fine with the
 * simple oscillation approach. This is for polish if time allows.
 */
export function useAudioAmplitude(): {
  amplitude: number;
  connectAudio: (audioElement: HTMLAudioElement) => void;
  disconnect: () => void;
} {
  const [amplitude, setAmplitude] = useState(0);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  const connectAudio = useCallback((audioElement: HTMLAudioElement) => {
    // Create or reuse AudioContext
    if (!contextRef.current) {
      contextRef.current = new AudioContext();
    }
    const ctx = contextRef.current;

    // Create analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    analyserRef.current = analyser;

    // Connect audio element to analyser
    const source = ctx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    sourceRef.current = source;

    // Start reading amplitude
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const readAmplitude = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setAmplitude(Math.min(1, rms * 3)); // Scale up for visibility
      rafRef.current = requestAnimationFrame(readAmplitude);
    };
    readAmplitude();
  }, []);

  const disconnect = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    setAmplitude(0);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
    };
  }, []);

  return { amplitude, connectAudio, disconnect };
}
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/npcGenerator.ts` | **CREATE** | Random NPC generation with seeded PRNG |
| `src/renderer/EncounterScene.ts` | **CREATE** | Three.js scene for avatar encounters |
| `src/components/lesson/EncounterView.tsx` | **CREATE** | React wrapper for encounter scene |
| `src/renderer/AvatarBuilder.ts` | **MODIFY** | Add `.name` to eye/mouth meshes |
| `src/components/lesson/LessonView.tsx` | **MODIFY** | Add EncounterView above activity area |
| `src/hooks/useAudioAmplitude.ts` | **CREATE** (optional) | Real audio amplitude for mouth sync |

---

## Testing Checklist

### NPC Generator
- [ ] `generateNPC(0, 7, 12345)` returns a valid NPCConfig
- [ ] Same seed + step always produces the same NPC (deterministic)
- [ ] Different steps produce visually different NPCs
- [ ] Final step (index === totalSteps - 1) produces boss NPC
- [ ] Boss NPC has crown, gold colours, scale 1.3, glow enabled

### Encounter Scene
- [ ] Scene renders without errors on a canvas element
- [ ] User avatar appears on the left facing right
- [ ] NPC avatar appears on the right facing left
- [ ] Both avatars are visible at the same time (camera framing)
- [ ] Scene has transparent background (CSS gradient shows through)
- [ ] `dispose()` clears all Three.js resources (no memory leaks)

### Idle Animations
- [ ] Both avatars blink at random intervals
- [ ] Blinks are brief (~150ms) and not synchronised
- [ ] Breathing animation visible (subtle vertical bob)
- [ ] Head sway visible (gentle horizontal tilt)
- [ ] Animations look natural, not robotic

### Mouth Animation
- [ ] NPC mouth moves when `isAudioPlaying` is true
- [ ] Mouth stops when audio stops
- [ ] Movement is smooth (not snapping open/closed)
- [ ] Mouth amplitude varies (not a constant open/close)

### Entrance Animations
- [ ] 'fade' entrance: NPC fades in from transparent
- [ ] 'slide_left' entrance: NPC slides in from left
- [ ] 'slide_right' entrance: NPC slides in from right
- [ ] 'drop' entrance: NPC drops in from above
- [ ] 'boss_dramatic' entrance: NPC scales up with spin and glow

### Boss Encounter
- [ ] Boss NPC is visibly larger than normal NPCs
- [ ] Gold glow ring pulses behind boss NPC
- [ ] "⭐ Final Challenge!" badge appears
- [ ] Background gradient changes to amber/gold
- [ ] Boss entrance animation is dramatic (spin + scale)

### Performance
- [ ] Scene runs at 60fps on mobile
- [ ] Step changes don't cause frame drops
- [ ] No memory leaks when switching between steps rapidly

---

## Visual Reference

The encounter scene should feel like this kind of RPG dialogue moment:

```
    ┌─────────────────────────────────────────┐
    │          soft sky-blue gradient          │
    │                                         │
    │    👤          ← gap →         👤       │
    │  [user]                      [NPC]      │
    │  facing →                    ← facing   │
    │  (idle)         at           (talking)   │
    │  (blinks)     diagonal       (mouth      │
    │  (sways)      angle           moves)    │
    │                                         │
    └─────────────────────────────────────────┘
    ┌─────────────────────────────────────────┐
    │  🦉 "This character says: Bonjour!"     │
    │                                         │
    │  [Activity UI below]                    │
    └─────────────────────────────────────────┘
```

---

## Notes for Cline

- The `AvatarBuilder.ts` modification is CRITICAL. Without named meshes, the EncounterScene can't find eyes/mouth. Do this first.
- Three.js should already be installed from the garden renderer (Task 1.1.14). Do NOT install it again.
- The encounter canvas should be `alpha: true` so the CSS gradient behind it shows through. This avoids needing a 3D background.
- The height of the encounter view (180px default) should look good on both mobile and desktop. Test on mobile — if it feels cramped, allow it to be shorter (140px) on small screens.
- The boss `flower-crown` hat style is being repurposed as a crown. If the visual doesn't look "boss-like" enough, consider adding a simple crown mesh (3 triangles on a band) as a new hat style in AvatarBuilder.
- Keep the NPC generation deterministic (seeded PRNG). This means replaying a lesson shows the same NPCs — important for consistency and debugging.
- The mouth sync v1 (oscillation) is totally fine for launch. The audio amplitude approach (v2) is a nice-to-have polish item.
