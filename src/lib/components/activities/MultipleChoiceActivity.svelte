<!--
  MultipleChoiceActivity — RECOGNIZE (step 2) and APPLY (step 5)

  Shows 4 options. Tapping an option locks in the answer and shows
  immediate feedback (green ✓ or red ✗). Auto-advances after 1.2s on correct.
  Wrong answers show the correct option and let the learner continue.

  SunDrop halving: if $helpUsedThisStep, award Math.ceil(config.sunDrops / 2).
-->
<script lang="ts">
	import type { MultipleChoiceActivity } from '$lib/types/lesson';
	import { helpUsedThisStep, recordCorrect, recordWrong, deductSunDrop } from '$lib/stores/lesson';

	interface Props {
		config: MultipleChoiceActivity;
		onComplete: (correct: boolean, sunDropsEarned: number) => void;
		onShowHelp: () => void;
	}

	let { config, onComplete, onShowHelp }: Props = $props();

	/** Index of the option the learner tapped, or null if unanswered */
	let selectedIndex = $state<number | null>(null);
	let revealed = $state(false); // true after tap

	/** Which option index is correct */
	const correctIndex = config.correctIndex;

	function selectOption(index: number) {
		if (revealed) return; // already answered
		selectedIndex = index;
		revealed = true;

		const isCorrect = index === correctIndex;

		if (isCorrect) {
			// Award SunDrops (halved if help was used)
			const earned = $helpUsedThisStep
				? Math.ceil(config.sunDrops / 2)
				: config.sunDrops;
			recordCorrect(earned);
			// Auto-advance after short celebration pause
			setTimeout(() => onComplete(true, earned), 1000);
		} else {
			// Penalise one SunDrop and record wrong
			deductSunDrop();
			recordWrong();
		}
	}

	function continueAfterWrong() {
		onComplete(false, 0);
	}

	/** Tailwind classes for each option button based on state */
	function optionClass(index: number): string {
		const base =
			'w-full text-left px-4 py-3.5 rounded-card text-base font-semibold border-2 transition-all duration-150 ';
		if (!revealed) {
			return base + 'bg-white border-bark-200 text-bark-700 hover:border-coral-300 hover:bg-coral-50 active:scale-[0.98]';
		}
		if (index === correctIndex) {
			return base + 'bg-mint-50 border-mint-400 text-mint-700';
		}
		if (index === selectedIndex && index !== correctIndex) {
			return base + 'bg-red-50 border-red-400 text-red-600';
		}
		return base + 'bg-white border-bark-150 text-bark-400 opacity-60';
	}

	function optionIcon(index: number): string {
		if (!revealed) return '';
		if (index === correctIndex) return '✓';
		if (index === selectedIndex && index !== correctIndex) return '✗';
		return '';
	}
</script>

<div class="flex flex-col gap-4 w-full">
	<!-- Question prompt -->
	<p class="text-lg font-bold text-bark-700 text-center px-2 leading-snug">
		{config.question}
	</p>

	<!-- Options grid -->
	<div class="flex flex-col gap-3">
		{#each config.options as option, index}
			<button
				onclick={() => selectOption(index)}
				disabled={revealed}
				class={optionClass(index)}
			>
				<span class="flex items-center justify-between gap-2">
					<span>{option}</span>
					{#if revealed && optionIcon(index)}
						<span class="text-xl font-bold flex-shrink-0">{optionIcon(index)}</span>
					{/if}
				</span>
			</button>
		{/each}
	</div>

	<!-- Wrong-answer recovery -->
	{#if revealed && selectedIndex !== correctIndex}
		<div class="bg-red-50 border border-red-200 rounded-card px-4 py-3 text-center">
			<p class="text-sm text-red-600 font-semibold">
				Not quite! The answer is: <span class="font-bold">{config.options[correctIndex]}</span>
			</p>
		</div>
		<button
			onclick={continueAfterWrong}
			class="w-full h-12 rounded-btn bg-bark-200 hover:bg-bark-300 text-bark-700 font-bold text-base transition-colors"
		>
			Continue →
		</button>
	{/if}

	<!-- Help button (bottom-right, subtle) -->
	{#if !revealed}
		<button
			onclick={onShowHelp}
			class="self-end text-sm text-bark-400 hover:text-bark-600 underline underline-offset-2"
		>
			💡 Need a hint?
		</button>
	{/if}
</div>
