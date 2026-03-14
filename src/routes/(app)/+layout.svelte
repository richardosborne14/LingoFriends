<!--
  App Layout — Main app shell with bottom tab bar (mobile) and sidebar (desktop).
  Wraps all authenticated routes: garden, lesson, friends, profile.
  
  Bottom tab order: Garden (home) | Lesson | Friends | Profile
  This order is intentional — garden is the "home" metaphor kids return to.
-->
<script lang="ts">
	import { page } from '$app/stores';

	let { data, children } = $props();

	/** Highlight the active tab based on current route */
	function isActive(path: string): boolean {
		return $page.url.pathname.startsWith(path);
	}

	const tabs = [
		{ href: '/garden', icon: '🌳', label: 'Garden' },
		{ href: '/lesson', icon: '📚', label: 'Learn' },
		{ href: '/friends', icon: '👥', label: 'Friends' },
		{ href: '/profile', icon: '🦊', label: 'Me' },
	];
</script>

<div class="flex flex-col min-h-screen bg-bark-50">
	<!-- Main content area — padded above bottom nav -->
	<main class="flex-1 overflow-y-auto pb-20">
		{@render children()}
	</main>

	<!-- Bottom tab bar — fixed to bottom on mobile -->
	<nav
		class="fixed bottom-0 left-0 right-0 z-50
			bg-white border-t border-bark-100
			flex items-stretch
			safe-area-bottom"
		aria-label="Main navigation"
	>
		{#each tabs as tab}
			<a
				href={tab.href}
				class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2
					text-xs font-bold transition-colors duration-100
					min-h-[56px]
					{isActive(tab.href)
						? 'text-coral-500'
						: 'text-bark-400 hover:text-bark-600'}"
				aria-current={isActive(tab.href) ? 'page' : undefined}
			>
				<span class="text-xl leading-none" aria-hidden="true">{tab.icon}</span>
				<span>{tab.label}</span>

				<!-- Active indicator dot -->
				{#if isActive(tab.href)}
					<span class="absolute bottom-1 w-1 h-1 rounded-full bg-coral-400"></span>
				{/if}
			</a>
		{/each}
	</nav>
</div>
