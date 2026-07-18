/**
 * PlotScene.ts — The player's home plot: a fenced grass field with their
 * learning trees and walkable avatar.
 *
 * TASK-FUN-02 scope: this is the PROOF of the 2D stack — real terrain tiles,
 * real fence with collision, tree sprites driven by TreeData, composited
 * avatar with keyboard + tap movement. TASK-FUN-03 turns it into a lived-in
 * home plot (flora, paths, house, growth celebrations).
 *
 * Data flow (see WorldCanvas.svelte):
 *   Svelte → Phaser: game.registry 'trees' / 'avatarOptions'
 *                    (+ 'changedata-trees' event for live updates)
 *   Phaser → Svelte: EventBus 'tree-selected' / 'ground-tap' / 'world-ready'
 */

import Phaser from 'phaser';
import type { TreeData } from '$lib/types/garden';
import type { WorldEventBus } from '../EventBus';
import {
	TEX,
	TILE,
	TILE_SIZE,
	WORLD_ZOOM,
	ATLAS_COLS,
	growthStageToFrame,
	healthToTreeTexture,
} from '../assets';
import { AvatarSprite, createPlayerAvatar } from '../sprites/AvatarSprite';

// ── Plot geometry (tiles) ────────────────────────────────────────────────────

/** Plot size in tiles. 24×18 = 768×576 world px — fills a phone screen at
 *  zoom 2 with room to wander, small enough to feel like "my plot". */
const PLOT_COLS = 24;
const PLOT_ROWS = 18;

/**
 * Tree positions: TreeData.positionX/Y are legacy 3D metres centred on the
 * garden origin (±6 range). We map 1 metre → 1 tile around the plot centre.
 * Trees that land on the SAME tile (all V1 trees were created at 0,0) are
 * spread along a row so every tree stays visible and tappable.
 */
const PLOT_CENTER_X = PLOT_COLS / 2;
const PLOT_CENTER_Y = PLOT_ROWS / 2 - 2; // slightly above centre — leaves foreground to walk in

export class PlotScene extends Phaser.Scene {
	private player: AvatarSprite | null = null;
	private treeSprites: Phaser.GameObjects.Sprite[] = [];
	private fenceLayer: Phaser.Tilemaps.TilemapLayer | null = null;

	/** Aggregated key state — arrows + WASD merged. */
	private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
	private wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | null = null;

	constructor() {
		super('plot');
	}

	/** The bus is injected via the game registry by WorldCanvas. */
	private get bus(): WorldEventBus {
		return this.game.registry.get('bus') as WorldEventBus;
	}

	create(): void {
		this.buildTerrain();
		this.buildTrees(this.game.registry.get('trees') as TreeData[] ?? []);
		this.spawnPlayer();
		this.wireInput();

		// Svelte can push fresh tree data (e.g. after a lesson) — rebuild sprites.
		this.game.registry.events.on('changedata-trees', (_parent: unknown, trees: TreeData[]) => {
			this.buildTrees(trees ?? []);
		});

		this.bus.emit('world-ready');
	}

	// ─────────────────────────────────────────────────────────────────────
	// TERRAIN
	// ─────────────────────────────────────────────────────────────────────

	/**
	 * Ground + fence from the LPC terrain atlas via a data-driven tilemap.
	 *
	 * WHY array data instead of a Tiled JSON for this scene: the placeholder
	 * plot is a uniform field with a perimeter — 10 lines of code. The Tiled
	 * pipeline arrives with TASK-FUN-03's hand-authored home plot, where a
	 * visual editor actually pays off.
	 */
	private buildTerrain(): void {
		// Ground layer: all grass
		const ground: number[][] = Array.from({ length: PLOT_ROWS }, () =>
			Array.from({ length: PLOT_COLS }, () => TILE.grass)
		);

		// Fence layer: perimeter ring, -1 = empty. Horizontal rails on top &
		// bottom edges; rail-with-post on the sides for visual variety.
		const fence: number[][] = Array.from({ length: PLOT_ROWS }, (_, row) =>
			Array.from({ length: PLOT_COLS }, (_, col) => {
				const edge = row === 0 || row === PLOT_ROWS - 1 || col === 0 || col === PLOT_COLS - 1;
				if (!edge) return -1;
				// Corners and verticals get the post tile, top/bottom runs the rail
				const isPost = col === 0 || col === PLOT_COLS - 1 || (col + row) % 4 === 0;
				return isPost ? TILE.fenceP : TILE.fenceH;
			})
		);

		const map = this.make.tilemap({
			data: ground,
			tileWidth: TILE_SIZE,
			tileHeight: TILE_SIZE,
		});
		// The atlas image doubles as the tileset; 32 columns of 32px tiles.
		const tileset = map.addTilesetImage(TEX.terrain, TEX.terrain, TILE_SIZE, TILE_SIZE)!;
		map.createLayer(0, tileset, 0, 0);

		// Second map for the fence (Phaser data-maps are single-layer)
		const fenceMap = this.make.tilemap({
			data: fence,
			tileWidth: TILE_SIZE,
			tileHeight: TILE_SIZE,
		});
		const fenceTiles = fenceMap.addTilesetImage(TEX.terrain, TEX.terrain, TILE_SIZE, TILE_SIZE)!;
		this.fenceLayer = fenceMap.createLayer(0, fenceTiles, 0, 0)!;
		// Every non-empty fence tile blocks movement
		this.fenceLayer.setCollisionByExclusion([-1]);

		// Camera + physics world both end at the plot edge
		const w = PLOT_COLS * TILE_SIZE;
		const h = PLOT_ROWS * TILE_SIZE;
		this.physics.world.setBounds(0, 0, w, h);
		this.cameras.main.setBounds(0, 0, w, h);
		this.cameras.main.setZoom(WORLD_ZOOM);
		// Integer positions only — avoids sub-pixel shimmer on pixel art
		this.cameras.main.setRoundPixels(true);
	}

	// ─────────────────────────────────────────────────────────────────────
	// TREES
	// ─────────────────────────────────────────────────────────────────────

	/**
	 * (Re)builds tree sprites from TreeData. Called at create and whenever
	 * Svelte pushes fresh data (post-lesson growth/health changes).
	 */
	private buildTrees(trees: TreeData[]): void {
		// Throw away the old sprites — tree counts are tiny (≤ ~6 per plot),
		// so rebuild-from-scratch is simpler and safer than diffing.
		for (const sprite of this.treeSprites) sprite.destroy();
		this.treeSprites = [];

		// Track occupied tiles so stacked trees (legacy all-at-0,0 data)
		// spread rightward instead of rendering inside each other.
		const occupied = new Set<string>();

		trees.forEach((tree) => {
			let tileX = Math.round(PLOT_CENTER_X + tree.positionX);
			const tileY = Math.round(PLOT_CENTER_Y + tree.positionY);
			while (occupied.has(`${tileX},${tileY}`)) tileX += 3; // 3 tiles ≈ one mature canopy
			occupied.add(`${tileX},${tileY}`);

			const sprite = this.add
				.sprite(
					tileX * TILE_SIZE + TILE_SIZE / 2,
					tileY * TILE_SIZE + TILE_SIZE, // trunk base sits on the tile's bottom edge
					healthToTreeTexture(tree.health),
					growthStageToFrame(tree.growthStage)
				)
				.setOrigin(0.5, 1) // origin at trunk base → correct depth sorting
				.setDepth(tileY * TILE_SIZE + TILE_SIZE);

			// Generous hit area: the whole frame is tappable (kid-sized targets)
			sprite.setInteractive({ useHandCursor: true });
			sprite.on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
				// Trees swallow the tap — without this the scene-level handler
				// would ALSO fire and walk the avatar into the tree.
				event.stopPropagation();
				this.bus.emit('tree-selected', tree.id);
			});

			this.treeSprites.push(sprite);
		});
	}

	// ─────────────────────────────────────────────────────────────────────
	// PLAYER
	// ─────────────────────────────────────────────────────────────────────

	/**
	 * Spawns the composited avatar. Async because compositing awaits image
	 * decodes — the world renders immediately and the avatar pops in a few
	 * frames later (local files, imperceptible in practice).
	 */
	private spawnPlayer(): void {
		const options = this.game.registry.get('avatarOptions');
		const spawnX = (PLOT_CENTER_X + 0.5) * TILE_SIZE;
		const spawnY = (PLOT_CENTER_Y + 4) * TILE_SIZE; // in front of the trees

		createPlayerAvatar(this, spawnX, spawnY, options)
			.then((player) => {
				// Scene may have been destroyed during the await (fast nav away)
				if (!this.sys || !this.sys.isActive()) {
					player.destroy();
					return;
				}
				this.player = player;
				player.setCollideWorldBounds(true);
				if (this.fenceLayer) this.physics.add.collider(player, this.fenceLayer);
				this.cameras.main.startFollow(player, true);
			})
			.catch((err) => {
				// A missing layer file must not white-screen the garden — log
				// loudly; the world stays explorable via taps on trees.
				console.error('[PlotScene] avatar compositing failed:', err);
			});
	}

	// ─────────────────────────────────────────────────────────────────────
	// INPUT
	// ─────────────────────────────────────────────────────────────────────

	private wireInput(): void {
		if (this.input.keyboard) {
			this.cursors = this.input.keyboard.createCursorKeys();
			this.wasd = this.input.keyboard.addKeys('W,A,S,D') as PlotScene['wasd'];
		}

		// Tap/click on open ground → walk there (trees stopPropagation above)
		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
			this.player?.walkTo(world.x, world.y);
			this.bus.emit('ground-tap', {
				tileX: Math.floor(world.x / TILE_SIZE),
				tileY: Math.floor(world.y / TILE_SIZE),
			});
		});
	}

	update(): void {
		if (!this.player) return;
		this.player.update({
			up: (this.cursors?.up.isDown ?? false) || (this.wasd?.W.isDown ?? false),
			down: (this.cursors?.down.isDown ?? false) || (this.wasd?.S.isDown ?? false),
			left: (this.cursors?.left.isDown ?? false) || (this.wasd?.A.isDown ?? false),
			right: (this.cursors?.right.isDown ?? false) || (this.wasd?.D.isDown ?? false),
		});
	}
}
