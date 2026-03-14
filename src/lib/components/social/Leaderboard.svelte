<!--
  Leaderboard — Friend group ranking by SunDrops.
  
  Two tabs: "This Week" (sunDrops since Monday) / "All Time" (profile total).
  Top 3 get medal backgrounds. Current user always highlighted in coral.
  Shows an empty state if the user has no friends yet.
-->
<script lang="ts">
	// WHY: getMedalIcon/getMedalClass are pure display helpers — inlined here so this
	// component stays browser-safe (no $lib/server/ imports allowed in client components).
	import type { RankedEntry } from '$lib/server/social/leaderboardService';

	/** Returns medal emoji for top 3, or rank number as string for others */
	function getMedalIcon(rank: number): string {
		if (rank === 1) return '🥇';
		if (rank === 2) return '🥈';
		if (rank === 3) return '🥉';
		return String(rank);
	}

	/** Returns Tailwind border+background classes based on rank and whether it's the current user */
	function getMedalClass(rank: number, isSelf: boolean): string {
		if (isSelf) return 'border-coral-200 bg-coral-50';
		if (rank === 1) return 'border-sundrop-300 bg-sundrop-50';
		if (rank === 2) return 'border-bark-300 bg-bark-50';
		if (rank === 3) return 'border-orange-200 bg-orange-50';
		return 'border-bark-100 bg-white';
	}

	interface Props {
		entries: RankedEntry[];
		period: 'week' | 'alltime';
		onPeriodChange: (period: 'week' | 'alltime') => void;
		loading?: boolean;
	}

	let { entries, period, onPeriodChange, loading = false }: Props = $props();
</script>

<div class="w-full">
	<!-- Period toggle -->
	<div class="flex bg-bark-100 rounded-full p-1 mb-4 w-full max-w-xs mx-auto">
		<button
			class="flex-1 py-1.5 rounded-full text-sm font-bold transition-all
				   {period === 'week' ? 'bg-white shadow text-bark-800' : 'text-bark-500'}"
			onclick={() => onPeriodChange('week')}
		>
			This Week
		</button>
		<button
			class="flex-1 py-1.5 rounded-full text-sm font-bold transition-all
				   {period === 'alltime' ? 'bg-white shadow text-bark-800' : 'text-bark-500'}"
			onclick={() => onPeriodChange('alltime')}
		>
			All Time
		</button>
	</div>

	{#if loading}
		<div class="text-center py-8 text-bark-400 text-sm animate-pulse">Loading…</div>

	{:else if entries.length <= 1}
		<!-- Only self, no friends yet -->
		<div class="text-center py-8">
			<p class="text-4xl mb-3">👥</p>
			<p class="font-bold text-bark-700">Add friends to see the leaderboard!</p>
			<p class="text-sm text-bark-400 mt-1">Challenge your friends and climb the ranks 🏆</p>
		</div>

	{:else}
		<div class="flex flex-col gap-2">
			{#each entries as entry}
				<div
					class="flex items-center gap-3 px-4 py-3 rounded-card border-2 transition-all
						   {getMedalClass(entry.rank, entry.isSelf)}"
				>
					<!-- Rank badge -->
					<div class="w-8 text-center text-lg font-bold flex-shrink-0">
						{getMedalIcon(entry.rank)}
					</div>

					<!-- Avatar + name -->
					<div
						class="w-9 h-9 rounded-full flex items-center justify-center text-lg border border-white shadow-sm flex-shrink-0"
						style="background-color: {entry.avatarOptions.skinTone};"
					>
						{entry.avatarOptions.gender === 'girl' ? '👧' : entry.avatarOptions.gender === 'boy' ? '👦' : '🧒'}
					</div>

					<div class="flex-1 min-w-0">
						<p class="font-bold text-bark-800 text-sm truncate">
							{entry.displayName}
							{#if entry.isSelf}<span class="text-coral-400 text-xs"> (you)</span>{/if}
						</p>
						<p class="text-xs text-bark-400">🔥 {entry.streak} day streak</p>
					</div>

					<!-- SunDrops -->
					<div class="text-right flex-shrink-0">
						<p class="font-extrabold text-coral-500">☀️ {entry.sunDrops}</p>
						<p class="text-xs text-bark-300">SunDrops</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
