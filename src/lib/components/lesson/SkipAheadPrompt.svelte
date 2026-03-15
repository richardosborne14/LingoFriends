<!--
  SkipAheadPrompt — TASK-AUDIT-03: Mid-lesson skip-ahead offer.

  Shown when the child has answered 4+ quiz questions correctly in a row.
  The child can skip ahead to the next chunk's INTRODUCE step, or keep going.

  TONE RULES (from PEDAGOGY.md):
  - "You're on fire!" not "You already know this"
  - "Ready for a challenge?" not "This is too easy for you"
  - Skip = acceleration, not dismissal of the current content
  - Decline = equally valid — "Keep practising" is a good choice too

  WHY THIS MATTERS: Bored children disengage just as quickly as struggling ones.
  The adaptive engine must handle both ends of the performance spectrum.
-->
<script lang="ts">
	// ─── Props ────────────────────────────────────────────────────────────────
	interface Props {
		/** Description of where we'll skip to (e.g., "the next section") */
		skipDescription?: string;
		/** Called when child taps "Skip ahead" */
		onSkip: () => void;
		/** Called when child taps "Keep practising" */
		onContinue: () => void;
	}

	let {
		skipDescription = 'the next section',
		onSkip,
		onContinue,
	}: Props = $props();
</script>

<!--
  Skip-ahead prompt card.
  Appears as an overlay over the normal lesson flow.
  Design: celebratory but not overwhelming — a gentle nudge, not a pop quiz.
-->
<div
	class="rounded-card border-2 border-sky-200 bg-gradient-to-b from-sky-50 to-white
		   px-5 py-6 text-center shadow-card"
	role="dialog"
	aria-label="Skip ahead prompt"
>
	<!-- Emoji burst — visual celebration without words -->
	<div class="text-4xl mb-3" aria-hidden="true">🚀</div>

	<!-- Headline — excitement, not judgment -->
	<h3 class="text-xl font-extrabold text-bark-700 mb-1">
		You're on fire!
	</h3>

	<!-- Subtext — genuine option, no pressure -->
	<p class="text-sm text-bark-500 leading-relaxed mb-5">
		You're nailing this! Want to jump ahead to {skipDescription}?<br>
		<span class="text-xs text-bark-400">(You can always revisit this in review lessons)</span>
	</p>

	<!-- Action buttons -->
	<div class="flex gap-3">
		<!-- Keep practising — always equally respected -->
		<button
			onclick={onContinue}
			class="flex-1 py-3 rounded-btn border-2 border-bark-200
				   bg-white text-bark-600 font-bold text-sm
				   hover:bg-bark-50 transition-colors"
		>
			Keep practising
		</button>

		<!-- Skip ahead — prominent but not the only option -->
		<button
			onclick={onSkip}
			class="flex-1 py-3 rounded-btn bg-sky-500 hover:bg-sky-600
				   text-white font-bold text-sm transition-colors
				   flex items-center justify-center gap-2"
		>
			Skip ahead 🚀
		</button>
	</div>
</div>
