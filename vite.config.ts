import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		// Tailwind must come before SvelteKit in the plugin array
		tailwindcss(),
		sveltekit(),
	],
	test: {
		// Vitest config — jsdom environment for component tests
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
	},
});
