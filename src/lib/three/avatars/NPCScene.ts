/**
 * LingoFriends V2 — NPC Scene
 *
 * A small self-contained Three.js scene that renders a single NPC character
 * inside the lesson UI during coaching chat steps.
 *
 * This is deliberately minimal — 120×120px canvas, no orbit controls,
 * no ground plane. Just a character on a transparent background.
 *
 * WHY a separate scene: The NPC needs its own render loop, camera, and
 * renderer so it doesn't interfere with the garden scene. The canvas is
 * small enough that the GPU cost is negligible.
 *
 * Animations:
 *   - Idle: gentle Y bob + occasional "head tilt" (rotation)
 *   - Speaking: sine-wave jaw rotation (synced to audio play/stop calls)
 *   - Emotion: affects eye scale and head tilt angle
 *
 * @module three/avatars/NPCScene
 */

import * as THREE from 'three';
import type { NPCConfig } from '$lib/types/garden';

/** Canvas size — matches the design spec (120×120px) */
const CANVAS_SIZE = 120;

/** How far the jaw opens while speaking (radians) */
const JAW_OPEN_MAX = 0.15;
/** Frequency of the jaw speaking animation */
const JAW_FREQUENCY = 0.18;

/** Idle bob amplitude */
const IDLE_BOB_AMPLITUDE = 0.02;
const IDLE_BOB_SPEED = 0.03;

/**
 * Self-contained NPC scene for lesson coaching steps.
 * One instance per COACHING_CHAT step (dispose on step change).
 */
export class NPCScene {
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private npcGroup: THREE.Group | null = null;

	private animationId: number | null = null;
	private animFrame = 0;
	private isSpeaking = false;

	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;

		this.scene = new THREE.Scene();
		// Transparent background — blends into lesson card
		this.scene.background = null;

		// Close-up perspective camera to fill the small canvas nicely
		this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20);
		this.camera.position.set(0, 1.1, 2.5);
		this.camera.lookAt(0, 0.9, 0);

		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true, // transparent background
		});
		this.renderer.setSize(CANVAS_SIZE, CANVAS_SIZE);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	/**
	 * Initialises the scene with lights and starts the render loop.
	 * Call once after construction.
	 */
	init(): void {
		// Warm, even lighting for character presentation
		const ambient = new THREE.AmbientLight(0xffffff, 0.9);
		this.scene.add(ambient);

		const fill = new THREE.DirectionalLight(0xfff0e0, 0.6);
		fill.position.set(-2, 3, 3);
		this.scene.add(fill);

		this.startLoop();
	}

	/**
	 * Cleans up all Three.js resources.
	 * MUST be called when the coaching step changes or lesson ends.
	 */
	dispose(): void {
		if (this.animationId !== null) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}

		this.scene.traverse((obj) => {
			if (obj instanceof THREE.Mesh) {
				obj.geometry.dispose();
				if (Array.isArray(obj.material)) {
					obj.material.forEach((m) => m.dispose());
				} else {
					obj.material.dispose();
				}
			}
		});

		this.renderer.dispose();
	}

	/**
	 * Loads (builds) an NPC character from the given config.
	 * Replaces any previously loaded character.
	 *
	 * @param config - NPC configuration from npcGenerator
	 */
	loadCharacter(config: NPCConfig): void {
		if (this.npcGroup) {
			this.scene.remove(this.npcGroup);
		}

		this.npcGroup = this.buildNPCGeometry(config);
		this.scene.add(this.npcGroup);
	}

	/**
	 * Activates the speaking animation (sine-wave jaw movement).
	 * Call when TTS audio starts playing.
	 */
	startSpeaking(): void {
		this.isSpeaking = true;
	}

	/**
	 * Deactivates the speaking animation and resets the jaw.
	 * Call when TTS audio ends.
	 */
	stopSpeaking(): void {
		this.isSpeaking = false;

		// Reset jaw to closed position
		if (this.npcGroup) {
			const jaw = this.npcGroup.getObjectByName('jaw');
			if (jaw) jaw.rotation.x = 0;
		}
	}

	/**
	 * Sets the NPC's emotional expression.
	 * Affects head tilt and, if morph targets existed, eye shape.
	 *
	 * @param emotion - 'happy' | 'thinking' | 'surprised'
	 */
	setEmotion(emotion: NPCConfig['emotion']): void {
		if (!this.npcGroup) return;
		const head = this.npcGroup.getObjectByName('head');
		if (!head) return;

		// Express emotion through head tilt (simple but readable)
		switch (emotion) {
			case 'happy':
				head.rotation.z = 0;
				head.rotation.x = -0.05;
				break;
			case 'thinking':
				// Tilt head to the side
				head.rotation.z = 0.15;
				head.rotation.x = 0;
				break;
			case 'surprised':
				// Head slightly back
				head.rotation.z = 0;
				head.rotation.x = -0.12;
				break;
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Builds the NPC's geometry character.
	 * Simpler than the player avatar — just head + body + eyes + jaw.
	 * Boss NPCs get a gold crown and larger scale.
	 */
	private buildNPCGeometry(config: NPCConfig): THREE.Group {
		const group = new THREE.Group();

		const skinMat = new THREE.MeshToonMaterial({ color: new THREE.Color(config.skinTone) });
		const bodyMat = new THREE.MeshToonMaterial({ color: new THREE.Color(config.bodyColor) });
		const hairMat = new THREE.MeshToonMaterial({ color: new THREE.Color(config.hairColor) });
		const darkMat = new THREE.MeshToonMaterial({ color: new THREE.Color('#2A2A2A') });

		// HEAD group (jaw is a child of this for easy rotation)
		const headGroup = new THREE.Group();
		headGroup.name = 'head';

		const headGeo = new THREE.SphereGeometry(0.2, 12, 10);
		const headMesh = new THREE.Mesh(headGeo, skinMat);
		headMesh.name = 'head-sphere';
		headGroup.add(headMesh);

		// Eyes
		[-0.08, 0.08].forEach((x, i) => {
			const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
			const eye = new THREE.Mesh(eyeGeo, darkMat);
			eye.name = `eye-${i}`;
			eye.position.set(x, 0.04, 0.17);
			headGroup.add(eye);
		});

		// JAW — separate piece for animation
		const jawGeo = new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.4);
		const jaw = new THREE.Mesh(jawGeo, skinMat);
		jaw.name = 'jaw';
		jaw.position.y = -0.1;
		headGroup.add(jaw);

		// Hair
		const hairGeo = new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
		const hair = new THREE.Mesh(hairGeo, hairMat);
		hair.name = 'hair';
		hair.position.y = 0.07;
		headGroup.add(hair);

		headGroup.position.y = 1.1;
		group.add(headGroup);

		// BODY (just a cylinder — NPCs are seen from shoulders up mostly)
		const bodyGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.45, 10);
		const body = new THREE.Mesh(bodyGeo, bodyMat);
		body.name = 'body';
		body.position.y = 0.68;
		group.add(body);

		// Boss crown
		if (config.isBoss) {
			const crownMat = new THREE.MeshToonMaterial({ color: new THREE.Color('#FFD84A') });
			const ringGeo = new THREE.TorusGeometry(0.21, 0.04, 6, 12);
			const ring = new THREE.Mesh(ringGeo, crownMat);
			ring.rotation.x = Math.PI / 2;
			ring.position.y = 1.3;
			group.add(ring);

			for (let i = 0; i < 3; i++) {
				const angle = (i / 3) * Math.PI * 2;
				const spikeGeo = new THREE.ConeGeometry(0.045, 0.14, 6);
				const spike = new THREE.Mesh(spikeGeo, crownMat);
				spike.position.set(Math.cos(angle) * 0.2, 1.42, Math.sin(angle) * 0.2);
				group.add(spike);
			}
		}

		// Apply scale (boss NPCs are larger)
		group.scale.setScalar(config.scale);

		return group;
	}

	/** Starts the render loop */
	private startLoop(): void {
		const loop = () => {
			this.animationId = requestAnimationFrame(loop);
			this.animFrame++;
			this.animateIdle();
			if (this.isSpeaking) this.animateJaw();
			this.renderer.render(this.scene, this.camera);
		};
		loop();
	}

	/** Gentle idle bob animation */
	private animateIdle(): void {
		if (!this.npcGroup) return;
		this.npcGroup.position.y = Math.sin(this.animFrame * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE;
	}

	/** Sine-wave jaw animation while TTS is playing */
	private animateJaw(): void {
		if (!this.npcGroup) return;
		const jaw = this.npcGroup.getObjectByName('jaw');
		if (!jaw) return;
		jaw.rotation.x = Math.abs(Math.sin(this.animFrame * JAW_FREQUENCY)) * JAW_OPEN_MAX;
	}
}
