CREATE TABLE `content_revision_assignment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`revision_id` text NOT NULL,
	`row_version` integer NOT NULL,
	`owner_user_id` text NOT NULL,
	`reviewer_user_id` text,
	`priority` text DEFAULT 'normal' NOT NULL,
	`due_at` integer,
	`note` text,
	`actor_user_id` text NOT NULL,
	`actor_session_id` text,
	`idempotency_key` text NOT NULL,
	`request_sha256` text NOT NULL,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`revision_id`) REFERENCES `content_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_revision_assignment_row_version_check" CHECK("content_revision_assignment_events"."row_version" >= 1),
	CONSTRAINT "content_revision_assignment_priority_check" CHECK("content_revision_assignment_events"."priority" IN ('low', 'normal', 'high', 'urgent')),
	CONSTRAINT "content_revision_assignment_due_check" CHECK("content_revision_assignment_events"."due_at" IS NULL OR "content_revision_assignment_events"."due_at" BETWEEN 0 AND 8640000000000000),
	CONSTRAINT "content_revision_assignment_note_check" CHECK("content_revision_assignment_events"."note" IS NULL OR length("content_revision_assignment_events"."note") BETWEEN 1 AND 1000),
	CONSTRAINT "content_revision_assignment_idempotency_check" CHECK(length("content_revision_assignment_events"."idempotency_key") BETWEEN 8 AND 160),
	CONSTRAINT "content_revision_assignment_request_digest_check" CHECK(length("content_revision_assignment_events"."request_sha256") = 71
        AND substr("content_revision_assignment_events"."request_sha256", 1, 7) = 'sha256:'
        AND substr("content_revision_assignment_events"."request_sha256", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "content_revision_assignment_distinct_roles_check" CHECK("content_revision_assignment_events"."reviewer_user_id" IS NULL OR "content_revision_assignment_events"."reviewer_user_id" <> "content_revision_assignment_events"."owner_user_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_revision_assignment_revision_version_uidx` ON `content_revision_assignment_events` (`revision_id`,`row_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_revision_assignment_actor_idempotency_uidx` ON `content_revision_assignment_events` (`actor_user_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `content_revision_assignment_owner_due_idx` ON `content_revision_assignment_events` (`owner_user_id`,`due_at`);--> statement-breakpoint
CREATE INDEX `content_revision_assignment_reviewer_due_idx` ON `content_revision_assignment_events` (`reviewer_user_id`,`due_at`);
--> statement-breakpoint
CREATE TRIGGER content_revision_assignment_events_no_update
BEFORE UPDATE ON content_revision_assignment_events
BEGIN
  SELECT RAISE(ABORT, 'content revision assignment events are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER content_revision_assignment_events_no_delete
BEFORE DELETE ON content_revision_assignment_events
BEGIN
  SELECT RAISE(ABORT, 'content revision assignment events are append-only');
END;
--> statement-breakpoint
CREATE TRIGGER content_revision_assignment_events_sequence_insert
BEFORE INSERT ON content_revision_assignment_events
BEGIN
  SELECT CASE
    WHEN NEW.row_version <> COALESCE((
      SELECT MAX(existing.row_version)
        FROM content_revision_assignment_events existing
       WHERE existing.revision_id = NEW.revision_id
    ), 0) + 1
    THEN RAISE(ABORT, 'content revision assignment head changed')
  END;
END;
--> statement-breakpoint
CREATE TRIGGER content_revision_assignment_events_roles_insert
BEFORE INSERT ON content_revision_assignment_events
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM users owner
      INNER JOIN user_roles owner_role ON owner_role.user_id = owner.id
      WHERE owner.id = NEW.owner_user_id
        AND owner.status = 'active'
        AND owner_role.role = 'content_editor'
    )
    THEN RAISE(ABORT, 'content owner must be an active editor')
  END;
  SELECT CASE
    WHEN NEW.reviewer_user_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM users reviewer
      INNER JOIN user_roles reviewer_role ON reviewer_role.user_id = reviewer.id
      WHERE reviewer.id = NEW.reviewer_user_id
        AND reviewer.status = 'active'
        AND reviewer_role.role = 'admin'
    )
    THEN RAISE(ABORT, 'content reviewer must be an active admin')
  END;
  SELECT CASE
    WHEN NEW.reviewer_user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM content_revisions revision
      WHERE revision.id = NEW.revision_id
        AND revision.author_user_id = NEW.reviewer_user_id
    )
    THEN RAISE(ABORT, 'content author cannot review the same revision')
  END;
END;
