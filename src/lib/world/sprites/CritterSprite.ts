/**
 * CritterSprite.ts — Ambient wildlife for the home plot (TASK-FUN-03).
 *
 * Port of V1's random-walk critter state machine (idle → walk → pause, with
 * bounds) from the Three.js animals module to Phaser sprites.
 *
 * Which critters live in a plot is DETERMINISTIC per user: the same kid
 * always finds the same animals in their garden ("your garden has your
 * animals"), and a friend's plot (TASK-FUN-04) will feel distinct.
 */

import Phaser from 'phaser';
import { CRITTER_SPECIES, type CritterSpec } from './critterLogic';

// Pure selection logic (species table, PRNG, roster picking) lives in
// critterLogic.ts — Phaser-free so it can be unit tested. Re-exported here
// so scene code has one import site.
export { CRITTER_SPECIES, pickCritters, seededRandom, hashString } from './critterLogic';
export type { CritterSpec } from './critterLogic';

// ── The sprite ──────────────────────────────────────────────────────────────

/** Zone rectangle a critter is allowed to wander inside (world px). */
export interface WanderZone {
	x: number;
	y: number;
	width: number;
	height: number;
}

export class CritterSprite extends Phaser.GameObjects.Sprite {
	private spec: CritterSpec;
	private species: string;
	private zone: WanderZone;
	private rand: () => number;

	/** Current wander target, or null while pausing. */
	private target: { x: number; y: number } | null = null;
	/** Seconds left of the current pause. */
	private pauseTimer: number;

	constructor(
		scene: Phaser.Scene,
		species: string,
		zone: WanderZone,
		rand: () => number
	) {
		const spec = CRITTER_SPECIES[species];
		super(
			scene,
			zone.x + rand() * zone.width,
			zone.y + rand() * zone.height,
			spec.tex,
			spec.moveRow * 3 // first frame of the movement row
		);
		this.spec = spec;
		this.species = species;
		this.zone = zone;
		this.rand = rand;
		this.pauseTimer = rand() * 2; // stagger first moves across critters

		this.setOrigin(0.5, 1);
		scene.add.existing(this);

		// One looping 3-frame animation per species, registered lazily
		const animKey = `critter-${species}-move`;
		if (!scene.anims.exists(animKey)) {
			scene.anims.create({
				key: animKey,
				frames: [0, 1, 2].map((i) => ({ key: spec.tex, frame: spec.moveRow * 3 + i })),
				frameRate: 6,
				repeat: -1,
			});
		}
	}

	/**
	 * Per-frame update (dt in SECONDS). Same state machine as V1:
	 * pausing → pick target → walk → arrive → pause again.
	 */
	update(dt: number): void {
		if (this.target) {
			const dx = this.target.x - this.x;
			const dy = this.target.y - this.y;
			const dist = Math.hypot(dx, dy);

			if (dist < 3) {
				// Arrived: stop, rest for pauseMin..pauseMax seconds
				this.target = null;
				this.pauseTimer =
					this.spec.pauseMin + this.rand() * (this.spec.pauseMax - this.spec.pauseMin);
				this.anims.stop();
				this.setFrame(this.spec.moveRow * 3); // resting pose
			} else {
				const step = Math.min(this.spec.speed * dt, dist);
				this.x += (dx / dist) * step;
				this.y += (dy / dist) * step;
				// Sheet rows face left — flip when heading right
				this.setFlipX(this.spec.rowFacesLeft ? dx > 0 : dx < 0);
				this.setDepth(this.y);
			}
		} else {
			this.pauseTimer -= dt;
			if (this.pauseTimer <= 0) {
				// Short hops (≤ ~3 tiles) look like grazing, not patrolling
				const hop = 96;
				this.target = {
					x: Phaser.Math.Clamp(this.x + (this.rand() * 2 - 1) * hop, this.zone.x, this.zone.x + this.zone.width),
					y: Phaser.Math.Clamp(this.y + (this.rand() * 2 - 1) * hop, this.zone.y, this.zone.y + this.zone.height),
				};
				this.play(`critter-${this.species}-move`);
			}
		}
	}
}
