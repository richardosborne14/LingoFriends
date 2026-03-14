<script lang="ts">
	/**
	 * GardenCanvas.svelte — Svelte wrapper for the Three.js GardenScene.
	 *
	 * Mounts the garden canvas on onMount, disposes on onDestroy.
	 * Exposes tree-selected and ground-tap events for the parent to handle.
	 *
	 * Props:
	 *   trees        — TreeData array from the garden page server load
	 *   avatarOptions — AvatarOptions from the user's profile
	 *
	 * Events:
	 *   treeSelected(treeId: string) — when a tree is tapped
	 *   groundTap(x: number, z: number) — when empty ground is tapped
	 *
	 * WHY a wrapper component: GardenScene is a plain TS class that manages
	 * its own WebGL lifecycle. The Svelte component handles the DOM side
	 * (bind:this on the canvas, reactivity, event bridging).
	 */
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { GardenScene } from './GardenScene';
	import type { AvatarOptions, TreeData } from '$lib/types/garden';

	export let trees: TreeData[] = [];
	export let avatarOptions: AvatarOptions;

	let canvas: HTMLCanvasElement;
	let scene: GardenScene | null = null;

	const dispatch = createEventDispatcher<{
		treeSelected: string;
		groundTap: { x: number; z: number };
	}>();

	onMount(() => {
		scene = new GardenScene(canvas);
		scene.init();
		scene.setTrees(trees);

		if (avatarOptions) {
			scene.setAvatar(avatarOptions);
		}

		// Handle window resize — keep canvas filling its container
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				scene?.resize(width, height);
			}
		});
		ro.observe(canvas.parentElement!);

		return () => ro.disconnect();
	});

	onDestroy(() => {
		scene?.dispose();
		scene = null;
	});

	// React to tree data changes (e.g., after a lesson completes and health updates)
	$: if (scene) {
		scene.setTrees(trees);
	}

	// React to avatar changes (e.g., after customisation in profile)
	$: if (scene && avatarOptions) {
		scene.setAvatar(avatarOptions);
	}

	/** Handle pointer events — tap to walk or select tree */
	function handlePointerDown(event: PointerEvent) {
		scene?.onPointerDown(event);
	}

	function handlePointerMove(event: PointerEvent) {
		scene?.onPointerMove(event);
	}

	function handlePointerUp(event: PointerEvent) {
		scene?.onPointerUp();
	}

	/** On click — check if tree was hit or ground was tapped */
	function handleClick(event: MouseEvent) {
		if (!scene) return;

		// MouseEvent and PointerEvent share clientX/clientY — safe to cast here
		const treeId = scene.getClickedObject(event as unknown as PointerEvent);
		if (treeId) {
			// Tree was clicked — focus camera and notify parent
			scene.focusOnTree(treeId);
			dispatch('treeSelected', treeId);
		} else {
			// Ground tap — move avatar
			// Convert screen coords to approximate world coords
			const rect = canvas.getBoundingClientRect();
			const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			const nz = ((event.clientY - rect.top) / rect.height) * 2 - 1;
			// Approximate ground position — scale by garden half-size
			const worldX = nx * 6;
			const worldZ = nz * 4;
			scene.moveAvatarTo(worldX, worldZ);
			dispatch('groundTap', { x: worldX, z: worldZ });
		}
	}

	function handleWheel(event: WheelEvent) {
		scene?.onWheel(event);
	}
</script>

<!--
	Full-viewport canvas. Parent must set height (e.g., height: 100vh or flex-1).
	touch-action: none prevents browser scroll interference on mobile.
-->
<canvas
	bind:this={canvas}
	class="w-full h-full block"
	style="touch-action: none;"
	on:pointerdown={handlePointerDown}
	on:pointermove={handlePointerMove}
	on:pointerup={handlePointerUp}
	on:click={handleClick}
	on:wheel|preventDefault={handleWheel}
></canvas>
