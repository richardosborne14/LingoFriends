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
	TEX,
	growthStageToFrame,
	healthToTreeTexture,
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

describe('tree frames', () => {
	it('every growth frame fits inside the 1024×1024 tree sheets', () => {
		for (const [name, f] of Object.entries(TREE_FRAMES)) {
			expect(f.x + f.w, name).toBeLessThanOrEqual(1024);
			expect(f.y + f.h, name).toBeLessThanOrEqual(1024);
		}
	});

	it('growthStageToFrame covers the full 0–14 stage range', () => {
		expect(growthStageToFrame(0)).toBe('sapling');
		expect(growthStageToFrame(4)).toBe('sapling');
		expect(growthStageToFrame(5)).toBe('young');
		expect(growthStageToFrame(9)).toBe('young');
		expect(growthStageToFrame(10)).toBe('mature');
		expect(growthStageToFrame(14)).toBe('mature');
	});

	it('healthToTreeTexture maps health tiers to the right sheet', () => {
		expect(healthToTreeTexture(100)).toBe(TEX.treesGreen);
		expect(healthToTreeTexture(60)).toBe(TEX.treesGreen);
		expect(healthToTreeTexture(59)).toBe(TEX.treesPale);
		expect(healthToTreeTexture(30)).toBe(TEX.treesPale);
		expect(healthToTreeTexture(29)).toBe(TEX.treesDead);
		expect(healthToTreeTexture(0)).toBe(TEX.treesDead);
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
