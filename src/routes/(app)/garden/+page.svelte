<script lang="ts">
	/**
	 * Garden Page — Main view
	 *
	 * Wires together:
	 *   - GardenCanvas: Three.js scene with trees + avatar
	 *   - TreePanel: bottom sheet for lesson trail
	 *   - Stats header: ☀️ SunDrops | 🔥 Streak
	 *
	 * Flow:
	 *   1. Load: server provides trees, avatar, stats
	 *   2. Mount: GardenCanvas initialises Three.js scene
	 *   3. Tree tap: TreePanel slides up with lesson trail
	 *   4. Lesson tap in TreePanel: navigate to /lesson/[id]
	 *   5. Return from lesson: SvelteKit invalidates data → trees refresh
	 */
	import { goto } from '$app/navigation';
	import GardenCanvas from '$lib/three/garden/GardenCanvas.svelte';
	import TreePanel from '$lib/components/garden/TreePanel.svelte';
	import type { PageData } from './$types';
	import type { TreeData } from '$lib/types/garden';

	export let data: PageData;

	/** Currently selected tree (null = no panel open) */
	let selectedTree: TreeData | null = null;

	/** Handle tree tap from GardenCanvas */
	function onTreeSelected(event: CustomEvent<string>) {
		const treeId = event.detail;
		selectedTree = data.trees.find((t) => t.id === treeId) ?? null;
	}

	/** Handle lesson start from TreePanel */
	function onLessonStart(event: CustomEvent<string>) {
		const lessonId = event.detail;
		selectedTree = null;
		// lessonId format: "{treeId}-{lessonIndex}"
		goto(`/lesson/${lessonId}`);
	}

	function closePanel() {
		selectedTree = null;
	}
</script>

<svelte:head>
	<title>My Garden — LingoFriends</title>
</svelte:head>

<!-- Full-viewport container — Three.js fills the whole screen -->
<div class="relative w-full h-screen overflow-hidden">

	<!-- Stats floating header -->
	<div
		class="absolute top-4 left-1/2 -translate-x-1/2 z-20
		       bg-white/90 backdrop-blur-sm rounded-pill px-5 py-2
		       shadow-card flex items-center gap-4 text-sm font-bold text-bark-700"
	>
		<span title="SunDrops earned">☀️ {data.stats.totalSunDrops}</span>
		<span class="text-bark-200" aria-hidden="true">|</span>
		<span title="Current streak">🔥 {data.stats.currentStreak} day streak</span>
	</div>

	<!-- Three.js garden scene — fills viewport -->
	<GardenCanvas
		trees={data.trees}
		avatarOptions={data.avatar}
		on:treeSelected={onTreeSelected}
	/>

	<!-- Tree panel bottom sheet -->
	{#if selectedTree}
		<TreePanel
			tree={selectedTree}
			visible={true}
			on:close={closePanel}
			on:lessonStart={onLessonStart}
		/>
	{/if}

</div>
