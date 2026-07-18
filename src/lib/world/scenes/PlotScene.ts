/**
 * PlotScene.ts — The player's home plot (TASK-FUN-03: the real thing).
 *
 * Renders the authored base map (ground/paths/water/fence + props), plants
 * the user's learning trees at authored anchors, spawns their deterministic
 * critters, and hosts the two scripted moments:
 *
 *   1. GROWTH CELEBRATION — returning from a lesson: camera pans to the
 *      tree, it grows to its new stage (bounce + sparkle + chime), SunDrop
 *      tally toast fires via the EventBus. Always < 4s, can't be missed.
 *   2. ARRIVAL TUTORIAL — first ever visit: a guide NPC at the gate walks
 *      the kid to their first tree with 3 speech bubbles (Svelte overlays;
 *      text never enters the canvas, for i18n). Skippable.
 *
 * Data flow (see WorldCanvas.svelte):
 *   Svelte → Phaser: game registry — 'trees', 'avatarOptions', 'bus',
 *                    'plotSeed', 'showTutorial', 'celebration',
 *                    'tutorial-skip' (timestamp; Svelte skip button)
 *   Phaser → Svelte: EventBus — 'tree-selected', 'ground-tap',
 *                    'world-ready', 'celebration-done', 'tutorial-bubble',
 *                    'tutorial-done'
 */

import Phaser from 'phaser';
import type { TreeData } from '$lib/types/garden';
import type { WorldEventBus } from '../EventBus';
import {
	TEX,
	TILE_SIZE,
	WORLD_ZOOM,
	PLOT_MAP_KEY,
	growthStageToVisual,
} from '../assets';
import { AvatarSprite, createPlayerAvatar, registerAvatarTexture } from '../sprites/AvatarSprite';
import { TreeSprite } from '../sprites/TreeSprite';
import { CritterSprite, pickCritters, seededRandom, hashString } from '../sprites/CritterSprite';
import type { AvatarLayerRecipe } from '../sprites/lpcLayers';
import { playSound } from '$lib/services/soundService';

/** Celebration payload (mirrors garden/+page.ts GardenCelebration). */
interface Celebration {
	treeId: string;
	fromStage: number;
	toStage: number;
	sunDrops: number;
}

/**
 * The tutorial guide's fixed look: ranger vibes — blonde bob, green shirt,
 * blue feather cap. Distinct from most kid avatars (few pick this combo)
 * and reuses the standard compositing pipeline.
 */
const GUIDE_RECIPE: AvatarLayerRecipe = {
	layers: [
		'/assets/characters/body/light.png',
		'/assets/characters/legs/jeans.png',
		'/assets/characters/shirt/green.png',
		'/assets/characters/head/female/light.png',
		'/assets/characters/hair/bob/blonde.png',
		'/assets/characters/hat/cap.png',
	],
	key: 'npc-guide',
};

/** Guide walk speed during the tutorial (px/sec) — unhurried, followable. */
const GUIDE_SPEED = 80;

export class PlotScene extends Phaser.Scene {
	private player: AvatarSprite | null = null;
	private trees = new Map<string, TreeSprite>();
	private critters: CritterSprite[] = [];
	private anchors: { x: number; y: number }[] = [];
	private markers = new Map<string, { x: number; y: number }>();
	private colliders: Phaser.Physics.Arcade.StaticGroup | null = null;
	private fenceLayer: Phaser.Tilemaps.TilemapLayer | null = null;
	private waterLayer: Phaser.Tilemaps.TilemapLayer | null = null;
	private map: Phaser.Tilemaps.Tilemap | null = null;

	/** True while a scripted sequence owns the camera/input. */
	private cinematic = false;

	private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
	private wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | null = null;

	constructor() {
		super('plot');
	}

	private get bus(): WorldEventBus {
		return this.game.registry.get('bus') as WorldEventBus;
	}

	create(): void {
		this.buildMap();
		this.placeTrees((this.game.registry.get('trees') as TreeData[]) ?? []);
		this.spawnCritters();
		this.wireInput();

		// Svelte pushes fresh tree data after lessons/decay — refresh in place
		this.game.registry.events.on(
			'changedata-trees',
			(_p: unknown, trees: TreeData[]) => this.refreshTrees(trees ?? []),
			this
		);
		// Svelte's skip button (bubbles are DOM) ends the tutorial early
		this.game.registry.events.on('changedata-tutorial-skip', () => this.endTutorial(), this);

		this.spawnPlayerThen(() => {
			const celebration = this.game.registry.get('celebration') as Celebration | null;
			if (celebration && this.trees.has(celebration.treeId)) {
				this.runCelebration(celebration);
			} else if (this.game.registry.get('showTutorial') === true) {
				this.runTutorial();
			}
		});

		this.bus.emit('world-ready');
	}

	// ─────────────────────────────────────────────────────────────────────
	// MAP
	// ─────────────────────────────────────────────────────────────────────

	/**
	 * Instantiates the authored Tiled map: 4 tile layers, prop sprites from
	 * the object layer, and marker/anchor/zone lookups for later systems.
	 */
	private buildMap(): void {
		const map = this.make.tilemap({ key: PLOT_MAP_KEY });
		this.map = map;
		const tileset = map.addTilesetImage('terrain', TEX.terrain)!;

		map.createLayer('ground', tileset, 0, 0);
		map.createLayer('paths', tileset, 0, 0);
		this.waterLayer = map.createLayer('water', tileset, 0, 0)!;
		this.fenceLayer = map.createLayer('fence', tileset, 0, 0)!;

		// Fence + pond block movement. Trees deliberately don't — walking
		// behind them (depth-sorted) is half the charm of a 2D world.
		this.fenceLayer.setCollisionByExclusion([-1]);
		this.waterLayer.setCollisionByExclusion([-1]);

		// ── Props (house + wild flora) ────────────────────────────────────
		this.colliders = this.physics.add.staticGroup();
		for (const obj of map.getObjectLayer('props')?.objects ?? []) {
			const kind = (obj.properties as { name: string; value: string }[] | undefined)?.find(
				(p) => p.name === 'kind'
			)?.value;
			if (!kind) continue;

			const frameName = `prop-${kind}`;
			// Frame was registered on its source texture in BootScene; find it.
			// (Small linear scan over 4 textures beats a parallel lookup table
			// that could drift from PROP_FRAMES.)
			const texKey = [TEX.house, TEX.plants, TEX.terrain, TEX.treesGreen].find((t) =>
				this.textures.get(t).has(frameName)
			);
			if (!texKey) continue;

			const sprite = this.add
				.sprite(obj.x!, obj.y!, texKey, frameName)
				.setOrigin(0.5, 1) // authored coords are ground-contact points
				.setDepth(obj.y!);

			// The house is solid: an invisible static body over its wall
			// footprint (bottom half of the image; the roof overhangs).
			if (kind === 'house') {
				const zone = this.add.zone(obj.x!, obj.y! - 40, sprite.width - 44, 80);
				this.physics.add.existing(zone, true);
				this.colliders.add(zone as unknown as Phaser.GameObjects.GameObject);
			}
		}

		// ── Anchors + markers + critter zones ─────────────────────────────
		for (const obj of map.getObjectLayer('tree-anchors')?.objects ?? []) {
			this.anchors.push({ x: obj.x!, y: obj.y! });
		}
		for (const obj of map.getObjectLayer('markers')?.objects ?? []) {
			this.markers.set(obj.name!, { x: obj.x!, y: obj.y! });
		}

		// ── World bounds + camera ─────────────────────────────────────────
		const w = map.widthInPixels;
		const h = map.heightInPixels;
		this.physics.world.setBounds(0, 0, w, h);
		this.cameras.main.setBounds(0, 0, w, h);
		this.cameras.main.setZoom(WORLD_ZOOM);
		this.cameras.main.setRoundPixels(true);
	}

	// ─────────────────────────────────────────────────────────────────────
	// TREES
	// ─────────────────────────────────────────────────────────────────────

	/** Anchor for tree #i — wraps if a power-learner outgrows the orchard. */
	private anchorFor(index: number): { x: number; y: number } {
		return this.anchors[index % Math.max(this.anchors.length, 1)] ?? { x: 480, y: 300 };
	}

	private placeTrees(trees: TreeData[]): void {
		const celebration = this.game.registry.get('celebration') as Celebration | null;

		trees.forEach((tree, i) => {
			const anchor = this.anchorFor(i);
			// The celebrating tree renders at its PRE-lesson stage first —
			// the whole point is watching it grow to the new one.
			const data =
				celebration?.treeId === tree.id
					? { ...tree, growthStage: celebration.fromStage }
					: tree;
			this.trees.set(tree.id, new TreeSprite(this, anchor.x, anchor.y, data, this.bus));
		});
	}

	/** In-place refresh: re-skin existing, plant new at the next anchors. */
	private refreshTrees(trees: TreeData[]): void {
		trees.forEach((tree, i) => {
			const existing = this.trees.get(tree.id);
			if (existing) {
				existing.refresh(tree);
			} else {
				const anchor = this.anchorFor(i);
				this.trees.set(tree.id, new TreeSprite(this, anchor.x, anchor.y, tree, this.bus));
			}
		});
	}

	// ─────────────────────────────────────────────────────────────────────
	// CRITTERS
	// ─────────────────────────────────────────────────────────────────────

	/**
	 * Spawns this user's deterministic critter roster into the authored
	 * wander zones (round-robin). Same user → same animals, same first
	 * positions — "your garden has your animals".
	 */
	private spawnCritters(): void {
		const seed = (this.game.registry.get('plotSeed') as string) ?? 'plot-anon';
		const rand = seededRandom(hashString(seed));

		const zones = (this.map?.getObjectLayer('critter-zones')?.objects ?? []).map((o) => ({
			x: o.x!,
			y: o.y!,
			width: o.width!,
			height: o.height!,
		}));
		if (zones.length === 0) return;

		pickCritters(seed).forEach((species, i) => {
			const critter = new CritterSprite(this, species, zones[i % zones.length], rand);
			this.critters.push(critter);
		});
	}

	// ─────────────────────────────────────────────────────────────────────
	// PLAYER
	// ─────────────────────────────────────────────────────────────────────

	private spawnPlayerThen(next: () => void): void {
		const options = this.game.registry.get('avatarOptions');
		const spawn = this.markers.get('spawn') ?? { x: 480, y: 540 };

		createPlayerAvatar(this, spawn.x, spawn.y, options)
			.then((player) => {
				if (!this.sys || !this.sys.isActive()) {
					player.destroy();
					return;
				}
				this.player = player;
				player.setCollideWorldBounds(true);
				if (this.fenceLayer) this.physics.add.collider(player, this.fenceLayer);
				if (this.waterLayer) this.physics.add.collider(player, this.waterLayer);
				if (this.colliders) this.physics.add.collider(player, this.colliders);
				this.cameras.main.startFollow(player, true);
				next();
			})
			.catch((err) => {
				// A missing layer file must not white-screen the garden — log
				// loudly; the world stays explorable via taps on trees.
				console.error('[PlotScene] avatar compositing failed:', err);
			});
	}

	// ─────────────────────────────────────────────────────────────────────
	// GROWTH CELEBRATION
	// ─────────────────────────────────────────────────────────────────────

	/**
	 * The post-lesson payoff. Timeline (≈2.9s, spec budget < 4s):
	 *   0.0s  camera pans to the tree (0.7s)
	 *   0.9s  stage changed → bounce + texture swap + sparkles + chime
	 *         stage same    → gentle leaf-shimmer (still acknowledged)
	 *   2.1s  camera pans back to the player (0.6s)
	 *   2.9s  'celebration-done' → Svelte shows the SunDrop tally toast
	 */
	private runCelebration(c: Celebration): void {
		const tree = this.trees.get(c.treeId);
		const player = this.player;
		if (!tree || !player) return;

		this.cinematic = true;
		const cam = this.cameras.main;
		cam.stopFollow();
		cam.pan(tree.x, tree.y - 32, 700, 'Sine.easeInOut');

		const fromVisual = growthStageToVisual(c.fromStage);
		const toVisual = growthStageToVisual(c.toStage);
		const stageChanged = fromVisual !== toVisual;

		this.time.delayedCall(900, () => {
			if (stageChanged) {
				playSound('tree-grow');
				this.sparkleBurst(tree.x, tree.y - tree.displayHeight / 2, 18);
				// Squash… swap texture at the bottom of the squash… stretch.
				this.tweens.add({
					targets: tree,
					scaleX: 1.15,
					scaleY: 0.8,
					duration: 160,
					yoyo: true,
					ease: 'Sine.easeInOut',
					onYoyo: () => {
						const trees = (this.game.registry.get('trees') as TreeData[]) ?? [];
						const data = trees.find((t) => t.id === c.treeId);
						tree.setStageVisual(toVisual, data?.health ?? 100);
					},
					onComplete: () => {
						// Landing bounce — the "TA-DA"
						this.tweens.add({
							targets: tree,
							scaleX: 1.06,
							scaleY: 1.06,
							duration: 140,
							yoyo: true,
							ease: 'Back.easeOut',
						});
					},
				});
			} else {
				// No stage change — small shimmer so completion is still seen
				this.sparkleBurst(tree.x, tree.y - tree.displayHeight / 2, 7);
				this.tweens.add({
					targets: tree,
					scaleX: 1.04,
					scaleY: 1.04,
					duration: 220,
					yoyo: true,
					ease: 'Sine.easeInOut',
				});
			}

			this.time.delayedCall(1200, () => {
				cam.pan(player.x, player.y, 600, 'Sine.easeInOut', false, (_c, progress) => {
					if (progress === 1) {
						cam.startFollow(player, true);
						this.cinematic = false;
						this.bus.emit('celebration-done', { sunDrops: c.sunDrops });
					}
				});
			});
		});
	}

	/**
	 * A burst of tiny golden star particles. The 4px particle texture is
	 * generated once at runtime (it's an effect, not art — the no-procedural
	 * rule is about characters/world, not sparkles).
	 */
	private sparkleBurst(x: number, y: number, count: number): void {
		if (!this.textures.exists('sparkle')) {
			const g = this.make.graphics({ x: 0, y: 0 }, false);
			g.fillStyle(0xffe066, 1);
			g.fillCircle(2, 2, 2);
			g.generateTexture('sparkle', 4, 4);
			g.destroy();
		}
		const emitter = this.add.particles(x, y, 'sparkle', {
			speed: { min: 40, max: 110 },
			angle: { min: 0, max: 360 },
			gravityY: 90,
			lifespan: { min: 500, max: 900 },
			scale: { start: 1.4, end: 0 },
			quantity: count,
			emitting: false,
		});
		emitter.setDepth(10_000); // above everything — it's the show
		emitter.explode(count);
		this.time.delayedCall(1000, () => emitter.destroy());
	}

	// ─────────────────────────────────────────────────────────────────────
	// ARRIVAL TUTORIAL
	// ─────────────────────────────────────────────────────────────────────

	/** Tutorial progress: -1 = not running, 0..2 = bubble index shown. */
	private tutorialStep = -1;
	private guide: Phaser.GameObjects.Sprite | null = null;

	/**
	 * First-visit walkthrough. Each tap advances (the whole screen is the
	 * "next" button — kids tap anywhere); the Svelte overlay's Skip button
	 * jumps straight to the end. Bubble text lives in Svelte for i18n; the
	 * scene only reports WHERE to point the bubble (screen coords).
	 */
	private async runTutorial(): Promise<void> {
		const guidePos = this.markers.get('guide');
		const firstAnchor = this.anchors[0];
		if (!guidePos || !firstAnchor) return;

		this.cinematic = true;
		await registerAvatarTexture(this, GUIDE_RECIPE);
		if (!this.sys?.isActive()) return;

		this.guide = this.add
			.sprite(guidePos.x, guidePos.y, GUIDE_RECIPE.key, 2 * 9) // standing, facing camera
			.setOrigin(0.5, 1)
			.setDepth(guidePos.y);

		this.tutorialStep = 0;
		// One-frame delay: the camera's worldView is only valid after its
		// first preRender — an immediate emit would place the bubble at 0,0.
		this.time.delayedCall(60, () => this.emitBubble(0));
	}

	/** Advances on any tap while the tutorial owns input. */
	private advanceTutorial(): void {
		if (this.tutorialStep < 0 || !this.guide) return;

		if (this.tutorialStep === 0) {
			// Guide walks from the gate to the first tree; camera follows it
			this.tutorialStep = 1;
			this.bus.emit('tutorial-bubble', null);
			const target = { x: this.anchors[0].x + 24, y: this.anchors[0].y + 20 };
			const dist = Phaser.Math.Distance.Between(this.guide.x, this.guide.y, target.x, target.y);
			const duration = (dist / GUIDE_SPEED) * 1000;

			this.guide.play(`${GUIDE_RECIPE.key}-walk-up`, true);
			this.cameras.main.stopFollow();
			this.cameras.main.pan(target.x, target.y, duration, 'Sine.easeInOut');
			this.tweens.add({
				targets: this.guide,
				x: target.x,
				y: target.y,
				duration,
				ease: 'Linear',
				onUpdate: () => this.guide?.setDepth(this.guide.y),
				onComplete: () => {
					this.guide?.anims.stop();
					this.guide?.setFrame(2 * 9); // face the camera again
					this.emitBubble(1);
				},
			});
		} else if (this.tutorialStep === 1) {
			this.tutorialStep = 2;
			this.emitBubble(2);
		} else {
			this.endTutorial();
		}
	}

	/** Ends the tutorial: guide waves off through the gate, flag persists. */
	private endTutorial(): void {
		if (this.tutorialStep < 0) return;
		this.tutorialStep = -1;
		this.bus.emit('tutorial-bubble', null);

		const gate = this.markers.get('gate');
		const guide = this.guide;
		if (guide && gate) {
			guide.play(`${GUIDE_RECIPE.key}-walk-down`, true);
			this.tweens.add({
				targets: guide,
				x: gate.x,
				y: gate.y,
				alpha: 0.2,
				duration: 1400,
				ease: 'Sine.easeIn',
				onComplete: () => guide.destroy(),
			});
		}
		this.guide = null;

		// Camera home to the player
		if (this.player) {
			this.cameras.main.pan(this.player.x, this.player.y, 500, 'Sine.easeInOut', false, (_c, p) => {
				if (p === 1 && this.player) {
					this.cameras.main.startFollow(this.player, true);
					this.cinematic = false;
				}
			});
		} else {
			this.cinematic = false;
		}

		this.bus.emit('tutorial-done');
	}

	/** Emits a bubble event with the guide's current SCREEN position. */
	private emitBubble(step: number): void {
		if (!this.guide) return;
		const cam = this.cameras.main;
		// world → screen: subtract camera view origin, multiply by zoom
		const screenX = (this.guide.x - cam.worldView.x) * cam.zoom;
		const screenY = (this.guide.y - this.guide.displayHeight - cam.worldView.y) * cam.zoom;
		this.bus.emit('tutorial-bubble', { step, screenX, screenY });
	}

	// ─────────────────────────────────────────────────────────────────────
	// INPUT + UPDATE
	// ─────────────────────────────────────────────────────────────────────

	private wireInput(): void {
		if (this.input.keyboard) {
			this.cursors = this.input.keyboard.createCursorKeys();
			this.wasd = this.input.keyboard.addKeys('W,A,S,D') as PlotScene['wasd'];
		}

		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			// During the tutorial, any tap advances the script instead of walking
			if (this.tutorialStep >= 0) {
				this.advanceTutorial();
				return;
			}
			if (this.cinematic) return; // celebrations ignore taps

			const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
			this.player?.walkTo(world.x, world.y);
			this.bus.emit('ground-tap', {
				tileX: Math.floor(world.x / TILE_SIZE),
				tileY: Math.floor(world.y / TILE_SIZE),
			});
		});
	}

	update(_time: number, delta: number): void {
		const dt = delta / 1000;
		for (const critter of this.critters) critter.update(dt);

		if (!this.player || this.cinematic) return;
		this.player.update({
			up: (this.cursors?.up.isDown ?? false) || (this.wasd?.W.isDown ?? false),
			down: (this.cursors?.down.isDown ?? false) || (this.wasd?.S.isDown ?? false),
			left: (this.cursors?.left.isDown ?? false) || (this.wasd?.A.isDown ?? false),
			right: (this.cursors?.right.isDown ?? false) || (this.wasd?.D.isDown ?? false),
		});
	}
}
