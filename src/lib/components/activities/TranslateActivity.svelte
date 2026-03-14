<!--
  TranslateActivity — RECALL step (step 4 of 5)

  Shows a native-language phrase. The learner types the target-language translation.
  Uses answerMatcher with fuzzy checking + acceptedAnswers list.
  Most demanding step — 3 SunDrops — no hint by default.
-->
<script lang="ts">
	import type { TranslateActivity } from '$lib/types/lesson';
	import { isAnswerCorrect } from '$lib/utils/answerMatcher';
	import { helpUsedThisStep, recordCorrect, recordWrong, deductSunDrop } from '$lib/stores/lesson';

	interface Props {
		config: TranslateActivity;
		onComplete: (correct: boolean, sunDropsEarned: number) => void;
		onShowHelp: () => void;
	}

	let { config, onComplete, onShowHelp }: Props = $props();

	let inputValue = $state('');
	let revealed = $state(false);
	let isCorrect = $state(false);

	function submitAnswer() {
		if (revealed || !inputValue.trim()) return;
		revealed = true;

		const correct = isAnswerCorrect(
			inputValue,
			config.correctAnswer,
			config.acceptedAnswers ?? []
		);
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
</script>

<div class="flex flex-col gap-5 w-full">
	<!-- Source phrase in native language — sky pill -->
	<div class="bg-sky-50 border-2 border-sky-300 rounded-card px-6 py-4 text-center">
		<p class="text-sm text-sky-600 font-semibold mb-1 uppercase tracking-wide">Translate</p>
		<p class="text-xl font-bold text-bark-800">{config.sourcePhrase}</p>
	</div>

	<!-- Free-text answer input -->
	<input
		type="text"
		bind:value={inputValue}
		onkeydown={handleKeydown}
		disabled={revealed}
		placeholder="Type your translation…"
		aria-label="Your translation"
		class="w-full px-4 py-3 rounded-card border-2 text-base font-medium
			   focus:outline-none focus:border-coral-400
			   {revealed && isCorrect ? 'border-mint-400 bg-mint-50 text-mint-700' : ''}
			   {revealed && !isCorrect ? 'border-red-300 bg-red-50 text-red-600' : 'border-bark-200 bg-white text-bark-800'}"
	/>

	<!-- Feedback -->
	{#if revealed}
		{#if isCorrect}
			<p class="text-center text-mint-600 font-bold text-lg">✓ Correct!</p>
		{:else}
			<div class="bg-red-50 border border-red-200 rounded-card px-4 py-3 text-center">
				<p class="text-sm text-red-600">
					The answer is: <span class="font-bold">{config.correctAnswer}</span>
				</p>
			</div>
			<button
				onclick={() => onComplete(false, 0)}
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
				   shadow-btn-coral disabled:opacity-40 transition-colors"
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
