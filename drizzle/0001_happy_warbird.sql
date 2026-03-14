ALTER TABLE "profiles" ADD COLUMN "level" varchar(30) DEFAULT 'total_beginner';--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "first_lesson_complete" boolean DEFAULT false;