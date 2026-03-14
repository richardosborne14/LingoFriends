<!--
  EncounterScene.svelte — Dual-avatar Three.js banner shown above every lesson activity.

  Shows the user's avatar (left) and the current step's NPC (right) facing each other.
  Both run idle animations (gentle breathing bob). The NPC's jaw opens when `isSpeaking`
  is true (synced to TTS playback by ActivityRouter).

  WHY a shared scene for all steps (Option B): The NPC watches the learner throughout
  the lesson, creating a sense of ongoing relationship. Different NPCs per step keep
  it visually fresh.

  WHY inline geometry for the NPC (not reusing NPCScene.ts):
  NPCScene is designed for a 120×120 close-up canvas. EncounterScene needs a wide banner
  with two characters side by side. The NPC here includes a jaw mesh for speaking
  animation — same technique as NPCScene but adapted for the wider layout.

  WHY AvatarBuilder for the user avatar:
  The user's avatar has all their customisations (skin tone, hair, shirt, hat, gender).
  AvatarBuilder already handles all of these. We just place the resulting group on the left.

  Canvas sizing: fixed height (130px), full container width.
  The container is max-w-md on the lesson page so width is bounded.

  TASK-V2-07: New file — Part B of avatar/NPC encounter system.

  @component
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { AvatarBuilder } from '$lib/three/avatars/AvatarBuilder';
	import type { AvatarOptions, NPCConfig } from '$lib/types/garden';

	// ── Props ─────────────────────────────────────────────────────────────────

	interface Props {
		/** User's avatar options from their profile */
		userAvatar: AvatarOptions;
		/** NPC configuration for this step (generated deterministically) */
		npcConfig: NPCConfig;
		/**
		 * Whether the NPC is currently "speaking" (TTS audio is playing).
		 * When true, the NPC's jaw animates open/closed.
		 * Controlled by ActivityRouter based on ChunkIntroduction audio state.
		 */
		isSpeaking?: boolean;
	}

	let { userAvatar, npcConfig, isSpeaking = false }: Props = $props();

	// ── Layout ────────────────────────────────────────────────────────────────

	/** Fixed canvas height — wide enough for both avatars, short enough not to overwhelm */
	const CANVAS_HEIGHT = 130;

	// ── Animation constants ───────────────────────────────────────────────────

	/** Idle breathing speed (radians/frame) */
	const IDLE_BOB_SPEED = 0.025;
	/** Idle breathing amplitude (metres) */
	const IDLE_BOB_AMPLITUDE = 0.012;
	/** NPC jaw open/close frequency while speaking */
	const JAW_FREQUENCY = 0.18;
	/** Maximum jaw rotation angle when fully open (radians) */
	const JAW_OPEN_MAX = 0.14;

	// ── DOM refs ──────────────────────────────────────────────────────────────

	let canvasEl: HTMLCanvasElement;
	let containerEl: HTMLDivElement;

	// ── Three.js state ────────────────────────────────────────────────────────

	let scene: THREE.Scene | null = null;
	let camera: THREE.PerspectiveCamera | null = null;
	let renderer: THREE.WebGLRenderer | null = null;
	let animId: number | null = null;

	/** Incrementing frame counter — drives sine-wave animations */
	let animFrame = 0;

	/** The user's avatar group (left side) */
	let userGroup: THREE.Group | null = null;
	/** The NPC group (right side) */
	let npcGroup: THREE.Group | null = null;

	// ─────────────────────────────────────────────────────────────────────────
	// LIFECYCLE
	// ─────────────────────────────────────────────────────────────────────────

	onMount(() => {
		// Brief delay so the container has its final dimensions after CSS layout
		const timer = setTimeout(() => setupScene(), 50);
		return () => clearTimeout(timer);
	});

	onDestroy(() => {
		teardown();
	});

	// React to isSpeaking changes — reset jaw when speaking stops
	$effect(() => {
		if (!isSpeaking && npcGroup) {
			const jaw = npcGroup.getObjectByName('jaw');
			if (jaw) (jaw as THREE.Mesh).rotation.x = 0;
		}
	});

	// ─────────────────────────────────────────────────────────────────────────
	// SCENE SETUP
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Initialises the Three.js scene with lighting, both avatars, and the render loop.
	 * Called once after mount with a small delay to ensure container dimensions are ready.
	 */
	function setupScene() {
		if (!canvasEl || !containerEl) return;

		// Use container width, falling back to 400 if not yet laid out.
		// 400px is the max-w-md content area width, so this is a safe fallback.
		const width = containerEl.clientWidth || 400;

		// ── Scene ──────────────────────────────────────────────────────────
		scene = new THREE.Scene();
		// sky-50 blue-tinted background — matches lesson card colours
		scene.background = new THREE.Color('#EFF6FF');

		// ── Camera ─────────────────────────────────────────────────────────
		// Wide FOV + close position shows both avatars clearly in the banner height.
		// Camera looks slightly down (y=0.9) to frame the avatars from chest up.
		camera = new THREE.PerspectiveCamera(50, width / CANVAS_HEIGHT, 0.1, 20);
		camera.position.set(0, 1.1, 3.5);
		camera.lookAt(0, 0.9, 0);

		// ── Renderer ───────────────────────────────────────────────────────
		renderer = new THREE.WebGLRenderer({
			canvas: canvasEl,
			antialias: true,
		});
		renderer.setSize(width, CANVAS_HEIGHT);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// ── Lighting ───────────────────────────────────────────────────────
		// Ambient keeps shadow areas from going fully black on toon materials.
		// Directional fill adds depth from top-front-left.
		const ambient = new THREE.AmbientLight(0xffffff, 0.85);
		scene.add(ambient);

		const fill = new THREE.DirectionalLight(0xfff0e0, 0.7);
		fill.position.set(-2, 3, 3);
		scene.add(fill);

		// ── User avatar (left, facing toward NPC) ─────────────────────────
		const builder = new AvatarBuilder();
		userGroup = builder.buildAvatar(userAvatar);
		// Position left of centre, rotated slightly toward the NPC
		userGroup.position.set(-1.0, 0, 0);
		userGroup.rotation.y = Math.PI * 0.18;
		scene.add(userGroup);

		// ── NPC (right, facing toward user) ───────────────────────────────
		npcGroup = buildNPCGeometry(npcConfig);
		npcGroup.position.set(1.0, 0, 0);
		// Mirror rotation — NPC faces left toward the user
		npcGroup.rotation.y = -Math.PI * 0.18;
		scene.add(npcGroup);

		// Apply emotion head tilt immediately on load
		applyEmotion(npcGroup, npcConfig.emotion);

		// ── Start render loop ─────────────────────────────────────────────
		startLoop();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// NPC GEOMETRY BUILDER
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Builds the NPC's geometry avatar inline.
	 *
	 * WHY not using AvatarBuilder: We need a jaw mesh for speaking animation.
	 * AvatarBuilder doesn't include a jaw. This builder is similar to NPCScene.ts
	 * but adapted for the encounter layout (no scale baked in — applied separately).
	 *
	 * Parts:
	 *   - headGroup: sphere + eyes + jaw + hair (jaw is animatable child)
	 *   - body: cylinder (shoulders down)
	 *   - crown: only for boss NPCs
	 *
	 * @param config - NPC appearance from npcGenerator
	 */
	function buildNPCGeometry(config: NPCConfig): THREE.Group {
		const group = new THREE.Group();

		const skinMat = new THREE.MeshToonMaterial({ color: new THREE.Color(config.skinTone) });
		const bodyMat = new THREE.MeshToonMaterial({ color: new THREE.Color(config.bodyColor) });
		const hairMat = new THREE.MeshToonMaterial({ color: new THREE.Color(config.hairColor) });
		const darkMat = new THREE.MeshToonMaterial({ color: new THREE.Color('#2A2A2A') });

		// ── Head group ─────────────────────────────────────────────────────
		const headGroup = new THREE.Group();
		headGroup.name = 'head';

		const headGeo = new THREE.SphereGeometry(0.18, 12, 10);
		const headMesh = new THREE.Mesh(headGeo, skinMat);
		headMesh.name = 'head-sphere';
		headGroup.add(headMesh);

		// Eyes
		[-0.07, 0.07].forEach((x, i) => {
			const eyeGeo = new THREE.SphereGeometry(0.025, 6, 6);
			const eye = new THREE.Mesh(eyeGeo, darkMat);
			eye.name = `eye-${i}`;
			eye.position.set(x, 0.04, 0.15);
			headGroup.add(eye);
		});

		// JAW — lower half-sphere, separate so it can rotate for speaking animation
		// The jaw hinges at the back of the head (negative Y pivot). Simple but readable.
		const jawGeo = new THREE.SphereGeometry(
			0.12,             // radius — smaller than head
			8,                // width segments
			6,                // height segments
			0,                // phiStart
			Math.PI * 2,      // phiLength — full circle
			Math.PI * 0.5,    // thetaStart — start at equator
			Math.PI * 0.4     // thetaLength — lower half-ish
		);
		const jaw = new THREE.Mesh(jawGeo, skinMat);
		jaw.name = 'jaw';
		jaw.position.y = -0.1; // below head centre
		headGroup.add(jaw);

		// Hair cap
		const hairGeo = new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
		const hair = new THREE.Mesh(hairGeo, hairMat);
		hair.name = 'hair';
		hair.position.y = 0.06;
		headGroup.add(hair);

		// Boss crown — always a crown hat for the final-step NPC
		if (config.isBoss) {
			const crownMat = new THREE.MeshToonMaterial({ color: new THREE.Color('#FFD84A') });

			const ringGeo = new THREE.TorusGeometry(0.21, 0.035, 6, 12);
			const ring = new THREE.Mesh(ringGeo, crownMat);
			ring.rotation.x = Math.PI / 2;
			ring.position.y = 0.22;
			headGroup.add(ring);

			// Three evenly-spaced spikes
			for (let i = 0; i < 3; i++) {
				const angle = (i / 3) * Math.PI * 2;
				const spikeGeo = new THREE.ConeGeometry(0.04, 0.13, 6);
				const spike = new THREE.Mesh(spikeGeo, crownMat);
				spike.position.set(Math.cos(angle) * 0.2, 0.30, Math.sin(angle) * 0.2);
				headGroup.add(spike);
			}
		}

		headGroup.position.y = 1.15;
		group.add(headGroup);

		// ── Body ───────────────────────────────────────────────────────────
		const bodyGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.40, 10);
		const body = new THREE.Mesh(bodyGeo, bodyMat);
		body.name = 'body';
		body.position.y = 0.78;
		group.add(body);

		// Apply scale (boss NPCs are 1.3×, normal = 1.0)
		group.scale.setScalar(config.scale);

		return group;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// EMOTION
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Applies static emotion pose to the NPC's head.
	 * Called once when the scene loads — emotion is set per-step and doesn't change.
	 *
	 * @param group - NPC root group
	 * @param emotion - The emotion from NPCConfig
	 */
	function applyEmotion(group: THREE.Group, emotion: NPCConfig['emotion']): void {
		const head = group.getObjectByName('head');
		if (!head) return;

		switch (emotion) {
			case 'happy':
				head.rotation.z = 0;
				head.rotation.x = -0.04; // slight forward nod
				break;
			case 'thinking':
				head.rotation.z = 0.13; // tilted to the side
				head.rotation.x = 0;
				break;
			case 'surprised':
				head.rotation.z = 0;
				head.rotation.x = -0.1; // slightly back
				break;
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// RENDER LOOP
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Starts the Three.js render loop.
	 * Runs idle bob animations and jaw speaking animation each frame.
	 *
	 * WHY separate loop (not sharing with GardenScene):
	 * This scene is independent and can be mounted/unmounted per activity step.
	 * Sharing a render loop with the garden would require complex cross-component
	 * coordination and makes the garden unnecessarily heavy during lessons.
	 */
	function startLoop(): void {
		const loop = () => {
			animId = requestAnimationFrame(loop);
			animFrame++;

			// ── User avatar idle bob ───────────────────────────────────────
			if (userGroup) {
				// Sin wave at IDLE_BOB_SPEED, amplitude IDLE_BOB_AMPLITUDE
				userGroup.position.y = Math.sin(animFrame * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE;
			}

			// ── NPC idle bob + optional jaw ───────────────────────────────
			if (npcGroup) {
				// Offset by 30 frames so NPC and user don't bob in perfect sync —
				// slight offset makes both feel like independent living beings
				npcGroup.position.y =
					Math.sin((animFrame + 30) * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE;

				// Jaw animation while TTS is playing
				if (isSpeaking) {
					const jaw = npcGroup.getObjectByName('jaw');
					if (jaw) {
						// Abs(sin) creates a quick open-close-open pattern
						jaw.rotation.x =
							Math.abs(Math.sin(animFrame * JAW_FREQUENCY)) * JAW_OPEN_MAX;
					}
				}
			}

			// Render the frame
			if (renderer && scene && camera) {
				renderer.render(scene, camera);
			}
		};

		loop();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// CLEANUP
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Disposes all Three.js resources.
	 * MUST be called on component destroy to prevent GPU memory leaks.
	 * Svelte calls onDestroy automatically — this is wired there.
	 */
	function teardown(): void {
		// Stop the animation loop first
		if (animId !== null) {
			cancelAnimationFrame(animId);
			animId = null;
		}

		// Dispose all geometries and materials in the scene
		if (scene) {
			scene.traverse((obj) => {
				if (obj instanceof THREE.Mesh) {
					obj.geometry.dispose();
					if (Array.isArray(obj.material)) {
						obj.material.forEach((m) => m.dispose());
					} else {
						obj.material.dispose();
					}
				}
			});
		}

		// Release the WebGL context
		if (renderer) {
			renderer.dispose();
			renderer = null;
		}

		scene = null;
		camera = null;
		userGroup = null;
		npcGroup = null;
	}
</script>

<!--
  Container — rounded top corners to blend into the lesson card.
  Canvas fills the container. Two name badges are absolutely positioned.
  pointer-events:none on the canvas so touch events pass through to activity UI.
-->
<div
	bind:this={containerEl}
	class="w-full rounded-xl overflow-hidden relative"
	style="height: {CANVAS_HEIGHT}px;"
	aria-hidden="true"
>
	<!-- Three.js canvas — pointer-events:none prevents it intercepting lesson touches -->
	<canvas
		bind:this={canvasEl}
		class="w-full block"
		style="height: {CANVAS_HEIGHT}px; pointer-events: none;"
	></canvas>

	<!-- "You" label — bottom-left corner -->
	<div
		class="absolute bottom-2 left-3 flex items-center gap-1.5
		       bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1
		       border border-bark-150 shadow-sm"
	>
		<span class="text-xs" aria-hidden="true">👤</span>
		<span class="text-xs font-bold text-bark-500">You</span>
	</div>

	<!-- NPC name badge — bottom-right corner -->
	<div
		class="absolute bottom-2 right-3 flex items-center gap-1.5
		       bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1
		       border border-bark-150 shadow-sm"
	>
		{#if npcConfig.isBoss}
			<!-- Gold crown emoji for boss NPCs -->
			<span class="text-xs" aria-hidden="true">👑</span>
		{:else}
			<!-- Speaking bubble emoji for regular NPCs -->
			<span class="text-xs" aria-hidden="true">🗣️</span>
		{/if}
		<span class="text-xs font-bold text-bark-700">{npcConfig.name}</span>
	</div>
</div>
