CREATE TABLE `auth_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_subject` text NOT NULL,
	`normalized_email` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_identities_provider_subject_uidx` ON `auth_identities` (`provider`,`provider_subject`);--> statement-breakpoint
CREATE INDEX `auth_identities_user_idx` ON `auth_identities` (`user_id`);--> statement-breakpoint
CREATE TABLE `course_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`schema_version` integer NOT NULL,
	`manifest_hash` text NOT NULL,
	`release_state` text NOT NULL,
	`linguistic_review_status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`published_at` integer,
	`retired_at` integer,
	CONSTRAINT "course_versions_schema_version_check" CHECK("course_versions"."schema_version" >= 1),
	CONSTRAINT "course_versions_release_state_check" CHECK("course_versions"."release_state" IN ('draft', 'review', 'beta', 'published', 'retired')),
	CONSTRAINT "course_versions_linguistic_review_status_check" CHECK("course_versions"."linguistic_review_status" IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `course_versions_course_release_idx` ON `course_versions` (`course_id`,`release_state`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`installation_id` text NOT NULL,
	`label` text,
	`platform` text,
	`last_acked_cursor` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "devices_last_acked_cursor_check" CHECK("devices"."last_acked_cursor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_user_id_uidx` ON `devices` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_user_installation_uidx` ON `devices` (`user_id`,`installation_id`);--> statement-breakpoint
CREATE INDEX `devices_user_last_seen_idx` ON `devices` (`user_id`,`last_seen_at`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_version_id` text NOT NULL,
	`goal` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`supersedes_enrollment_id` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`started_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_version_id`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`,`supersedes_enrollment_id`) REFERENCES `enrollments`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enrollments_goal_check" CHECK("enrollments"."goal" IN ('conversation', 'hsk', 'career', 'travel')),
	CONSTRAINT "enrollments_status_check" CHECK("enrollments"."status" IN ('active', 'paused', 'completed', 'archived')),
	CONSTRAINT "enrollments_revision_check" CHECK("enrollments"."revision" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_user_id_uidx` ON `enrollments` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_user_course_version_uidx` ON `enrollments` (`user_id`,`course_version_id`);--> statement-breakpoint
CREATE INDEX `enrollments_user_status_idx` ON `enrollments` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `fsrs_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
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
	CONSTRAINT "fsrs_cards_numeric_state_check" CHECK("fsrs_cards"."stability" >= 0 AND "fsrs_cards"."difficulty" >= 0 AND "fsrs_cards"."elapsed_days" >= 0 AND "fsrs_cards"."scheduled_days" >= 0 AND "fsrs_cards"."learning_steps" >= 0 AND "fsrs_cards"."reps" >= 0 AND "fsrs_cards"."lapses" >= 0),
	CONSTRAINT "fsrs_cards_state_check" CHECK("fsrs_cards"."state" BETWEEN 0 AND 3),
	CONSTRAINT "fsrs_cards_revision_check" CHECK("fsrs_cards"."revision" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fsrs_cards_user_id_uidx` ON `fsrs_cards` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fsrs_cards_user_item_modality_uidx` ON `fsrs_cards` (`user_id`,`enrollment_id`,`knowledge_item_type`,`knowledge_item_id`,`knowledge_item_version`,`modality`);--> statement-breakpoint
CREATE INDEX `fsrs_cards_user_due_idx` ON `fsrs_cards` (`user_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `idempotency_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text,
	`device_sequence` integer,
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
	CONSTRAINT "idempotency_records_status_check" CHECK("idempotency_records"."status" IN ('processing', 'completed', 'failed')),
	CONSTRAINT "idempotency_records_response_status_check" CHECK("idempotency_records"."response_status" IS NULL OR ("idempotency_records"."response_status" >= 100 AND "idempotency_records"."response_status" <= 599)),
	CONSTRAINT "idempotency_records_lease_pair_check" CHECK(("idempotency_records"."lease_token" IS NULL AND "idempotency_records"."lease_expires_at" IS NULL) OR ("idempotency_records"."lease_token" IS NOT NULL AND "idempotency_records"."lease_expires_at" IS NOT NULL)),
	CONSTRAINT "idempotency_records_device_sequence_check" CHECK(("idempotency_records"."device_id" IS NULL AND "idempotency_records"."device_sequence" IS NULL) OR ("idempotency_records"."device_id" IS NOT NULL AND "idempotency_records"."device_sequence" IS NOT NULL AND "idempotency_records"."device_sequence" >= 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_records_user_id_uidx` ON `idempotency_records` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_records_user_scope_key_uidx` ON `idempotency_records` (`user_id`,`scope`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_records_user_device_sequence_uidx` ON `idempotency_records` (`user_id`,`device_id`,`device_sequence`);--> statement-breakpoint
CREATE INDEX `idempotency_records_device_idx` ON `idempotency_records` (`device_id`);--> statement-breakpoint
CREATE INDEX `idempotency_records_status_updated_idx` ON `idempotency_records` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `learning_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`session_id` text,
	`device_id` text,
	`device_sequence` integer,
	`idempotency_record_id` text NOT NULL,
	`schema_version` integer NOT NULL,
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
	CONSTRAINT "learning_attempts_device_sequence_check" CHECK("learning_attempts"."device_sequence" IS NULL OR "learning_attempts"."device_sequence" >= 1),
	CONSTRAINT "learning_attempts_schema_version_check" CHECK("learning_attempts"."schema_version" >= 1),
	CONSTRAINT "learning_attempts_source_check" CHECK("learning_attempts"."source" IN ('lesson', 'reader', 'writing', 'pronunciation', 'mistake', 'review', 'diagnostic')),
	CONSTRAINT "learning_attempts_skill_check" CHECK("learning_attempts"."skill" IN ('pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar')),
	CONSTRAINT "learning_attempts_outcome_check" CHECK("learning_attempts"."outcome" IN ('correct', 'incorrect', 'completed', 'unverified')),
	CONSTRAINT "learning_attempts_score_check" CHECK("learning_attempts"."score" IS NULL OR ("learning_attempts"."score" >= 0 AND "learning_attempts"."score" <= 100))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_attempts_user_id_uidx` ON `learning_attempts` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `learning_attempts_idempotency_record_uidx` ON `learning_attempts` (`idempotency_record_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `learning_attempts_user_device_sequence_uidx` ON `learning_attempts` (`user_id`,`device_id`,`device_sequence`);--> statement-breakpoint
CREATE INDEX `learning_attempts_session_occurred_idx` ON `learning_attempts` (`session_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `learning_attempts_user_activity_idx` ON `learning_attempts` (`user_id`,`activity_id`,`activity_version`);--> statement-breakpoint
CREATE TABLE `learning_documents` (
	`user_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`document_json` text NOT NULL,
	`schema_version` integer NOT NULL,
	`content_version` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_version`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "learning_documents_revision_check" CHECK("learning_documents"."revision" >= 0),
	CONSTRAINT "learning_documents_schema_version_check" CHECK("learning_documents"."schema_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE `learning_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`attempt_id` text,
	`session_id` text,
	`schema_version` integer NOT NULL,
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
	CONSTRAINT "learning_evidence_one_origin_check" CHECK((("learning_evidence"."attempt_id" IS NOT NULL) + ("learning_evidence"."session_id" IS NOT NULL)) = 1),
	CONSTRAINT "learning_evidence_schema_version_check" CHECK("learning_evidence"."schema_version" >= 1),
	CONSTRAINT "learning_evidence_source_check" CHECK("learning_evidence"."source" IN ('lesson', 'reader', 'writing', 'pronunciation', 'mistake', 'review', 'diagnostic')),
	CONSTRAINT "learning_evidence_skill_check" CHECK("learning_evidence"."skill" IN ('pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar')),
	CONSTRAINT "learning_evidence_outcome_check" CHECK("learning_evidence"."outcome" IN ('correct', 'incorrect', 'completed', 'unverified')),
	CONSTRAINT "learning_evidence_score_check" CHECK("learning_evidence"."score" IS NULL OR ("learning_evidence"."score" >= 0 AND "learning_evidence"."score" <= 100)),
	CONSTRAINT "learning_evidence_mastery_eligibility_check" CHECK("learning_evidence"."mastery_eligible" = 0 OR ("learning_evidence"."verified" = 1 AND "learning_evidence"."outcome" IN ('correct', 'incorrect')))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_evidence_attempt_skill_policy_uidx` ON `learning_evidence` (`attempt_id`,`skill`,`policy_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `learning_evidence_session_method_policy_uidx` ON `learning_evidence` (`session_id`,`method`,`policy_version`);--> statement-breakpoint
CREATE INDEX `learning_evidence_user_skill_occurred_idx` ON `learning_evidence` (`user_id`,`skill`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `learning_evidence_user_activity_idx` ON `learning_evidence` (`user_id`,`activity_id`,`activity_version`);--> statement-breakpoint
CREATE TABLE `lesson_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`device_id` text,
	`idempotency_record_id` text NOT NULL,
	`schema_version` integer NOT NULL,
	`content_version` text NOT NULL,
	`lesson_id` text NOT NULL,
	`lesson_version` text NOT NULL,
	`expected_evidence_count` integer NOT NULL,
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
	CONSTRAINT "lesson_sessions_status_check" CHECK("lesson_sessions"."status" IN ('started', 'submitted', 'abandoned', 'invalidated')),
	CONSTRAINT "lesson_sessions_expected_evidence_count_check" CHECK("lesson_sessions"."expected_evidence_count" > 0),
	CONSTRAINT "lesson_sessions_score_check" CHECK(("lesson_sessions"."raw_score" IS NULL OR ("lesson_sessions"."raw_score" >= 0 AND "lesson_sessions"."raw_score" <= 100)) AND ("lesson_sessions"."gate_score" IS NULL OR ("lesson_sessions"."gate_score" >= 0 AND "lesson_sessions"."gate_score" <= 100)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_sessions_user_id_uidx` ON `lesson_sessions` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_sessions_idempotency_record_uidx` ON `lesson_sessions` (`idempotency_record_id`);--> statement-breakpoint
CREATE INDEX `lesson_sessions_user_lesson_idx` ON `lesson_sessions` (`user_id`,`lesson_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `local_import_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`idempotency_record_id` text NOT NULL,
	`installation_id` text NOT NULL,
	`source_schema_version` integer NOT NULL,
	`source_content_version` text,
	`snapshot_hash` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`imported_counts_json` text DEFAULT '{}' NOT NULL,
	`warnings_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`idempotency_record_id`) REFERENCES `idempotency_records`(`user_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "local_import_receipts_schema_version_check" CHECK("local_import_receipts"."source_schema_version" >= 1),
	CONSTRAINT "local_import_receipts_status_check" CHECK("local_import_receipts"."status" IN ('processing', 'completed', 'completed_with_warnings', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `local_import_receipts_user_snapshot_uidx` ON `local_import_receipts` (`user_id`,`snapshot_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `local_import_receipts_idempotency_record_uidx` ON `local_import_receipts` (`idempotency_record_id`);--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`aggregate_type` text NOT NULL,
	`aggregate_id` text NOT NULL,
	`event_type` text NOT NULL,
	`schema_version` integer NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`published_at` integer,
	`last_error` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "outbox_events_status_check" CHECK("outbox_events"."status" IN ('pending', 'processing', 'published', 'dead')),
	CONSTRAINT "outbox_events_attempts_check" CHECK("outbox_events"."attempts" >= 0),
	CONSTRAINT "outbox_events_schema_version_check" CHECK("outbox_events"."schema_version" >= 1)
);
--> statement-breakpoint
CREATE INDEX `outbox_events_status_available_idx` ON `outbox_events` (`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `outbox_events_user_created_idx` ON `outbox_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
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
	CONSTRAINT "profiles_goal_check" CHECK("profiles"."goal" IN ('conversation', 'hsk', 'career', 'travel')),
	CONSTRAINT "profiles_daily_minutes_check" CHECK("profiles"."daily_minutes" IN (10, 20, 30)),
	CONSTRAINT "profiles_script_check" CHECK("profiles"."script" IN ('simplified', 'traditional')),
	CONSTRAINT "profiles_starting_level_check" CHECK("profiles"."starting_level" IN ('zero', 'basic', 'hsk1', 'hsk2')),
	CONSTRAINT "profiles_revision_check" CHECK("profiles"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`attempt_id` text,
	`idempotency_record_id` text NOT NULL,
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
	CONSTRAINT "review_logs_rating_check" CHECK("review_logs"."rating" BETWEEN 1 AND 4),
	CONSTRAINT "review_logs_duration_check" CHECK("review_logs"."duration_ms" IS NULL OR "review_logs"."duration_ms" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_logs_idempotency_record_uidx` ON `review_logs` (`idempotency_record_id`);--> statement-breakpoint
CREATE INDEX `review_logs_card_reviewed_idx` ON `review_logs` (`card_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `sync_changes` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`revision` integer NOT NULL,
	`operation_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload_json` text,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sync_changes_revision_check" CHECK("sync_changes"."revision" >= 0),
	CONSTRAINT "sync_changes_operation_check" CHECK("sync_changes"."operation" IN ('upsert', 'delete'))
);
--> statement-breakpoint
CREATE INDEX `sync_changes_user_seq_idx` ON `sync_changes` (`user_id`,`seq`);--> statement-breakpoint
CREATE UNIQUE INDEX `sync_changes_user_operation_uidx` ON `sync_changes` (`user_id`,`operation_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "users_status_check" CHECK("users"."status" IN ('active', 'deletion_pending', 'deleted'))
);
--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE TABLE `xp_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text,
	`idempotency_record_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`rule_version` text NOT NULL,
	`amount` integer NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`enrollment_id`) REFERENCES `enrollments`(`user_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`,`idempotency_record_id`) REFERENCES `idempotency_records`(`user_id`,`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `xp_ledger_user_source_rule_uidx` ON `xp_ledger` (`user_id`,`source_type`,`source_id`,`rule_version`);--> statement-breakpoint
CREATE INDEX `xp_ledger_user_occurred_idx` ON `xp_ledger` (`user_id`,`occurred_at`);