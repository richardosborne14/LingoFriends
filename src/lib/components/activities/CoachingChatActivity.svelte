<!--
  CoachingChatActivity — the scripted COACHING_CHAT step (Phase 3 / quick-wins sweep).

  Before this component existed the assembler emitted coaching_chat steps but
  ActivityRouter had no branch for them — kids saw the "Activity loading…"
  fallback as the FIRST step of every lesson.

  Scripted 4-phase flow (live conversation replaces this in TASK-AUDIT-04):
    intro    — NPC's warm coachingText, auto-played via TTS (jaw animates)
    discover — discoveryQuestion + tappable guesses ("What do you think it means?")
    reveal   — encouraging response referencing the child's pick; NO wrong answers
    (ready)  — "Let's practise!" button on the reveal panel → onComplete(true, 0)

  PEDAGOGY RULES (PEDAGOGY.md — coaching chat):
  - 0 SunDrops, no failure state, no hearts touched
  - Every guess gets encouragement; a "wrong" guess is "great thinking", never an ✗
  - The child's guess is acknowledged specifically (guided discovery, not quiz)

  Data contract: discoveryOptions[0] is the canonical correct meaning — the
  assembler builds it as [nativeTranslation, ...distractors]. We shuffle a COPY
  for display so the right answer isn't always the first button.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { CoachingChatActivity as CoachingConfig } from '$lib/types/lesson';
	import { playAudioIfAvailable, fetchAndPlay } from '$lib/services/audioService';
	import { audioMap } from '$lib/stores/lesson';

	interface Props {
		config: CoachingConfig;
		targetLanguage: string;
		/** Always called with (true, 0) — coaching never fails, never pays */
		onComplete: (correct: boolean, sunDropsEarned: number) => void;
		/** Fired when coaching TTS starts/stops — drives NPC jaw in EncounterScene */
		onSpeakingChange?: (speaking: boolean) => void;
	}

	let { config, targetLanguage, onComplete, onSpeakingChange }: Props = $props();

	type Phase = 'intro' | 'discover' | 'reveal';
	let phase = $state<Phase>('intro');

	/** The option the child tapped in the discover phase */
	let pickedOption = $state<string | null>(null);

	let isPlayingCoaching = $state(false);
	let isPlayingPhrase = $state(false);

	/** Canonical correct meaning — see data contract note in the header comment */
	const correctMeaning = config.discoveryOptions?.[0] ?? null;

	/**
	 * Options shuffled once per mount for display.
	 * Fisher–Yates on a copy — config must not be mutated (it lives in the plan).
	 */
	const shuffledOptions: string[] = (() => {
		const opts = [...(config.discoveryOptions ?? [])];
		for (let i = opts.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[opts[i], opts[j]] = [opts[j], opts[i]];
		}
		return opts;
	})();

	const pickedCorrectly = $derived(pickedOption !== null && pickedOption === correctMeaning);

	/** Auto-play the NPC's coaching text (native-language words, target voice — Rule 11) */
	async function playCoaching() {
		if (isPlayingCoaching) return;
		isPlayingCoaching = true;
		onSpeakingChange?.(true);

		if ($audioMap[config.coachingText]) {
			await playAudioIfAvailable(config.coachingText, $audioMap);
		} else {
			await fetchAndPlay(config.coachingText, targetLanguage);
		}

		isPlayingCoaching = false;
		onSpeakingChange?.(false);
	}

	/** Play the target phrase on demand (🔊 button) */
	async function playPhrase() {
		if (isPlayingPhrase) return;
		isPlayingPhrase = true;

		if ($audioMap[config.targetPhrase]) {
			await playAudioIfAvailable(config.targetPhrase, $audioMap);
		} else {
			await fetchAndPlay(config.targetPhrase, targetLanguage);
		}

		isPlayingPhrase = false;
	}

	function pick(option: string) {
		pickedOption = option;
		phase = 'reveal';
	}

	/** No options provided (older age groups may get none) — skip discover */
	function continueFromIntro() {
		phase = shuffledOptions.length > 0 ? 'discover' : 'reveal';
	}

	// Auto-play coaching text shortly after mount (same 400ms settle as ChunkIntroduction)
	onMount(() => {
		const timer = setTimeout(() => playCoaching(), 400);
		return () => clearTimeout(timer);
	});
</script>

<div class="flex flex-col items-center gap-5 w-full">

	<!-- ── NPC coaching speech bubble — always visible ─────────────────────── -->
	<div class="relative bg-white border-2 border-bark-150 rounded-card px-5 py-4 w-full shadow-card">
		<p class="text-base text-bark-700 font-medium leading-relaxed">
			{config.coachingText}
		</p>
		<button
			onclick={playCoaching}
			disabled={isPlayingCoaching}
			class="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold
				   text-sky-600 hover:text-sky-700 disabled:opacity-50"
			aria-label="Hear the coach again"
		>
			{#if isPlayingCoaching}
				<span class="animate-pulse">🔊</span> Speaking…
			{:else}
				<span>🔊</span> Hear it again
			{/if}
		</button>
	</div>

	<!-- ── Target phrase card ──────────────────────────────────────────────── -->
	<div class="bg-sky-50 border-2 border-sky-300 rounded-card px-6 py-4 w-full text-center">
		<p class="font-display text-2xl font-extrabold text-bark-800 tracking-wide leading-snug">
			{config.targetPhrase}
		</p>
		<button
			onclick={playPhrase}
			disabled={isPlayingPhrase}
			class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
				   bg-white border border-sky-200 text-sky-700 font-semibold text-sm
				   hover:bg-sky-100 transition-colors disabled:opacity-50"
			aria-label="Hear the phrase"
		>
			{isPlayingPhrase ? '🔊 Playing…' : '🔊 Hear it'}
		</button>
	</div>

	{#if phase === 'intro'}
		<button
			onclick={continueFromIntro}
			class="w-full py-3 rounded-btn bg-coral-400 hover:bg-coral-500
				   text-white font-bold text-base transition-colors shadow-btn-coral"
		>
			Continue →
		</button>

	{:else if phase === 'discover'}
		<!-- ── Guided discovery — a guess, not a quiz ──────────────────────── -->
		<p class="text-base font-bold text-bark-700 text-center">
			{config.discoveryQuestion}
		</p>
		<div class="flex flex-col gap-2 w-full">
			{#each shuffledOptions as option (option)}
				<button
					onclick={() => pick(option)}
					class="w-full py-3 px-4 rounded-btn border-2 border-bark-200 bg-white
						   text-bark-700 font-semibold text-base text-left
						   hover:border-sky-300 hover:bg-sky-50 transition-colors"
				>
					{option}
				</button>
			{/each}
		</div>

	{:else}
		<!-- ── Reveal — always encouraging, never an ✗ ─────────────────────── -->
		<div class="bg-emerald-50 border border-emerald-200 rounded-card px-5 py-4 w-full text-center">
			{#if pickedOption === null}
				<!-- Discover phase was skipped (no options) — just reveal the meaning -->
				<p class="font-semibold text-bark-700 text-base">
					"{config.targetPhrase}" means "<strong>{correctMeaning ?? config.discoveryQuestion}</strong>" 🌟
				</p>
			{:else if pickedCorrectly}
				<p class="font-semibold text-bark-700 text-base">
					Exactly! 🎉 "{config.targetPhrase}" means "<strong>{pickedOption}</strong>".
					You worked it out yourself!
				</p>
			{:else}
				<p class="font-semibold text-bark-700 text-base">
					Great thinking! 💭 It actually means
					"<strong>{correctMeaning}</strong>" — now you know a new phrase!
				</p>
			{/if}
		</div>

		<button
			onclick={() => onComplete(true, 0)}
			class="w-full py-3 rounded-btn bg-coral-400 hover:bg-coral-500
				   text-white font-bold text-base transition-colors shadow-btn-coral"
		>
			Let's practise! 🚀
		</button>
	{/if}

</div>
