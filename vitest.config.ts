import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config — pure TypeScript unit tests only.
 *
 * No Svelte plugin here — our unit tests (services, utils, types) are pure TS.
 * For component tests (Task 0.7), we'll use @testing-library/svelte with the
 * SvelteKit testing setup that avoids the dual-Vite version conflict.
 *
 * The type error from mixing @sveltejs/vite-plugin-svelte (uses vite@6) with
 * vitest's bundled vite@6 copy is a known tooling quirk — avoided by not using
 * Svelte plugin at all here.
 */
export default defineConfig({
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
	},
	resolve: {
		// Mirror SvelteKit's $lib alias so tests can import from '$lib/...'
		alias: {
			$lib: path.resolve('./src/lib'),
		},
		conditions: ['browser'],
	},
});
