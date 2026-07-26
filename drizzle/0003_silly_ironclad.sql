PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_fsrs_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
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
	CONSTRAINT "fsrs_cards_numeric_state_check" CHECK("__new_fsrs_cards"."stability" >= 0 AND "__new_fsrs_cards"."difficulty" >= 0 AND "__new_fsrs_cards"."elapsed_days" >= 0 AND "__new_fsrs_cards"."scheduled_days" >= 0 AND "__new_fsrs_cards"."learning_steps" >= 0 AND "__new_fsrs_cards"."reps" >= 0 AND "__new_fsrs_cards"."lapses" >= 0),
	CONSTRAINT "fsrs_cards_state_check" CHECK("__new_fsrs_cards"."state" BETWEEN 0 AND 3),
	CONSTRAINT "fsrs_cards_revision_check" CHECK("__new_fsrs_cards"."revision" >= 1),
	CONSTRAINT "fsrs_cards_reset_epoch_check" CHECK("__new_fsrs_cards"."reset_epoch" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_fsrs_cards`("id", "user_id", "enrollment_id", "reset_epoch", "content_version", "knowledge_item_type", "knowledge_item_id", "knowledge_item_version", "modality", "scheduler_version", "due_at", "stability", "difficulty", "elapsed_days", "scheduled_days", "learning_steps", "reps", "lapses", "state", "last_review_at", "revision", "created_at", "updated_at") SELECT "id", "user_id", "enrollment_id", 0, "content_version", "knowledge_item_type", "knowledge_item_id", "knowledge_item_version", "modality", "scheduler_version", "due_at", "stability", "difficulty", "elapsed_days", "scheduled_days", "learning_steps", "reps", "lapses", "state", "last_review_at", "revision", "created_at", "updated_at" FROM `fsrs_cards`;--> statement-breakpoint
DROP TABLE `fsrs_cards`;--> statement-breakpoint
ALTER TABLE `__new_fsrs_cards` RENAME TO `fsrs_cards`;--> statement-breakpoint
CREATE UNIQUE INDEX `fsrs_cards_user_id_uidx` ON `fsrs_cards` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fsrs_cards_user_item_modality_uidx` ON `fsrs_cards` (`user_id`,`enrollment_id`,`knowledge_item_type`,`knowledge_item_id`,`knowledge_item_version`,`modality`);--> statement-breakpoint
CREATE INDEX `fsrs_cards_user_due_idx` ON `fsrs_cards` (`user_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `__new_idempotency_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text,
	`device_sequence` integer,
	`reset_epoch` integer,
	`scope` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`lease_token` text,
	`lease_expires_at` integer,
	`response_status` integer,
	`response_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`device_id`) REFERENCES `devices`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "idempotency_records_status_check" CHECK("__new_idempotency_records"."status" IN ('processing', 'completed', 'failed')),
	CONSTRAINT "idempotency_records_response_status_check" CHECK("__new_idempotency_records"."response_status" IS NULL OR ("__new_idempotency_records"."response_status" >= 100 AND "__new_idempotency_records"."response_status" <= 599)),
	CONSTRAINT "idempotency_records_lease_pair_check" CHECK(("__new_idempotency_records"."lease_token" IS NULL AND "__new_idempotency_records"."lease_expires_at" IS NULL) OR ("__new_idempotency_records"."lease_token" IS NOT NULL AND "__new_idempotency_records"."lease_expires_at" IS NOT NULL)),
	CONSTRAINT "idempotency_records_device_sequence_check" CHECK(("__new_idempotency_records"."device_id" IS NULL AND "__new_idempotency_records"."device_sequence" IS NULL) OR ("__new_idempotency_records"."device_id" IS NOT NULL AND "__new_idempotency_records"."device_sequence" IS NOT NULL AND "__new_idempotency_records"."device_sequence" >= 1)),
	CONSTRAINT "idempotency_records_reset_epoch_check" CHECK("__new_idempotency_records"."reset_epoch" IS NULL OR "__new_idempotency_records"."reset_epoch" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_idempotency_records`("id", "user_id", "device_id", "device_sequence", "reset_epoch", "scope", "idempotency_key", "request_hash", "status", "lease_token", "lease_expires_at", "response_status", "response_json", "created_at", "updated_at", "completed_at") SELECT "id", "user_id", "device_id", "device_sequence", NULL, "scope", "idempotency_key", "request_hash", "status", "lease_token", "lease_expires_at", "response_status", "response_json", "created_at", "updated_at", "completed_at" FROM `idempotency_records`;--> statement-breakpoint
DROP TABLE `idempotency_records`;--> statement-breakpoint
ALTER TABLE `__new_idempotency_records` RENAME TO `idempotency_records`;--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_records_user_id_uidx` ON `idempotency_records` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_records_user_scope_key_uidx` ON `idempotency_records` (`user_id`,`scope`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_records_user_device_sequence_uidx` ON `idempotency_records` (`user_id`,`device_id`,`device_sequence`);--> statement-breakpoint
CREATE INDEX `idempotency_records_device_idx` ON `idempotency_records` (`device_id`);--> statement-breakpoint
CREATE INDEX `idempotency_records_status_updated_idx` ON `idempotency_records` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `__new_learning_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`session_id` text,
	`device_id` text,
	`device_sequence` integer,
	`idempotency_record_id` text NOT NULL,
	`schema_version` integer NOT NULL,
	`reset_epoch` integer DEFAULT 0 NOT NULL,
	`content_version` text NOT NULL,
	`activity_id` text NOT NULL,
	`activity_version` text NOT NULL,
	`source` text NOT NULL,
	`method` text NOT NULL,
	`skill` text NOT NULL,
	`response_json` text NOT NULL,
	`outcome` text NOT NULL,
	`score` integer,
	`used_hint` integer DEFAULT false NOT NULL,
	`prior_exposure` integer DEFAULT false NOT NULL,
	`required_for_pass` integer DEFAULT false NOT NULL,
	`scoring_version` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`enrollment_id`) REFERENCES `enrollments`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`session_id`) REFERENCES `lesson_sessions`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`,`device_id`) REFERENCES `devices`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`,`idempotency_record_id`) REFERENCES `idempotency_records`(`user_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "learning_attempts_device_sequence_check" CHECK("__new_learning_attempts"."device_sequence" IS NULL OR "__new_learning_attempts"."device_sequence" >= 1),
	CONSTRAINT "learning_attempts_schema_version_check" CHECK("__new_learning_attempts"."schema_version" >= 1),
	CONSTRAINT "learning_attempts_reset_epoch_check" CHECK("__new_learning_attempts"."reset_epoch" >= 0),
	CONSTRAINT "learning_attempts_source_check" CHECK("__new_learning_attempts"."source" IN ('lesson', 'reader', 'writing', 'pronunciation', 'mistake', 'review', 'diagnostic')),
	CONSTRAINT "learning_attempts_skill_check" CHECK("__new_learning_attempts"."skill" IN ('pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar')),
	CONSTRAINT "learning_attempts_outcome_check" CHECK("__new_learning_attempts"."outcome" IN ('correct', 'incorrect', 'completed', 'unverified')),
	CONSTRAINT "learning_attempts_score_check" CHECK("__new_learning_attempts"."score" IS NULL OR ("__new_learning_attempts"."score" >= 0 AND "__new_learning_attempts"."score" <= 100))
);
--> statement-breakpoint
INSERT INTO `__new_learning_attempts`("id", "user_id", "enrollment_id", "session_id", "device_id", "device_sequence", "idempotency_record_id", "schema_version", "reset_epoch", "content_version", "activity_id", "activity_version", "source", "method", "skill", "response_json", "outcome", "score", "used_hint", "prior_exposure", "required_for_pass", "scoring_version", "occurred_at", "received_at") SELECT "id", "user_id", "enrollment_id", "session_id", "device_id", "device_sequence", "idempotency_record_id", "schema_version", 0, "content_version", "activity_id", "activity_version", "source", "method", "skill", "response_json", "outcome", "score", "used_hint", "prior_exposure", "required_for_pass", "scoring_version", "occurred_at", "received_at" FROM `learning_attempts`;--> statement-breakpoint
DROP TABLE `learning_attempts`;--> statement-breakpoint
ALTER TABLE `__new_learning_attempts` RENAME TO `learning_attempts`;--> statement-breakpoint
CREATE UNIQUE INDEX `learning_attempts_user_id_uidx` ON `learning_attempts` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `learning_attempts_idempotency_record_uidx` ON `learning_attempts` (`idempotency_record_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `learning_attempts_user_device_sequence_uidx` ON `learning_attempts` (`user_id`,`device_id`,`device_sequence`);--> statement-breakpoint
CREATE INDEX `learning_attempts_session_occurred_idx` ON `learning_attempts` (`session_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `learning_attempts_user_activity_idx` ON `learning_attempts` (`user_id`,`activity_id`,`activity_version`);--> statement-breakpoint
CREATE TABLE `__new_learning_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`attempt_id` text,
	`session_id` text,
	`schema_version` integer NOT NULL,
	`reset_epoch` integer DEFAULT 0 NOT NULL,
	`policy_version` text NOT NULL,
	`content_version` text NOT NULL,
	`activity_id` text NOT NULL,
	`activity_version` text NOT NULL,
	`source` text NOT NULL,
	`method` text NOT NULL,
	`skill` text NOT NULL,
	`outcome` text NOT NULL,
	`score` integer,
	`verified` integer NOT NULL,
	`mastery_eligible` integer NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` integer NOT NULL,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`enrollment_id`) REFERENCES `enrollments`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`attempt_id`) REFERENCES `learning_attempts`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`session_id`) REFERENCES `lesson_sessions`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "learning_evidence_one_origin_check" CHECK((("__new_learning_evidence"."attempt_id" IS NOT NULL) + ("__new_learning_evidence"."session_id" IS NOT NULL)) = 1),
	CONSTRAINT "learning_evidence_schema_version_check" CHECK("__new_learning_evidence"."schema_version" >= 1),
	CONSTRAINT "learning_evidence_reset_epoch_check" CHECK("__new_learning_evidence"."reset_epoch" >= 0),
	CONSTRAINT "learning_evidence_source_check" CHECK("__new_learning_evidence"."source" IN ('lesson', 'reader', 'writing', 'pronunciation', 'mistake', 'review', 'diagnostic')),
	CONSTRAINT "learning_evidence_skill_check" CHECK("__new_learning_evidence"."skill" IN ('pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar')),
	CONSTRAINT "learning_evidence_outcome_check" CHECK("__new_learning_evidence"."outcome" IN ('correct', 'incorrect', 'completed', 'unverified')),
	CONSTRAINT "learning_evidence_score_check" CHECK("__new_learning_evidence"."score" IS NULL OR ("__new_learning_evidence"."score" >= 0 AND "__new_learning_evidence"."score" <= 100)),
	CONSTRAINT "learning_evidence_mastery_eligibility_check" CHECK("__new_learning_evidence"."mastery_eligible" = 0 OR ("__new_learning_evidence"."verified" = 1 AND "__new_learning_evidence"."outcome" IN ('correct', 'incorrect')))
);
--> statement-breakpoint
INSERT INTO `__new_learning_evidence`("id", "user_id", "enrollment_id", "attempt_id", "session_id", "schema_version", "reset_epoch", "policy_version", "content_version", "activity_id", "activity_version", "source", "method", "skill", "outcome", "score", "verified", "mastery_eligible", "metadata_json", "occurred_at", "recorded_at") SELECT "id", "user_id", "enrollment_id", "attempt_id", "session_id", "schema_version", 0, "policy_version", "content_version", "activity_id", "activity_version", "source", "method", "skill", "outcome", "score", "verified", "mastery_eligible", "metadata_json", "occurred_at", "recorded_at" FROM `learning_evidence`;--> statement-breakpoint
DROP TABLE `learning_evidence`;--> statement-breakpoint
ALTER TABLE `__new_learning_evidence` RENAME TO `learning_evidence`;--> statement-breakpoint
CREATE UNIQUE INDEX `learning_evidence_attempt_skill_policy_uidx` ON `learning_evidence` (`attempt_id`,`skill`,`policy_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `learning_evidence_session_method_policy_uidx` ON `learning_evidence` (`session_id`,`method`,`policy_version`);--> statement-breakpoint
CREATE INDEX `learning_evidence_user_skill_occurred_idx` ON `learning_evidence` (`user_id`,`skill`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `learning_evidence_user_activity_idx` ON `learning_evidence` (`user_id`,`activity_id`,`activity_version`);--> statement-breakpoint
CREATE TABLE `__new_lesson_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`device_id` text,
	`idempotency_record_id` text NOT NULL,
	`schema_version` integer NOT NULL,
	`reset_epoch` integer DEFAULT 0 NOT NULL,
	`content_version` text NOT NULL,
	`lesson_id` text NOT NULL,
	`lesson_version` text NOT NULL,
	`expected_evidence_count` integer NOT NULL,
	`form_schema_version` integer,
	`form_script` text,
	`form_manifest_json` text,
	`form_manifest_hash` text,
	`status` text DEFAULT 'started' NOT NULL,
	`raw_score` integer,
	`gate_score` integer,
	`required_evidence_count` integer,
	`required_correct_count` integer,
	`passed` integer,
	`started_at` integer NOT NULL,
	`submitted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`enrollment_id`) REFERENCES `enrollments`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`device_id`) REFERENCES `devices`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`,`idempotency_record_id`) REFERENCES `idempotency_records`(`user_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "lesson_sessions_status_check" CHECK("__new_lesson_sessions"."status" IN ('started', 'submitted', 'abandoned', 'invalidated')),
	CONSTRAINT "lesson_sessions_expected_evidence_count_check" CHECK("__new_lesson_sessions"."expected_evidence_count" > 0),
	CONSTRAINT "lesson_sessions_reset_epoch_check" CHECK("__new_lesson_sessions"."reset_epoch" >= 0),
	CONSTRAINT "lesson_sessions_form_all_or_none_check" CHECK(("__new_lesson_sessions"."form_schema_version" IS NULL AND "__new_lesson_sessions"."form_script" IS NULL AND "__new_lesson_sessions"."form_manifest_json" IS NULL AND "__new_lesson_sessions"."form_manifest_hash" IS NULL) OR ("__new_lesson_sessions"."form_schema_version" IS NOT NULL AND "__new_lesson_sessions"."form_script" IS NOT NULL AND "__new_lesson_sessions"."form_manifest_json" IS NOT NULL AND "__new_lesson_sessions"."form_manifest_hash" IS NOT NULL)),
	CONSTRAINT "lesson_sessions_form_schema_version_check" CHECK("__new_lesson_sessions"."form_schema_version" IS NULL OR "__new_lesson_sessions"."form_schema_version" >= 1),
	CONSTRAINT "lesson_sessions_form_script_check" CHECK("__new_lesson_sessions"."form_script" IS NULL OR "__new_lesson_sessions"."form_script" IN ('simplified', 'traditional')),
	CONSTRAINT "lesson_sessions_form_manifest_json_check" CHECK("__new_lesson_sessions"."form_manifest_json" IS NULL OR json_valid("__new_lesson_sessions"."form_manifest_json")),
	CONSTRAINT "lesson_sessions_form_manifest_hash_check" CHECK("__new_lesson_sessions"."form_manifest_hash" IS NULL OR (length("__new_lesson_sessions"."form_manifest_hash") = 71 AND substr("__new_lesson_sessions"."form_manifest_hash", 1, 7) = 'sha256:' AND substr("__new_lesson_sessions"."form_manifest_hash", 8) NOT GLOB '*[^0-9a-f]*')),
	CONSTRAINT "lesson_sessions_score_check" CHECK(("__new_lesson_sessions"."raw_score" IS NULL OR ("__new_lesson_sessions"."raw_score" >= 0 AND "__new_lesson_sessions"."raw_score" <= 100)) AND ("__new_lesson_sessions"."gate_score" IS NULL OR ("__new_lesson_sessions"."gate_score" >= 0 AND "__new_lesson_sessions"."gate_score" <= 100)))
);
--> statement-breakpoint
INSERT INTO `__new_lesson_sessions`("id", "user_id", "enrollment_id", "device_id", "idempotency_record_id", "schema_version", "reset_epoch", "content_version", "lesson_id", "lesson_version", "expected_evidence_count", "form_schema_version", "form_script", "form_manifest_json", "form_manifest_hash", "status", "raw_score", "gate_score", "required_evidence_count", "required_correct_count", "passed", "started_at", "submitted_at", "created_at") SELECT "id", "user_id", "enrollment_id", "device_id", "idempotency_record_id", "schema_version", 0, "content_version", "lesson_id", "lesson_version", "expected_evidence_count", "form_schema_version", "form_script", "form_manifest_json", "form_manifest_hash", "status", "raw_score", "gate_score", "required_evidence_count", "required_correct_count", "passed", "started_at", "submitted_at", "created_at" FROM `lesson_sessions`;--> statement-breakpoint
DROP TABLE `lesson_sessions`;--> statement-breakpoint
ALTER TABLE `__new_lesson_sessions` RENAME TO `lesson_sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_sessions_user_id_uidx` ON `lesson_sessions` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_sessions_idempotency_record_uidx` ON `lesson_sessions` (`idempotency_record_id`);--> statement-breakpoint
CREATE INDEX `lesson_sessions_user_lesson_idx` ON `lesson_sessions` (`user_id`,`lesson_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `__new_outbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`aggregate_type` text NOT NULL,
	`aggregate_id` text NOT NULL,
	`event_type` text NOT NULL,
	`schema_version` integer NOT NULL,
	`reset_epoch` integer DEFAULT 0 NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`published_at` integer,
	`last_error` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "outbox_events_status_check" CHECK("__new_outbox_events"."status" IN ('pending', 'processing', 'published', 'dead')),
	CONSTRAINT "outbox_events_attempts_check" CHECK("__new_outbox_events"."attempts" >= 0),
	CONSTRAINT "outbox_events_schema_version_check" CHECK("__new_outbox_events"."schema_version" >= 1),
	CONSTRAINT "outbox_events_reset_epoch_check" CHECK("__new_outbox_events"."reset_epoch" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_outbox_events`("id", "user_id", "aggregate_type", "aggregate_id", "event_type", "schema_version", "reset_epoch", "payload_json", "status", "attempts", "available_at", "created_at", "published_at", "last_error") SELECT "id", "user_id", "aggregate_type", "aggregate_id", "event_type", "schema_version", 0, "payload_json", "status", "attempts", "available_at", "created_at", "published_at", "last_error" FROM `outbox_events`;--> statement-breakpoint
DROP TABLE `outbox_events`;--> statement-breakpoint
ALTER TABLE `__new_outbox_events` RENAME TO `outbox_events`;--> statement-breakpoint
CREATE INDEX `outbox_events_status_available_idx` ON `outbox_events` (`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `outbox_events_user_created_idx` ON `outbox_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_review_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`attempt_id` text,
	`idempotency_record_id` text NOT NULL,
	`reset_epoch` integer DEFAULT 0 NOT NULL,
	`rating` integer NOT NULL,
	`scheduler_version` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`reviewed_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	`duration_ms` integer,
	`pre_card_json` text NOT NULL,
	`post_card_json` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`card_id`) REFERENCES `fsrs_cards`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`attempt_id`) REFERENCES `learning_attempts`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`,`idempotency_record_id`) REFERENCES `idempotency_records`(`user_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "review_logs_rating_check" CHECK("__new_review_logs"."rating" BETWEEN 1 AND 4),
	CONSTRAINT "review_logs_duration_check" CHECK("__new_review_logs"."duration_ms" IS NULL OR "__new_review_logs"."duration_ms" >= 0),
	CONSTRAINT "review_logs_reset_epoch_check" CHECK("__new_review_logs"."reset_epoch" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_review_logs`("id", "user_id", "card_id", "attempt_id", "idempotency_record_id", "reset_epoch", "rating", "scheduler_version", "scheduled_at", "reviewed_at", "received_at", "duration_ms", "pre_card_json", "post_card_json") SELECT "id", "user_id", "card_id", "attempt_id", "idempotency_record_id", 0, "rating", "scheduler_version", "scheduled_at", "reviewed_at", "received_at", "duration_ms", "pre_card_json", "post_card_json" FROM `review_logs`;--> statement-breakpoint
DROP TABLE `review_logs`;--> statement-breakpoint
ALTER TABLE `__new_review_logs` RENAME TO `review_logs`;--> statement-breakpoint
CREATE UNIQUE INDEX `review_logs_idempotency_record_uidx` ON `review_logs` (`idempotency_record_id`);--> statement-breakpoint
CREATE INDEX `review_logs_card_reviewed_idx` ON `review_logs` (`card_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `__new_xp_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text,
	`idempotency_record_id` text NOT NULL,
	`reset_epoch` integer DEFAULT 0 NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`rule_version` text NOT NULL,
	`amount` integer NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`enrollment_id`) REFERENCES `enrollments`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`,`idempotency_record_id`) REFERENCES `idempotency_records`(`user_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "xp_ledger_reset_epoch_check" CHECK("__new_xp_ledger"."reset_epoch" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_xp_ledger`("id", "user_id", "enrollment_id", "idempotency_record_id", "reset_epoch", "source_type", "source_id", "rule_version", "amount", "metadata_json", "occurred_at", "created_at") SELECT "id", "user_id", "enrollment_id", "idempotency_record_id", 0, "source_type", "source_id", "rule_version", "amount", "metadata_json", "occurred_at", "created_at" FROM `xp_ledger`;--> statement-breakpoint
DROP TABLE `xp_ledger`;--> statement-breakpoint
ALTER TABLE `__new_xp_ledger` RENAME TO `xp_ledger`;--> statement-breakpoint
CREATE UNIQUE INDEX `xp_ledger_user_source_rule_uidx` ON `xp_ledger` (`user_id`,`source_type`,`source_id`,`rule_version`);--> statement-breakpoint
CREATE INDEX `xp_ledger_user_occurred_idx` ON `xp_ledger` (`user_id`,`occurred_at`);
--> statement-breakpoint
UPDATE `idempotency_records`
SET `reset_epoch` = 0
WHERE `reset_epoch` IS NULL
  AND (
    `scope` IN ('lesson-session-v1', 'learning-attempt-v1', 'lesson-session-submit-v1')
    OR EXISTS (SELECT 1 FROM `lesson_sessions` WHERE `idempotency_record_id` = `idempotency_records`.`id`)
    OR EXISTS (SELECT 1 FROM `learning_attempts` WHERE `idempotency_record_id` = `idempotency_records`.`id`)
    OR EXISTS (SELECT 1 FROM `review_logs` WHERE `idempotency_record_id` = `idempotency_records`.`id`)
    OR EXISTS (SELECT 1 FROM `xp_ledger` WHERE `idempotency_record_id` = `idempotency_records`.`id`)
  );
--> statement-breakpoint
UPDATE `lesson_sessions`
SET `status` = 'invalidated',
    `raw_score` = NULL,
    `gate_score` = NULL,
    `required_evidence_count` = NULL,
    `required_correct_count` = NULL,
    `passed` = NULL,
    `submitted_at` = NULL
WHERE `status` = 'started'
  AND EXISTS (
    SELECT 1
    FROM `learning_documents`
    WHERE `learning_documents`.`user_id` = `lesson_sessions`.`user_id`
      AND json_valid(`learning_documents`.`document_json`) = 1
      AND json_type(`learning_documents`.`document_json`, '$.reset.epoch') = 'integer'
      AND json_extract(`learning_documents`.`document_json`, '$.reset.epoch')
        BETWEEN 1 AND 2147483647
      AND json_extract(`learning_documents`.`document_json`, '$.reset.epoch')
        > `lesson_sessions`.`reset_epoch`
  );
--> statement-breakpoint
UPDATE `outbox_events`
SET `status` = 'dead',
    `last_error` = 'invalidated-by-learning-reset-migration'
WHERE `status` IN ('pending', 'processing')
  AND EXISTS (
    SELECT 1
    FROM `learning_documents`
    WHERE `learning_documents`.`user_id` = `outbox_events`.`user_id`
      AND json_valid(`learning_documents`.`document_json`) = 1
      AND json_type(`learning_documents`.`document_json`, '$.reset.epoch') = 'integer'
      AND json_extract(`learning_documents`.`document_json`, '$.reset.epoch')
        BETWEEN 1 AND 2147483647
      AND json_extract(`learning_documents`.`document_json`, '$.reset.epoch')
        > `outbox_events`.`reset_epoch`
  );
--> statement-breakpoint
CREATE TRIGGER `learning_attempts_session_activity_once_insert`
BEFORE INSERT ON `learning_attempts`
WHEN NEW.`session_id` IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM `learning_attempts` existing
    WHERE existing.`user_id` = NEW.`user_id`
      AND existing.`session_id` = NEW.`session_id`
      AND existing.`activity_id` = NEW.`activity_id`
  )
BEGIN
  SELECT RAISE(ABORT, 'a lesson form activity may be attempted only once per session');
END;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
