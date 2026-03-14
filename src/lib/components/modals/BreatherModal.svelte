<!--
  BreatherModal — shown when the learner runs out of hearts (TASK-V2-03).

  IMPORTANT DESIGN DECISION: This is NOT a failure state.
  LingoFriends never ends a lesson on "you failed". Instead, when hearts hit 0:
    1. Show this gentle "Take a Breather" modal
    2. Hearts restore to 3 automatically
    3. Lesson CONTINUES from where the learner was

  WHY: Children (especially 7-10) have fragile confidence. Ending a lesson
  with failure creates Krashen's Affective Filter — anxiety that blocks learning.
  A breather reframes "I ran out of hearts" as "I was working hard!"

  This modal does NOT auto-dismiss — the learner must actively tap "Try Again 💪"
  to re-engage. The agency to continue is intentional.

  Architecture:
  - Rendered by lesson page when $showBreather = true
  - onContinue() calls restoreHearts() in the store + advances the lesson step
-->
<script lang="ts">
	interface Props {
		/** Called when learner taps "Try Again" — restores hearts and continues */
		onContinue: () => void;
	}

	let { onContinue }: Props = $props();
</script>

<!--
  Full-screen dim + centred card.
  Unlike the other modals (bottom overlay), the breather takes more screen space —
  it's a real pause, not a flash notification.
-->
<div
	class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
	role="dialog"
	aria-modal="true"
	aria-label="Take a Breather"
>
	<div
		class="bg-white rounded-2xl shadow-2xl p-8 max-w-xs w-full flex flex-col
			   items-center gap-5 text-center
			   animate-in zoom-in-90 fade-in duration-250"
	>

		<!-- Big emote — conveys "phew!" not "you failed!" -->
		<span class="text-5xl" aria-hidden="true">😮‍💨</span>

		<!-- Heading — framed as effort, not failure -->
		<div>
			<h2 class="text-xl font-extrabold text-bark-800 font-display">
				That was tough!
			</h2>
			<p class="text-base text-bark-500 mt-2 leading-relaxed">
				Take a deep breath.<br/>
				Your hearts are back — let's keep going! 💪
			</p>
		</div>

		<!-- Sub-message: reframes what just happened positively -->
		<p class="text-sm text-bark-400 italic">
			"Every mistake is a step closer to learning it!"
		</p>

		<!-- The one action available — no "Quit" option here (removes escape temptation) -->
		<button
			onclick={onContinue}
			class="w-full h-12 rounded-btn bg-coral-400 hover:bg-coral-500
				   active:translate-y-[2px] text-white font-bold text-base
				   shadow-btn-coral transition-all duration-100"
		>
			Try Again 💪
		</button>

	</div>
</div>
