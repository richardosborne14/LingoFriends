<!--
  StepLevel.svelte — Onboarding Step 4 (NEW in V2)

  The user self-reports their current proficiency level using
  plant-themed visual cards. The plant metaphor ties into the
  garden concept — your starting level is your starting plant.

  Design decisions:
  - 4 levels, each with a distinct plant emoji and background colour
    that gets richer as level increases (pale → emerald → forest → gold)
  - Short, honest descriptions — no jargon (CEFR levels are invisible)
  - Reassurance text at the bottom: "Don't worry, I'll adjust as you go!"
  - This is self-reported (see TASK-V2-05 for adaptive level assessment
    that fine-tunes the level after 3+ lessons)
-->
<script lang="ts">
	import { _ } from 'svelte-i18n';

	/** Valid level codes — must match schema definition */
	export type LevelCode = 'total_beginner' | 'know_some_words' | 'simple_sentences' | 'can_have_conversations';

	let { value = $bindable<LevelCode | ''>(''), onNext, onBack }: {
		value: LevelCode | '';
		onNext: () => void;
		onBack: () => void;
	} = $props();

	/**
	 * Level card definitions.
	 * background: Tailwind-like class for the selected card tint
	 * border: border colour when selected
	 * The plant emoji progression mirrors the garden growth stages.
	 */
	const LEVELS: {
		code: LevelCode;
		plantKey: string;
		titleKey: string;
		descKey: string;
		bgSelected: string;
		borderSelected: string;
		bgHover: string;
	}[] = [
		{
			code: 'total_beginner',
			plantKey: 'levels.total_beginner_plant',
			titleKey: 'levels.total_beginner',
			descKey: 'levels.total_beginner_desc',
			// Pale green — just a seed, humble start
			bgSelected: 'bg-green-50',
			borderSelected: 'border-green-400',
			bgHover: 'hover:bg-green-50/50',
		},
		{
			code: 'know_some_words',
			plantKey: 'levels.know_some_words_plant',
			titleKey: 'levels.know_some_words',
			descKey: 'levels.know_some_words_desc',
			// Light emerald — something is sprouting
			bgSelected: 'bg-emerald-50',
			borderSelected: 'border-emerald-400',
			bgHover: 'hover:bg-emerald-50/50',
		},
		{
			code: 'simple_sentences',
			plantKey: 'levels.simple_sentences_plant',
			titleKey: 'levels.simple_sentences',
			descKey: 'levels.simple_sentences_desc',
			// Forest green — a real tree
			bgSelected: 'bg-forest-50',
			borderSelected: 'border-forest-400',
			bgHover: 'hover:bg-forest-50/50',
		},
		{
			code: 'can_have_conversations',
			plantKey: 'levels.can_have_conversations_plant',
			titleKey: 'levels.can_have_conversations',
			descKey: 'levels.can_have_conversations_desc',
			// Gold/amber — flowering, beautiful
			bgSelected: 'bg-amber-50',
			borderSelected: 'border-amber-400',
			bgHover: 'hover:bg-amber-50/50',
		},
	];
</script>

<div>
	<h2 class="text-xl font-extrabold text-bark-800 mb-1">
		{$_('onboarding.level_title')}
	</h2>
	<p class="text-bark-400 text-sm mb-5">
		{$_('onboarding.level_subtitle')}
	</p>

	<div class="flex flex-col gap-3 mb-4">
		{#each LEVELS as level}
			<button
				type="button"
				onclick={() => (value = level.code)}
				class="flex items-center gap-4 p-4 rounded-xl border-2 font-bold text-left
					transition-all duration-150
					{value === level.code
						? `${level.bgSelected} ${level.borderSelected} shadow-md scale-[1.01]`
						: `border-bark-200 text-bark-700 ${level.bgHover} hover:border-bark-300`}"
			>
				<!-- Plant emoji — grows with each level -->
				<span class="text-3xl flex-shrink-0">{$_(level.plantKey)}</span>
				<div class="flex flex-col min-w-0">
					<span class="text-base font-extrabold leading-tight">{$_(level.titleKey)}</span>
					<span class="text-sm font-normal text-bark-400 mt-0.5 leading-snug">{$_(level.descKey)}</span>
				</div>
				{#if value === level.code}
					<span class="ml-auto flex-shrink-0 text-xl" aria-label="Selected">✓</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Reassurance — important for the child who's anxious about getting it wrong -->
	<p class="text-xs text-bark-400 text-center mb-5 italic">
		{$_('onboarding.level_reassurance')}
	</p>

	<div class="flex gap-3">
		<button
			type="button"
			onclick={onBack}
			class="h-11 px-5 rounded-btn border-2 border-bark-200 text-bark-500 font-bold
				hover:border-bark-300 transition-all"
		>
			{$_('onboarding.back')}
		</button>
		<button
			type="button"
			onclick={onNext}
			disabled={!value}
			class="flex-1 h-11 rounded-btn bg-coral-400 text-white font-bold
				shadow-btn-coral hover:bg-coral-500 transition-all
				disabled:opacity-40 disabled:cursor-not-allowed"
		>
			{$_('onboarding.next')}
		</button>
	</div>
</div>
