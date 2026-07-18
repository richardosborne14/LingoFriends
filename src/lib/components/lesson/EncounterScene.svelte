<!--
  EncounterScene.svelte — Sprite face-off banner shown above every lesson activity.

  Shows the user's LPC sprite avatar (left) and the current step's NPC (right)
  facing each other, with name badges. Replaces the old Three.js banner
  (TASK-FUN-02: Three.js is removed from the app entirely).

  Same public contract as the Three.js version — props userAvatar, npcConfig,
  isSpeaking — so ActivityRouter/lesson page needed no changes.

  HOW the characters are drawn:
  Both are composited from LPC spritesheet layers by the shared world
  compositor (src/lib/world/sprites/) — the same pipeline the garden uses,
  so the kid sees the SAME character in lessons as in their garden.
  We extract one standing frame each (user faces right, NPC faces left)
  and scale it up with image-rendering: pixelated.

  Animation without Phaser (this is UI chrome, not a game scene):
  - Both sprites get a gentle CSS idle bob (offset phases — feels alive)
  - While isSpeaking, the NPC gets a livelier "talking" bounce
  - Emotion tilts the NPC slightly (thinking = head-tilt angle)
  - Boss NPCs render 1.3× with the LPC gold crown layer composited on

  TASK-FUN-05 will replace this banner with the full battle theatre; keeping
  it a slim Svelte component (not Phaser) makes that swap cheap.

  @component
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { AvatarOptions, NPCConfig } from '$lib/types/garden';
	import { resolveAvatarLayers, resolveNPCLayers } from '$lib/world/sprites/lpcLayers';

	// ── Props (contract unchanged from the Three.js version) ─────────────────

	interface Props {
		/** User's avatar options from their profile */
		userAvatar: AvatarOptions;
		/** NPC configuration for this step (generated deterministically) */
		npcConfig: NPCConfig;
		/** True while TTS audio plays — NPC gets a livelier bounce */
		isSpeaking?: boolean;
	}

	let { userAvatar, npcConfig, isSpeaking = false }: Props = $props();

	/** Banner height — matches the old Three.js canvas so lesson layout is stable */
	const CANVAS_HEIGHT = 130;

	/** LPC frames are 64px; ×1.6 ≈ 102px tall characters inside the 130px banner */
	const SPRITE_SCALE = 1.6;

	// ── Composited frame data URLs ───────────────────────────────────────────

	/** Data URL of the user's standing frame (facing right, toward the NPC) */
	let userFrame = $state<string | null>(null);
	/** Data URL of the NPC's standing frame (facing left, toward the user) */
	let npcFrame = $state<string | null>(null);

	onMount(() => {
		let cancelled = false;

		// Compositing is browser-only (canvas + Image), so the module is
		// imported here rather than at the top: keeps SSR clean, mirrors the
		// WorldCanvas dynamic-import rule for world code.
		(async () => {
			const { compositeWalkBand, extractFrame } = await import('$lib/world/sprites/compositor');

			const [userBand, npcBand] = await Promise.all([
				compositeWalkBand(resolveAvatarLayers(userAvatar)),
				compositeWalkBand(resolveNPCLayers(npcConfig)),
			]);
			if (cancelled) return;

			// Standing poses: user faces right toward the NPC, NPC faces left
			userFrame = extractFrame(userBand, 'right').toDataURL();
			npcFrame = extractFrame(npcBand, 'left').toDataURL();
		})().catch((err) => {
			// A failed composite leaves the badges-only banner — lesson still
			// fully playable, and the error is visible to devs.
			console.error('[EncounterScene] sprite compositing failed:', err);
		});

		return () => {
			cancelled = true;
		};
	});

	/**
	 * Emotion → CSS tilt for the NPC, mirroring the old 3D head tilts:
	 * thinking tilts sideways, surprised leans back slightly.
	 */
	const emotionTilt = $derived(
		npcConfig.emotion === 'thinking' ? -7 : npcConfig.emotion === 'surprised' ? 4 : 0
	);
</script>

<!--
  Container — rounded, sky-tinted like the lesson cards (was the 3D scene's
  background colour). pointer-events-none so lesson touches pass through.
-->
<div
	class="w-full rounded-xl overflow-hidden relative bg-[#EFF6FF]"
	style="height: {CANVAS_HEIGHT}px; pointer-events: none;"
	aria-hidden="true"
>
	<!-- Grass strip the characters stand on — grounds them visually -->
	<div class="absolute bottom-0 left-0 right-0 h-6 bg-[#A8D89B]"></div>

	<div class="absolute inset-0 flex items-end justify-between px-8 pb-4">
		<!-- User avatar (left, facing right) -->
		{#if userFrame}
			<img
				src={userFrame}
				alt=""
				class="idle-bob"
				style="width: {64 * SPRITE_SCALE}px; height: {64 * SPRITE_SCALE}px;
				       image-rendering: pixelated;"
			/>
		{/if}

		<!-- "VS" spark between them — a hint of the coming battle theatre -->
		<span class="text-lg font-extrabold text-bark-300 mb-6 select-none">✦</span>

		<!-- NPC (right, facing left) — boss is 1.3×, same rule as the old 3D scene -->
		{#if npcFrame}
			<img
				src={npcFrame}
				alt=""
				class={isSpeaking ? 'talking-bounce' : 'idle-bob-offset'}
				style="width: {64 * SPRITE_SCALE * (npcConfig.isBoss ? 1.3 : 1)}px;
				       height: {64 * SPRITE_SCALE * (npcConfig.isBoss ? 1.3 : 1)}px;
				       image-rendering: pixelated;
				       transform: rotate({emotionTilt}deg);"
			/>
		{/if}
	</div>

	<!-- "You" label — bottom-left corner -->
	<div
		class="absolute bottom-2 left-3 flex items-center gap-1.5
		       bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1
		       border border-bark-150 shadow-sm"
	>
		<span class="text-xs" aria-hidden="true">👤</span>
		<span class="text-xs font-bold text-bark-500">You</span>
	</div>

	<!-- NPC name badge — bottom-right corner -->
	<div
		class="absolute bottom-2 right-3 flex items-center gap-1.5
		       bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1
		       border border-bark-150 shadow-sm"
	>
		{#if npcConfig.isBoss}
			<!-- Gold crown emoji for boss NPCs -->
			<span class="text-xs" aria-hidden="true">👑</span>
		{:else}
			<!-- Speaking bubble emoji for regular NPCs -->
			<span class="text-xs" aria-hidden="true">🗣️</span>
		{/if}
		<span class="text-xs font-bold text-bark-700">{npcConfig.name}</span>
	</div>
</div>

<style>
	/*
	 * Idle breathing bob — mirrors the old 3D sine-wave bob (±3px, slow).
	 * The NPC runs the same animation phase-shifted so the two characters
	 * never bob in sync (reads as two independent living beings).
	 */
	@keyframes bob {
		0%, 100% { translate: 0 0; }
		50% { translate: 0 -3px; }
	}

	.idle-bob {
		animation: bob 2.4s ease-in-out infinite;
	}

	.idle-bob-offset {
		animation: bob 2.4s ease-in-out infinite;
		animation-delay: -1.2s; /* half-cycle offset from the user's bob */
	}

	/* Livelier bounce while TTS plays — the sprite-world stand-in for the
	   old jaw animation (LPC frames have no separate jaw). */
	@keyframes talk {
		0%, 100% { translate: 0 0; }
		25% { translate: 0 -4px; }
		50% { translate: 0 -1px; }
		75% { translate: 0 -5px; }
	}

	.talking-bounce {
		animation: talk 0.55s ease-in-out infinite;
	}
</style>
