/**
 * LingoFriends V2 — Drizzle Database Schema
 *
 * Single source of truth for all table definitions.
 * Reference: docs/new-docs/02-DATABASE-SCHEMA.md
 *
 * Convention: snake_case for table/column names.
 * All tables have id (UUID), created_at, and (where appropriate) updated_at.
 */

import {
	boolean,
	date,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH TABLES (required by Lucia)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Users — auth credentials and basic identity.
 * friendCode is an 8-char alphanumeric generated at registration.
 * email is the parent's email for account recovery.
 */
export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	email: varchar('email', { length: 255 }).unique().notNull(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	username: varchar('username', { length: 50 }).unique().notNull(),
	displayName: varchar('display_name', { length: 100 }).notNull(),
	// 8-char code for adding friends, e.g. "LF-A3K7M2"
	friendCode: varchar('friend_code', { length: 8 }).unique().notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Sessions — Lucia auth session table.
 * id is a string (not UUID) because Lucia generates its own IDs.
 */
export const sessions = pgTable('sessions', {
	id: varchar('id', { length: 255 }).primaryKey(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// LEARNER PROFILE TABLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Profiles — 1:1 with users. Onboarding data, avatar customisation, progress stats.
 * Denormalised stats (totalSunDrops, streak, etc.) for fast dashboard reads.
 */
export const profiles = pgTable('profiles', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.unique()
		.notNull(),

	// Onboarding data
	nativeLanguage: varchar('native_language', { length: 10 }).notNull(), // 'fr' or 'en'
	targetLanguage: varchar('target_language', { length: 10 }).notNull(), // 'de' or 'en'
	ageGroup: varchar('age_group', { length: 5 }).notNull(), // '7-10', '11-14', '15-18'
	interests: jsonb('interests').$type<string[]>().default([]),
	onboardingComplete: boolean('onboarding_complete').default(false),

	// Proficiency level — self-reported during onboarding, adjustable in Settings
	// Used by the AI lesson generator to calibrate chunk difficulty.
	// 'total_beginner' | 'know_some_words' | 'simple_sentences' | 'can_have_conversations'
	level: varchar('level', { length: 30 }).default('total_beginner'),

	// Track whether the user has completed their very first lesson.
	// Used to show the Garden Economy explanation modal exactly once.
	firstLessonComplete: boolean('first_lesson_complete').default(false),

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
	seedsAvailable: integer('seeds_available').default(1),

	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Learner Profiles — AI-maintained. Updated by Haiku 4.5 after each lesson.
 * Drives personalisation: chunk family selection, distractor difficulty, coaching tone.
 */
export const learnerProfiles = pgTable('learner_profiles', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.unique()
		.notNull(),

	// CEFR-aligned level tracking
	overallLevel: varchar('overall_level', { length: 5 }).default('A0'),
	speakingLevel: varchar('speaking_level', { length: 5 }).default('A0'),
	listeningLevel: varchar('listening_level', { length: 5 }).default('A0'),
	readingLevel: varchar('reading_level', { length: 5 }).default('A0'),

	// AI-learned facts from pre-lesson chats (e.g. "Has a cat named Luna")
	knownFacts: jsonb('known_facts')
		.$type<{ fact: string; source: string; date: string }[]>()
		.default([]),

	// Learning patterns updated after each lesson
	strengths: jsonb('strengths').$type<string[]>().default([]),
	weaknesses: jsonb('weaknesses').$type<string[]>().default([]),
	preferredActivityTypes: jsonb('preferred_activity_types').$type<string[]>().default([]),
	averageAccuracy: real('average_accuracy').default(0),
	averageLessonTime: integer('average_lesson_time_seconds').default(0),

	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT TABLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Skill Paths — available learning paths. Seeded on setup, expanded over time.
 * Each path has multiple lessons defined in lessonDefinitions JSON.
 */
export const skillPaths = pgTable('skill_paths', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	icon: varchar('icon', { length: 10 }).notNull(),
	description: text('description'),
	category: varchar('category', { length: 50 }),
	difficulty: varchar('difficulty', { length: 20 }).default('beginner'),
	targetLanguage: varchar('target_language', { length: 10 }).notNull(),
	lessonCount: integer('lesson_count').default(4),
	lessonDefinitions: jsonb('lesson_definitions')
		.$type<{ title: string; icon: string; topic: string; order: number }[]>()
		.default([]),
	prerequisites: jsonb('prerequisites').$type<string[]>().default([]),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * User Trees — one tree per skill path per user.
 * Health decays over time without refresher lessons (spaced repetition mechanic).
 * Growth stage (0-14) maps to visual cherry blossom stages.
 */
export const userTrees = pgTable('user_trees', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	skillPathId: uuid('skill_path_id')
		.references(() => skillPaths.id)
		.notNull(),

	status: varchar('status', { length: 20 }).default('seed'), // seed, growing, bloomed
	health: integer('health').default(100), // 0-100
	lastRefreshDate: timestamp('last_refresh_date').defaultNow(),
	sunDropsEarned: integer('sun_drops_earned').default(0),
	lessonsCompleted: integer('lessons_completed').default(0),
	growthStage: integer('growth_stage').default(0), // 0-14

	// Garden grid position
	positionX: real('position_x').default(0),
	positionY: real('position_y').default(0),

	// Decorations and gift buffer
	decorations: jsonb('decorations')
		.$type<{ type: string; appliedAt: string }[]>()
		.default([]),
	giftBufferDays: integer('gift_buffer_days').default(0),

	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Chunk Library — all generated lexical chunks for a user with SRS metadata.
 * audioBase64 caches TTS output to avoid re-generating identical phrases.
 */
export const chunkLibrary = pgTable('chunk_library', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),

	targetPhrase: text('target_phrase').notNull(),
	nativeTranslation: text('native_translation').notNull(),
	targetLanguage: varchar('target_language', { length: 10 }).notNull(),
	nativeLanguage: varchar('native_language', { length: 10 }).notNull(),
	coreFrame: text('core_frame'), // Sentence frame this chunk belongs to
	topic: varchar('topic', { length: 100 }),
	explanation: text('explanation'),
	usageNote: text('usage_note'),
	exampleSentence: text('example_sentence'),
	distractors: jsonb('distractors').$type<string[]>().default([]),

	// SM-2 spaced repetition metadata
	timesStudied: integer('times_studied').default(0),
	timesCorrect: integer('times_correct').default(0),
	lastStudied: timestamp('last_studied'),
	nextReviewDate: timestamp('next_review_date'),
	srsInterval: integer('srs_interval_days').default(1),
	srsFactor: real('srs_factor').default(2.5),

	// Cached TTS audio (base64 encoded, nullable — generated on demand)
	audioBase64: text('audio_base64'),

	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS TABLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lesson History — record of every lesson attempt.
 * lessonData stores the full LessonPlan JSON for replay and analysis.
 */
export const lessonHistory = pgTable('lesson_history', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	treeId: uuid('tree_id')
		.references(() => userTrees.id)
		.notNull(),
	skillPathId: uuid('skill_path_id')
		.references(() => skillPaths.id)
		.notNull(),

	lessonIndex: integer('lesson_index').notNull(),
	topic: varchar('topic', { length: 200 }).notNull(),

	sunDropsEarned: integer('sun_drops_earned').default(0),
	sunDropsMax: integer('sun_drops_max').default(0),
	accuracy: real('accuracy').default(0),
	starsEarned: integer('stars_earned').default(0), // 1-3
	timeSpentSeconds: integer('time_spent_seconds').default(0),
	activitiesCompleted: integer('activities_completed').default(0),
	activitiesTotal: integer('activities_total').default(0),
	helpUsed: integer('help_used').default(0),

	lessonData: jsonb('lesson_data'),
	personalContext: text('personal_context'),

	completedAt: timestamp('completed_at').defaultNow().notNull(),
});

/**
 * Daily Progress — one row per user per day.
 * Drives streak calculations, daily XP caps, and analytics dashboard.
 */
export const dailyProgress = pgTable(
	'daily_progress',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		date: date('date').notNull(),

		sunDropsEarned: integer('sun_drops_earned').default(0),
		lessonsCompleted: integer('lessons_completed').default(0),
		activitiesCompleted: integer('activities_completed').default(0),
		timeSpentSeconds: integer('time_spent_seconds').default(0),
		gemsEarned: integer('gems_earned').default(0),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
	},
	(table) => ({
		// Enforce one row per user per day
		userDateUnique: unique().on(table.userId, table.date),
	})
);

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL TABLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Friendships — bidirectional friend relationships.
 * initiatedBy tracks who sent the request (for UI display).
 */
export const friendships = pgTable('friendships', {
	id: uuid('id').defaultRandom().primaryKey(),
	userA: uuid('user_a')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	userB: uuid('user_b')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	status: varchar('status', { length: 20 }).default('pending'), // pending, accepted, rejected
	initiatedBy: uuid('initiated_by')
		.references(() => users.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Gifts — items sent between friends that apply buffs to trees.
 * bufferDays extends tree health decay timer.
 */
export const gifts = pgTable('gifts', {
	id: uuid('id').defaultRandom().primaryKey(),
	fromUserId: uuid('from_user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	toUserId: uuid('to_user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	targetTreeId: uuid('target_tree_id').references(() => userTrees.id),

	// water_drop (1 day), sparkle (3 days), seed, ribbon, golden_flower
	giftType: varchar('gift_type', { length: 30 }).notNull(),
	status: varchar('status', { length: 20 }).default('pending'), // pending, applied, expired
	bufferDays: integer('buffer_days').default(0),

	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS — for use in server-side code
// ─────────────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type LearnerProfile = typeof learnerProfiles.$inferSelect;
export type SkillPath = typeof skillPaths.$inferSelect;
export type UserTree = typeof userTrees.$inferSelect;
export type ChunkLibraryEntry = typeof chunkLibrary.$inferSelect;
export type LessonHistoryEntry = typeof lessonHistory.$inferSelect;
export type DailyProgress = typeof dailyProgress.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Gift = typeof gifts.$inferSelect;
