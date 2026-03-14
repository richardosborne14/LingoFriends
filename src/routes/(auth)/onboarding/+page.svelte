<!--
  Task 1.4 — Onboarding Flow (7 screens)

  Steps 1-6 are client-side state.
  Form submits on step 6 complete → server returns { success: true } → step 7 shows.
  Back button available from steps 2-6.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Step state ──────────────────────────────────────────────
	let step = $state(1);
	let loading = $state(false);

	// ── Collected values ────────────────────────────────────────
	let nativeLanguage = $state('');
	let targetLanguage = $state('');
	let ageGroup = $state('');
	let interests = $state<string[]>([]);
	let skinTone = $state('#F5CBA7');
	let hairColor = $state('#4A3728');
	let shirtColor = $state('#FF8A6A');
	let hat = $state<'none' | 'cap' | 'beanie' | 'headband'>('none');

	// Show garden reveal when server returns success
	const showReveal = $derived(!!(form && 'success' in form && form.success));

	// ── Language config ─────────────────────────────────────────
	const nativeOptions = [
		{ code: 'en', name: 'English', flag: '🇬🇧' },
		{ code: 'fr', name: 'Français', flag: '🇫🇷' },
	];

	// What can be learned depends on what language you speak
	const targetOptions = $derived(
		nativeLanguage === 'fr'
			? [
					{ code: 'de', name: 'Deutsch', flag: '🇩🇪' },
					{ code: 'en', name: 'English', flag: '🇬🇧' },
				]
			: [{ code: 'de', name: 'Deutsch', flag: '🇩🇪' }]
	);

	// If native language changes, reset target selection
	$effect(() => {
		if (nativeLanguage) targetLanguage = '';
	});

	// ── Interests ───────────────────────────────────────────────
	const INTERESTS = [
		{ id: 'dancing', label: 'Dancing', icon: '💃' },
		{ id: 'reading', label: 'Reading', icon: '📚' },
		{ id: 'drawing', label: 'Drawing', icon: '🎨' },
		{ id: 'gaming', label: 'Gaming', icon: '🎮' },
		{ id: 'cooking', label: 'Cooking', icon: '🍳' },
		{ id: 'football', label: 'Football', icon: '⚽' },
		{ id: 'swimming', label: 'Swimming', icon: '🏊' },
		{ id: 'cycling', label: 'Cycling', icon: '🚴' },
		{ id: 'kpop', label: 'K-pop', icon: '🎤' },
		{ id: 'music', label: 'Music', icon: '🎵' },
		{ id: 'animals', label: 'Animals', icon: '🐾' },
		{ id: 'science', label: 'Science', icon: '🔬' },
		{ id: 'travel', label: 'Travel', icon: '✈️' },
		{ id: 'movies', label: 'Movies', icon: '🎬' },
		{ id: 'nature', label: 'Nature', icon: '🌿' },
		{ id: 'dinosaurs', label: 'Dinosaurs', icon: '🦕' },
		{ id: 'fashion', label: 'Fashion', icon: '👗' },
		{ id: 'history', label: 'History', icon: '🏛️' },
	];

	function toggleInterest(id: string) {
		interests = interests.includes(id) ? interests.filter((i) => i !== id) : [...interests, id];
	}

	// ── Avatar options ───────────────────────────────────────────
	const SKIN_TONES = ['#FDDBB4', '#F5CBA7', '#E8A87C', '#C68642', '#8D5524', '#4B2E1A'];
	const HAIR_COLORS = ['#4A3728', '#8B4513', '#D4A017', '#FF6B6B', '#6B48A0', '#2C2C2C'];
	const SHIRT_COLORS = ['#FF8A6A', '#5C9E6E', '#4A90D9', '#9B59B6', '#E74C3C', '#F39C12', '#1ABC9C', '#34495E'];
	const HATS = [
		{ id: 'none', label: 'None', icon: '🚫' },
		{ id: 'cap', label: 'Cap', icon: '🧢' },
		{ id: 'beanie', label: 'Beanie', icon: '🎿' },
		{ id: 'headband', label: 'Headband', icon: '💛' },
	] as const;

	// ── Navigation ───────────────────────────────────────────────
	const TOTAL_STEPS = 6; // Steps before the final submit

	function canAdvance(): boolean {
		if (step === 2) return !!nativeLanguage;
		if (step === 3) return !!targetLanguage;
		if (step === 4) return !!ageGroup;
		return true; // steps 1, 5, 6 always advanceable
	}
</script>

<svelte:head>
	<title>Set Up Your Garden — LingoFriends</title>
</svelte:head>

{#if showReveal}
	<!-- ── SCREEN 7: Garden Reveal ── -->
	<div class="bg-white rounded-card shadow-card p-8 text-center">
		<div class="text-6xl mb-4 animate-bounce">🌱</div>
		<h2 class="text-2xl font-extrabold text-bark-800 mb-2">Your first tree is planted!</h2>
		<p class="text-bark-500 mb-8">Let's help it grow by learning something new.</p>
		<a
			href="/garden"
			class="inline-flex items-center justify-center w-full h-14 rounded-btn
				bg-forest-400 text-white font-bold text-lg shadow-btn-forest
				hover:bg-forest-500 transition-all active:translate-y-[2px] active:shadow-none"
		>
			Start my first lesson 🌸
		</a>
	</div>
{:else}
	<!-- Progress dots -->
	<div class="flex justify-center gap-2 mb-6">
		{#each Array(TOTAL_STEPS) as _, i}
			<div
				class="h-2 rounded-full transition-all duration-300
					{i + 1 === step ? 'w-6 bg-coral-400' : i + 1 < step ? 'w-2 bg-coral-300' : 'w-2 bg-bark-200'}"
			></div>
		{/each}
	</div>

	<div class="bg-white rounded-card shadow-card p-6">
		<!-- ── SCREEN 1: Welcome ── -->
		{#if step === 1}
			<div class="text-center py-4">
				<div class="text-5xl mb-4">🌸</div>
				<h2 class="text-2xl font-extrabold text-bark-800 mb-2">
					Welcome, {data.displayName}!
				</h2>
				<p class="text-bark-400 mb-8">Let's set up your garden</p>
				<button
					onclick={() => (step = 2)}
					class="w-full h-14 rounded-btn bg-coral-400 text-white font-bold text-lg
						shadow-btn-coral hover:bg-coral-500 transition-all
						active:translate-y-[2px] active:shadow-none"
				>
					Let's go! 🌱
				</button>
			</div>

		<!-- ── SCREEN 2: Native Language ── -->
		{:else if step === 2}
			<h2 class="text-xl font-extrabold text-bark-800 mb-6">
				What language do you speak at home?
			</h2>
			<div class="flex flex-col gap-3 mb-8">
				{#each nativeOptions as lang}
					<button
						type="button"
						onclick={() => (nativeLanguage = lang.code)}
						class="flex items-center gap-4 p-4 rounded-xl border-2 font-bold text-left
							transition-all duration-150
							{nativeLanguage === lang.code
								? 'border-coral-400 bg-coral-50 text-coral-700 shadow-md'
								: 'border-bark-200 text-bark-700 hover:border-bark-300'}"
					>
						<span class="text-3xl">{lang.flag}</span>
						<span class="text-lg">{lang.name}</span>
						{#if nativeLanguage === lang.code}
							<span class="ml-auto text-coral-500">✓</span>
						{/if}
					</button>
				{/each}
			</div>
			<div class="flex gap-3">
				<button onclick={() => (step = 1)} class="h-11 px-5 rounded-btn border-2 border-bark-200 text-bark-500 font-bold hover:border-bark-300">
					Back
				</button>
				<button
					onclick={() => { if (canAdvance()) step = 3; }}
					disabled={!nativeLanguage}
					class="flex-1 h-11 rounded-btn bg-coral-400 text-white font-bold
						shadow-btn-coral hover:bg-coral-500 transition-all
						disabled:opacity-40 disabled:cursor-not-allowed"
				>
					Next
				</button>
			</div>

		<!-- ── SCREEN 3: Target Language ── -->
		{:else if step === 3}
			<h2 class="text-xl font-extrabold text-bark-800 mb-6">What do you want to learn?</h2>
			<div class="flex flex-col gap-3 mb-4">
				{#each targetOptions as lang}
					<button
						type="button"
						onclick={() => (targetLanguage = lang.code)}
						class="flex items-center gap-4 p-4 rounded-xl border-2 font-bold text-left
							transition-all duration-150
							{targetLanguage === lang.code
								? 'border-coral-400 bg-coral-50 text-coral-700 shadow-md'
								: 'border-bark-200 text-bark-700 hover:border-bark-300'}"
					>
						<span class="text-3xl">{lang.flag}</span>
						<span class="text-lg">{lang.name}</span>
						{#if targetLanguage === lang.code}
							<span class="ml-auto text-coral-500">✓</span>
						{/if}
					</button>
				{/each}
				<!-- Coming soon placeholder -->
				<div class="flex items-center gap-4 p-4 rounded-xl border-2 border-bark-100 opacity-50 cursor-not-allowed">
					<span class="text-3xl">🐱</span>
					<span class="text-lg text-bark-300">Scratch</span>
					<span class="ml-auto text-xs bg-bark-100 text-bark-400 px-2 py-0.5 rounded-full font-bold">Soon</span>
				</div>
			</div>
			<div class="flex gap-3 mt-6">
				<button onclick={() => (step = 2)} class="h-11 px-5 rounded-btn border-2 border-bark-200 text-bark-500 font-bold hover:border-bark-300">
					Back
				</button>
				<button
					onclick={() => { if (canAdvance()) step = 4; }}
					disabled={!targetLanguage}
					class="flex-1 h-11 rounded-btn bg-coral-400 text-white font-bold
						shadow-btn-coral hover:bg-coral-500 transition-all
						disabled:opacity-40 disabled:cursor-not-allowed"
				>
					Next
				</button>
			</div>

		<!-- ── SCREEN 4: Age Group ── -->
		{:else if step === 4}
			<h2 class="text-xl font-extrabold text-bark-800 mb-6">How old are you?</h2>
			<div class="flex flex-col gap-3 mb-8">
				{#each [{ val: '7-10', label: '7–10 years', emoji: '🧒' }, { val: '11-14', label: '11–14 years', emoji: '🧑' }, { val: '15-18', label: '15–18 years', emoji: '🧑‍🎓' }] as ag}
					<button
						type="button"
						onclick={() => (ageGroup = ag.val)}
						class="flex items-center gap-4 p-4 rounded-xl border-2 font-bold text-left
							transition-all duration-150
							{ageGroup === ag.val
								? 'border-coral-400 bg-coral-50 text-coral-700 shadow-md'
								: 'border-bark-200 text-bark-700 hover:border-bark-300'}"
					>
						<span class="text-3xl">{ag.emoji}</span>
						<span class="text-lg">{ag.label}</span>
						{#if ageGroup === ag.val}
							<span class="ml-auto text-coral-500">✓</span>
						{/if}
					</button>
				{/each}
			</div>
			<div class="flex gap-3">
				<button onclick={() => (step = 3)} class="h-11 px-5 rounded-btn border-2 border-bark-200 text-bark-500 font-bold hover:border-bark-300">
					Back
				</button>
				<button
					onclick={() => { if (canAdvance()) step = 5; }}
					disabled={!ageGroup}
					class="flex-1 h-11 rounded-btn bg-coral-400 text-white font-bold
						shadow-btn-coral hover:bg-coral-500 transition-all
						disabled:opacity-40 disabled:cursor-not-allowed"
				>
					Next
				</button>
			</div>

		<!-- ── SCREEN 5: Interests ── -->
		{:else if step === 5}
			<h2 class="text-xl font-extrabold text-bark-800 mb-1">What do you love?</h2>
			<p class="text-bark-400 text-sm mb-5">Pick as many as you like!</p>
			<div class="flex flex-wrap gap-2 mb-6">
				{#each INTERESTS as item}
					<button
						type="button"
						onclick={() => toggleInterest(item.id)}
						class="flex items-center gap-1.5 px-3 py-2 rounded-full border-2 text-sm font-bold
							transition-all duration-150
							{interests.includes(item.id)
								? 'border-coral-400 bg-coral-50 text-coral-700'
								: 'border-bark-200 text-bark-600 hover:border-bark-300'}"
					>
						<span>{item.icon}</span>
						<span>{item.label}</span>
					</button>
				{/each}
			</div>
			<div class="flex gap-3">
				<button onclick={() => (step = 4)} class="h-11 px-5 rounded-btn border-2 border-bark-200 text-bark-500 font-bold hover:border-bark-300">
					Back
				</button>
				<button
					onclick={() => (step = 6)}
					class="flex-1 h-11 rounded-btn bg-coral-400 text-white font-bold
						shadow-btn-coral hover:bg-coral-500 transition-all"
				>
					{interests.length === 0 ? 'Skip' : 'Next'}
				</button>
			</div>

		<!-- ── SCREEN 6: Avatar + Final Submit ── -->
		{:else if step === 6}
			<h2 class="text-xl font-extrabold text-bark-800 mb-4">Create your character!</h2>

			<!-- Live avatar preview -->
			<div class="flex justify-center mb-5">
				<svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
					<!-- Body / shirt -->
					<rect x="28" y="68" width="44" height="40" rx="8" fill={shirtColor} />
					<!-- Neck -->
					<rect x="43" y="60" width="14" height="12" fill={skinTone} />
					<!-- Head -->
					<circle cx="50" cy="46" r="22" fill={skinTone} />
					<!-- Hair -->
					<ellipse cx="50" cy="26" rx="22" ry="10" fill={hairColor} />
					<!-- Eyes -->
					<circle cx="42" cy="44" r="2.5" fill="#2C2C2C" />
					<circle cx="58" cy="44" r="2.5" fill="#2C2C2C" />
					<!-- Smile -->
					<path d="M43 52 Q50 58 57 52" stroke="#2C2C2C" stroke-width="1.5" stroke-linecap="round" fill="none" />
					<!-- Hat -->
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

			<!-- Skin tone -->
			<p class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-2">Skin tone</p>
			<div class="flex gap-2 mb-4">
				{#each SKIN_TONES as tone}
					<button
						type="button"
						onclick={() => (skinTone = tone)}
						style="background:{tone}"
						aria-label="Skin tone {tone}"
						class="w-8 h-8 rounded-full border-2 transition-all
							{skinTone === tone ? 'border-bark-700 scale-110' : 'border-transparent'}"
					></button>
				{/each}
			</div>

			<!-- Hair colour -->
			<p class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-2">Hair</p>
			<div class="flex gap-2 mb-4">
				{#each HAIR_COLORS as colour}
					<button
						type="button"
						onclick={() => (hairColor = colour)}
						style="background:{colour}"
						aria-label="Hair colour {colour}"
						class="w-8 h-8 rounded-full border-2 transition-all
							{hairColor === colour ? 'border-bark-700 scale-110' : 'border-transparent'}"
					></button>
				{/each}
			</div>

			<!-- Shirt colour -->
			<p class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-2">Shirt</p>
			<div class="flex gap-2 flex-wrap mb-4">
				{#each SHIRT_COLORS as colour}
					<button
						type="button"
						onclick={() => (shirtColor = colour)}
						style="background:{colour}"
						aria-label="Shirt colour {colour}"
						class="w-8 h-8 rounded-full border-2 transition-all
							{shirtColor === colour ? 'border-bark-700 scale-110' : 'border-transparent'}"
					></button>
				{/each}
			</div>

			<!-- Hat -->
			<p class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-2">Hat</p>
			<div class="flex gap-2 mb-6">
				{#each HATS as h}
					<button
						type="button"
						onclick={() => (hat = h.id)}
						class="flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-all
							{hat === h.id
								? 'border-coral-400 bg-coral-50 text-coral-700'
								: 'border-bark-200 text-bark-600 hover:border-bark-300'}"
					>
						{h.icon}
					</button>
				{/each}
			</div>

			<!-- Error from server -->
			{#if form && 'error' in form && form.error}
				<div class="bg-coral-50 border border-coral-200 rounded-lg p-3 mb-4">
					<p class="text-sm font-semibold text-coral-600">{form.error}</p>
				</div>
			{/if}

			<!-- Final submit form — hidden fields carry all collected values -->
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
				<input type="hidden" name="nativeLanguage" value={nativeLanguage} />
				<input type="hidden" name="targetLanguage" value={targetLanguage} />
				<input type="hidden" name="ageGroup" value={ageGroup} />
				<input type="hidden" name="interestsJson" value={JSON.stringify(interests)} />
				<input type="hidden" name="avatarSkinTone" value={skinTone} />
				<input type="hidden" name="avatarHairColor" value={hairColor} />
				<input type="hidden" name="avatarShirtColor" value={shirtColor} />
				<input type="hidden" name="avatarHat" value={hat} />

				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => (step = 5)}
						class="h-11 px-5 rounded-btn border-2 border-bark-200 text-bark-500 font-bold hover:border-bark-300"
					>
						Back
					</button>
					<button
						type="submit"
						disabled={loading}
						class="flex-1 h-11 rounded-btn bg-forest-400 text-white font-bold
							shadow-btn-forest hover:bg-forest-500 transition-all
							disabled:opacity-50 disabled:cursor-not-allowed
							flex items-center justify-center gap-2"
					>
						{#if loading}
							<span class="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
							Saving...
						{:else}
							Looks great! 🎉
						{/if}
					</button>
				</div>
			</form>
		{/if}
	</div>
{/if}
