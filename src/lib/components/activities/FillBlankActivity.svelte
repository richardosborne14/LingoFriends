<!--
  FillBlankActivity — PRACTICE step (step 3 of 5)

  Shows a sentence with a blank (___). The learner types the missing word.
  Uses the answerMatcher for fuzzy, diacritic-tolerant checking.
  Submit on Enter or button tap.
-->
<script lang="ts">
	import type { FillBlankActivity } from '$lib/types/lesson';
	import { isAnswerCorrect } from '$lib/utils/answerMatcher';
	import { helpUsedThisStep, recordCorrect, recordWrong, deductSunDrop } from '$lib/stores/lesson';

	interface Props {
		config: FillBlankActivity;
		onComplete: (correct: boolean, sunDropsEarned: number) => void;
		onShowHelp: () => void;
	}

	let { config, onComplete, onShowHelp }: Props = $props();

	let inputValue = $state('');
	let revealed = $state(false);
	let isCorrect = $state(false);

	/** Split the sentence at ___ for display */
	const [before, after] = config.sentence.split('___');

	function submitAnswer() {
		if (revealed || !inputValue.trim()) return;
		revealed = true;

		// FillBlankActivity has a single correctAnswer; pass empty acceptedAnswers
		const correct = isAnswerCorrect(inputValue, config.correctAnswer, []);
		isCorrect = correct;

		if (correct) {
			const earned = $helpUsedThisStep
				? Math.ceil(config.sunDrops / 2)
				: config.sunDrops;
			recordCorrect(earned);
			setTimeout(() => onComplete(true, earned), 1000);
		} else {
			deductSunDrop();
			recordWrong();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') submitAnswer();
	}

	function continueAfterWrong() {
		onComplete(false, 0);
	}
</script>

<div class="flex flex-col gap-5 w-full">
	<!-- Sentence with inline input replacing the blank -->
	<div class="bg-sky-50 border-2 border-sky-200 rounded-card px-5 py-5">
		<p class="text-lg font-semibold text-bark-700 leading-relaxed flex flex-wrap items-center gap-1">
			<span>{before}</span>
			<input
				type="text"
				bind:value={inputValue}
				onkeydown={handleKeydown}
				disabled={revealed}
				placeholder="…"
				aria-label="Fill in the blank"
				class="inline-block min-w-[80px] w-28 px-2 py-1 border-b-2 bg-transparent text-center
					   font-bold text-bark-800
					   focus:outline-none focus:border-coral-400
					   {revealed && isCorrect ? 'border-mint-400 text-mint-600' : ''}
					   {revealed && !isCorrect ? 'border-red-400 text-red-600' : 'border-bark-400'}"
			/>
			{#if after}<span>{after}</span>{/if}
		</p>
	</div>

	<!-- Feedback -->
	{#if revealed}
		{#if isCorrect}
			<p class="text-center text-mint-600 font-bold text-lg">✓ Correct!</p>
		{:else}
			<div class="bg-red-50 border border-red-200 rounded-card px-4 py-3 text-center">
				<p class="text-sm text-red-600 font-semibold">
					The answer is: <span class="font-bold">{config.correctAnswer}</span>
				</p>
			</div>
			<button
				onclick={continueAfterWrong}
				class="w-full h-12 rounded-btn bg-bark-200 hover:bg-bark-300 text-bark-700 font-bold text-base transition-colors"
			>
				Continue →
			</button>
		{/if}
	{:else}
		<button
			onclick={submitAnswer}
			disabled={!inputValue.trim()}
			class="w-full h-12 rounded-btn bg-coral-400 hover:bg-coral-500 text-white font-bold text-base
				   shadow-btn-coral disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
		>
			Check ✓
		</button>
		<button
			onclick={onShowHelp}
			class="self-end text-sm text-bark-400 hover:text-bark-600 underline underline-offset-2"
		>
			💡 Need a hint?
		</button>
	{/if}
</div>
