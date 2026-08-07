CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`stable_key` text NOT NULL,
	`item_type` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_items_type_check" CHECK("content_items"."item_type" IN ('vocabulary', 'character', 'grammar', 'lesson', 'exam_item')),
	CONSTRAINT "content_items_stable_key_check" CHECK(length("content_items"."stable_key") BETWEEN 3 AND 160
        AND "content_items"."stable_key" NOT GLOB '*[^a-z0-9._:-]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_items_stable_key_uidx` ON `content_items` (`stable_key`);--> statement-breakpoint
CREATE INDEX `content_items_type_updated_idx` ON `content_items` (`item_type`,`updated_at`);--> statement-breakpoint
CREATE TABLE `content_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`revision` integer NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`workflow_state` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`level` text NOT NULL,
	`content_json` text NOT NULL,
	`content_sha256` text NOT NULL,
	`validation_json` text,
	`validation_sha256` text,
	`based_on_revision_id` text,
	`row_version` integer DEFAULT 1 NOT NULL,
	`author_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`published_at` integer,
	`archived_at` integer,
	FOREIGN KEY (`item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`based_on_revision_id`) REFERENCES `content_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_revisions_revision_check" CHECK("content_revisions"."revision" >= 1),
	CONSTRAINT "content_revisions_schema_check" CHECK("content_revisions"."schema_version" = 1),
	CONSTRAINT "content_revisions_row_version_check" CHECK("content_revisions"."row_version" >= 1),
	CONSTRAINT "content_revisions_state_check" CHECK("content_revisions"."workflow_state" IN ('draft', 'validated', 'submitted', 'approved', 'published', 'archived')),
	CONSTRAINT "content_revisions_level_check" CHECK("content_revisions"."level" IN ('hsk0', 'hsk1', 'hsk2', 'hsk3', 'hsk4')),
	CONSTRAINT "content_revisions_title_check" CHECK(length("content_revisions"."title") BETWEEN 1 AND 240),
	CONSTRAINT "content_revisions_content_check" CHECK(json_valid("content_revisions"."content_json")
        AND length(CAST("content_revisions"."content_json" AS BLOB)) BETWEEN 2 AND 1048576),
	CONSTRAINT "content_revisions_content_digest_check" CHECK(length("content_revisions"."content_sha256") = 71
        AND substr("content_revisions"."content_sha256", 1, 7) = 'sha256:'
        AND substr("content_revisions"."content_sha256", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "content_revisions_validation_check" CHECK((
          "content_revisions"."validation_json" IS NULL
          AND "content_revisions"."validation_sha256" IS NULL
        ) OR (
          json_valid("content_revisions"."validation_json")
          AND length(CAST("content_revisions"."validation_json" AS BLOB)) BETWEEN 2 AND 131072
          AND length("content_revisions"."validation_sha256") = 71
          AND substr("content_revisions"."validation_sha256", 1, 7) = 'sha256:'
          AND substr("content_revisions"."validation_sha256", 8) NOT GLOB '*[^0-9a-f]*'
        )),
	CONSTRAINT "content_revisions_validated_state_check" CHECK("content_revisions"."workflow_state" = 'draft' OR (
        "content_revisions"."validation_json" IS NOT NULL
        AND json_extract("content_revisions"."validation_json", '$.valid') = 1
      )),
	CONSTRAINT "content_revisions_publication_time_check" CHECK((
          "content_revisions"."workflow_state" IN ('published', 'archived')
          AND "content_revisions"."published_at" IS NOT NULL
        ) OR (
          "content_revisions"."workflow_state" NOT IN ('published', 'archived')
          AND "content_revisions"."published_at" IS NULL
        )),
	CONSTRAINT "content_revisions_archive_time_check" CHECK(("content_revisions"."workflow_state" = 'archived' AND "content_revisions"."archived_at" IS NOT NULL)
        OR ("content_revisions"."workflow_state" <> 'archived' AND "content_revisions"."archived_at" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_revisions_item_revision_uidx` ON `content_revisions` (`item_id`,`revision`);--> statement-breakpoint
CREATE INDEX `content_revisions_state_type_idx` ON `content_revisions` (`workflow_state`,`level`);--> statement-breakpoint
CREATE TABLE `content_workflow_events` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`from_state` text,
	`to_state` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`actor_session_id` text,
	`idempotency_key` text NOT NULL,
	`request_sha256` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`revision_id`) REFERENCES `content_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_workflow_state_check" CHECK(("content_workflow_events"."from_state" IS NULL OR "content_workflow_events"."from_state" IN (
          'draft', 'validated', 'submitted', 'approved', 'published', 'archived'
        )) AND "content_workflow_events"."to_state" IN (
          'draft', 'validated', 'submitted', 'approved', 'published', 'archived'
        )),
	CONSTRAINT "content_workflow_sequence_check" CHECK("content_workflow_events"."sequence" >= 1),
	CONSTRAINT "content_workflow_idempotency_check" CHECK(length("content_workflow_events"."idempotency_key") BETWEEN 8 AND 160),
	CONSTRAINT "content_workflow_request_digest_check" CHECK(length("content_workflow_events"."request_sha256") = 71
        AND substr("content_workflow_events"."request_sha256", 1, 7) = 'sha256:'
        AND substr("content_workflow_events"."request_sha256", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "content_workflow_metadata_check" CHECK(json_valid("content_workflow_events"."metadata_json")
        AND length(CAST("content_workflow_events"."metadata_json" AS BLOB)) <= 131072)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_workflow_revision_sequence_uidx` ON `content_workflow_events` (`revision_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_workflow_actor_idempotency_uidx` ON `content_workflow_events` (`actor_user_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `content_workflow_item_time_idx` ON `content_workflow_events` (`item_id`,`occurred_at`);--> statement-breakpoint
CREATE TRIGGER content_workflow_events_no_update
BEFORE UPDATE ON content_workflow_events
BEGIN
  SELECT RAISE(ABORT, 'content workflow events are append-only');
END;--> statement-breakpoint
CREATE TRIGGER content_workflow_events_no_delete
BEFORE DELETE ON content_workflow_events
BEGIN
  SELECT RAISE(ABORT, 'content workflow events are append-only');
END;--> statement-breakpoint
CREATE TRIGGER content_revisions_published_no_delete
BEFORE DELETE ON content_revisions
WHEN OLD.workflow_state IN ('published', 'archived')
BEGIN
  SELECT RAISE(ABORT, 'published content revisions are immutable');
END;--> statement-breakpoint
CREATE TRIGGER content_revisions_published_immutable
BEFORE UPDATE ON content_revisions
WHEN OLD.workflow_state IN ('published', 'archived') AND NOT (
  OLD.workflow_state = 'published'
  AND NEW.workflow_state = 'archived'
  AND NEW.id = OLD.id
  AND NEW.item_id = OLD.item_id
  AND NEW.revision = OLD.revision
  AND NEW.schema_version = OLD.schema_version
  AND NEW.title = OLD.title
  AND NEW.level = OLD.level
  AND NEW.content_json = OLD.content_json
  AND NEW.content_sha256 = OLD.content_sha256
  AND NEW.validation_json = OLD.validation_json
  AND NEW.validation_sha256 = OLD.validation_sha256
  AND NEW.based_on_revision_id IS OLD.based_on_revision_id
  AND NEW.author_user_id = OLD.author_user_id
  AND NEW.created_at = OLD.created_at
  AND NEW.published_at = OLD.published_at
  AND NEW.archived_at IS NOT NULL
  AND NEW.row_version = OLD.row_version + 1
)
BEGIN
  SELECT RAISE(ABORT, 'published content revisions are immutable');
END;
