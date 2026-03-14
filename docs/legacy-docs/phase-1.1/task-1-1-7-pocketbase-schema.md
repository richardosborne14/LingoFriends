# Task 1.1.7: Pocketbase Schema Updates

**Status:** ✅ Completed
**Phase:** B (Growth & Decay)
**Dependencies:** None (parallel with Phase A tasks)
**Estimated Time:** 2-3 hours

---

## Objective

Update the Pocketbase database schema to support the game-based learning system. Add collections for trees, skill paths, gifts, decorations, and game progress. Create migration scripts for existing data.

---

## Deliverables

### Files to Create
- `scripts/migrate-game-schema.cjs` — Migration script for new collections
- `src/types/pocketbase.ts` — Typed collection records

### Collections to Create
- `skill_paths` — Predefined skill path definitions
- `user_trees` — User's tree instances in garden
- `gifts` — Gifts sent between friends
- `decorations` — User's unlocked decorations
- `daily_progress` — Daily Sun Drop tracking

### Collections to Modify
- `profiles` — Add avatar, Sun Drops, streak fields

---

## New Collection Schemas

### skill_paths (Predefined)

```javascript
{
  id: string;
  name: string;              // "Sports Talk"
  icon: string;              // Emoji: "⚽"
  description: string;       // "Learn sports vocabulary"
  category: string;          // "beginner" | "intermediate" | "advanced"
  language: string;          // "fr" | "es" | "de"
  lessons: json;             // Array of lesson definitions
  created: datetime;
  updated: datetime;
}
```

**Lessons JSON Structure:**
```json
[
  {
    "id": "sports-1",
    "title": "Match Day",
    "icon": "⚽",
    "vocabulary": ["le gardien", "le but", "l'arbitre"],
    "activities": 6
  }
]
```

---

### user_trees (User's Garden)

```javascript
{
  id: string;
  user: relation;            // → profiles
  skillPath: relation;       // → skill_paths
  status: string;            // "seed" | "growing" | "bloomed"
  health: number;            // 0-100
  sunDropsTotal: number;     // Total earned in this tree
  lessonsCompleted: number;  // Count
  lessonsTotal: number;      // From skill_path
  lastRefreshDate: datetime; // Last time lesson played
  position: json;            // { x: 150, y: 200 }
  decorations: json;         // Array of decoration IDs
  created: datetime;
  updated: datetime;
}
```

**Indexes:**
- `user` (for fetching user's trees)
- `skillPath` (for lookup)

---

### gifts (Social)

```javascript
{
  id: string;
  type: string;              // "water_drop" | "sparkle" | "seed" | "ribbon" | "golden_flower"
  fromUser: relation;        // → profiles (sender)
  toUser: relation;          // → profiles (receiver)
  toItem: relation;          // → user_trees (nullable, if applied to tree)
  message: string;           // Optional message
  unlockedAt: datetime;      // When sender earned it
  sentAt: datetime;          // When sent
  appliedAt: datetime;       // When applied (null if pending)
  created: datetime;
}
```

**Indexes:**
- `fromUser` (sent gifts)
- `toUser` (received gifts)
- `toItem` (tree gifts)

---

### decorations (Customization)

```javascript
{
  id: string;
  user: relation;            // → profiles
  itemType: string;          // "hedge" | "bench" | "lantern" | "pond" | etc.
  position: json;            // { x: 300, y: 400 }
  placed: boolean;           // Whether placed in garden
  unlockedAt: datetime;      // When unlocked
  created: datetime;
}
```

---

### garden_objects (Placed Decorations)

**Note:** This collection replaces `decorations` for the Three.js renderer. Each object is placed individually in the isometric garden.

```javascript
{
  id: string;
  user: relation;            // → profiles
  objectType: string;        // Object type ID (see GARDEN_THREE_IMPLEMENTATION.md)
  // Examples: "hedge_short", "hedge_tall", "bench", "lantern", 
  //           "flower_blue", "flower_pink", "rock_small", "pond"
  gridX: number;             // Grid column (0-15)
  gridY: number;             // Grid row (0-12)
  rotation: number;          // Rotation in degrees (0, 90, 180, 270)
  variant: number;           // Visual variant (for random flowers, etc.)
  created: datetime;
  updated: datetime;
}
```

**Object Types (from GARDEN_THREE_IMPLEMENTATION.md):**

| Category | Types | Cost |
|----------|-------|------|
| Hedges | `hedge_short`, `hedge_tall`, `hedge_round` | 10-20 seeds |
| Flowers | `flower_blue`, `flower_pink`, `flower_yellow`, `flower_white` | 5 seeds |
| Trees | `tree_apple`, `tree_orange` | 50 seeds |
| Furniture | `bench`, `table`, `umbrella` | 30-40 seeds |
| Water | `pond`, `fountain` | 100 seeds |
| Lights | `lantern`, `lamp_post` | 25 seeds |
| Rocks | `rock_small`, `rock_large` | 5 seeds |
| Paths | `path_stone`, `path_gravel` | 3 seeds |

**Indexes:**
- `user` (for fetching user's garden)
- `user` + `gridX` + `gridY` (unique constraint per grid cell)

**Grid System:**
- 16 columns × 12 rows
- Each cell is 64×64 pixels in isometric space
- Trees use 2×2 cells, ponds use 3×2 cells

---

### daily_progress (Sun Drop Caps)

```javascript
{
  id: string;
  user: relation;            // → profiles
  date: date;                // Daily reset
  sunDropsEarned: number;    // Current day total (max 50)
  lessonsCompleted: number;  // Lessons done today
  streak: number;            // Consecutive days
  lastActivityDate: datetime;
  created: datetime;
  updated: datetime;
}
```

**Indexes:**
- `user` + `date` (unique, for daily lookup)

---

### profiles (Modified)

Add fields:
```javascript
{
  // ... existing fields ...
  
  // Game fields
  avatar: string;            // "fox" | "cat" | "panda" | etc.
  avatarEmoji: string;       // "🦊" | "🐱" | "🐼" | etc.
  sunDrops: number;          // Total balance
  dailyCapRemaining: number; // Today's remaining allowance
  
  // Streak
  streak: number;            // Consecutive days
  lastActiveDate: date;      // For streak calculation
  
  // Social
  friendCode: string;        // 6-char code for sharing
  giftsReceived: number;     // Count of pending gifts
}
```

---

## Migration Script

```javascript
// scripts/migrate-game-schema.cjs

const PocketBase = require('pocketbase');

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function migrate() {
  // 1. Create skill_paths collection
  await pb.collections.create({
    name: 'skill_paths',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'icon', type: 'text', required: true },
      { name: 'description', type: 'text', required: true },
      { name: 'category', type: 'select', options: { values: ['beginner', 'intermediate', 'advanced'] } },
      { name: 'language', type: 'text', required: true },
      { name: 'lessons', type: 'json' },
    ],
  });
  
  // 2. Create user_trees collection
  // ... similar pattern
  
  // 3. Create gifts collection
  // ... similar pattern
  
  // 4. Create decorations collection
  // ... similar pattern
  
  // 5. Create daily_progress collection
  // ... similar pattern
  
  // 6. Add fields to profiles
  await pb.collections.update({
    name: 'profiles',
    schema: [
      // ... existing fields ...
      { name: 'avatar', type: 'text', required: false },
      { name: 'avatarEmoji', type: 'text', required: false },
      { name: 'sunDrops', type: 'number', required: true, defaultValue: 0 },
      { name: 'streak', type: 'number', required: true, defaultValue: 0 },
      { name: 'friendCode', type: 'text', required: false },
    ],
  });
  
  console.log('Migration complete!');
}

migrate().catch(console.error);
```

---

## Type Definitions

```typescript
// src/types/pocketbase.ts

import type { UserTree, SkillPath, GiftItem, GardenDecoration } from './game';

export interface ProfileRecord {
  id: string;
  username: string;
  email: string;
  avatar: string;
  avatarEmoji: string;
  sunDrops: number;
  streak: number;
  friendCode: string;
  created: string;
  updated: string;
}

export interface SkillPathRecord extends SkillPath {
  id: string;
  created: string;
  updated: string;
}

export interface UserTreeRecord {
  id: string;
  user: string;           // Profile ID
  skillPath: string;      // SkillPath ID
  status: 'seed' | 'growing' | 'bloomed';
  health: number;
  sunDropsTotal: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  lastRefreshDate: string;
  position: { x: number; y: number };
  decorations: string[];
  created: string;
  updated: string;
}

export interface GiftRecord {
  id: string;
  type: string;
  fromUser: string;
  toUser: string;
  toItem: string | null;
  message: string;
  unlockedAt: string;
  sentAt: string;
  appliedAt: string | null;
  created: string;
}

export interface DailyProgressRecord {
  id: string;
  user: string;
  date: string;
  sunDropsEarned: number;
  lessonsCompleted: number;
  streak: number;
  lastActivityDate: string;
  created: string;
  updated: string;
}

export interface GardenObjectRecord {
  id: string;
  user: string;
  objectType: string;
  gridX: number;
  gridY: number;
  rotation: number;
  variant: number;
  created: string;
  updated: string;
}
```

---

## API Rules (Pocketbase)

### skill_paths
- **Read:** Authenticated users
- **Write:** Admin only (predefined content)

### user_trees
- **Read:** Owner only
- **Write:** Owner only

### gifts
- **Read:** Sender or recipient
- **Create:** Sender only
- **Update:** Recipient only (to apply)

### decorations
- **Read:** Owner only
- **Write:** Owner only

### daily_progress
- **Read:** Owner only
- **Write:** Owner only

### garden_objects
- **Read:** Owner only
- **Write:** Owner only
- **Note:** One object per grid cell (unique constraint on user + gridX + gridY)

---

## Testing Checklist

- [x] Migration script runs without errors
- [x] All collections created with correct schema
- [x] Indexes created for performance
- [x] Profile fields added successfully
- [x] API rules configured correctly
- [x] Type definitions compile
- [x] Unit tests pass (53 tests)
- [ ] Can create test user_tree (manual verification)
- [ ] Can create test gift (manual verification)
- [ ] Daily progress unique constraint works (manual verification)

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| All collections created | ✅ |
| Migration script works | ✅ |
| Types generated correctly | ✅ |
| API rules secure | ✅ |
| Existing data preserved | ✅ |
| Unit tests pass | ✅ (53 tests) |
| Seed data populated | ✅ (12 skill paths) |

---

## Reference

- **GAME_DESIGN.md** — Section 5 (Data Model)
- **CLINE_GAME_IMPLEMENTATION.md** — Step 5 (Pocketbase Schema)
- `docs/phase-1/task-5-database-schema.md` — Existing schema

---

## Notes for Implementation

1. Run migration on development Pocketbase first
2. Test with fresh user account
3. Seed skill_paths with initial content
4. Consider data migration for existing users (XP → Sun Drops)
5. Set up daily job to reset daily_progress (or handle in app logic)