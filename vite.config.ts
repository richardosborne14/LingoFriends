import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * Vite config — SvelteKit + Tailwind v4
 * Vitest config lives in vitest.config.ts to avoid the dual-Vite type conflict.
 */
export default defineConfig({
	plugins: [
		// Tailwind must come before SvelteKit in the plugin array
		tailwindcss(),
		sveltekit(),
	],
});
