/**
 * game.ts — Phaser game factory. The ONLY module that constructs the game.
 *
 * This file (and everything it imports: scenes, AvatarSprite) statically
 * imports 'phaser', which touches `window` at import time. It is therefore
 * only ever loaded through `await import('./game')` inside WorldCanvas's
 * onMount — the SSR bundle never evaluates it. Do not import this module
 * from anywhere else.
 */

import Phaser from 'phaser';
import type { AvatarOptions, TreeData } from '$lib/types/garden';
import type { WorldEventBus } from './EventBus';
import { BootScene } from './scenes/BootScene';
import { PlotScene } from './scenes/PlotScene';

export interface CreateGameParams {
	/** DOM element the canvas mounts into (WorldCanvas's wrapper div). */
	parent: HTMLElement;
	/** Svelte↔Phaser bridge — owned by the WorldCanvas instance. */
	bus: WorldEventBus;
	/** Initial data pushed into the game registry for scenes to read. */
	trees: TreeData[];
	avatarOptions: AvatarOptions;
	/** Deterministic per-user seed for critters (TASK-FUN-03). */
	plotSeed: string;
	/** Run the first-arrival tutorial this boot. */
	showTutorial: boolean;
	/** Post-lesson growth celebration, or null. */
	celebration: { treeId: string; fromStage: number; toStage: number; sunDrops: number } | null;
}

/**
 * Builds the Phaser game with the LingoFriends world configuration.
 *
 * Key config decisions:
 *   - pixelArt: true    → nearest-neighbour scaling, crisp LPC pixels
 *   - Scale.RESIZE      → canvas always fills the wrapper div; Phaser
 *                         handles window resizes itself (no ResizeObserver)
 *   - arcade physics    → top-down, no gravity; fence collision only
 *   - transparent: false, sky-tinted background while booting
 */
export function createGame(params: CreateGameParams): Phaser.Game {
	const game = new Phaser.Game({
		type: Phaser.AUTO, // WebGL with canvas fallback (old school tablets)
		parent: params.parent,
		backgroundColor: '#7CB56B', // grass green — no white flash before boot
		pixelArt: true,
		scale: {
			mode: Phaser.Scale.RESIZE,
			width: '100%',
			height: '100%',
		},
		physics: {
			default: 'arcade',
			arcade: {
				gravity: { x: 0, y: 0 }, // top-down world — nothing falls
				debug: false,
			},
		},
		scene: [BootScene, PlotScene],
	});

	// Registry = typed-ish data bridge INTO scenes (bus carries events OUT).
	// Set before the scenes' create() runs (Phaser boots async).
	game.registry.set('bus', params.bus);
	game.registry.set('trees', params.trees);
	game.registry.set('avatarOptions', params.avatarOptions);
	game.registry.set('plotSeed', params.plotSeed);
	game.registry.set('showTutorial', params.showTutorial);
	game.registry.set('celebration', params.celebration);

	return game;
}
