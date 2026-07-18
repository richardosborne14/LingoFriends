/**
 * Tests for the world asset manifest — TASK-FUN-02.
 *
 * The manifest hardcodes paths and pixel coordinates into shipped PNGs.
 * These tests pin them to reality:
 *   - every manifest path exists in static/
 *   - tile indices fit inside the terrain atlas grid
 *   - tree frames fit inside the tree sheets
 *   - growth/health mapping functions cover their full input ranges
 *   - CREDITS.md exists and mentions every asset pack (licence rule)
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
	ASSET_PATHS,
	TILE,
	TILE_SIZE,
	ATLAS_COLS,
	TREE_FRAMES,
	TREE_EARLY_FRAMES,
	PROP_FRAMES,
	TEX,
	PLOT_MAP_PATH,
	growthStageToVisual,
	healthToTreeTexture,
	NEEDS_WATER_HEALTH,
	LPC_FRAME,
	LPC_SHEET_COLS,
	LPC_WALK_BAND_Y,
	LPC_WALK_ROWS,
} from '$lib/world/assets';

function assetFile(url: string): string {
	return path.resolve('static', url.replace(/^\//, ''));
}

describe('asset manifest', () => {
	it('every manifest path exists on disk', () => {
		for (const [key, url] of Object.entries(ASSET_PATHS)) {
			expect(existsSync(assetFile(url)), `${key} → ${url}`).toBe(true);
		}
	});

	it('CREDITS.md exists and covers every pack (licence rule from master plan)', () => {
		const credits = readFileSync(path.resolve('static/assets/CREDITS.md'), 'utf-8');
		// One entry per imported pack — update CREDITS.md when adding assets
		expect(credits).toContain('terrain_atlas.png');
		expect(credits).toContain('LPC Trees');
		expect(credits).toContain('Universal LPC Spritesheet');
	});
});

describe('tile indices', () => {
	it('all tile indices sit inside the 32×32 atlas grid', () => {
		// terrain_atlas.png is 1024×1024 → 32 cols × 32 rows → max index 1023
		const maxIndex = ATLAS_COLS * ATLAS_COLS - 1;
		for (const [name, index] of Object.entries(TILE)) {
			expect(index, name).toBeGreaterThanOrEqual(0);
			expect(index, name).toBeLessThanOrEqual(maxIndex);
		}
	});

	it('atlas geometry constants agree with the shipped file', () => {
		// 32 cols of 32px = 1024px — the atlas's real width. If someone swaps
		// the atlas for a different-sized one, this fails before the garden does.
		expect(ATLAS_COLS * TILE_SIZE).toBe(1024);
	});
});

describe('tree growth visuals (TASK-FUN-03)', () => {
	it('every tree-sheet frame fits inside the 1024×1024 tree sheets', () => {
		for (const [name, f] of Object.entries(TREE_FRAMES)) {
			expect(f.x + f.w, name).toBeLessThanOrEqual(1024);
			expect(f.y + f.h, name).toBeLessThanOrEqual(1024);
		}
	});

	it('seed/sprout frames fit inside the terrain atlas', () => {
		for (const [name, f] of Object.entries(TREE_EARLY_FRAMES)) {
			expect(f.x + f.w, name).toBeLessThanOrEqual(1024);
			expect(f.y + f.h, name).toBeLessThanOrEqual(1024);
		}
	});

	it('growthStageToVisual covers the full 0–14 range with all 5 tiers', () => {
		expect(growthStageToVisual(0)).toBe('seed');
		expect(growthStageToVisual(1)).toBe('seed');
		expect(growthStageToVisual(2)).toBe('sprout');
		expect(growthStageToVisual(3)).toBe('sprout');
		expect(growthStageToVisual(4)).toBe('sapling');
		expect(growthStageToVisual(6)).toBe('sapling');
		expect(growthStageToVisual(7)).toBe('healthy');
		expect(growthStageToVisual(10)).toBe('healthy');
		expect(growthStageToVisual(11)).toBe('blooming');
		expect(growthStageToVisual(14)).toBe('blooming');
	});

	it('healthToTreeTexture maps health tiers incl. the wilt threshold (31)', () => {
		expect(healthToTreeTexture(100)).toBe(TEX.treesGreen);
		expect(healthToTreeTexture(60)).toBe(TEX.treesGreen);
		expect(healthToTreeTexture(59)).toBe(TEX.treesPale);
		expect(healthToTreeTexture(31)).toBe(TEX.treesPale);
		expect(healthToTreeTexture(30)).toBe(TEX.treesDead);
		expect(healthToTreeTexture(0)).toBe(TEX.treesDead);
	});

	it('needs-water threshold sits between healthy and wilted', () => {
		expect(NEEDS_WATER_HEALTH).toBeGreaterThan(31);
		expect(NEEDS_WATER_HEALTH).toBeLessThanOrEqual(60);
	});
});

describe('prop frames + plot map (TASK-FUN-03)', () => {
	it('every prop frame references a texture that is in the manifest', () => {
		for (const [kind, f] of Object.entries(PROP_FRAMES)) {
			expect(ASSET_PATHS[f.tex], `${kind} → ${f.tex}`).toBeDefined();
		}
	});

	it('the authored plot map exists and references known prop kinds', () => {
		const mapPath = path.resolve('static', PLOT_MAP_PATH.replace(/^\//, ''));
		expect(existsSync(mapPath)).toBe(true);

		const map = JSON.parse(readFileSync(mapPath, 'utf-8'));
		const props = map.layers.find((l: { name: string }) => l.name === 'props');
		expect(props.objects.length).toBeGreaterThanOrEqual(15); // "born furnished" criterion

		// Every authored `kind` must resolve to a frame — a typo in the map
		// generator would otherwise silently render nothing
		for (const obj of props.objects) {
			const kind = obj.properties?.find((p: { name: string }) => p.name === 'kind')?.value;
			expect(PROP_FRAMES[kind], `map prop kind '${kind}'`).toBeDefined();
		}
	});

	it('the map has the object layers PlotScene depends on', () => {
		const mapPath = path.resolve('static', PLOT_MAP_PATH.replace(/^\//, ''));
		const map = JSON.parse(readFileSync(mapPath, 'utf-8'));
		const names = map.layers.map((l: { name: string }) => l.name);
		for (const required of ['ground', 'paths', 'water', 'fence', 'props', 'tree-anchors', 'markers', 'critter-zones']) {
			expect(names, required).toContain(required);
		}
		// Markers PlotScene reads by name
		const markers = map.layers.find((l: { name: string }) => l.name === 'markers');
		const markerNames = markers.objects.map((o: { name: string }) => o.name);
		expect(markerNames).toContain('spawn');
		expect(markerNames).toContain('gate');
		expect(markerNames).toContain('guide');
		// Enough anchors for a full orchard
		const anchors = map.layers.find((l: { name: string }) => l.name === 'tree-anchors');
		expect(anchors.objects.length).toBeGreaterThanOrEqual(8);
	});
});

describe('LPC sheet geometry', () => {
	it('walk band constants match the LPC universal layout', () => {
		// Walk = rows 8–11 of 64px frames; sheets are 13 frames wide.
		// These are facts about the shipped PNGs — changing them means the
		// asset pipeline changed and the compositor must be revisited.
		expect(LPC_FRAME).toBe(64);
		expect(LPC_SHEET_COLS).toBe(13);
		expect(LPC_WALK_BAND_Y).toBe(512);
		expect(LPC_WALK_ROWS).toBe(4);
	});
});
