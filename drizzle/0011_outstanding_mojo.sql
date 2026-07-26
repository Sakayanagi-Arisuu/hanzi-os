CREATE TABLE `reader_item_exposures` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`reset_epoch` integer NOT NULL,
	`content_version` text NOT NULL,
	`story_id` text NOT NULL,
	`item_id` text NOT NULL,
	`item_version` text NOT NULL,
	`exposure_group_id` text NOT NULL,
	`equivalent_group_id` text NOT NULL,
	`exposed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`session_id`,`reset_epoch`) REFERENCES `reader_sessions`(`user_id`,`id`,`reset_epoch`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reader_item_exposures_reset_epoch_check" CHECK("reader_item_exposures"."reset_epoch" BETWEEN 0 AND 2147483647)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reader_item_exposures_user_group_uidx` ON `reader_item_exposures` (`user_id`,`exposure_group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reader_item_exposures_user_equivalent_uidx` ON `reader_item_exposures` (`user_id`,`equivalent_group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reader_item_exposures_session_item_uidx` ON `reader_item_exposures` (`user_id`,`session_id`,`item_version`);--> statement-breakpoint
CREATE INDEX `reader_item_exposures_user_story_idx` ON `reader_item_exposures` (`user_id`,`story_id`,`exposed_at`);--> statement-breakpoint
CREATE TABLE `reader_session_attempts` (
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`attempt_id` text NOT NULL,
	`reset_epoch` integer NOT NULL,
	`position` integer NOT NULL,
	`item_id` text NOT NULL,
	`item_version` text NOT NULL,
	`form_manifest_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `session_id`, `attempt_id`),
	FOREIGN KEY (`user_id`,`session_id`,`reset_epoch`) REFERENCES `reader_sessions`(`user_id`,`id`,`reset_epoch`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`attempt_id`,`reset_epoch`) REFERENCES `learning_attempts`(`user_id`,`id`,`reset_epoch`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reader_session_attempts_reset_epoch_check" CHECK("reader_session_attempts"."reset_epoch" BETWEEN 0 AND 2147483647),
	CONSTRAINT "reader_session_attempts_position_check" CHECK("reader_session_attempts"."position" >= 0),
	CONSTRAINT "reader_session_attempts_form_manifest_hash_check" CHECK(length("reader_session_attempts"."form_manifest_hash") = 71 AND substr("reader_session_attempts"."form_manifest_hash", 1, 7) = 'sha256:' AND substr("reader_session_attempts"."form_manifest_hash", 8) NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reader_session_attempts_user_attempt_uidx` ON `reader_session_attempts` (`user_id`,`attempt_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reader_session_attempts_user_session_position_uidx` ON `reader_session_attempts` (`user_id`,`session_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `reader_session_attempts_user_session_item_uidx` ON `reader_session_attempts` (`user_id`,`session_id`,`item_version`);--> statement-breakpoint
CREATE TABLE `reader_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`device_id` text NOT NULL,
	`idempotency_record_id` text NOT NULL,
	`schema_version` integer NOT NULL,
	`reset_epoch` integer DEFAULT 0 NOT NULL,
	`content_version` text NOT NULL,
	`story_id` text NOT NULL,
	`story_version` text NOT NULL,
	`form_version` text NOT NULL,
	`form_schema_version` integer NOT NULL,
	`form_manifest_json` text NOT NULL,
	`form_manifest_hash` text NOT NULL,
	`script` text NOT NULL,
	`support_mode` text NOT NULL,
	`support_policy_version` text NOT NULL,
	`expected_item_count` integer NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`correct_count` integer,
	`started_at` integer NOT NULL,
	`terminal_at` integer,
	`terminal_reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`enrollment_id`) REFERENCES `enrollments`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`device_id`) REFERENCES `devices`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`,`idempotency_record_id`,`reset_epoch`) REFERENCES `idempotency_records`(`user_id`,`id`,`reset_epoch`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "reader_sessions_schema_version_check" CHECK("reader_sessions"."schema_version" >= 1),
	CONSTRAINT "reader_sessions_reset_epoch_check" CHECK("reader_sessions"."reset_epoch" BETWEEN 0 AND 2147483647),
	CONSTRAINT "reader_sessions_form_schema_version_check" CHECK("reader_sessions"."form_schema_version" >= 1),
	CONSTRAINT "reader_sessions_expected_item_count_check" CHECK("reader_sessions"."expected_item_count" > 0),
	CONSTRAINT "reader_sessions_form_manifest_json_check" CHECK(json_valid("reader_sessions"."form_manifest_json")),
	CONSTRAINT "reader_sessions_form_manifest_hash_check" CHECK(length("reader_sessions"."form_manifest_hash") = 71 AND substr("reader_sessions"."form_manifest_hash", 1, 7) = 'sha256:' AND substr("reader_sessions"."form_manifest_hash", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "reader_sessions_script_check" CHECK("reader_sessions"."script" IN ('simplified', 'traditional')),
	CONSTRAINT "reader_sessions_support_mode_check" CHECK("reader_sessions"."support_mode" IN ('assisted', 'unassisted')),
	CONSTRAINT "reader_sessions_status_check" CHECK("reader_sessions"."status" IN ('started', 'submitted', 'abandoned')),
	CONSTRAINT "reader_sessions_result_bounds_check" CHECK("reader_sessions"."correct_count" IS NULL OR "reader_sessions"."correct_count" BETWEEN 0 AND "reader_sessions"."expected_item_count"),
	CONSTRAINT "reader_sessions_terminal_reason_check" CHECK("reader_sessions"."terminal_reason" IS NULL OR "reader_sessions"."terminal_reason" IN ('completed', 'user-exit', 'support-requested', 'superseded', 'reset-invalidated')),
	CONSTRAINT "reader_sessions_state_coherence_check" CHECK("reader_sessions"."started_at" >= "reader_sessions"."created_at" AND (
        ("reader_sessions"."status" = 'started'
          AND "reader_sessions"."correct_count" IS NULL
          AND "reader_sessions"."terminal_at" IS NULL
          AND "reader_sessions"."terminal_reason" IS NULL)
        OR ("reader_sessions"."status" = 'submitted'
          AND "reader_sessions"."correct_count" IS NOT NULL
          AND "reader_sessions"."terminal_at" IS NOT NULL
          AND "reader_sessions"."terminal_at" >= "reader_sessions"."started_at"
          AND "reader_sessions"."terminal_reason" = 'completed')
        OR ("reader_sessions"."status" = 'abandoned'
          AND "reader_sessions"."correct_count" IS NULL
          AND "reader_sessions"."terminal_at" IS NOT NULL
          AND "reader_sessions"."terminal_at" >= "reader_sessions"."started_at"
          AND "reader_sessions"."terminal_reason" IN ('user-exit', 'support-requested', 'superseded', 'reset-invalidated'))
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reader_sessions_user_id_uidx` ON `reader_sessions` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reader_sessions_user_id_epoch_uidx` ON `reader_sessions` (`user_id`,`id`,`reset_epoch`);--> statement-breakpoint
CREATE UNIQUE INDEX `reader_sessions_idempotency_record_uidx` ON `reader_sessions` (`idempotency_record_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reader_sessions_one_started_story_epoch_uidx` ON `reader_sessions` (`user_id`,`reset_epoch`,`content_version`,`story_id`) WHERE "reader_sessions"."status" = 'started';--> statement-breakpoint
CREATE INDEX `reader_sessions_user_terminal_idx` ON `reader_sessions` (`user_id`,`terminal_at`);--> statement-breakpoint
CREATE TRIGGER `reader_sessions_status_transition_update`
BEFORE UPDATE OF `status` ON `reader_sessions`
WHEN OLD.`status` <> NEW.`status`
  AND NOT (
    OLD.`status` = 'started'
    AND NEW.`status` IN ('submitted', 'abandoned')
  )
BEGIN
  SELECT RAISE(ABORT, 'reader session status transition is invalid');
END;--> statement-breakpoint
CREATE TRIGGER `reader_sessions_reset_invalidation`
AFTER UPDATE OF `document_json` ON `learning_documents`
WHEN NEW.`user_id` = OLD.`user_id`
  AND json_valid(OLD.`document_json`) = 1
  AND json_valid(NEW.`document_json`) = 1
  AND json_type(OLD.`document_json`, '$.reset.epoch') = 'integer'
  AND json_type(NEW.`document_json`, '$.reset.epoch') = 'integer'
  AND json_extract(NEW.`document_json`, '$.reset.epoch')
    > json_extract(OLD.`document_json`, '$.reset.epoch')
BEGIN
  UPDATE `reader_sessions`
  SET
    `status` = 'abandoned',
    `terminal_at` = MAX(`started_at`, NEW.`updated_at`),
    `terminal_reason` = 'reset-invalidated'
  WHERE `user_id` = NEW.`user_id`
    AND `status` = 'started'
    AND `reset_epoch`
      < json_extract(NEW.`document_json`, '$.reset.epoch');
END;--> statement-breakpoint
CREATE TRIGGER `outbox_events_reader_epoch_insert`
BEFORE INSERT ON `outbox_events`
WHEN NEW.`aggregate_type` = 'reader_session'
  AND NOT EXISTS (
    SELECT 1 FROM `reader_sessions` parent
    WHERE parent.`user_id` = NEW.`user_id`
      AND parent.`id` = NEW.`aggregate_id`
      AND parent.`reset_epoch` = NEW.`reset_epoch`
  )
BEGIN
  SELECT RAISE(ABORT, 'reader outbox event reset epoch does not match its aggregate');
END;--> statement-breakpoint
CREATE TRIGGER `outbox_events_reader_epoch_update`
BEFORE UPDATE OF `user_id`, `aggregate_type`, `aggregate_id`, `reset_epoch`
ON `outbox_events`
WHEN NEW.`aggregate_type` = 'reader_session'
  AND NOT EXISTS (
    SELECT 1 FROM `reader_sessions` parent
    WHERE parent.`user_id` = NEW.`user_id`
      AND parent.`id` = NEW.`aggregate_id`
      AND parent.`reset_epoch` = NEW.`reset_epoch`
  )
BEGIN
  SELECT RAISE(ABORT, 'reader outbox event reset epoch does not match its aggregate');
END;
