<!--
  SpeakItActivity — TASK-AUDIT-02: Pronunciation practice activity.

  The ONLY activity where children produce language vocally.
  Based on Swain's Output Hypothesis: speaking is essential for acquisition,
  not just listening/reading. Children CANNOT get good at speaking without speaking.

  CRITICAL PEDAGOGY RULES (enforced in this component):
  - NEVER penalise — loseHeart() is NOT called here (speaking = courage)
  - NEVER show "wrong" — only encouraging feedback at every tier
  - Minimum 1 SunDrop on attempt 3 regardless of stars (perseverance matters)
  - Maximum 3 attempts before auto-completing with best score
  - "Listen first" button auto-plays on mount (phrase is audible before ask)

  State machine:
    idle → recording (MicButton held) → processing (STT/compare) → result → idle/complete

  @see pronunciationService.ts — comparison algorithm
  @see PEDAGOGY.md — Affective Filter, Voice-first interaction
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { SpeakItActivity as SpeakItConfig } from '$lib/types/lesson';
	import {
		comparePronunciation,
		calculateSpeakItSunDrops,
		type PronunciationResult,
	} from '$lib/services/pronunciationService';
	import { audioMap } from '$lib/stores/lesson';
	import MicButton from '$lib/components/ui/MicButton.svelte';

	// ─── Props ────────────────────────────────────────────────────────────────

	interface Props {
		config: SpeakItConfig;
		/** Target language ISO code — used for TTS fetch if audio not in cache */
		targetLanguage: string;
		/** Called when activity completes: (correct=true, sunDropsEarned) */
		onComplete: (correct: boolean, sunDropsEarned: number) => void;
		/** Called when the help button is tapped */
		onShowHelp: () => void;
	}

	let { config, targetLanguage, onComplete, onShowHelp }: Props = $props();

	// ─── State ────────────────────────────────────────────────────────────────

	/**
	 * Activity phase — drives which UI panel is shown.
	 *
	 * 'idle'       — waiting for child to tap Mic (shows instruction + listen button)
	 * 'recording'  — mic is active, capturing audio
	 * 'processing' — STT request in flight
	 * 'result'     — comparison complete, showing stars + feedback
	 */
	type Phase = 'idle' | 'recording' | 'processing' | 'result';
	let phase = $state<Phase>('idle');

	/** Which attempt we're on (1, 2, or 3) */
	let attemptNumber = $state(1);

	/** MAX_ATTEMPTS = 3 — after this, auto-complete with best earned score */
	const MAX_ATTEMPTS = 3;

	/** Best result seen across all attempts */
	let bestResult = $state<PronunciationResult | null>(null);

	/** The CURRENT attempt's result (shown in result panel) */
	let currentResult = $state<PronunciationResult | null>(null);

	/** Whether the TTS audio is currently playing */
	let isPlayingAudio = $state(false);

	/** Error message if STT call fails */
	let processingError = $state<string | null>(null);

	// ─── Computed ─────────────────────────────────────────────────────────────

	/** The best stars earned across all attempts (for final SunDrop calculation) */
	const bestStars = $derived(bestResult?.stars ?? 1);

	/** SunDrops to award on activity completion */
	const earnedSunDrops = $derived(
		calculateSpeakItSunDrops(bestStars, attemptNumber)
	);

	/** True when child has used all their attempts */
	const attemptsExhausted = $derived(attemptNumber >= MAX_ATTEMPTS && phase === 'result');

	// ─── Audio: "Listen First" ────────────────────────────────────────────────

	/**
	 * Play the TTS audio for the target phrase.
	 *
	 * Strategy:
	 * 1. Check audioMap (pre-cached server-side audio)
	 * 2. If not found, fetch from /api/tts on demand
	 *
	 * WHY play on mount: children need to hear the phrase before being asked to
	 * say it. Autoplay-on-mount is pedagogically correct here (not intrusive).
	 */
	async function playPhraseAudio(): Promise<void> {
		if (isPlayingAudio) return;

		// Try audioCache first (keyed by text or by audioKey if set)
		const cacheKey = config.audioKey ?? config.targetPhrase;
		const cachedAudio = $audioMap[cacheKey];

		let audioSrc: string | null = null;

		if (cachedAudio) {
			// Cached audio is a base64 MP3 — create a data URL
			audioSrc = `data:audio/mp3;base64,${cachedAudio}`;
		} else {
			// Fetch TTS on demand
			try {
				const params = new URLSearchParams({
					text: config.targetPhrase,
					language: targetLanguage,
				});
				const res = await fetch(`/api/tts?${params}`);
				if (res.ok) {
					const data = await res.json();
					if (data.audio) {
						audioSrc = `data:audio/mp3;base64,${data.audio}`;
					}
				}
			} catch {
				// TTS fetch failed — silently skip audio (not a blocking error)
				return;
			}
		}

		if (!audioSrc) return;

		// Play via Web Audio
		isPlayingAudio = true;
		const audio = new Audio(audioSrc);
		audio.onended = () => { isPlayingAudio = false; };
		audio.onerror = () => { isPlayingAudio = false; };
		await audio.play().catch(() => { isPlayingAudio = false; });
	}

	// ─── STT recording callbacks ──────────────────────────────────────────────

	/**
	 * MicButton fires onTranscript when STT completes.
	 * We set phase='processing' briefly (shows "Thinking…" while we compute).
	 * MicButton manages its own recording UI — we don't need an onStart callback.
	 *
	 * MicButton's onResult callback — fires when STT returns a transcript.
	 * Compares transcript to expected phrase and shows result panel.
	 *
	 * @param transcript - What Whisper heard from the child
	 */
	function handleTranscript(transcript: string): void {
		phase = 'processing'; // Show "Thinking…" briefly

		// Compare synchronously (no async needed — pronunciationService is pure)
		const result = comparePronunciation(config.targetPhrase, transcript);

		currentResult = result;

		// Track best across attempts
		if (!bestResult || result.stars > bestResult.stars) {
			bestResult = result;
		}

		phase = 'result';
	}

	/**
	 * MicButton's onError callback — handle recording/STT failure gracefully.
	 * We don't penalise for technical errors — child didn't fail, tech did.
	 */
	function handleRecordError(errorMessage: string): void {
		processingError = errorMessage;
		phase = 'idle'; // Reset to idle so they can try again
	}

	// ─── Activity flow ────────────────────────────────────────────────────────

	/**
	 * "Try Again" button handler — reset to idle for another attempt.
	 * Only available when attemptNumber < MAX_ATTEMPTS.
	 */
	function tryAgain(): void {
		attemptNumber += 1;
		currentResult = null;
		phase = 'idle';
	}

	/**
	 * "Continue" button handler — complete the activity with earned SunDrops.
	 * Also called automatically when all attempts are exhausted.
	 *
	 * IMPORTANT: ALWAYS calls onComplete(true, ...) — pronunciation never "fails".
	 * The star rating is about quality feedback, not pass/fail.
	 */
	function complete(): void {
		// Always correct=true — pronunciation practice never fails (PEDAGOGY.md)
		onComplete(true, earnedSunDrops);
	}

	/**
	 * "Skip for now" link — completes with 0 SunDrops but no penalty.
	 * Available in idle phase for children who don't want to use mic.
	 */
	function skip(): void {
		onComplete(true, 0); // 0 SunDrops but no punishment
	}

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	/**
	 * Auto-play the phrase audio on mount.
	 * WHY: Child needs to hear the phrase before trying to say it.
	 * This is the "listen first" principle from PEDAGOGY.md.
	 */
	onMount(() => {
		// Small delay to let the component settle before playing audio
		// 300ms prevents audio clashing with page transition sounds
		setTimeout(playPhraseAudio, 300);
	});

	// ─── Star rendering ───────────────────────────────────────────────────────

	/**
	 * Maps a star count to rendered star characters.
	 * Filled stars (⭐) for earned, outline (☆) for unearned.
	 */
	function renderStars(stars: number): string {
		return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
	}

	/**
	 * Star tier → background colour for the result card.
	 * Warmer colours for higher scores — visual reward without numbers.
	 */
	function starColour(stars: number): string {
		if (stars >= 4) return 'bg-emerald-50 border-emerald-200';
		if (stars >= 3) return 'bg-sky-50 border-sky-200';
		if (stars >= 2) return 'bg-amber-50 border-amber-200';
		return 'bg-bark-50 border-bark-200'; // 1 star: still warm, still encouraging
	}
</script>

<!-- ─── Component ────────────────────────────────────────────────────────── -->
<div class="flex flex-col gap-4">

	<!-- Phrase display card — always visible -->
	<div class="bg-white rounded-card border border-bark-100 px-5 py-5 text-center shadow-sm">

		<!-- Instruction -->
		<p class="text-sm text-bark-400 font-medium mb-3">
			Say this out loud:
		</p>

		<!-- Target phrase — large, prominent -->
		<p class="text-2xl font-bold text-bark-700 leading-tight mb-1">
			{config.targetPhrase}
		</p>

		<!-- Native translation — smaller, for context -->
		<p class="text-sm text-bark-400 italic">
			{config.nativeTranslation}
		</p>

		<!-- Listen button -->
		<button
			onclick={playPhraseAudio}
			disabled={isPlayingAudio}
			class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full
				   bg-sky-50 hover:bg-sky-100 border border-sky-200
				   text-sky-700 font-semibold text-sm
				   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			aria-label="Tap to hear the phrase"
		>
			{#if isPlayingAudio}
				<span class="animate-pulse">🔊</span> Playing…
			{:else}
				<span>🔊</span> Tap to hear it
			{/if}
		</button>
	</div>

	<!-- ─── RESULT PANEL ────────────────────────────────────────────────── -->
	{#if phase === 'result' && currentResult}
		<div class="rounded-card border px-5 py-4 {starColour(currentResult.stars)}">

			<!-- Stars -->
			<div class="text-2xl text-center tracking-wide mb-2">
				{renderStars(currentResult.stars)}
			</div>

			<!-- Feedback message -->
			<p class="text-center font-semibold text-bark-700 text-sm leading-snug">
				{#if currentResult.stars === 5}
					Perfect! You sound amazing! 🌟
				{:else if currentResult.stars === 4}
					Great pronunciation! Almost perfect! ⭐
				{:else if currentResult.stars === 3}
					Pretty good! You're getting the hang of it! 👍
				{:else if currentResult.stars === 2}
					Not bad! Keep listening and trying!
				{:else}
					Good effort! Let's listen again and try once more 💪
				{/if}
			</p>

			<!-- What they said (transparency) -->
			{#if currentResult.transcript}
				<p class="text-center text-xs text-bark-400 mt-2">
					You said: "<em>{currentResult.transcript}</em>"
				</p>
			{/if}

			<!-- Attempt counter -->
			<p class="text-center text-xs text-bark-400 mt-1">
				Attempt {attemptNumber} of {MAX_ATTEMPTS}
			</p>
		</div>

		<!-- Action buttons -->
		<div class="flex gap-3">
			{#if !attemptsExhausted && currentResult.stars < 5}
				<!-- Try again — only if attempts remain AND not perfect -->
				<button
					onclick={tryAgain}
					class="flex-1 py-3 rounded-btn border-2 border-sky-300
						   bg-white text-sky-700 font-bold text-base
						   hover:bg-sky-50 transition-colors"
				>
					Try again 🔄
				</button>
			{/if}

			<!-- Continue — always available after a result -->
			<button
				onclick={complete}
				class="flex-1 py-3 rounded-btn bg-coral-400 hover:bg-coral-500
					   text-white font-bold text-base transition-colors"
			>
				Continue →
			</button>
		</div>

	<!-- ─── RECORDING PHASE ─────────────────────────────────────────────── -->
	{:else if phase === 'recording' || phase === 'processing'}
		<div class="bg-white rounded-card border border-bark-100 px-5 py-6 text-center">
			{#if phase === 'recording'}
				<p class="text-bark-600 font-semibold text-base animate-pulse">
					🎤 Listening… tap to stop
				</p>
			{:else}
				<p class="text-bark-500 font-medium text-base animate-pulse">
					Thinking…
				</p>
			{/if}
		</div>

	<!-- ─── IDLE PHASE ──────────────────────────────────────────────────── -->
	{:else}
		<!-- Error message (shown if previous attempt had a tech error) -->
		{#if processingError}
			<div class="bg-amber-50 border border-amber-200 rounded-card px-4 py-3">
				<p class="text-amber-800 text-sm font-medium">
					⚠️ Couldn't hear you clearly. Try again, or check your microphone.
				</p>
			</div>
		{/if}

		<!-- Attempt counter (for attempts 2+) -->
		{#if attemptNumber > 1}
			<p class="text-center text-sm text-bark-400">
				Attempt {attemptNumber} of {MAX_ATTEMPTS}
			</p>
		{/if}
	{/if}

	<!-- ─── MIC BUTTON ──────────────────────────────────────────────────── -->
	<!-- Visible in idle phase only — hidden during recording (MicButton handles its own recording UI) -->
	{#if phase === 'idle'}
		<div class="flex flex-col items-center gap-3">
			<!--
			MicButton props: onTranscript (required), onError (optional).
			The button manages its own recording UI — tap to start, tap again to stop.
		-->
		<MicButton
				onTranscript={handleTranscript}
				onError={handleRecordError}
			/>

			<!-- Help + Skip row -->
			<div class="flex items-center gap-4 mt-1">
				<button
					onclick={onShowHelp}
					class="text-sm text-bark-400 hover:text-bark-600 underline"
				>
					💡 Need a hint?
				</button>
				<span class="text-bark-200">·</span>
				<button
					onclick={skip}
					class="text-sm text-bark-400 hover:text-bark-600"
				>
					Skip for now
				</button>
			</div>
		</div>
	{/if}

</div>
