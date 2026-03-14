<!--
  /friends — Social hub: friend list, pending requests, leaderboard, and add-friend flow.

  Sections (top to bottom):
    1. My Friend Code — share code so others can find you
    2. Pending Requests — accept/decline incoming requests
    3. Friends Grid — your accepted friends
    4. Leaderboard — week/alltime ranking within your friend group

  Data is loaded server-side (SSR) and hydrated. After mutations (accept/decline/remove/add)
  the page reloads via invalidateAll() so the server-side data stays in sync.
-->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import FriendCard from '$lib/components/social/FriendCard.svelte';
	import Leaderboard from '$lib/components/social/Leaderboard.svelte';
	import PendingRequests from '$lib/components/social/PendingRequests.svelte';
	import AddFriendModal from '$lib/components/social/AddFriendModal.svelte';
	import type { RankedEntry } from '$lib/server/social/leaderboardService';

	let { data }: { data: PageData } = $props();

	let showAddFriend = $state(false);
	let leaderboardPeriod = $state<'week' | 'alltime'>('week');
	// svelte-ignore state_referenced_locally — intentionally capturing initial server data;
	// the state is mutated locally when user switches week/alltime tabs.
	let leaderboardEntries = $state<RankedEntry[]>(data.weeklyLeaderboard);
	let leaderboardLoading = $state(false);
	let codeCopied = $state(false);

	/** Copy friend code to clipboard */
	async function copyCode() {
		try {
			await navigator.clipboard.writeText(data.myFriendCode);
			codeCopied = true;
			setTimeout(() => (codeCopied = false), 2000);
		} catch {
			// Fallback: select the text
		}
	}

	/** Switch leaderboard period — fetches fresh data from API */
	async function handlePeriodChange(period: 'week' | 'alltime') {
		leaderboardPeriod = period;
		leaderboardLoading = true;
		try {
			const res = await fetch(`/api/friends/leaderboard?period=${period}`);
			if (res.ok) leaderboardEntries = await res.json();
		} catch (err) {
			console.error('[Friends] Leaderboard fetch failed:', err);
		} finally {
			leaderboardLoading = false;
		}
	}

	/** After accepting/declining a request, reload page data */
	async function handleRequestMutated() {
		await invalidateAll();
	}

	/** After removing a friend, reload page data */
	async function handleRemoveFriend(friendshipId: string) {
		try {
			await fetch('/api/friends/remove', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ friendshipId }),
			});
			await invalidateAll();
		} catch (err) {
			console.error('[Friends] Remove failed:', err);
		}
	}

	/** After sending a request, close modal and reload */
	async function handleRequestSent() {
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Friends · LingoFriends</title>
</svelte:head>

<div class="min-h-screen bg-sky-50 pb-24 px-4 pt-6 max-w-lg mx-auto">

	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-extrabold text-bark-800 font-display">Friends 👥</h1>
		<button
			onclick={() => (showAddFriend = true)}
			class="h-10 px-4 rounded-btn bg-coral-400 hover:bg-coral-500 text-white font-bold text-sm shadow-btn-coral transition-colors"
		>
			+ Add Friend
		</button>
	</div>

	<!-- My Friend Code -->
	<div class="bg-white border-2 border-bark-100 rounded-card p-4 mb-6">
		<p class="text-xs font-bold text-bark-500 uppercase tracking-wide mb-1">Your Friend Code</p>
		<div class="flex items-center gap-3">
			<span class="font-mono font-extrabold text-xl text-bark-800 tracking-widest flex-1">
				{data.myFriendCode}
			</span>
			<button
				onclick={copyCode}
				class="px-3 py-1.5 rounded-btn border-2 border-bark-200 text-bark-600 text-sm font-bold
					   hover:border-coral-300 hover:text-coral-500 transition-colors"
			>
				{codeCopied ? '✓ Copied!' : 'Copy'}
			</button>
		</div>
		<p class="text-xs text-bark-400 mt-1">Share this code so friends can find you</p>
	</div>

	<!-- Pending requests -->
	<PendingRequests
		requests={data.pendingRequests}
		onAccept={handleRequestMutated}
		onDecline={handleRequestMutated}
	/>

	<!-- Friends grid -->
	<section class="mb-6">
		<h2 class="text-sm font-bold text-bark-600 uppercase tracking-wide mb-3">
			Your Friends ({data.friends.length})
		</h2>

		{#if data.friends.length === 0}
			<div class="text-center py-10 bg-white rounded-card border-2 border-dashed border-bark-200">
				<p class="text-4xl mb-3">🌱</p>
				<p class="font-bold text-bark-700">No friends yet!</p>
				<p class="text-sm text-bark-400 mt-1">Add a friend using their code to get started</p>
				<button
					onclick={() => (showAddFriend = true)}
					class="mt-4 px-6 py-2 rounded-btn bg-coral-400 text-white font-bold text-sm hover:bg-coral-500 transition-colors"
				>
					Add your first friend 🎉
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-3">
				{#each data.friends as f}
					<FriendCard
						friend={f.profile}
						friendshipId={f.friendshipId}
						onRemove={handleRemoveFriend}
					/>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Leaderboard -->
	<section>
		<h2 class="text-sm font-bold text-bark-600 uppercase tracking-wide mb-3">Leaderboard 🏆</h2>
		<div class="bg-white rounded-card border-2 border-bark-100 p-4">
			<Leaderboard
				entries={leaderboardEntries}
				period={leaderboardPeriod}
				onPeriodChange={handlePeriodChange}
				loading={leaderboardLoading}
			/>
		</div>
	</section>
</div>

<!-- Add Friend Modal (portal) -->
{#if showAddFriend}
	<AddFriendModal
		onClose={() => (showAddFriend = false)}
		onRequestSent={handleRequestSent}
	/>
{/if}
