<!--
  Task 1.1 — Registration Page

  Two-step flow:
    Step 1 — Account creation form (name, email, password)
    Step 2 — Friend code reveal ("write this down!")

  Step 2 is shown when the server action returns { success: true, friendCode }.
  Session is already created by the time step 2 renders.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	// Whether to show the password in plain text (show/hide toggle)
	let showPassword = $state(false);
	// Track loading state for the submit button
	let loading = $state(false);

	// Step 2 is shown when registration succeeded and friendCode is returned
	const step2 = $derived(!!(form && 'success' in form && form.success && form.friendCode));

	// Preserve input values on validation errors
	const values = $derived(form && 'values' in form ? form.values : null);
	const errors = $derived(form && 'errors' in form ? form.errors : null);

	/** Copies the friend code to clipboard and gives visual feedback */
	let copied = $state(false);
	async function copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard API not available — no-op, the code is visible on screen
		}
	}
</script>

<svelte:head>
	<title>Create Account — LingoFriends</title>
</svelte:head>

{#if step2 && form && 'friendCode' in form}
	<!-- ─── STEP 2: Friend Code Reveal ─── -->
	<div class="bg-white rounded-card shadow-card p-8 text-center">
		<div class="text-5xl mb-4">🎉</div>
		<h2 class="text-2xl font-extrabold text-bark-800 mb-2">You're in!</h2>
		<p class="text-bark-500 mb-8">Your account is ready. Write down your friend code!</p>

		<!-- Friend code display — big, prominent, easy to read -->
		<div class="bg-bark-50 rounded-xl p-6 mb-4 relative">
			<p class="text-xs font-bold text-bark-400 uppercase tracking-widest mb-2">
				Your Friend Code
			</p>
			<p class="text-4xl font-extrabold tracking-[0.15em] text-bark-800 font-mono">
				{form.friendCode}
			</p>
		</div>

		<!-- Copy button -->
		<button
			type="button"
			onclick={() => copyCode(form.friendCode as string)}
			class="text-sm font-bold text-coral-500 hover:text-coral-600 mb-6 flex items-center gap-1.5 mx-auto"
		>
			{#if copied}
				<span>✓</span> Copied!
			{:else}
				<span>📋</span> Copy to clipboard
			{/if}
		</button>

		<p class="text-sm text-bark-400 mb-8 bg-sky-50 rounded-lg p-3">
			📌 Your friends need this code to add you. You can find it again in your profile.
		</p>

		<!-- Continue to onboarding — the fun stuff -->
		<a
			href="/onboarding"
			class="inline-flex items-center justify-center w-full h-14 px-8 text-lg font-bold
				rounded-btn bg-coral-400 text-white shadow-btn-coral
				hover:bg-coral-500 transition-all duration-100
				active:translate-y-[2px] active:shadow-none"
		>
			Continue to Setup 🌱
		</a>
	</div>
{:else}
	<!-- ─── STEP 1: Registration Form ─── -->
	<div class="bg-white rounded-card shadow-card p-8">
		<h2 class="text-2xl font-extrabold text-bark-800 mb-1">Create your account</h2>
		<p class="text-bark-400 mb-8">It only takes a minute!</p>

		<!-- Global error (rare — server failure) -->
		{#if errors && '_global' in errors && errors._global}
			<div class="bg-coral-50 border border-coral-200 rounded-lg p-3 mb-6">
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
			<!-- Display Name -->
			<div class="flex flex-col gap-1">
				<label for="displayName" class="text-sm font-bold text-bark-600">
					Your name <span class="text-coral-400" aria-hidden="true">*</span>
				</label>
				<input
					id="displayName"
					name="displayName"
					type="text"
					placeholder="e.g. Max"
					value={values?.displayName ?? ''}
					autocomplete="name"
					required
					class="h-11 w-full rounded-lg border-2 px-4 text-base font-semibold text-bark-700
						bg-white transition-colors duration-150 border-bark-200 placeholder-bark-300
						hover:border-bark-300 focus:outline-none focus:border-coral-400
						{errors?.displayName ? 'border-coral-400 bg-coral-50' : ''}"
					aria-invalid={errors?.displayName ? 'true' : undefined}
					aria-describedby={errors?.displayName ? 'displayName-error' : undefined}
				/>
				{#if errors?.displayName}
					<p id="displayName-error" class="text-sm text-coral-500 font-semibold" role="alert">
						{errors.displayName[0]}
					</p>
				{:else}
					<p class="text-sm text-bark-400">This is what your friends will see</p>
				{/if}
			</div>

			<!-- Email -->
			<div class="flex flex-col gap-1">
				<label for="email" class="text-sm font-bold text-bark-600">
					Parent's email <span class="text-coral-400" aria-hidden="true">*</span>
				</label>
				<input
					id="email"
					name="email"
					type="email"
					placeholder="parent@example.com"
					value={values?.email ?? ''}
					autocomplete="email"
					required
					class="h-11 w-full rounded-lg border-2 px-4 text-base font-semibold text-bark-700
						bg-white transition-colors duration-150 border-bark-200 placeholder-bark-300
						hover:border-bark-300 focus:outline-none focus:border-coral-400
						{errors?.email ? 'border-coral-400 bg-coral-50' : ''}"
					aria-invalid={errors?.email ? 'true' : undefined}
					aria-describedby={errors?.email ? 'email-error' : 'email-hint'}
				/>
				{#if errors?.email}
					<p id="email-error" class="text-sm text-coral-500 font-semibold" role="alert">
						{errors.email[0]}
					</p>
				{:else}
					<p id="email-hint" class="text-sm text-bark-400">For account recovery only — not shared</p>
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
						placeholder="At least 8 characters"
						autocomplete="new-password"
						required
						class="h-11 w-full rounded-lg border-2 px-4 pr-12 text-base font-semibold text-bark-700
							bg-white transition-colors duration-150 border-bark-200 placeholder-bark-300
							hover:border-bark-300 focus:outline-none focus:border-coral-400
							{errors?.password ? 'border-coral-400 bg-coral-50' : ''}"
						aria-invalid={errors?.password ? 'true' : undefined}
						aria-describedby={errors?.password ? 'password-error' : undefined}
					/>
					<!-- Show/hide toggle — important for kids who mistype -->
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
				{#if errors?.password}
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
					<span class="block h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
					Creating account...
				{:else}
					Create Account 🚀
				{/if}
			</button>
		</form>

		<p class="text-center text-sm text-bark-400 mt-6">
			Already have an account?
			<a href="/login" class="font-bold text-coral-500 hover:text-coral-600">Log in</a>
		</p>
	</div>
{/if}
