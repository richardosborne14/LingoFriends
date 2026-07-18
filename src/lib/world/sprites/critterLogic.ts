/**
 * critterLogic.ts — Pure critter selection + PRNG (TASK-FUN-03).
 *
 * PURE module: no Phaser, no DOM — fully unit-testable in Node.
 * (CritterSprite.ts owns the rendering/wander behaviour; this file owns
 * WHICH critters a user gets and the deterministic randomness they share.
 * Split because importing Phaser crashes vitest's jsdom environment —
 * same pattern as lpcLayers.ts vs AvatarSprite.ts.)
 */

/** Species stats — texture keys live here as plain strings to stay pure. */
export interface CritterSpec {
	/** Texture key (sheet must be 32px frames, 3 columns per row). */
	tex: string;
	/** Row index (0-based) whose 3 frames animate sideways movement. */
	moveRow: number;
	/** True if the sheet's move row faces LEFT (flip when moving right). */
	rowFacesLeft: boolean;
	/** Movement speed, px/sec. */
	speed: number;
	/** Pause range between wanders, seconds. */
	pauseMin: number;
	pauseMax: number;
}

/**
 * The critter roster. Frame rows verified visually on the sheets:
 * rabbit (reorganised LPC rabbit): row 1 = leftward hop
 * birds (bluecarrot16): row 4 = standing/pecking side view, faces left
 */
export const CRITTER_SPECIES: Record<string, CritterSpec> = {
	rabbit: { tex: 'rabbit', moveRow: 1, rowFacesLeft: true, speed: 55, pauseMin: 1, pauseMax: 3 },
	robin: { tex: 'bird-robin', moveRow: 4, rowFacesLeft: true, speed: 40, pauseMin: 0.5, pauseMax: 2.5 },
	bluejay: { tex: 'bird-bluejay', moveRow: 4, rowFacesLeft: true, speed: 40, pauseMin: 0.5, pauseMax: 2.5 },
};

/**
 * Tiny deterministic PRNG (mulberry32). Seeded from the user id so critter
 * choice AND their wander pattern differ per user but replay identically
 * on every visit.
 */
export function seededRandom(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Stable 32-bit hash of a string (FNV-1a). */
export function hashString(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/**
 * Picks this user's critters (with repetition allowed — two rabbits is
 * charming, not a bug). Same userId → same roster, forever.
 */
export function pickCritters(userId: string, count = 3): string[] {
	const rand = seededRandom(hashString(userId));
	const names = Object.keys(CRITTER_SPECIES);
	return Array.from({ length: count }, () => names[Math.floor(rand() * names.length)]);
}
