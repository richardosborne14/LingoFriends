<!--
  Auth Layout — Full-screen centered layout for login/register/onboarding.
  No navigation bar — users haven't authenticated yet.
  Bark-50 background with centred white card.
-->
<script lang="ts">
	let { children } = $props();
</script>

<div class="min-h-screen bg-bark-50 flex flex-col items-center justify-center px-4 py-12">
	<!-- LingoFriends logo / wordmark -->
	<div class="mb-8 text-center">
		<div class="text-4xl mb-2">🌸</div>
		<h1 class="text-2xl font-extrabold text-bark-700">LingoFriends</h1>
		<p class="text-bark-400 text-sm font-semibold mt-1">Learn languages with friends</p>
	</div>

	<!-- Auth card container — max width keeps forms readable on desktop -->
	<div class="w-full max-w-md">
		{@render children()}
	</div>
</div>
