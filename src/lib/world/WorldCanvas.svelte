<script lang="ts">
	/**
	 * WorldCanvas.svelte — Svelte wrapper for the Phaser 2D world.
	 *
	 * Drop-in replacement for the old Three.js GardenCanvas: same props
	 * (trees, avatarOptions) and same events (treeSelected, groundTap), so
	 * the garden page's wiring is unchanged.
	 *
	 * THE SSR RULE (TASK-FUN-02 locked decision, applies to every future
	 * world feature): Phaser touches `window` at import time, so 'phaser'
	 * (via ./game) is imported DYNAMICALLY inside onMount and nowhere else.
	 * This component is the one place that pattern lives.
	 *
	 * Lifecycle:
	 *   onMount   → import('./game') → createGame() into the wrapper div
	 *   props     → pushed into game.registry (scenes react via changedata)
	 *   bus       → world events re-dispatched as Svelte component events
	 *   onDestroy → game.destroy(true) + bus.clear() — no leaked canvases,
	 *               listeners, or textures across garden↔lesson navigation
	 */
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import type { AvatarOptions, TreeData } from '$lib/types/garden';
	import { createEventBus } from './EventBus';
	import type Phaser from 'phaser';

	export let trees: TreeData[] = [];
	export let avatarOptions: AvatarOptions;
	/** Opaque per-user seed — drives deterministic critters (TASK-FUN-03). */
	export let plotSeed = 'plot-anon';
	/** True on the user's first ever garden visit — runs the arrival tutorial. */
	export let showTutorial = false;
	/** Post-lesson growth celebration (from garden/+page.ts), or null. */
	export let celebration: {
		treeId: string;
		fromStage: number;
		toStage: number;
		sunDrops: number;
	} | null = null;

	/**
	 * Ends the tutorial early. Exposed for the Svelte skip button (bubbles
	 * are DOM overlays) — bind:this on this component and call it.
	 * Uses the registry (Svelte→Phaser channel), not the event bus.
	 */
	export function skipTutorial(): void {
		game?.registry.set('tutorial-skip', Date.now());
	}

	/** Wrapper div Phaser mounts its canvas into. */
	let container: HTMLDivElement;

	let game: Phaser.Game | null = null;

	// One bus per canvas instance — never shared, never leaks (see EventBus.ts)
	const bus = createEventBus();

	const dispatch = createEventDispatcher<{
		/** A learning tree was tapped — payload is the tree DB id. */
		treeSelected: string;
		/** Open ground was tapped (avatar walks there). */
		groundTap: { tileX: number; tileY: number };
		/** World finished booting — parent can hide any skeleton UI. */
		ready: void;
		/** Growth celebration finished — show the SunDrop tally toast. */
		celebrationDone: { sunDrops: number };
		/** Tutorial wants a speech bubble at these screen coords (null = hide). */
		tutorialBubble: { step: number; screenX: number; screenY: number } | null;
		/** Tutorial finished/skipped — parent persists the seen-flag. */
		tutorialDone: void;
	}>();

	onMount(() => {
		let cancelled = false;

		// Bridge world events out to Svelte-land
		bus.on('tree-selected', (id) => dispatch('treeSelected', id));
		bus.on('ground-tap', (tile) => dispatch('groundTap', tile));
		bus.on('world-ready', () => dispatch('ready'));
		bus.on('celebration-done', (p) => dispatch('celebrationDone', p));
		bus.on('tutorial-bubble', (p) => dispatch('tutorialBubble', p));
		bus.on('tutorial-done', () => dispatch('tutorialDone'));

		// Dynamic import keeps Phaser out of the SSR bundle entirely
		import('./game').then(({ createGame }) => {
			// Component may already be destroyed (fast navigation) — don't
			// create a game nothing will ever clean up.
			if (cancelled) return;
			game = createGame({
				parent: container,
				bus,
				trees,
				avatarOptions,
				plotSeed,
				showTutorial,
				celebration,
			});
		});

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		// destroy(true) also removes the canvas element from the DOM.
		// Textures/animations registered on this game die with it.
		game?.destroy(true);
		game = null;
		bus.clear();
	});

	// Reactive data pushes — registry 'changedata' events reach the scenes.
	// (Guarded on `game`: before boot completes, createGame seeds the same
	// values, so nothing is lost.)
	$: if (game) game.registry.set('trees', trees);
	$: if (game && avatarOptions) game.registry.set('avatarOptions', avatarOptions);
</script>

<!--
	Phaser fills this div (Scale.RESIZE). Parent must give it a height —
	the garden page uses a full-viewport container, same as with Three.js.
	touch-action: none stops mobile browsers scrolling while walking.
-->
<div bind:this={container} class="w-full h-full" style="touch-action: none;"></div>
