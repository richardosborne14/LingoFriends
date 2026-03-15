<!--
  LingoFriends V2 — Confetti Effect
  
  CSS-only confetti burst for lesson completion celebrations.
  
  WHY CSS-only: No canvas, no heavy library. 20 divs with CSS animations
  are plenty for a brief celebration effect. Keeps bundle size small and
  avoids the layout thrashing of canvas-based confetti libraries.
  
  Usage:
    <Confetti active={true} />  ← shows on mount when active
    <Confetti active={false} /> ← hidden
  
  The component auto-cleans up after 3 seconds via the onDone callback.
  
  @component Confetti
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';

  /** Whether to show confetti. Toggling true triggers a new burst. */
  export let active = false;

  /** Dispatch 'done' when the animation finishes. */
  const dispatch = createEventDispatcher<{ done: void }>();

  // ── CONFETTI PIECE DATA ──────────────────────────────────────────────────

  /**
   * Configuration for each confetti piece.
   * Generated on mount to avoid re-randomising on every render.
   */
  interface Piece {
    x: number;      // Start X% (horizontal position)
    delay: number;  // Animation delay in ms
    color: string;  // Tailwind-compatible hex colour
    size: number;   // Width × height in px
    rotate: number; // Initial rotation in degrees
  }

  /**
   * Colour palette — warm, playful, child-friendly.
   * Matches the LingoFriends design system's accent colours.
   */
  const COLOURS = [
    '#FFD700', // Gold (SunDrop yellow)
    '#FF6B6B', // Coral red
    '#4FC3F7', // Sky blue
    '#81C784', // Leaf green
    '#CE93D8', // Lavender
    '#FFB74D', // Warm orange
    '#F06292', // Pink
  ];

  /**
   * 25 confetti pieces — enough for a satisfying burst without perf impact.
   * Spread across the full viewport width for even coverage.
   */
  const pieces: Piece[] = Array.from({ length: 25 }, (_, i) => ({
    x: (i / 25) * 100 + (Math.random() - 0.5) * 8, // spread with jitter
    delay: Math.random() * 600,
    color: COLOURS[i % COLOURS.length],
    size: 8 + Math.random() * 8,
    rotate: Math.random() * 360,
  }));

  // ── CLEANUP ──────────────────────────────────────────────────────────────

  /** Auto-dispatch 'done' after animation completes (3 seconds). */
  $: if (active) {
    setTimeout(() => dispatch('done'), 3000);
  }
</script>

{#if active}
  <!-- 
    Overlay div: pointer-events: none ensures confetti doesn't block UI.
    position: fixed ensures it covers the full viewport regardless of scroll.
  -->
  <div
    class="confetti-container"
    aria-hidden="true"
  >
    {#each pieces as piece, i (i)}
      <div
        class="confetti-piece"
        style="
          left: {piece.x}%;
          width: {piece.size}px;
          height: {piece.size * 0.6}px;
          background-color: {piece.color};
          animation-delay: {piece.delay}ms;
          transform: rotate({piece.rotate}deg);
        "
      />
    {/each}
  </div>
{/if}

<style>
  .confetti-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; /* Never block clicks */
    z-index: 9999;
    overflow: hidden;
  }

  .confetti-piece {
    position: absolute;
    top: -20px;
    border-radius: 2px;
    animation: confetti-fall 2.5s ease-in forwards;
  }

  @keyframes confetti-fall {
    0% {
      transform: translateY(0) rotate(0deg) scaleX(1);
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    100% {
      /* 
        Translate past the viewport height (use 100vh as max approx).
        Pieces also drift horizontally and spin for natural look.
      */
      transform: translateY(110vh) rotate(720deg) scaleX(0.5);
      opacity: 0;
    }
  }
</style>
