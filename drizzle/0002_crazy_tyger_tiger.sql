CREATE TABLE IF NOT EXISTS "bug_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" varchar(255) NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"activity_data" jsonb,
	"report_type" varchar(30) NOT NULL,
	"user_description" text,
	"status" varchar(20) DEFAULT 'new',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" varchar(255) NOT NULL,
	"level_at_time" varchar(30) NOT NULL,
	"accuracy" real NOT NULL,
	"hints_used" integer DEFAULT 0,
	"hearts_lost" integer DEFAULT 0,
	"streak_max" integer DEFAULT 0,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_performance" ADD CONSTRAINT "lesson_performance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
