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
} as const;

/** URL paths (relative to site root — files live in static/assets/). */
export const ASSET_PATHS: Record<string, string> = {
	[TEX.terrain]: '/assets/tiles/terrain_atlas.png',
	[TEX.treesGreen]: '/assets/props/trees-green.png',
	[TEX.treesPale]: '/assets/props/trees-pale.png',
	[TEX.treesDead]: '/assets/props/trees-dead.png',
};

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
// TREE FRAMES (named crop regions inside the trees-* sheets)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Growth-stage frames, cropped from the 1024×1024 LPC Trees sheets.
 * Same coordinates apply to green/pale/dead variants (identical layout).
 *
 * Coordinates were located visually on the sheet:
 *   sapling — small tree, top-left corner
 *   young   — medium round tree, second row
 *   mature  — large classic oak, second row right
 */
export const TREE_FRAMES = {
	sapling: { x: 0, y: 0, w: 64, h: 64 },
	young: { x: 128, y: 96, w: 96, h: 128 },
	mature: { x: 320, y: 96, w: 112, h: 128 },
} as const;

export type TreeFrameName = keyof typeof TREE_FRAMES;

/**
 * Maps a tree's growth stage (0–14, from sunDropService.calculateGrowthStage)
 * to a visual frame. Coarse 3-tier mapping is a TASK-FUN-02 placeholder —
 * TASK-FUN-03 replaces it with per-stage sprites and growth celebrations.
 */
export function growthStageToFrame(growthStage: number): TreeFrameName {
	if (growthStage >= 10) return 'mature';
	if (growthStage >= 5) return 'young';
	return 'sapling';
}

/**
 * Maps tree health (0–100) to a tree sheet variant.
 * Thresholds mirror treeHealthService's display tiers: the kid should see a
 * clearly struggling tree well before it "dies" (SRS decay motivator).
 */
export function healthToTreeTexture(health: number): string {
	if (health >= 60) return TEX.treesGreen;
	if (health >= 30) return TEX.treesPale;
	return TEX.treesDead;
}

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
