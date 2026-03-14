# TASK-V2-03: Gamification Feedback — Sundrops, Gems & Reward Modals

**Status:** Not Started  
**Priority:** High — gamification is what keeps kids coming back  
**Estimated Time:** 8–10 hours  
**Dependencies:** TASK-V2-02 (lesson flow must be working)  
**Covers items:** #4 (sundrop earn/lose modals), #5 (sundrop counter during questions), #8 (first lesson completion modal)

---

## Problem

1. There are no modals showing when the user earns or loses sundrops during a lesson
2. The sundrop count isn't visible as users progress through questions
3. After completing their first lesson, there's no explanation of how sundrops grow trees and gems buy decorations

---

## Goals

1. Animated modal pops up when sundrops are earned (+) or lost (-)
2. Persistent sundrop counter visible during entire lesson
3. First lesson completion triggers a special onboarding modal explaining the garden economy
4. Satisfying visual and audio feedback for all reward events

---

## Reward Economy Recap

| Currency | Earned By | Spent On |
|----------|-----------|----------|
| **Sun Drops** ☀️ | Correct answers, streaks, lesson completion | Watering/growing trees, unlocking new tree seeds |
| **Gems** 💎 | Perfect lessons, daily streaks, NPC encounters, achievements | Decorations, flowers, furniture, avatar customization |

---

## Step-by-Step Implementation

### Step 1 — Sundrop Counter (Lesson HUD)

**Create `src/lib/components/lesson/LessonHUD.svelte`:**

A persistent bar at the top of the lesson screen showing:

```
┌──────────────────────────────────────────────┐
│  ☀️ 45              ❤️ ❤️ ❤️          3/8   │
│  Sun Drops          Lives           Progress  │
└──────────────────────────────────────────────┘
```

- **Sun Drops**: Current balance (animates up/down on change)
- **Lives/Hearts**: How many mistakes left (3 hearts, lose one per wrong answer, dramatic crack animation)
- **Progress**: Current question / total questions (or a progress bar)

The sundrop number should do a "counting up" animation when earned and a "shake + red flash" when lost.

```svelte
<script>
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  
  export let sundrops: number;
  export let hearts: number;
  export let currentStep: number;
  export let totalSteps: number;
  
  const displaySundrops = tweened(sundrops, {
    duration: 600,
    easing: cubicOut,
  });
  
  $: displaySundrops.set(sundrops);
  
  let shaking = false;
  let earning = false;
  
  export function animateEarn(amount: number) {
    earning = true;
    setTimeout(() => earning = false, 800);
  }
  
  export function animateLoss(amount: number) {
    shaking = true;
    setTimeout(() => shaking = false, 500);
  }
</script>

<div class="lesson-hud">
  <div class="sundrops" class:shake={shaking} class:glow={earning}>
    ☀️ {Math.round($displaySundrops)}
  </div>
  <div class="hearts">
    {#each Array(3) as _, i}
      <span class:cracked={i >= hearts}>❤️</span>
    {/each}
  </div>
  <div class="progress">
    {currentStep}/{totalSteps}
  </div>
</div>
```

### Step 2 — Reward Modal (Earning Sundrops)

**Create `src/lib/components/modals/RewardModal.svelte`:**

Pops up briefly when sundrops are earned. Should feel celebratory but not interrupt flow.

**Trigger conditions:**
- Correct answer on first try: +5 ☀️
- Correct answer on second try: +2 ☀️
- Streak bonus (3 in a row): +3 ☀️ bonus
- Streak bonus (5 in a row): +5 ☀️ bonus + "🔥 On Fire!"
- Lesson completion: +15 ☀️
- Perfect lesson (no mistakes): +25 ☀️ + 💎 gem bonus

**Design:**

```
    ┌─────────────────────────┐
    │                         │
    │     ☀️ +5              │  ← Large, golden, pulsing
    │                         │
    │    "Nice one!"          │  ← Randomized encouragement
    │                         │
    └─────────────────────────┘
         ↓ auto-dismiss 1.2s
```

For streaks, the modal is bigger with fire effects:

```
    ┌─────────────────────────────┐
    │                             │
    │     🔥🔥🔥                │
    │     ☀️ +8                  │
    │     "5 in a row! ON FIRE!" │
    │                             │
    └─────────────────────────────┘
```

**Encouragement messages (randomized, translated via i18n):**
- "Nice one!", "You got it!", "Amazing!", "Keep it up!", "Brilliant!", "Superstar!", "Nailed it!"

**Implementation notes:**
- Auto-dismiss after 1.2s (no tap required, but tap dismisses early)
- Animate in from center with scale + fade
- Gold particle effect behind the sundrop icon
- Play a reward chime sound effect

### Step 3 — Penalty Modal (Losing Sundrops)

**Design:**

```
    ┌─────────────────────────┐
    │                         │
    │     ☀️ -3              │  ← Red tinted, shake animation
    │                         │
    │    "Not quite..."       │  ← Gentle, never mean
    │    "Let's try again!"   │
    │                         │
    └─────────────────────────┘
         ↓ auto-dismiss 1.5s
```

**Penalty amounts:**
- Wrong answer: -3 ☀️
- Skip question: -1 ☀️
- Run out of hearts: lesson pauses, "Take a breather!" (no additional penalty)

**Critical design principle:** The penalty should feel dramatic (the tree shakes! Oh no!) but NEVER punishing. The child should feel "oh no, I need to be more careful" not "I'm bad at this." Always follow with encouragement: "Not quite — but you're learning!"

**Encouragement after wrong answers:**
- "Not quite, but you're getting closer!"
- "Almost! Let's try that again"
- "Tricky one! Don't worry, practice makes perfect"
- "Oops! But that's how we learn"

### Step 4 — Heart/Life System

When the user gets an answer wrong:
1. One heart cracks with an animation
2. Penalty modal shows briefly
3. The question can be retried (the same question reappears)

When all 3 hearts are gone:
1. **Don't end the lesson** — this is different from Duolingo, we're gentler
2. Show a "Take a Breather" modal:
   ```
   ┌───────────────────────────────────┐
   │                                   │
   │         😮‍💨                      │
   │   "That was a tough section!"     │
   │                                   │
   │   Hearts regenerate, so take a    │
   │   deep breath and try again!      │
   │                                   │
   │        [Try Again 💪]             │
   │                                   │
   └───────────────────────────────────┘
   ```
3. Hearts reset to 3
4. The user continues from where they were (not from the beginning)

### Step 5 — First Lesson Completion Modal

**Create `src/lib/components/modals/FirstLessonCompleteModal.svelte`:**

This only shows once — after the very first lesson is completed. It's a multi-page modal (swipeable cards) that explains the garden economy.

**Page 1: "Congratulations!"**
```
┌─────────────────────────────────────────┐
│                                         │
│         🎉 Congratulations! 🎉         │
│                                         │
│    You completed your first lesson!     │
│                                         │
│         ☀️ +25 Sun Drops earned         │
│                                         │
│              [Continue →]               │
│                                         │
└─────────────────────────────────────────┘
```

**Page 2: "Your Garden"**
```
┌─────────────────────────────────────────┐
│                                         │
│    🌱 → 🌿 → 🌳 → 🌸                 │
│                                         │
│    Your tree grows as you learn!        │
│    Use Sun Drops to water your tree     │
│    and watch it grow from a seed        │
│    into a beautiful flowering tree.     │
│                                         │
│    But be careful — if you don't        │
│    practice, your tree might get        │
│    thirsty! 💧                         │
│                                         │
│              [Continue →]               │
│                                         │
└─────────────────────────────────────────┘
```

**Page 3: "The Garden Shop"**
```
┌─────────────────────────────────────────┐
│                                         │
│    💎 Gems unlock cool stuff!           │
│                                         │
│    Earn gems by getting perfect         │
│    scores and keeping streaks going.    │
│                                         │
│    Visit the Garden Shop to buy:        │
│    🌹 Flowers  🪑 Furniture            │
│    🌲 New trees  ✨ Decorations         │
│                                         │
│    Make your garden uniquely yours!     │
│                                         │
│         [Go to My Garden 🌳]           │
│                                         │
└─────────────────────────────────────────┘
```

After dismissing, navigate to the garden view so the user sees their tree for the first time.

### Step 6 — Sound Effects

Add sound effects for reward events. Use short, royalty-free audio clips:

| Event | Sound |
|-------|-------|
| Correct answer | Bright "ding" chime |
| Wrong answer | Soft "bonk" (not harsh) |
| Streak (3) | Rising chime sequence |
| Streak (5) | Triumphant fanfare |
| Sundrop earned | Coin-like "clink" |
| Sundrop lost | Gentle "whoosh down" |
| Lesson complete | Victory fanfare (3 seconds) |
| Heart lost | Glass crack |
| Heart restored | Sparkle |

Store as small MP3/OGG files in `static/sounds/`. Pre-load on lesson start. Respect a "mute" toggle in settings.

---

## Testing Checklist

- [ ] Sundrop counter visible throughout lesson
- [ ] Counter animates up smoothly on earn
- [ ] Counter shakes on loss
- [ ] Reward modal appears on correct answer
- [ ] Reward modal auto-dismisses after 1.2s
- [ ] Streak bonuses trigger at 3 and 5 correct
- [ ] Penalty modal appears on wrong answer
- [ ] Penalty modal tone is encouraging, never mean
- [ ] Hearts crack on wrong answer
- [ ] All hearts gone → "Take a Breather" modal → hearts reset → continue
- [ ] First lesson completion → special 3-page modal
- [ ] First lesson modal only shows once (flag in profile)
- [ ] After first lesson modal → navigates to garden
- [ ] Sound effects play for all events
- [ ] Mute toggle works
- [ ] All text is translated (en/fr)

---

## Files Created/Modified

**New files:**
- `src/lib/components/lesson/LessonHUD.svelte`
- `src/lib/components/modals/RewardModal.svelte`
- `src/lib/components/modals/PenaltyModal.svelte`
- `src/lib/components/modals/BreatherModal.svelte`
- `src/lib/components/modals/FirstLessonCompleteModal.svelte`
- `static/sounds/` — sound effect files

**Modified files:**
- Lesson activity handler → trigger reward/penalty events
- Scoring service → calculate sundrop amounts, streak tracking
- User profile/store → track first_lesson_complete flag
- Lesson completion handler → trigger first lesson modal
