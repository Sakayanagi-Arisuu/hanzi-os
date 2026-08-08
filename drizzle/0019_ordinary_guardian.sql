CREATE TABLE `content_release_heads` (
	`item_id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`row_version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`package_id`) REFERENCES `content_release_packages`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`revision_id`) REFERENCES `content_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_release_heads_version_check" CHECK("content_release_heads"."row_version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_release_heads_package_uidx` ON `content_release_heads` (`package_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_release_heads_revision_uidx` ON `content_release_heads` (`revision_id`);--> statement-breakpoint
CREATE TABLE `content_release_outbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`item_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`actor_user_id` text,
	`actor_session_id` text,
	`payload_json` text NOT NULL,
	`payload_sha256` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` integer NOT NULL,
	`lease_token` text,
	`lease_expires_at` integer,
	`last_error_code` text,
	`created_at` integer NOT NULL,
	`published_at` integer,
	`dead_at` integer,
	FOREIGN KEY (`item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`revision_id`) REFERENCES `content_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`causation_id`) REFERENCES `content_release_outbox_events`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_release_outbox_event_type_check" CHECK("content_release_outbox_events"."event_type" IN (
        'content.validation.requested',
        'content.release.requested',
        'content.release.completed',
        'content.release.failed'
      )),
	CONSTRAINT "content_release_outbox_schema_check" CHECK("content_release_outbox_events"."schema_version" = 1),
	CONSTRAINT "content_release_outbox_status_check" CHECK("content_release_outbox_events"."status" IN ('pending', 'processing', 'published', 'dead')),
	CONSTRAINT "content_release_outbox_attempts_check" CHECK("content_release_outbox_events"."attempts" >= 0),
	CONSTRAINT "content_release_outbox_correlation_check" CHECK(length("content_release_outbox_events"."correlation_id") BETWEEN 8 AND 160),
	CONSTRAINT "content_release_outbox_payload_check" CHECK(json_valid("content_release_outbox_events"."payload_json")
        AND length(CAST("content_release_outbox_events"."payload_json" AS BLOB)) BETWEEN 2 AND 65536),
	CONSTRAINT "content_release_outbox_payload_digest_check" CHECK(length("content_release_outbox_events"."payload_sha256") = 71
        AND substr("content_release_outbox_events"."payload_sha256", 1, 7) = 'sha256:'
        AND substr("content_release_outbox_events"."payload_sha256", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "content_release_outbox_lease_check" CHECK(("content_release_outbox_events"."status" = 'processing'
          AND "content_release_outbox_events"."lease_token" IS NOT NULL
          AND "content_release_outbox_events"."lease_expires_at" IS NOT NULL)
        OR ("content_release_outbox_events"."status" <> 'processing'
          AND "content_release_outbox_events"."lease_token" IS NULL
          AND "content_release_outbox_events"."lease_expires_at" IS NULL)),
	CONSTRAINT "content_release_outbox_terminal_check" CHECK(("content_release_outbox_events"."status" = 'published'
          AND "content_release_outbox_events"."published_at" IS NOT NULL
          AND "content_release_outbox_events"."dead_at" IS NULL)
        OR ("content_release_outbox_events"."status" = 'dead'
          AND "content_release_outbox_events"."dead_at" IS NOT NULL
          AND "content_release_outbox_events"."published_at" IS NULL)
        OR ("content_release_outbox_events"."status" IN ('pending', 'processing')
          AND "content_release_outbox_events"."published_at" IS NULL
          AND "content_release_outbox_events"."dead_at" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `content_release_outbox_status_available_idx` ON `content_release_outbox_events` (`status`,`available_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_release_outbox_correlation_idx` ON `content_release_outbox_events` (`correlation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_release_outbox_revision_idx` ON `content_release_outbox_events` (`revision_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_release_completed_causation_uidx` ON `content_release_outbox_events` (`causation_id`) WHERE "content_release_outbox_events"."event_type" = 'content.release.completed';--> statement-breakpoint
CREATE TABLE `content_release_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`correlation_id` text NOT NULL,
	`package_json` text NOT NULL,
	`package_sha256` text NOT NULL,
	`manifest_json` text NOT NULL,
	`manifest_sha256` text NOT NULL,
	`released_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`revision_id`) REFERENCES `content_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_release_packages_correlation_check" CHECK(length("content_release_packages"."correlation_id") BETWEEN 8 AND 160),
	CONSTRAINT "content_release_packages_json_check" CHECK(json_valid("content_release_packages"."package_json")
        AND json_valid("content_release_packages"."manifest_json")
        AND length(CAST("content_release_packages"."package_json" AS BLOB)) BETWEEN 2 AND 1048576
        AND length(CAST("content_release_packages"."manifest_json" AS BLOB)) BETWEEN 2 AND 131072),
	CONSTRAINT "content_release_packages_digest_check" CHECK(length("content_release_packages"."package_sha256") = 71
        AND substr("content_release_packages"."package_sha256", 1, 7) = 'sha256:'
        AND substr("content_release_packages"."package_sha256", 8) NOT GLOB '*[^0-9a-f]*'
        AND length("content_release_packages"."manifest_sha256") = 71
        AND substr("content_release_packages"."manifest_sha256", 1, 7) = 'sha256:'
        AND substr("content_release_packages"."manifest_sha256", 8) NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_release_packages_revision_uidx` ON `content_release_packages` (`revision_id`);--> statement-breakpoint
CREATE INDEX `content_release_packages_item_time_idx` ON `content_release_packages` (`item_id`,`released_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`stable_key` text NOT NULL,
	`item_type` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_items_type_check" CHECK("__new_content_items"."item_type" IN ('vocabulary', 'character', 'grammar', 'lesson', 'exam_item', 'exam_form')),
	CONSTRAINT "content_items_stable_key_check" CHECK(length("__new_content_items"."stable_key") BETWEEN 3 AND 160
        AND "__new_content_items"."stable_key" NOT GLOB '*[^a-z0-9._:-]*')
);
--> statement-breakpoint
INSERT INTO `__new_content_items`("id", "stable_key", "item_type", "created_by_user_id", "created_at", "updated_at") SELECT "id", "stable_key", "item_type", "created_by_user_id", "created_at", "updated_at" FROM `content_items`;--> statement-breakpoint
DROP TABLE `content_items`;--> statement-breakpoint
ALTER TABLE `__new_content_items` RENAME TO `content_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `content_items_stable_key_uidx` ON `content_items` (`stable_key`);--> statement-breakpoint
CREATE INDEX `content_items_type_updated_idx` ON `content_items` (`item_type`,`updated_at`);--> statement-breakpoint
CREATE TRIGGER content_release_outbox_identity_immutable
BEFORE UPDATE ON content_release_outbox_events
WHEN NEW.id <> OLD.id
  OR NEW.event_type <> OLD.event_type
  OR NEW.schema_version <> OLD.schema_version
  OR NEW.item_id <> OLD.item_id
  OR NEW.revision_id <> OLD.revision_id
  OR NEW.correlation_id <> OLD.correlation_id
  OR NEW.causation_id IS NOT OLD.causation_id
  OR NEW.actor_user_id IS NOT OLD.actor_user_id
  OR NEW.actor_session_id IS NOT OLD.actor_session_id
  OR NEW.payload_json <> OLD.payload_json
  OR NEW.payload_sha256 <> OLD.payload_sha256
  OR NEW.created_at <> OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'content release event identity is immutable');
END;--> statement-breakpoint
CREATE TRIGGER content_release_outbox_no_delete
BEFORE DELETE ON content_release_outbox_events
BEGIN
  SELECT RAISE(ABORT, 'content release events are append-only');
END;--> statement-breakpoint
CREATE TRIGGER content_release_packages_no_update
BEFORE UPDATE ON content_release_packages
BEGIN
  SELECT RAISE(ABORT, 'content release packages are immutable');
END;--> statement-breakpoint
CREATE TRIGGER content_release_packages_no_delete
BEFORE DELETE ON content_release_packages
BEGIN
  SELECT RAISE(ABORT, 'content release packages are immutable');
END;--> statement-breakpoint
CREATE TRIGGER content_release_heads_package_fence_insert
BEFORE INSERT ON content_release_heads
WHEN NOT EXISTS (
  SELECT 1 FROM content_release_packages package
   WHERE package.id = NEW.package_id
     AND package.item_id = NEW.item_id
     AND package.revision_id = NEW.revision_id
)
BEGIN
  SELECT RAISE(ABORT, 'content release head/package mismatch');
END;--> statement-breakpoint
CREATE TRIGGER content_release_heads_package_fence_update
BEFORE UPDATE ON content_release_heads
WHEN NOT EXISTS (
  SELECT 1 FROM content_release_packages package
   WHERE package.id = NEW.package_id
     AND package.item_id = NEW.item_id
     AND package.revision_id = NEW.revision_id
)
BEGIN
  SELECT RAISE(ABORT, 'content release head/package mismatch');
END;
