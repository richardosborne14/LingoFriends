<!--
  ProgressIndicator.svelte — Onboarding progress dots

  Shows a horizontal row of dots indicating current position in the flow.
  The active dot expands to a wider pill for clear visual emphasis.
  Completed dots are filled; upcoming dots are hollow.

  Designed to be placed above the step card — small and unobtrusive
  but always visible so the child knows how close they are to the end.
-->
<script lang="ts">
	/**
	 * @prop total - Total number of steps in the flow
	 * @prop current - 1-based index of the current step
	 */
	let { total, current }: { total: number; current: number } = $props();
</script>

<div class="flex justify-center items-center gap-2 mb-6" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total} aria-label="Step {current} of {total}">
	{#each Array(total) as _, i}
		<div
			class="h-2 rounded-full transition-all duration-300 ease-out
				{i + 1 === current
					? 'w-6 bg-coral-400'
					: i + 1 < current
					? 'w-2 bg-coral-300'
					: 'w-2 bg-bark-200'}"
		></div>
	{/each}
</div>
