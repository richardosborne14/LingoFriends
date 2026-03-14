<!--
  Task 1.2 — Login Page

  Simple email + password form with:
    - Show/hide password toggle (kids mistype passwords often)
    - Inline field errors
    - Global error banner for wrong credentials / rate limit
    - Link to register
    - Respects ?returnTo param set by the auth guard
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let showPassword = $state(false);
	let loading = $state(false);

	// Preserve the email input value across validation failures
	const emailValue = $derived(form && 'values' in form ? (form.values?.email ?? '') : '');

	// Normalise errors — could be field-level or global
	const errors = $derived(form && 'errors' in form ? form.errors : null);
</script>

<svelte:head>
	<title>Log In — LingoFriends</title>
</svelte:head>

<div class="bg-white rounded-card shadow-card p-8">
	<h2 class="text-2xl font-extrabold text-bark-800 mb-1">Welcome back!</h2>
	<p class="text-bark-400 mb-8">Log in to continue learning</p>

	<!-- Global error banner (wrong credentials, rate limit) -->
	{#if errors && '_global' in errors && errors._global}
		<div class="bg-coral-50 border border-coral-200 rounded-lg p-3 mb-6" role="alert">
			<p class="text-sm font-semibold text-coral-600">{errors._global[0]}</p>
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
		class="flex flex-col gap-5"
	>
		<!-- Email -->
		<div class="flex flex-col gap-1">
			<label for="email" class="text-sm font-bold text-bark-600">
				Email <span class="text-coral-400" aria-hidden="true">*</span>
			</label>
			<input
				id="email"
				name="email"
				type="email"
				placeholder="your@email.com"
				value={emailValue}
				autocomplete="email"
				required
				class="h-11 w-full rounded-lg border-2 px-4 text-base font-semibold text-bark-700
					bg-white transition-colors duration-150 border-bark-200 placeholder-bark-300
					hover:border-bark-300 focus:outline-none focus:border-coral-400
					{errors && 'email' in errors && errors.email ? 'border-coral-400 bg-coral-50' : ''}"
				aria-invalid={errors && 'email' in errors && errors.email ? 'true' : undefined}
				aria-describedby={errors && 'email' in errors && errors.email ? 'email-error' : undefined}
			/>
			{#if errors && 'email' in errors && errors.email}
				<p id="email-error" class="text-sm text-coral-500 font-semibold" role="alert">
					{errors.email[0]}
				</p>
			{/if}
		</div>

		<!-- Password with show/hide toggle -->
		<div class="flex flex-col gap-1">
			<label for="password" class="text-sm font-bold text-bark-600">
				Password <span class="text-coral-400" aria-hidden="true">*</span>
			</label>
			<div class="relative">
				<input
					id="password"
					name="password"
					type={showPassword ? 'text' : 'password'}
					placeholder="Your password"
					autocomplete="current-password"
					required
					class="h-11 w-full rounded-lg border-2 px-4 pr-12 text-base font-semibold text-bark-700
						bg-white transition-colors duration-150 border-bark-200 placeholder-bark-300
						hover:border-bark-300 focus:outline-none focus:border-coral-400
						{errors && 'password' in errors && errors.password ? 'border-coral-400 bg-coral-50' : ''}"
					aria-invalid={errors && 'password' in errors && errors.password ? 'true' : undefined}
					aria-describedby={errors && 'password' in errors && errors.password
						? 'password-error'
						: undefined}
				/>
				<button
					type="button"
					onclick={() => (showPassword = !showPassword)}
					class="absolute right-3 top-1/2 -translate-y-1/2 text-bark-400 hover:text-bark-600
						text-xl leading-none"
					aria-label={showPassword ? 'Hide password' : 'Show password'}
				>
					{showPassword ? '🙈' : '👁️'}
				</button>
			</div>
			{#if errors && 'password' in errors && errors.password}
				<p id="password-error" class="text-sm text-coral-500 font-semibold" role="alert">
					{errors.password[0]}
				</p>
			{/if}
		</div>

		<button
			type="submit"
			disabled={loading}
			class="h-14 w-full rounded-btn bg-coral-400 text-white font-bold text-lg
				shadow-btn-coral hover:bg-coral-500 transition-all duration-100
				active:translate-y-[2px] active:shadow-none
				disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0
				flex items-center justify-center gap-2 mt-2"
		>
			{#if loading}
				<span
					class="block h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin"
				></span>
				Logging in...
			{:else}
				Log In 🌸
			{/if}
		</button>
	</form>

	<p class="text-center text-sm text-bark-400 mt-6">
		Don't have an account?
		<a href="/register" class="font-bold text-coral-500 hover:text-coral-600">Create one</a>
	</p>
</div>
