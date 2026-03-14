import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Enables TypeScript, PostCSS, etc. via Vite
	preprocess: vitePreprocess(),

	kit: {
		// Node adapter for Hetzner VPS deployment (Docker)
		adapter: adapter(),

		alias: {
			// Matches tsconfig paths — keep in sync
			$lib: 'src/lib',
			'$types/*': 'src/lib/types/*',
		},
	},
};

export default config;
