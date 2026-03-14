<!--
  FirstLessonCompleteModal — 3-page swipeable modal shown only after the
  learner's very first lesson (TASK-V2-03 / item #8 from the original list).

  Explains the garden economy so the learner understands why they should
  care about SunDrops and Gems. Shown exactly ONCE, gated by
  profile.firstLessonComplete flag.

  Three pages:
    1. Congratulations + sundrops earned
    2. Your tree grows as you learn (SunDrop economy)
    3. Gems unlock the shop (Gem economy)

  After dismissing page 3, navigates to /garden so the learner sees their tree.

  Architecture:
  - Rendered by the lesson CompletionScreen when it detects the first lesson flag
  - onComplete() navigates to /garden
-->
<script lang="ts">
	import { goto } from '$app/navigation';

	interface Props {
		/** Total SunDrops earned in the just-completed lesson */
		sunDropsEarned: number;
		/** Called after the learner taps "Go to My Garden" on the final page */
		onComplete?: () => void;
	}

	let { sunDropsEarned, onComplete }: Props = $props();

	/** Current page index: 0, 1, or 2 */
	let page = $state(0);

	const TOTAL_PAGES = 3;

	function nextPage() {
		if (page < TOTAL_PAGES - 1) {
			page++;
		} else {
			// Final page — navigate to garden
			if (onComplete) {
				onComplete();
			} else {
				goto('/garden');
			}
		}
	}

	/** Page dot indicator helpers */
	function isDotActive(index: number): boolean {
		return index === page;
	}
</script>

<!--
  Full-screen dark backdrop + centred white card.
  The "first lesson" feel warrants a bigger, more dramatic presentation.
-->
<div
	class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
	role="dialog"
	aria-modal="true"
	aria-label="First lesson complete"
>
	<div
		class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden
			   animate-in zoom-in-90 fade-in duration-300"
	>

		<!-- ── PAGE CONTENT ─────────────────────────────────────────────── -->
		<div class="px-8 pt-8 pb-4 flex flex-col items-center gap-5 text-center min-h-[340px]">

			{#if page === 0}
				<!-- PAGE 1: Congratulations ─────────────────────────────── -->
				<div class="flex flex-col items-center gap-4">
					<span class="text-5xl" aria-hidden="true">🎉</span>
					<div>
						<h2 class="text-2xl font-extrabold text-bark-800 font-display leading-tight">
							Congratulations!
						</h2>
						<p class="text-bark-500 mt-2">
							You completed your first lesson!
						</p>
					</div>
					<!-- Sundrops earned display -->
					<div class="bg-amber-50 border border-amber-200 rounded-xl px-6 py-3">
						<p class="text-2xl font-extrabold text-amber-500">
							☀️ +{sunDropsEarned} Sun Drops
						</p>
						<p class="text-xs text-amber-600 mt-0.5">earned this lesson</p>
					</div>
					<p class="text-sm text-bark-400">
						Sun Drops are the currency of your garden. Keep earning them!
					</p>
				</div>

			{:else if page === 1}
				<!-- PAGE 2: Tree grows as you learn ──────────────────────── -->
				<div class="flex flex-col items-center gap-4">
					<!-- Growth progression visual -->
					<div class="text-4xl tracking-wider" aria-hidden="true">
						🌱 → 🌿 → 🌳 → 🌸
					</div>
					<div>
						<h2 class="text-xl font-extrabold text-bark-800 font-display">
							Your tree grows as you learn!
						</h2>
					</div>
					<p class="text-sm text-bark-500 leading-relaxed">
						Use Sun Drops to water your tree and watch it grow from a seed
						into a beautiful flowering tree. 🌸
					</p>
					<div class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 w-full">
						<p class="text-sm text-red-700 font-medium">
							⚠️ But be careful — if you don't practice, your tree
							might get thirsty! 💧
						</p>
					</div>
				</div>

			{:else}
				<!-- PAGE 3: The Garden Shop ──────────────────────────────── -->
				<div class="flex flex-col items-center gap-4">
					<span class="text-4xl" aria-hidden="true">💎</span>
					<div>
						<h2 class="text-xl font-extrabold text-bark-800 font-display">
							Gems unlock cool stuff!
						</h2>
					</div>
					<p class="text-sm text-bark-500 leading-relaxed">
						Earn Gems by getting perfect scores and keeping your streak going.
						Visit the Garden Shop to decorate your space!
					</p>
					<!-- Shop items preview -->
					<div class="grid grid-cols-2 gap-2 w-full">
						{#each [
							{ emoji: '🌹', label: 'Flowers' },
							{ emoji: '🪑', label: 'Furniture' },
							{ emoji: '🌲', label: 'New trees' },
							{ emoji: '✨', label: 'Decorations' },
						] as item}
							<div class="bg-bark-50 rounded-xl px-3 py-2 flex items-center gap-2">
								<span class="text-lg" aria-hidden="true">{item.emoji}</span>
								<span class="text-sm font-medium text-bark-600">{item.label}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

		</div>

		<!-- ── NAVIGATION ────────────────────────────────────────────────── -->
		<div class="px-8 pb-8 flex flex-col items-center gap-4">

			<!-- Page dots -->
			<div class="flex gap-2" aria-hidden="true">
				{#each Array(TOTAL_PAGES) as _, i (i)}
					<div
						class="w-2 h-2 rounded-full transition-all duration-200"
						class:bg-coral-400={isDotActive(i)}
						class:bg-bark-200={!isDotActive(i)}
					></div>
				{/each}
			</div>

			<!-- CTA button changes label on last page -->
			<button
				onclick={nextPage}
				class="w-full h-12 rounded-btn bg-coral-400 hover:bg-coral-500
					   active:translate-y-[2px] text-white font-bold text-base
					   shadow-btn-coral transition-all duration-100"
			>
				{#if page < TOTAL_PAGES - 1}
					Continue →
				{:else}
					Go to My Garden 🌳
				{/if}
			</button>

		</div>
	</div>
</div>
