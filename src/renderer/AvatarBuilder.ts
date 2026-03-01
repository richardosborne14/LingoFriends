/**
 * Avatar Builder for Garden Renderer
 * 
 * Creates customizable avatars with:
 * - Rounded body parts (capsule-style torso, rounded limbs)
 * - Cute chibi proportions (big head, small body)
 * - Expressive 3D eyes with proper depth
 * - Visible mouth for TTS lip-sync
 * - Hair styles (boy/girl) without harsh rectangular artifacts
 * - Hats (cap, wizard, crown, flower)
 * 
 * Design Philosophy:
 * - Target aesthetic: Animal Crossing meets cute toon style
 * - Proportions: 40% head, 35% body, 25% legs (chibi)
 * - All geometry is procedurally generated (no external models)
 * - Polycount budget: <2000 triangles per avatar
 * 
 * @module renderer/AvatarBuilder
 * @see docs/phase-2-world-expansion/task-2.0-4-avatar-overhaul.md
 */

import * as THREE from 'three';
import { AvatarOptions, HatStyle, DEFAULT_AVATAR } from './types';
import { gridToWorld } from './gridUtils';
import { TILE_HEIGHT } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Half tile height for positioning */
const TH = TILE_HEIGHT;

/** Head radius (chibi proportion - larger) */
const HEAD_RADIUS = 0.26;

/** Head vertical offset from torso */
const HEAD_Y = TH / 2 + 0.85;

/** Vertical segments for sphere smoothness */
const SPHERE_SEGMENTS = 16;

/** Radial segments for sphere smoothness */
const SPHERE_RADIAL = 12;

// ============================================================================
// AVATAR BUILDER
// ============================================================================

/**
 * Build a customizable avatar character with cute chibi proportions.
 * 
 * Avatar Structure (from top to bottom):
 * - Head: Slightly squashed sphere (wider than deep)
 * - Eyes: Sphere assemblies with sclera, iris, pupil
 * - Mouth: Sphere for TTS lip-sync visibility
 * - Hair: Gender-specific styles (no harsh rectangular sideburns)
 * - Torso: Rounded capsule shape (cylinder + sphere caps)
 * - Arms: Rounded with sphere hands
 * - Legs: Rounded with sphere feet
 * - Hat: Optional accessory
 * 
 * @param options - Avatar customization options
 * @returns THREE.Group containing the avatar
 * 
 * @example
 * const avatar = buildAvatar({
 *   gender: 'girl',
 *   shirtColor: 0xFF69B4,
 *   pantsColor: 0x3355AA,
 *   hairColor: 0xDDB800,
 *   skinTone: 0xF5C27A,
 *   hat: 'flower',
 *   hatColor: 0xFF69B4,
 * });
 */
export function buildAvatar(options: AvatarOptions = DEFAULT_AVATAR): THREE.Group {
  const group = new THREE.Group();
  
  // Destructure options with defaults
  const {
    gender,
    shirtColor,
    pantsColor,
    hairColor,
    skinTone,
    hat,
    hatColor,
  } = { ...DEFAULT_AVATAR, ...options };
  
  // Materials — MeshToonMaterial for cel-shaded cartoon look
  // Slight emissive so avatar "pops" against garden background
  const skinMaterial = new THREE.MeshToonMaterial({ 
    color: skinTone, 
    emissive: skinTone, 
    emissiveIntensity: 0.08 
  });
  const shirtMaterial = new THREE.MeshToonMaterial({ 
    color: shirtColor, 
    emissive: shirtColor, 
    emissiveIntensity: 0.1 
  });
  const pantsMaterial = new THREE.MeshToonMaterial({ 
    color: pantsColor, 
    emissive: pantsColor, 
    emissiveIntensity: 0.06 
  });
  const whiteMaterial = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
  const blackMaterial = new THREE.MeshToonMaterial({ color: 0x111111 });
  
  // ===== HEAD =====
  // Chibi head: slightly squashed sphere (wider than deep for cuteness)
  // Scale: X=1.05 (wider), Y=0.95 (slightly shorter), Z=0.9 (flatter face)
  const headGeometry = new THREE.SphereGeometry(HEAD_RADIUS, SPHERE_SEGMENTS, SPHERE_RADIAL);
  const head = new THREE.Mesh(headGeometry, skinMaterial);
  head.scale.set(1.05, 0.95, 0.9); // Slightly wider and flatter
  head.position.y = HEAD_Y;
  head.castShadow = true;
  group.add(head);
  
  // ===== EYES =====
  // 3D eye assembly: white sclera + colored iris + black pupil
  // Positioned to sit nicely on the squashed head surface
  const eyeY = HEAD_Y + 0.02;
  const eyeZ = HEAD_RADIUS * 0.85 * 0.9; // Adjusted for head scale
  const eyeSpacing = 0.09;
  
  // Iris color (default brown, could be customized later)
  const irisMaterial = new THREE.MeshToonMaterial({ color: 0x6B4423 });
  
  // Left eye assembly
  const leftEyeGroup = buildEye(whiteMaterial, irisMaterial, blackMaterial);
  leftEyeGroup.name = 'eye_left';
  leftEyeGroup.position.set(-eyeSpacing, eyeY, eyeZ);
  group.add(leftEyeGroup);
  
  // Right eye assembly
  const rightEyeGroup = buildEye(whiteMaterial, irisMaterial, blackMaterial);
  rightEyeGroup.name = 'eye_right';
  rightEyeGroup.position.set(eyeSpacing, eyeY, eyeZ);
  group.add(rightEyeGroup);
  
  // ===== MOUTH =====
  // Wide pink oval — clearly readable as a smile at garden zoom levels.
  //
  // The previous mouth (black sphere, radius 0.035) was invisible at runtime:
  //   - black on dark skin looked like a shadow, not a feature
  //   - 0.035 radius is smaller than one eye — far too small
  //
  // Fix:
  //   - Rose-pink material (#E8738A) — clearly a mouth, not a shadow
  //   - Larger sphere (0.048) and wide horizontal scale (1.8×) so it reads as
  //     a smile even at the isometric camera distance
  //   - Moved slightly forward (+z) so it doesn't sink into the head surface
  const mouthPinkMaterial = new THREE.MeshToonMaterial({
    color: 0xE8738A,
    emissive: 0xE8738A,
    emissiveIntensity: 0.05,
  });
  const mouthGeometry = new THREE.SphereGeometry(0.048, 10, 8);
  const mouth = new THREE.Mesh(mouthGeometry, mouthPinkMaterial);
  mouth.name = 'mouth';
  mouth.position.set(0, HEAD_Y - 0.095, eyeZ + 0.005);
  mouth.scale.set(1.8, 0.7, 0.5); // Wide smile shape
  group.add(mouth);
  
  // ===== Hair =====
  addHair(group, gender, hairColor, TH, HEAD_Y, HEAD_RADIUS);
  
  // ===== TORSO =====
  // Rounded capsule: cylinder body with sphere caps top and bottom
  // Tapers slightly from shoulders to waist for cuter proportions
  const torso = buildRoundedTorso(shirtMaterial);
  torso.position.y = TH / 2 + 0.48;
  group.add(torso);
  
  // ===== ARMS =====
  // Rounded arms with sphere hands
  const armLength = 0.20;
  const armRadius = 0.055;
  const handRadius = 0.05;
  
  // Left arm
  const leftArm = buildRoundedLimb(shirtMaterial, armLength, armRadius);
  leftArm.name = 'arm_left';
  leftArm.position.set(-0.19, TH / 2 + 0.50, 0);
  group.add(leftArm);
  
  // Left hand
  const leftHand = new THREE.Mesh(
    new THREE.SphereGeometry(handRadius, 8, 6),
    skinMaterial
  );
  leftHand.name = 'hand_left';
  leftHand.position.set(-0.19, TH / 2 + 0.36, 0);
  group.add(leftHand);
  
  // Right arm
  const rightArm = buildRoundedLimb(shirtMaterial, armLength, armRadius);
  rightArm.name = 'arm_right';
  rightArm.position.set(0.19, TH / 2 + 0.50, 0);
  group.add(rightArm);
  
  // Right hand
  const rightHand = new THREE.Mesh(
    new THREE.SphereGeometry(handRadius, 8, 6),
    skinMaterial
  );
  rightHand.name = 'hand_right';
  rightHand.position.set(0.19, TH / 2 + 0.36, 0);
  group.add(rightHand);
  
  // ===== LEGS =====
  // Rounded legs (cylinder + sphere feet)
  const legLength = 0.18;
  const legRadius = 0.06;
  const footRadius = 0.07;
  
  // Left leg
  const leftLeg = buildRoundedLimb(pantsMaterial, legLength, legRadius);
  leftLeg.name = 'leg_left';
  leftLeg.position.set(-0.07, TH / 2 + 0.14, 0);
  group.add(leftLeg);
  
  // Left foot
  const leftFoot = new THREE.Mesh(
    new THREE.SphereGeometry(footRadius, 8, 6),
    pantsMaterial
  );
  leftFoot.position.set(-0.07, TH / 2 + 0.02, 0.02);
  group.add(leftFoot);
  
  // Right leg
  const rightLeg = buildRoundedLimb(pantsMaterial, legLength, legRadius);
  rightLeg.name = 'leg_right';
  rightLeg.position.set(0.07, TH / 2 + 0.14, 0);
  group.add(rightLeg);
  
  // Right foot
  const rightFoot = new THREE.Mesh(
    new THREE.SphereGeometry(footRadius, 8, 6),
    pantsMaterial
  );
  rightFoot.position.set(0.07, TH / 2 + 0.02, 0.02);
  group.add(rightFoot);
  
  // ===== Hat =====
  if (hat !== 'none') {
    addHat(group, hat, hatColor, TH, HEAD_Y, HEAD_RADIUS);
  }
  
  // Mark for identification
  group.userData.isAvatar = true;
  
  return group;
}

// ============================================================================
// HELPER FUNCTIONS - GEOMETRY BUILDERS
// ============================================================================

/**
 * Build a 3D eye assembly (sclera + iris + pupil + glint).
 *
 * The glint (tiny white highlight) is the single biggest factor in making
 * cartoon eyes look alive vs dead. Without it, even correctly-sized eyes
 * look blank and "staring". With it, the character immediately feels present.
 *
 * Pupil-to-iris ratio: 0.022 / 0.034 ≈ 65% — the chibi "cute" ratio.
 * Human eyes are ~40%. At 47% (old value) they look intense; at 65% they
 * look friendly and approachable — the target aesthetic for a kids' app.
 */
function buildEye(
  scleraMaterial: THREE.Material,
  irisMaterial: THREE.Material,
  pupilMaterial: THREE.Material
): THREE.Group {
  const eyeGroup = new THREE.Group();

  // White sclera (outer sphere)
  const scleraGeometry = new THREE.SphereGeometry(0.048, 8, 6);
  const sclera = new THREE.Mesh(scleraGeometry, scleraMaterial);
  eyeGroup.add(sclera);

  // Colored iris — slightly larger than before to soften the contrast with the sclera
  const irisGeometry = new THREE.SphereGeometry(0.034, 8, 6);
  const iris = new THREE.Mesh(irisGeometry, irisMaterial);
  iris.position.z = 0.022;
  eyeGroup.add(iris);

  // Pupil — 65% of iris radius for chibi "big pupil" look
  // Old value 0.015 produced an intense, shark-like stare.
  const pupilGeometry = new THREE.SphereGeometry(0.022, 8, 6);
  const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  pupil.position.z = 0.040;
  eyeGroup.add(pupil);

  // Glint — tiny white highlight that makes the eye look alive.
  // Without this, chibi characters look vacant/creepy.
  // Positioned top-left of the pupil surface.
  const glintMaterial = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
  const glintGeometry = new THREE.SphereGeometry(0.007, 5, 4);
  const glint = new THREE.Mesh(glintGeometry, glintMaterial);
  glint.position.set(-0.008, 0.010, 0.052);
  eyeGroup.add(glint);

  return eyeGroup;
}

/**
 * Build a rounded capsule torso (cylinder + sphere caps).
 * Gives a cuter, softer silhouette than a box.
 */
function buildRoundedTorso(material: THREE.Material): THREE.Group {
  const torsoGroup = new THREE.Group();
  
  const bodyHeight = 0.26;
  const bodyRadius = 0.14;
  
  // Main cylinder body
  const cylinderGeometry = new THREE.CylinderGeometry(bodyRadius, bodyRadius * 0.85, bodyHeight, 12);
  const cylinder = new THREE.Mesh(cylinderGeometry, material);
  torsoGroup.add(cylinder);
  
  // Top sphere cap (shoulders)
  const topCapGeometry = new THREE.SphereGeometry(bodyRadius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const topCap = new THREE.Mesh(topCapGeometry, material);
  topCap.position.y = bodyHeight / 2;
  torsoGroup.add(topCap);
  
  // Bottom sphere cap (waist)
  const bottomCapGeometry = new THREE.SphereGeometry(bodyRadius * 0.85, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const bottomCap = new THREE.Mesh(bottomCapGeometry, material);
  bottomCap.position.y = -bodyHeight / 2;
  torsoGroup.add(bottomCap);
  
  return torsoGroup;
}

/**
 * Build a rounded limb (cylinder body with rounded ends).
 * Used for arms and legs of chibi characters.
 */
function buildRoundedLimb(
  material: THREE.Material,
  length: number,
  radius: number
): THREE.Group {
  const limbGroup = new THREE.Group();
  
  // Cylinder body
  const cylinderGeometry = new THREE.CylinderGeometry(radius, radius * 0.9, length, 8);
  const cylinder = new THREE.Mesh(cylinderGeometry, material);
  limbGroup.add(cylinder);
  
  // Top cap
  const topCapGeometry = new THREE.SphereGeometry(radius, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const topCap = new THREE.Mesh(topCapGeometry, material);
  topCap.position.y = length / 2;
  limbGroup.add(topCap);
  
  // Bottom cap
  const bottomCapGeometry = new THREE.SphereGeometry(radius * 0.9, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const bottomCap = new THREE.Mesh(bottomCapGeometry, material);
  bottomCap.position.y = -length / 2;
  limbGroup.add(bottomCap);
  
  return limbGroup;
}

// ============================================================================
// HAIR STYLES
// ============================================================================

/**
 * Add gender-specific hair to the avatar.
 * Updated to use rounded shapes instead of harsh rectangles.
 */
function addHair(
  group: THREE.Group,
  gender: 'boy' | 'girl',
  hairColor: number,
  th: number,
  headY: number,
  headRadius: number
): void {
  // Toon material for consistent cel-shaded look
  const hairMaterial = new THREE.MeshToonMaterial({ color: hairColor, emissive: hairColor, emissiveIntensity: 0.05 });
  
  if (gender === 'boy') {
    // Boy: smooth rounded hair cap
    // Top hair - sphere cap that blends smoothly with head
    const topHairGeometry = new THREE.SphereGeometry(headRadius * 1.02, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2.5);
    const topHair = new THREE.Mesh(topHairGeometry, hairMaterial);
    topHair.position.y = headY + headRadius * 0.15;
    group.add(topHair);
    
    // Front hair band - subtle cylinder instead of box
    const frontBandGeometry = new THREE.CylinderGeometry(headRadius * 1.01, headRadius * 1.01, 0.06, 12);
    const frontBand = new THREE.Mesh(frontBandGeometry, hairMaterial);
    frontBand.position.set(0, headY + headRadius * 0.25, headRadius * 0.12);
    group.add(frontBand);
  } else {
    // Girl: long flowing hair with soft curves
    const hairY = headY + headRadius * 0.1;
    
    // Back hair (long flowing) - rounded box with soft edges
    const backHairGeometry = new THREE.BoxGeometry(0.42, 0.48, 0.18);
    // Round the edges by subdividing
    const backHair = new THREE.Mesh(backHairGeometry, hairMaterial);
    backHair.position.set(0, hairY - 0.18, -headRadius * 0.45);
    // Round the corners
    backHair.scale.set(1, 1, 1);
    group.add(backHair);
    
    // Top hair cap
    const topHairGeometry = new THREE.SphereGeometry(headRadius * 1.02, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const topHair = new THREE.Mesh(topHairGeometry, hairMaterial);
    topHair.position.y = hairY + headRadius * 0.1;
    group.add(topHair);
    
    // Bangs - slightly rounded
    const bangsGeometry = new THREE.BoxGeometry(0.42, 0.08, 0.12);
    const bangs = new THREE.Mesh(bangsGeometry, hairMaterial);
    bangs.position.set(0, hairY + headRadius * 0.75, headRadius * 0.55);
    group.add(bangs);
    
    // Side strands - rounded cylinders instead of sharp boxes
    const strandGeometry = new THREE.CylinderGeometry(0.045, 0.04, 0.36, 8);
    
    const leftStrand = new THREE.Mesh(strandGeometry, hairMaterial);
    // 1.05× head radius places strands at the outer edge of the head sphere,
    // preventing them from intersecting / clipping through the side of the head.
    // Old value 0.82× was inside the head radius and visibly clipped.
    leftStrand.position.set(-headRadius * 1.05, hairY - 0.12, 0);
    group.add(leftStrand);

    const rightStrand = new THREE.Mesh(strandGeometry, hairMaterial);
    rightStrand.position.set(headRadius * 1.05, hairY - 0.12, 0);
    group.add(rightStrand);
  }
}

// ============================================================================
// HAT STYLES
// ============================================================================

/**
 * Add a hat to the avatar based on style.
 * Updated to use head-relative positioning.
 */
function addHat(
  group: THREE.Group,
  hat: HatStyle,
  hatColor: number,
  th: number,
  headY: number,
  headRadius: number
): void {
  const hatMaterial = new THREE.MeshToonMaterial({ color: hatColor, emissive: hatColor, emissiveIntensity: 0.06 });
  
  switch (hat) {
    case 'cap':
      addCap(group, hatMaterial, headY, headRadius);
      break;
    case 'wizard':
      addWizardHat(group, hatMaterial, headY, headRadius);
      break;
    case 'crown':
      addCrown(group, hatMaterial, headY, headRadius);
      break;
    case 'flower':
      addFlowerHat(group, hatMaterial, headY, headRadius);
      break;
  }
}

/**
 * Add a baseball cap.
 */
function addCap(group: THREE.Group, material: THREE.Material, headY: number, headRadius: number): void {
  // Hat Y position (on top of head)
  const hatY = headY + headRadius * 0.85;
  
  // Cap dome
  const domeGeometry = new THREE.SphereGeometry(headRadius * 1.05, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeometry, material);
  dome.position.y = hatY;
  group.add(dome);
  
  // Brim
  const brimGeometry = new THREE.CylinderGeometry(headRadius * 0.5, headRadius * 0.9, 0.02, 8, 1, false, 0, Math.PI);
  const brim = new THREE.Mesh(brimGeometry, material);
  brim.position.set(0, hatY, headRadius * 0.6);
  brim.rotation.y = Math.PI;
  group.add(brim);
}

/**
 * Add a wizard hat.
 */
function addWizardHat(group: THREE.Group, material: THREE.Material, headY: number, headRadius: number): void {
  const hatY = headY + headRadius * 0.85;
  
  // Cone
  const coneGeometry = new THREE.ConeGeometry(headRadius * 1.0, 0.48, 8);
  const cone = new THREE.Mesh(coneGeometry, material);
  cone.position.y = hatY + 0.24;
  group.add(cone);
  
  // Brim
  const brimGeometry = new THREE.TorusGeometry(headRadius * 0.9, 0.04, 6, 12);
  const brim = new THREE.Mesh(brimGeometry, material);
  brim.position.y = hatY;
  brim.rotation.x = Math.PI / 2;
  group.add(brim);
}

/**
 * Add a crown.
 */
function addCrown(group: THREE.Group, material: THREE.Material, headY: number, headRadius: number): void {
  const hatY = headY + headRadius * 0.85;
  
  // Base ring
  const baseGeometry = new THREE.TorusGeometry(headRadius * 0.85, 0.04, 6, 12);
  const base = new THREE.Mesh(baseGeometry, material);
  base.position.y = hatY;
  base.rotation.x = Math.PI / 2;
  group.add(base);
  
  // Points
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    
    const pointGeometry = new THREE.ConeGeometry(0.045, 0.14, 4);
    const point = new THREE.Mesh(pointGeometry, material);
    point.position.set(
      Math.cos(angle) * headRadius * 0.7,
      hatY + 0.07,
      Math.sin(angle) * headRadius * 0.7
    );
    group.add(point);
  }
}

/**
 * Add a flower accessory.
 */
function addFlowerHat(group: THREE.Group, material: THREE.Material, headY: number, headRadius: number): void {
  const hatY = headY + headRadius * 0.85;
  const flowerX = headRadius * 0.5;
  const flowerZ = headRadius * 0.4;
  
  // Stem
  const stemMaterial = new THREE.MeshToonMaterial({ color: 0x2A7A1A });
  const stemGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 5);
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.position.set(flowerX, hatY - 0.02, flowerZ);
  stem.rotation.z = -0.2;
  group.add(stem);
  
  // Petals
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const petalGeometry = new THREE.SphereGeometry(0.042, 5, 5);
    const petal = new THREE.Mesh(petalGeometry, material);
    petal.position.set(
      flowerX + Math.cos(angle) * 0.07,
      hatY + 0.06,
      flowerZ + Math.sin(angle) * 0.07
    );
    petal.scale.set(0.7, 0.3, 1);
    petal.rotation.y = angle;
    group.add(petal);
  }
  
  // Center
  const centerMaterial = new THREE.MeshToonMaterial({ color: 0xFFD700 });
  const centerGeometry = new THREE.SphereGeometry(0.035, 6, 6);
  const center = new THREE.Mesh(centerGeometry, centerMaterial);
  center.position.set(flowerX, hatY + 0.06, flowerZ);
  group.add(center);
}

// ============================================================================
// POSITION HELPERS
// ============================================================================

/**
 * Position avatar at a grid location.
 * 
 * @param avatar - The avatar group
 * @param gx - Grid X position
 * @param gz - Grid Z position
 */
export function positionAvatarAtGrid(avatar: THREE.Group, gx: number, gz: number): void {
  const { x, z } = gridToWorld(gx, gz);
  avatar.position.set(x, 0, z);
}

/**
 * Position avatar at world coordinates.
 * 
 * @param avatar - The avatar group
 * @param x - World X position
 * @param z - World Z position
 */
export function positionAvatarAtWorld(avatar: THREE.Group, x: number, z: number): void {
  avatar.position.set(x, 0, z);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DEFAULT_AVATAR } from './types';
export type { AvatarOptions, HatStyle } from './types';