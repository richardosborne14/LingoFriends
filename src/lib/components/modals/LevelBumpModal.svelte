<!--
  LevelBumpModal — shown after lesson completion when the adaptive level
  assessment recommends a level change (TASK-V2-05).

  Two modes:
    bump_up   — learner has been excelling, offer them a harder level
    bump_down — learner has been struggling, offer a more comfortable level

  DESIGN RULES (Pedagogy.md — Krashen's Affective Filter):
    - bump_up:   celebratory, exciting, low-pressure ("can switch back any time")
    - bump_down: warm, framing lower level as a SMART STRATEGY not retreat
    - NEVER use: "failed", "wrong", "too hard", "backwards", "easier"
    - Always give an "I'll keep trying" option — some kids push through

  Props:
    recommendation — 'bump_up' | 'bump_down'
    currentLevel   — the level code they're on now
    targetLevel    — the level being offered
    message        — the pre-built message from levelAssessment.ts
    onAccept       — callback: PATCH /api/profile/level + navigate
    onDecline      — callback: just navigate (no level change)
-->
<script lang="ts">
	import { getLevelDisplayName } from '$lib/services/levelAssessment';
	import type { LevelRecommendation } from '$lib/services/levelAssessment';

	interface Props {
		/** 'bump_up' or 'bump_down' */
		recommendation: LevelRecommendation;
		/** Current level code (e.g. 'know_some_words') */
		currentLevel: string;
		/** Target level code being offered */
		targetLevel: string;
		/** Pre-built message from levelAssessment.ts */
		message: string;
		/** Called when learner accepts the level change */
		onAccept: () => void;
		/** Called when learner declines (or hits backdrop) */
		onDecline: () => void;
	}

	let { recommendation, currentLevel, targetLevel, message, onAccept, onDecline }: Props = $props();

	const isBumpUp = recommendation === 'bump_up';

	// ── Derived display strings ──────────────────────────────────────────
	const currentDisplay = getLevelDisplayName(currentLevel);
	const targetDisplay = getLevelDisplayName(targetLevel);

	// The CTA button labels communicate the framing clearly
	const acceptLabel = isBumpUp ? 'Level Up! 🚀' : 'Yes, let\'s do it! 🏗️';
	// Decline for bump_down is encouraging — not "no, I refuse"
	const declineLabel = isBumpUp ? 'Not yet 🤔' : 'I\'ll keep trying! 💪';

	// Emoji and title vary by direction
	const headerEmoji = isBumpUp ? '🌟' : '💪';
	const headerText = isBumpUp ? 'You\'re doing amazingly!' : 'You\'re working so hard!';
</script>

<!-- ── Modal backdrop ── -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
	onclick={onDecline}
>
	<!-- ── Modal card — tap inside doesn't close ── -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5
			   animate-in fade-in zoom-in-95 duration-200"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		aria-label="Level change offer"
	>
		<!-- ── Header ── -->
		<div class="text-center">
			<div class="text-4xl mb-3">{headerEmoji}</div>
			<h2 class="text-xl font-extrabold text-bark-800 font-display">{headerText}</h2>
		</div>

		<!-- ── Message (from levelAssessment.ts) ── -->
		<p class="text-bark-600 text-base leading-relaxed text-center">
			{message}
		</p>

		<!-- ── Level comparison ── -->
		<div class="bg-bark-50 rounded-xl p-4 flex items-center gap-3 text-sm">
			<!-- Current level -->
			<div class="flex-1 text-center">
				<p class="text-bark-400 text-xs uppercase font-semibold tracking-wide mb-1">
					{isBumpUp ? 'Current' : 'Trying now'}
				</p>
				<p class="text-bark-700 font-bold">{currentDisplay}</p>
			</div>

			<!-- Arrow indicating direction -->
			<div class="text-2xl {isBumpUp ? 'text-mint-500' : 'text-amber-400'}">
				{isBumpUp ? '→' : '↙'}
			</div>

			<!-- Target level -->
			<div class="flex-1 text-center">
				<p class="text-bark-400 text-xs uppercase font-semibold tracking-wide mb-1">
					{isBumpUp ? 'Next level' : 'Foundation'}
				</p>
				<p class="font-bold {isBumpUp ? 'text-mint-600' : 'text-amber-600'}">{targetDisplay}</p>
			</div>
		</div>

		<!-- ── CTA buttons ── -->
		<div class="flex flex-col gap-3">
			<!-- Accept button — prominent -->
			<button
				onclick={onAccept}
				class="w-full h-13 rounded-btn text-white font-bold text-lg shadow-lg transition-all
					   active:translate-y-[1px]
					   {isBumpUp
						? 'bg-mint-500 hover:bg-mint-600 shadow-mint-200'
						: 'bg-amber-400 hover:bg-amber-500 shadow-amber-200'}"
			>
				{acceptLabel}
			</button>

			<!-- Decline button — secondary -->
			<button
				onclick={onDecline}
				class="w-full h-11 rounded-btn border-2 border-bark-200 text-bark-500
					   font-semibold text-base hover:border-bark-300 transition-colors"
			>
				{declineLabel}
			</button>
		</div>

		<!-- ── Reassurance footer ── -->
		{#if isBumpUp}
			<p class="text-center text-xs text-bark-300">
				You can always change your level in Settings ⚙️
			</p>
		{/if}
	</div>
</div>
