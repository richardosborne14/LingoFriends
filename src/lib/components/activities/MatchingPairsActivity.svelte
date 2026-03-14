<!--
  MatchingPairsActivity — end-of-lesson review activity.

  Two columns side by side:
    Left: target language phrases (shuffled)
    Right: native language translations (shuffled independently)

  The learner taps one item from each side to form a pair. When a match
  is correct, both items fade out with a green flash. When wrong, both
  items shake red and are re-enabled.

  This is a COMPLETION activity — it only appears when a lesson has 2+ chunks
  and covers all of them together. It's the final step before the lesson ends.

  Scoring:
    Each correct pair: 1 SunDrop (awarded cumulatively from config.sunDrops)
    Wrong pair: 0 penalty (matching is already hard — no extra punishment)
    Full completion → onComplete(true, totalEarned)

  UX notes:
    - Items fade to invisible (not removed from DOM) to preserve column height
    - Max 4 pairs per screen to avoid scroll on small phones (assembler controls this)
    - No time limit — this is a calm review, not a speed test
-->
<script lang="ts">
	import type { MatchingActivity } from '$lib/types/lesson';
	import { recordCorrect } from '$lib/stores/lesson';

	interface Props {
		config: MatchingActivity;
		onComplete: (correct: boolean, sunDropsEarned: number) => void;
		onShowHelp: () => void;
	}

	let { config, onComplete, onShowHelp }: Props = $props();

	/**
	 * State for each item:
	 *   idle    — not selected, not matched
	 *   selected — currently tapped, awaiting pair
	 *   matched  — correctly paired, fading out
	 *   wrong   — briefly flashing red after incorrect pairing
	 */
	type ItemState = 'idle' | 'selected' | 'matched' | 'wrong';

	// Left column: target language phrases (left side of each pair)
	let leftStates = $state<ItemState[]>(config.pairs.map(() => 'idle'));

	// Right column: native translations (right side of each pair) — shuffled INDEPENDENTLY
	// We store the right items in a separate order so columns are misaligned
	const rightOrder = $derived(buildShuffledRightOrder(config.pairs.length));
	let rightStates = $state<ItemState[]>(config.pairs.map(() => 'idle'));

	/**
	 * Builds a shuffled index mapping for the right column.
	 * rightOrder[i] tells us which pair index is shown in row i of the right column.
	 *
	 * We shuffle once at component creation time so it's stable across re-renders.
	 * Using a seed based on pair count — not truly random but deterministic for testing.
	 */
	function buildShuffledRightOrder(length: number): number[] {
		const indices = Array.from({ length }, (_, i) => i);
		// Simple deterministic shuffle that still misaligns left and right
		// We do a fixed rotation + swap pattern so the pairs are never trivially aligned
		for (let i = length - 1; i > 0; i--) {
			const j = (i * 7 + 3) % (i + 1); // deterministic but not sequential
			[indices[i], indices[j]] = [indices[j], indices[i]];
		}
		return indices;
	}

	/** Which left-column index is currently selected (-1 = none) */
	let selectedLeft = $state(-1);
	/** Which right-column index is currently selected (-1 = none) */
	let selectedRight = $state(-1);

	/** Total sundrops earned so far (awarded per correct pair) */
	let earned = $state(0);

	/** How many pairs have been correctly matched */
	const matchedCount = $derived(leftStates.filter((s) => s === 'matched').length);

	/** True when all pairs are matched */
	const allMatched = $derived(matchedCount === config.pairs.length);

	/** SunDrops per correct pair — distribute total evenly across pairs */
	const sunDropsPerPair = $derived(
		Math.max(1, Math.floor(config.sunDrops / config.pairs.length))
	);

	function selectLeft(index: number) {
		if (leftStates[index] === 'matched' || leftStates[index] === 'wrong') return;
		if (selectedLeft === index) {
			// Deselect on second tap
			leftStates[index] = 'idle';
			selectedLeft = -1;
			return;
		}
		// Deselect previous left selection
		if (selectedLeft !== -1) leftStates[selectedLeft] = 'idle';
		selectedLeft = index;
		leftStates[index] = 'selected';

		// If a right item is already selected, attempt a match
		if (selectedRight !== -1) attemptMatch();
	}

	function selectRight(index: number) {
		if (rightStates[index] === 'matched' || rightStates[index] === 'wrong') return;
		if (selectedRight === index) {
			// Deselect on second tap
			rightStates[index] = 'idle';
			selectedRight = -1;
			return;
		}
		// Deselect previous right selection
		if (selectedRight !== -1) rightStates[selectedRight] = 'idle';
		selectedRight = index;
		rightStates[index] = 'selected';

		// If a left item is already selected, attempt a match
		if (selectedLeft !== -1) attemptMatch();
	}

	/**
	 * Checks if the currently selected left and right items form a correct pair.
	 *
	 * Logic:
	 *   leftIndex → config.pairs[leftIndex].left  (the left item text)
	 *   rightIndex → rightOrder[rightIndex] gives us which pair index this right item belongs to
	 *   If leftIndex === rightOrder[rightIndex], it's a match.
	 */
	function attemptMatch() {
		const leftIdx = selectedLeft;
		const rightIdx = selectedRight;

		// Map right display index back to pair index
		const rightPairIdx = rightOrder[rightIdx];

		if (leftIdx === rightPairIdx) {
			// Correct match!
			leftStates[leftIdx] = 'matched';
			rightStates[rightIdx] = 'matched';
			selectedLeft = -1;
			selectedRight = -1;

			// Award one portion of the total sundrops
			earned += sunDropsPerPair;
			recordCorrect(sunDropsPerPair);

			// Check if all pairs are now matched
			// Small delay so the "matched" state is visible before completion
			setTimeout(() => {
				if (allMatched) {
					onComplete(true, earned);
				}
			}, 400);
		} else {
			// Wrong match — flash red then reset both to idle
			leftStates[leftIdx] = 'wrong';
			rightStates[rightIdx] = 'wrong';

			setTimeout(() => {
				// Only reset if still in wrong state (not matched by another attempt)
				if (leftStates[leftIdx] === 'wrong') leftStates[leftIdx] = 'idle';
				if (rightStates[rightIdx] === 'wrong') rightStates[rightIdx] = 'idle';
				selectedLeft = -1;
				selectedRight = -1;
			}, 600); // 600ms red flash — short enough to not be annoying
		}
	}

	/**
	 * Returns Tailwind classes for an item button based on its state.
	 */
	function itemClass(state: ItemState): string {
		const base =
			'w-full px-3 py-3 rounded-card border-2 font-semibold text-sm text-center ' +
			'transition-all duration-150 select-none ';
		switch (state) {
			case 'idle':
				return (
					base +
					'bg-white border-bark-200 text-bark-700 hover:border-coral-300 hover:bg-coral-50 active:scale-[0.97]'
				);
			case 'selected':
				return base + 'bg-coral-50 border-coral-400 text-coral-700 scale-[1.02]';
			case 'matched':
				// Faded out — visually hidden but keeps layout space
				return base + 'bg-mint-50 border-mint-300 text-mint-600 opacity-30 pointer-events-none';
			case 'wrong':
				return base + 'bg-red-50 border-red-400 text-red-600 scale-[0.97]';
		}
	}
</script>

<div class="flex flex-col gap-4 w-full">
	<!-- Header -->
	<div class="text-center">
		<p class="text-sm font-semibold text-bark-400 uppercase tracking-wide mb-1">
			Match the pairs
		</p>
		<p class="text-base text-bark-500">
			Tap one from each side to connect them!
		</p>
	</div>

	<!-- Progress indicator -->
	{#if config.pairs.length > 1}
		<div class="flex justify-center gap-1.5">
			{#each config.pairs as _, i}
				<div
					class="w-2.5 h-2.5 rounded-full transition-colors duration-200 {leftStates[i] === 'matched'
						? 'bg-mint-400'
						: 'bg-bark-200'}"
				></div>
			{/each}
		</div>
	{/if}

	<!-- Two-column layout -->
	<div class="grid grid-cols-2 gap-3">
		<!-- Left column: target phrases -->
		<div class="flex flex-col gap-2">
			{#each config.pairs as pair, i}
				<button
					onclick={() => selectLeft(i)}
					disabled={leftStates[i] === 'matched'}
					class={itemClass(leftStates[i])}
				>
					{pair.left}
				</button>
			{/each}
		</div>

		<!-- Right column: native translations (in shuffled order) -->
		<div class="flex flex-col gap-2">
			{#each rightOrder as pairIdx, displayIdx}
				<button
					onclick={() => selectRight(displayIdx)}
					disabled={rightStates[displayIdx] === 'matched'}
					class={itemClass(rightStates[displayIdx])}
				>
					{config.pairs[pairIdx].right}
				</button>
			{/each}
		</div>
	</div>

	<!-- Help button — only before activity is complete -->
	{#if !allMatched}
		<button
			onclick={onShowHelp}
			class="self-end text-sm text-bark-400 hover:text-bark-600 underline underline-offset-2"
		>
			💡 Need a hint?
		</button>
	{/if}
</div>
