/**
 * assets.ts — Single source of truth for every world asset path and
 * every magic coordinate inside those assets.
 *
 * WHY one manifest file (TASK-FUN-02):
 * Phaser refers to assets by string keys. If keys/paths are scattered across
 * scenes, a typo fails silently at runtime (black rectangle). Centralising
 * them here means:
 *   1. A unit test can fs-check that every path exists in static/ (see
 *      src/tests/world/assets.test.ts).
 *   2. Later tasks (home plot, shared world, battles) import the SAME keys.
 *
 * Licences for everything referenced here: static/assets/CREDITS.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// TEXTURE KEYS + FILES (loaded by BootScene)
// ─────────────────────────────────────────────────────────────────────────────

/** Phaser texture keys — use these constants, never raw strings. */
export const TEX = {
	/** LPC Tile Atlas — 32×32 terrain tiles (1024×1024 = 32 cols × 32 rows) */
	terrain: 'terrain',
	/** LPC Trees sheet — healthy (green) variant */
	treesGreen: 'trees-green',
	/** LPC Trees sheet — struggling (pale autumn) variant */
	treesPale: 'trees-pale',
	/** LPC Trees sheet — critical (dead) variant */
	treesDead: 'trees-dead',
	/** LPC flora compilation (flowers, reeds, stumps, logs, mushrooms) */
	plants: 'plants',
	/** Baked thatched cottage (assembled from LPC cottage pieces) */
	house: 'house',
	/** Reorganised LPC rabbit — 32px frames, 3 cols × 4 rows */
	rabbit: 'rabbit',
	/** LPC birds — 32px frames, 3 cols × 8 rows */
	birdRobin: 'bird-robin',
	birdBluejay: 'bird-bluejay',
} as const;

/** URL paths (relative to site root — files live in static/assets/). */
export const ASSET_PATHS: Record<string, string> = {
	[TEX.terrain]: '/assets/tiles/terrain_atlas.png',
	[TEX.treesGreen]: '/assets/props/trees-green.png',
	[TEX.treesPale]: '/assets/props/trees-pale.png',
	[TEX.treesDead]: '/assets/props/trees-dead.png',
	[TEX.plants]: '/assets/props/plants.png',
	[TEX.house]: '/assets/props/house.png',
	[TEX.rabbit]: '/assets/props/rabbit.png',
	[TEX.birdRobin]: '/assets/props/bird-robin.png',
	[TEX.birdBluejay]: '/assets/props/bird-bluejay.png',
};

/** The authored home-plot base map (see scripts/generate-plot-map.mjs). */
export const PLOT_MAP_KEY = 'plot-base';
export const PLOT_MAP_PATH = '/maps/plot-base.json';

// ─────────────────────────────────────────────────────────────────────────────
// TILE GEOMETRY (locked decision — LPC terrain ships on a 32px grid)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base tile size in source pixels.
 *
 * DEVIATION from the task doc's "16px": the doc assumed LPC/Kenney terrain is
 * 16px, but the LPC Tile Atlas (and all LPC terrain) is authored on a 32px
 * grid, and LPC characters (64×64 frames) are proportioned for it — a
 * character stands ~1.5 tiles tall on 32px tiles. Using 16px tiles would
 * force non-LPC terrain that clashes with the LPC characters.
 * Recorded in the task doc's completion notes.
 */
export const TILE_SIZE = 32;

/**
 * Camera zoom. 32px × 2 = 64 screen pixels per tile — the same on-screen
 * chunkiness the doc's "16px × 3" aimed for (48px), rounded up to keep
 * pixel-perfect integer scaling (non-integer zoom shimmers with pixelArt).
 */
export const WORLD_ZOOM = 2;

/** terrain_atlas.png is a 32×32 grid of tiles → 32 tiles per row. */
export const ATLAS_COLS = 32;

/**
 * Tile indices into terrain_atlas.png (index = row * ATLAS_COLS + col).
 * Verified visually against the atlas (see TASK-FUN-02 notes):
 *   grass  = plain interior tile at (col 1,  row 23)
 *   dirt   = plain path tile at    (col 9,  row 22)
 *   fenceH = horizontal wood rail  (col 13, row 18)
 *   fenceP = rail with post        (col 14, row 18)
 */
export const TILE = {
	grass: 23 * ATLAS_COLS + 1, // 737
	dirt: 22 * ATLAS_COLS + 9, // 713
	fenceH: 18 * ATLAS_COLS + 13, // 589
	fenceP: 18 * ATLAS_COLS + 14, // 590
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TREE GROWTH VISUALS (TASK-FUN-03 — 5 readable stages + wilt variants)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 5 visual growth tiers, in order. Kid-readable from across the plot:
 *   seed     — dirt mound (terrain atlas farm tile)
 *   sprout   — green shoots (terrain atlas farm tile)
 *   sapling  — small tree (LPC Trees sheet)
 *   healthy  — medium round tree
 *   blooming — large classic oak
 */
export const TREE_STAGES = ['seed', 'sprout', 'sapling', 'healthy', 'blooming'] as const;
export type TreeStageName = (typeof TREE_STAGES)[number];

/**
 * Frame rects for the tree stages that come from the LPC Trees sheets
 * (1024×1024; same layout in green/pale/dead variants).
 */
export const TREE_FRAMES = {
	sapling: { x: 0, y: 0, w: 64, h: 64 },
	healthy: { x: 128, y: 96, w: 96, h: 128 },
	blooming: { x: 320, y: 96, w: 112, h: 128 },
} as const;

/**
 * Frame rects for seed/sprout — farm tiles inside the TERRAIN atlas
 * (mound at atlas (288,928), shoots at (288,800); verified visually).
 * These stages have no wilt variant — a seed can't droop; wilting starts
 * once there's an actual plant (sapling+).
 */
export const TREE_EARLY_FRAMES = {
	seed: { x: 288, y: 928, w: 32, h: 32 },
	sprout: { x: 288, y: 800, w: 32, h: 32 },
} as const;

/**
 * Maps a tree's growth stage (0–14, from sunDropService.calculateGrowthStage)
 * to one of the 5 visual tiers. Early stages are deliberately short (0–1 and
 * 2–3) so a brand-new learner sees visible progress within their first two
 * lessons — the strongest retention window we have.
 */
export function growthStageToVisual(growthStage: number): TreeStageName {
	if (growthStage >= 11) return 'blooming';
	if (growthStage >= 7) return 'healthy';
	if (growthStage >= 4) return 'sapling';
	if (growthStage >= 2) return 'sprout';
	return 'seed';
}

/**
 * Maps tree health (0–100) to a tree sheet variant.
 * Thresholds mirror treeHealthService's display tiers: the kid should see a
 * clearly struggling tree well before it "dies" (SRS decay motivator).
 * The wilt threshold (health < 31 → dead sheet) matches the task spec.
 */
export function healthToTreeTexture(health: number): string {
	if (health >= 60) return TEX.treesGreen;
	if (health >= 31) return TEX.treesPale;
	return TEX.treesDead;
}

/** A tree "needs water" (shows the 💧 puff) below this health. */
export const NEEDS_WATER_HEALTH = 60;

// ─────────────────────────────────────────────────────────────────────────────
// PROP FRAMES (wild flora — crop rects on the plants sheet / trees sheet)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Frame rects for plot props, keyed by the `kind` property authored in
 * plot-base.json. `tex` names the source texture; rects were located
 * visually on the sheets (see TASK-FUN-03 notes).
 */
export const PROP_FRAMES: Record<string, { tex: string; x: number; y: number; w: number; h: number }> = {
	house: { tex: TEX.house, x: 0, y: 0, w: 152, h: 196 },
	'flower-red': { tex: TEX.plants, x: 96, y: 96, w: 32, h: 32 },
	'flower-blue': { tex: TEX.plants, x: 224, y: 128, w: 32, h: 32 },
	sunflower: { tex: TEX.plants, x: 144, y: 160, w: 32, h: 48 },
	reeds: { tex: TEX.plants, x: 32, y: 424, w: 32, h: 56 },
	lily: { tex: TEX.plants, x: 0, y: 484, w: 40, h: 36 },
	stump: { tex: TEX.plants, x: 0, y: 796, w: 44, h: 44 },
	log: { tex: TEX.plants, x: 0, y: 860, w: 92, h: 56 },
	mushrooms: { tex: TEX.plants, x: 96, y: 704, w: 32, h: 32 },
	bush: { tex: TEX.plants, x: 208, y: 700, w: 56, h: 52 },
	rock: { tex: TEX.terrain, x: 896, y: 704, w: 32, h: 32 },
};

// ─────────────────────────────────────────────────────────────────────────────
// LPC CHARACTER SHEET GEOMETRY (shared by compositor + AvatarSprite)
// ─────────────────────────────────────────────────────────────────────────────

/** One LPC animation frame is 64×64 source pixels. */
export const LPC_FRAME = 64;

/** LPC sheets are 13 frames wide (832px). */
export const LPC_SHEET_COLS = 13;

/**
 * The walk animation band inside every LPC "universal" sheet:
 * rows 8–11 (up, left, down, right), 9 frames per row (col 0 = standing).
 *
 * WHY we composite ONLY this band: our layer PNGs come in two heights
 * (classic 21-row = 1344px, expanded 46-row = 2944px) but rows 0–20 are
 * identical in both layouts, so cropping the walk band (y = 8×64 = 512,
 * height 4×64 = 256) works for every sheet regardless of layout.
 * It also keeps the composited texture small (832×256 per avatar).
 */
export const LPC_WALK_BAND_Y = 8 * LPC_FRAME; // 512
export const LPC_WALK_ROWS = 4;
export const LPC_WALK_FRAMES = 9; // col 0 = idle stance, cols 1–8 = the cycle

/** Row order within the walk band — fixed by the LPC standard. */
export const LPC_WALK_DIRECTIONS = ['up', 'left', 'down', 'right'] as const;
export type LPCDirection = (typeof LPC_WALK_DIRECTIONS)[number];
