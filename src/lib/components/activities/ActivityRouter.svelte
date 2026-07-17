<!--
  ActivityRouter — decides which activity component to render based on step type.

  TASK-V2-07 additions:
    - Renders EncounterScene banner above ALL activity types (Option B user decision)
    - Tracks `npcIsSpeaking` state: set true when ChunkIntroduction starts playing
      explanation audio, false when it stops. EncounterScene uses this to animate
      the NPC's jaw during TTS playback.
    - Accepts optional `npcConfig` and `userAvatar` props from the lesson page.
      If either is null/undefined (e.g. profile not yet loaded), scene is omitted
      gracefully — activities still work without it.

  Also manages the shared help hint drawer (💡) that any activity can trigger.
  Rule 14 (graceful degradation): unknown activity types render a safe fallback.
-->
<script lang="ts">
	import type { LessonStep } from '$lib/types/lesson';
	import type { NPCConfig, AvatarOptions } from '$lib/types/garden';
	import { ActivityType } from '$lib/types/lesson';
	import { recordHelpUsed } from '$lib/stores/lesson';

	import EncounterScene from '$lib/components/lesson/EncounterScene.svelte';
	import ChunkIntroduction from '$lib/components/lesson/ChunkIntroduction.svelte';
	import MultipleChoiceActivity from './MultipleChoiceActivity.svelte';
	import FillBlankActivity from './FillBlankActivity.svelte';
	import TranslateActivity from './TranslateActivity.svelte';
	import TrueFalseActivity from './TrueFalseActivity.svelte';
	import WordArrangeActivity from './WordArrangeActivity.svelte';
	import MatchingPairsActivity from './MatchingPairsActivity.svelte';
	import SpeakItActivity from './SpeakItActivity.svelte'; // TASK-AUDIT-02
	import CoachingChatActivity from './CoachingChatActivity.svelte'; // Quick-wins: was falling to the unrouted fallback

	interface Props {
		step: LessonStep;
		targetLanguage: string;
		/** Called when the activity finishes (correct or wrong accepted) */
		onComplete: (correct: boolean, sunDropsEarned: number) => void;
		/**
		 * True once this step's activity has completed (TASK-FUN-01).
		 * Freezes the activity body (inert + dimmed) while the reward/penalty
		 * modal plays out, so the answered question can't be resubmitted.
		 */
		disabled?: boolean;
		/**
		 * NPC config for the current step — generated deterministically by
		 * the lesson page using generateNPC(stepIndex, totalSteps, lessonId).
		 * Optional: if not provided, EncounterScene is not rendered.
		 */
		npcConfig?: NPCConfig | null;
		/**
		 * User's avatar options from their profile.
		 * Optional: if not provided, EncounterScene is not rendered.
		 */
		userAvatar?: AvatarOptions | null;
	}

	let { step, targetLanguage, onComplete, disabled = false, npcConfig = null, userAvatar = null }: Props = $props();

	let helpVisible = $state(false);

	/**
	 * Whether the NPC should be shown in speaking mode (jaw animated).
	 * Set to true by ChunkIntroduction when explanation TTS starts playing,
	 * false when it stops. Only relevant for INFO steps but held here in
	 * ActivityRouter so EncounterScene can react to it.
	 */
	let npcIsSpeaking = $state(false);

	/** Whether we have enough data to render the encounter scene */
	const showEncounterScene = $derived(npcConfig !== null && userAvatar !== null);

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

	/**
	 * Called by ChunkIntroduction when TTS explanation audio starts/stops.
	 * Drives the NPC jaw animation in EncounterScene.
	 *
	 * @param speaking - true when audio begins, false when it ends/pauses
	 */
	function handleSpeakingChange(speaking: boolean) {
		npcIsSpeaking = speaking;
	}
</script>

<div class="relative w-full flex flex-col gap-4">
	<!--
	  EncounterScene banner — user avatar (left) facing NPC (right).
	  Rendered above ALL activity types per user decision (Option B).
	  aria-hidden because it's decorative — the lesson content is in the activity below.
	-->
	{#if showEncounterScene}
		<EncounterScene
			userAvatar={userAvatar!}
			npcConfig={npcConfig!}
			isSpeaking={npcIsSpeaking}
		/>
	{/if}

	<!-- Tutor text (coaching instruction shown above the activity) -->
	{#if step.tutorText}
		<p class="text-base text-bark-500 text-center font-medium leading-snug px-2">
			{step.tutorText}
		</p>
	{/if}

	<!-- Activity body — switched by type.
	     When disabled (step already answered, modal in flight) the whole body
	     goes inert: no pointer, no keyboard, no focus — and dims so the freeze
	     is visible (TASK-FUN-01). -->
	<div
		inert={disabled}
		class="flex flex-col gap-4 transition-opacity duration-200 {disabled ? 'opacity-60' : ''}"
		aria-disabled={disabled}
	>
	{#if step.activity.type === ActivityType.INFO}
		<!-- ChunkIntroduction replaces InfoActivity for TASK-V2-02:
		     auto-plays explanation TTS, has separate phrase audio button.
		     TASK-V2-07: onSpeakingChange callback drives NPC jaw animation. -->
		<ChunkIntroduction
			config={step.activity}
			helpText={step.helpText}
			{targetLanguage}
			onComplete={handleInfoComplete}
			onSpeakingChange={handleSpeakingChange}
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

	{:else if step.activity.type === ActivityType.COACHING_CHAT}
		<!-- Scripted NPC coaching intro — 0 SunDrops, no failure state.
		     onSpeakingChange drives the EncounterScene jaw like ChunkIntroduction. -->
		<CoachingChatActivity
			config={step.activity}
			{targetLanguage}
			{onComplete}
			onSpeakingChange={handleSpeakingChange}
		/>

	{:else if step.activity.type === ActivityType.SPEAK_IT}
		<!-- TASK-AUDIT-02: SpeakIt — child listens to TTS then speaks it back -->
		<SpeakItActivity
			config={step.activity}
			{targetLanguage}
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
	</div>

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
