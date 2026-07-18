/**
 * BootScene.ts — Asset loading + progress bar, then hands off to PlotScene.
 *
 * Loads only the SHARED world textures (terrain atlas, tree sheets).
 * Character layers are NOT loaded here — the compositor fetches exactly the
 * 3–4 layer PNGs the current avatar needs (out of 36 shipped variants), so
 * preloading all of them would waste bandwidth on a kid's connection.
 *
 * The loading bar is deliberately simple graphics (no UI asset dependency):
 * a bark-brown track with a leaf-green fill, matching the app palette.
 */

import Phaser from 'phaser';
import { ASSET_PATHS, TEX, TREE_FRAMES } from '../assets';

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
		for (const [key, path] of Object.entries(ASSET_PATHS)) {
			this.load.image(key, path);
		}
	}

	create(): void {
		// Register named growth-stage frames on each tree sheet variant.
		// Done once here so PlotScene (and later the shared world) can use
		// frame names like 'young' on any tree texture.
		for (const treeTex of [TEX.treesGreen, TEX.treesPale, TEX.treesDead]) {
			const texture = this.textures.get(treeTex);
			for (const [name, f] of Object.entries(TREE_FRAMES)) {
				texture.add(name, 0, f.x, f.y, f.w, f.h);
			}
		}

		this.scene.start('plot');
	}
}
