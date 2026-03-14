<!--
  StepNativeLanguage.svelte — Onboarding Step 2

  The user picks their home language (English or French).

  KEY BEHAVIOUR: selecting a language immediately switches the entire app
  locale via setLocale(). This means subsequent onboarding steps render
  in the chosen language instantly — no page reload required.

  We deliberately do NOT auto-advance on selection (unlike some flows)
  because we want the user to see the UI language change and feel
  the "wow, it switched!" moment before moving on. The Next button
  remains the explicit action.

  Grayed-out "coming soon" cards are shown for future languages
  to signal growth without frustrating the child.
-->
<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { setLocale, type SupportedLocale } from '$lib/i18n';

	/** Currently selected language code (binds to parent state) */
	let { value = $bindable(''), onNext, onBack }: {
		value: string;
		onNext: () => void;
		onBack: () => void;
	} = $props();

	/** Languages available to select now */
	const AVAILABLE = [
		{ code: 'en' as SupportedLocale, flag: '🇬🇧', key: 'languages.en' },
		{ code: 'fr' as SupportedLocale, flag: '🇫🇷', key: 'languages.fr' },
	];

	/** Languages shown as "coming soon" — no selection allowed */
	const COMING_SOON = [
		{ flag: '🇪🇸', name: 'Español' },
		{ flag: '🇩🇪', name: 'Deutsch' },
		{ flag: '🇮🇹', name: 'Italiano' },
	];

	/**
	 * Select a language: update the bound value AND switch the app locale.
	 * The locale switch happens immediately — every $_ string in the DOM
	 * updates reactively the moment this runs.
	 */
	function select(code: SupportedLocale) {
		value = code;
		// Switch the entire app UI to this language right now
		setLocale(code);
	}
</script>

<div>
	<h2 class="text-xl font-extrabold text-bark-800 mb-1">
		{$_('onboarding.native_title')}
	</h2>
	<p class="text-bark-400 text-sm mb-6">
		{$_('onboarding.native_subtitle')}
	</p>

	<!-- Available languages -->
	<div class="flex flex-col gap-3 mb-4">
		{#each AVAILABLE as lang}
			<button
				type="button"
				onclick={() => select(lang.code)}
				class="flex items-center gap-4 p-4 rounded-xl border-2 font-bold text-left
					transition-all duration-150
					{value === lang.code
						? 'border-coral-400 bg-coral-50 text-coral-700 shadow-md scale-[1.01]'
						: 'border-bark-200 text-bark-700 hover:border-bark-300 hover:bg-bark-50'}"
			>
				<span class="text-3xl">{lang.flag}</span>
				<span class="text-lg">{$_(lang.key)}</span>
				{#if value === lang.code}
					<span class="ml-auto text-coral-500 text-xl" aria-label="Selected">✓</span>
				{/if}
			</button>
		{/each}

		<!-- Coming soon languages — visible but not interactive -->
		{#each COMING_SOON as lang}
			<div class="flex items-center gap-4 p-4 rounded-xl border-2 border-bark-100 opacity-50 cursor-not-allowed">
				<span class="text-3xl">{lang.flag}</span>
				<span class="text-lg text-bark-400">{lang.name}</span>
				<span class="ml-auto text-xs bg-bark-100 text-bark-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
					{$_('languages.coming_soon')}
				</span>
			</div>
		{/each}
	</div>

	<!-- Navigation -->
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
