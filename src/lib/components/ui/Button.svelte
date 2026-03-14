<!--
  Button — Primary interactive component.

  Variants:
    primary   — Coral-400, 3D push shadow (main CTA)
    secondary — Forest-400, 3D push shadow (secondary action)
    ghost     — Transparent, bark-500 text (tertiary action)
    danger    — Storm-400, 3D push shadow (destructive action)

  The 3D push effect on active mimics a physical button press —
  kids respond better to tactile feedback cues.
-->
<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		fullWidth?: boolean;
		onclick?: (e: MouseEvent) => void;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		fullWidth = false,
		onclick,
		children,
	}: Props & { children?: import('svelte').Snippet } = $props();

	const base =
		'inline-flex items-center justify-center font-bold rounded-btn cursor-pointer ' +
		'transition-all duration-100 active:translate-y-[2px] active:shadow-none ' +
		'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 ' +
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coral-400';

	const variants = {
		primary: 'bg-coral-400 text-white shadow-btn-coral hover:bg-coral-500',
		secondary: 'bg-forest-400 text-white shadow-btn-forest hover:bg-forest-500',
		ghost: 'bg-transparent text-bark-500 hover:bg-bark-100',
		danger: 'bg-storm-400 text-white shadow-btn-storm hover:bg-storm-500',
	};

	const sizes = {
		sm: 'h-9 px-4 text-sm gap-1.5',
		md: 'h-11 px-6 text-base gap-2',
		lg: 'h-14 px-8 text-lg gap-2',
	};
</script>

<button
	{type}
	class="{base} {variants[variant]} {sizes[size]} {fullWidth ? 'w-full' : ''}"
	disabled={disabled || loading}
	{onclick}
>
	{#if loading}
		<!-- Simple spinner — no library dependency -->
		<span
			class="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
		></span>
	{/if}
	{#if children}{@render children()}{/if}
</button>
