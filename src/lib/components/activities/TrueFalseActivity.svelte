<!--
  TrueFalseActivity — APPLY step (variant) and bonus quick check.

  Shows a statement about a phrase. The learner taps TRUE or FALSE.
  Two large tap targets fill the screen — easy on mobile, fast to answer.

  Scoring:
    Correct → award config.sunDrops (halved if help was used)
    Wrong → deduct 1 SunDrop, show correct answer, wait for manual Continue

  Design intent: this is a QUICK activity. The statement is short, the buttons
  are huge, the feedback is instant. It breaks up the pace between longer
  word-arrange and translate steps.
-->
<script lang="ts">
	import type { TrueFalseActivity } from '$lib/types/lesson';
	import { helpUsedThisStep, recordCorrect, recordWrong, deductSunDrop } from '$lib/stores/lesson';

	interface Props {
		config: TrueFalseActivity;
		onComplete: (correct: boolean, sunDropsEarned: number) => void;
		onShowHelp: () => void;
	}

	let { config, onComplete, onShowHelp }: Props = $props();

	/** null = unanswered, true = learner said TRUE, false = learner said FALSE */
	let answer = $state<boolean | null>(null);
	let revealed = $state(false);

	/** Whether the learner's answer matches the correct answer */
	const isCorrect = $derived(answer !== null && answer === config.isTrue);

	function choose(value: boolean) {
		if (revealed) return; // already answered
		answer = value;
		revealed = true;

		if (value === config.isTrue) {
			// Correct — halve sundrops if help was used (Rule 3: help penalty)
			const earned = $helpUsedThisStep
				? Math.ceil(config.sunDrops / 2)
				: config.sunDrops;
			recordCorrect(earned);
			// Short celebration pause then auto-advance
			setTimeout(() => onComplete(true, earned), 900);
		} else {
			// Wrong — one SunDrop penalty, wait for manual continue
			deductSunDrop();
			recordWrong();
		}
	}

	function continueAfterWrong() {
		onComplete(false, 0);
	}

	/**
	 * Button style helper.
	 * Before answer: neutral white cards.
	 * After answer: correct = green, wrong choice = red, other = dimmed.
	 */
	function btnClass(value: boolean): string {
		const base =
			'flex-1 flex flex-col items-center justify-center gap-2 h-28 rounded-card border-2 ' +
			'font-extrabold text-2xl transition-all duration-150 select-none ';

		if (!revealed) {
			return (
				base +
				'bg-white border-bark-200 text-bark-700 hover:border-coral-300 hover:bg-coral-50 active:scale-[0.97]'
			);
		}

		// Is this button the correct answer?
		const isThisCorrect = value === config.isTrue;
		// Did the learner choose this button?
		const wasChosen = value === answer;

		if (isThisCorrect) {
			// Always highlight the correct answer after reveal
			return base + 'bg-mint-50 border-mint-400 text-mint-700';
		}
		if (wasChosen && !isThisCorrect) {
			// Learner chose wrong
			return base + 'bg-red-50 border-red-400 text-red-600';
		}
		// The button the learner didn't choose (and it's wrong)
		return base + 'bg-white border-bark-150 text-bark-300 opacity-50';
	}
</script>

<div class="flex flex-col gap-5 w-full">
	<!-- Statement to evaluate -->
	<div class="bg-bark-50 border border-bark-200 rounded-card px-5 py-5 text-center">
		<p class="text-xs font-semibold text-bark-400 uppercase tracking-wide mb-2">
			True or False?
		</p>
		<p class="text-lg font-bold text-bark-800 leading-snug">
			{config.question}
		</p>
	</div>

	<!-- TRUE / FALSE buttons — side by side, large tap targets -->
	<div class="flex gap-3 w-full">
		<!-- TRUE button -->
		<button
			onclick={() => choose(true)}
			disabled={revealed}
			class={btnClass(true)}
			aria-label="True"
		>
			<span class="text-3xl" aria-hidden="true">✓</span>
			<span>True</span>
		</button>

		<!-- FALSE button -->
		<button
			onclick={() => choose(false)}
			disabled={revealed}
			class={btnClass(false)}
			aria-label="False"
		>
			<span class="text-3xl" aria-hidden="true">✗</span>
			<span>False</span>
		</button>
	</div>

	<!-- Wrong answer feedback + continue -->
	{#if revealed && !isCorrect}
		<div class="bg-red-50 border border-red-200 rounded-card px-4 py-3 text-center">
			<p class="text-sm text-red-600 font-semibold">
				Not quite! That's actually
				<span class="font-bold">{config.isTrue ? 'TRUE' : 'FALSE'}</span>.
			</p>
		</div>
		<button
			onclick={continueAfterWrong}
			class="w-full h-12 rounded-btn bg-bark-200 hover:bg-bark-300 text-bark-700 font-bold text-base transition-colors"
		>
			Continue →
		</button>
	{/if}

	<!-- Help button — only shown before answer is locked in -->
	{#if !revealed}
		<button
			onclick={onShowHelp}
			class="self-end text-sm text-bark-400 hover:text-bark-600 underline underline-offset-2"
		>
			💡 Need a hint?
		</button>
	{/if}
</div>
