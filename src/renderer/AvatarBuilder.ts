/**
 * Avatar Builder for Garden Renderer
 * 
 * Creates customizable avatars with:
 * - Body parts (head, torso, arms, legs)
 * - Clothing colors (shirt, pants)
 * - Skin tone options
 * - Hair styles (boy/girl)
 * - Hats (cap, wizard, crown, flower)
 * 
 * @module renderer/AvatarBuilder
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

// ============================================================================
// AVATAR BUILDER
// ============================================================================

/**
 * Build a customizable avatar character.
 * 
 * The avatar is constructed from multiple mesh parts:
 * - Head (skin tone)
 * - Hair (style varies by gender)
 * - Eyes and mouth
 * - Torso (shirt color)
 * - Arms (shirt color, skin tone hands)
 * - Legs (pants color)
 * - Hat (optional, varies by style)
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
  
  // Materials
  const skinMaterial = new THREE.MeshLambertMaterial({ color: skinTone });
  const shirtMaterial = new THREE.MeshLambertMaterial({ color: shirtColor });
  const pantsMaterial = new THREE.MeshLambertMaterial({ color: pantsColor });
  const hairMaterial = new THREE.MeshLambertMaterial({ color: hairColor });
  const whiteMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
  
  // ===== HEAD =====
  const headGeometry = new THREE.SphereGeometry(0.21, 12, 12);
  const head = new THREE.Mesh(headGeometry, skinMaterial);
  head.position.y = TH / 2 + 0.92;
  group.add(head);
  
  // ===== Eyes =====
  const eyeGeometry = new THREE.SphereGeometry(0.04, 6, 6);
  
  // Left eye white
  const leftEyeWhite = new THREE.Mesh(eyeGeometry, whiteMaterial);
  leftEyeWhite.position.set(-0.06, TH / 2 + 0.95, 0.19);
  group.add(leftEyeWhite);
  
  // Right eye white
  const rightEyeWhite = new THREE.Mesh(eyeGeometry, whiteMaterial);
  rightEyeWhite.position.set(0.06, TH / 2 + 0.95, 0.19);
  group.add(rightEyeWhite);
  
  // Pupils
  const pupilGeometry = new THREE.SphereGeometry(0.018, 5, 5);
  
  const leftPupil = new THREE.Mesh(pupilGeometry, blackMaterial);
  leftPupil.position.set(-0.06, TH / 2 + 0.95, 0.22);
  group.add(leftPupil);
  
  const rightPupil = new THREE.Mesh(pupilGeometry, blackMaterial);
  rightPupil.position.set(0.06, TH / 2 + 0.95, 0.22);
  group.add(rightPupil);
  
  // ===== Mouth (simple line) =====
  const mouthGeometry = new THREE.BoxGeometry(0.06, 0.015, 0.01);
  const mouth = new THREE.Mesh(mouthGeometry, blackMaterial);
  mouth.position.set(0, TH / 2 + 0.82, 0.2);
  group.add(mouth);
  
  // ===== Hair =====
  addHair(group, gender, hairColor, TH);
  
  // ===== Torso =====
  const torsoGeometry = new THREE.BoxGeometry(0.28, 0.34, 0.15);
  const torso = new THREE.Mesh(torsoGeometry, shirtMaterial);
  torso.position.y = TH / 2 + 0.49;
  group.add(torso);
  
  // ===== Arms =====
  const armGeometry = new THREE.BoxGeometry(0.07, 0.28, 0.07);
  const handGeometry = new THREE.SphereGeometry(0.04, 6, 6);
  
  // Left arm
  const leftArm = new THREE.Mesh(armGeometry, shirtMaterial);
  leftArm.position.set(-0.2, TH / 2 + 0.5, 0);
  group.add(leftArm);
  
  // Left hand
  const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
  leftHand.position.set(-0.2, TH / 2 + 0.33, 0);
  group.add(leftHand);
  
  // Right arm
  const rightArm = new THREE.Mesh(armGeometry, shirtMaterial);
  rightArm.position.set(0.2, TH / 2 + 0.5, 0);
  group.add(rightArm);
  
  // Right hand
  const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
  rightHand.position.set(0.2, TH / 2 + 0.33, 0);
  group.add(rightHand);
  
  // ===== Legs =====
  const legGeometry = new THREE.BoxGeometry(0.1, 0.28, 0.1);
  
  // Left leg
  const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
  leftLeg.position.set(-0.07, TH / 2 + 0.14, 0);
  group.add(leftLeg);
  
  // Right leg
  const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
  rightLeg.position.set(0.07, TH / 2 + 0.14, 0);
  group.add(rightLeg);
  
  // ===== Hat =====
  if (hat !== 'none') {
    addHat(group, hat, hatColor, TH);
  }
  
  // Mark for identification
  group.userData.isAvatar = true;
  
  return group;
}

// ============================================================================
// HAIR STYLES
// ============================================================================

/**
 * Add gender-specific hair to the avatar.
 */
function addHair(
  group: THREE.Group,
  gender: 'boy' | 'girl',
  hairColor: number,
  th: number
): void {
  const hairMaterial = new THREE.MeshLambertMaterial({ color: hairColor });
  
  if (gender === 'boy') {
    // Boy: short cropped hair covering top of head
    const topHairGeometry = new THREE.SphereGeometry(0.215, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2.5);
    const topHair = new THREE.Mesh(topHairGeometry, hairMaterial);
    topHair.position.y = th / 2 + 0.95;
    group.add(topHair);
    
    // Side hair (short around ears)
    const sideHairGeometry = new THREE.BoxGeometry(0.44, 0.08, 0.22);
    const sideHair = new THREE.Mesh(sideHairGeometry, hairMaterial);
    sideHair.position.set(0, th / 2 + 0.88, -0.04);
    group.add(sideHair);
  } else {
    // Girl: long hair with front bangs
    // Back hair (long)
    const backHairGeometry = new THREE.BoxGeometry(0.34, 0.42, 0.14);
    const backHair = new THREE.Mesh(backHairGeometry, hairMaterial);
    backHair.position.set(0, th / 2 + 0.78, -0.12);
    group.add(backHair);
    
    // Top hair
    const topHairGeometry = new THREE.SphereGeometry(0.22, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const topHair = new THREE.Mesh(topHairGeometry, hairMaterial);
    topHair.position.y = th / 2 + 0.96;
    group.add(topHair);
    
    // Bangs
    const bangsGeometry = new THREE.BoxGeometry(0.34, 0.1, 0.1);
    const bangs = new THREE.Mesh(bangsGeometry, hairMaterial);
    bangs.position.set(0, th / 2 + 1.02, 0.14);
    group.add(bangs);
    
    // Side strands
    const strandGeometry = new THREE.BoxGeometry(0.08, 0.32, 0.08);
    
    const leftStrand = new THREE.Mesh(strandGeometry, hairMaterial);
    leftStrand.position.set(-0.18, th / 2 + 0.68, 0);
    group.add(leftStrand);
    
    const rightStrand = new THREE.Mesh(strandGeometry, hairMaterial);
    rightStrand.position.set(0.18, th / 2 + 0.68, 0);
    group.add(rightStrand);
  }
}

// ============================================================================
// HAT STYLES
// ============================================================================

/**
 * Add a hat to the avatar based on style.
 */
function addHat(
  group: THREE.Group,
  hat: HatStyle,
  hatColor: number,
  th: number
): void {
  const hatMaterial = new THREE.MeshLambertMaterial({ color: hatColor });
  
  switch (hat) {
    case 'cap':
      addCap(group, hatMaterial, th);
      break;
    case 'wizard':
      addWizardHat(group, hatMaterial, th);
      break;
    case 'crown':
      addCrown(group, hatMaterial, th);
      break;
    case 'flower':
      addFlowerHat(group, hatMaterial, th);
      break;
  }
}

/**
 * Add a baseball cap.
 */
function addCap(group: THREE.Group, material: THREE.Material, th: number): void {
  // Cap dome
  const domeGeometry = new THREE.SphereGeometry(0.23, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeometry, material);
  dome.position.y = th / 2 + 1.12;
  group.add(dome);
  
  // Brim
  const brimGeometry = new THREE.CylinderGeometry(0.11, 0.2, 0.025, 8, 1, false, 0, Math.PI);
  const brim = new THREE.Mesh(brimGeometry, material);
  brim.position.set(0, th / 2 + 1.12, 0.14);
  brim.rotation.y = Math.PI;
  group.add(brim);
}

/**
 * Add a wizard hat.
 */
function addWizardHat(group: THREE.Group, material: THREE.Material, th: number): void {
  // Cone
  const coneGeometry = new THREE.ConeGeometry(0.22, 0.48, 8);
  const cone = new THREE.Mesh(coneGeometry, material);
  cone.position.y = th / 2 + 1.3;
  group.add(cone);
  
  // Brim
  const brimGeometry = new THREE.TorusGeometry(0.2, 0.04, 6, 12);
  const brim = new THREE.Mesh(brimGeometry, material);
  brim.position.y = th / 2 + 1.08;
  brim.rotation.x = Math.PI / 2;
  group.add(brim);
}

/**
 * Add a crown.
 */
function addCrown(group: THREE.Group, material: THREE.Material, th: number): void {
  // Base ring
  const baseGeometry = new THREE.TorusGeometry(0.18, 0.04, 6, 12);
  const base = new THREE.Mesh(baseGeometry, material);
  base.position.y = th / 2 + 1.09;
  base.rotation.x = Math.PI / 2;
  group.add(base);
  
  // Points
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    
    const pointGeometry = new THREE.ConeGeometry(0.045, 0.14, 4);
    const point = new THREE.Mesh(pointGeometry, material);
    point.position.set(
      Math.cos(angle) * 0.15,
      th / 2 + 1.16,
      Math.sin(angle) * 0.15
    );
    group.add(point);
  }
}

/**
 * Add a flower accessory.
 */
function addFlowerHat(group: THREE.Group, material: THREE.Material, th: number): void {
  // Stem
  const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x2A7A1A });
  const stemGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 5);
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.position.set(0.11, th / 2 + 1.07, 0.09);
  stem.rotation.z = -0.2;
  group.add(stem);
  
  // Petals
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const petalGeometry = new THREE.SphereGeometry(0.042, 5, 5);
    const petal = new THREE.Mesh(petalGeometry, material);
    petal.position.set(
      0.11 + Math.cos(angle) * 0.07,
      th / 2 + 1.13,
      0.09 + Math.sin(angle) * 0.07
    );
    petal.scale.set(0.7, 0.3, 1);
    petal.rotation.y = angle;
    group.add(petal);
  }
  
  // Center
  const centerMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
  const centerGeometry = new THREE.SphereGeometry(0.035, 6, 6);
  const center = new THREE.Mesh(centerGeometry, centerMaterial);
  center.position.set(0.11, th / 2 + 1.13, 0.09);
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