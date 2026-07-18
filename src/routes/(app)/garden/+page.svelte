<script lang="ts">
	/**
	 * Garden Page — Main view
	 *
	 * Wires together:
	 *   - WorldCanvas: Phaser 2D tile world with trees + walkable avatar
	 *   - TreePanel: bottom sheet for lesson trail
	 *   - Stats header: ☀️ SunDrops | 🔥 Streak
	 *
	 * Flow:
	 *   1. Load: server provides trees, avatar, stats
	 *   2. Mount: WorldCanvas boots the Phaser world (client-only)
	 *   3. Tree tap: TreePanel slides up with lesson trail
	 *   4. Lesson tap in TreePanel: navigate to /lesson/[id]
	 *   5. Return from lesson: SvelteKit invalidates data → trees refresh
	 */
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import WorldCanvas from '$lib/world/WorldCanvas.svelte';
	import TreePanel from '$lib/components/garden/TreePanel.svelte';
	import type { PageData } from './$types';
	import type { TreeData } from '$lib/types/garden';

	export let data: PageData;

	/** Currently selected tree (null = no panel open) */
	let selectedTree: TreeData | null = null;

	/** Ref for the tutorial skip button → WorldCanvas.skipTutorial() */
	let worldCanvas: WorldCanvas;

	/**
	 * Tutorial speech bubble state (TASK-FUN-03). The Phaser scene reports
	 * WHERE (screen coords) and WHICH step; the text lives here in Svelte
	 * so it goes through svelte-i18n like all other copy.
	 */
	let bubble: { step: number; screenX: number; screenY: number } | null = null;

	function onTutorialBubble(event: CustomEvent<{ step: number; screenX: number; screenY: number } | null>) {
		bubble = event.detail;
	}

	/** Persist the seen-flag when the tutorial ends (walked or skipped). */
	function onTutorialDone() {
		bubble = null;
		// Fire-and-forget — worst case the tutorial replays next visit
		fetch('/api/profile/garden-intro', { method: 'POST' }).catch(() => {});
	}

	/** Growth celebration finished — show the SunDrop tally. */
	function onCelebrationDone(event: CustomEvent<{ sunDrops: number }>) {
		const n = event.detail.sunDrops;
		if (n > 0) showToast(`☀️ +${n} SunDrops!`);
	}

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

	/** Handle tree tap from WorldCanvas */
	function onTreeSelected(event: CustomEvent<string>) {
		// While the tutorial is talking, tree taps are part of the script —
		// don't open the panel over the guide's speech bubble
		if (bubble) return;
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

<!-- Full-viewport container — the Phaser world fills the whole screen -->
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

	<!-- Phaser tile world — fills viewport -->
	<WorldCanvas
		bind:this={worldCanvas}
		trees={data.trees}
		avatarOptions={data.avatar}
		plotSeed={data.plotSeed}
		showTutorial={!data.hasSeenGardenIntro}
		celebration={data.celebration}
		on:treeSelected={onTreeSelected}
		on:celebrationDone={onCelebrationDone}
		on:tutorialBubble={onTutorialBubble}
		on:tutorialDone={onTutorialDone}
	/>

	<!-- Tutorial speech bubble — DOM overlay so text is i18n'd and crisp.
	     Positioned above the guide sprite; clamped so it never leaves screen. -->
	{#if bubble}
		<div
			class="absolute z-30 -translate-x-1/2 -translate-y-full pointer-events-none"
			style="left: clamp(90px, {bubble.screenX}px, calc(100% - 90px));
			       top: max(70px, {bubble.screenY - 8}px);"
		>
			<div
				class="relative bg-white rounded-2xl shadow-card px-4 py-3 max-w-[240px]
				       border-2 border-forest-200 pointer-events-auto"
			>
				<p class="text-sm font-bold text-bark-700 leading-snug">
					{$_(`garden.tutorial_${bubble.step + 1}`)}
				</p>
				<p class="text-[11px] text-bark-400 mt-1">{$_('garden.tutorial_tap_hint')}</p>
				<!-- Skip — small but honest; one tap ends the whole tour -->
				<button
					type="button"
					class="absolute -top-2.5 -right-2.5 bg-bark-100 hover:bg-bark-200 text-bark-500
					       text-[11px] font-bold rounded-full px-2 py-0.5 shadow-sm"
					on:click={() => worldCanvas?.skipTutorial()}
				>
					{$_('garden.tutorial_skip')}
				</button>
				<!-- Bubble tail -->
				<div
					class="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-white
					       border-b-2 border-r-2 border-forest-200 rotate-45"
				></div>
			</div>
		</div>
	{/if}

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
