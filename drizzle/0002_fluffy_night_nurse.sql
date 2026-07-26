PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lesson_sessions` (
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
	CONSTRAINT "lesson_sessions_form_all_or_none_check" CHECK(("__new_lesson_sessions"."form_schema_version" IS NULL AND "__new_lesson_sessions"."form_script" IS NULL AND "__new_lesson_sessions"."form_manifest_json" IS NULL AND "__new_lesson_sessions"."form_manifest_hash" IS NULL) OR ("__new_lesson_sessions"."form_schema_version" IS NOT NULL AND "__new_lesson_sessions"."form_script" IS NOT NULL AND "__new_lesson_sessions"."form_manifest_json" IS NOT NULL AND "__new_lesson_sessions"."form_manifest_hash" IS NOT NULL)),
	CONSTRAINT "lesson_sessions_form_schema_version_check" CHECK("__new_lesson_sessions"."form_schema_version" IS NULL OR "__new_lesson_sessions"."form_schema_version" >= 1),
	CONSTRAINT "lesson_sessions_form_script_check" CHECK("__new_lesson_sessions"."form_script" IS NULL OR "__new_lesson_sessions"."form_script" IN ('simplified', 'traditional')),
	CONSTRAINT "lesson_sessions_form_manifest_json_check" CHECK("__new_lesson_sessions"."form_manifest_json" IS NULL OR json_valid("__new_lesson_sessions"."form_manifest_json")),
	CONSTRAINT "lesson_sessions_form_manifest_hash_check" CHECK("__new_lesson_sessions"."form_manifest_hash" IS NULL OR (length("__new_lesson_sessions"."form_manifest_hash") = 71 AND substr("__new_lesson_sessions"."form_manifest_hash", 1, 7) = 'sha256:' AND substr("__new_lesson_sessions"."form_manifest_hash", 8) NOT GLOB '*[^0-9a-f]*')),
	CONSTRAINT "lesson_sessions_score_check" CHECK(("__new_lesson_sessions"."raw_score" IS NULL OR ("__new_lesson_sessions"."raw_score" >= 0 AND "__new_lesson_sessions"."raw_score" <= 100)) AND ("__new_lesson_sessions"."gate_score" IS NULL OR ("__new_lesson_sessions"."gate_score" >= 0 AND "__new_lesson_sessions"."gate_score" <= 100)))
);
--> statement-breakpoint
INSERT INTO `__new_lesson_sessions`("id", "user_id", "enrollment_id", "device_id", "idempotency_record_id", "schema_version", "content_version", "lesson_id", "lesson_version", "expected_evidence_count", "form_schema_version", "form_script", "form_manifest_json", "form_manifest_hash", "status", "raw_score", "gate_score", "required_evidence_count", "required_correct_count", "passed", "started_at", "submitted_at", "created_at") SELECT "id", "user_id", "enrollment_id", "device_id", "idempotency_record_id", "schema_version", "content_version", "lesson_id", "lesson_version", "expected_evidence_count", NULL, NULL, NULL, NULL, "status", "raw_score", "gate_score", "required_evidence_count", "required_correct_count", "passed", "started_at", "submitted_at", "created_at" FROM `lesson_sessions`;--> statement-breakpoint
DROP TABLE `lesson_sessions`;--> statement-breakpoint
ALTER TABLE `__new_lesson_sessions` RENAME TO `lesson_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_sessions_user_id_uidx` ON `lesson_sessions` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_sessions_idempotency_record_uidx` ON `lesson_sessions` (`idempotency_record_id`);--> statement-breakpoint
CREATE INDEX `lesson_sessions_user_lesson_idx` ON `lesson_sessions` (`user_id`,`lesson_id`,`started_at`);
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
