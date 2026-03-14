<!--
  StepAgeGroup.svelte — Onboarding Step (between Target Language and Level)

  Age group selection. Stored in profile and used to calibrate
  the coaching tone: younger kids get simpler explanations,
  older teens get more detail.

  Simple 3-card layout matching the existing step design language.
-->
<script lang="ts">
	import { _ } from 'svelte-i18n';

	/** Valid age group codes — must match schema constraint */
	export type AgeGroupCode = '7-10' | '11-14' | '15-18';

	let { value = $bindable<AgeGroupCode | ''>(''), onNext, onBack }: {
		value: AgeGroupCode | '';
		onNext: () => void;
		onBack: () => void;
	} = $props();

	const AGE_GROUPS: { val: AgeGroupCode; emoji: string; key: string }[] = [
		{ val: '7-10',  emoji: '🧒', key: 'age_groups.7-10' },
		{ val: '11-14', emoji: '🧑', key: 'age_groups.11-14' },
		{ val: '15-18', emoji: '🧑‍🎓', key: 'age_groups.15-18' },
	];
</script>

<div>
	<h2 class="text-xl font-extrabold text-bark-800 mb-6">
		{$_('onboarding.age_title')}
	</h2>

	<div class="flex flex-col gap-3 mb-8">
		{#each AGE_GROUPS as ag}
			<button
				type="button"
				onclick={() => (value = ag.val)}
				class="flex items-center gap-4 p-4 rounded-xl border-2 font-bold text-left
					transition-all duration-150
					{value === ag.val
						? 'border-coral-400 bg-coral-50 text-coral-700 shadow-md scale-[1.01]'
						: 'border-bark-200 text-bark-700 hover:border-bark-300 hover:bg-bark-50'}"
			>
				<span class="text-3xl">{ag.emoji}</span>
				<span class="text-lg">{$_(ag.key)}</span>
				{#if value === ag.val}
					<span class="ml-auto text-coral-500 text-xl" aria-label="Selected">✓</span>
				{/if}
			</button>
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
