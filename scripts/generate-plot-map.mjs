/**
 * generate-plot-map.mjs — Authors static/maps/plot-base.json (TASK-FUN-03).
 *
 * The home plot base map every user shares: terrain, paths, pond, fence with
 * a gate, and object layers for props / tree anchors / spawn / critter zones.
 * Personalisation (trees, decorations) renders ON TOP at runtime.
 *
 * WHY a generator script instead of hand-editing in the Tiled app:
 * the output IS standard Tiled JSON — it opens in Tiled for future manual
 * polish — but a script keeps the layout reviewable in git, repeatable, and
 * lets us reference tile indices from one place. Run after any change:
 *
 *   node scripts/generate-plot-map.mjs
 *
 * Tile indices refer to static/assets/tiles/terrain_atlas.png (32px grid,
 * 32 columns). They MUST stay in sync with src/lib/world/assets.ts (TILE),
 * which the unit tests cross-check against this file's output.
 */

import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../static/maps/plot-base.json');

// ── Map dimensions ──────────────────────────────────────────────────────────
const COLS = 30;
const ROWS = 22;
const TILE = 32;

// ── Terrain atlas tile indices (index = row * 32 + col) ────────────────────
const ATLAS_COLS = 32;
const idx = (col, row) => row * ATLAS_COLS + col;

const T = {
	grass: idx(1, 23), // plain grass interior (verified TASK-FUN-02)
	dirt: idx(9, 22), // plain dirt path
	fenceH: idx(13, 18), // horizontal wood rail
	fenceP: idx(14, 18), // rail with post
	// 3×3 rounded pond with earthen bank — block top-left at atlas (9,11)
	pond: [
		[idx(9, 11), idx(10, 11), idx(11, 11)],
		[idx(9, 12), idx(10, 12), idx(11, 12)],
		[idx(9, 13), idx(10, 13), idx(11, 13)],
	],
	// Farm tiles used as tree stage art (seed mound / sprout) — see assets.ts
};

// ── Layer builders ──────────────────────────────────────────────────────────

/** Creates a COLS×ROWS grid filled with one tile index (or -1 = empty). */
const grid = (fill) => Array.from({ length: ROWS }, () => Array(COLS).fill(fill));

/** Flattens a grid to Tiled's data array (gid = index + firstgid(1); 0 = empty). */
const flatten = (g) => g.flat().map((i) => (i < 0 ? 0 : i + 1));

// GROUND: all grass.
const ground = grid(T.grass);

// PATHS: dirt trail from the gate (bottom centre) up to a junction, then
// west to the house door. Two tiles wide so the avatar isn't pixel-hunting.
const paths = grid(-1);
const GATE_COLS = [14, 15]; // fence gap columns
// Vertical: single-tile trail (col 15) widening to the 2-tile gate mouth —
// full-width dirt read as "mud slab" in playtest screenshots, a narrow
// winding trail reads as a garden path.
for (let row = 12; row <= ROWS - 1; row++) paths[row][15] = T.dirt;
for (const col of GATE_COLS) for (const row of [ROWS - 2, ROWS - 1]) paths[row][col] = T.dirt;
// Branch west to the house door — single tile, row 12
for (let col = 8; col <= 15; col++) paths[12][col] = T.dirt;

// WATER: pond overlay in the south-east corner (its tiles have transparent
// corners, so it sits on a layer above grass). Separate layer because the
// whole pond is a collision zone (kids can't swim… yet).
const water = grid(-1);
const POND = { col: 24, row: 16 };
for (let r = 0; r < 3; r++)
	for (let c = 0; c < 3; c++) water[POND.row + r][POND.col + c] = T.pond[r][c];

// FENCE: perimeter ring with a 2-tile gate gap at the bottom of the path.
const fence = grid(-1);
for (let col = 0; col < COLS; col++) {
	fence[0][col] = (col + 0) % 4 === 0 ? T.fenceP : T.fenceH;
	if (!GATE_COLS.includes(col)) fence[ROWS - 1][col] = col % 4 === 0 ? T.fenceP : T.fenceH;
}
for (let row = 1; row < ROWS - 1; row++) {
	fence[row][0] = T.fenceP;
	fence[row][COLS - 1] = T.fenceP;
}
// Gate posts either side of the gap so the opening reads as intentional
fence[ROWS - 1][GATE_COLS[0] - 1] = T.fenceP;
fence[ROWS - 1][GATE_COLS[1] + 1] = T.fenceP;

// ── Object layers ───────────────────────────────────────────────────────────
// Coordinates in PIXELS (Tiled convention). Point objects: x,y = the point.

let objectId = 1;
const point = (name, tileX, tileY, properties = {}) => ({
	id: objectId++,
	name,
	point: true,
	x: tileX * TILE,
	y: tileY * TILE,
	visible: true,
	rotation: 0,
	properties: Object.entries(properties).map(([name, value]) => ({
		name,
		type: typeof value === 'number' ? 'float' : 'string',
		value,
	})),
});
const rect = (name, tileX, tileY, tilesW, tilesH) => ({
	id: objectId++,
	name,
	x: tileX * TILE,
	y: tileY * TILE,
	width: tilesW * TILE,
	height: tilesH * TILE,
	visible: true,
	rotation: 0,
});

/**
 * PROPS — wild flora + the house. `kind` maps to a frame in assets.ts
 * (PROP_FRAMES). x,y = where the prop's BOTTOM-CENTRE sits (feels natural
 * when placing "on the ground" and matches sprite origin (0.5, 1)).
 *
 * Placement notes (the "feels placed, not random" criterion):
 * - House top-west with its door opening onto the path junction
 * - Pond corner gets reeds + lilies, log nearby as a "sitting spot"
 * - Flower clusters flank the gate and the path junction
 * - Stump/rocks/mushrooms scattered along the fence line
 */
const props = [
	point('house', 6.5, 7.2, { kind: 'house' }),
	// Pond dressing (south-east)
	point('reeds-1', 23.4, 18.4, { kind: 'reeds' }),
	point('reeds-2', 27.3, 17.2, { kind: 'reeds' }),
	point('lily', 24.6, 16.4, { kind: 'lily' }),
	point('log', 21.5, 19.6, { kind: 'log' }),
	// Gate flowers (bottom centre)
	point('flowers-gate-w', 12.5, 20.6, { kind: 'flower-red' }),
	point('flowers-gate-e', 17.5, 20.6, { kind: 'flower-blue' }),
	// Path junction / house garden
	point('sunflower-1', 10.5, 11.4, { kind: 'sunflower' }),
	point('sunflower-2', 3.4, 8.2, { kind: 'sunflower' }),
	point('flowers-house', 9.2, 8.5, { kind: 'flower-red' }),
	// Wild corners
	point('bush-nw', 2.3, 3.1, { kind: 'bush' }),
	point('bush-ne', 26.5, 2.8, { kind: 'bush' }),
	point('bush-se', 20.4, 16.3, { kind: 'bush' }),
	point('stump', 25.2, 9.4, { kind: 'stump' }),
	point('rock-1', 4.4, 17.5, { kind: 'rock' }),
	point('rock-2', 3.1, 18.3, { kind: 'rock' }),
	point('mushrooms', 5.6, 16.8, { kind: 'mushrooms' }),
	point('flower-wild-1', 22.6, 4.5, { kind: 'flower-blue' }),
	point('flower-wild-2', 7.5, 13.7, { kind: 'flower-red' }),
];

/**
 * TREE ANCHORS — where learning trees plant themselves, in creation order.
 * A loose orchard: first tree front-and-centre (the tutorial walks here),
 * later trees fill the east meadow then the west.
 */
const treeAnchors = [
	point('anchor-0', 15.0, 8.5),
	point('anchor-1', 19.5, 6.5),
	point('anchor-2', 11.5, 6.0),
	point('anchor-3', 23.0, 9.5),
	point('anchor-4', 17.5, 12.5),
	point('anchor-5', 21.0, 14.0),
	point('anchor-6', 13.0, 15.5),
	point('anchor-7', 26.0, 5.5),
	point('anchor-8', 8.5, 17.0),
	point('anchor-9', 5.0, 12.0),
];

const markers = [
	point('spawn', 15.0, 17.0), // on the path, just inside the gate
	point('gate', 15.0, 21.0),
	point('guide', 13.2, 18.2), // tutorial NPC waits beside the gate path
];

// Critters wander the open meadow — kept away from the house/pond corners
const critterZones = [rect('meadow', 2, 2, 26, 12), rect('south-lawn', 2, 14, 18, 6)];

// ── Assemble Tiled JSON ─────────────────────────────────────────────────────

const tileLayer = (name, g, id) => ({
	id,
	name,
	type: 'tilelayer',
	width: COLS,
	height: ROWS,
	x: 0,
	y: 0,
	opacity: 1,
	visible: true,
	data: flatten(g),
});
const objectLayer = (name, objects, id) => ({
	id,
	name,
	type: 'objectgroup',
	x: 0,
	y: 0,
	opacity: 1,
	visible: true,
	draworder: 'topdown',
	objects,
});

const map = {
	compressionlevel: -1,
	width: COLS,
	height: ROWS,
	tilewidth: TILE,
	tileheight: TILE,
	infinite: false,
	orientation: 'orthogonal',
	renderorder: 'right-down',
	type: 'map',
	version: '1.10',
	tiledversion: '1.10.2',
	nextlayerid: 9,
	nextobjectid: objectId,
	tilesets: [
		{
			firstgid: 1,
			name: 'terrain',
			image: '../assets/tiles/terrain_atlas.png',
			imagewidth: 1024,
			imageheight: 1024,
			tilewidth: TILE,
			tileheight: TILE,
			columns: ATLAS_COLS,
			tilecount: ATLAS_COLS * ATLAS_COLS,
			margin: 0,
			spacing: 0,
		},
	],
	layers: [
		tileLayer('ground', ground, 1),
		tileLayer('paths', paths, 2),
		tileLayer('water', water, 3),
		tileLayer('fence', fence, 4),
		objectLayer('props', props, 5),
		objectLayer('tree-anchors', treeAnchors, 6),
		objectLayer('markers', markers, 7),
		objectLayer('critter-zones', critterZones, 8),
	],
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(map));
console.log(`Wrote ${OUT} (${COLS}×${ROWS} tiles, ${props.length} props, ${treeAnchors.length} tree anchors)`);
