<!--
  FriendCard — Displays a friend's avatar, name, streak, and SunDrops.
  Used in the Friends page grid and the gift recipient picker.

  Shows an avatar mini-preview built from the same colour options as the main avatar.
  Tap → emit 'select' event (parent decides what to do: view garden, gift, etc.)
-->
<script lang="ts">
	import type { SafeFriendProfile } from '$lib/server/social/friendsService';

	interface Props {
		friend: SafeFriendProfile;
		/** Whether this card is in a selection context (gift picker, etc.) */
		selectable?: boolean;
		selected?: boolean;
		/** Friendship row ID — needed for the remove button */
		friendshipId?: string;
		onSelect?: (friend: SafeFriendProfile) => void;
		onRemove?: (friendshipId: string) => void;
	}

	let {
		friend,
		selectable = false,
		selected = false,
		friendshipId,
		onSelect,
		onRemove,
	}: Props = $props();

	/** Build a simple CSS avatar from the friend's colour options */
	function getAvatarStyle(): string {
		return `background-color: ${friend.avatarOptions.skinTone};`;
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="relative bg-white rounded-card border-2 p-4 transition-all duration-100 cursor-pointer
		   {selected ? 'border-coral-400 shadow-md' : 'border-bark-100 hover:border-bark-300'}
		   {selectable ? 'hover:shadow-md' : ''}"
	role={selectable ? 'button' : 'article'}
	tabindex={selectable ? 0 : undefined}
	onclick={() => onSelect?.(friend)}
	onkeydown={(e) => e.key === 'Enter' && onSelect?.(friend)}
>
	<!-- Mini avatar circle -->
	<div
		class="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl border-2 border-white shadow"
		style={getAvatarStyle()}
	>
		<!-- Gender-specific default emoji — real avatar rendering is Three.js in garden -->
		{friend.avatarOptions.gender === 'girl' ? '👧' : friend.avatarOptions.gender === 'boy' ? '👦' : '🧒'}
	</div>

	<!-- Display name -->
	<p class="text-center font-bold text-bark-800 text-sm truncate">{friend.displayName}</p>

	<!-- Stats row -->
	<div class="flex items-center justify-center gap-3 mt-2 text-xs text-bark-500">
		<span title="Streak">🔥 {friend.streak}</span>
		<span title="SunDrops">☀️ {friend.totalSunDrops}</span>
	</div>

	<!-- Friend code (small, dimmed) -->
	<p class="text-center text-xs text-bark-300 mt-1 font-mono">{friend.friendCode}</p>

	<!-- Remove button (shown on hover if friendshipId is provided) -->
	{#if friendshipId && !selectable}
		<button
			class="absolute top-2 right-2 text-bark-300 hover:text-coral-400 text-xs transition-colors"
			title="Remove friend"
			onclick={(e) => { e.stopPropagation(); onRemove?.(friendshipId!); }}
			aria-label="Remove {friend.displayName} as a friend"
		>
			✕
		</button>
	{/if}
</div>
