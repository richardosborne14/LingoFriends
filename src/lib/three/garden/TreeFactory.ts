/**
 * LingoFriends V2 — Tree Factory
 *
 * Builds Three.js geometry trees for each growth stage + health level.
 * All trees are pure geometry (no external models) for Phase 4 MVP.
 *
 * Growth stage visual mapping (15 stages, 0-14):
 *   0       = seed mound (tiny sphere)
 *   1-3     = sapling (thin trunk + small sphere canopy)
 *   4-7     = young tree (medium trunk + fuller canopy)
 *   8-11    = mature tree (wide trunk + layered canopy)
 *   12-14   = full bloom (wide trunk + blossom layers + petal particles)
 *
 * Health affects colour:
 *   90-100% → vibrant pink/green blossoms
 *   70-89%  → muted pink, normal green
 *   50-69%  → brownish leaves mix
 *   30-49%  → mostly bare, brown
 *   10-29%  → grey, bare branches
 *   <10%    → almost dead grey stump
 *
 * NOTE: MeshToonMaterial is used for the cartoonish kid-friendly look.
 * This is intentional — upgrade to PBR later if we move to glTF models.
 *
 * @module three/garden/TreeFactory
 */

import * as THREE from 'three';
import type { TreeData } from '$lib/types/garden';

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR CONSTANTS — from design system (01-DESIGN-SYSTEM.md)
// ─────────────────────────────────────────────────────────────────────────────

/** Cherry blossom pink at full health */
const BLOSSOM_FULL = new THREE.Color('#F5A3C7');
/** Muted pink for slightly unhealthy trees */
const BLOSSOM_MUTED = new THREE.Color('#D4A0A0');
/** Brown canopy for sick trees */
const CANOPY_SICK = new THREE.Color('#8B6914');
/** Near-dead grey */
const CANOPY_DEAD = new THREE.Color('#6B6B6B');

/** Vibrant trunk brown */
const TRUNK_HEALTHY = new THREE.Color('#5C3D1E');
/** Greyed-out trunk for sick trees */
const TRUNK_SICK = new THREE.Color('#7A6A5A');

/** Bright green for grass/ground */
export const GROUND_COLOR = new THREE.Color('#6EC87A');
/** Dirt brown for tree plot circles */
export const DIRT_COLOR = new THREE.Color('#8B6914');
/** Fence post brown */
export const FENCE_COLOR = new THREE.Color('#8B5E3C');

// ─────────────────────────────────────────────────────────────────────────────
// SIZING BY GROWTH STAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns trunk and canopy dimensions scaled to growth stage.
 * Stage 0 = seed: no trunk, tiny mound. Stage 14 = full tree.
 */
function getStageDimensions(stage: number): {
	trunkHeight: number;
	trunkRadius: number;
	canopyRadius: number;
	canopyLayers: number;
} {
	if (stage === 0) {
		// Just a seed mound — no proper trunk yet
		return { trunkHeight: 0.05, trunkRadius: 0.05, canopyRadius: 0.15, canopyLayers: 1 };
	}

	// Scale dimensions logarithmically — early growth is fast, later growth slows
	// Clamped to [1, 14] to avoid stage 0 confusion
	const s = Math.max(1, stage);
	const trunkHeight = 0.2 + s * 0.12;
	const trunkRadius = 0.04 + s * 0.012;
	const canopyRadius = 0.25 + s * 0.11;
	// More canopy layers at higher stages for a fuller look
	const canopyLayers = stage < 4 ? 1 : stage < 8 ? 2 : stage < 12 ? 3 : 4;

	return { trunkHeight, trunkRadius, canopyRadius, canopyLayers };
}

/**
 * Returns the canopy colour for a given health percentage and growth stage.
 * Stage < 4: no blossom yet (always green-ish)
 * Stage >= 4: blossoms appear, health drives how vibrant they are.
 */
function getCanopyColor(stage: number, health: number): THREE.Color {
	if (health < 10) return CANOPY_DEAD;
	if (health < 30) return CANOPY_SICK;
	if (stage < 4) {
		// Young trees are green, not yet blossoming
		const greenIntensity = 0.4 + health / 200; // 0.4–0.9
		return new THREE.Color(0.2, greenIntensity, 0.25);
	}
	// Blossom trees: interpolate between vibrant and muted based on health
	const lerpFactor = Math.max(0, (health - 30) / 70); // 0 at 30%, 1 at 100%
	return new THREE.Color().lerpColors(BLOSSOM_MUTED, BLOSSOM_FULL, lerpFactor);
}

/**
 * Returns the trunk colour based on health.
 */
function getTrunkColor(health: number): THREE.Color {
	if (health < 30) return TRUNK_SICK;
	return TRUNK_HEALTHY;
}

// ─────────────────────────────────────────────────────────────────────────────
// TREE BUILDING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a Three.js Group representing a tree at a given growth stage and health.
 *
 * The group's userData.treeId is set for raycasting identification.
 * All children are named ('trunk', 'canopy-0', 'canopy-1', etc.) for easy
 * future material swapping when upgrading to glTF models.
 *
 * @param treeData - The tree's DB data with calculated health
 * @returns THREE.Group positioned at (positionX, 0, positionY)
 */
export function buildTreeMesh(treeData: TreeData): THREE.Group {
	const group = new THREE.Group();
	group.userData.treeId = treeData.id;
	group.userData.type = 'tree';

	const { growthStage, health, positionX, positionY } = treeData;
	const dims = getStageDimensions(growthStage);
	const trunkColor = getTrunkColor(health);
	const canopyColor = getCanopyColor(growthStage, health);

	// Seed stage — just a tiny mound, no full trunk
	if (growthStage === 0) {
		const moundGeo = new THREE.SphereGeometry(0.15, 8, 6);
		const moundMat = new THREE.MeshToonMaterial({ color: DIRT_COLOR });
		const mound = new THREE.Mesh(moundGeo, moundMat);
		mound.name = 'seed-mound';
		mound.position.y = 0.1;
		group.add(mound);

		// Small seed sprite sitting on top
		const seedGeo = new THREE.SphereGeometry(0.05, 6, 4);
		const seedMat = new THREE.MeshToonMaterial({ color: new THREE.Color('#4A3728') });
		const seed = new THREE.Mesh(seedGeo, seedMat);
		seed.name = 'seed';
		seed.position.y = 0.25;
		group.add(seed);

		group.position.set(positionX, 0, positionY);
		return group;
	}

	// TRUNK — cylinder, anchored at ground level
	const trunkGeo = new THREE.CylinderGeometry(
		dims.trunkRadius * 0.7, // top (slightly thinner)
		dims.trunkRadius,       // bottom
		dims.trunkHeight,
		8 // segments — low poly for performance
	);
	const trunkMat = new THREE.MeshToonMaterial({ color: trunkColor });
	const trunk = new THREE.Mesh(trunkGeo, trunkMat);
	trunk.name = 'trunk';
	// Position so base sits at y=0 (ground level)
	trunk.position.y = dims.trunkHeight / 2;
	group.add(trunk);

	// CANOPY — one or more sphere layers for fuller trees
	const canopyMat = new THREE.MeshToonMaterial({ color: canopyColor });
	const trunkTop = dims.trunkHeight;

	for (let i = 0; i < dims.canopyLayers; i++) {
		// Each additional layer is slightly smaller and offset upward
		const layerScale = 1 - i * 0.2;
		const canopyGeo = new THREE.SphereGeometry(dims.canopyRadius * layerScale, 10, 8);
		const canopy = new THREE.Mesh(canopyGeo, canopyMat);
		canopy.name = `canopy-${i}`;
		// Stack layers upward; first layer sits just above trunk top
		canopy.position.y = trunkTop + dims.canopyRadius * layerScale * 0.7 + i * dims.canopyRadius * 0.4;
		group.add(canopy);
	}

	// DIRT PLOT CIRCLE — shows the planted area beneath the tree
	const plotGeo = new THREE.CircleGeometry(dims.canopyRadius * 1.1, 16);
	const plotMat = new THREE.MeshToonMaterial({ color: DIRT_COLOR });
	const plot = new THREE.Mesh(plotGeo, plotMat);
	plot.name = 'plot';
	// Slightly above ground to avoid z-fighting
	plot.rotation.x = -Math.PI / 2;
	plot.position.y = 0.01;
	group.add(plot);

	group.position.set(positionX, 0, positionY);
	return group;
}

/**
 * Builds the dirt plot for an empty (future) tree slot.
 * Shows the player where they could plant a new tree.
 */
export function buildEmptyPlot(x: number, z: number): THREE.Group {
	const group = new THREE.Group();
	group.userData.type = 'empty-plot';

	const plotGeo = new THREE.CircleGeometry(0.5, 16);
	const plotMat = new THREE.MeshToonMaterial({
		color: new THREE.Color('#C4A882'),
		opacity: 0.5,
		transparent: true,
	});
	const plot = new THREE.Mesh(plotGeo, plotMat);
	plot.name = 'empty-plot';
	plot.rotation.x = -Math.PI / 2;
	plot.position.y = 0.02;
	group.add(plot);

	group.position.set(x, 0, z);
	return group;
}

/**
 * Builds a section of garden fence from box geometries.
 * Called once per side by GardenScene.buildFence().
 *
 * @param length - How long the fence section is (in metres)
 * @param x - Start X position
 * @param z - Start Z position
 * @param axis - 'x' for horizontal fence, 'z' for vertical fence
 */
export function buildFenceSection(
	length: number,
	x: number,
	z: number,
	axis: 'x' | 'z'
): THREE.Group {
	const group = new THREE.Group();
	const postMat = new THREE.MeshToonMaterial({ color: FENCE_COLOR });
	const railMat = new THREE.MeshToonMaterial({ color: new THREE.Color('#A0714E') });

	// Fence posts every 1 metre
	for (let i = 0; i <= length; i++) {
		const postGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
		const post = new THREE.Mesh(postGeo, postMat);
		if (axis === 'x') {
			post.position.set(x + i, 0.25, z);
		} else {
			post.position.set(x, 0.25, z + i);
		}
		group.add(post);
	}

	// Two horizontal rails
	const railGeo = new THREE.BoxGeometry(
		axis === 'x' ? length : 0.06,
		0.06,
		axis === 'z' ? length : 0.06
	);
	for (let r = 0; r < 2; r++) {
		const rail = new THREE.Mesh(railGeo, railMat);
		if (axis === 'x') {
			rail.position.set(x + length / 2, 0.15 + r * 0.2, z);
		} else {
			rail.position.set(x, 0.15 + r * 0.2, z + length / 2);
		}
		group.add(rail);
	}

	return group;
}

/**
 * Creates ambient pollen particles for a healthy tree.
 * Returns a Points object positioned at the tree's world position.
 * Only called for trees with health > 70.
 *
 * @param treeData - The tree this particle system belongs to
 * @returns THREE.Points for pollen effect (null if tree unhealthy)
 */
export function buildPollenParticles(treeData: TreeData): THREE.Points | null {
	if (treeData.health < 70 || treeData.growthStage < 4) return null;

	const count = 40;
	const positions = new Float32Array(count * 3);
	const dims = getStageDimensions(treeData.growthStage);
	const spread = dims.canopyRadius * 1.5;

	for (let i = 0; i < count; i++) {
		positions[i * 3] = treeData.positionX + (Math.random() - 0.5) * spread;
		// Float above tree top
		positions[i * 3 + 1] =
			dims.trunkHeight + dims.canopyRadius + Math.random() * dims.canopyRadius;
		positions[i * 3 + 2] = treeData.positionY + (Math.random() - 0.5) * spread;
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	const mat = new THREE.PointsMaterial({
		color: new THREE.Color('#FFE47A'), // sundrop-300 glow
		size: 0.05,
		transparent: true,
		opacity: 0.7,
	});

	return new THREE.Points(geo, mat);
}
