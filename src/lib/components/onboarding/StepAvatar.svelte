<!--
  StepAvatar.svelte — Onboarding Step 6 (Final interactive step)

  Avatar customisation with gender selection.
  Includes a live SVG preview so the child immediately sees their character.

  Gender selection (NEW in V2):
  - "Boy" / "Girl" / "Either is fine!" (neutral/androgynous)
  - Kept deliberately casual — "Either is fine!" avoids identity pressure
  - Gender affects default proportions only; all colour options remain available
  - Stored in profile.avatarGender

  The SVG preview is a simplified version of the Three.js avatar —
  close enough to feel like a preview but doesn't require WebGL to render
  during onboarding (lighter, faster, works before Three.js loads).

  Form fields use hidden inputs for submission — the full avatar state
  is submitted via the parent form when the user clicks "Looks great!".
-->
<script lang="ts">
	import { _ } from 'svelte-i18n';

	/** Valid gender values — must match schema avatarGender constraint */
	export type GenderCode = 'boy' | 'girl' | 'neutral';

	/** Props bound to parent onboarding state */
	let {
		gender = $bindable<GenderCode>('neutral'),
		skinTone = $bindable('#F5CBA7'),
		hairColor = $bindable('#4A3728'),
		shirtColor = $bindable('#FF8A6A'),
		hat = $bindable<'none' | 'cap' | 'beanie' | 'headband'>('none'),
		loading = false,
		error = '',
		onBack,
	}: {
		gender: GenderCode;
		skinTone: string;
		hairColor: string;
		shirtColor: string;
		hat: 'none' | 'cap' | 'beanie' | 'headband';
		loading?: boolean;
		error?: string;
		onBack: () => void;
	} = $props();

	// ── Palette options ────────────────────────────────────────────────────

	/** All skin tone options — same across all genders */
	const SKIN_TONES = ['#FDDBB4', '#F5CBA7', '#E8A87C', '#C68642', '#8D5524', '#4B2E1A'];

	/** Hair colours — varied, includes fantasy colours for fun */
	const HAIR_COLORS = ['#4A3728', '#8B4513', '#D4A017', '#FF6B6B', '#6B48A0', '#2C2C2C'];

	/** Shirt colours — cheerful, age-appropriate */
	const SHIRT_COLORS = [
		'#FF8A6A', '#5C9E6E', '#4A90D9', '#9B59B6',
		'#E74C3C', '#F39C12', '#1ABC9C', '#34495E',
	];

	const HATS = [
		{ id: 'none' as const,     label: '🚫', labelKey: 'None' },
		{ id: 'cap' as const,      label: '🧢', labelKey: 'Cap' },
		{ id: 'beanie' as const,   label: '🎿', labelKey: 'Beanie' },
		{ id: 'headband' as const, label: '💛', labelKey: 'Band' },
	];

	/** Gender selection options — friendly framing, no binary pressure */
	const GENDERS: { code: GenderCode; emoji: string; key: string }[] = [
		{ code: 'boy',     emoji: '👦', key: 'onboarding.avatar_gender_boy' },
		{ code: 'girl',    emoji: '👧', key: 'onboarding.avatar_gender_girl' },
		{ code: 'neutral', emoji: '🧑', key: 'onboarding.avatar_gender_neutral' },
	];

	/**
	 * Gender-specific body proportions for the SVG preview.
	 * Neutral is the average of boy and girl.
	 * These are cosmetic only — all colours/accessories work for all genders.
	 */
	const GENDER_BODY = {
		boy:     { bodyWidth: 44, bodyHeight: 40, hairRx: 22, hairRy: 10 },
		girl:    { bodyWidth: 40, bodyHeight: 38, hairRx: 22, hairRy: 13 },
		neutral: { bodyWidth: 42, bodyHeight: 39, hairRx: 22, hairRy: 11 },
	};

	/** Current body dimensions based on selected gender */
	const body = $derived(GENDER_BODY[gender]);
</script>

<div>
	<h2 class="text-xl font-extrabold text-bark-800 mb-4">
		{$_('onboarding.avatar_title')}
	</h2>

	<!-- Gender selection — 3 cards, equal width -->
	<p class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-2">
		{$_('onboarding.avatar_gender_title')}
	</p>
	<div class="flex gap-2 mb-5">
		{#each GENDERS as g}
			<button
				type="button"
				onclick={() => (gender = g.code)}
				class="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2
					text-sm font-bold transition-all duration-150
					{gender === g.code
						? 'border-coral-400 bg-coral-50 text-coral-700 shadow-md'
						: 'border-bark-200 text-bark-600 hover:border-bark-300'}"
			>
				<span class="text-2xl">{g.emoji}</span>
				<span class="text-xs">{$_(g.key)}</span>
			</button>
		{/each}
	</div>

	<!-- Live SVG preview — updates reactively as options change -->
	<div class="flex justify-center mb-5">
		<svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Avatar preview">
			<!-- Body / shirt -->
			<rect x="{(100 - body.bodyWidth) / 2}" y="68" width="{body.bodyWidth}" height="{body.bodyHeight}" rx="8" fill={shirtColor} />
			<!-- Neck -->
			<rect x="43" y="60" width="14" height="12" fill={skinTone} />
			<!-- Head -->
			<circle cx="50" cy="46" r="22" fill={skinTone} />
			<!-- Hair -->
			<ellipse cx="50" cy="26" rx="{body.hairRx}" ry="{body.hairRy}" fill={hairColor} />
			<!-- Girl gets longer hair strands -->
			{#if gender === 'girl'}
				<rect x="28" y="28" width="6" height="20" rx="3" fill={hairColor} />
				<rect x="66" y="28" width="6" height="20" rx="3" fill={hairColor} />
			{/if}
			<!-- Eyes -->
			<circle cx="42" cy="44" r="2.5" fill="#2C2C2C" />
			<circle cx="58" cy="44" r="2.5" fill="#2C2C2C" />
			<!-- Smile -->
			<path d="M43 52 Q50 58 57 52" stroke="#2C2C2C" stroke-width="1.5" stroke-linecap="round" fill="none" />
			<!-- Hat overlays -->
			{#if hat === 'cap'}
				<rect x="30" y="20" width="40" height="10" rx="4" fill={hairColor} />
				<rect x="26" y="26" width="48" height="5" rx="2" fill={hairColor} />
			{:else if hat === 'beanie'}
				<ellipse cx="50" cy="22" rx="22" ry="14" fill={hairColor} />
				<rect x="28" y="28" width="44" height="6" rx="2" fill={hairColor} />
			{:else if hat === 'headband'}
				<rect x="29" y="30" width="42" height="7" rx="3.5" fill="#FF8A6A" />
			{/if}
		</svg>
	</div>

	<!-- Skin tone row -->
	<p class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-2">{$_('onboarding.avatar_skin')}</p>
	<div class="flex gap-2 mb-4">
		{#each SKIN_TONES as tone}
			<button
				type="button"
				onclick={() => (skinTone = tone)}
				style="background:{tone}"
				aria-label="Skin tone"
				class="w-8 h-8 rounded-full border-2 transition-all
					{skinTone === tone ? 'border-bark-700 scale-110 shadow-md' : 'border-transparent hover:scale-105'}"
			></button>
		{/each}
	</div>

	<!-- Hair colour row -->
	<p class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-2">{$_('onboarding.avatar_hair')}</p>
	<div class="flex gap-2 mb-4">
		{#each HAIR_COLORS as colour}
			<button
				type="button"
				onclick={() => (hairColor = colour)}
				style="background:{colour}"
				aria-label="Hair colour"
				class="w-8 h-8 rounded-full border-2 transition-all
					{hairColor === colour ? 'border-bark-700 scale-110 shadow-md' : 'border-transparent hover:scale-105'}"
			></button>
		{/each}
	</div>

	<!-- Shirt colour row -->
	<p class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-2">{$_('onboarding.avatar_shirt')}</p>
	<div class="flex gap-2 flex-wrap mb-4">
		{#each SHIRT_COLORS as colour}
			<button
				type="button"
				onclick={() => (shirtColor = colour)}
				style="background:{colour}"
				aria-label="Shirt colour"
				class="w-8 h-8 rounded-full border-2 transition-all
					{shirtColor === colour ? 'border-bark-700 scale-110 shadow-md' : 'border-transparent hover:scale-105'}"
			></button>
		{/each}
	</div>

	<!-- Hat picker -->
	<p class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-2">{$_('onboarding.avatar_hat')}</p>
	<div class="flex gap-2 mb-6">
		{#each HATS as h}
			<button
				type="button"
				onclick={() => (hat = h.id)}
				class="flex-1 py-2 rounded-lg border-2 text-lg transition-all
					{hat === h.id
						? 'border-coral-400 bg-coral-50 shadow-sm'
						: 'border-bark-200 hover:border-bark-300'}"
				aria-label={h.labelKey}
			>
				{h.label}
			</button>
		{/each}
	</div>

	<!-- Server error display -->
	{#if error}
		<div class="bg-coral-50 border border-coral-200 rounded-lg p-3 mb-4">
			<p class="text-sm font-semibold text-coral-600">{error}</p>
		</div>
	{/if}

	<!-- Navigation — Back + Submit -->
	<div class="flex gap-3">
		<button
			type="button"
			onclick={onBack}
			class="h-11 px-5 rounded-btn border-2 border-bark-200 text-bark-500 font-bold
				hover:border-bark-300 transition-all"
		>
			{$_('onboarding.back')}
		</button>
		<!-- type="submit" triggers the parent <form> submission -->
		<button
			type="submit"
			disabled={loading}
			class="flex-1 h-11 rounded-btn bg-forest-400 text-white font-bold
				shadow-btn-forest hover:bg-forest-500 transition-all
				disabled:opacity-50 disabled:cursor-not-allowed
				flex items-center justify-center gap-2"
		>
			{#if loading}
				<span class="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true"></span>
				{$_('common.saving')}
			{:else}
				{$_('onboarding.avatar_save')}
			{/if}
		</button>
	</div>
</div>
