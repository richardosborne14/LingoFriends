<!--
  StepInterests.svelte — Onboarding Step 5

  The user picks their interests from a scrollable categorised grid.
  These are saved to the profile and fed to the AI lesson generator
  so that vocabulary examples use contexts the child cares about.
  (e.g. a football fan learns numbers via match scores, not abstract counting)

  Design decisions:
  - Organised into 4 categories with header dividers
  - Emoji chips with translated labels
  - Multi-select with no minimum — all optional
  - "Skip for now" button so no one is blocked
  - Pop/scale animation on selection for satisfying tactile feedback

  The full interest list is defined in TASK-V2-01 spec and covers
  30+ options across hobbies, sports, music, and other topics.
-->
<script lang="ts">
	import { _ } from 'svelte-i18n';

	/** Currently selected interest IDs (binds to parent state) */
	let { value = $bindable<string[]>([]), onNext, onBack }: {
		value: string[];
		onNext: () => void;
		onBack: () => void;
	} = $props();

	/**
	 * Interest categories with their items.
	 * IDs must match the keys in en.json/fr.json under "interests".
	 * Emojis are universal — they don't need translation.
	 */
	const CATEGORIES = [
		{
			id: 'hobbies',
			labelKey: 'interests.category_hobbies',
			items: [
				{ id: 'dancing', emoji: '💃' },
				{ id: 'drawing', emoji: '🎨' },
				{ id: 'gaming', emoji: '🎮' },
				{ id: 'cooking', emoji: '🍳' },
				{ id: 'reading', emoji: '📚' },
				{ id: 'photography', emoji: '📷' },
				{ id: 'crafts', emoji: '✂️' },
				{ id: 'movies', emoji: '🎬' },
			],
		},
		{
			id: 'sports',
			labelKey: 'interests.category_sports',
			items: [
				{ id: 'football', emoji: '⚽' },
				{ id: 'basketball', emoji: '🏀' },
				{ id: 'swimming', emoji: '🏊' },
				{ id: 'skateboarding', emoji: '🛹' },
				{ id: 'cycling', emoji: '🚴' },
				{ id: 'martial_arts', emoji: '🥋' },
				{ id: 'gymnastics', emoji: '🤸' },
				{ id: 'tennis', emoji: '🎾' },
			],
		},
		{
			id: 'music',
			labelKey: 'interests.category_music',
			items: [
				{ id: 'kpop', emoji: '🎤' },
				{ id: 'rap', emoji: '🎧' },
				{ id: 'rock', emoji: '🎸' },
				{ id: 'pop', emoji: '🎵' },
				{ id: 'classical', emoji: '🎻' },
				{ id: 'electronic', emoji: '🎹' },
			],
		},
		{
			id: 'other',
			labelKey: 'interests.category_other',
			items: [
				{ id: 'animals', emoji: '🐾' },
				{ id: 'science', emoji: '🔬' },
				{ id: 'space', emoji: '🚀' },
				{ id: 'dinosaurs', emoji: '🦕' },
				{ id: 'nature', emoji: '🌿' },
				{ id: 'travel', emoji: '✈️' },
				{ id: 'fashion', emoji: '👗' },
				{ id: 'superheroes', emoji: '🦸' },
				{ id: 'magic', emoji: '🪄' },
				{ id: 'history', emoji: '🏛️' },
			],
		},
	];

	/**
	 * Toggle an interest: add it if not selected, remove if already selected.
	 * Uses functional array update to keep value reactive.
	 */
	function toggle(id: string) {
		value = value.includes(id)
			? value.filter((i) => i !== id)
			: [...value, id];
	}

	/** True if a given interest ID is currently selected */
	function isSelected(id: string): boolean {
		return value.includes(id);
	}
</script>

<div>
	<h2 class="text-xl font-extrabold text-bark-800 mb-1">
		{$_('onboarding.interests_title')}
	</h2>
	<p class="text-bark-400 text-sm mb-5">
		{$_('onboarding.interests_subtitle')}
	</p>

	<!-- Scrollable interest grid grouped by category -->
	<div class="space-y-5 mb-6 max-h-64 overflow-y-auto pr-1">
		{#each CATEGORIES as category}
			<!-- Category label as subtle section divider -->
			<div>
				<p class="text-xs font-bold text-bark-400 uppercase tracking-widest mb-2">
					{$_(category.labelKey)}
				</p>
				<div class="flex flex-wrap gap-2">
					{#each category.items as item}
						<button
							type="button"
							onclick={() => toggle(item.id)}
							class="flex items-center gap-1.5 px-3 py-2 rounded-full border-2
								text-sm font-bold transition-all duration-150
								{isSelected(item.id)
									? 'border-coral-400 bg-coral-50 text-coral-700 scale-105'
									: 'border-bark-200 text-bark-600 hover:border-bark-300 hover:bg-bark-50'}"
						>
							<span aria-hidden="true">{item.emoji}</span>
							<span>{$_(`interests.${item.id}`)}</span>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div class="flex gap-3">
		<button
			type="button"
			onclick={onBack}
			class="h-11 px-5 rounded-btn border-2 border-bark-200 text-bark-500 font-bold
				hover:border-bark-300 transition-all"
		>
			{$_('onboarding.back')}
		</button>
		<!-- Skip/Next — both advance; label changes based on selection count -->
		<button
			type="button"
			onclick={onNext}
			class="flex-1 h-11 rounded-btn bg-coral-400 text-white font-bold
				shadow-btn-coral hover:bg-coral-500 transition-all"
		>
			{value.length === 0 ? $_('onboarding.interests_skip') : $_('onboarding.next')}
		</button>
	</div>
</div>
