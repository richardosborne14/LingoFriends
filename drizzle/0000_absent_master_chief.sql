CREATE TABLE IF NOT EXISTS "chunk_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_phrase" text NOT NULL,
	"native_translation" text NOT NULL,
	"target_language" varchar(10) NOT NULL,
	"native_language" varchar(10) NOT NULL,
	"core_frame" text,
	"topic" varchar(100),
	"explanation" text,
	"usage_note" text,
	"example_sentence" text,
	"distractors" jsonb DEFAULT '[]'::jsonb,
	"times_studied" integer DEFAULT 0,
	"times_correct" integer DEFAULT 0,
	"last_studied" timestamp,
	"next_review_date" timestamp,
	"srs_interval_days" integer DEFAULT 1,
	"srs_factor" real DEFAULT 2.5,
	"audio_base64" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"sun_drops_earned" integer DEFAULT 0,
	"lessons_completed" integer DEFAULT 0,
	"activities_completed" integer DEFAULT 0,
	"time_spent_seconds" integer DEFAULT 0,
	"gems_earned" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_progress_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"initiated_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"target_tree_id" uuid,
	"gift_type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"buffer_days" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learner_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"overall_level" varchar(5) DEFAULT 'A0',
	"speaking_level" varchar(5) DEFAULT 'A0',
	"listening_level" varchar(5) DEFAULT 'A0',
	"reading_level" varchar(5) DEFAULT 'A0',
	"known_facts" jsonb DEFAULT '[]'::jsonb,
	"strengths" jsonb DEFAULT '[]'::jsonb,
	"weaknesses" jsonb DEFAULT '[]'::jsonb,
	"preferred_activity_types" jsonb DEFAULT '[]'::jsonb,
	"average_accuracy" real DEFAULT 0,
	"average_lesson_time_seconds" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learner_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tree_id" uuid NOT NULL,
	"skill_path_id" uuid NOT NULL,
	"lesson_index" integer NOT NULL,
	"topic" varchar(200) NOT NULL,
	"sun_drops_earned" integer DEFAULT 0,
	"sun_drops_max" integer DEFAULT 0,
	"accuracy" real DEFAULT 0,
	"stars_earned" integer DEFAULT 0,
	"time_spent_seconds" integer DEFAULT 0,
	"activities_completed" integer DEFAULT 0,
	"activities_total" integer DEFAULT 0,
	"help_used" integer DEFAULT 0,
	"lesson_data" jsonb,
	"personal_context" text,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"native_language" varchar(10) NOT NULL,
	"target_language" varchar(10) NOT NULL,
	"age_group" varchar(5) NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb,
	"onboarding_complete" boolean DEFAULT false,
	"avatar_skin_tone" varchar(7) DEFAULT '#F5D0A9',
	"avatar_hair_color" varchar(7) DEFAULT '#4A3728',
	"avatar_shirt_color" varchar(7) DEFAULT '#FF8A6A',
	"avatar_hat" varchar(20) DEFAULT 'none',
	"avatar_gender" varchar(10) DEFAULT 'neutral',
	"total_sun_drops" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_activity_date" timestamp,
	"lessons_completed" integer DEFAULT 0,
	"seeds_available" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon" varchar(10) NOT NULL,
	"description" text,
	"category" varchar(50),
	"difficulty" varchar(20) DEFAULT 'beginner',
	"target_language" varchar(10) NOT NULL,
	"lesson_count" integer DEFAULT 4,
	"lesson_definitions" jsonb DEFAULT '[]'::jsonb,
	"prerequisites" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_trees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"skill_path_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'seed',
	"health" integer DEFAULT 100,
	"last_refresh_date" timestamp DEFAULT now(),
	"sun_drops_earned" integer DEFAULT 0,
	"lessons_completed" integer DEFAULT 0,
	"growth_stage" integer DEFAULT 0,
	"position_x" real DEFAULT 0,
	"position_y" real DEFAULT 0,
	"decorations" jsonb DEFAULT '[]'::jsonb,
	"gift_buffer_days" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"friend_code" varchar(8) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_friend_code_unique" UNIQUE("friend_code")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chunk_library" ADD CONSTRAINT "chunk_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_progress" ADD CONSTRAINT "daily_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_a_users_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_b_users_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gifts" ADD CONSTRAINT "gifts_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gifts" ADD CONSTRAINT "gifts_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gifts" ADD CONSTRAINT "gifts_target_tree_id_user_trees_id_fk" FOREIGN KEY ("target_tree_id") REFERENCES "public"."user_trees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_history" ADD CONSTRAINT "lesson_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_history" ADD CONSTRAINT "lesson_history_tree_id_user_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."user_trees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_history" ADD CONSTRAINT "lesson_history_skill_path_id_skill_paths_id_fk" FOREIGN KEY ("skill_path_id") REFERENCES "public"."skill_paths"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_trees" ADD CONSTRAINT "user_trees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_trees" ADD CONSTRAINT "user_trees_skill_path_id_skill_paths_id_fk" FOREIGN KEY ("skill_path_id") REFERENCES "public"."skill_paths"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
