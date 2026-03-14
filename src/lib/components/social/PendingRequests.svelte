<!--
  PendingRequests — Shows incoming friend requests with Accept/Decline buttons.
  Displayed at the top of the Friends page when there are pending requests.
-->
<script lang="ts">
	import type { SafeFriendProfile } from '$lib/server/social/friendsService';

	interface PendingRequest {
		friendshipId: string;
		from: SafeFriendProfile;
	}

	interface Props {
		requests: PendingRequest[];
		onAccept: (friendshipId: string) => void;
		onDecline: (friendshipId: string) => void;
	}

	let { requests, onAccept, onDecline }: Props = $props();

	let processingIds = $state<Set<string>>(new Set());

	async function handleAccept(friendshipId: string) {
		processingIds = new Set([...processingIds, friendshipId]);
		try {
			await fetch('/api/friends/accept', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ friendshipId }),
			});
			onAccept(friendshipId);
		} catch (err) {
			console.error('[PendingRequests] Accept failed:', err);
		} finally {
			const next = new Set(processingIds);
			next.delete(friendshipId);
			processingIds = next;
		}
	}

	async function handleDecline(friendshipId: string) {
		processingIds = new Set([...processingIds, friendshipId]);
		try {
			await fetch('/api/friends/decline', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ friendshipId }),
			});
			onDecline(friendshipId);
		} catch (err) {
			console.error('[PendingRequests] Decline failed:', err);
		} finally {
			const next = new Set(processingIds);
			next.delete(friendshipId);
			processingIds = next;
		}
	}
</script>

{#if requests.length > 0}
	<section class="mb-6">
		<h2 class="text-sm font-bold text-bark-600 uppercase tracking-wide mb-3">
			Friend Requests ({requests.length})
		</h2>

		<div class="flex flex-col gap-2">
			{#each requests as req}
				<div class="bg-amber-50 border-2 border-amber-200 rounded-card px-4 py-3 flex items-center gap-3">
					<!-- Mini avatar -->
					<div
						class="w-10 h-10 rounded-full flex items-center justify-center text-lg border border-white shadow-sm flex-shrink-0"
						style="background-color: {req.from.avatarOptions.skinTone};"
					>
						{req.from.avatarOptions.gender === 'girl' ? '👧' : req.from.avatarOptions.gender === 'boy' ? '👦' : '🧒'}
					</div>

					<!-- Name + stats -->
					<div class="flex-1 min-w-0">
						<p class="font-bold text-bark-800 truncate">{req.from.displayName}</p>
						<p class="text-xs text-bark-500">🔥 {req.from.streak} streak · ☀️ {req.from.totalSunDrops} SunDrops</p>
					</div>

					<!-- Accept / Decline buttons -->
					<div class="flex gap-2 flex-shrink-0">
						<button
							onclick={() => handleAccept(req.friendshipId)}
							disabled={processingIds.has(req.friendshipId)}
							class="px-3 py-1.5 rounded-btn bg-mint-500 text-white text-sm font-bold
								   disabled:opacity-50 hover:bg-mint-600 transition-colors"
						>
							✓
						</button>
						<button
							onclick={() => handleDecline(req.friendshipId)}
							disabled={processingIds.has(req.friendshipId)}
							class="px-3 py-1.5 rounded-btn bg-white border-2 border-bark-200 text-bark-500 text-sm font-bold
								   disabled:opacity-50 hover:border-bark-300 transition-colors"
						>
							✕
						</button>
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}
