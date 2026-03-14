<!--
  InfoActivity — INTRODUCE step (Step 1 of 5)
  
  Shows the target phrase, translation, and explanation.
  Auto-plays audio on mount if available in the audioMap.
  Awards 0 SunDrops — teaching is free, no quiz.
  
  The target phrase is always the most visually prominent element (design system).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { InfoActivity } from '$lib/types/lesson';
	import { playAudioIfAvailable, fetchAndPlay } from '$lib/services/audioService';
	import { audioMap } from '$lib/stores/lesson';

	interface Props {
		config: InfoActivity;
		helpText: string;
		targetLanguage: string;
		/** Called when the learner taps "Got it!" */
		onComplete: () => void;
	}

	let { config, targetLanguage, onComplete }: Props = $props();

	let isPlayingAudio = $state(false);

	/** Play audio for the target phrase */
	async function playPhrase() {
		if (isPlayingAudio) return;
		isPlayingAudio = true;

		// Try pre-fetched audio first, fall back to on-demand TTS
		if ($audioMap[config.targetPhrase]) {
			await playAudioIfAvailable(config.targetPhrase, $audioMap);
		} else {
			await fetchAndPlay(config.targetPhrase, targetLanguage);
		}

		isPlayingAudio = false;
	}

	// Auto-play the phrase when the step first renders
	// Wrapped in a short delay to avoid immediate audio after page transition
	onMount(() => {
		const timer = setTimeout(() => playPhrase(), 400);
		return () => clearTimeout(timer);
	});
</script>

<!-- Teaching step: no score header, full-width phrase card -->
<div class="flex flex-col items-center gap-6 w-full">
	<!-- Target phrase — always the dominant element (design system: weight-800, sky-50 pill) -->
	<div class="bg-sky-50 border-2 border-sky-300 rounded-card px-6 py-5 w-full text-center shadow-card">
		<p class="font-display text-2xl font-extrabold text-bark-800 tracking-wide leading-snug">
			{config.targetPhrase}
		</p>

		<!-- Audio replay button — coral circle with play icon -->
		<button
			onclick={playPhrase}
			disabled={isPlayingAudio}
			aria-label="Play pronunciation"
			class="mt-3 mx-auto flex items-center justify-center w-12 h-12 rounded-full
				   bg-coral-400 hover:bg-coral-500 active:scale-95
				   text-white shadow-btn-coral disabled:opacity-50
				   transition-all duration-100"
		>
			{#if isPlayingAudio}
				<span class="block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
			{:else}
				<!-- Play triangle -->
				<svg class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
					<path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
				</svg>
			{/if}
		</button>
	</div>

	<!-- Native translation -->
	<p class="text-lg font-semibold text-bark-400 text-center">
		{config.nativeTranslation}
	</p>

	<!-- Optional explanation (coaching-style warm text) -->
	{#if config.explanation}
		<div class="bg-bark-100 border border-bark-150 rounded-card px-5 py-4 w-full">
			<p class="text-base text-bark-600 leading-relaxed">
				{config.explanation}
			</p>
		</div>
	{/if}

	<!-- Optional example sentence -->
	{#if config.exampleSentence}
		<div class="w-full px-1">
			<p class="text-sm text-bark-400 italic text-center">
				e.g. "{config.exampleSentence}"
			</p>
		</div>
	{/if}

	<!-- "Got it!" CTA — primary, full width -->
	<button
		onclick={onComplete}
		class="w-full h-14 rounded-btn bg-coral-400 hover:bg-coral-500 active:translate-y-[2px]
			   text-white font-bold text-lg shadow-btn-coral
			   transition-all duration-100 mt-2"
	>
		Got it! ✓
	</button>
</div>
