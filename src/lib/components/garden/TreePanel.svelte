<script lang="ts">
	/**
	 * TreePanel.svelte — Bottom sheet showing tree stats + lesson trail.
	 *
	 * Slides up from the bottom of the screen when a tree is tapped.
	 * Shows tree health, growth stage, SunDrops, and a vertical lesson trail
	 * with completion states (completed / current / locked).
	 *
	 * Events:
	 *   close          — panel dismissed
	 *   lessonStart(lessonId: string) — current or completed lesson tapped
	 *
	 * Design rules:
	 *   - Health bar colour changes: green > 70%, amber 30-70%, red < 30%
	 *   - Lesson trail: green ✓ (completed), coral pulse (current), grey 🔒 (locked)
	 *   - Locked tap → toast message, no navigation
	 *   - Completed lessons are replayable (partial SunDrops earned)
	 */
	import { createEventDispatcher } from 'svelte';
	// WHY: getHealthBarColor is a pure display util — moved to $lib/utils/gardenUtils
	// so it can safely run in the browser (server modules are forbidden client-side)
	import { getHealthBarColor } from '$lib/utils/gardenUtils';
	import type { TreeData, LessonStep } from '$lib/types/garden';

	export let tree: TreeData;
	export let visible: boolean = false;

	const dispatch = createEventDispatcher<{
		close: void;
		lessonStart: string;
	}>();

	let lockedMessage: string | null = null;
	let lockedTimeout: ReturnType<typeof setTimeout> | null = null;

	/** Handles a tap on a lesson trail node */
	function handleLessonTap(step: LessonStep) {
		if (step.state === 'locked') {
			// Show temporary locked message — no navigation
			lockedMessage = 'Complete the previous lesson first! 🔒';
			if (lockedTimeout) clearTimeout(lockedTimeout);
			lockedTimeout = setTimeout(() => {
				lockedMessage = null;
			}, 2500);
			return;
		}

		if (step.lessonId) {
			dispatch('lessonStart', step.lessonId);
		}
	}

	function handleClose() {
		lockedMessage = null;
		dispatch('close');
	}

	/** Reactive health colour (Tailwind bg class) */
	$: healthBarClass = getHealthBarColor(tree?.health ?? 100);

	/** Health label for screen readers and accessibility */
	$: healthLabel =
		(tree?.health ?? 100) >= 70 ? 'Healthy' : (tree?.health ?? 100) >= 30 ? 'Needs care' : 'Struggling';
</script>

<!-- Backdrop — tap outside to close -->
{#if visible}
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 bg-black/20 z-40"
		on:click={handleClose}
		aria-hidden="true"
	></div>
{/if}

<!-- Bottom sheet -->
<div
	class="fixed bottom-0 left-0 right-0 z-50 bg-bark-50 rounded-t-3xl shadow-toast
	       transition-transform duration-300 ease-out max-h-[80vh] overflow-y-auto
	       {visible ? 'translate-y-0' : 'translate-y-full'}"
	role="dialog"
	aria-label="Tree details"
	aria-modal="true"
>
	<!-- Handle bar (for swipe-down gesture hint) -->
	<div class="flex justify-center pt-3 pb-1">
		<div class="w-10 h-1 rounded-full bg-bark-200"></div>
	</div>

	<!-- Header row -->
	<div class="flex items-center justify-between px-5 pt-2 pb-3">
		<div class="flex items-center gap-2">
			<span class="text-2xl" aria-hidden="true">{tree?.pathIcon ?? '🌱'}</span>
			<h2 class="font-display font-bold text-xl text-bark-800">
				{tree?.pathName ?? 'Loading...'}
			</h2>
		</div>
		<button
			on:click={handleClose}
			class="w-8 h-8 flex items-center justify-center rounded-full bg-bark-100
			       text-bark-500 hover:bg-bark-200 transition-colors"
			aria-label="Close panel"
		>
			✕
		</button>
	</div>

	<!-- Stats row -->
	<div class="px-5 pb-4 flex gap-4 flex-wrap">
		<!-- Health bar -->
		<div class="flex-1 min-w-[140px]">
			<div class="flex justify-between items-center mb-1">
				<span class="text-xs font-bold text-bark-500 uppercase tracking-wide">Health</span>
				<span
					class="text-xs font-bold {(tree?.health ?? 100) >= 70
						? 'text-forest-500'
						: (tree?.health ?? 100) >= 30
						? 'text-sundrop-600'
						: 'text-red-500'}"
				>
					{healthLabel} — {tree?.health ?? 100}%
				</span>
			</div>
			<div class="h-3 bg-bark-150 rounded-full overflow-hidden">
				<div
					class="h-full {healthBarClass} rounded-full transition-all duration-500"
					style="width: {tree?.health ?? 100}%"
					role="progressbar"
					aria-valuenow={tree?.health ?? 100}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label="Tree health {tree?.health ?? 100}%"
				></div>
			</div>
		</div>

		<!-- Sun Drops + Stage -->
		<div class="flex gap-3 items-center">
			<div class="text-center">
				<div class="text-lg font-bold text-sundrop-600">☀️ {tree?.sunDropsEarned ?? 0}</div>
				<div class="text-xs text-bark-400">SunDrops</div>
			</div>
			<div class="text-center">
				<div class="text-lg font-bold text-bark-700">🌸 {tree?.growthStage ?? 0}/14</div>
				<div class="text-xs text-bark-400">Stage</div>
			</div>
		</div>
	</div>

	<!-- Locked message toast -->
	{#if lockedMessage}
		<div
			class="mx-5 mb-3 px-4 py-2 bg-bark-700 text-white rounded-card text-sm font-bold
			       text-center transition-opacity duration-200"
			role="alert"
		>
			{lockedMessage}
		</div>
	{/if}

	<!-- Lesson Trail -->
	<div class="px-5 pb-6">
		<h3 class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-3">
			Lesson Trail
		</h3>

		{#if !tree?.lessonSteps?.length}
			<p class="text-bark-400 text-sm">No lessons available yet.</p>
		{:else}
			<div class="relative">
				<!-- Vertical dotted line connecting all nodes -->
				<div
					class="absolute left-[19px] top-5 bottom-5 w-0.5 border-l-2 border-dashed border-bark-200"
					aria-hidden="true"
				></div>

				<ol class="space-y-1">
					{#each tree.lessonSteps as step (step.index)}
						<li>
							<button
								class="relative flex items-center gap-4 w-full text-left py-3 px-2
								       rounded-xl transition-all duration-150
								       {step.state === 'locked'
									? 'opacity-60 cursor-not-allowed hover:bg-transparent'
									: 'hover:bg-bark-100 active:scale-[0.98]'}"
								on:click={() => handleLessonTap(step)}
								aria-label="{step.title} — {step.state === 'completed'
									? 'completed, tap to replay'
									: step.state === 'current'
									? 'tap to start'
									: 'locked'}"
							>
								<!-- Trail node circle -->
								<div
									class="relative z-10 w-10 h-10 rounded-full flex items-center justify-center
									       text-white font-bold text-sm flex-shrink-0
									       {step.state === 'completed'
										? 'bg-forest-400'
										: step.state === 'current'
										? 'bg-coral-400 animate-pulse shadow-btn-coral'
										: 'bg-bark-300'}"
								>
									{#if step.state === 'completed'}
										✓
									{:else if step.state === 'current'}
										{step.icon}
									{:else}
										🔒
									{/if}
								</div>

								<!-- Lesson title -->
								<div class="flex-1 min-w-0">
									<div
										class="font-bold text-sm truncate
										       {step.state === 'completed'
											? 'text-forest-600'
											: step.state === 'current'
											? 'text-coral-600'
											: 'text-bark-400'}"
									>
										{step.title}
									</div>
									{#if step.state === 'completed'}
										<div class="text-xs text-bark-400">Tap to replay</div>
									{:else if step.state === 'current'}
										<div class="text-xs text-coral-500 font-semibold">Ready to start!</div>
									{/if}
								</div>

								<!-- Arrow for current/completed -->
								{#if step.state !== 'locked'}
									<span class="text-bark-300 text-sm" aria-hidden="true">›</span>
								{/if}
							</button>
						</li>
					{/each}
				</ol>
			</div>
		{/if}
	</div>
</div>
