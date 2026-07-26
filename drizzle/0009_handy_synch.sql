PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_fsrs_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`activation_session_id` text,
	`reset_epoch` integer DEFAULT 0 NOT NULL,
	`content_version` text NOT NULL,
	`knowledge_item_type` text NOT NULL,
	`knowledge_item_id` text NOT NULL,
	`knowledge_item_version` text NOT NULL,
	`modality` text NOT NULL,
	`scheduler_version` text NOT NULL,
	`due_at` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` integer NOT NULL,
	`scheduled_days` integer NOT NULL,
	`learning_steps` integer NOT NULL,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`state` integer NOT NULL,
	`last_review_at` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`enrollment_id`) REFERENCES `enrollments`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`activation_session_id`,`reset_epoch`) REFERENCES `lesson_sessions`(`user_id`,`id`,`reset_epoch`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "fsrs_cards_numeric_state_check" CHECK("__new_fsrs_cards"."stability" >= 0 AND "__new_fsrs_cards"."difficulty" >= 0 AND "__new_fsrs_cards"."elapsed_days" >= 0 AND "__new_fsrs_cards"."scheduled_days" >= 0 AND "__new_fsrs_cards"."learning_steps" >= 0 AND "__new_fsrs_cards"."reps" >= 0 AND "__new_fsrs_cards"."lapses" >= 0),
	CONSTRAINT "fsrs_cards_state_check" CHECK("__new_fsrs_cards"."state" BETWEEN 0 AND 3),
	CONSTRAINT "fsrs_cards_revision_check" CHECK("__new_fsrs_cards"."revision" >= 1),
	CONSTRAINT "fsrs_cards_reset_epoch_check" CHECK("__new_fsrs_cards"."reset_epoch" BETWEEN 0 AND 2147483647)
);
--> statement-breakpoint
INSERT INTO `__new_fsrs_cards`("id", "user_id", "enrollment_id", "activation_session_id", "reset_epoch", "content_version", "knowledge_item_type", "knowledge_item_id", "knowledge_item_version", "modality", "scheduler_version", "due_at", "stability", "difficulty", "elapsed_days", "scheduled_days", "learning_steps", "reps", "lapses", "state", "last_review_at", "revision", "created_at", "updated_at") SELECT "id", "user_id", "enrollment_id", NULL, "reset_epoch", "content_version", "knowledge_item_type", "knowledge_item_id", "knowledge_item_version", "modality", "scheduler_version", "due_at", "stability", "difficulty", "elapsed_days", "scheduled_days", "learning_steps", "reps", "lapses", "state", "last_review_at", "revision", "created_at", "updated_at" FROM `fsrs_cards`;--> statement-breakpoint
DROP TABLE `fsrs_cards`;--> statement-breakpoint
ALTER TABLE `__new_fsrs_cards` RENAME TO `fsrs_cards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `fsrs_cards_user_id_uidx` ON `fsrs_cards` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fsrs_cards_user_id_epoch_uidx` ON `fsrs_cards` (`user_id`,`id`,`reset_epoch`);--> statement-breakpoint
CREATE UNIQUE INDEX `fsrs_cards_user_item_modality_uidx` ON `fsrs_cards` (`user_id`,`enrollment_id`,`reset_epoch`,`knowledge_item_type`,`knowledge_item_id`,`knowledge_item_version`,`modality`);--> statement-breakpoint
CREATE INDEX `fsrs_cards_user_due_idx` ON `fsrs_cards` (`user_id`,`reset_epoch`,`due_at`);
