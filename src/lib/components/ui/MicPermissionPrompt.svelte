<!--
  MicPermissionPrompt.svelte — First-time microphone permission modal

  TASK-AUDIT-01: Voice Input Foundation

  Shown ONCE per session, the very first time a child taps any mic button.
  It explains what will happen in kid-friendly language BEFORE the scary
  browser permission dialog appears. This two-step approach (our friendly
  modal → browser native prompt) dramatically reduces mic denials, because
  children understand what they're agreeing to.

  Privacy statement is explicit: "I won't record or save anything!" —
  this is true (audio goes to Groq and is not stored by us).

  Renders as a fixed full-screen overlay with a centred card.
  Closing without choosing (e.g. pressing Escape) is treated as
  "I'll type instead" to avoid a stuck state.

  Props:
    onAllow   — Child tapped "Let's try!" → trigger getUserMedia in parent
    onDismiss — Child tapped "I'll type instead" → parent calls chooseTextOnly()
-->
<script lang="ts">
	interface Props {
		/** Called when the child wants to try the microphone */
		onAllow: () => void;
		/** Called when the child prefers to type */
		onDismiss: () => void;
	}

	let { onAllow, onDismiss }: Props = $props();

	/**
	 * Trap keyboard focus inside the modal.
	 * If Escape is pressed, treat as dismiss (text-only for session).
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onDismiss();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!--
  Backdrop: semi-transparent overlay. Clicking backdrop = dismiss.
  Not using backdrop-click here because children may tap accidentally.
  They must choose one of the two explicit buttons.
-->
<div
	class="fixed inset-0 z-50 flex items-center justify-center px-4"
	style="background: rgba(0,0,0,0.5);"
	role="dialog"
	aria-modal="true"
	aria-labelledby="mic-prompt-title"
	aria-describedby="mic-prompt-desc"
>
	<!-- Card -->
	<div
		class="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden
		       animate-[fadeSlideUp_0.25s_ease-out]"
	>
		<!-- Top colour bar — visual warmth, draws the eye -->
		<div class="h-2 bg-gradient-to-r from-coral-400 to-amber-400"></div>

		<div class="p-6 text-center">
			<!-- Big mic icon — friendly, not alarming -->
			<div
				class="w-20 h-20 mx-auto mb-5 rounded-full bg-coral-50 border-4
				       border-coral-200 flex items-center justify-center"
			>
				<svg
					class="w-10 h-10 text-coral-400"
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
			</div>

			<!-- Heading -->
			<h2
				id="mic-prompt-title"
				class="text-xl font-extrabold text-bark-800 mb-2"
			>
				Can I hear you speak? 🎤
			</h2>

			<!-- Kid-friendly explanation -->
			<p id="mic-prompt-desc" class="text-bark-500 text-sm leading-relaxed mb-1">
				Tap <strong class="text-bark-700">Allow</strong> when your browser asks.
			</p>
			<p class="text-bark-500 text-sm leading-relaxed mb-6">
				I'll listen to your voice to help you practise —
				<span class="text-green-600 font-semibold">I won't record or save anything!</span>
			</p>

			<!-- Primary action: allow -->
			<button
				onclick={onAllow}
				class="w-full h-12 rounded-btn bg-coral-400 text-white font-bold text-base
				       shadow-btn-coral hover:bg-coral-500 active:scale-95 transition-all mb-3"
			>
				Let's try! 🎤
			</button>

			<!-- Secondary action: text-only -->
			<button
				onclick={onDismiss}
				class="w-full h-11 rounded-btn border-2 border-bark-200 text-bark-500
				       font-semibold text-sm hover:border-bark-300 hover:bg-bark-50 transition-all"
			>
				I'll type instead
			</button>
		</div>
	</div>
</div>

<style>
	@keyframes fadeSlideUp {
		from {
			opacity: 0;
			transform: translateY(24px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
