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

	/**
	 * Toast message for the water tree flow.
	 * Shown when review API returns no overdue chunks, or when cap is hit.
	 * Auto-dismisses after 3s.
	 */
	let gardenToast: string | null = null;
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	/** Shows a toast message for 3 seconds then clears it */
	function showToast(msg: string) {
		gardenToast = msg;
		if (toastTimer) clearTimeout(toastTimer);
		// 3000ms — long enough to read, short enough to not be annoying to kids
		toastTimer = setTimeout(() => { gardenToast = null; }, 3000);
	}

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

	/**
	 * Called when the user taps "Water my tree" in TreePanel.
	 * Calls GET /api/lessons/review with the treeId so the review session
	 * knows which tree's SRS chunks to use.
	 * If no overdue chunks exist, shows a friendly toast and stays on the garden.
	 */
	async function onWaterTree(event: CustomEvent<string>) {
		const treeId = event.detail;
		selectedTree = null;   // close panel immediately — feels responsive

		try {
			// GET /api/lessons/review?treeId=X returns a pre-built review LessonPlan
			const res = await fetch(`/api/lessons/review?treeId=${encodeURIComponent(treeId)}`);
			if (!res.ok) {
				if (res.status === 404) {
					// 404 = no overdue chunks — tree is fully reviewed today
					showToast('🌿 Your tree is all caught up! Come back tomorrow.');
				} else {
					showToast("⚠️ Couldn't start a review. Try again in a moment.");
				}
				return;
			}
			const data = await res.json();
			// Navigate to the generated review lesson
			if (data.lessonPlan?.id) {
				goto(`/lesson/${data.lessonPlan.id}`);
			} else {
				showToast('🌿 Your tree is all caught up! Come back tomorrow.');
			}
		} catch (_e) {
			// Network error — stay on garden with friendly message
			showToast("⚠️ Couldn't connect. Check your internet and try again.");
		}
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
			on:waterTree={onWaterTree}
		/>
	{/if}

	<!-- Garden toast — shown when water-tree review isn't available -->
	{#if gardenToast}
		<div
			class="absolute bottom-6 left-1/2 -translate-x-1/2 z-60
			       bg-bark-800 text-white text-sm font-bold
			       px-5 py-3 rounded-xl shadow-toast text-center
			       max-w-[90vw] transition-opacity duration-300"
			role="alert"
			aria-live="polite"
		>
			{gardenToast}
		</div>
	{/if}

</div>
