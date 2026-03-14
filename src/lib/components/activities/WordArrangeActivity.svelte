<!--
  WordArrangeActivity — PRACTICE step (variant).

  The learner sees word tiles shuffled in a "bank" area. Tapping a tile
  moves it into the answer slots (left to right). Tapping a placed tile
  removes it back to the bank. When all slots are filled, the Check button
  appears.

  Interaction model (tap-to-place, NOT drag-and-drop):
    - Tap bank tile → moves to next empty slot
    - Tap placed tile → returns to bank
    - Full answer → Check button appears automatically
  
  This avoids drag-and-drop complexity (unreliable on mobile in Svelte
  without a library). Tap-to-place is also faster and more accessible.

  Scoring:
    Correct → award config.sunDrops (halved if help used)
    Wrong → deduct 1 SunDrop, clear answer, allow retry (up to 2 wrong → show answer)
-->
<script lang="ts">
	import type { WordArrangeActivity } from '$lib/types/lesson';
	import { helpUsedThisStep, recordCorrect, recordWrong, deductSunDrop } from '$lib/stores/lesson';

	interface Props {
		config: WordArrangeActivity;
		onComplete: (correct: boolean, sunDropsEarned: number) => void;
		onShowHelp: () => void;
	}

	let { config, onComplete, onShowHelp }: Props = $props();

	/**
	 * Track which bank tiles are still available.
	 * We use indices into config.scrambledWords (not values) so duplicate
	 * words can coexist correctly. e.g., ["Ich", "Ich", "liebe"] needs
	 * two distinct "Ich" tiles.
	 */
	let availableIndices = $state<number[]>(
		config.scrambledWords.map((_, i) => i)
	);

	/** The answer slots — stores indices into scrambledWords, or null for empty */
	let placedIndices = $state<(number | null)[]>(
		// Pre-allocate slots: one for each word in the target sentence
		Array(config.scrambledWords.length).fill(null)
	);

	/** Number of wrong attempts — after 2, show the answer */
	let wrongAttempts = $state(0);

	/** Whether the answer has been checked and is correct */
	let solved = $state(false);

	/** Whether we're showing the correct answer (after 2 wrong) */
	let showingAnswer = $state(false);

	/**
	 * Computes the current placed words as a sentence string.
	 * Filters null slots so partial answers are handled correctly.
	 */
	const placedWords = $derived(
		placedIndices
			.filter((idx) => idx !== null)
			.map((idx) => config.scrambledWords[idx as number])
	);

	/**
	 * The first empty slot index in the placed array.
	 * Returns -1 if all slots are filled.
	 */
	const firstEmptySlot = $derived(placedIndices.indexOf(null));

	/** True when every slot has a word placed */
	const allSlotsFilled = $derived(placedIndices.every((idx) => idx !== null));

	/** True when the placed answer exactly matches the target sentence */
	const answerIsCorrect = $derived(
		placedWords.join(' ').toLowerCase().trim() ===
		config.targetSentence.toLowerCase().trim()
	);

	/**
	 * Moves a bank tile into the next available slot.
	 * No-op if all slots are full (Check button shown instead).
	 */
	function placeTile(bankIndex: number) {
		if (solved || showingAnswer) return;
		if (firstEmptySlot === -1) return; // All slots full — tap Check to submit

		// Remove from available bank
		availableIndices = availableIndices.filter((i) => i !== bankIndex);

		// Place in the next empty slot
		const updated = [...placedIndices];
		updated[firstEmptySlot] = bankIndex;
		placedIndices = updated;
	}

	/**
	 * Returns a bank tile from a slot back to the available bank.
	 * Allows the learner to change their mind about word order.
	 */
	function returnTile(slotIndex: number) {
		if (solved || showingAnswer) return;
		const tileIndex = placedIndices[slotIndex];
		if (tileIndex === null) return;

		// Restore to bank
		availableIndices = [...availableIndices, tileIndex].sort((a, b) => a - b);

		// Clear the slot — shift subsequent placed tiles left
		// (This makes the UX feel more natural than leaving a gap in the middle)
		const updated = [...placedIndices];
		updated.splice(slotIndex, 1, null);

		// Compact: shift all nulls to the end while preserving placed order
		const nonNull = updated.filter((v) => v !== null);
		const nullCount = updated.length - nonNull.length;
		placedIndices = [...nonNull, ...Array(nullCount).fill(null)];
	}

	/** Called when the learner taps Check */
	function checkAnswer() {
		if (!allSlotsFilled) return;

		if (answerIsCorrect) {
			solved = true;
			const earned = $helpUsedThisStep
				? Math.ceil(config.sunDrops / 2)
				: config.sunDrops;
			recordCorrect(earned);
			setTimeout(() => onComplete(true, earned), 900);
		} else {
			wrongAttempts += 1;
			deductSunDrop();
			recordWrong();

			if (wrongAttempts >= 2) {
				// After 2 wrong attempts, show the correct answer and let them continue
				// Per PEDAGOGY: never trap a learner — show the answer and move on
				showingAnswer = true;
			} else {
				// Clear slots so they can try again
				availableIndices = config.scrambledWords.map((_, i) => i);
				placedIndices = Array(config.scrambledWords.length).fill(null);
			}
		}
	}

	function continueAfterAnswer() {
		onComplete(false, 0);
	}

	/** Tile button class — bank tiles */
	function bankTileClass(idx: number): string {
		const base =
			'px-3 py-2 rounded-lg border-2 font-semibold text-base transition-all duration-100 select-none ';
		return (
			base +
			'bg-white border-bark-200 text-bark-700 hover:border-coral-300 hover:bg-coral-50 active:scale-[0.95]'
		);
	}

	/** Slot button class */
	function slotClass(idx: number): string {
		const base =
			'px-3 py-2 rounded-lg border-2 font-semibold text-base min-w-[3rem] text-center transition-all duration-100 ';
		if (placedIndices[idx] === null) {
			// Empty slot — dashed border placeholder
			return base + 'border-dashed border-bark-300 text-bark-300 bg-bark-50';
		}
		if (showingAnswer) {
			// Show in green after revealing answer
			return base + 'border-mint-400 bg-mint-50 text-mint-700';
		}
		// Filled slot — solid, removable
		return base + 'border-bark-400 bg-bark-100 text-bark-700 active:scale-[0.95]';
	}
</script>

<div class="flex flex-col gap-5 w-full">
	<!-- Instruction header -->
	<div class="text-center">
		<p class="text-sm font-semibold text-bark-400 uppercase tracking-wide mb-1">
			Arrange the words
		</p>
		<p class="text-base text-bark-500">
			Put them in the right order!
		</p>
	</div>

	<!-- Answer slots — placed words appear here -->
	<div class="flex flex-wrap gap-2 justify-center min-h-[52px] px-2 py-3
				bg-bark-50 border-2 border-bark-200 rounded-card">
		{#each placedIndices as tileIndex, slotIdx}
			<button
				onclick={() => returnTile(slotIdx)}
				disabled={solved || showingAnswer}
				class={slotClass(slotIdx)}
				aria-label={tileIndex !== null
					? `Remove ${config.scrambledWords[tileIndex]}`
					: 'Empty slot'}
			>
				{#if tileIndex !== null}
					{config.scrambledWords[tileIndex]}
				{:else}
					&nbsp;&nbsp;&nbsp;
				{/if}
			</button>
		{/each}
	</div>

	<!-- Tile bank — available words to tap -->
	<div class="flex flex-wrap gap-2 justify-center px-2 min-h-[44px]">
		{#each availableIndices as tileIdx}
			<button
				onclick={() => placeTile(tileIdx)}
				disabled={solved || showingAnswer || firstEmptySlot === -1}
				class={bankTileClass(tileIdx)}
			>
				{config.scrambledWords[tileIdx]}
			</button>
		{/each}
	</div>

	<!-- Check button — appears when all slots are filled -->
	{#if allSlotsFilled && !solved && !showingAnswer}
		<button
			onclick={checkAnswer}
			class="w-full h-14 rounded-btn bg-coral-400 hover:bg-coral-500 active:translate-y-[2px]
				   text-white font-bold text-lg shadow-btn-coral transition-all duration-100"
		>
			Check ✓
		</button>
	{/if}

	<!-- Wrong attempt feedback (before 2nd wrong reveals answer) -->
	{#if !solved && !showingAnswer && wrongAttempts === 1}
		<div class="bg-amber-50 border border-amber-200 rounded-card px-4 py-3 text-center">
			<p class="text-sm text-amber-700 font-semibold">
				Not quite! Give it another try 💪
			</p>
		</div>
	{/if}

	<!-- Show answer after 2 wrong attempts -->
	{#if showingAnswer}
		<div class="bg-red-50 border border-red-200 rounded-card px-4 py-3 text-center">
			<p class="text-sm text-red-600 font-semibold mb-1">
				The correct order is:
			</p>
			<p class="text-base font-bold text-red-700">
				{config.targetSentence}
			</p>
		</div>
		<button
			onclick={continueAfterAnswer}
			class="w-full h-12 rounded-btn bg-bark-200 hover:bg-bark-300 text-bark-700 font-bold text-base transition-colors"
		>
			Continue →
		</button>
	{/if}

	<!-- Help button -->
	{#if !solved && !showingAnswer && !allSlotsFilled}
		<button
			onclick={onShowHelp}
			class="self-end text-sm text-bark-400 hover:text-bark-600 underline underline-offset-2"
		>
			💡 Need a hint?
		</button>
	{/if}
</div>
