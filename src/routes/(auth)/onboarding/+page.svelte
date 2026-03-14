<!--
  TASK-V2-01 — Onboarding Flow (Overhauled)

  7-screen onboarding flow. Steps 1-7 are client-side Svelte state.
  The form submits once at the very end (avatar step) → server saves everything.

  Step order:
    1. Welcome
    2. Native Language    ← switches app locale immediately on selection
    3. Target Language    ← filtered by native language choice
    4. Age Group
    5. Level              ← NEW: proficiency self-report (plant-themed cards)
    6. Interests          ← expanded: 30+ options in 4 categories
    7. Avatar             ← NEW: includes gender selection + form submit
    → Garden Reveal       ← shown after server returns { success: true }

  Progress indicator shows steps 2–7 as positions 1–6 out of 6
  (step 1 = welcome has no progress dots).
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { _ } from 'svelte-i18n';
	import type { PageData, ActionData } from './$types';

	import ProgressIndicator from '$lib/components/onboarding/ProgressIndicator.svelte';
	import StepNativeLanguage from '$lib/components/onboarding/StepNativeLanguage.svelte';
	import StepTargetLanguage from '$lib/components/onboarding/StepTargetLanguage.svelte';
	import StepAgeGroup, { type AgeGroupCode } from '$lib/components/onboarding/StepAgeGroup.svelte';
	import StepLevel, { type LevelCode } from '$lib/components/onboarding/StepLevel.svelte';
	import StepInterests from '$lib/components/onboarding/StepInterests.svelte';
	import StepAvatar, { type GenderCode } from '$lib/components/onboarding/StepAvatar.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Step state ──────────────────────────────────────────────────────────
	// Steps 1–7 are interactive. Step 1 = welcome (no progress bar).
	// The ProgressIndicator shows steps 2–7 as positions 1–6.
	let step = $state(1);
	const TOTAL_STEPS = 6; // visible dots in ProgressIndicator

	// ── Collected values ────────────────────────────────────────────────────
	let nativeLanguage = $state('');
	let targetLanguage = $state('');
	let ageGroup = $state<AgeGroupCode | ''>('');
	let level = $state<LevelCode | ''>('');
	let interests = $state<string[]>([]);

	// Avatar customisation
	let gender = $state<GenderCode>('neutral');
	let skinTone = $state('#F5CBA7');
	let hairColor = $state('#4A3728');
	let shirtColor = $state('#FF8A6A');
	let hat = $state<'none' | 'cap' | 'beanie' | 'headband'>('none');

	// ── Form loading state ──────────────────────────────────────────────────
	let loading = $state(false);

	// Show Garden Reveal once server returns { success: true }
	const showReveal = $derived(!!(form && 'success' in form && form.success));

	// Surface server error message (empty string = no error)
	const serverError = $derived(
		form && 'error' in form && typeof form.error === 'string' ? form.error : ''
	);

	// ── Navigation ──────────────────────────────────────────────────────────

	/** Advance to the next step (1→2, 6→7, etc.) */
	function next() {
		step = Math.min(step + 1, 7);
	}

	/** Go back to the previous step */
	function back() {
		step = Math.max(step - 1, 1);
	}

	/**
	 * Map internal step (1–7) to ProgressIndicator position (1–6).
	 * Step 1 = welcome, no indicator. Steps 2–7 = positions 1–6.
	 */
	const progressCurrent = $derived(step - 1); // 0 when on step 1, 1 on step 2, etc.
</script>

<svelte:head>
	<title>
		{$_('onboarding.welcome_title', { values: { name: data.displayName } })} — LingoFriends
	</title>
</svelte:head>

{#if showReveal}
	<!-- ── Garden Reveal ──────────────────────────────────────────────────── -->
	<!--
	  Celebratory final screen. Shown once after the server confirms
	  the profile has been saved and the starter tree has been planted.
	-->
	<div class="bg-white rounded-card shadow-card p-8 text-center">
		<div class="text-6xl mb-4 animate-bounce">🌱</div>
		<h2 class="text-2xl font-extrabold text-bark-800 mb-2">
			{$_('onboarding.reveal_title')}
		</h2>
		<p class="text-bark-500 mb-8">
			{$_('onboarding.reveal_subtitle')}
		</p>
		<a
			href="/garden"
			class="inline-flex items-center justify-center w-full h-14 rounded-btn
				bg-forest-400 text-white font-bold text-lg shadow-btn-forest
				hover:bg-forest-500 transition-all active:translate-y-[2px] active:shadow-none"
		>
			{$_('onboarding.reveal_cta')}
		</a>
	</div>

{:else}
	<!-- ── Interactive onboarding steps 1–7 ──────────────────────────────── -->

	<!-- Progress bar: only shown from step 2 onward -->
	{#if step > 1}
		<ProgressIndicator total={TOTAL_STEPS} current={progressCurrent} />
	{/if}

	{#if step === 1}
		<!-- ── Step 1: Welcome ─────────────────────────────────────────────── -->
		<div class="bg-white rounded-card shadow-card p-8 text-center">
			<div class="text-5xl mb-4">🌸</div>
			<h2 class="text-2xl font-extrabold text-bark-800 mb-2">
				{$_('onboarding.welcome_title', { values: { name: data.displayName } })}
			</h2>
			<p class="text-bark-400 mb-8">
				{$_('onboarding.welcome_subtitle')}
			</p>
			<button
				type="button"
				onclick={() => (step = 2)}
				class="w-full h-14 rounded-btn bg-coral-400 text-white font-bold text-lg
					shadow-btn-coral hover:bg-coral-500 transition-all
					active:translate-y-[2px] active:shadow-none"
			>
				{$_('onboarding.welcome_cta')}
			</button>
		</div>

	{:else if step === 2}
		<!-- ── Step 2: Native Language ─────────────────────────────────────── -->
		<!-- Selecting a language immediately switches the app locale via setLocale() -->
		<div class="bg-white rounded-card shadow-card p-6">
			<StepNativeLanguage
				bind:value={nativeLanguage}
				onNext={next}
				onBack={back}
			/>
		</div>

	{:else if step === 3}
		<!-- ── Step 3: Target Language ─────────────────────────────────────── -->
		<div class="bg-white rounded-card shadow-card p-6">
			<StepTargetLanguage
				bind:value={targetLanguage}
				{nativeLanguage}
				onNext={next}
				onBack={back}
			/>
		</div>

	{:else if step === 4}
		<!-- ── Step 4: Age Group ───────────────────────────────────────────── -->
		<div class="bg-white rounded-card shadow-card p-6">
			<StepAgeGroup
				bind:value={ageGroup}
				onNext={next}
				onBack={back}
			/>
		</div>

	{:else if step === 5}
		<!-- ── Step 5: Level (NEW in V2) ──────────────────────────────────── -->
		<div class="bg-white rounded-card shadow-card p-6">
			<StepLevel
				bind:value={level}
				onNext={next}
				onBack={back}
			/>
		</div>

	{:else if step === 6}
		<!-- ── Step 6: Interests ───────────────────────────────────────────── -->
		<div class="bg-white rounded-card shadow-card p-6">
			<StepInterests
				bind:value={interests}
				onNext={next}
				onBack={back}
			/>
		</div>

	{:else if step === 7}
		<!-- ── Step 7: Avatar + Form Submit ───────────────────────────────── -->
		<!--
		  The form wraps the avatar step because StepAvatar contains the
		  type="submit" button. All accumulated hidden fields live inside
		  this form so everything submits together in one POST.
		-->
		<div class="bg-white rounded-card shadow-card p-6">
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}
			>
				<!-- Hidden fields: all accumulated onboarding data -->
				<input type="hidden" name="nativeLanguage"    value={nativeLanguage} />
				<input type="hidden" name="targetLanguage"    value={targetLanguage} />
				<input type="hidden" name="ageGroup"          value={ageGroup} />
				<input type="hidden" name="level"             value={level} />
				<input type="hidden" name="interestsJson"     value={JSON.stringify(interests)} />
				<input type="hidden" name="avatarGender"      value={gender} />
				<input type="hidden" name="avatarSkinTone"    value={skinTone} />
				<input type="hidden" name="avatarHairColor"   value={hairColor} />
				<input type="hidden" name="avatarShirtColor"  value={shirtColor} />
				<input type="hidden" name="avatarHat"         value={hat} />

				<StepAvatar
					bind:gender
					bind:skinTone
					bind:hairColor
					bind:shirtColor
					bind:hat
					{loading}
					error={serverError}
					onBack={() => (step = 6)}
				/>
			</form>
		</div>
	{/if}
{/if}
