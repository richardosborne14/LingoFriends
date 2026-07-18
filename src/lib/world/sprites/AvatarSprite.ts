/**
 * AvatarSprite.ts — Phaser side of the character pipeline.
 *
 * Registers a composited LPC walk-band canvas (from compositor.ts) as a
 * Phaser texture + animations, and provides a small arcade-physics sprite
 * class that handles both input styles:
 *   - held keys (WASD/arrows) → velocity movement
 *   - tap-to-walk → straight-line walk toward a target, stop on arrival
 *
 * NOTE: this module statically imports 'phaser', so it must only ever be
 * reached through WorldCanvas's dynamic import chain (never from SSR code).
 */

import Phaser from 'phaser';
import { LPC_FRAME, LPC_WALK_FRAMES, LPC_WALK_DIRECTIONS, type LPCDirection } from '../assets';
import type { AvatarOptions } from '$lib/types/garden';
import { resolveAvatarLayers, type AvatarLayerRecipe } from './lpcLayers';
import { compositeWalkBand } from './compositor';

/**
 * Walk speed in world px/sec. 96 px/s = 3 tiles/sec — brisk enough to cross
 * the plot in ~4s, slow enough that the 8-frame walk cycle reads clearly.
 */
const WALK_SPEED = 96;

/** Stop when this close (px) to a tap target — prevents orbit jitter. */
const ARRIVE_DISTANCE = 4;

/** Walk animation frame rate. LPC cycles are authored for ~8-10 fps. */
const WALK_FPS = 10;

/**
 * Registers the composited texture + 8 animations (walk/idle × 4 directions)
 * for an avatar recipe. Idempotent: safe to call for every character; shared
 * recipes reuse the existing texture/animations.
 *
 * Frame naming: the walk band is 4 rows × 9 columns; we register the frames
 * a row at a time with numeric names row*9+col (0–35). Column 0 of each row
 * is the LPC standing pose → used as the idle "animation" (1 frame).
 *
 * @returns the Phaser texture key (= recipe.key)
 */
export async function registerAvatarTexture(
	scene: Phaser.Scene,
	recipe: AvatarLayerRecipe
): Promise<string> {
	const key = recipe.key;

	// Another sprite with the same look may have registered everything already
	if (!scene.textures.exists(key)) {
		const canvas = await compositeWalkBand(recipe);
		// Scene could have been destroyed while we awaited the composite
		// (fast navigation away) — bail out instead of touching a dead scene.
		if (!scene.textures) return key;

		const texture = scene.textures.addCanvas(key, canvas);
		if (!texture) return key; // key collided in a race — frames already exist

		// Register the 36 walk-band frames (4 directions × 9 columns)
		for (let row = 0; row < LPC_WALK_DIRECTIONS.length; row++) {
			for (let col = 0; col < LPC_WALK_FRAMES; col++) {
				texture.add(row * LPC_WALK_FRAMES + col, 0, col * LPC_FRAME, row * LPC_FRAME, LPC_FRAME, LPC_FRAME);
			}
		}
	}

	// Animations are global in Phaser — key them by texture so avatars with
	// different looks don't fight over animation names.
	for (let row = 0; row < LPC_WALK_DIRECTIONS.length; row++) {
		const dir = LPC_WALK_DIRECTIONS[row];
		const walkKey = `${key}-walk-${dir}`;
		if (!scene.anims.exists(walkKey)) {
			scene.anims.create({
				key: walkKey,
				// Columns 1-8 are the walk cycle (column 0 is the standing pose)
				frames: Array.from({ length: LPC_WALK_FRAMES - 1 }, (_, i) => ({
					key,
					frame: row * LPC_WALK_FRAMES + i + 1,
				})),
				frameRate: WALK_FPS,
				repeat: -1,
			});
		}
	}

	return key;
}

/**
 * The player (or, later, friend/NPC) character in the tile world.
 *
 * Owns its movement state machine:
 *   keys pressed  → velocity movement (cancels any tap target)
 *   walkTo target → move toward point until ARRIVE_DISTANCE
 *   neither       → idle frame facing last direction
 */
export class AvatarSprite extends Phaser.Physics.Arcade.Sprite {
	/** Last facing — keeps idle pose consistent after stopping. */
	private facing: LPCDirection = 'down';

	/** Active tap-to-walk target, or null when key-driven/idle. */
	private target: Phaser.Math.Vector2 | null = null;

	constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
		// Frame 18 = row 2 (down), col 0 → standing, facing the camera
		super(scene, x, y, textureKey, 2 * LPC_WALK_FRAMES);
		scene.add.existing(this);
		scene.physics.add.existing(this);

		// Collision body: a 20×12 box at the FEET, not the whole 64px frame.
		// LPC characters have empty margins; colliding with the head looks
		// wrong when walking behind fences/trees (top-down convention).
		this.body!.setSize(20, 12);
		this.body!.setOffset((LPC_FRAME - 20) / 2, LPC_FRAME - 14);
	}

	/** Starts a straight-line walk to a world point (tap-to-walk). */
	walkTo(x: number, y: number): void {
		this.target = new Phaser.Math.Vector2(x, y);
	}

	/** True while a tap-to-walk target is active (used by tests/debug). */
	get isWalkingToTarget(): boolean {
		return this.target !== null;
	}

	/**
	 * Per-frame movement update. Call from the scene's update().
	 *
	 * @param keys - aggregated key state (scene merges arrows + WASD)
	 */
	update(keys: { up: boolean; down: boolean; left: boolean; right: boolean }): void {
		const body = this.body as Phaser.Physics.Arcade.Body;

		// ── 1. Keyboard has priority — any key cancels tap-walking ─────────
		const keyActive = keys.up || keys.down || keys.left || keys.right;
		if (keyActive) this.target = null;

		let vx = 0;
		let vy = 0;

		if (keyActive) {
			if (keys.left) vx -= 1;
			if (keys.right) vx += 1;
			if (keys.up) vy -= 1;
			if (keys.down) vy += 1;
		} else if (this.target) {
			// ── 2. Tap-to-walk: head straight for the target ───────────────
			const dx = this.target.x - this.x;
			const dy = this.target.y - this.y;
			if (Math.hypot(dx, dy) <= ARRIVE_DISTANCE || body.blocked.none === false) {
				// Arrived — or bumped into something (fence): stop cleanly
				// rather than running on the spot forever.
				this.target = null;
			} else {
				vx = dx;
				vy = dy;
			}
		}

		// ── 3. Apply velocity, normalised so diagonals aren't 41% faster ───
		if (vx !== 0 || vy !== 0) {
			const len = Math.hypot(vx, vy);
			body.setVelocity((vx / len) * WALK_SPEED, (vy / len) * WALK_SPEED);

			// Facing = dominant axis (LPC has no diagonal frames)
			this.facing =
				Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
			this.anims.play(`${this.texture.key}-walk-${this.facing}`, true);
		} else {
			body.setVelocity(0, 0);
			this.anims.stop();
			// Standing pose of the last facing (column 0 of that row)
			this.setFrame(LPC_WALK_DIRECTIONS.indexOf(this.facing) * LPC_WALK_FRAMES);
		}

		// Painter's order: lower on screen = drawn in front (top-down world)
		this.setDepth(this.y);
	}
}

/**
 * Convenience: resolve options → composite → register → spawn, in one call.
 * This is what PlotScene uses for the player.
 */
export async function createPlayerAvatar(
	scene: Phaser.Scene,
	x: number,
	y: number,
	options: AvatarOptions
): Promise<AvatarSprite> {
	const recipe = resolveAvatarLayers(options);
	const key = await registerAvatarTexture(scene, recipe);
	return new AvatarSprite(scene, x, y, key);
}
