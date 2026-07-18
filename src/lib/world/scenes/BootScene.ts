/**
 * BootScene.ts — Asset loading + progress bar, then hands off to PlotScene.
 *
 * Loads the SHARED world assets (terrain atlas, tree sheets, flora, house,
 * critters, the authored plot map) and registers all named crop frames.
 * Character layers are NOT loaded here — the compositor fetches exactly the
 * 3–5 layer PNGs each character needs (out of ~50 shipped variants), so
 * preloading all of them would waste bandwidth on a kid's connection.
 *
 * The loading bar is deliberately simple graphics (no UI asset dependency):
 * a bark-brown track with a leaf-green fill, matching the app palette.
 */

import Phaser from 'phaser';
import { ASSET_PATHS, PLOT_MAP_KEY, PLOT_MAP_PATH, PROP_FRAMES } from '../assets';
import { registerTreeStageFrames } from '../sprites/TreeSprite';

export class BootScene extends Phaser.Scene {
	constructor() {
		super('boot');
	}

	preload(): void {
		const { width, height } = this.scale;

		// ── Progress bar (track + fill + label) ───────────────────────────
		const track = this.add.rectangle(width / 2, height / 2, 200, 14, 0x8d6e63).setOrigin(0.5);
		const fill = this.add
			.rectangle(width / 2 - 98, height / 2, 0, 10, 0x66bb6a)
			.setOrigin(0, 0.5);
		this.add
			.text(width / 2, height / 2 - 24, 'Growing your garden…', {
				fontFamily: 'sans-serif',
				fontSize: '14px',
				color: '#5d4037',
			})
			.setOrigin(0.5);

		this.load.on('progress', (value: number) => {
			// 196 = track width minus 2px inset each side
			fill.width = 196 * value;
		});
		this.load.on('complete', () => {
			track.destroy();
			fill.destroy();
		});

		// ── The actual assets ─────────────────────────────────────────────
		// Critter sheets load as SPRITESHEETS (32px frame grid for their
		// walk animations); everything else is a plain image we add named
		// crop frames to in create().
		const critterKeys = new Set(['rabbit', 'bird-robin', 'bird-bluejay']);
		for (const [key, path] of Object.entries(ASSET_PATHS)) {
			if (critterKeys.has(key)) {
				this.load.spritesheet(key, path, { frameWidth: 32, frameHeight: 32 });
			} else {
				this.load.image(key, path);
			}
		}

		// The authored home plot (see scripts/generate-plot-map.mjs)
		this.load.tilemapTiledJSON(PLOT_MAP_KEY, PLOT_MAP_PATH);
	}

	create(): void {
		// ── Register named crop frames once, world-wide ───────────────────
		// Tree growth stages (on tree sheets + terrain atlas)
		registerTreeStageFrames(this);

		// Flora/house prop frames (kind → rect, used by PlotScene props)
		for (const [kind, f] of Object.entries(PROP_FRAMES)) {
			const texture = this.textures.get(f.tex);
			const name = `prop-${kind}`;
			if (!texture.has(name)) texture.add(name, 0, f.x, f.y, f.w, f.h);
		}

		this.scene.start('plot');
	}
}
