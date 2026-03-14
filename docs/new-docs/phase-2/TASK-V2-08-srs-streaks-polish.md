# TASK-V2-08: Missing V1 Features — SRS, Streaks, Daily Caps & Polish

**Status:** Not Started  
**Priority:** Medium-High — these are the systems that drive retention and healthy habits  
**Estimated Time:** 10–14 hours  
**Dependencies:** TASK-V2-03 (gamification), TASK-V2-06 (garden/tree system)  
**Covers:** Features from v1 that weren't in the original 18-item list but are essential for feature parity

---

## What's Missing?

After reviewing v1 against the 18 items you listed, here are features that were present in v1 or essential for the core loop that haven't been covered:

1. **Spaced repetition (SRS) tied to tree health** — trees decay if you don't review
2. **Daily streak system** — consecutive day tracking with rewards
3. **Daily learning cap** — prevents overuse, promotes healthy engagement
4. **Celebration animations** — confetti, particle bursts on achievements
5. **Settings page** — audio, language, account, data management
6. **Profile/stats page** — learning history, streak, total sundrops earned
7. **Lesson review mode** — replay past lessons to refresh chunks (waters trees)

---

## Part A: Spaced Repetition ↔ Tree Health

### How It Works

Each chunk the user learns has a "next review date" based on SRS intervals. The tree's health is a function of how many of its chunks are overdue for review.

```typescript
// SRS intervals (Leitner-style, in days)
const SRS_INTERVALS = [1, 3, 7, 14, 30, 90]; // Box 1-6

interface ChunkSRS {
  chunk_id: string;
  tree_id: string;
  user_id: string;
  box: number;           // 1-6 (Leitner box)
  next_review: Date;
  last_reviewed: Date;
  times_correct: number;
  times_incorrect: number;
}
```

**On correct answer:** chunk moves up a box (longer interval before next review)  
**On incorrect answer:** chunk drops back to box 1 (review again tomorrow)

**Tree health calculation:**

```typescript
function calculateTreeHealth(chunks: ChunkSRS[]): number {
  if (chunks.length === 0) return 100;
  
  const now = new Date();
  let healthyCount = 0;
  
  for (const chunk of chunks) {
    const overdueDays = (now.getTime() - chunk.next_review.getTime()) / (1000 * 60 * 60 * 24);
    
    if (overdueDays <= 0) {
      healthyCount += 1; // Not yet due
    } else if (overdueDays <= 2) {
      healthyCount += 0.7; // Slightly overdue, still mostly healthy
    } else if (overdueDays <= 7) {
      healthyCount += 0.3; // Getting concerning
    }
    // Overdue > 7 days = 0 health contribution
  }
  
  return Math.round((healthyCount / chunks.length) * 100);
}
```

**Tree health → visual appearance** (already partly covered in TASK-V2-06):
- 80-100%: Vibrant, sparkles
- 50-79%: Normal green
- 25-49%: Yellowing, wilting animation
- 0-24%: Brown, leaves falling (never fully dies)

**"Water Your Tree" action:**
When user taps "Water This Tree" on the tree info panel, it starts a review session — a mini-lesson composed of overdue chunks. Completing the review restores health.

### Review Lesson Generation

```typescript
async function generateReviewLesson(treeId: string, userId: string) {
  // Get chunks due for review (sorted by most overdue first)
  const overdueChunks = await getOverdueChunks(treeId, userId);
  
  // Take top 5-8 chunks for a review session
  const reviewChunks = overdueChunks.slice(0, Math.min(8, overdueChunks.length));
  
  // Generate activities using the activity sequencer
  // Review sessions are shorter and more varied (quick-fire)
  return buildReviewLesson(reviewChunks);
}
```

---

## Part B: Daily Streak System

### How It Works

Track consecutive days the user completes at least one lesson.

```
streak_data {
  user_id: relation → users
  current_streak: number
  longest_streak: number
  last_activity_date: date
  streak_freezes_remaining: number (allow 1-2 "freeze" days per week)
}
```

### Streak UI

Show the streak prominently — in the garden HUD and on the profile page.

```
🔥 7-day streak!

Mo Tu We Th Fr Sa Su
✅ ✅ ✅ ✅ ✅ ✅ ✅
```

### Streak Rewards

| Streak Length | Reward |
|--------------|--------|
| 3 days | +5 💎 gems |
| 7 days | +10 💎 gems + "Week Warrior" badge |
| 14 days | +20 💎 gems |
| 30 days | +50 💎 gems + exclusive decoration unlock |
| 100 days | +100 💎 gems + "Century Learner" badge |

### Streak Freeze

Users get 2 "streak freezes" per week that automatically activate if they miss a day. This prevents the devastating "I broke my streak, why bother anymore" feeling.

Show freeze status in the streak widget:
```
🔥 12-day streak   ❄️❄️ 2 freezes left this week
```

---

## Part C: Daily Learning Cap

### Why This Matters

LingoFriends is designed for healthy engagement. Kids (and adults) shouldn't grind endlessly. Spaced repetition works best with daily limits.

### Implementation

```typescript
const DAILY_CAPS = {
  new_lessons: 3,        // Max new lessons per day
  review_sessions: 5,     // Max review sessions per day
  total_activities: 50,   // Max total activities (across all lessons)
};
```

### What Happens at the Cap

When the user hits a daily cap:

```
┌─────────────────────────────────────────┐
│                                         │
│    🌟 Amazing job today!                │
│                                         │
│    You've completed 3 lessons today.    │
│    That's the perfect amount!           │
│                                         │
│    Your brain needs time to absorb      │
│    everything you've learned.           │
│    Come back tomorrow for more! 🌅      │
│                                         │
│    ☀️ +10 bonus sundrops for a         │
│    full day of learning!                │
│                                         │
│       [Go to Garden 🌳]                │
│                                         │
└─────────────────────────────────────────┘
```

**After hitting the cap**, the user can still:
- Walk around their garden
- Buy shop items
- Customize their avatar
- Look at their stats
- BUT lesson buttons are grayed out until tomorrow

This is a core value of LingoFriends vs. Duolingo — we don't exploit engagement for ad revenue.

---

## Part D: Celebration Animations

### Confetti System

**Create `src/lib/components/effects/Confetti.svelte`:**

A reusable confetti burst that can be triggered anywhere. Uses CSS animations or canvas particles.

```typescript
interface ConfettiOptions {
  particleCount: number;  // 30-100
  spread: number;         // angle spread in degrees
  origin: { x: number; y: number }; // screen position (0-1 range)
  colors: string[];       // hex colors
  duration: number;       // ms
}
```

**Trigger confetti on:**
- Lesson completion
- Perfect lesson (extra confetti!)
- Streak milestone
- Level up
- First purchase from shop
- Achievement unlocked

### Screen Flash

Subtle screen-edge glow for smaller celebrations:
- Green flash: correct answer
- Gold flash: streak continuation
- Red flash: wrong answer (very subtle, not alarming)

### Star Rating

After each lesson, show a 1-3 star rating based on performance:

```
       ⭐⭐⭐
   "Perfect Lesson!"
   
   ☀️ +25 earned
   💎 +3 bonus
```

Stars fill up with an animation (each star spins in and grows).

---

## Part E: Settings Page

**Create `src/lib/components/settings/SettingsPage.svelte`:**

```
┌─────────────────────────────────────────┐
│  ⚙️ Settings                           │
├─────────────────────────────────────────┤
│                                         │
│  📱 App                                │
│  ├── Language: [English ▼]             │
│  ├── Sound effects: [ON / OFF]         │
│  ├── Music: [ON / OFF]                 │
│  └── Notifications: [ON / OFF]         │
│                                         │
│  👤 My Profile                         │
│  ├── Display name: [Edit]              │
│  ├── Avatar: [Customize]               │
│  ├── Interests: [Edit]                 │
│  └── Level: [Change]                   │
│                                         │
│  📊 Learning                           │
│  ├── Target language: [German ▼]       │
│  ├── Daily goal: [3 lessons ▼]         │
│  └── Difficulty: [Auto / Manual]       │
│                                         │
│  🔒 Account                            │
│  ├── Change password                   │
│  ├── Export my data                    │
│  └── Delete account                    │
│                                         │
│  ℹ️ About LingoFriends               │
│  ├── Version 2.0                       │
│  ├── Privacy Policy                    │
│  └── Contact us                        │
│                                         │
└─────────────────────────────────────────┘
```

### Privacy & Data

Since this is a kids' app:
- "Export my data" downloads a JSON of all user data
- "Delete account" requires typing "DELETE" to confirm, removes all data
- Privacy policy should be simple and GDPR/COPPA compliant
- No tracking, no analytics beyond basic lesson performance

---

## Part F: Profile & Stats Page

**Create `src/lib/components/profile/ProfilePage.svelte`:**

```
┌─────────────────────────────────────────┐
│                                         │
│         [Avatar - 3D rotating]          │
│          ⭐ Level 4 Learner             │
│                                         │
│  🔥 12-day streak   ❄️❄️ 2 freezes    │
│                                         │
│  ┌──────────┬──────────┬──────────┐    │
│  │ ☀️ 342  │ 💎 47    │ 🎓 23   │    │
│  │ Sundrops │ Gems     │ Lessons  │    │
│  └──────────┴──────────┴──────────┘    │
│                                         │
│  📊 This Week                           │
│  Mo ████████ 3 lessons                  │
│  Tu ████ 1 lesson                       │
│  We ██████ 2 lessons                    │
│  Th ████████████ 4 lessons              │
│  Fr (today) ...                         │
│                                         │
│  🏆 Achievements                        │
│  [Week Warrior] [First Tree] [Streak 7] │
│                                         │
└─────────────────────────────────────────┘
```

---

## Testing Checklist

### SRS & Tree Health
- [ ] Chunks get assigned SRS boxes after learning
- [ ] Next review dates calculated correctly
- [ ] Tree health decreases as chunks become overdue
- [ ] Tree visual changes based on health
- [ ] "Water Tree" starts a review session with overdue chunks
- [ ] Correct review answers advance SRS box
- [ ] Wrong review answers reset to box 1
- [ ] Tree health restores after review

### Streaks
- [ ] Streak increments on daily lesson completion
- [ ] Streak resets after missing a day (without freeze)
- [ ] Streak freeze auto-activates on missed day
- [ ] Streak milestones trigger rewards
- [ ] Streak visible in garden HUD and profile

### Daily Caps
- [ ] Lessons disabled after hitting daily cap
- [ ] Friendly message explains the cap
- [ ] Cap resets at midnight local time
- [ ] Garden, shop, avatar still accessible after cap

### Celebrations
- [ ] Confetti fires on lesson completion
- [ ] Extra confetti on perfect lesson
- [ ] Star rating displays with animation
- [ ] Screen flash effects work

### Settings & Profile
- [ ] All settings functional and persistent
- [ ] Settings changes take immediate effect
- [ ] Profile page shows correct stats
- [ ] Weekly activity chart renders
- [ ] Delete account works with confirmation

---

## Files Created/Modified

**New files:**
- `src/lib/services/srsEngine.ts`
- `src/lib/services/streakService.ts`
- `src/lib/services/dailyCapService.ts`
- `src/lib/components/effects/Confetti.svelte`
- `src/lib/components/effects/ScreenFlash.svelte`
- `src/lib/components/effects/StarRating.svelte`
- `src/lib/components/settings/SettingsPage.svelte`
- `src/lib/components/profile/ProfilePage.svelte`
- `src/lib/components/lesson/DailyCapModal.svelte`

**Modified files:**
- Garden tree renderer → health-based visuals
- Tree info panel → review session launcher
- Lesson completion handler → SRS updates, streak check, daily cap check
- Garden HUD → streak display
- DB schema → `chunk_srs`, `streak_data` tables
