<!--
  HelpPanel — slide-up in-lesson assistant panel (TASK-V2-05).

  Opens when the learner taps the ❓ help button during an activity.
  Provides three quick actions + free-text input + bug report flow.

  Quick actions:
    "Explain this question" → /api/help/ask (action: explain)
    "Give me a hint"        → /api/help/ask (action: hint)
    "Something's wrong"     → bug report sub-form

  Free text:
    Learner types a question → /api/help/ask (action: free_question)

  Props:
    open         — controls visibility (writable from parent)
    context      — HelpContext derived from current step + profile
    lessonId     — for bug report attribution

  DESIGN:
    Half-screen slide-up. The activity remains visible above.
    Backdrop tap closes the panel.
    Uses 'helpUsedThisStep' store to signal that a hint was used.
-->
<script lang="ts">
	import { recordHelpUsed } from '$lib/stores/lesson';
	import type { HelpContext } from '$lib/services/helpAssistant';
	import { BUG_REPORT_TYPES, BUG_REPORT_LABELS, validateBugReportType } from '$lib/services/helpAssistant';
	import type { BugReportType } from '$lib/services/helpAssistant';

	// ── Props ──────────────────────────────────────────────────────────────
	interface Props {
		/** Whether the panel is visible */
		open: boolean;
		/** Help context: current activity + user profile data */
		context: HelpContext;
		/** Lesson ID — for bug report DB attribution */
		lessonId: string;
		/** Called when the panel should close */
		onClose: () => void;
	}

	let { open, context, lessonId, onClose }: Props = $props();

	// ── Panel state ────────────────────────────────────────────────────────

	/**
	 * Which sub-view is currently displayed.
	 * 'menu'       — initial quick-action buttons
	 * 'response'   — AI response to explain/hint/free
	 * 'bug_form'   — bug report category + description form
	 * 'bug_thanks' — thank you message after bug report submitted
	 */
	type PanelView = 'menu' | 'response' | 'bug_form' | 'bug_thanks';
	let view = $state<PanelView>('menu');

	/** AI response text — shown in 'response' view */
	let aiResponse = $state('');

	/** Loading state while waiting for AI response */
	let loading = $state(false);

	/** Free-text question input value */
	let freeQuestion = $state('');

	/** Selected bug report type */
	let bugReportType = $state<BugReportType>('wrong_translation');

	/** Optional bug report description */
	let bugDescription = $state('');

	/** True while bug report is being submitted */
	let submittingBug = $state(false);

	// ── Action handlers ────────────────────────────────────────────────────

	/**
	 * Sends a help request to /api/help/ask.
	 * Marks help as used (halves SunDrop reward for this step).
	 * Shows the AI response in the panel.
	 */
	async function askForHelp(action: 'explain' | 'hint' | 'free_question', question?: string) {
		// Record that help was used — halves SunDrop reward via store
		recordHelpUsed();

		loading = true;
		view = 'response';
		aiResponse = '';

		try {
			const response = await fetch('/api/help/ask', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action,
					context,
					question: question ?? undefined,
				}),
			});

			const data = await response.json();

			// Show AI response, or graceful fallback text if something went wrong
			aiResponse = data.response ?? 'Sorry, I couldn\'t load a response. Try rereading the question!';
		} catch {
			// Network error — show local fallback (lesson must not crash over help)
			aiResponse = 'Sorry, I couldn\'t connect right now. Try reading the question carefully!';
		} finally {
			loading = false;
		}
	}

	/** Submit the bug report to /api/help/bug-report. */
	async function submitBugReport() {
		if (!validateBugReportType(bugReportType)) return;

		submittingBug = true;

		try {
			await fetch('/api/help/bug-report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lessonId,
					activityType: context.activity.type,
					activityData: context.activity,
					reportType: bugReportType,
					userDescription: bugDescription.trim() || undefined,
				}),
			});
		} catch {
			// Silent failure — bug report is a best-effort service
			// The learner still sees the thank-you screen
			console.warn('[HelpPanel] Bug report submission failed (non-fatal)');
		} finally {
			submittingBug = false;
			view = 'bug_thanks';
		}
	}

	/** Reset to the main menu. */
	function backToMenu() {
		view = 'menu';
		aiResponse = '';
		freeQuestion = '';
		bugDescription = '';
	}

	/** Close the panel and reset state. */
	function close() {
		backToMenu();
		onClose();
	}
</script>

<!-- ── Backdrop (tapping it closes the panel) ── -->
{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-30 bg-black/30"
		onclick={close}
	></div>
{/if}

<!-- ── Slide-up panel ── -->
<!-- Panel slides in from below when open. z-40 so it sits above backdrop. -->
<div
	class="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-2xl shadow-2xl
		   transform transition-transform duration-300 ease-out max-w-md mx-auto
		   {open ? 'translate-y-0' : 'translate-y-full'}"
	style="max-height: 60vh;"
	role="dialog"
	aria-label="Help panel"
	aria-modal="true"
>
	<!-- ── Handle bar ── -->
	<div class="flex justify-center pt-3 pb-1">
		<div class="w-10 h-1 bg-bark-200 rounded-full"></div>
	</div>

	<!-- ── Panel header ── -->
	<div class="flex items-center justify-between px-5 py-3 border-b border-bark-100">
		<h2 class="font-bold text-bark-700 text-lg">
			{#if view === 'menu'}
				🤖 Need help?
			{:else if view === 'response'}
				💬 Here's what I think...
			{:else if view === 'bug_form'}
				🐛 What's wrong?
			{:else}
				✅ Thanks for telling us!
			{/if}
		</h2>
		<button
			onclick={close}
			aria-label="Close help panel"
			class="w-8 h-8 flex items-center justify-center rounded-full text-bark-400 hover:bg-bark-100 transition-colors"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
			</svg>
		</button>
	</div>

	<!-- ── Panel body ── -->
	<div class="px-5 py-4 overflow-y-auto" style="max-height: calc(60vh - 100px);">

		{#if view === 'menu'}
			<!-- ── MENU VIEW: Quick action buttons ── -->

			<!-- Quick actions: explain, hint, bug report -->
			<div class="flex flex-col gap-3">
				<button
					onclick={() => askForHelp('explain')}
					class="w-full h-12 rounded-xl bg-bark-50 border border-bark-200 text-bark-700
						   font-semibold text-left px-4 hover:bg-bark-100 transition-colors"
				>
					🔍 Explain this question
				</button>

				<button
					onclick={() => askForHelp('hint')}
					class="w-full h-12 rounded-xl bg-bark-50 border border-bark-200 text-bark-700
						   font-semibold text-left px-4 hover:bg-bark-100 transition-colors"
				>
					💡 Give me a hint
				</button>

				<button
					onclick={() => (view = 'bug_form')}
					class="w-full h-12 rounded-xl bg-red-50 border border-red-200 text-red-600
						   font-semibold text-left px-4 hover:bg-red-100 transition-colors"
				>
					🐛 Something's wrong
				</button>
			</div>

			<!-- Divider + free text input -->
			<div class="mt-5">
				<p class="text-bark-400 text-sm mb-2">Or type your question:</p>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={freeQuestion}
						placeholder="What does this word mean?"
						class="flex-1 h-11 px-3 rounded-xl border border-bark-200 text-bark-700
							   placeholder-bark-300 text-sm focus:outline-none focus:border-coral-300"
						onkeydown={(e) => {
							if (e.key === 'Enter' && freeQuestion.trim()) {
								askForHelp('free_question', freeQuestion);
							}
						}}
					/>
					<button
						onclick={() => { if (freeQuestion.trim()) askForHelp('free_question', freeQuestion); }}
						disabled={!freeQuestion.trim()}
						class="w-11 h-11 rounded-xl bg-coral-400 text-white flex items-center justify-center
							   disabled:opacity-40 hover:bg-coral-500 transition-colors"
						aria-label="Send question"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
						</svg>
					</button>
				</div>
			</div>

		{:else if view === 'response'}
			<!-- ── RESPONSE VIEW: AI's answer ── -->

			{#if loading}
				<!-- Loading animation while waiting for AI -->
				<div class="flex items-center gap-3 py-6">
					<div class="flex gap-1">
						{#each [0, 1, 2] as i}
							<div
								class="w-2 h-2 rounded-full bg-coral-300 animate-bounce"
								style="animation-delay: {i * 100}ms"
							></div>
						{/each}
					</div>
					<span class="text-bark-400 text-sm">Thinking...</span>
				</div>
			{:else}
				<!-- AI response bubble -->
				<div class="bg-bark-50 rounded-xl p-4 text-bark-700 text-base leading-relaxed">
					{aiResponse}
				</div>

				<!-- Back button -->
				<button
					onclick={backToMenu}
					class="mt-4 w-full h-11 rounded-xl border border-bark-200 text-bark-500
						   font-semibold text-sm hover:bg-bark-50 transition-colors"
				>
					← Ask something else
				</button>
			{/if}

		{:else if view === 'bug_form'}
			<!-- ── BUG FORM VIEW: Category selection + description ── -->

			<p class="text-bark-500 text-sm mb-4">
				Tell us what's wrong — we'll fix it quickly!
			</p>

			<!-- Bug type selector -->
			<div class="flex flex-col gap-2 mb-4">
				{#each BUG_REPORT_TYPES as type}
					<label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer
							transition-colors
							{bugReportType === type
								? 'border-coral-300 bg-coral-50'
								: 'border-bark-200 bg-white hover:bg-bark-50'}">
						<input
							type="radio"
							name="bugType"
							value={type}
							bind:group={bugReportType}
							class="sr-only"
						/>
						<span class="text-sm font-medium text-bark-700">{BUG_REPORT_LABELS[type]}</span>
					</label>
				{/each}
			</div>

			<!-- Optional description -->
			<textarea
				bind:value={bugDescription}
				placeholder="Anything else to add? (optional)"
				rows="2"
				class="w-full px-3 py-2 rounded-xl border border-bark-200 text-bark-700 text-sm
					   placeholder-bark-300 resize-none focus:outline-none focus:border-coral-300 mb-4"
			></textarea>

			<!-- Submit / back -->
			<div class="flex gap-3">
				<button
					onclick={backToMenu}
					class="flex-1 h-11 rounded-xl border border-bark-200 text-bark-500 font-semibold text-sm"
				>
					← Back
				</button>
				<button
					onclick={submitBugReport}
					disabled={submittingBug}
					class="flex-1 h-11 rounded-xl bg-coral-400 text-white font-bold text-sm
						   disabled:opacity-50 hover:bg-coral-500 transition-colors"
				>
					{submittingBug ? 'Sending...' : 'Send report'}
				</button>
			</div>

		{:else if view === 'bug_thanks'}
			<!-- ── THANKS VIEW: Shown after bug report submitted ── -->

			<div class="text-center py-4">
				<div class="text-4xl mb-3">🙏</div>
				<p class="text-bark-700 font-semibold text-lg mb-2">Thank you!</p>
				<p class="text-bark-500 text-sm leading-relaxed mb-6">
					We'll look at it and fix it soon. Let's keep going — you're doing great!
				</p>
				<button
					onclick={close}
					class="w-full h-12 rounded-btn bg-coral-400 text-white font-bold"
				>
					Continue lesson ⚡
				</button>
			</div>
		{/if}

	</div>
</div>
