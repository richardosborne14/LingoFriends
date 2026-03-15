<!--
  LingoFriends V2 — Settings Page
  
  Allows learners to update:
  - Language level (4 options matching DB/AI values)
  - Daily lesson goal (1-3 lessons/day)
  - Avatar colours and accessories
  
  Uses SvelteKit form actions for server-side validation.
  Uses $page.form for inline feedback (no full page reload needed).
  
  DESIGN: Clean, scannable layout. Big tap targets for kids.
  Section-by-section saving rather than one global Save button.
  
  @page /settings
-->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  // ── LEVEL OPTIONS ──────────────────────────────────────────────────────────
  const LEVEL_OPTIONS = [
    { value: 'total_beginner',          label: 'Total Beginner',         emoji: '🌱', desc: 'I barely know any words' },
    { value: 'know_some_words',         label: 'Know Some Words',        emoji: '🌿', desc: 'I can say hello and count' },
    { value: 'simple_sentences',        label: 'Simple Sentences',       emoji: '🌳', desc: 'I can introduce myself' },
    { value: 'can_have_conversations',  label: 'Can Have Conversations', emoji: '🌸', desc: 'I can chat about daily things' },
  ] as const;

  // ── DAILY GOAL OPTIONS ─────────────────────────────────────────────────────
  const GOAL_OPTIONS = [
    { value: 1, label: 'Casual',  emoji: '😌', desc: '1 lesson per day' },
    { value: 2, label: 'Regular', emoji: '💪', desc: '2 lessons per day' },
    { value: 3, label: 'Intense', emoji: '🔥', desc: '3 lessons per day (max)' },
  ];

  // ── HAT OPTIONS ────────────────────────────────────────────────────────────
  const HAT_OPTIONS = [
    { value: 'none',   label: 'No Hat',  emoji: '😊' },
    { value: 'beanie', label: 'Beanie',  emoji: '🧢' },
    { value: 'cap',    label: 'Cap',     emoji: '🧢' },
    { value: 'bow',    label: 'Bow',     emoji: '🎀' },
    { value: 'crown',  label: 'Crown',   emoji: '👑' },
  ];

  // ── LOCAL STATE ────────────────────────────────────────────────────────────
  /** Currently selected level (bound to form) */
  let selectedLevel = data.profile.level ?? 'total_beginner';
  let selectedGoal = data.profile.dailyGoal ?? 3;
  let selectedSkinTone = data.profile.avatarSkinTone ?? '#F5D0A9';
  let selectedHairColor = data.profile.avatarHairColor ?? '#4A3728';
  let selectedShirtColor = data.profile.avatarShirtColor ?? '#FF8A6A';
  let selectedHat = data.profile.avatarHat ?? 'none';
  let selectedGender = data.profile.avatarGender ?? 'neutral';

  /** Loading state for each form section */
  let savingPrefs = false;
  let savingAvatar = false;
</script>

<svelte:head>
  <title>Settings — LingoFriends</title>
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-green-50 to-yellow-50 pb-24">
  
  <!-- Header -->
  <div class="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
    <a href="/garden" class="text-2xl hover:scale-110 transition-transform" aria-label="Back to garden">←</a>
    <h1 class="text-xl font-bold text-gray-900">⚙️ Settings</h1>
  </div>

  <div class="max-w-md mx-auto px-4 py-6 space-y-6">

    <!-- ── LEARNING PREFERENCES ──────────────────────────────────────────── -->
    <section class="bg-white rounded-3xl shadow-sm p-5">
      <h2 class="text-base font-bold text-gray-800 mb-1">📚 Learning Preferences</h2>
      <p class="text-sm text-gray-500 mb-4">Adjust these if the lessons feel too easy or too hard.</p>

      <form
        method="POST"
        action="?/updatePreferences"
        use:enhance={() => {
          savingPrefs = true;
          return async ({ update }) => {
            await update();
            savingPrefs = false;
          };
        }}
      >
        <!-- Level picker -->
        <p class="text-sm font-semibold text-gray-700 mb-2">My level</p>
        <div class="grid grid-cols-2 gap-2 mb-5">
          {#each LEVEL_OPTIONS as opt}
            <label
              class="flex items-start gap-2 p-3 rounded-2xl border-2 cursor-pointer transition-colors
                {selectedLevel === opt.value
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-100 hover:border-gray-300'}"
            >
              <input
                type="radio"
                name="level"
                value={opt.value}
                bind:group={selectedLevel}
                class="sr-only"
              />
              <span class="text-xl">{opt.emoji}</span>
              <div>
                <p class="text-xs font-semibold text-gray-800">{opt.label}</p>
                <p class="text-xs text-gray-500">{opt.desc}</p>
              </div>
            </label>
          {/each}
        </div>

        <!-- Daily goal picker -->
        <p class="text-sm font-semibold text-gray-700 mb-2">Daily goal</p>
        <div class="flex gap-2 mb-5">
          {#each GOAL_OPTIONS as goal}
            <label
              class="flex-1 flex flex-col items-center p-3 rounded-2xl border-2 cursor-pointer transition-colors
                {selectedGoal === goal.value
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-100 hover:border-gray-300'}"
            >
              <input
                type="radio"
                name="dailyGoal"
                value={String(goal.value)}
                bind:group={selectedGoal}
                class="sr-only"
              />
              <span class="text-2xl mb-1">{goal.emoji}</span>
              <p class="text-xs font-bold text-gray-800">{goal.label}</p>
              <p class="text-xs text-gray-500">{goal.desc}</p>
            </label>
          {/each}
        </div>

        <!-- Streak freeze info -->
        <div class="bg-blue-50 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
          <span class="text-2xl">🧊</span>
          <div>
            <p class="text-sm font-semibold text-blue-800">
              {data.profile.streakFreezesRemaining ?? 2} streak freezes remaining this week
            </p>
            <p class="text-xs text-blue-600">
              Auto-activates if you miss a day. Resets every Monday.
            </p>
          </div>
        </div>

        <!-- Success / error feedback -->
        {#if form?.success && !savingAvatar}
          <p class="text-sm text-green-600 text-center mb-3">✅ {form.message}</p>
        {/if}
        {#if form?.error && !savingAvatar}
          <p class="text-sm text-red-500 text-center mb-3">⚠️ {form.error}</p>
        {/if}

        <button
          type="submit"
          disabled={savingPrefs}
          class="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-all"
        >
          {savingPrefs ? 'Saving…' : 'Save Preferences'}
        </button>
      </form>
    </section>

    <!-- ── AVATAR CUSTOMISATION ──────────────────────────────────────────── -->
    <section class="bg-white rounded-3xl shadow-sm p-5">
      <h2 class="text-base font-bold text-gray-800 mb-1">🧍 Avatar</h2>
      <p class="text-sm text-gray-500 mb-4">Change how your character looks in lessons.</p>

      <form
        method="POST"
        action="?/updateAvatar"
        use:enhance={() => {
          savingAvatar = true;
          return async ({ update }) => {
            await update();
            savingAvatar = false;
          };
        }}
      >
        <!-- Skin tone -->
        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-700 mb-1" for="skinTone">
            Skin tone
          </label>
          <input
            id="skinTone"
            type="color"
            name="avatarSkinTone"
            bind:value={selectedSkinTone}
            class="w-full h-10 rounded-xl border border-gray-200 cursor-pointer"
          />
        </div>

        <!-- Hair colour -->
        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-700 mb-1" for="hairColor">
            Hair colour
          </label>
          <input
            id="hairColor"
            type="color"
            name="avatarHairColor"
            bind:value={selectedHairColor}
            class="w-full h-10 rounded-xl border border-gray-200 cursor-pointer"
          />
        </div>

        <!-- Shirt colour -->
        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-700 mb-1" for="shirtColor">
            Shirt colour
          </label>
          <input
            id="shirtColor"
            type="color"
            name="avatarShirtColor"
            bind:value={selectedShirtColor}
            class="w-full h-10 rounded-xl border border-gray-200 cursor-pointer"
          />
        </div>

        <!-- Hat -->
        <div class="mb-5">
          <p class="text-sm font-semibold text-gray-700 mb-2">Hat</p>
          <div class="flex gap-2 flex-wrap">
            {#each HAT_OPTIONS as hat}
              <label
                class="flex flex-col items-center gap-1 p-2 rounded-xl border-2 cursor-pointer
                  {selectedHat === hat.value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-100 hover:border-gray-200'}"
              >
                <input
                  type="radio"
                  name="avatarHat"
                  value={hat.value}
                  bind:group={selectedHat}
                  class="sr-only"
                />
                <span class="text-xl">{hat.emoji}</span>
                <span class="text-xs text-gray-600">{hat.label}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Avatar success feedback -->
        {#if form?.success && !savingPrefs}
          <p class="text-sm text-green-600 text-center mb-3">✅ {form.message}</p>
        {/if}

        <button
          type="submit"
          disabled={savingAvatar}
          class="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-all"
        >
          {savingAvatar ? 'Saving…' : 'Save Avatar'}
        </button>
      </form>
    </section>

    <!-- ── ACCOUNT INFO ──────────────────────────────────────────────────── -->
    <section class="bg-white rounded-3xl shadow-sm p-5">
      <h2 class="text-base font-bold text-gray-800 mb-3">👤 Account</h2>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between text-gray-600">
          <span>Username</span>
          <span class="font-medium text-gray-900">{data.user.username}</span>
        </div>
        <div class="flex justify-between text-gray-600">
          <span>Learning</span>
          <span class="font-medium text-gray-900">{data.profile.targetLanguage.toUpperCase()}</span>
        </div>
        <div class="flex justify-between text-gray-600">
          <span>Native language</span>
          <span class="font-medium text-gray-900">{data.profile.nativeLanguage.toUpperCase()}</span>
        </div>
      </div>

      <!-- Danger zone -->
      <div class="mt-4 pt-4 border-t border-gray-100">
        <form method="POST" action="/api/logout">
          <button
            type="submit"
            class="w-full text-red-500 text-sm font-medium py-2 hover:text-red-700 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </section>

  </div>
</main>
