<!--
  Task 1.5 — Profile Page

  Sections:
    - Avatar preview + stats
    - Editable display name
    - Friend code with copy button
    - Editable interests (chip grid)
    - Logout button
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Name editing ─────────────────────────────────────────────
	let editingName = $state(false);
	let nameValue = $state(data.user.displayName);
	let nameLoading = $state(false);

	// ── Interests editing ────────────────────────────────────────
	let editingInterests = $state(false);
	let selectedInterests = $state<string[]>((data.profile.interests as string[]) ?? []);
	let interestsLoading = $state(false);

	// ── Friend code copy ─────────────────────────────────────────
	let copied = $state(false);
	async function copyCode() {
		try {
			await navigator.clipboard.writeText(data.user.friendCode);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard unavailable — code is visible on screen
		}
	}

	// ── Language display ─────────────────────────────────────────
	const langNames: Record<string, string> = { en: '🇬🇧 English', fr: '🇫🇷 Français', de: '🇩🇪 Deutsch' };

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
		selectedInterests = selectedInterests.includes(id)
			? selectedInterests.filter((i) => i !== id)
			: [...selectedInterests, id];
	}

	// Sync name from updated server data after successful save
	$effect(() => {
		if (form && 'nameSuccess' in form && form.nameSuccess) {
			editingName = false;
		}
		if (form && 'interestsSuccess' in form && form.interestsSuccess) {
			editingInterests = false;
		}
	});

	// Profile avatar shorthand — derived so it stays reactive with data updates
	const p = $derived(data.profile);
	const skinTone = $derived(p.avatarSkinTone ?? '#F5CBA7');
	const hairColor = $derived(p.avatarHairColor ?? '#4A3728');
	const shirtColor = $derived(p.avatarShirtColor ?? '#FF8A6A');
	const hat = $derived(p.avatarHat ?? 'none');
</script>

<svelte:head>
	<title>My Profile — LingoFriends</title>
</svelte:head>

<div class="max-w-md mx-auto px-4 py-6 pb-28 flex flex-col gap-5">

	<!-- ── Avatar + Stats header ── -->
	<div class="bg-white rounded-card shadow-card p-5 flex items-center gap-4">
		<svg width="64" height="76" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect x="28" y="68" width="44" height="40" rx="8" fill={shirtColor} />
			<rect x="43" y="60" width="14" height="12" fill={skinTone} />
			<circle cx="50" cy="46" r="22" fill={skinTone} />
			<ellipse cx="50" cy="26" rx="22" ry="10" fill={hairColor} />
			<circle cx="42" cy="44" r="2.5" fill="#2C2C2C" />
			<circle cx="58" cy="44" r="2.5" fill="#2C2C2C" />
			<path d="M43 52 Q50 58 57 52" stroke="#2C2C2C" stroke-width="1.5" stroke-linecap="round" fill="none" />
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

		<div class="flex-1 min-w-0">
			<p class="text-lg font-extrabold text-bark-800 truncate">{data.user.displayName}</p>
			<p class="text-sm text-bark-400">@{data.user.username}</p>
			<div class="flex gap-3 mt-2">
				<div class="text-center">
					<p class="text-base font-extrabold text-bark-800">{p.totalSunDrops ?? 0}</p>
					<p class="text-xs text-bark-400">SunDrops</p>
				</div>
				<div class="w-px bg-bark-100"></div>
				<div class="text-center">
					<p class="text-base font-extrabold text-bark-800">{p.currentStreak ?? 0}</p>
					<p class="text-xs text-bark-400">Streak 🔥</p>
				</div>
				<div class="w-px bg-bark-100"></div>
				<div class="text-center">
					<p class="text-base font-extrabold text-bark-800">{p.lessonsCompleted ?? 0}</p>
					<p class="text-xs text-bark-400">Lessons</p>
				</div>
			</div>
		</div>
	</div>

	<!-- ── Display name ── -->
	<div class="bg-white rounded-card shadow-card p-5">
		<div class="flex items-center justify-between mb-3">
			<h3 class="font-bold text-bark-700">Display Name</h3>
			{#if !editingName}
				<button onclick={() => (editingName = true)} class="text-sm font-bold text-coral-500 hover:text-coral-600">
					Edit
				</button>
			{/if}
		</div>

		{#if editingName}
			<form
				method="POST"
				action="?/updateName"
				use:enhance={() => {
					nameLoading = true;
					return async ({ update }) => {
						nameLoading = false;
						await update();
					};
				}}
				class="flex flex-col gap-3"
			>
				<input
					name="displayName"
					type="text"
					bind:value={nameValue}
					class="h-11 w-full rounded-lg border-2 px-4 text-base font-semibold text-bark-700
						border-bark-200 focus:outline-none focus:border-coral-400
						{form && 'nameError' in form && form.nameError ? 'border-coral-400 bg-coral-50' : ''}"
				/>
				{#if form && 'nameError' in form && form.nameError}
					<p class="text-sm text-coral-500 font-semibold">{form.nameError}</p>
				{/if}
				<div class="flex gap-2">
					<button type="button" onclick={() => { editingName = false; nameValue = data.user.displayName; }}
						class="h-10 px-4 rounded-btn border-2 border-bark-200 text-bark-500 font-bold text-sm">
						Cancel
					</button>
					<button type="submit" disabled={nameLoading}
						class="flex-1 h-10 rounded-btn bg-coral-400 text-white font-bold text-sm
							disabled:opacity-50 flex items-center justify-center gap-2">
						{#if nameLoading}
							<span class="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin block"></span>
						{:else}
							Save
						{/if}
					</button>
				</div>
			</form>
		{:else}
			<p class="text-bark-800 font-semibold">{data.user.displayName}</p>
		{/if}
	</div>

	<!-- ── Languages (read-only) ── -->
	<div class="bg-white rounded-card shadow-card p-5">
		<h3 class="font-bold text-bark-700 mb-3">Languages</h3>
		<div class="flex flex-col gap-2">
			<div class="flex justify-between text-sm">
				<span class="text-bark-400">Home language</span>
				<span class="font-bold text-bark-700">{langNames[p.nativeLanguage] ?? p.nativeLanguage}</span>
			</div>
			<div class="flex justify-between text-sm">
				<span class="text-bark-400">Learning</span>
				<span class="font-bold text-bark-700">{langNames[p.targetLanguage] ?? p.targetLanguage}</span>
			</div>
			<div class="flex justify-between text-sm">
				<span class="text-bark-400">Age group</span>
				<span class="font-bold text-bark-700">{p.ageGroup}</span>
			</div>
		</div>
	</div>

	<!-- ── Friend code ── -->
	<div class="bg-white rounded-card shadow-card p-5">
		<h3 class="font-bold text-bark-700 mb-3">Friend Code</h3>
		<div class="flex items-center gap-3 bg-bark-50 rounded-xl p-3">
			<p class="text-xl font-extrabold tracking-[0.1em] text-bark-800 font-mono flex-1">
				{data.user.friendCode}
			</p>
			<button onclick={copyCode} class="text-sm font-bold text-coral-500 hover:text-coral-600">
				{copied ? '✓ Copied' : '📋 Copy'}
			</button>
		</div>
		<p class="text-xs text-bark-400 mt-2">Share this with friends so they can find you!</p>
	</div>

	<!-- ── Interests ── -->
	<div class="bg-white rounded-card shadow-card p-5">
		<div class="flex items-center justify-between mb-3">
			<h3 class="font-bold text-bark-700">Interests</h3>
			{#if !editingInterests}
				<button onclick={() => (editingInterests = true)} class="text-sm font-bold text-coral-500 hover:text-coral-600">
					Edit
				</button>
			{/if}
		</div>

		{#if editingInterests}
			<div class="flex flex-wrap gap-2 mb-4">
				{#each INTERESTS as item}
					<button
						type="button"
						onclick={() => toggleInterest(item.id)}
						class="flex items-center gap-1 px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all
							{selectedInterests.includes(item.id)
								? 'border-coral-400 bg-coral-50 text-coral-700'
								: 'border-bark-200 text-bark-600'}"
					>
						{item.icon} {item.label}
					</button>
				{/each}
			</div>
			<form
				method="POST"
				action="?/updateInterests"
				use:enhance={() => {
					interestsLoading = true;
					return async ({ update }) => {
						interestsLoading = false;
						await update();
					};
				}}
				class="flex gap-2"
			>
				<input type="hidden" name="interestsJson" value={JSON.stringify(selectedInterests)} />
				<button type="button" onclick={() => { editingInterests = false; selectedInterests = (data.profile.interests as string[]) ?? []; }}
					class="h-10 px-4 rounded-btn border-2 border-bark-200 text-bark-500 font-bold text-sm">
					Cancel
				</button>
				<button type="submit" disabled={interestsLoading}
					class="flex-1 h-10 rounded-btn bg-coral-400 text-white font-bold text-sm
						disabled:opacity-50 flex items-center justify-center gap-2">
					{#if interestsLoading}
						<span class="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin block"></span>
					{:else}
						Save
					{/if}
				</button>
			</form>
		{:else}
			{#if (data.profile.interests as string[])?.length}
				<div class="flex flex-wrap gap-1.5">
					{#each (data.profile.interests as string[]) as id}
						{@const item = INTERESTS.find((i) => i.id === id)}
						{#if item}
							<span class="text-xs font-bold px-2.5 py-1 bg-bark-100 text-bark-600 rounded-full">
								{item.icon} {item.label}
							</span>
						{/if}
					{/each}
				</div>
			{:else}
				<p class="text-sm text-bark-400">No interests added yet</p>
			{/if}
		{/if}
	</div>

	<!-- ── Logout ── -->
	<form method="POST" action="/api/logout">
		<button
			type="submit"
			class="w-full h-12 rounded-btn border-2 border-storm-300 text-storm-500
				font-bold hover:bg-storm-50 transition-all"
		>
			Log out
		</button>
	</form>

</div>
