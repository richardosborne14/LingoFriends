/**
 * LingoFriends V2 — NPC Generator
 *
 * Generates deterministic NPC configurations for lesson coaching steps.
 * Same seed + step index always produces the same NPC — so if the user
 * replays a lesson they see the same characters, which feels intentional.
 *
 * Why deterministic: Kids notice when things change unexpectedly.
 * Consistent NPCs make the world feel stable and trustworthy.
 * We use a seeded LCG (Linear Congruential Generator) — no external library.
 *
 * Boss NPC rule: The final step of any lesson gets a boss NPC.
 * Boss = larger (1.3×), gold crown, surprised emotion. This gives kids
 * a sense of progression — the final challenge "feels different".
 *
 * @module services/npcGenerator
 */

import type { NPCConfig } from '$lib/types/garden';

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR PALETTES
// ─────────────────────────────────────────────────────────────────────────────

/** Pool of skin tones — covers a wide, inclusive range */
const SKIN_TONES = [
	'#F5D0A9', // light warm
	'#E8B68A', // medium warm
	'#C98A5E', // medium tan
	'#A0522D', // brown
	'#7B3F00', // deep brown
	'#FDDBB4', // light cool
	'#D2966A', // medium cool
];

/** Pool of body (shirt) colours — bright, kid-friendly */
const BODY_COLORS = [
	'#FF8A6A', // coral (design system primary)
	'#48B87E', // forest green
	'#4AADEE', // sky blue
	'#9B7AEE', // purple
	'#FFD84A', // gold
	'#F5A3C7', // bloom pink
	'#FF6B6B', // red
	'#45C2B0', // teal
];

/** Pool of hair colours */
const HAIR_COLORS = [
	'#4A3728', // dark brown
	'#8B4513', // medium brown
	'#D4A017', // golden blonde
	'#1C1C1C', // black
	'#C0C0C0', // grey
	'#E07B39', // auburn
	'#9B59B6', // purple (fun/fantasy)
];

/** Emotions for normal (non-boss) NPCs */
const NORMAL_EMOTIONS: NPCConfig['emotion'][] = ['happy', 'thinking', 'happy'];

// ─────────────────────────────────────────────────────────────────────────────
// SEEDED RNG (LCG algorithm)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a seeded pseudo-random number generator.
 * Returns values in [0, 1) — same interface as Math.random().
 *
 * LCG parameters (from Numerical Recipes, known good values):
 *   multiplier = 1664525, increment = 1013904223, modulus = 2^32
 *
 * @param seed - Any integer seed value
 * @returns Function that returns next pseudo-random value in [0, 1)
 */
function createSeededRng(seed: number): () => number {
	let state = seed >>> 0; // unsigned 32-bit
	return () => {
		// LCG step
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 0x100000000; // normalise to [0, 1)
	};
}

/**
 * Converts a string seed (e.g. treeId or lessonId) to a numeric seed.
 * Uses a simple djb2-style hash — fast, good distribution.
 *
 * @param str - The string to hash
 * @returns 32-bit unsigned integer seed
 */
function hashStringSeed(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		// djb2: hash = hash * 33 ^ char
		hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
	}
	return hash >>> 0; // unsigned
}

/**
 * Picks a random element from an array using the provided RNG.
 */
function pickRandom<T>(arr: T[], rng: () => number): T {
	return arr[Math.floor(rng() * arr.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a deterministic NPC configuration for a lesson coaching step.
 *
 * The same seed + stepIndex always produces the same NPC — deterministic
 * for replay consistency. The final step gets a boss NPC.
 *
 * @param stepIndex - 0-based index of the current coaching step
 * @param totalSteps - Total number of steps in this lesson
 * @param seed - Stable seed string (e.g. treeId + lessonIndex)
 * @returns NPCConfig ready to pass to NPCScene.loadCharacter()
 */
export function generateNPC(
	stepIndex: number,
	totalSteps: number,
	seed: string
): NPCConfig {
	// Combine step index into seed so each step gets a different NPC
	const numericSeed = hashStringSeed(`${seed}-step-${stepIndex}`);
	const rng = createSeededRng(numericSeed);

	const isBoss = stepIndex === totalSteps - 1;

	const skinTone = pickRandom(SKIN_TONES, rng);
	const bodyColor = isBoss
		? '#FFD84A' // Boss NPCs always wear gold
		: pickRandom(BODY_COLORS, rng);
	const hairColor = pickRandom(HAIR_COLORS, rng);

	const emotion: NPCConfig['emotion'] = isBoss
		? 'surprised'
		: pickRandom(NORMAL_EMOTIONS, rng);

	return {
		skinTone,
		bodyColor,
		hairColor,
		scale: isBoss ? 1.3 : 1.0,
		isBoss,
		emotion,
	};
}

/**
 * Generates a stable seed string for a lesson's NPC sequence.
 * Combines treeId + lessonIndex so each lesson in a path has its own NPCs.
 *
 * @param treeId - The user's tree UUID
 * @param lessonIndex - Which lesson in the path (0-based)
 * @returns Seed string for use with generateNPC()
 */
export function buildLessonSeed(treeId: string, lessonIndex: number): string {
	return `${treeId}-lesson-${lessonIndex}`;
}
