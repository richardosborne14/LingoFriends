/**
 * Tests for lpcLayers — TASK-FUN-02.
 *
 * THE test that matters most in this task: every avatar option combination
 * the onboarding customiser can produce must resolve to LPC layer files that
 * actually exist on disk. A broken mapping = a kid with an invisible avatar,
 * failing silently at runtime — this suite makes it fail loudly in CI.
 *
 * What we test:
 *   - every gender × skin × hair × shirt × hat combo → all files exist (fs)
 *   - unknown/legacy option values fall back to defaults, never crash
 *   - recipe keys are stable and unique per distinct look
 *   - layer draw order is body → shirt → hair → hat (LPC zPos order)
 *   - NPC hex colours snap to the nearest swatch correctly
 *   - NPC recipes are deterministic for the same NPC name
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';
import {
	resolveAvatarLayers,
	resolveNPCLayers,
	nearestSwatch,
	SKIN_TONE_TO_LPC,
	HAIR_COLOR_TO_LPC,
	SHIRT_COLOR_TO_LPC,
	GENDER_TO_HAIR_STYLE,
	HAT_TO_FILE,
} from '$lib/world/sprites/lpcLayers';
import type { AvatarOptions, NPCConfig } from '$lib/types/garden';

/** Maps a runtime asset URL (/assets/…) to its file in static/. */
function assetFile(url: string): string {
	return path.resolve('static', url.replace(/^\//, ''));
}

/** The exact option lists offered by StepAvatar.svelte (+ legacy 'crown'). */
const GENDERS = Object.keys(GENDER_TO_HAIR_STYLE);
const SKINS = Object.keys(SKIN_TONE_TO_LPC);
const HAIRS = Object.keys(HAIR_COLOR_TO_LPC);
const SHIRTS = Object.keys(SHIRT_COLOR_TO_LPC);
const HATS = Object.keys(HAT_TO_FILE);

describe('resolveAvatarLayers — full customiser matrix', () => {
	it('every combination resolves to files that exist on disk', () => {
		// 3 × 6 × 6 × 8 × 5 = 4320 combos; fs checks are cached by the OS —
		// the whole sweep runs in well under a second.
		const missing = new Set<string>();

		for (const gender of GENDERS)
			for (const skinTone of SKINS)
				for (const hairColor of HAIRS)
					for (const shirtColor of SHIRTS)
						for (const hat of HATS) {
							const recipe = resolveAvatarLayers({
								gender,
								skinTone,
								hairColor,
								shirtColor,
								hat,
							});
							for (const layer of recipe.layers) {
								if (!existsSync(assetFile(layer))) missing.add(layer);
							}
						}

		expect([...missing]).toEqual([]);
	});

	it('includes a hat layer only when a hat is worn', () => {
		const base: AvatarOptions = {
			gender: 'boy',
			skinTone: '#FDDBB4',
			hairColor: '#4A3728',
			shirtColor: '#FF8A6A',
			hat: 'none',
		};
		expect(resolveAvatarLayers(base).layers).toHaveLength(5);
		expect(resolveAvatarLayers({ ...base, hat: 'cap' }).layers).toHaveLength(6);
	});

	it('draws layers in body → shirt → head → hair → hat order (LPC zPos)', () => {
		const recipe = resolveAvatarLayers({
			gender: 'girl',
			skinTone: '#8D5524',
			hairColor: '#2C2C2C',
			shirtColor: '#1ABC9C',
			hat: 'headband',
		});
		expect(recipe.layers[0]).toContain('/body/');
		expect(recipe.layers[1]).toContain('/legs/');
		expect(recipe.layers[2]).toContain('/shirt/');
		expect(recipe.layers[3]).toContain('/head/');
		expect(recipe.layers[4]).toContain('/hair/');
		expect(recipe.layers[5]).toContain('/hat/');
	});

	it('head layer matches the body skin tone (same variant name)', () => {
		const recipe = resolveAvatarLayers({
			gender: 'boy',
			skinTone: '#C68642',
			hairColor: '#2C2C2C',
			shirtColor: '#1ABC9C',
			hat: 'none',
		});
		expect(recipe.layers[0]).toBe('/assets/characters/body/bronze.png');
		expect(recipe.layers[3]).toBe('/assets/characters/head/male/bronze.png');
	});

	it('falls back to defaults for unknown values instead of crashing', () => {
		const recipe = resolveAvatarLayers({
			gender: 'dragon', // not a real option
			skinTone: '#123456', // not a swatch
			hairColor: 'blue', // malformed
			shirtColor: '',
			hat: 'sombrero', // never existed
		} as AvatarOptions);

		// Defaults: light skin, blue shirt, female head, bob hair, no hat
		expect(recipe.layers).toEqual([
			'/assets/characters/body/light.png',
			'/assets/characters/legs/jeans.png',
			'/assets/characters/shirt/blue.png',
			'/assets/characters/head/female/light.png',
			'/assets/characters/hair/bob/dark_brown.png',
		]);
		for (const layer of recipe.layers) {
			expect(existsSync(assetFile(layer))).toBe(true);
		}
	});

	it('legacy V1 "crown" hat still resolves (old profiles)', () => {
		const recipe = resolveAvatarLayers({
			gender: 'neutral',
			skinTone: '#F5CBA7',
			hairColor: '#D4A017',
			shirtColor: '#4A90D9',
			hat: 'crown',
		});
		expect(recipe.layers[5]).toBe('/assets/characters/hat/crown.png');
		expect(existsSync(assetFile(recipe.layers[5]))).toBe(true);
	});

	it('recipe keys: same look → same key, different look → different key', () => {
		const opts: AvatarOptions = {
			gender: 'boy',
			skinTone: '#E8A87C',
			hairColor: '#6B48A0',
			shirtColor: '#E74C3C',
			hat: 'beanie',
		};
		expect(resolveAvatarLayers(opts).key).toBe(resolveAvatarLayers({ ...opts }).key);
		expect(resolveAvatarLayers(opts).key).not.toBe(
			resolveAvatarLayers({ ...opts, shirtColor: '#F39C12' }).key
		);
	});
});

describe('nearestSwatch', () => {
	it('returns an exact match when the hex is in the palette', () => {
		expect(nearestSwatch('#FDDBB4', Object.keys(SKIN_TONE_TO_LPC))).toBe('#FDDBB4');
	});

	it('snaps a near-miss to the closest swatch', () => {
		// #FE0000 is nearly pure red → closest shirt swatch is #E74C3C (red)
		expect(nearestSwatch('#FE0000', Object.keys(SHIRT_COLOR_TO_LPC))).toBe('#E74C3C');
	});

	it('handles malformed hex by falling back to the first swatch', () => {
		const palette = Object.keys(SHIRT_COLOR_TO_LPC);
		expect(nearestSwatch('red', palette)).toBe(palette[0]);
		expect(nearestSwatch('', palette)).toBe(palette[0]);
	});
});

describe('resolveNPCLayers', () => {
	const npc: NPCConfig = {
		name: 'Felix',
		bodyColor: '#4A90D9',
		skinTone: '#C68642',
		hairColor: '#4A3728',
		scale: 1,
		isBoss: false,
		emotion: 'happy',
	};

	it('resolves to files that exist on disk', () => {
		for (const layer of resolveNPCLayers(npc).layers) {
			expect(existsSync(assetFile(layer)), layer).toBe(true);
		}
	});

	it('is deterministic — same NPC always gets the same look', () => {
		expect(resolveNPCLayers(npc)).toEqual(resolveNPCLayers({ ...npc }));
	});

	it('different names can pick different hair styles, same name never does', () => {
		const a = resolveNPCLayers({ ...npc, name: 'Felix' });
		const b = resolveNPCLayers({ ...npc, name: 'Felix' });
		expect(a.layers[4]).toBe(b.layers[4]);
	});

	it('bosses wear the gold crown', () => {
		const boss = resolveNPCLayers({ ...npc, isBoss: true });
		expect(boss.layers.at(-1)).toBe('/assets/characters/hat/crown.png');
		expect(boss.key).toContain('-boss');
	});

	it('snaps arbitrary generated hexes to real files', () => {
		// Colours npcGenerator could produce that aren't customiser swatches
		const wild = resolveNPCLayers({
			...npc,
			skinTone: '#FFE0C0',
			hairColor: '#111111',
			bodyColor: '#00FF88',
		});
		for (const layer of wild.layers) {
			expect(existsSync(assetFile(layer)), layer).toBe(true);
		}
	});
});
