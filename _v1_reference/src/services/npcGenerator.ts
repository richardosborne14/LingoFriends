/**
 * LingoFriends - NPC Generator Service
 *
 * Generates random NPC avatars for lesson encounters.
 * Each lesson step gets a unique NPC, with the final step being a "boss" NPC.
 *
 * Features:
 * - Seeded PRNG for deterministic NPCs (replaying lesson shows same characters)
 * - Random pools for skin tones, hair colors, clothing, and hats
 * - Boss NPCs with crown, gold colors, larger scale, and glow effect
 * - Entrance animation types for variety
 *
 * @module services/npcGenerator
 * @see docs/phase-1.3-activity-improvements/task-3-npc-avatar-encounters.md
 */

import type { AvatarOptions, HatStyle } from '../renderer/types';

// ============================================================================
// TYPES
// ============================================================================

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

/**
 * Complete NPC configuration including visual options and encounter settings.
 */
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

// ============================================================================
// RANDOMISATION POOLS
// ============================================================================

/**
 * Skin tone options for diverse NPC representation.
 * Covers a range of realistic skin tones.
 */
const SKIN_TONES: number[] = [
  0xF4C7AB,  // Light
  0xE8B896,  // Medium-light
  0xD4956B,  // Medium
  0xB87A4B,  // Medium-dark
  0x8B5E3C,  // Dark
  0xFCE4C7,  // Very light
  0xC68642,  // Warm brown
];

/**
 * Hair color options including natural and fun colors for kid-friendly variety.
 */
const HAIR_COLORS: number[] = [
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

/**
 * Shirt color options for vibrant, varied NPCs.
 */
const SHIRT_COLORS: number[] = [
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

/**
 * Trouser color options - darker, more subdued colors.
 */
const TROUSER_COLORS: number[] = [
  0x3A5A8C,  // Dark blue
  0x5D4037,  // Brown
  0x37474F,  // Dark grey
  0x1B5E20,  // Dark green
  0x4A148C,  // Dark purple
  0x263238,  // Navy
  0x8B0000,  // Dark red
];

/**
 * Hat styles with weighted probability.
 * 'none' appears multiple times to increase its probability.
 */
const HATS: HatStyle[] = [
  'none', 'none', 'none',  // 50% chance of no hat
  'cap', 'cap',            // ~17% chance
  'wizard',                // ~8% chance
  'crown',                 // ~8% chance (but boss always gets crown)
  'flower', 'flower',      // ~17% chance
];

/**
 * Hat color options for when an NPC wears a hat.
 */
const HAT_COLORS: number[] = [
  0xFF0000,  // Red
  0x00FF00,  // Green
  0x0000FF,  // Blue
  0xFFD700,  // Gold
  0xFF69B4,  // Pink
  0x9C27B0,  // Purple
  0x00BCD4,  // Teal
  0xFF5722,  // Deep orange
];

/**
 * Entrance animation types for variety.
 */
const ENTRANCES: NPCConfig['entrance'][] = [
  'fade',
  'slide_left',
  'slide_right',
  'drop',
];

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Simple seeded PRNG (mulberry32 algorithm).
 * Gives consistent results for the same seed,
 * so replaying a lesson shows the same NPCs.
 *
 * @param seed - The seed value
 * @returns A function that returns a random number between 0 and 1
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

/**
 * Pick a random element from an array.
 *
 * @param arr - Array to pick from
 * @param rand - Seeded random function
 * @returns A random element from the array
 */
function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a random NPC for a lesson step.
 *
 * The NPC is deterministic based on the lesson seed and step index,
 * meaning replaying the lesson will show the same NPCs in the same order.
 *
 * @param stepIndex - Current step index (0-based)
 * @param totalSteps - Total steps in the lesson
 * @param lessonSeed - Seed derived from lesson ID for reproducibility
 * @returns NPCConfig with all visual and behavioural properties
 *
 * @example
 * const seed = lessonIdToSeed('lesson-french-greetings-123');
 * const npc = generateNPC(0, 7, seed);
 * // npc.avatar contains the AvatarOptions for the NPC
 * // npc.role === 'villager' (not final step)
 * // npc.scale === 1.0
 */
export function generateNPC(
  stepIndex: number,
  totalSteps: number,
  lessonSeed: number,
): NPCConfig {
  // Combine lesson seed with step index for unique-per-step results
  // 7919 is a prime number to ensure good distribution
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
 *
 * Boss NPCs are visually distinct with:
 * - Crown hat (or gold-colored existing hat)
 * - Gold-tinted clothing
 * - 30% larger scale
 * - Gold glow effect
 * - Dramatic entrance animation
 *
 * @param rand - Seeded random function
 * @returns NPCConfig for a boss NPC
 */
function generateBossNPC(rand: () => number): NPCConfig {
  const gender: 'boy' | 'girl' = rand() > 0.5 ? 'boy' : 'girl';

  return {
    avatar: {
      gender,
      skinTone: pick(SKIN_TONES, rand),
      hairColor: pick(HAIR_COLORS, rand),
      // Boss has gold-tinted clothing for visual distinction
      shirtColor: 0xFFD700,    // Gold shirt
      pantsColor: 0x8B6914,    // Dark gold trousers
      hat: 'crown',            // Crown for the boss
      hatColor: 0xFFD700,      // Gold crown
    },
    role: 'boss',
    scale: 1.3,                // 30% larger than normal NPCs
    hasGlow: true,
    glowColor: 0xFFD700,       // Gold glow
    entrance: 'boss_dramatic',
    seed: 0,                   // Boss seed is always 0 (no variation)
  };
}

/**
 * Generate a deterministic seed from a lesson ID string.
 *
 * Uses a simple hash function to convert the lesson ID string
 * into a numeric seed for the PRNG.
 *
 * @param lessonId - The lesson ID string
 * @returns A numeric seed for deterministic NPC generation
 *
 * @example
 * const seed = lessonIdToSeed('lesson-french-greetings-123');
 * // seed is a consistent number for this lesson ID
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

/**
 * Extract AvatarOptions from a PocketBase ProfileRecord.
 * Falls back to DEFAULT_AVATAR for missing fields.
 *
 * @param profile - The user's profile record from PocketBase
 * @returns AvatarOptions for rendering the user's avatar
 */
export function profileToAvatarOptions(profile: {
  avatarGender?: 'boy' | 'girl';
  avatarShirtColor?: number;
  avatarPantsColor?: number;
  avatarHairColor?: number;
  avatarSkinTone?: number;
  avatarHat?: 'none' | 'cap' | 'wizard' | 'crown' | 'flower';
  avatarHatColor?: number;
}): AvatarOptions {
  // Import DEFAULT_AVATAR lazily to avoid circular dependencies
  // We'll use inline defaults here
  return {
    gender: profile.avatarGender ?? 'boy',
    shirtColor: profile.avatarShirtColor ?? 0x4ECDC4,
    pantsColor: profile.avatarPantsColor ?? 0x3355AA,
    hairColor: profile.avatarHairColor ?? 0x3D2B1A,
    skinTone: profile.avatarSkinTone ?? 0xFFD1A4,
    hat: profile.avatarHat ?? 'none',
    hatColor: profile.avatarHatColor ?? 0x8B0000,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateNPC,
  generateBossNPC,
  lessonIdToSeed,
  profileToAvatarOptions,
};