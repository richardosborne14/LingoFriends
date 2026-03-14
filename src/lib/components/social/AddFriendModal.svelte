<!--
  AddFriendModal — Code-based friend search and request modal.

  Flow:
    1. User enters a friend code (e.g. "LF-A3K7M2")
    2. App searches for user → shows preview (displayName + avatar only)
    3. User confirms → friend request sent

  Child safety: Only displayName + avatar are shown in the preview.
  No email, age, or any personal data is exposed at any step.
-->
<script lang="ts">
	import type { SafeFriendProfile } from '$lib/server/social/friendsService';

	interface Props {
		onClose: () => void;
		onRequestSent: () => void;
	}

	let { onClose, onRequestSent }: Props = $props();

	let code = $state('');
	let searchResult = $state<SafeFriendProfile | null>(null);
	let searchError = $state('');
	let searching = $state(false);
	let sending = $state(false);
	let sent = $state(false);

	/** Search for a user by their friend code */
	async function handleSearch() {
		const trimmed = code.trim().toUpperCase();
		if (!trimmed) return;

		searching = true;
		searchResult = null;
		searchError = '';

		try {
			const res = await fetch(`/api/friends/search?code=${encodeURIComponent(trimmed)}`);
			if (res.ok) {
				searchResult = await res.json();
			} else if (res.status === 404) {
				searchError = "Hmm, we couldn't find anyone with that code. Double-check and try again! 🔍";
			} else {
				searchError = 'Oops! Something went wrong. Try again in a moment.';
			}
		} catch {
			searchError = 'Oops! Something went wrong. Try again in a moment.';
		} finally {
			searching = false;
		}
	}

	/** Send the friend request to the found user */
	async function handleSendRequest() {
		if (!searchResult) return;

		sending = true;
		try {
			const res = await fetch('/api/friends/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ friendCode: code.trim().toUpperCase() }),
			});

			if (res.ok) {
				sent = true;
				setTimeout(() => {
					onRequestSent();
					onClose();
				}, 1500);
			} else {
				const data = await res.json().catch(() => ({}));
				searchError = (data as Record<string, string>).message ?? "Couldn't send the request. Try again!";
			}
		} catch {
			searchError = 'Oops! Something went wrong. Try again in a moment.';
		} finally {
			sending = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleSearch();
		if (e.key === 'Escape') onClose();
	}
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	aria-label="Add a friend"
>
	<!-- Sheet -->
	<div class="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-xl p-6 pb-safe">
		<div class="flex items-center justify-between mb-5">
			<h2 class="text-xl font-extrabold text-bark-800 font-display">Add a Friend 👥</h2>
			<button onclick={onClose} class="text-bark-400 hover:text-bark-600 text-2xl leading-none">✕</button>
		</div>

		<!-- Code input -->
		<label class="block text-sm font-bold text-bark-600 mb-1" for="friend-code-input">
			Friend Code
		</label>
		<div class="flex gap-2 mb-4">
			<input
				id="friend-code-input"
				type="text"
				bind:value={code}
				onkeydown={handleKeydown}
				placeholder="LF-A3K7M2"
				maxlength="10"
				class="flex-1 h-12 rounded-btn border-2 border-bark-200 focus:border-coral-400 outline-none
					   px-4 font-mono text-base text-bark-800 placeholder:text-bark-300 uppercase
					   transition-colors"
			/>
			<button
				onclick={handleSearch}
				disabled={searching || !code.trim()}
				class="h-12 px-4 rounded-btn bg-coral-400 hover:bg-coral-500 text-white font-bold text-sm
					   disabled:opacity-50 transition-colors"
			>
				{searching ? '…' : 'Find'}
			</button>
		</div>

		<!-- Error -->
		{#if searchError}
			<p class="text-sm text-amber-600 mb-4">{searchError}</p>
		{/if}

		<!-- Search result preview -->
		{#if searchResult && !sent}
			<div class="bg-bark-50 border-2 border-bark-200 rounded-card p-4 flex items-center gap-4 mb-4">
				<div
					class="w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 border-white shadow"
					style="background-color: {searchResult.avatarOptions.skinTone};"
				>
					{searchResult.avatarOptions.gender === 'girl' ? '👧' : searchResult.avatarOptions.gender === 'boy' ? '👦' : '🧒'}
				</div>
				<div class="flex-1">
					<p class="font-extrabold text-bark-800">{searchResult.displayName}</p>
					<p class="text-xs text-bark-500">🔥 {searchResult.streak} streak · ☀️ {searchResult.totalSunDrops}</p>
				</div>
			</div>

			<button
				onclick={handleSendRequest}
				disabled={sending}
				class="w-full h-13 rounded-btn bg-coral-400 hover:bg-coral-500 text-white font-bold
					   disabled:opacity-50 transition-colors shadow-btn-coral"
			>
				{sending ? 'Sending…' : `Add ${searchResult.displayName} as a friend! 🎉`}
			</button>
		{/if}

		<!-- Success state -->
		{#if sent}
			<div class="text-center py-4">
				<p class="text-4xl mb-2">✅</p>
				<p class="font-bold text-bark-700">Friend request sent!</p>
				<p class="text-sm text-bark-400">They'll see it next time they open the app.</p>
			</div>
		{/if}
	</div>
</div>
