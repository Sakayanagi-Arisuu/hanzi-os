CREATE TABLE `lesson_access_rules` (
	`lesson_id` text PRIMARY KEY NOT NULL,
	`tier` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "lesson_access_tier" CHECK("lesson_access_rules"."tier" IN ('free','premium'))
);
