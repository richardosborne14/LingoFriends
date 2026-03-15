<!--
  MicButton.svelte — Reusable microphone input button

  TASK-AUDIT-01: Voice Input Foundation

  Four visual states (managed internally):
    idle       — Grey mic icon, "Tap to speak"
    recording  — Red pulsing ring, "Tap to stop", waveform dots
    processing — Spinner, "Thinking..." (while STT API call is in-flight)
    error      — Brief error message shown for 3s, then returns to idle

  Touch target: minimum 48×48px in all size variants (WCAG 2.5.5 AAA).
  The button is intentionally larger than 44px because it's a PRIMARY action
  for children — small hands need generous tap targets.

  USAGE:
    <MicButton
      languageHint="de"
      onTranscript={(text) => insertIntoInput(text)}
      onError={(msg) => console.warn(msg)}
    />

  Integration pattern:
    1. Parent places MicButton next to a text input
    2. When onTranscript fires, parent inserts the text into its input
    3. When onError fires, parent can show a toast (or just let the button
       handle the error display — it shows an error state for 3 seconds)

  Props:
    languageHint  — ISO code passed to Whisper as a hint (e.g. 'de', 'fr')
    onTranscript  — Called with the final text string on success
    onError       — Optional. Called with an error message on failure.
                    The button also shows its own error state — this prop
                    is for parents that want to do additional handling.
    maxDuration   — Auto-stop after N seconds (default: 15)
    size          — 'sm' | 'md' | 'lg' (default: 'md')
    disabled      — Prevents interaction when true

  State machine:
    idle ──tap──▶ [check permission]
                       ├── unknown → show MicPermissionPrompt
                       ├── granted → start recording
                       └── denied/unavailable → show error

    [check permission]
      onAllow → requestMicAccess() → granted → start recording
      onDismiss → chooseTextOnly() → hide mic (handled in micEnabled store)

    recording ──tap──▶ stop recording → processing → onTranscript

    recording ──timer──▶ auto-stop → processing → onTranscript

    processing ──response──▶ idle (via onTranscript)

    * ──error──▶ error (3s) ──▶ idle
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import MicPermissionPrompt from './MicPermissionPrompt.svelte';
	import {
		micPermissionState,
		micEnabled,
		markPromptShown,
		markGranted,
		markDenied,
		markUnavailable,
		chooseTextOnly,
	} from '$lib/stores/micPermission';
	import {
		requestMicAccess,
		startRecording,
		transcribeBlob,
		type RecordingHandle,
		type STTError,
	} from '$lib/services/sttService';

	// ── Props ──────────────────────────────────────────────────────────────

	interface Props {
		/** ISO language code hint for Whisper (target or native lang per context) */
		languageHint?: string;
		/** Called with the transcript text when STT succeeds */
		onTranscript: (text: string) => void;
		/** Optional: called with an error message on failure (button handles its own UI) */
		onError?: (errorMessage: string) => void;
		/** Auto-stop recording after this many seconds. Default: 15 */
		maxDuration?: number;
		/** Size variant — controls button dimensions */
		size?: 'sm' | 'md' | 'lg';
		/** Whether the button is disabled */
		disabled?: boolean;
	}

	let {
		languageHint,
		onTranscript,
		onError,
		maxDuration = 15,
		size = 'md',
		disabled = false,
	}: Props = $props();

	// ── Internal state ─────────────────────────────────────────────────────

	/**
	 * Which of the four visual states is active.
	 * idle → recording → processing → idle
	 *                              ↘ error → idle (after 3s)
	 */
	type ButtonState = 'idle' | 'recording' | 'processing' | 'error';
	let buttonState = $state<ButtonState>('idle');

	/** Brief error message displayed in error state */
	let errorMessage = $state('');

	/** Whether to show the permission modal */
	let showPermissionPrompt = $state(false);

	/** Active recording session handle */
	let recordingHandle = $state<RecordingHandle | null>(null);

	/** Timestamp when recording started — for duration tracking */
	let recordingStartTime = $state(0);

	/** Auto-stop timer reference */
	let autoStopTimer: ReturnType<typeof setTimeout> | null = null;

	/** Error display timer reference */
	let errorTimer: ReturnType<typeof setTimeout> | null = null;

	// ── Computed ───────────────────────────────────────────────────────────

	/**
	 * Size-based CSS classes for the button container.
	 * Minimum touch target: 48×48px at all sizes.
	 * Note: 'sm' is still 48px wide for accessibility.
	 */
	const sizeClasses = $derived(
		size === 'sm'
			? 'w-12 h-12' // 48px
			: size === 'lg'
				? 'w-16 h-16' // 64px
				: 'w-14 h-14' // 56px — default 'md'
	);

	/** Icon size inside the button */
	const iconClasses = $derived(
		size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
	);

	/** Aria label updates per state for screen reader announcement */
	const ariaLabel = $derived(
		buttonState === 'recording'
			? 'Recording, tap to stop'
			: buttonState === 'processing'
				? 'Processing speech'
				: buttonState === 'error'
					? `Error: ${errorMessage}`
					: 'Tap to speak'
	);

	// ── Cleanup ────────────────────────────────────────────────────────────

	onDestroy(() => {
		// Abort any active recording if component is destroyed mid-session
		recordingHandle?.abort();
		if (autoStopTimer) clearTimeout(autoStopTimer);
		if (errorTimer) clearTimeout(errorTimer);
	});

	// ── State transitions ──────────────────────────────────────────────────

	/** Show error state briefly, then return to idle */
	function showError(msg: string) {
		buttonState = 'error';
		errorMessage = msg;
		onError?.(msg);

		// Auto-clear error after 3 seconds — don't leave the button stuck
		if (errorTimer) clearTimeout(errorTimer);
		errorTimer = setTimeout(() => {
			buttonState = 'idle';
			errorMessage = '';
		}, 3000);
	}

	/** Start the active recording session */
	async function beginRecording() {
		let stream: MediaStream;
		try {
			stream = await requestMicAccess();
			markGranted();
		} catch (err) {
			const sttErr = err as STTError;
			if (sttErr.kind === 'mic_denied') markDenied();
			if (sttErr.kind === 'mic_unavailable') markUnavailable();
			showError(sttErr.message ?? 'Microphone not available');
			return;
		}

		// Start recording via MediaRecorder
		let handle: RecordingHandle;
		try {
			handle = startRecording(stream);
		} catch (err) {
			const sttErr = err as STTError;
			showError(sttErr.message ?? 'Could not start recording');
			return;
		}

		recordingHandle = handle;
		recordingStartTime = Date.now();
		buttonState = 'recording';

		// Auto-stop after maxDuration seconds so recordings don't run forever
		autoStopTimer = setTimeout(() => {
			if (buttonState === 'recording') {
				handleStopRecording();
			}
		}, maxDuration * 1000);
	}

	/** Stop recording and send to STT */
	async function handleStopRecording() {
		if (!recordingHandle || buttonState !== 'recording') return;

		// Clear the auto-stop timer (we're stopping manually or via timer)
		if (autoStopTimer) {
			clearTimeout(autoStopTimer);
			autoStopTimer = null;
		}

		const durationMs = Date.now() - recordingStartTime;
		const handle = recordingHandle;
		recordingHandle = null;
		buttonState = 'processing';

		let blob: Blob;
		try {
			blob = await handle.stop();
		} catch {
			showError('Recording failed — please try again');
			return;
		}

		// Send to /api/stt via sttService
		try {
			const result = await transcribeBlob(blob, languageHint, durationMs);
			buttonState = 'idle';
			onTranscript(result.text);
		} catch (err) {
			const sttErr = err as STTError;
			showError(sttErr.message ?? "I didn't catch that — please try again");
		}
	}

	// ── Main tap handler ───────────────────────────────────────────────────

	/**
	 * Primary interaction: tap to start, tap to stop.
	 *
	 * On first tap (state = 'unknown'), we show the friendly permission modal.
	 * On subsequent taps (state = 'granted'), we go straight to recording.
	 * While recording, tapping stops the session.
	 */
	async function handleTap() {
		if (disabled) return;

		if (buttonState === 'recording') {
			// Tap to stop — most common second action
			await handleStopRecording();
			return;
		}

		if (buttonState === 'processing') {
			// Can't interrupt processing — ignore the tap
			return;
		}

		// Check permission state
		const permState = $micPermissionState;

		if (permState === 'unknown') {
			// Show our friendly modal before the browser's scary dialog
			showPermissionPrompt = true;
			markPromptShown();
			return;
		}

		if (permState === 'denied') {
			showError('Microphone access was not allowed — please check your browser settings');
			return;
		}

		if (permState === 'unavailable') {
			showError('No microphone found on this device');
			return;
		}

		if (permState === 'text_only') {
			// Should not be reachable (micEnabled would hide the button)
			return;
		}

		// 'granted' or 'prompt_shown' → proceed to record
		await beginRecording();
	}

	/** Called when child taps "Let's try!" in the permission prompt */
	async function handlePermissionAllow() {
		showPermissionPrompt = false;
		await beginRecording();
	}

	/** Called when child taps "I'll type instead" in the permission prompt */
	function handlePermissionDismiss() {
		showPermissionPrompt = false;
		chooseTextOnly();
	}
</script>

<!--
  The mic button is only rendered if micEnabled (not text_only, not unavailable).
  The parent can still render this component unconditionally — it self-hides.
-->
{#if $micEnabled}
	<!-- Permission modal — shown once per session before first getUserMedia call -->
	{#if showPermissionPrompt}
		<MicPermissionPrompt
			onAllow={handlePermissionAllow}
			onDismiss={handlePermissionDismiss}
		/>
	{/if}

	<button
		type="button"
		onclick={handleTap}
		{disabled}
		aria-label={ariaLabel}
		aria-live="polite"
		class="relative flex items-center justify-center rounded-full
		       transition-all duration-150 focus-visible:outline-none
		       focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2
		       disabled:opacity-40 disabled:cursor-not-allowed
		       {sizeClasses}
		       {buttonState === 'recording'
				? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
				: buttonState === 'processing'
					? 'bg-bark-100 text-bark-400 cursor-wait'
					: buttonState === 'error'
						? 'bg-orange-100 text-orange-500'
						: 'bg-bark-100 text-bark-400 hover:bg-bark-200 hover:text-bark-500'}"
	>
		<!--
		  Recording pulse ring — CSS animation so it works on low-end devices.
		  Only shown while recording. Uses prefers-reduced-motion check via CSS.
		-->
		{#if buttonState === 'recording'}
			<span
				class="absolute inset-0 rounded-full bg-red-400 opacity-40
				       motion-safe:animate-ping pointer-events-none"
				aria-hidden="true"
			></span>
		{/if}

		<!-- Icons: each state has a distinct visual -->
		{#if buttonState === 'idle' || buttonState === 'error'}
			<!-- Microphone icon — idle state -->
			<svg
				class={iconClasses}
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
				/>
			</svg>

		{:else if buttonState === 'recording'}
			<!-- Stop icon — indicates tapping will stop recording -->
			<svg
				class={iconClasses}
				fill="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<rect x="6" y="6" width="12" height="12" rx="2" />
			</svg>

		{:else if buttonState === 'processing'}
			<!-- Spinner — STT call is in-flight -->
			<svg
				class="{iconClasses} animate-spin"
				fill="none"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				/>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
				/>
			</svg>
		{/if}
	</button>

	<!--
	  Error tooltip — floats below the button for 3 seconds.
	  Uses aria-live on the button itself for screen reader announcement.
	-->
	{#if buttonState === 'error' && errorMessage}
		<div
			class="absolute mt-1 top-full left-1/2 -translate-x-1/2 whitespace-nowrap
			       text-xs font-medium text-orange-600 bg-orange-50 rounded-lg
			       px-3 py-1 shadow-sm border border-orange-200 z-10 pointer-events-none"
			aria-hidden="true"
		>
			{errorMessage}
		</div>
	{/if}
{/if}
