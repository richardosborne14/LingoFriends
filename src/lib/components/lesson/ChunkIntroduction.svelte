<!--
  ChunkIntroduction — the INTRODUCE step (INFO activity), overhauled for TASK-V2-02.

  This replaces the generic InfoActivity for INFO steps. Key differences:
  - Auto-plays the EXPLANATION text via TTS on mount (the "NPC speaking" the coaching text)
    WHY: The explanation is in the native language, but spoken with the target-language voice.
    This is Rule 11: the charming accent effect on native-language words is intentional.
  - A separate 🔊 button plays the TARGET PHRASE for pronunciation practice
    WHY: Hearing the phrase correctly is critical before the quiz steps begin.
  - Pulls audio from the lesson's audioCache (pre-generated server-side) — instant playback.
    Falls back to on-demand TTS fetch if cache misses.

  User decision (TASK-V2-02): "I'd like it to read the explanation actually,
  it can read the phrase when you get into the lesson questions."
  So: explanation auto-plays here, phrase plays on demand (replay button).
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
		onComplete: () => void;
	}

	let { config, targetLanguage, onComplete }: Props = $props();

	// Track which audio is currently playing to prevent overlap
	let isPlayingExplanation = $state(false);
	let isPlayingPhrase = $state(false);
	// Track if the phrase audio button has been tapped at least once
	let phraseHeard = $state(false);

	// ─────────────────────────────────────────────────────────────────────────
	// AUDIO HELPERS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Auto-play the EXPLANATION text via TTS.
	 * The explanation is native-language text spoken in the target-language voice.
	 * This creates the charming accent effect described in RULE 11 / AI-STRATEGY.md.
	 *
	 * Checks audioCache ($audioMap) first — if pre-generated server-side, plays instantly.
	 * Falls back to on-demand TTS if not cached.
	 */
	async function playExplanation() {
		if (isPlayingExplanation || !config.explanation) return;
		isPlayingExplanation = true;

		// Try cached audio first (from lessonPlan.audioCache via lesson store)
		if ($audioMap[config.explanation]) {
			await playAudioIfAvailable(config.explanation, $audioMap);
		} else {
			// Cache miss — fetch on demand (lesson still works, just slightly slower)
			await fetchAndPlay(config.explanation, targetLanguage);
		}

		isPlayingExplanation = false;
	}

	/**
	 * Play the TARGET PHRASE for pronunciation practice.
	 * Called when the learner taps the 🔊 button.
	 *
	 * WHY separate from explanation playback: we want the learner to hear
	 * the explanation coaching first, then optionally hear the phrase.
	 * If they tap 🔊, set phraseHeard = true (enables the "Got it!" button
	 * for very young learners — optional enforcement).
	 */
	async function playPhrase() {
		if (isPlayingPhrase) return;
		isPlayingPhrase = true;
		phraseHeard = true;

		if ($audioMap[config.targetPhrase]) {
			await playAudioIfAvailable(config.targetPhrase, $audioMap);
		} else {
			await fetchAndPlay(config.targetPhrase, targetLanguage);
		}

		isPlayingPhrase = false;
	}

	// Auto-play the explanation shortly after mounting.
	// 400ms delay avoids clashing with page transition animations.
	onMount(() => {
		const timer = setTimeout(() => playExplanation(), 400);
		return () => clearTimeout(timer);
	});
</script>

<div class="flex flex-col items-center gap-6 w-full">

	<!-- ── TARGET PHRASE (visually dominant) ─────────────────────────────── -->
	<!-- The target phrase is always the hero element — large, sky-tinted card -->
	<div class="bg-sky-50 border-2 border-sky-300 rounded-card px-6 py-5 w-full text-center shadow-card">
		<p class="font-display text-2xl font-extrabold text-bark-800 tracking-wide leading-snug">
			{config.targetPhrase}
		</p>

		<!-- Phrase pronunciation button — separate from explanation auto-play -->
		<button
			onclick={playPhrase}
			disabled={isPlayingPhrase}
			aria-label="Hear this phrase pronounced"
			title="Tap to hear the pronunciation"
			class="mt-3 mx-auto flex items-center justify-center w-12 h-12 rounded-full
				   bg-coral-400 hover:bg-coral-500 active:scale-95 text-white
				   shadow-btn-coral disabled:opacity-50 transition-all duration-100"
		>
			{#if isPlayingPhrase}
				<!-- Spinner while audio loads/plays -->
				<span class="block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
			{:else}
				<!-- Play icon -->
				<svg class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
					<path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
				</svg>
			{/if}
		</button>
	</div>

	<!-- ── NATIVE TRANSLATION ──────────────────────────────────────────────── -->
	<p class="text-lg font-semibold text-bark-400 text-center">
		{config.nativeTranslation}
	</p>

	<!-- ── EXPLANATION (with replay audio button) ─────────────────────────── -->
	{#if config.explanation}
		<div class="bg-bark-100 border border-bark-150 rounded-card px-5 py-4 w-full">
			<!-- Header row: label + replay explanation button -->
			<div class="flex items-center justify-between gap-2 mb-2">
				<span class="text-xs font-semibold text-bark-400 uppercase tracking-wide">
					Did you know?
				</span>
				<!-- Replay explanation button — smaller, secondary style -->
				<button
					onclick={playExplanation}
					disabled={isPlayingExplanation}
					aria-label="Hear the explanation again"
					title="Replay explanation"
					class="w-7 h-7 flex items-center justify-center rounded-full
						   bg-bark-200 hover:bg-bark-300 text-bark-500 disabled:opacity-50
						   transition-all duration-100 flex-shrink-0"
				>
					{#if isPlayingExplanation}
						<span class="block w-3 h-3 rounded-full border border-bark-400 border-t-bark-600 animate-spin"></span>
					{:else}
						<svg class="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
							<path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
						</svg>
					{/if}
				</button>
			</div>
			<p class="text-base text-bark-600 leading-relaxed">
				{config.explanation}
			</p>
		</div>
	{/if}

	<!-- ── EXAMPLE SENTENCE (optional) ───────────────────────────────────── -->
	{#if config.exampleSentence}
		<p class="text-sm text-bark-400 italic text-center px-1">
			e.g. "{config.exampleSentence}"
		</p>
	{/if}

	<!-- ── CONTINUE BUTTON ────────────────────────────────────────────────── -->
	<!-- Always enabled — we never block progress on the INTRODUCE step -->
	<button
		onclick={onComplete}
		class="w-full h-14 rounded-btn bg-coral-400 hover:bg-coral-500 active:translate-y-[2px]
			   text-white font-bold text-lg shadow-btn-coral transition-all duration-100 mt-2"
	>
		Got it! ✓
	</button>

</div>
