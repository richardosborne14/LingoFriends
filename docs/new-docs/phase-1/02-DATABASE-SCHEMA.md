# LingoFriends V2 — Database Schema (Postgres + Drizzle)

**Last Updated:** March 2026

---

## Overview

All tables defined in a single `src/db/schema.ts` file using Drizzle ORM. Migrations are generated automatically via `drizzle-kit generate` and applied with `drizzle-kit migrate`.

Convention: snake_case for table and column names. All tables have `id` (UUID, auto-generated), `created_at`, and `updated_at`.

---

## Tables

### users

Auth table. Stores credentials and basic identity.

```typescript
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  friendCode: varchar('friend_code', { length: 8 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Notes:**
- `friendCode` is an 8-character alphanumeric code generated at registration (e.g., "LF-A3K7M2")
- `email` is the parent's email for account recovery (children don't need their own email)
- `username` is the kid-friendly display name used in leaderboards

---

### profiles

1:1 with users. Stores learner preferences, onboarding data, and progress stats.

```typescript
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),

  // Onboarding data
  nativeLanguage: varchar('native_language', { length: 10 }).notNull(), // 'fr' or 'en'
  targetLanguage: varchar('target_language', { length: 10 }).notNull(), // 'de' or 'en'
  ageGroup: varchar('age_group', { length: 5 }).notNull(), // '7-10', '11-14', '15-18'
  interests: jsonb('interests').$type<string[]>().default([]),
  onboardingComplete: boolean('onboarding_complete').default(false),

  // Avatar customisation
  avatarSkinTone: varchar('avatar_skin_tone', { length: 7 }).default('#F5D0A9'),
  avatarHairColor: varchar('avatar_hair_color', { length: 7 }).default('#4A3728'),
  avatarShirtColor: varchar('avatar_shirt_color', { length: 7 }).default('#FF8A6A'),
  avatarHat: varchar('avatar_hat', { length: 20 }).default('none'),
  avatarGender: varchar('avatar_gender', { length: 10 }).default('neutral'),

  // Progress stats (denormalised for fast reads)
  totalSunDrops: integer('total_sun_drops').default(0),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastActivityDate: timestamp('last_activity_date'),
  lessonsCompleted: integer('lessons_completed').default(0),
  seedsAvailable: integer('seeds_available').default(1), // Start with 1 seed

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

### learner_profiles

AI-maintained profile. Updated after each lesson by Haiku 4.5. Drives personalisation.

```typescript
export const learnerProfiles = pgTable('learner_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),

  // CEFR-aligned level tracking
  overallLevel: varchar('overall_level', { length: 5 }).default('A0'), // A0, A1, A2, B1, B2
  speakingLevel: varchar('speaking_level', { length: 5 }).default('A0'),
  listeningLevel: varchar('listening_level', { length: 5 }).default('A0'),
  readingLevel: varchar('reading_level', { length: 5 }).default('A0'),

  // AI-learned facts (gathered from pre-lesson chats and interactions)
  knownFacts: jsonb('known_facts').$type<{ fact: string; source: string; date: string }[]>().default([]),
  // e.g. [{ fact: "Has a cat named Luna", source: "pre-lesson chat", date: "2026-03-14" }]

  // Learning patterns (updated by AI after each lesson)
  strengths: jsonb('strengths').$type<string[]>().default([]),
  weaknesses: jsonb('weaknesses').$type<string[]>().default([]),
  preferredActivityTypes: jsonb('preferred_activity_types').$type<string[]>().default([]),
  averageAccuracy: real('average_accuracy').default(0),
  averageLessonTime: integer('average_lesson_time_seconds').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

### skill_paths

Defines available learning paths. Seeded on app setup, can be expanded.

```typescript
export const skillPaths = pgTable('skill_paths', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 10 }).notNull(), // Emoji
  description: text('description'),
  category: varchar('category', { length: 50 }), // 'greetings', 'food', 'sports', etc.
  difficulty: varchar('difficulty', { length: 20 }).default('beginner'), // beginner, intermediate, advanced
  targetLanguage: varchar('target_language', { length: 10 }).notNull(),
  lessonCount: integer('lesson_count').default(4),
  lessonDefinitions: jsonb('lesson_definitions').$type<{
    title: string;
    icon: string;
    topic: string;
    order: number;
  }[]>().default([]),
  prerequisites: jsonb('prerequisites').$type<string[]>().default([]), // skill_path IDs
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

### user_trees

Each user's tree instances. One tree per skill path per user.

```typescript
export const userTrees = pgTable('user_trees', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  skillPathId: uuid('skill_path_id').references(() => skillPaths.id).notNull(),

  status: varchar('status', { length: 20 }).default('seed'), // seed, growing, bloomed
  health: integer('health').default(100), // 0-100
  lastRefreshDate: timestamp('last_refresh_date').defaultNow(),
  sunDropsEarned: integer('sun_drops_earned').default(0),
  lessonsCompleted: integer('lessons_completed').default(0),
  growthStage: integer('growth_stage').default(0), // 0-14, maps to visual stages

  // Garden position (grid coordinates)
  positionX: real('position_x').default(0),
  positionY: real('position_y').default(0),

  // Decorations and gifts applied to this tree
  decorations: jsonb('decorations').$type<{ type: string; appliedAt: string }[]>().default([]),
  giftBufferDays: integer('gift_buffer_days').default(0), // Extra days before health decay

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Growth stage thresholds (from GAME_DESIGN.md):**

| Stage | SunDrops Required | Visual |
|-------|-------------------|--------|
| 0 | 0 | Seed |
| 1 | 10 | Sprout |
| 2 | 25 | Small sapling |
| 3 | 45 | Sapling with leaves |
| 4 | 70 | Young tree |
| 5 | 100 | Tree with branches |
| 6 | 140 | Tree with buds |
| 7 | 190 | First blossoms |
| 8 | 250 | Half bloom |
| 9 | 320 | Full bloom |
| 10 | 400 | Full bloom + sparkles |
| 11 | 500 | Golden bloom |
| 12 | 625 | Legendary tree |
| 13 | 775 | Ancient tree |
| 14 | 900+ | Mythic tree |

---

### chunk_library

Stores all generated lexical chunks with SRS metadata and cached audio.

```typescript
export const chunkLibrary = pgTable('chunk_library', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  targetPhrase: text('target_phrase').notNull(),
  nativeTranslation: text('native_translation').notNull(),
  targetLanguage: varchar('target_language', { length: 10 }).notNull(),
  nativeLanguage: varchar('native_language', { length: 10 }).notNull(),
  coreFrame: text('core_frame'), // The sentence frame this chunk belongs to
  topic: varchar('topic', { length: 100 }),
  explanation: text('explanation'),
  usageNote: text('usage_note'),
  exampleSentence: text('example_sentence'),
  distractors: jsonb('distractors').$type<string[]>().default([]),

  // SRS (Spaced Repetition) metadata
  timesStudied: integer('times_studied').default(0),
  timesCorrect: integer('times_correct').default(0),
  lastStudied: timestamp('last_studied'),
  nextReviewDate: timestamp('next_review_date'),
  srsInterval: integer('srs_interval_days').default(1), // Days until next review
  srsFactor: real('srs_factor').default(2.5), // SM-2 ease factor

  // Cached TTS audio (base64 encoded)
  audioBase64: text('audio_base64'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

### lesson_history

Record of every lesson attempt. Drives analytics, replay, and SRS.

```typescript
export const lessonHistory = pgTable('lesson_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  treeId: uuid('tree_id').references(() => userTrees.id).notNull(),
  skillPathId: uuid('skill_path_id').references(() => skillPaths.id).notNull(),

  lessonIndex: integer('lesson_index').notNull(), // Which lesson in the path (0-based)
  topic: varchar('topic', { length: 200 }).notNull(),

  // Results
  sunDropsEarned: integer('sun_drops_earned').default(0),
  sunDropsMax: integer('sun_drops_max').default(0),
  accuracy: real('accuracy').default(0), // 0.0 to 1.0
  starsEarned: integer('stars_earned').default(0), // 1-3
  timeSpentSeconds: integer('time_spent_seconds').default(0),
  activitiesCompleted: integer('activities_completed').default(0),
  activitiesTotal: integer('activities_total').default(0),
  helpUsed: integer('help_used').default(0),

  // The generated lesson data (for replay/analysis)
  lessonData: jsonb('lesson_data'), // Full LessonPlan JSON
  personalContext: text('personal_context'), // From pre-lesson chat

  completedAt: timestamp('completed_at').defaultNow().notNull(),
});
```

---

### daily_progress

One row per user per day. Drives streaks, daily caps, and analytics.

```typescript
export const dailyProgress = pgTable('daily_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),

  sunDropsEarned: integer('sun_drops_earned').default(0),
  lessonsCompleted: integer('lessons_completed').default(0),
  activitiesCompleted: integer('activities_completed').default(0),
  timeSpentSeconds: integer('time_spent_seconds').default(0),
  gemsEarned: integer('gems_earned').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userDateUnique: unique().on(table.userId, table.date),
}));
```

---

### friendships

Bidirectional friend relationships.

```typescript
export const friendships = pgTable('friendships', {
  id: uuid('id').defaultRandom().primaryKey(),
  userA: uuid('user_a').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  userB: uuid('user_b').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, accepted, rejected
  initiatedBy: uuid('initiated_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

### gifts

Gifts sent between friends that apply to trees.

```typescript
export const gifts = pgTable('gifts', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromUserId: uuid('from_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  toUserId: uuid('to_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetTreeId: uuid('target_tree_id').references(() => userTrees.id),

  giftType: varchar('gift_type', { length: 30 }).notNull(),
  // water_drop (1 day buffer), sparkle (3 days buffer), seed, ribbon, golden_flower
  status: varchar('status', { length: 20 }).default('pending'), // pending, applied, expired
  bufferDays: integer('buffer_days').default(0), // How many days this gift adds

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

### sessions (auth)

Lucia Auth session table.

```typescript
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
```

---

## Indexes

```typescript
// Performance indexes
createIndex('idx_profiles_user_id').on(profiles.userId);
createIndex('idx_learner_profiles_user_id').on(learnerProfiles.userId);
createIndex('idx_user_trees_user_id').on(userTrees.userId);
createIndex('idx_chunk_library_user_id').on(chunkLibrary.userId);
createIndex('idx_chunk_library_next_review').on(chunkLibrary.userId, chunkLibrary.nextReviewDate);
createIndex('idx_lesson_history_user_tree').on(lessonHistory.userId, lessonHistory.treeId);
createIndex('idx_daily_progress_user_date').on(dailyProgress.userId, dailyProgress.date);
createIndex('idx_friendships_users').on(friendships.userA, friendships.userB);
createIndex('idx_gifts_to_user').on(gifts.toUserId, gifts.status);
```

---

## Seed Data

The `src/db/seed.ts` script creates initial skill paths for German (target) with French and English (native):

```typescript
const INITIAL_SKILL_PATHS = [
  {
    name: 'Introduce Yourself',
    icon: '👋',
    category: 'greetings',
    difficulty: 'beginner',
    targetLanguage: 'de',
    lessonCount: 4,
    lessonDefinitions: [
      { title: 'Saying Your Name', icon: '🏷️', topic: 'introduce-name', order: 0 },
      { title: 'How Old Are You?', icon: '🎂', topic: 'introduce-age', order: 1 },
      { title: 'Where Are You From?', icon: '🌍', topic: 'introduce-origin', order: 2 },
      { title: 'Putting It Together', icon: '🎯', topic: 'introduce-combined', order: 3 },
    ],
  },
  {
    name: 'At the Café',
    icon: '☕',
    category: 'food',
    difficulty: 'beginner',
    targetLanguage: 'de',
    lessonCount: 4,
    lessonDefinitions: [
      { title: 'Ordering a Drink', icon: '🥤', topic: 'cafe-ordering', order: 0 },
      { title: 'Asking the Price', icon: '💰', topic: 'cafe-price', order: 1 },
      { title: 'Saying Thank You', icon: '🙏', topic: 'cafe-thanks', order: 2 },
      { title: 'Full Café Visit', icon: '🎯', topic: 'cafe-combined', order: 3 },
    ],
  },
  // ... more paths added over time
];
```

---

## Migration Strategy

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema directly (dev only)
npx drizzle-kit push

# Studio (visual DB browser)
npx drizzle-kit studio
```
