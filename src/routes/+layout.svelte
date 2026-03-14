<script lang="ts">
	/**
	 * Root Layout
	 *
	 * Applies global styles (bark-50 background, Nunito font).
	 * User data from hooks.server.ts is available to all child pages via $page.data.
	 * Full implementation in Task 0.6.
	 */
	import '../app.css';
</script>

<slot />
