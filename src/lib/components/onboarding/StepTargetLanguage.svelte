<!--
  StepTargetLanguage.svelte — Onboarding Step 3

  The user picks what language they want to learn.
  Available targets are filtered by native language to avoid
  showing "learn English" to English speakers, etc.

  "Coming soon" placeholders are shown for future subjects (Maths, Scratch)
  to build excitement about the product roadmap without blocking signup.
-->
<script lang="ts">
	import { _ } from 'svelte-i18n';

	let { value = $bindable(''), nativeLanguage = '', onNext, onBack }: {
		value: string;
		nativeLanguage: string;
		onNext: () => void;
		onBack: () => void;
	} = $props();

	/**
	 * Available target options depend on what the user speaks natively.
	 * If native = English: only German (French coming soon)
	 * If native = French: German + English
	 * This prevents nonsensical combinations (e.g. English → English)
	 */
	const TARGET_OPTIONS = $derived(
		nativeLanguage === 'fr'
			? [
					{ code: 'de', flag: '🇩🇪', key: 'languages.de', tagline: 'Apprends à parler comme un Berlinois !' },
					{ code: 'en', flag: '🇬🇧', key: 'languages.en', tagline: 'Deviens un champion de l\'anglais !' },
				]
			: [
					{ code: 'de', flag: '🇩🇪', key: 'languages.de', tagline: 'Learn to speak like a Berliner!' },
				]
	);

	/** Grayed-out future subjects (not language-dependent) */
	const COMING_SOON = [
		{ flag: '🔢', name: 'Maths' },
		{ flag: '🐱', name: 'Scratch' },
	];

	// Reset target selection if native language changes upstream
	$effect(() => {
		if (nativeLanguage && value) {
			// Ensure current selection is still valid for this native language
			const stillValid = TARGET_OPTIONS.some(t => t.code === value);
			if (!stillValid) value = '';
		}
	});
</script>

<div>
	<h2 class="text-xl font-extrabold text-bark-800 mb-1">
		{$_('onboarding.target_title')}
	</h2>
	<p class="text-bark-400 text-sm mb-6">
		{$_('onboarding.target_subtitle')}
	</p>

	<div class="flex flex-col gap-3 mb-4">
		<!-- Available target languages -->
		{#each TARGET_OPTIONS as lang}
			<button
				type="button"
				onclick={() => (value = lang.code)}
				class="flex items-center gap-4 p-4 rounded-xl border-2 font-bold text-left
					transition-all duration-150
					{value === lang.code
						? 'border-coral-400 bg-coral-50 text-coral-700 shadow-md scale-[1.01]'
						: 'border-bark-200 text-bark-700 hover:border-bark-300 hover:bg-bark-50'}"
			>
				<span class="text-3xl">{lang.flag}</span>
				<div class="flex flex-col">
					<span class="text-lg">{$_(lang.key)}</span>
					<span class="text-xs font-normal text-bark-400 mt-0.5">{lang.tagline}</span>
				</div>
				{#if value === lang.code}
					<span class="ml-auto text-coral-500 text-xl" aria-label="Selected">✓</span>
				{/if}
			</button>
		{/each}

		<!-- Future subjects — grayed out but visible to signal roadmap -->
		{#each COMING_SOON as subject}
			<div class="flex items-center gap-4 p-4 rounded-xl border-2 border-bark-100 opacity-50 cursor-not-allowed">
				<span class="text-3xl">{subject.flag}</span>
				<span class="text-lg text-bark-400">{subject.name}</span>
				<span class="ml-auto text-xs bg-bark-100 text-bark-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
					{$_('onboarding.target_coming_soon')}
				</span>
			</div>
		{/each}
	</div>

	<div class="flex gap-3 mt-6">
		<button
			type="button"
			onclick={onBack}
			class="h-11 px-5 rounded-btn border-2 border-bark-200 text-bark-500 font-bold
				hover:border-bark-300 transition-all"
		>
			{$_('onboarding.back')}
		</button>
		<button
			type="button"
			onclick={onNext}
			disabled={!value}
			class="flex-1 h-11 rounded-btn bg-coral-400 text-white font-bold
				shadow-btn-coral hover:bg-coral-500 transition-all
				disabled:opacity-40 disabled:cursor-not-allowed"
		>
			{$_('onboarding.next')}
		</button>
	</div>
</div>
