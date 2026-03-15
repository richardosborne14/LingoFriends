<!--
  LingoFriends V2 — Daily Cap Modal
  
  Shown when the learner hits their daily new-lesson limit.
  
  TONE: Positive and celebratory, NOT restrictive or guilt-tripping.
  This is "you've done a great job today!" not "you can't do more."
  (See PEDAGOGY.md — Krashen's Affective Filter: anxiety blocks learning.)
  
  Shows:
  - A customised congratulations message
  - The full-day achievement badge (if user hit exactly the cap)
  - A "Review" button to keep learning without adding cognitive load
  - A "Come back tomorrow" CTA
  
  @component DailyCapModal
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  /** The congratulations message from getDailyCapMessage() */
  export let title: string;
  export let body: string;

  /** Whether the user completed the full daily allowance (3 new lessons). */
  export let completedFullDay = false;

  /** Whether review sessions are still available (not at review cap). */
  export let reviewAvailable = true;

  const dispatch = createEventDispatcher<{
    /** User wants to do a review session */
    review: void;
    /** User is done for today */
    close: void;
  }>();
</script>

<!-- 
  Backdrop: clicking it closes the modal (forgiving UX for kids).
  aria-modal + role="dialog" for screen reader accessibility.
-->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
  role="dialog"
  aria-modal="true"
  aria-labelledby="daily-cap-title"
>
  <div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center">
    
    <!-- Hero emoji -->
    <div class="text-6xl mb-4 animate-bounce">🌟</div>

    <!-- Title -->
    <h2 id="daily-cap-title" class="text-2xl font-bold text-gray-900 mb-3">
      {title}
    </h2>

    <!-- Body message -->
    <p class="text-gray-600 text-base leading-relaxed mb-5 whitespace-pre-line">
      {body}
    </p>

    <!-- Full-day achievement badge (only shown on exact cap completion) -->
    {#if completedFullDay}
      <div class="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
        <span class="text-3xl">🏅</span>
        <div class="text-left">
          <p class="text-sm font-semibold text-yellow-800">Full Day Achieved!</p>
          <p class="text-xs text-yellow-600">+10 bonus SunDrops earned ☀️</p>
        </div>
      </div>
    {/if}

    <!-- Review CTA — keep it available as a healthy continuation option -->
    {#if reviewAvailable}
      <button
        on:click={() => dispatch('review')}
        class="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-150 mb-3"
      >
        💧 Water my tree (Review)
      </button>
      <p class="text-xs text-gray-400 mb-3">
        Review past lessons — less taxing on your brain!
      </p>
    {/if}

    <!-- Done for today -->
    <button
      on:click={() => dispatch('close')}
      class="w-full border-2 border-gray-200 hover:border-gray-300 text-gray-600 font-medium py-3 px-6 rounded-2xl transition-all duration-150"
    >
      I'm done for today 😴
    </button>
  </div>
</div>
