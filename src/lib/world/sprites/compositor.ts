/**
 * compositor.ts — Draws LPC layers into one composited walk-band canvas.
 *
 * Browser-only (uses Image + canvas), but deliberately Phaser-FREE so it can
 * serve two consumers:
 *   1. AvatarSprite.ts — registers the canvas as a Phaser texture (garden)
 *   2. EncounterScene.svelte — extracts single frames for the lesson banner
 *
 * Locked decision (TASK-FUN-02): layers are composited ONCE at load time
 * into a single texture (one draw call per character per frame), instead of
 * stacking 3–4 live sprites per character. Recolouring already happened at
 * asset-selection time (nearest palette variant — see lpcLayers.ts).
 *
 * Output geometry: 832×256 canvas = the LPC walk band
 * (13 cols × 4 rows of 64px; rows are up/left/down/right; col 0 = standing).
 */

import {
	LPC_FRAME,
	LPC_SHEET_COLS,
	LPC_WALK_BAND_Y,
	LPC_WALK_ROWS,
	type LPCDirection,
	LPC_WALK_DIRECTIONS,
} from '../assets';
import type { AvatarLayerRecipe } from './lpcLayers';

/** Composited canvas width: 13 frames × 64px. */
export const BAND_WIDTH = LPC_SHEET_COLS * LPC_FRAME; // 832
/** Composited canvas height: 4 directions × 64px. */
export const BAND_HEIGHT = LPC_WALK_ROWS * LPC_FRAME; // 256

/**
 * In-memory cache of composited canvases, keyed by recipe key.
 * Two characters with identical options share one canvas; repeated
 * garden ↔ lesson navigation doesn't re-fetch or re-draw anything.
 * (A handful of 832×256 canvases ≈ nothing; no eviction needed.)
 */
const canvasCache = new Map<string, Promise<HTMLCanvasElement>>();

/**
 * Loads one image, resolving when it's decoded and safe to draw.
 * Rejects with the failing URL in the message so a bad mapping is
 * debuggable from the console instead of a silent blank sprite.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`LPC layer failed to load: ${url}`));
		img.src = url;
	});
}

/**
 * Composites a layer recipe into a single walk-band canvas.
 *
 * Draw order = array order (body → shirt → hair → hat), source-over blending,
 * cropping each full sheet to the walk band. Both LPC sheet layouts we ship
 * (classic 1344px and expanded 2944px tall) have the walk band at the same
 * offset, so one crop rect works for every layer (see assets.ts).
 *
 * Cached by recipe key — safe to call repeatedly.
 */
export function compositeWalkBand(recipe: AvatarLayerRecipe): Promise<HTMLCanvasElement> {
	const cached = canvasCache.get(recipe.key);
	if (cached) return cached;

	const promise = (async () => {
		const images = await Promise.all(recipe.layers.map(loadImage));

		const canvas = document.createElement('canvas');
		canvas.width = BAND_WIDTH;
		canvas.height = BAND_HEIGHT;
		const ctx = canvas.getContext('2d')!;
		// Pixel art: never smooth (matters if a browser scales during draw)
		ctx.imageSmoothingEnabled = false;

		for (const img of images) {
			// Crop the walk band out of the full sheet:
			// source y = 512 (row 8), height = 256 (4 rows)
			ctx.drawImage(
				img,
				0, LPC_WALK_BAND_Y, BAND_WIDTH, BAND_HEIGHT, // source rect
				0, 0, BAND_WIDTH, BAND_HEIGHT // dest rect
			);
		}

		return canvas;
	})();

	canvasCache.set(recipe.key, promise);
	// A failed composite must not poison the cache forever (e.g. one flaky
	// asset fetch on bad hotel wifi) — drop it so the next call retries.
	promise.catch(() => canvasCache.delete(recipe.key));
	return promise;
}

/**
 * Extracts ONE 64×64 frame from a composited band as its own canvas.
 * Used by the lesson EncounterScene, which shows static facing characters
 * (scaled up with CSS image-rendering: pixelated), not a Phaser scene.
 *
 * @param band - canvas from compositeWalkBand
 * @param direction - which walk row to read
 * @param frame - column 0–8 (0 = standing pose)
 */
export function extractFrame(
	band: HTMLCanvasElement,
	direction: LPCDirection,
	frame = 0
): HTMLCanvasElement {
	const row = LPC_WALK_DIRECTIONS.indexOf(direction);
	const out = document.createElement('canvas');
	out.width = LPC_FRAME;
	out.height = LPC_FRAME;
	const ctx = out.getContext('2d')!;
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(
		band,
		frame * LPC_FRAME, row * LPC_FRAME, LPC_FRAME, LPC_FRAME,
		0, 0, LPC_FRAME, LPC_FRAME
	);
	return out;
}

/** Test hook: clears the composite cache (used between vitest cases). */
export function clearCompositeCache(): void {
	canvasCache.clear();
}
