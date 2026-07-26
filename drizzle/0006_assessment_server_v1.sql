CREATE TABLE `assessment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`device_id` text NOT NULL,
	`device_sequence` integer NOT NULL,
	`idempotency_record_id` text NOT NULL,
	`schema_version` integer NOT NULL,
	`reset_epoch` integer NOT NULL,
	`content_version` text NOT NULL,
	`position` integer NOT NULL,
	`item_id` text NOT NULL,
	`item_version` text NOT NULL,
	`skill` text NOT NULL,
	`construct` text NOT NULL,
	`modality` text NOT NULL,
	`measurement_eligible` integer NOT NULL,
	`response_json` text NOT NULL,
	`outcome` text NOT NULL,
	`score` integer NOT NULL,
	`duration_ms` integer,
	`occurred_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`session_id`,`reset_epoch`) REFERENCES `assessment_sessions`(`user_id`,`id`,`reset_epoch`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`device_id`) REFERENCES `devices`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`,`idempotency_record_id`,`reset_epoch`) REFERENCES `idempotency_records`(`user_id`,`id`,`reset_epoch`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "assessment_attempts_schema_version_check" CHECK("assessment_attempts"."schema_version" >= 1),
	CONSTRAINT "assessment_attempts_reset_epoch_check" CHECK("assessment_attempts"."reset_epoch" BETWEEN 0 AND 2147483647),
	CONSTRAINT "assessment_attempts_device_sequence_check" CHECK("assessment_attempts"."device_sequence" >= 1),
	CONSTRAINT "assessment_attempts_position_check" CHECK("assessment_attempts"."position" >= 0),
	CONSTRAINT "assessment_attempts_skill_check" CHECK("assessment_attempts"."skill" IN ('pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar')),
	CONSTRAINT "assessment_attempts_modality_check" CHECK("assessment_attempts"."modality" IN ('visual-selection', 'synthetic-tts-selection')),
	CONSTRAINT "assessment_attempts_response_json_check" CHECK(json_valid("assessment_attempts"."response_json")),
	CONSTRAINT "assessment_attempts_outcome_score_check" CHECK(("assessment_attempts"."outcome" = 'correct' AND "assessment_attempts"."score" = 100) OR ("assessment_attempts"."outcome" = 'incorrect' AND "assessment_attempts"."score" = 0)),
	CONSTRAINT "assessment_attempts_duration_check" CHECK("assessment_attempts"."duration_ms" IS NULL OR "assessment_attempts"."duration_ms" BETWEEN 0 AND 600000),
	CONSTRAINT "assessment_attempts_time_check" CHECK("assessment_attempts"."occurred_at" <= "assessment_attempts"."received_at" + 300000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_attempts_user_id_uidx` ON `assessment_attempts` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_attempts_user_id_epoch_uidx` ON `assessment_attempts` (`user_id`,`id`,`reset_epoch`);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_attempts_idempotency_record_uidx` ON `assessment_attempts` (`idempotency_record_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_attempts_user_device_sequence_uidx` ON `assessment_attempts` (`user_id`,`device_id`,`device_sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_attempts_user_session_item_uidx` ON `assessment_attempts` (`user_id`,`session_id`,`item_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_attempts_user_session_position_uidx` ON `assessment_attempts` (`user_id`,`session_id`,`position`);--> statement-breakpoint
CREATE INDEX `assessment_attempts_session_occurred_idx` ON `assessment_attempts` (`session_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `assessment_item_exposures` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`reset_epoch` integer NOT NULL,
	`content_version` text NOT NULL,
	`item_id` text NOT NULL,
	`item_version` text NOT NULL,
	`exposure_group_id` text NOT NULL,
	`equivalent_group_id` text NOT NULL,
	`form_family_id` text NOT NULL,
	`exposed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`session_id`,`reset_epoch`) REFERENCES `assessment_sessions`(`user_id`,`id`,`reset_epoch`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "assessment_item_exposures_reset_epoch_check" CHECK("assessment_item_exposures"."reset_epoch" BETWEEN 0 AND 2147483647)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_item_exposures_user_group_uidx` ON `assessment_item_exposures` (`user_id`,`exposure_group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_item_exposures_session_item_uidx` ON `assessment_item_exposures` (`user_id`,`session_id`,`item_version`);--> statement-breakpoint
CREATE INDEX `assessment_item_exposures_user_family_idx` ON `assessment_item_exposures` (`user_id`,`form_family_id`,`exposed_at`);--> statement-breakpoint
CREATE TABLE `assessment_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`device_id` text NOT NULL,
	`idempotency_record_id` text NOT NULL,
	`schema_version` integer NOT NULL,
	`reset_epoch` integer DEFAULT 0 NOT NULL,
	`content_version` text NOT NULL,
	`blueprint_id` text NOT NULL,
	`form_version` text NOT NULL,
	`scoring_policy_version` text NOT NULL,
	`expected_item_count` integer NOT NULL,
	`form_schema_version` integer NOT NULL,
	`form_manifest_json` text NOT NULL,
	`form_manifest_hash` text NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`measurement_evidence_count` integer,
	`measurement_correct_count` integer,
	`observed_accuracy` integer,
	`confidence_lower` integer,
	`confidence_upper` integer,
	`started_at` integer NOT NULL,
	`terminal_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`enrollment_id`) REFERENCES `enrollments`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`device_id`) REFERENCES `devices`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`,`idempotency_record_id`,`reset_epoch`) REFERENCES `idempotency_records`(`user_id`,`id`,`reset_epoch`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "assessment_sessions_schema_version_check" CHECK("assessment_sessions"."schema_version" >= 1),
	CONSTRAINT "assessment_sessions_reset_epoch_check" CHECK("assessment_sessions"."reset_epoch" BETWEEN 0 AND 2147483647),
	CONSTRAINT "assessment_sessions_expected_item_count_check" CHECK("assessment_sessions"."expected_item_count" > 0),
	CONSTRAINT "assessment_sessions_form_schema_version_check" CHECK("assessment_sessions"."form_schema_version" >= 1),
	CONSTRAINT "assessment_sessions_form_manifest_json_check" CHECK(json_valid("assessment_sessions"."form_manifest_json")),
	CONSTRAINT "assessment_sessions_form_manifest_hash_check" CHECK(length("assessment_sessions"."form_manifest_hash") = 71 AND substr("assessment_sessions"."form_manifest_hash", 1, 7) = 'sha256:' AND substr("assessment_sessions"."form_manifest_hash", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "assessment_sessions_status_check" CHECK("assessment_sessions"."status" IN ('started', 'submitted', 'abandoned')),
	CONSTRAINT "assessment_sessions_result_bounds_check" CHECK(("assessment_sessions"."measurement_evidence_count" IS NULL OR "assessment_sessions"."measurement_evidence_count" BETWEEN 0 AND "assessment_sessions"."expected_item_count")
        AND ("assessment_sessions"."measurement_correct_count" IS NULL OR "assessment_sessions"."measurement_correct_count" BETWEEN 0 AND "assessment_sessions"."measurement_evidence_count")
        AND ("assessment_sessions"."observed_accuracy" IS NULL OR "assessment_sessions"."observed_accuracy" BETWEEN 0 AND 100)
        AND ("assessment_sessions"."confidence_lower" IS NULL OR "assessment_sessions"."confidence_lower" BETWEEN 0 AND 100)
        AND ("assessment_sessions"."confidence_upper" IS NULL OR "assessment_sessions"."confidence_upper" BETWEEN 0 AND 100)
        AND ("assessment_sessions"."confidence_lower" IS NULL OR "assessment_sessions"."confidence_upper" IS NULL OR "assessment_sessions"."confidence_lower" <= "assessment_sessions"."confidence_upper")),
	CONSTRAINT "assessment_sessions_state_coherence_check" CHECK("assessment_sessions"."started_at" >= "assessment_sessions"."created_at" AND (
        ("assessment_sessions"."status" = 'started'
          AND "assessment_sessions"."measurement_evidence_count" IS NULL
          AND "assessment_sessions"."measurement_correct_count" IS NULL
          AND "assessment_sessions"."observed_accuracy" IS NULL
          AND "assessment_sessions"."confidence_lower" IS NULL
          AND "assessment_sessions"."confidence_upper" IS NULL
          AND "assessment_sessions"."terminal_at" IS NULL)
        OR ("assessment_sessions"."status" = 'submitted'
          AND "assessment_sessions"."measurement_evidence_count" IS NOT NULL
          AND "assessment_sessions"."measurement_correct_count" IS NOT NULL
          AND "assessment_sessions"."terminal_at" IS NOT NULL
          AND "assessment_sessions"."terminal_at" >= "assessment_sessions"."started_at"
          AND (
            ("assessment_sessions"."measurement_evidence_count" = 0
              AND "assessment_sessions"."measurement_correct_count" = 0
              AND "assessment_sessions"."observed_accuracy" IS NULL
              AND "assessment_sessions"."confidence_lower" IS NULL
              AND "assessment_sessions"."confidence_upper" IS NULL)
            OR ("assessment_sessions"."measurement_evidence_count" > 0
              AND "assessment_sessions"."observed_accuracy" IS NOT NULL
              AND "assessment_sessions"."confidence_lower" IS NOT NULL
              AND "assessment_sessions"."confidence_upper" IS NOT NULL)
          ))
        OR ("assessment_sessions"."status" = 'abandoned'
          AND "assessment_sessions"."measurement_evidence_count" IS NULL
          AND "assessment_sessions"."measurement_correct_count" IS NULL
          AND "assessment_sessions"."observed_accuracy" IS NULL
          AND "assessment_sessions"."confidence_lower" IS NULL
          AND "assessment_sessions"."confidence_upper" IS NULL
          AND "assessment_sessions"."terminal_at" IS NOT NULL
          AND "assessment_sessions"."terminal_at" >= "assessment_sessions"."started_at")
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_sessions_user_id_uidx` ON `assessment_sessions` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_sessions_user_id_epoch_uidx` ON `assessment_sessions` (`user_id`,`id`,`reset_epoch`);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_sessions_idempotency_record_uidx` ON `assessment_sessions` (`idempotency_record_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_sessions_one_started_epoch_uidx` ON `assessment_sessions` (`user_id`,`reset_epoch`,`content_version`) WHERE "assessment_sessions"."status" = 'started';--> statement-breakpoint
CREATE INDEX `assessment_sessions_user_terminal_idx` ON `assessment_sessions` (`user_id`,`terminal_at`);--> statement-breakpoint
CREATE TABLE `assessment_skill_results` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`reset_epoch` integer NOT NULL,
	`content_version` text NOT NULL,
	`skill` text NOT NULL,
	`status` text NOT NULL,
	`correct_count` integer NOT NULL,
	`evidence_count` integer NOT NULL,
	`observed_accuracy` integer,
	`confidence_lower` integer,
	`confidence_upper` integer,
	`mastery_eligible` integer DEFAULT false NOT NULL,
	`scoring_policy_version` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`session_id`,`reset_epoch`) REFERENCES `assessment_sessions`(`user_id`,`id`,`reset_epoch`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "assessment_skill_results_reset_epoch_check" CHECK("assessment_skill_results"."reset_epoch" BETWEEN 0 AND 2147483647),
	CONSTRAINT "assessment_skill_results_skill_check" CHECK("assessment_skill_results"."skill" IN ('pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar')),
	CONSTRAINT "assessment_skill_results_status_check" CHECK("assessment_skill_results"."status" IN ('unassessed', 'insufficient', 'observed')),
	CONSTRAINT "assessment_skill_results_counts_check" CHECK("assessment_skill_results"."correct_count" BETWEEN 0 AND "assessment_skill_results"."evidence_count" AND "assessment_skill_results"."evidence_count" >= 0),
	CONSTRAINT "assessment_skill_results_estimate_check" CHECK((
        "assessment_skill_results"."evidence_count" = 0
          AND "assessment_skill_results"."status" = 'unassessed'
          AND "assessment_skill_results"."observed_accuracy" IS NULL
          AND "assessment_skill_results"."confidence_lower" IS NULL
          AND "assessment_skill_results"."confidence_upper" IS NULL
      ) OR (
        "assessment_skill_results"."evidence_count" > 0
          AND "assessment_skill_results"."status" IN ('insufficient', 'observed')
          AND "assessment_skill_results"."observed_accuracy" BETWEEN 0 AND 100
          AND "assessment_skill_results"."confidence_lower" BETWEEN 0 AND 100
          AND "assessment_skill_results"."confidence_upper" BETWEEN 0 AND 100
          AND "assessment_skill_results"."confidence_lower" <= "assessment_skill_results"."confidence_upper"
      )),
	CONSTRAINT "assessment_skill_results_mastery_check" CHECK("assessment_skill_results"."mastery_eligible" = 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_skill_results_user_session_skill_uidx` ON `assessment_skill_results` (`user_id`,`session_id`,`skill`);--> statement-breakpoint
CREATE INDEX `assessment_skill_results_user_skill_idx` ON `assessment_skill_results` (`user_id`,`skill`,`created_at`);--> statement-breakpoint
CREATE TRIGGER `assessment_sessions_status_transition_update`
BEFORE UPDATE OF `status` ON `assessment_sessions`
WHEN OLD.`status` <> NEW.`status`
  AND NOT (
    OLD.`status` = 'started'
    AND NEW.`status` IN ('submitted', 'abandoned')
  )
BEGIN
  SELECT RAISE(ABORT, 'assessment session status transition is invalid');
END;--> statement-breakpoint
CREATE TRIGGER `outbox_events_assessment_epoch_insert`
BEFORE INSERT ON `outbox_events`
WHEN (
  NEW.`aggregate_type` = 'assessment_session'
  AND NOT EXISTS (
    SELECT 1 FROM `assessment_sessions` parent
    WHERE parent.`user_id` = NEW.`user_id`
      AND parent.`id` = NEW.`aggregate_id`
      AND parent.`reset_epoch` = NEW.`reset_epoch`
  )
) OR (
  NEW.`aggregate_type` = 'assessment_attempt'
  AND NOT EXISTS (
    SELECT 1 FROM `assessment_attempts` parent
    WHERE parent.`user_id` = NEW.`user_id`
      AND parent.`id` = NEW.`aggregate_id`
      AND parent.`reset_epoch` = NEW.`reset_epoch`
  )
)
BEGIN
  SELECT RAISE(ABORT, 'assessment outbox event reset epoch does not match its aggregate');
END;--> statement-breakpoint
CREATE TRIGGER `outbox_events_assessment_epoch_update`
BEFORE UPDATE OF `user_id`, `aggregate_type`, `aggregate_id`, `reset_epoch` ON `outbox_events`
WHEN (
  NEW.`aggregate_type` = 'assessment_session'
  AND NOT EXISTS (
    SELECT 1 FROM `assessment_sessions` parent
    WHERE parent.`user_id` = NEW.`user_id`
      AND parent.`id` = NEW.`aggregate_id`
      AND parent.`reset_epoch` = NEW.`reset_epoch`
  )
) OR (
  NEW.`aggregate_type` = 'assessment_attempt'
  AND NOT EXISTS (
    SELECT 1 FROM `assessment_attempts` parent
    WHERE parent.`user_id` = NEW.`user_id`
      AND parent.`id` = NEW.`aggregate_id`
      AND parent.`reset_epoch` = NEW.`reset_epoch`
  )
)
BEGIN
  SELECT RAISE(ABORT, 'assessment outbox event reset epoch does not match its aggregate');
END;
