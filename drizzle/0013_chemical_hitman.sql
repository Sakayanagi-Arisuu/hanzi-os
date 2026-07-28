PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`goal` text NOT NULL,
	`daily_minutes` integer NOT NULL,
	`script` text NOT NULL,
	`starting_level` text NOT NULL,
	`onboarded` integer DEFAULT false NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "profiles_goal_check" CHECK("__new_profiles"."goal" IN ('conversation', 'hsk', 'career', 'travel')),
	CONSTRAINT "profiles_daily_minutes_check" CHECK("__new_profiles"."daily_minutes" IN (10, 20, 30)),
	CONSTRAINT "profiles_script_check" CHECK("__new_profiles"."script" IN ('simplified', 'traditional')),
	CONSTRAINT "profiles_starting_level_check" CHECK("__new_profiles"."starting_level" IN ('zero', 'basic', 'hsk1', 'hsk2', 'hsk3', 'hsk4')),
	CONSTRAINT "profiles_revision_check" CHECK("__new_profiles"."revision" >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_profiles`("user_id", "display_name", "goal", "daily_minutes", "script", "starting_level", "onboarded", "revision", "created_at", "updated_at") SELECT "user_id", "display_name", "goal", "daily_minutes", "script", "starting_level", "onboarded", "revision", "created_at", "updated_at" FROM `profiles`;--> statement-breakpoint
DROP TABLE `profiles`;--> statement-breakpoint
ALTER TABLE `__new_profiles` RENAME TO `profiles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;