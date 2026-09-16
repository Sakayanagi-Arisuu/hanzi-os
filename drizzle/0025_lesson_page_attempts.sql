CREATE TABLE `lesson_page_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reset_epoch` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`activity_id` text NOT NULL,
	`activity_version` text NOT NULL,
	`lesson_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`response_json` text NOT NULL,
	`outcome` text NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "lesson_page_attempt_epoch" CHECK("lesson_page_attempts"."reset_epoch" BETWEEN 0 AND 2147483647),
	CONSTRAINT "lesson_page_attempt_response" CHECK(json_valid("lesson_page_attempts"."response_json")),
	CONSTRAINT "lesson_page_attempt_outcome" CHECK("lesson_page_attempts"."outcome" IN ('correct','incorrect','self-review'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_page_attempt_owner_key` ON `lesson_page_attempts` (`user_id`,`reset_epoch`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `lesson_page_attempt_owner_activity` ON `lesson_page_attempts` (`user_id`,`reset_epoch`,`activity_id`,`created_at`);