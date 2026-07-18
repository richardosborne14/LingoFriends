/**
 * lpcLayers.ts — Maps LingoFriends avatar options onto LPC spritesheet layers.
 *
 * PURE module: no Phaser, no DOM — fully unit-testable in Node.
 * (Image loading/compositing lives in compositor.ts; this file only decides
 * WHICH files to composite, in WHICH order.)
 *
 * Locked decision (TASK-FUN-02): the customiser's colours are mapped to the
 * NEAREST LPC PALETTE VARIANT, not hue-shifted at runtime. LPC art has
 * hand-placed shading per variant — tinting a single sheet flattens it and
 * looks worse than snapping to the closest authored palette.
 *
 * The full customiser → variant mapping is documented inline below (Rule 7:
 * every magic value explained). Asset files: static/assets/characters/**,
 * credits in static/assets/CREDITS.md.
 */

import type { AvatarOptions, NPCConfig } from '$lib/types/garden';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMISER → LPC VARIANT TABLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Onboarding skin swatches (StepAvatar.svelte SKIN_TONES) → teen body sheet.
 * LPC's revised body palette (light/amber/olive/bronze/brown/black) covers
 * the same light→dark range; matched by luminance order.
 */
export const SKIN_TONE_TO_LPC: Record<string, string> = {
	'#FDDBB4': 'light',
	'#F5CBA7': 'amber',
	'#E8A87C': 'olive',
	'#C68642': 'bronze',
	'#8D5524': 'brown',
	'#4B2E1A': 'black',
};

/**
 * Onboarding hair swatches (StepAvatar.svelte HAIR_COLORS) → hair variant.
 * The three hair styles we ship all use the standard 26-colour LPC hair
 * palette, so one table serves every style.
 *   #FF6B6B (soft coral red) → 'rose' — LPC 'red' is a deep blood red;
 *   rose is the closest match to the swatch kids actually see.
 */
export const HAIR_COLOR_TO_LPC: Record<string, string> = {
	'#4A3728': 'dark_brown',
	'#8B4513': 'chestnut',
	'#D4A017': 'blonde',
	'#FF6B6B': 'rose',
	'#6B48A0': 'purple',
	'#2C2C2C': 'black',
};

/**
 * Onboarding shirt swatches (StepAvatar.svelte SHIRT_COLORS) → LPC teen
 * t-shirt variant (standard 24-colour cloth palette).
 */
export const SHIRT_COLOR_TO_LPC: Record<string, string> = {
	'#FF8A6A': 'orange',
	'#5C9E6E': 'green',
	'#4A90D9': 'blue',
	'#9B59B6': 'purple',
	'#E74C3C': 'red',
	'#F39C12': 'yellow',
	'#1ABC9C': 'teal',
	'#34495E': 'navy',
};

/**
 * Gender → hair STYLE folder.
 * Mirrors the onboarding SVG preview: boys get short hair, girls get long,
 * neutral gets a mid-length bob. All three styles are CC0 (bluecarrot16)
 * and support the teen body.
 */
export const GENDER_TO_HAIR_STYLE: Record<string, string> = {
	boy: 'cowlick',
	girl: 'long_center_part',
	neutral: 'bob',
};

/**
 * Gender → head sheet folder.
 * In the modern LPC layout the HEAD is a separate layer from the body
 * (body sheets are headless torsos — compositing without a head layer
 * produces a decapitated sprite; found the fun way in browser testing).
 * Head variants use the same skin-tone names as the body.
 */
export const GENDER_TO_HEAD: Record<string, string> = {
	boy: 'male',
	girl: 'female',
	neutral: 'female', // softer features read younger — better kid default
};

/**
 * Hat id → pre-picked hat sheet (one colour variant each, chosen to match
 * the customiser icon: cap 🧢 = blue feather cap, beanie 🎿 = blue knit
 * bobble hat, headband 💛 = yellow thick band).
 * 'crown' exists for legacy V1 profiles (old customiser offered it).
 * 'none' → no layer.
 */
export const HAT_TO_FILE: Record<string, string | null> = {
	none: null,
	cap: '/assets/characters/hat/cap.png',
	beanie: '/assets/characters/hat/beanie.png',
	headband: '/assets/characters/hat/headband.png',
	crown: '/assets/characters/hat/crown.png',
};

// Defaults used when a profile holds a value not in the tables (e.g. data
// from an old schema version). Falling back beats crashing the garden.
const DEFAULT_SKIN = 'light';
const DEFAULT_HAIR_COLOR = 'dark_brown';
const DEFAULT_SHIRT = 'blue';
const DEFAULT_HAIR_STYLE = 'bob';
const DEFAULT_HEAD = 'female';

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR → ORDERED LAYER LIST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The resolved recipe for one composited character:
 * layer URLs in back-to-front draw order, plus a cache key.
 */
export interface AvatarLayerRecipe {
	/**
	 * PNG URLs in draw order: body → shirt → head → hair → hat.
	 * (LPC zPos order: body 10 < clothes 35 < head 100 < hair 120 < hat 130.)
	 */
	layers: string[];
	/**
	 * Stable key derived from the resolved variants — two users with the
	 * same choices share one composited texture (and Phaser texture key).
	 */
	key: string;
}

/**
 * Resolves a user's avatar options to the LPC layer files to composite.
 *
 * Every lookup falls back to a sensible default so old/malformed profile
 * data degrades to "slightly wrong outfit", never a broken sprite.
 */
export function resolveAvatarLayers(options: AvatarOptions): AvatarLayerRecipe {
	const skin = SKIN_TONE_TO_LPC[options.skinTone] ?? DEFAULT_SKIN;
	const hairColor = HAIR_COLOR_TO_LPC[options.hairColor] ?? DEFAULT_HAIR_COLOR;
	const shirt = SHIRT_COLOR_TO_LPC[options.shirtColor] ?? DEFAULT_SHIRT;
	const hairStyle = GENDER_TO_HAIR_STYLE[options.gender] ?? DEFAULT_HAIR_STYLE;
	const head = GENDER_TO_HEAD[options.gender] ?? DEFAULT_HEAD;
	// Unknown hat values (or 'none') simply add no hat layer.
	const hat = HAT_TO_FILE[options.hat] ?? null;

	const layers = [
		`/assets/characters/body/${skin}.png`,
		// Everyone wears blue jeans — the customiser has no trouser option
		// (yet), and LPC bodies are literally trouserless without this layer.
		'/assets/characters/legs/jeans.png',
		`/assets/characters/shirt/${shirt}.png`,
		`/assets/characters/head/${head}/${skin}.png`,
		`/assets/characters/hair/${hairStyle}/${hairColor}.png`,
	];
	if (hat) layers.push(hat);

	return {
		layers,
		key: `avatar-${head}-${skin}-${shirt}-${hairStyle}-${hairColor}-${options.hat ?? 'none'}`,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// NPC → ORDERED LAYER LIST (used by the lesson EncounterScene)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Euclidean RGB distance — good enough for snapping an arbitrary NPC hex
 * to our small palettes (perceptual colour spaces are overkill for 6–8
 * candidate swatches).
 */
function colorDistance(a: string, b: string): number {
	const pa = parseInt(a.slice(1), 16);
	const pb = parseInt(b.slice(1), 16);
	const dr = ((pa >> 16) & 0xff) - ((pb >> 16) & 0xff);
	const dg = ((pa >> 8) & 0xff) - ((pb >> 8) & 0xff);
	const db = (pa & 0xff) - (pb & 0xff);
	return dr * dr + dg * dg + db * db;
}

/**
 * Finds the palette hex closest to `hex`. Exposed for tests.
 * Falls back to the first palette entry for malformed input.
 */
export function nearestSwatch(hex: string, palette: string[]): string {
	if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return palette[0];
	let best = palette[0];
	let bestD = Infinity;
	for (const candidate of palette) {
		const d = colorDistance(hex, candidate);
		if (d < bestD) {
			bestD = d;
			best = candidate;
		}
	}
	return best;
}

/**
 * Resolves an NPC's generated colours to LPC layers.
 *
 * NPCConfig colours are arbitrary hexes from npcGenerator, so each one is
 * snapped to the nearest customiser swatch first, then reuses the avatar
 * tables. Style choices (hair style) are derived deterministically from the
 * NPC's name so the same NPC always looks the same across a lesson.
 * Boss NPCs always wear the gold crown (matches the 👑 name badge).
 */
export function resolveNPCLayers(config: NPCConfig): AvatarLayerRecipe {
	const skinHex = nearestSwatch(config.skinTone, Object.keys(SKIN_TONE_TO_LPC));
	const hairHex = nearestSwatch(config.hairColor, Object.keys(HAIR_COLOR_TO_LPC));
	const shirtHex = nearestSwatch(config.bodyColor, Object.keys(SHIRT_COLOR_TO_LPC));

	// Simple deterministic hash of the name → hair style. Sum of char codes
	// is stable and spreads well enough across 3 buckets.
	const styles = Object.values(GENDER_TO_HAIR_STYLE);
	let hash = 0;
	for (let i = 0; i < config.name.length; i++) hash += config.name.charCodeAt(i);
	const hairStyle = styles[hash % styles.length];

	const skin = SKIN_TONE_TO_LPC[skinHex];
	const hairColor = HAIR_COLOR_TO_LPC[hairHex];
	const shirt = SHIRT_COLOR_TO_LPC[shirtHex];
	// Head gender follows the hair-style bucket so the whole look coheres
	const head = hairStyle === 'cowlick' ? 'male' : 'female';

	const layers = [
		`/assets/characters/body/${skin}.png`,
		'/assets/characters/legs/jeans.png',
		`/assets/characters/shirt/${shirt}.png`,
		`/assets/characters/head/${head}/${skin}.png`,
		`/assets/characters/hair/${hairStyle}/${hairColor}.png`,
	];
	if (config.isBoss) layers.push(HAT_TO_FILE.crown!);

	return {
		layers,
		key: `npc-${head}-${skin}-${shirt}-${hairStyle}-${hairColor}${config.isBoss ? '-boss' : ''}`,
	};
}
