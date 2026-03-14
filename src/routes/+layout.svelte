<script lang="ts">
	/**
	 * Root Layout
	 *
	 * Applies global styles and initialises the i18n system.
	 *
	 * i18n init happens here (once, on every page) so that $_() works
	 * everywhere in the app. The initial locale is auto-detected from:
	 *   1. localStorage (set on previous visit or during onboarding)
	 *   2. browser navigator.language
	 *   3. 'en' fallback
	 *
	 * The initI18n() call is idempotent — safe to call on every render.
	 * See src/lib/i18n/index.ts for full locale management details.
	 */
	import '../app.css';
	import { initI18n } from '$lib/i18n';

	// Initialise once — registers locale files and sets initial locale.
	// Must run at module scope (not inside onMount) so server-side
	// rendering doesn't get a flash of untranslated strings.
	initI18n();
</script>

<slot />
