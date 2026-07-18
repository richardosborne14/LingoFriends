/**
 * TreeSprite.ts — A learning tree in the home plot (TASK-FUN-03).
 *
 * Visuals are driven entirely by TreeData:
 *   growthStage (0–14) → one of 5 stage visuals (seed → … → blooming)
 *   health (0–100)     → sheet variant (green / pale / dead) for sapling+
 *   health < 60        → floating 💧 puff, inviting the water/review flow
 *
 * The sprite owns its "needs water" indicator and its tap → EventBus wiring.
 * Growth CELEBRATION (tween/sparkle) is orchestrated by PlotScene — the
 * sprite only exposes setStage/refresh so the scene can re-skin it.
 */

import Phaser from 'phaser';
import type { TreeData } from '$lib/types/garden';
import type { WorldEventBus } from '../EventBus';
import {
	TEX,
	TREE_FRAMES,
	TREE_EARLY_FRAMES,
	growthStageToVisual,
	healthToTreeTexture,
	NEEDS_WATER_HEALTH,
	type TreeStageName,
} from '../assets';

/** Frame-name prefix used when registering stage frames on textures. */
const STAGE_FRAME_PREFIX = 'tree-stage-';

/**
 * Registers the named stage frames on the tree sheets + terrain atlas.
 * Called once from BootScene — sprites then refer to frames by name.
 */
export function registerTreeStageFrames(scene: Phaser.Scene): void {
	// Tree-sheet stages exist on all three health variants (same layout)
	for (const tex of [TEX.treesGreen, TEX.treesPale, TEX.treesDead]) {
		const texture = scene.textures.get(tex);
		for (const [stage, f] of Object.entries(TREE_FRAMES)) {
			const name = STAGE_FRAME_PREFIX + stage;
			if (!texture.has(name)) texture.add(name, 0, f.x, f.y, f.w, f.h);
		}
	}
	// Seed/sprout live on the terrain atlas (farm tiles)
	const terrain = scene.textures.get(TEX.terrain);
	for (const [stage, f] of Object.entries(TREE_EARLY_FRAMES)) {
		const name = STAGE_FRAME_PREFIX + stage;
		if (!terrain.has(name)) terrain.add(name, 0, f.x, f.y, f.w, f.h);
	}
}

/** Resolves which texture+frame a (stage, health) combination uses. */
export function stageTexture(stage: TreeStageName, health: number): { tex: string; frame: string } {
	const frame = STAGE_FRAME_PREFIX + stage;
	// Seeds and sprouts don't wilt — always terrain-atlas art
	if (stage === 'seed' || stage === 'sprout') return { tex: TEX.terrain, frame };
	return { tex: healthToTreeTexture(health), frame };
}

export class TreeSprite extends Phaser.GameObjects.Sprite {
	readonly treeId: string;

	/** Floating 💧 shown when the tree needs watering (health < 60). */
	private waterPuff: Phaser.GameObjects.Text | null = null;
	private puffTween: Phaser.Tweens.Tween | null = null;

	constructor(scene: Phaser.Scene, x: number, y: number, tree: TreeData, bus: WorldEventBus) {
		const stage = growthStageToVisual(tree.growthStage);
		const { tex, frame } = stageTexture(stage, tree.health);
		super(scene, x, y, tex, frame);
		this.treeId = tree.id;

		// Origin at trunk base: plants "stand" on their anchor point and
		// depth-sort correctly against the avatar walking behind/in front.
		this.setOrigin(0.5, 1);
		this.setDepth(y);
		scene.add.existing(this);

		// Whole frame tappable — kid-sized hit targets
		this.setInteractive({ useHandCursor: true });
		this.on(
			'pointerdown',
			(_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
				// Swallow the tap so the scene's tap-to-walk doesn't also fire
				event.stopPropagation();
				bus.emit('tree-selected', this.treeId);
			}
		);

		this.updateWaterPuff(tree);
	}

	/**
	 * Re-skins the sprite for new TreeData (post-lesson refresh, decay).
	 * Returns whether the visual STAGE changed (PlotScene uses this to know
	 * a celebration-worthy transition happened).
	 */
	refresh(tree: TreeData): boolean {
		const oldFrame = this.frame.name;
		const stage = growthStageToVisual(tree.growthStage);
		const { tex, frame } = stageTexture(stage, tree.health);
		this.setTexture(tex, frame);
		this.updateWaterPuff(tree);
		return oldFrame !== frame;
	}

	/** Applies a specific stage visual directly (used mid-celebration). */
	setStageVisual(stage: TreeStageName, health: number): void {
		const { tex, frame } = stageTexture(stage, health);
		this.setTexture(tex, frame);
	}

	/**
	 * Creates/destroys the bobbing 💧 above the canopy as health crosses
	 * the needs-water threshold. A gentle pull toward the existing review
	 * flow — visible, but not nagging (no sound, no modal).
	 */
	private updateWaterPuff(tree: TreeData): void {
		const stage = growthStageToVisual(tree.growthStage);
		const needsWater =
			tree.health < NEEDS_WATER_HEALTH && stage !== 'seed' && stage !== 'sprout';

		if (needsWater && !this.waterPuff) {
			this.waterPuff = this.scene.add
				.text(this.x, this.y - this.displayHeight - 6, '💧', { fontSize: '14px' })
				.setOrigin(0.5, 1)
				.setDepth(this.depth + 1);
			// Slow 6px bob — alive but calm
			this.puffTween = this.scene.tweens.add({
				targets: this.waterPuff,
				y: this.waterPuff.y - 6,
				duration: 900,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
			});
		} else if (!needsWater && this.waterPuff) {
			this.puffTween?.stop();
			this.waterPuff.destroy();
			this.waterPuff = null;
			this.puffTween = null;
		}
	}

	destroy(fromScene?: boolean): void {
		this.puffTween?.stop();
		this.waterPuff?.destroy();
		super.destroy(fromScene);
	}
}
