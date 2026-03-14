<!--
  Input — Text input with label, error state, and hint text.
  Minimum 44px touch target (accessibility + kids).
  Error state shows coral-400 border and error message.
-->
<script lang="ts">
	interface Props {
		label?: string;
		name?: string;
		type?: 'text' | 'email' | 'password' | 'number' | 'tel';
		placeholder?: string;
		value?: string;
		error?: string;
		hint?: string;
		disabled?: boolean;
		required?: boolean;
		autocomplete?: HTMLInputElement['autocomplete'];
		onchange?: (value: string) => void;
	}

	let {
		label,
		name,
		type = 'text',
		placeholder = '',
		value = $bindable(''),
		error,
		hint,
		disabled = false,
		required = false,
		autocomplete,
		onchange,
	}: Props = $props();

	// Stable fallback ID — generated once, not reactive (name should not change after mount)
	const fallbackId = `input-${Math.random().toString(36).slice(2, 9)}`;
	const id = $derived(name ?? fallbackId);
</script>

<div class="flex flex-col gap-1">
	{#if label}
		<label for={id} class="text-sm font-bold text-bark-600">
			{label}
			{#if required}<span class="text-coral-400 ml-0.5" aria-hidden="true">*</span>{/if}
		</label>
	{/if}

	<input
		{id}
		{name}
		{type}
		{placeholder}
		{disabled}
		{required}
		{autocomplete}
		bind:value
		oninput={() => onchange?.(value)}
		class="h-11 w-full rounded-lg border-2 px-4 text-base font-semibold text-bark-700
			bg-white transition-colors duration-150
			border-bark-200 placeholder-bark-300
			hover:border-bark-300
			focus:outline-none focus:border-coral-400
			disabled:opacity-50 disabled:cursor-not-allowed
			{error ? 'border-coral-400 bg-coral-50' : ''}"
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
	/>

	{#if error}
		<p id="{id}-error" class="text-sm text-coral-500 font-semibold" role="alert">{error}</p>
	{:else if hint}
		<p id="{id}-hint" class="text-sm text-bark-400">{hint}</p>
	{/if}
</div>
