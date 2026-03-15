<!--
  LingoFriends V2 — Streak Milestone Modal
  
  Celebrates reaching a streak milestone (3, 7, 14, 30, 100 days).
  
  Shown after lesson completion when checkStreakMilestone() returns a hit.
  
  The modal:
  - Shows the streak count with a flame animation
  - Shows the badge name (if the milestone has one)
  - Announces the gem reward
  - Has a single "Keep going!" dismiss button
  
  DESIGN NOTE: Milestone modals should be BRIEF celebrations, not interruptions.
  One emoji, one number, one button. Quick joy, then back to the garden.
  
  @component StreakMilestoneModal
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  /** The streak count that triggered this milestone */
  export let streak: number;

  /** Gems earned at this milestone */
  export let gems: number;

  /** Badge name if milestone has one (e.g. 'Week Warrior'), undefined otherwise */
  export let badge: string | undefined = undefined;

  const dispatch = createEventDispatcher<{ close: void }>();

  /** Emoji to show based on streak length — escalating celebration. */
  $: heroEmoji =
    streak >= 100 ? '🏆' :
    streak >= 30  ? '🎖️' :
    streak >= 14  ? '🌟' :
    streak >= 7   ? '⚔️' :
                    '🔥';
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
  role="dialog"
  aria-modal="true"
  aria-labelledby="streak-milestone-title"
>
  <div class="bg-white rounded-3xl shadow-2xl max-w-xs w-full p-6 text-center">
    
    <!-- Hero emoji + animated flames -->
    <div class="text-7xl mb-2 animate-bounce">{heroEmoji}</div>

    <!-- Streak number — big and bold, the main message -->
    <div class="text-5xl font-black text-orange-500 mb-1">
      {streak}
    </div>
    <p class="text-gray-500 text-sm mb-4">day streak! 🔥</p>

    <!-- Badge name (e.g. Week Warrior) — only shown on named milestones -->
    {#if badge}
      <div class="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm font-bold px-4 py-2 rounded-full inline-block mb-4">
        🏅 {badge}
      </div>
    {/if}

    <!-- Gem reward -->
    <div class="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 mb-5 flex items-center justify-center gap-2">
      <span class="text-2xl">💎</span>
      <span class="text-purple-800 font-semibold">+{gems} Gems earned!</span>
    </div>

    <!-- Single dismiss button — quick, celebratory, back to garden -->
    <button
      on:click={() => dispatch('close')}
      class="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-150"
    >
      Keep going! 🚀
    </button>
  </div>
</div>
