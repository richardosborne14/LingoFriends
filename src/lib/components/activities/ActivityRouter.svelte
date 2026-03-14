<!--
  ActivityRouter — decides which activity component to render based on step type.

  Also manages the shared help panel (💡 hint drawer) that any activity can trigger.
  The help panel shows the step's helpText with a slide-up animation.

  Rule 14 (graceful degradation): unknown activity types render a safe fallback.
-->
<script lang="ts">
	import type { LessonStep } from '$lib/types/lesson';
	import { ActivityType } from '$lib/types/lesson';
	import { recordHelpUsed } from '$lib/stores/lesson';

	import ChunkIntroduction from '$lib/components/lesson/ChunkIntroduction.svelte';
	import MultipleChoiceActivity from './MultipleChoiceActivity.svelte';
	import FillBlankActivity from './FillBlankActivity.svelte';
	import TranslateActivity from './TranslateActivity.svelte';
	import TrueFalseActivity from './TrueFalseActivity.svelte';
	import WordArrangeActivity from './WordArrangeActivity.svelte';
	import MatchingPairsActivity from './MatchingPairsActivity.svelte';

	interface Props {
		step: LessonStep;
		targetLanguage: string;
		/** Called when the activity finishes (correct or wrong accepted) */
		onComplete: (correct: boolean, sunDropsEarned: number) => void;
	}

	let { step, targetLanguage, onComplete }: Props = $props();

	let helpVisible = $state(false);

	function showHelp() {
		if (!helpVisible) {
			// Record first time help is shown per step
			recordHelpUsed();
			helpVisible = true;
		}
	}

	function hideHelp() {
		helpVisible = false;
	}

	/** InfoActivity completes with no correct/wrong tracking */
	function handleInfoComplete() {
		onComplete(true, 0);
	}
</script>

<div class="relative w-full flex flex-col gap-4">
	<!-- Tutor text (coaching instruction shown above the activity) -->
	{#if step.tutorText}
		<p class="text-base text-bark-500 text-center font-medium leading-snug px-2">
			{step.tutorText}
		</p>
	{/if}

	<!-- Activity body — switched by type -->
	{#if step.activity.type === ActivityType.INFO}
		<!-- ChunkIntroduction replaces InfoActivity for TASK-V2-02:
		     auto-plays explanation TTS, has separate phrase audio button -->
		<ChunkIntroduction
			config={step.activity}
			helpText={step.helpText}
			{targetLanguage}
			onComplete={handleInfoComplete}
		/>

	{:else if step.activity.type === ActivityType.MULTIPLE_CHOICE}
		<MultipleChoiceActivity
			config={step.activity}
			{onComplete}
			onShowHelp={showHelp}
		/>

	{:else if step.activity.type === ActivityType.FILL_BLANK}
		<FillBlankActivity
			config={step.activity}
			{onComplete}
			onShowHelp={showHelp}
		/>

	{:else if step.activity.type === ActivityType.TRANSLATE}
		<TranslateActivity
			config={step.activity}
			{onComplete}
			onShowHelp={showHelp}
		/>

	{:else if step.activity.type === ActivityType.TRUE_FALSE}
		<!-- TrueFalse — quick apply step: is this statement true or false? -->
		<TrueFalseActivity
			config={step.activity}
			{onComplete}
			onShowHelp={showHelp}
		/>

	{:else if step.activity.type === ActivityType.WORD_ARRANGE}
		<!-- WordArrange — tap-to-place word tiles into the correct sentence order -->
		<WordArrangeActivity
			config={step.activity}
			{onComplete}
			onShowHelp={showHelp}
		/>

	{:else if step.activity.type === ActivityType.MATCHING}
		<!-- MatchingPairs — connect target phrases to native translations -->
		<MatchingPairsActivity
			config={step.activity}
			{onComplete}
			onShowHelp={showHelp}
		/>

	{:else}
		<!-- Graceful fallback for unimplemented activity types (Rule 14) -->
		<div class="bg-bark-100 rounded-card px-5 py-6 text-center">
			<p class="text-bark-500 font-semibold">Activity loading…</p>
			<button
				onclick={() => onComplete(true, 0)}
				class="mt-4 px-6 py-2 rounded-btn bg-coral-400 text-white font-bold text-base"
			>
				Continue
			</button>
		</div>
	{/if}

	<!-- Help drawer — slides up from bottom of activity area -->
	{#if helpVisible && step.helpText}
		<div
			class="bg-amber-50 border border-amber-200 rounded-card px-4 py-4 mt-2
				   animate-in slide-in-from-bottom-2 duration-200"
		>
			<div class="flex items-start justify-between gap-3">
				<div class="flex gap-2 items-start">
					<span class="text-xl flex-shrink-0">💡</span>
					<p class="text-sm text-amber-800 leading-relaxed font-medium">
						{step.helpText}
					</p>
				</div>
				<button
					onclick={hideHelp}
					aria-label="Close hint"
					class="text-amber-400 hover:text-amber-600 flex-shrink-0 text-lg leading-none"
				>
					✕
				</button>
			</div>
		</div>
	{/if}
</div>
