# LingoFriends Game Design Document

**Version:** 1.0
**Date:** 2026-02-15
**Status:** Approved — ready for implementation

---

## 1. Core Concept

LingoFriends is a **garden-growing language learning game**. The child grows a forest of knowledge trees — each tree represents a completed skill path. The garden is alive: trees bloom when knowledge is fresh and wilt when it's time to review. Friends can gift water and decorations to each other's gardens.

**One-line pitch:** "Grow a magical garden by learning languages — and help your friends' gardens bloom too."

### Navigation Hierarchy

| Level | Name | Analogy | Description |
|-------|------|---------|-------------|
| **Home** | Garden | Main menu / world map | Explorable 2D world. Avatar walks around. Trees represent completed/in-progress skill paths. |
| **Sub-menu** | Path | Level select | Winding trail of lesson nodes. Opens when tapping a tree/seed in the garden. |
| **Gameplay** | Lesson | Game level | Chat with AI tutor + concrete activities. 5-8 exercises per lesson. |

**Key insight:** The garden IS the home page. There is no separate "dashboard" or "menu." Everything starts and ends in the garden.

---

## 2. First-Time Experience

### Empty Garden Flow
1. Child creates account → lands in an **empty garden** (grass, paths, empty plots, decorations)
2. **Professor Finch** (🐦 tutor character) greets them: "Welcome to your garden! Let's plant your first seed."
3. Child picks an avatar (animal buddy — fox, cat, panda, owl, bunny, bear, penguin, frog)
4. Child chooses their first **seed** from 3-4 available skill paths (e.g., "Sports Talk," "Food & Cooking," "Animal World")
5. Seed gets planted in the first garden plot → tutorial lesson begins immediately
6. After completing the first lesson, the seed has visibly sprouted → child understands the core loop

### Earning New Seeds
Seeds (new skill paths) are NOT unlimited. Children earn new seeds through:
- **Completing a full skill path** → earns 1 new seed as reward
- **Maintaining garden health** → if all trees stay above 60% health for 7 days, earn a bonus seed
- **Friend milestones** → adding your 3rd friend, sending 5 gifts, etc.
- **Streak rewards** → every 7-day streak earns a seed

This creates a natural pacing system: kids can't start 10 paths at once and abandon them all.

---

## 3. Currency: Sun Drops ☀️

### Why Not "XP"?
XP is abstract. Children relate to concrete things. "Sun Drops" are tangible — the tree eats them to grow. The child can *see* the cause and effect.

### Sun Drop Icon
Custom SVG droplet shape with golden gradient (not the ☀️ emoji). Has variants:
- **Standard:** Golden drop with shine highlight
- **Broken:** Red-tinted drop with crack line (shown on penalty)
- **Glowing:** Golden drop with outer glow (shown in reward burst)

### Sun Drop Economy

| Action | Sun Drops |
|--------|-----------|
| Activity correct (first try) | Full value (2-4 per activity) |
| Activity correct (retry/helped) | Half value, rounded up |
| Wrong answer penalty | -1 (with dramatic visual feedback) |
| Lesson completion bonus | +5 flat bonus |
| Daily streak bonus | +3 per day of streak |
| Friend gift received | +2 (deposited to tree, not player) |

### Total per lesson
A typical lesson has 6 activities worth 2-4 Sun Drops each = **~18 Sun Drops maximum**. A struggling child might earn 8-10. Both are valid — the tree still grows, just at different rates.

### Daily Cap
Sun Drop earning is capped at **50 per day** to prevent burnout. Messaging when cap hit: "Your garden has had enough sunshine today! Come back tomorrow ☀️"

---

## 4. Reward Architecture: Three Loops

### Micro Loop (per activity — 10 seconds)
- **Trigger:** Complete an exercise
- **Reward if correct:** Sun Drop burst animation + tree visibly grows a tiny amount
- **Reward if wrong:** Penalty burst (red flash, broken drop icon, tree shakes, leaf falls) + retry opportunity
- **Feel:** Immediate dopamine hit or danger tension

### Meso Loop (per lesson — 5-10 minutes)
- **Trigger:** Complete all activities in a lesson
- **Reward:** Tree reaches a growth milestone (new branch, first bud, flower opens)
- **Bonus:** Unlock a **gift item** to send to a friend (water drop, seed, sparkle, decoration)
- **Rating:** 1-3 stars based on Sun Drops collected vs. maximum
  - ⭐ = less than 60% of max
  - ⭐⭐ = 60-89%
  - ⭐⭐⭐ = 90%+
- **Replay incentive:** "Replay to earn more Sun Drops and grow your tree further!"

### Macro Loop (per skill path — days/weeks)
- **Trigger:** Complete all lessons in a skill path (typically 4-6 lessons)
- **Reward:** Tree reaches **full bloom** → permanently added to garden as a trophy tree
- **Bonus:** Earn a rare decoration + a new seed for the next path
- **Long-term:** Garden fills up over months, becoming a visual record of everything learned

---

## 5. Wrong Answer Mechanics

**Design principle:** Wrong answers should feel dangerous but never punishing. The child should want to avoid them, but never fear trying.

### Penalty Flow
1. Child submits wrong answer
2. **Immediate:** Red screen flash (0.15 opacity, 0.6s)
3. **Penalty burst modal:** Broken Sun Drop icon + "−1 Sun Drop" text + falling 💔 shards
4. **Tree reaction:** Shakes left/right + drops a brown leaf (🍂)
5. **Sun Drop counter:** Animates the number decreasing, counter briefly turns red
6. **Floor:** Sun Drops for this lesson can't go below 0 (never negative overall balance)

### Retry Rules
- After a wrong answer, the child can **retry the same question**
- Getting it right on retry earns **half** the original Sun Drops (rounded up)
- The child can also tap **"Ask for help"** before or after a wrong answer
- Using help = same as retry (half reward), but **no additional penalty**
- Multiple wrong answers keep costing -1 each, but the floor is 0 earned for that activity
- **Wrong answers NEVER affect macro progress** — completing the lesson (regardless of score) always counts toward the skill path

### AI Tutor Support on Wrong Answers
When a child gets an answer wrong, the AI tutor should:
- Never say "Wrong!" — instead say "Not quite!" or "Close!"
- Provide a targeted hint specific to the mistake
- For fill-blank/translate: show the correct answer with explanation
- For multiple-choice: explain why the correct answer is right (not why the wrong one is wrong)

---

## 6. Spaced Repetition (Tree Decay)

### The Problem
Without review, language knowledge fades. Duolingo uses strength bars. We use **tree health**.

### Health Decay Formula
Each completed tree has a `lastRefreshDate`. Health decays as days increase:

```
Days since refresh | Base health | With 1 gift | With 2 gifts
0-2                | 100%        | 100%        | 100%
3-5                | 85%         | 100%        | 100%
6-10               | 60%         | 85%         | 100%
11-14              | 35%         | 60%         | 85%
15-21              | 15%         | 35%         | 60%
22+                | 5%          | 15%         | 35%
```

Each friend gift adds ~10 days of buffer before decay kicks in. Gifts slow but don't stop decay — the child must eventually do a refresher lesson.

### Visual Feedback
- **100%:** Full bloom, pink blossoms, occasional falling petals
- **85%:** Healthy, full leaves, slight color shift
- **60%:** Some leaves turning yellow, fewer blossoms
- **35%:** Mostly bare branches, brown leaves, amber warning badge
- **15%:** Nearly dead, grey-brown, pulsing "needs water" indicator
- **5%:** Bare stump with wilted leaves, urgent red indicator

### Refresher Lessons
- Shorter than original lessons (3-4 activities vs. 6-8)
- Focus on vocabulary from that skill path using spaced repetition algorithm
- Completing a refresher resets `lastRefreshDate` to today
- Refresher Sun Drops still contribute to daily total and tree growth

### Garden Health Indicators
Floating above each tree in the garden world:
- **Green badge (80%+):** "✓ Healthy" — no action needed
- **Amber badge (40-79%):** "💧 Thirsty" — gentle nudge
- **Red badge (<40%):** "🆘 Dying!" — urgent, bouncing animation

---

## 7. Garden World (Home Page)

### Visual Design
The garden is a top-down 2D explorable world rendered with **PixiJS** (see §11 Framework).

**Elements:**
- **Grass terrain** with subtle variation (light/dark patches, flowers)
- **Dirt paths** connecting tree plots
- **Tree plots:** Fixed positions where trees grow (circular cleared areas)
- **Empty plots:** Visible but greyed out, show "🌱 Plant" when approached
- **Decorative elements:** Flowers, rocks, mushrooms, butterflies, pond, bench, fence
- **Player decorations:** Purchased/earned items the child places: hedges, bushes, lanterns, bird houses, benches, bridges, fountains

### Avatar Movement
- **Desktop:** Arrow keys or WASD
- **Mobile:** Virtual D-pad or swipe-to-move
- Avatar walks at constant speed, smooth position interpolation
- Shadow underneath avatar, facing direction changes sprite

### Proximity Interaction
When avatar walks near a tree (within ~70px):
- Speech-bubble panel appears above/below tree
- Shows: tree name, health bar, action buttons
- Actions vary by state:
  - **Healthy tree:** Decorate, Gift to friend, Practice (optional refresh)
  - **Thirsty tree:** Refresh lesson!, Decorate, Gift
  - **Dying tree:** URGENT Refresh!, Use friend's gift
  - **In-progress (not full path):** Continue path →
  - **Empty plot:** Plant a seed (if seeds available)

### Camera & Viewport
- Garden is larger than viewport (scrolls with avatar)
- Camera follows avatar with smooth lerp
- Garden expands as child earns more plots (starts small, grows over time)

---

## 8. Path View (Lesson Select)

### Opening a Path
Tapping/approaching a tree in the garden and selecting "Open Path" transitions to the Path view.

### Visual Design
A winding trail from **top to bottom**:
- **Top:** First lesson (starting point)
- **Bottom:** Final lesson (goal, marked with 🎯)
- Trail curves left and right between nodes
- Completed sections of the trail are solid green, upcoming sections are dashed grey

### Lesson Nodes
Each node on the path is a circle:
- **Completed:** Green with star rating (⭐⭐⭐) + mini tree health indicator
- **Current:** Gold/amber with pulsing ring + avatar bouncing on it
- **Locked:** Grey with padlock icon
- **Needs refresh:** Completed but health <50% shows 💧 badge

### Lesson Count Per Path
Each skill path contains **4-6 lessons**, each with a distinct topic within the skill theme.

Example — "Sports Talk" path:
1. Boxing Vocabulary 🥊
2. Gym Conversations 🏋️
3. Match Day Talk ⚽
4. Champion Interview 🏆

---

## 9. Lesson View (Gameplay)

### Structure
Each lesson is a sequence of **5-8 activities** presented as a scrolling chat:
1. Professor Finch says 1-2 sentences framing the activity
2. Activity widget appears below the tutor message
3. Child completes the activity → feedback → next step
4. After all activities → Lesson Complete screen

### Activity Types

| Type | Description | Sun Drops | Difficulty |
|------|-------------|-----------|------------|
| Multiple Choice | Pick correct answer from 4 options | 2-3 | Easy |
| Fill in Blank | Complete sentence with missing word | 2-3 | Easy-Medium |
| Word Arrange | Arrange scrambled words into sentence | 3 | Medium |
| True/False | Binary choice on a statement | 1-2 | Easy |
| Matching Pairs | Connect 4 terms to definitions | 3-4 | Medium |
| Translate | Type translation of a phrase | 3 | Medium-Hard |
| Listen & Type | Hear audio, type what you heard | 3 | Medium (Phase 2) |
| Speak | Say a phrase, speech recognition checks | 3 | Medium (Phase 2) |

### Help Button ("Ask for Help")
Every activity has a 💬 Help button. Tapping it:
1. Opens a blue chat panel from Professor Finch
2. Shows a targeted hint for that specific exercise
3. Does not penalize (-1), but reduces reward to half
4. Panel slides in above the activity, doesn't replace it

### Lesson Complete Screen
Shows:
- 🏆 Trophy animation
- Sun Drops earned / maximum
- Star rating (1-3)
- Gift unlocked (meso reward)
- "Send to a friend 💌" button
- "Play Again 🔄" and "Back to Garden" buttons

---

## 10. Social & Gift System

### Friend System
- Friends are added via **6-character friend codes** (already designed in Pocketbase)
- Friends-only leaderboard (no strangers)
- Can see friends' garden health in a friends panel

### Gift Types

| Gift | Effect | How earned |
|------|--------|------------|
| 💧 Water Drop | +10 days buffer on friend's tree decay | Complete any lesson |
| ✨ Sparkle | Temporarily makes a tree glitter (cosmetic + small health boost) | 3-day streak |
| 🌱 Seed | Lets friend start a new skill path | Complete a full skill path |
| 🎀 Ribbon | Decoration for friend's tree (cosmetic) | 7-day streak |
| 🏵️ Golden Flower | Rare garden decoration | Complete path with all ⭐⭐⭐ |

### Gifting Flow
1. Complete a lesson → unlock a gift
2. Go to garden → approach any tree → "Gift 💌" button
3. Pick a friend from list → send gift
4. Friend receives notification → gift auto-applies or they choose which tree

### Decoration System (Cosmetic Rewards)
Beyond tree health, children can earn/buy cosmetic items:
- **Tree decorations:** Ribbons, lights, bird houses, wind chimes
- **Garden items:** Hedges, flower beds, benches, bridges, lanterns, fountains, bird baths
- **Avatar accessories:** Hats, scarves, badges (future)

**How earned:**
- Lesson completion (common items)
- Full path completion (rare items)
- Streak milestones (exclusive items)
- Friend gifts (special friend-only items)
- NOT purchasable with real money (this is a free app)

---

## 11. Technical: Game Framework

### Recommendation: PixiJS + @pixi/react

**Why PixiJS:**
- Industry-standard 2D WebGL renderer — performant on mobile
- Works perfectly with React via `@pixi/react`
- Sprite sheets, tilemaps, particle effects built-in
- Massive free asset ecosystem
- Doesn't require learning a full game engine
- Lightweight (~150KB) — won't bloat the app

**Why not Phaser/Godot/Three.js:**
- Phaser: Full game engine, overkill for a garden + path + activities
- Godot: Requires separate build pipeline, doesn't integrate with React
- Three.js: 3D renderer, unnecessary complexity

### Asset Sources (CC0 / Free)

| Source | What | License |
|--------|------|---------|
| [Kenney.nl](https://kenney.nl) | 2D sprites, tiles, UI elements, characters | CC0 (public domain) |
| [OpenGameArt.org](https://opengameart.org) | Sprite sheets, backgrounds, items | Various (filter CC0) |
| [itch.io game assets](https://itch.io/game-assets/free) | Character packs, nature tiles, UI kits | Various free |
| [LPC Spritesheet Generator](https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/) | Customizable avatar sprites | CC-BY-SA |

### Asset Requirements

**Avatar sprites:**
- 8 animal characters, 4 directions (up/down/left/right), 3 frames each for walk animation
- Idle animation (2 frames)
- Celebration animation (3 frames)
- Size: 32x32 or 48x48 pixels

**Tree sprites:**
- 5 growth stages: seed, sprout, sapling, blooming, full bloom
- 5 health variants at blooming/full stages (100%, 75%, 50%, 25%, 5%)
- Size: 64x96 or similar

**Garden tiles:**
- Grass (4 variants), dirt path, flowers (5+ types), rocks, water/pond
- Fence segments, plot markers
- Size: 16x16 or 32x32 tilemap

**Decorations:**
- 15-20 placeable items (hedges, benches, lanterns, fountains, etc.)
- Size: 32x32 each

**UI elements:**
- Buttons, panels, progress bars, badges, speech bubbles
- Sun Drop icon (normal, broken, glowing)

---

## 12. AI System Changes

### Current State
The AI (Groq Llama 3.3) currently generates conversational responses with optional activity actions. The activity system uses `ActivityType` enum with QUIZ, FILL_BLANK, MATCHING.

### Required Changes

**New ActivityType enum:**
```typescript
enum ActivityType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FILL_BLANK = 'fill_blank',
  WORD_ARRANGE = 'word_arrange',
  TRUE_FALSE = 'true_false',
  MATCHING = 'matching',
  TRANSLATE = 'translate',
  // Phase 2:
  LISTEN_TYPE = 'listen_type',
  SPEAK = 'speak',
}
```

**AI structured output must include:**
```typescript
interface AILessonStep {
  tutorText: string;        // 1-2 sentences framing the activity
  helpText: string;         // Hint shown when child taps "Help"
  activity: {
    type: ActivityType;
    question?: string;       // For MC, TF
    options?: string[];      // For MC
    correctIndex?: number;   // For MC
    correctAnswer?: string;  // For FB, TF
    sentence?: string;       // For FB (with ___ placeholder)
    hint?: string;           // Shown below question
    targetSentence?: string; // For WA
    scrambledWords?: string[]; // For WA
    isTrue?: boolean;        // For TF
    pairs?: Array<{left: string, right: string}>; // For matching
    sourcePhrase?: string;   // For translate
    acceptedAnswers?: string[]; // For translate
    sunDrops: number;        // 1-4, set by AI based on difficulty
  };
}
```

**System prompt changes:**
- AI must ALWAYS include an `activity` in every response (no standalone conversational messages during lessons)
- `tutorText` is a bridge between activities — brief, encouraging, contextual
- AI generates a full lesson plan (5-8 steps) at lesson start, not one step at a time
- Activities must be varied — no more than 2 of the same type in a row

---

## 13. Pocketbase Schema Additions

### New Collections

**`skill_paths`** — defines available learning paths
```
id, name, icon, description, category, difficulty, lesson_count, prerequisites[]
```

**`user_trees`** — each user's tree instances
```
id, user, skill_path, status (seed|growing|bloomed), health (0-100),
last_refresh_date, sun_drops_earned, lessons_completed,
decorations[], gifts_received[], created_at
```

**`garden_items`** — decorations placed in user's garden
```
id, user, item_type, position_x, position_y, item_data (JSON)
```

**`gifts`** — pending and applied gifts
```
id, from_user, to_user, gift_type, target_tree, status (pending|applied|expired),
created_at
```

**`user_avatars`** — avatar selection and customization
```
id, user, avatar_id, accessories[] (future)
```

### Modified Collections

**`profiles`** — add fields:
```
avatar_id, total_sun_drops, garden_size, seeds_available,
current_streak, longest_streak
```

**`daily_progress`** — add fields:
```
sun_drops_earned (replaces xp_earned concept)
```

---

## 14. Implementation Phases

### Phase A: Core Mechanics (Week 1-2)
1. Install PixiJS + @pixi/react
2. Build Garden world (grass, paths, empty plots, avatar movement)
3. Build Path view (winding trail, lesson nodes)
4. Rebuild Lesson view with all 6 activity types + help button + penalty system
5. Implement Sun Drops currency (replace XP throughout)
6. Wire up AI to generate structured lesson steps

### Phase B: Growth & Decay (Week 2-3)
7. Implement tree growth stages (SVG or sprites)
8. Implement health decay formula
9. Build refresher lesson generation
10. Add floating health indicators in garden
11. Proximity-based interaction panels

### Phase C: Social & Rewards (Week 3-4)
12. Gift system (earn, send, receive, apply)
13. Decoration system (earn, place in garden)
14. Friend garden viewing
15. Lesson complete → gift unlock flow
16. Seed earning mechanics

### Phase D: Polish (Week 4-5)
17. Asset integration (replace emoji/SVG with proper sprites)
18. Animations and particle effects (PixiJS)
19. Sound effects (optional, phase 2)
20. Mobile D-pad / touch controls
21. Onboarding tutorial flow
22. Testing with actual kids

---

## 15. Prototype Reference

A working React prototype demonstrating the core UX flow exists in the project:
- **File:** `docs/prototypes/prototype-v4-final.jsx`
- **What it shows:** Garden world as home page (arrow-key movement, proximity interaction, tree→path navigation), Path view (top-to-bottom winding trail opened from garden), Lesson view (all 6 activity types, help button, Sun Drop reward/penalty bursts, star rating, gift unlock), Friends tab (friend codes, friend list, gifting)
- **Navigation flow:** Garden (home) → tap tree → Path (sub-menu) → tap lesson → Lesson (gameplay)
- **What it uses:** React + Framer Motion + inline styles + emoji as placeholder art
- **What production will use:** PixiJS for garden/path rendering, React for UI overlays and lesson activities, proper sprite assets from Kenney.nl / CC0 sources

The prototype is the UX spec — production should match its behavior while upgrading the visual quality with proper game assets.
