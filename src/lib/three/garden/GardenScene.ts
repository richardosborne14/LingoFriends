/**
 * LingoFriends V2 — Garden Scene Manager
 *
 * Main Three.js scene for the garden view. Manages:
 *   - Scene setup (camera, renderer, lights, ground, sky, fence)
 *   - Tree meshes (created from TreeData, keyed by tree ID)
 *   - Avatar mesh (see AvatarBuilder)
 *   - Camera controls (isometric, bounded orbit + zoom + pan)
 *   - Raycasting (click detection for trees)
 *   - Animation loop (movement lerp, pollen particle drift)
 *   - Dispose (clean up WebGL resources on unmount)
 *
 * WHY isometric/orthographic camera: Kids expect a game-like top-down
 * garden view. Orthographic removes perspective distortion, making grid
 * layout easy to read. This is the V1-proven approach.
 *
 * Usage:
 *   const scene = new GardenScene(canvas);
 *   scene.init();
 *   scene.setTrees(trees);
 *   scene.setAvatar(options);
 *   // later...
 *   scene.dispose();
 *
 * @module three/garden/GardenScene
 */

import * as THREE from 'three';
import type { AvatarOptions, TreeData } from '$lib/types/garden';
import {
	buildEmptyPlot,
	buildFenceSection,
	buildPollenParticles,
	buildTreeMesh,
	GROUND_COLOR,
} from './TreeFactory';
import { AvatarBuilder } from '../avatars/AvatarBuilder';

/** Garden half-size in metres. Garden is -GARDEN_SIZE to +GARDEN_SIZE on both axes. */
const GARDEN_SIZE = 6;

/** Isometric camera angle — 45° gives a clear view of the full garden */
const CAMERA_ANGLE_DEG = 50;

/** Camera zoom limits (orthographic frustum half-height in metres) */
const ZOOM_MIN = 2;
const ZOOM_MAX = 12;

/** Lerp speed for avatar movement (0 = no move, 1 = snap) */
const AVATAR_LERP_SPEED = 0.08;

/** How much the pollen particles drift per frame */
const POLLEN_DRIFT_SPEED = 0.003;

/**
 * Main garden scene class. One instance per page mount.
 * Must call dispose() when unmounting to avoid WebGL memory leaks.
 */
export class GardenScene {
	// ── Three.js core ──────────────────────────────────────────────────────
	private scene: THREE.Scene;
	private camera: THREE.OrthographicCamera;
	private renderer: THREE.WebGLRenderer;
	private raycaster: THREE.Raycaster;

	// ── Scene objects ──────────────────────────────────────────────────────
	/** Map from treeId → THREE.Group for fast updates */
	private treeMeshes = new Map<string, THREE.Group>();
	/** Pollen particle systems, one per healthy tree */
	private pollenSystems: THREE.Points[] = [];
	/** The player avatar group */
	private avatarGroup: THREE.Group | null = null;

	// ── Animation state ────────────────────────────────────────────────────
	private animationId: number | null = null;
	/** Where the avatar is headed (null = not moving) */
	private avatarTarget: THREE.Vector3 | null = null;
	private avatarBuilder: AvatarBuilder;

	// ── Camera control state ───────────────────────────────────────────────
	/** Current frustum half-height (controls zoom level) */
	private frustumSize: number;
	private aspect: number;
	/** Pan offset from origin */
	private panOffset = new THREE.Vector2(0, 0);
	/** Pointer state for drag-to-pan */
	private isDragging = false;
	private lastPointer = new THREE.Vector2();

	// ── Canvas reference ───────────────────────────────────────────────────
	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.scene = new THREE.Scene();
		this.raycaster = new THREE.Raycaster();
		this.avatarBuilder = new AvatarBuilder();

		// Initial frustum size — shows the whole garden comfortably
		this.frustumSize = 8;
		this.aspect = canvas.width / canvas.height || 1;

		// Orthographic camera: no perspective distortion, true isometric grid feel
		this.camera = new THREE.OrthographicCamera(
			(-this.frustumSize * this.aspect) / 2,
			(this.frustumSize * this.aspect) / 2,
			this.frustumSize / 2,
			-this.frustumSize / 2,
			0.1,
			100
		);

		// Renderer with alpha=false for performance (solid background)
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PUBLIC API
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Initialises the scene. Must be called once after construction.
	 * Sets up lights, ground, fence, sky gradient, and starts the render loop.
	 */
	init(): void {
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.canvas.clientWidth || 400, this.canvas.clientHeight || 400);
		this.renderer.shadowMap.enabled = false; // Toon style — no shadows needed

		// Sky gradient background (coral-100 → sky-300 from design system)
		this.scene.background = new THREE.Color('#FFE8E0');

		// Gentle ambient light + warm directional from above
		const ambient = new THREE.AmbientLight(0xffffff, 0.8);
		this.scene.add(ambient);

		const sun = new THREE.DirectionalLight(0xfff5ee, 1.2);
		sun.position.set(5, 10, 5);
		this.scene.add(sun);

		this.buildGround();
		this.buildFence();

		// Camera: angle from above, offset to give that 3/4 isometric look
		const angleRad = (CAMERA_ANGLE_DEG * Math.PI) / 180;
		this.camera.position.set(0, Math.sin(angleRad) * 15, Math.cos(angleRad) * 15);
		this.camera.lookAt(0, 0, 0);

		this.startAnimationLoop();
	}

	/**
	 * Cleans up all Three.js resources. MUST be called on unmount.
	 * Failing to call this causes WebGL context leaks.
	 */
	dispose(): void {
		if (this.animationId !== null) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}

		// Dispose all geometries and materials in the scene
		this.scene.traverse((obj) => {
			if (obj instanceof THREE.Mesh) {
				obj.geometry.dispose();
				if (Array.isArray(obj.material)) {
					obj.material.forEach((m) => m.dispose());
				} else {
					obj.material.dispose();
				}
			}
			if (obj instanceof THREE.Points) {
				obj.geometry.dispose();
				(obj.material as THREE.Material).dispose();
			}
		});

		this.renderer.dispose();
		this.treeMeshes.clear();
		this.pollenSystems = [];
		this.avatarGroup = null;
	}

	/**
	 * Handles canvas resize. Call on window resize or container size change.
	 * Updates both camera frustum and renderer size.
	 */
	resize(width: number, height: number): void {
		this.aspect = width / height || 1;
		this.renderer.setSize(width, height);
		this.updateCameraFrustum();
	}

	/**
	 * Creates or replaces tree meshes from the provided TreeData array.
	 * Old tree meshes not in the new array are removed from the scene.
	 *
	 * @param trees - Array of TreeData (from DB, health already calculated)
	 */
	setTrees(trees: TreeData[]): void {
		// Remove old tree meshes
		this.treeMeshes.forEach((mesh) => this.scene.remove(mesh));
		this.treeMeshes.clear();

		// Remove old pollen
		this.pollenSystems.forEach((p) => this.scene.remove(p));
		this.pollenSystems = [];

		trees.forEach((tree) => {
			const mesh = buildTreeMesh(tree);
			this.scene.add(mesh);
			this.treeMeshes.set(tree.id, mesh);

			// Pollen particles for healthy trees
			const pollen = buildPollenParticles(tree);
			if (pollen) {
				this.scene.add(pollen);
				this.pollenSystems.push(pollen);
			}
		});
	}

	/**
	 * Creates or replaces the player avatar with the given customisation options.
	 * The avatar starts at the garden origin (0, 0).
	 */
	setAvatar(options: AvatarOptions): void {
		if (this.avatarGroup !== null) {
			this.scene.remove(this.avatarGroup);
		}
		this.avatarGroup = this.avatarBuilder.buildAvatar(options);
		this.scene.add(this.avatarGroup);
	}

	/**
	 * Instructs the avatar to walk to a garden position.
	 * The avatar will animate toward this point during the next render frames.
	 * Walk animation plays during movement, idle when reached.
	 *
	 * @param x - World X coordinate
	 * @param z - World Z coordinate (note: in Three.js, Y is up, Z is forward)
	 */
	moveAvatarTo(x: number, z: number): void {
		// Clamp to garden bounds
		const clampedX = Math.max(-GARDEN_SIZE + 0.5, Math.min(GARDEN_SIZE - 0.5, x));
		const clampedZ = Math.max(-GARDEN_SIZE + 0.5, Math.min(GARDEN_SIZE - 0.5, z));
		this.avatarTarget = new THREE.Vector3(clampedX, 0, clampedZ);

		if (this.avatarGroup) {
			this.avatarBuilder.playWalk(this.avatarGroup);
		}
	}

	/**
	 * Smoothly animates the camera to focus on a specific tree.
	 * After focusing, the tree is centered in the viewport.
	 *
	 * @param treeId - The tree's UUID
	 */
	focusOnTree(treeId: string): void {
		const mesh = this.treeMeshes.get(treeId);
		if (!mesh) return;

		// Move pan offset to tree position so camera centers on it
		this.panOffset.set(mesh.position.x, mesh.position.z);
		// Zoom in slightly to highlight the tree
		this.frustumSize = Math.max(ZOOM_MIN, this.frustumSize * 0.7);
		this.updateCameraFrustum();
		this.updateCameraPosition();
	}

	/**
	 * Performs raycasting to determine which tree (if any) was clicked.
	 * Returns the tree's UUID if a tree mesh was hit, null otherwise.
	 *
	 * @param event - The pointer event from the canvas
	 * @returns Tree ID string, or null if no tree was hit
	 */
	getClickedObject(event: PointerEvent): string | null {
		const rect = this.canvas.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

		// Check against tree meshes (and their children)
		const treeGroups = Array.from(this.treeMeshes.values());
		const meshesToTest: THREE.Object3D[] = [];
		treeGroups.forEach((g) => g.traverse((child) => meshesToTest.push(child)));

		const intersects = this.raycaster.intersectObjects(meshesToTest, false);
		if (intersects.length === 0) return null;

		// Walk up to find the group with userData.treeId
		let obj: THREE.Object3D | null = intersects[0].object;
		while (obj) {
			if (obj.userData.treeId) return obj.userData.treeId as string;
			obj = obj.parent;
		}

		return null;
	}

	/**
	 * Returns whether the scene has been initialised (renderer is ready).
	 * Useful for guards in event handlers.
	 */
	get isReady(): boolean {
		return this.animationId !== null;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// POINTER EVENT HANDLERS (pan + zoom)
	// Attach these to the canvas in GardenCanvas.svelte
	// ─────────────────────────────────────────────────────────────────────────

	/** Begin camera pan drag */
	onPointerDown(event: PointerEvent): void {
		this.isDragging = true;
		this.lastPointer.set(event.clientX, event.clientY);
	}

	/** Update camera pan while dragging */
	onPointerMove(event: PointerEvent): void {
		if (!this.isDragging) return;
		const dx = event.clientX - this.lastPointer.x;
		const dy = event.clientY - this.lastPointer.y;
		this.lastPointer.set(event.clientX, event.clientY);

		// Scale pan speed by frustum size (zoom level)
		const panScale = this.frustumSize / (this.canvas.clientHeight || 400);
		this.panOffset.x -= dx * panScale;
		this.panOffset.y += dy * panScale;

		// Clamp pan to garden bounds
		this.panOffset.x = Math.max(-GARDEN_SIZE, Math.min(GARDEN_SIZE, this.panOffset.x));
		this.panOffset.y = Math.max(-GARDEN_SIZE, Math.min(GARDEN_SIZE, this.panOffset.y));

		this.updateCameraPosition();
	}

	/** End camera pan drag */
	onPointerUp(): void {
		this.isDragging = false;
	}

	/** Handle scroll/pinch to zoom */
	onWheel(event: WheelEvent): void {
		event.preventDefault();
		const delta = event.deltaY > 0 ? 1.1 : 0.9;
		this.frustumSize = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.frustumSize * delta));
		this.updateCameraFrustum();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE HELPERS
	// ─────────────────────────────────────────────────────────────────────────

	/** Builds the flat green ground plane */
	private buildGround(): void {
		const geo = new THREE.PlaneGeometry(GARDEN_SIZE * 2 + 2, GARDEN_SIZE * 2 + 2);
		const mat = new THREE.MeshToonMaterial({ color: GROUND_COLOR });
		const ground = new THREE.Mesh(geo, mat);
		ground.rotation.x = -Math.PI / 2;
		ground.name = 'ground';
		this.scene.add(ground);
	}

	/** Builds the four-sided fence around the garden perimeter */
	private buildFence(): void {
		const s = GARDEN_SIZE;
		// North fence (back)
		this.scene.add(buildFenceSection(s * 2, -s, -s, 'x'));
		// South fence (front)
		this.scene.add(buildFenceSection(s * 2, -s, s, 'x'));
		// West fence (left)
		this.scene.add(buildFenceSection(s * 2, -s, -s, 'z'));
		// East fence (right)
		this.scene.add(buildFenceSection(s * 2, s, -s, 'z'));
	}

	/** Starts the requestAnimationFrame render loop */
	private startAnimationLoop(): void {
		const loop = () => {
			this.animationId = requestAnimationFrame(loop);
			this.updateAvatarMovement();
			this.driftPollenParticles();
			this.renderer.render(this.scene, this.camera);
		};
		loop();
	}

	/**
	 * Lerps avatar toward its target position each frame.
	 * Switches from walk to idle animation when close enough.
	 */
	private updateAvatarMovement(): void {
		if (!this.avatarGroup || !this.avatarTarget) return;

		const pos = this.avatarGroup.position;
		const dist = pos.distanceTo(this.avatarTarget);

		if (dist < 0.05) {
			// Close enough — snap and stop
			pos.copy(this.avatarTarget);
			this.avatarTarget = null;
			this.avatarBuilder.playIdle(this.avatarGroup);
			return;
		}

		// Face direction of travel
		const direction = this.avatarTarget.clone().sub(pos).normalize();
		const angle = Math.atan2(direction.x, direction.z);
		this.avatarGroup.rotation.y = angle;

		// Lerp position
		pos.lerp(this.avatarTarget, AVATAR_LERP_SPEED);
	}

	/** Animates pollen particles with a gentle upward drift */
	private driftPollenParticles(): void {
		this.pollenSystems.forEach((points) => {
			const positions = points.geometry.attributes.position;
			for (let i = 0; i < positions.count; i++) {
				// Drift upward slowly, wrap back to base height
				let y = positions.getY(i) + POLLEN_DRIFT_SPEED;
				// Reset if drifted too far up (creates looping effect)
				if (y > positions.getY(i % 3) + 2) y = positions.getY(i % 3);
				positions.setY(i, y);
			}
			positions.needsUpdate = true;
		});
	}

	/** Updates the camera's orthographic frustum after zoom changes */
	private updateCameraFrustum(): void {
		const h = this.frustumSize / 2;
		const w = h * this.aspect;
		this.camera.left = -w;
		this.camera.right = w;
		this.camera.top = h;
		this.camera.bottom = -h;
		this.camera.updateProjectionMatrix();
	}

	/** Updates camera position after pan changes */
	private updateCameraPosition(): void {
		const angleRad = (CAMERA_ANGLE_DEG * Math.PI) / 180;
		const dist = 15;
		this.camera.position.set(
			this.panOffset.x,
			Math.sin(angleRad) * dist,
			Math.cos(angleRad) * dist + this.panOffset.y
		);
		this.camera.lookAt(this.panOffset.x, 0, this.panOffset.y);
	}
}
