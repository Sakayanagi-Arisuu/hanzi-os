CREATE TABLE `editorial_assignment_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`stream_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`event_type` text NOT NULL,
	`content_version` text NOT NULL,
	`package_manifest_sha256` text NOT NULL,
	`item_catalog_sha256` text NOT NULL,
	`assignment_id` text,
	`assignment_sha256` text,
	`previous_assignment_id` text,
	`previous_assignment_sha256` text,
	`role` text,
	`assignee_operator_id` text,
	`envelope_json` text,
	`target_count` integer NOT NULL,
	`actor_operator_id` text NOT NULL,
	`actor_credential_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_sha256` text NOT NULL,
	`previous_event_id` text,
	`previous_event_sha256` text,
	`event_json` text NOT NULL,
	`event_sha256` text NOT NULL,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`stream_id`,`previous_event_id`) REFERENCES `editorial_assignment_events`(`stream_id`,`event_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "editorial_assignment_events_sequence_check" CHECK("editorial_assignment_events"."sequence" BETWEEN 1 AND 10000),
	CONSTRAINT "editorial_assignment_events_schema_version_check" CHECK("editorial_assignment_events"."schema_version" = 1),
	CONSTRAINT "editorial_assignment_events_type_check" CHECK("editorial_assignment_events"."event_type" IN ('assigned', 'reassigned', 'cancelled')),
	CONSTRAINT "editorial_assignment_events_identifier_check" CHECK(length("editorial_assignment_events"."event_id") BETWEEN 1 AND 128
        AND length("editorial_assignment_events"."content_version") BETWEEN 1 AND 128
        AND length("editorial_assignment_events"."actor_operator_id") BETWEEN 1 AND 128
        AND length("editorial_assignment_events"."actor_credential_id") BETWEEN 1 AND 128
        AND length("editorial_assignment_events"."idempotency_key") BETWEEN 1 AND 128),
	CONSTRAINT "editorial_assignment_events_stream_digest_check" CHECK(length("editorial_assignment_events"."stream_id") = 71
        AND substr("editorial_assignment_events"."stream_id", 1, 7) = 'sha256:'
        AND substr("editorial_assignment_events"."stream_id", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "editorial_assignment_events_manifest_digest_check" CHECK(length("editorial_assignment_events"."package_manifest_sha256") = 71
        AND substr("editorial_assignment_events"."package_manifest_sha256", 1, 7) = 'sha256:'
        AND substr("editorial_assignment_events"."package_manifest_sha256", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "editorial_assignment_events_catalog_digest_check" CHECK(length("editorial_assignment_events"."item_catalog_sha256") = 71
        AND substr("editorial_assignment_events"."item_catalog_sha256", 1, 7) = 'sha256:'
        AND substr("editorial_assignment_events"."item_catalog_sha256", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "editorial_assignment_events_request_digest_check" CHECK(length("editorial_assignment_events"."request_sha256") = 71
        AND substr("editorial_assignment_events"."request_sha256", 1, 7) = 'sha256:'
        AND substr("editorial_assignment_events"."request_sha256", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "editorial_assignment_events_event_digest_check" CHECK(length("editorial_assignment_events"."event_sha256") = 71
        AND substr("editorial_assignment_events"."event_sha256", 1, 7) = 'sha256:'
        AND substr("editorial_assignment_events"."event_sha256", 8) NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "editorial_assignment_events_optional_digest_check" CHECK(("editorial_assignment_events"."assignment_sha256" IS NULL OR (
          length("editorial_assignment_events"."assignment_sha256") = 71
          AND substr("editorial_assignment_events"."assignment_sha256", 1, 7) = 'sha256:'
          AND substr("editorial_assignment_events"."assignment_sha256", 8) NOT GLOB '*[^0-9a-f]*'
        ))
        AND ("editorial_assignment_events"."previous_assignment_sha256" IS NULL OR (
          length("editorial_assignment_events"."previous_assignment_sha256") = 71
          AND substr("editorial_assignment_events"."previous_assignment_sha256", 1, 7) = 'sha256:'
          AND substr("editorial_assignment_events"."previous_assignment_sha256", 8) NOT GLOB '*[^0-9a-f]*'
        ))
        AND ("editorial_assignment_events"."previous_event_sha256" IS NULL OR (
          length("editorial_assignment_events"."previous_event_sha256") = 71
          AND substr("editorial_assignment_events"."previous_event_sha256", 1, 7) = 'sha256:'
          AND substr("editorial_assignment_events"."previous_event_sha256", 8) NOT GLOB '*[^0-9a-f]*'
        ))),
	CONSTRAINT "editorial_assignment_events_json_check" CHECK(json_valid("editorial_assignment_events"."event_json")
        AND ("editorial_assignment_events"."envelope_json" IS NULL OR json_valid("editorial_assignment_events"."envelope_json"))
        AND length(CAST("editorial_assignment_events"."event_json" AS BLOB)) <= 700000
        AND COALESCE(length(CAST("editorial_assignment_events"."envelope_json" AS BLOB)), 0) <= 600000
        AND length(CAST("editorial_assignment_events"."event_json" AS BLOB))
          + COALESCE(length(CAST("editorial_assignment_events"."envelope_json" AS BLOB)), 0)
          <= 1350000),
	CONSTRAINT "editorial_assignment_events_target_count_check" CHECK("editorial_assignment_events"."target_count" >= 0 AND "editorial_assignment_events"."target_count" <= 10000),
	CONSTRAINT "editorial_assignment_events_role_check" CHECK("editorial_assignment_events"."role" IS NULL OR "editorial_assignment_events"."role" IN (
        'content-owner', 'native-linguistic', 'source-license', 'audio-rights'
      )),
	CONSTRAINT "editorial_assignment_events_shape_check" CHECK((
          "editorial_assignment_events"."event_type" = 'assigned'
          AND "editorial_assignment_events"."assignment_id" IS NOT NULL
          AND "editorial_assignment_events"."assignment_sha256" IS NOT NULL
          AND "editorial_assignment_events"."previous_assignment_id" IS NULL
          AND "editorial_assignment_events"."previous_assignment_sha256" IS NULL
          AND "editorial_assignment_events"."role" IS NOT NULL
          AND "editorial_assignment_events"."assignee_operator_id" IS NOT NULL
          AND "editorial_assignment_events"."envelope_json" IS NOT NULL
          AND "editorial_assignment_events"."target_count" > 0
        ) OR (
          "editorial_assignment_events"."event_type" = 'reassigned'
          AND "editorial_assignment_events"."assignment_id" IS NOT NULL
          AND "editorial_assignment_events"."assignment_sha256" IS NOT NULL
          AND "editorial_assignment_events"."previous_assignment_id" IS NOT NULL
          AND "editorial_assignment_events"."previous_assignment_sha256" IS NOT NULL
          AND "editorial_assignment_events"."role" IS NOT NULL
          AND "editorial_assignment_events"."assignee_operator_id" IS NOT NULL
          AND "editorial_assignment_events"."envelope_json" IS NOT NULL
          AND "editorial_assignment_events"."target_count" > 0
        ) OR (
          "editorial_assignment_events"."event_type" = 'cancelled'
          AND "editorial_assignment_events"."assignment_id" IS NULL
          AND "editorial_assignment_events"."assignment_sha256" IS NULL
          AND "editorial_assignment_events"."previous_assignment_id" IS NOT NULL
          AND "editorial_assignment_events"."previous_assignment_sha256" IS NOT NULL
          AND "editorial_assignment_events"."role" IS NULL
          AND "editorial_assignment_events"."assignee_operator_id" IS NULL
          AND "editorial_assignment_events"."envelope_json" IS NULL
          AND "editorial_assignment_events"."target_count" = 0
        )),
	CONSTRAINT "editorial_assignment_events_predecessor_pair_check" CHECK(("editorial_assignment_events"."previous_event_id" IS NULL
          AND "editorial_assignment_events"."previous_event_sha256" IS NULL
          AND "editorial_assignment_events"."sequence" = 1
          AND "editorial_assignment_events"."event_type" = 'assigned')
        OR ("editorial_assignment_events"."previous_event_id" IS NOT NULL
          AND "editorial_assignment_events"."previous_event_sha256" IS NOT NULL
          AND "editorial_assignment_events"."sequence" > 1)),
	CONSTRAINT "editorial_assignment_events_time_check" CHECK("editorial_assignment_events"."occurred_at" BETWEEN 0 AND 8640000000000000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_assignment_events_stream_sequence_uidx` ON `editorial_assignment_events` (`stream_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_assignment_events_stream_event_uidx` ON `editorial_assignment_events` (`stream_id`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_assignment_events_actor_idempotency_uidx` ON `editorial_assignment_events` (`actor_operator_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_assignment_events_sha256_uidx` ON `editorial_assignment_events` (`event_sha256`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_assignment_events_predecessor_uidx` ON `editorial_assignment_events` (`stream_id`,`previous_event_id`) WHERE "editorial_assignment_events"."previous_event_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_assignment_events_genesis_uidx` ON `editorial_assignment_events` (`stream_id`) WHERE "editorial_assignment_events"."previous_event_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_assignment_events_assignment_uidx` ON `editorial_assignment_events` (`assignment_id`) WHERE "editorial_assignment_events"."assignment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `editorial_assignment_events_stream_sequence_idx` ON `editorial_assignment_events` (`stream_id`,`sequence`);--> statement-breakpoint
CREATE TRIGGER editorial_assignment_events_immutable_update
BEFORE UPDATE ON editorial_assignment_events
BEGIN
  SELECT RAISE(ABORT, 'editorial assignment events are immutable');
END;--> statement-breakpoint
CREATE TRIGGER editorial_assignment_events_immutable_delete
BEFORE DELETE ON editorial_assignment_events
BEGIN
  SELECT RAISE(ABORT, 'editorial assignment events are append-only');
END;--> statement-breakpoint
CREATE TRIGGER editorial_assignment_events_stream_size_insert
BEFORE INSERT ON editorial_assignment_events
BEGIN
  SELECT CASE
    WHEN COALESCE((
      SELECT SUM(
        length(CAST(event_id AS BLOB))
        + length(CAST(stream_id AS BLOB))
        + length(CAST(event_type AS BLOB))
        + length(CAST(content_version AS BLOB))
        + length(CAST(package_manifest_sha256 AS BLOB))
        + length(CAST(item_catalog_sha256 AS BLOB))
        + COALESCE(length(CAST(assignment_id AS BLOB)), 0)
        + COALESCE(length(CAST(assignment_sha256 AS BLOB)), 0)
        + COALESCE(length(CAST(previous_assignment_id AS BLOB)), 0)
        + COALESCE(length(CAST(previous_assignment_sha256 AS BLOB)), 0)
        + COALESCE(length(CAST(role AS BLOB)), 0)
        + COALESCE(length(CAST(assignee_operator_id AS BLOB)), 0)
        + COALESCE(length(CAST(envelope_json AS BLOB)), 0)
        + length(CAST(actor_operator_id AS BLOB))
        + length(CAST(actor_credential_id AS BLOB))
        + length(CAST(idempotency_key AS BLOB))
        + length(CAST(request_sha256 AS BLOB))
        + COALESCE(length(CAST(previous_event_id AS BLOB)), 0)
        + COALESCE(length(CAST(previous_event_sha256 AS BLOB)), 0)
        + length(CAST(event_json AS BLOB))
        + length(CAST(event_sha256 AS BLOB))
        + 32
      )
      FROM editorial_assignment_events
      WHERE stream_id = NEW.stream_id
    ), 0)
    + length(CAST(NEW.event_id AS BLOB))
    + length(CAST(NEW.stream_id AS BLOB))
    + length(CAST(NEW.event_type AS BLOB))
    + length(CAST(NEW.content_version AS BLOB))
    + length(CAST(NEW.package_manifest_sha256 AS BLOB))
    + length(CAST(NEW.item_catalog_sha256 AS BLOB))
    + COALESCE(length(CAST(NEW.assignment_id AS BLOB)), 0)
    + COALESCE(length(CAST(NEW.assignment_sha256 AS BLOB)), 0)
    + COALESCE(length(CAST(NEW.previous_assignment_id AS BLOB)), 0)
    + COALESCE(length(CAST(NEW.previous_assignment_sha256 AS BLOB)), 0)
    + COALESCE(length(CAST(NEW.role AS BLOB)), 0)
    + COALESCE(length(CAST(NEW.assignee_operator_id AS BLOB)), 0)
    + COALESCE(length(CAST(NEW.envelope_json AS BLOB)), 0)
    + length(CAST(NEW.actor_operator_id AS BLOB))
    + length(CAST(NEW.actor_credential_id AS BLOB))
    + length(CAST(NEW.idempotency_key AS BLOB))
    + length(CAST(NEW.request_sha256 AS BLOB))
    + COALESCE(length(CAST(NEW.previous_event_id AS BLOB)), 0)
    + COALESCE(length(CAST(NEW.previous_event_sha256 AS BLOB)), 0)
    + length(CAST(NEW.event_json AS BLOB))
    + length(CAST(NEW.event_sha256 AS BLOB))
    + 32 > 16777216
    THEN RAISE(ABORT, 'editorial assignment stream exceeds byte bound')
  END;
END;--> statement-breakpoint
CREATE TRIGGER editorial_assignment_events_predecessor_insert
BEFORE INSERT ON editorial_assignment_events
BEGIN
  SELECT CASE
    WHEN NEW.sequence = 1
      AND EXISTS (
        SELECT 1
        FROM editorial_assignment_events existing
        WHERE existing.stream_id = NEW.stream_id
      )
    THEN RAISE(ABORT, 'editorial assignment genesis already exists')
  END;
  SELECT CASE
    WHEN NEW.sequence > 1
      AND NOT EXISTS (
        SELECT 1
        FROM editorial_assignment_events predecessor
        WHERE predecessor.stream_id = NEW.stream_id
          AND predecessor.event_id = NEW.previous_event_id
          AND predecessor.event_sha256 = NEW.previous_event_sha256
          AND predecessor.sequence = NEW.sequence - 1
          AND predecessor.content_version = NEW.content_version
          AND predecessor.package_manifest_sha256 =
            NEW.package_manifest_sha256
          AND predecessor.item_catalog_sha256 = NEW.item_catalog_sha256
          AND NOT EXISTS (
            SELECT 1
            FROM editorial_assignment_events successor
            WHERE successor.stream_id = predecessor.stream_id
              AND successor.previous_event_id = predecessor.event_id
          )
      )
    THEN RAISE(ABORT, 'editorial assignment predecessor is not the exact head')
  END;
END;--> statement-breakpoint
CREATE TRIGGER editorial_assignment_events_transition_insert
BEFORE INSERT ON editorial_assignment_events
BEGIN
  SELECT CASE
    WHEN NEW.event_type IN ('reassigned', 'cancelled')
      AND NOT EXISTS (
        SELECT 1
        FROM editorial_assignment_events assigned
        WHERE assigned.stream_id = NEW.stream_id
          AND assigned.assignment_id = NEW.previous_assignment_id
          AND assigned.assignment_sha256 =
            NEW.previous_assignment_sha256
          AND assigned.event_type IN ('assigned', 'reassigned')
          AND assigned.sequence < NEW.sequence
          AND NOT EXISTS (
            SELECT 1
            FROM editorial_assignment_events terminal
            WHERE terminal.stream_id = assigned.stream_id
              AND terminal.previous_assignment_id =
                assigned.assignment_id
              AND terminal.previous_assignment_sha256 =
                assigned.assignment_sha256
              AND terminal.event_type IN ('reassigned', 'cancelled')
          )
      )
    THEN RAISE(ABORT, 'editorial assignment transition is not active')
  END;
  SELECT CASE
    WHEN NEW.event_type IN ('assigned', 'reassigned')
      AND (
        json_extract(NEW.envelope_json, '$.schemaVersion') <> 1
        OR json_extract(NEW.envelope_json, '$.assignmentId') IS NOT
          NEW.assignment_id
        OR json_extract(NEW.envelope_json, '$.contentVersion') IS NOT
          NEW.content_version
        OR json_extract(
          NEW.envelope_json,
          '$.packageManifestSha256'
        ) IS NOT NEW.package_manifest_sha256
        OR json_extract(
          NEW.envelope_json,
          '$.itemCatalogSha256'
        ) IS NOT NEW.item_catalog_sha256
        OR json_extract(NEW.envelope_json, '$.role') IS NOT NEW.role
        OR json_extract(
          NEW.envelope_json,
          '$.assignedByOperatorId'
        ) IS NOT NEW.actor_operator_id
        OR json_extract(
          NEW.envelope_json,
          '$.assigneeOperatorId'
        ) IS NOT NEW.assignee_operator_id
        OR json_type(NEW.envelope_json, '$.scope.itemKeys') IS NOT 'array'
        OR json_type(
          NEW.envelope_json,
          '$.scope.audioAssetIds'
        ) IS NOT 'array'
        OR COALESCE(
          json_array_length(
            NEW.envelope_json,
            '$.scope.itemKeys'
          ),
          -1
        ) + COALESCE(
          json_array_length(
            NEW.envelope_json,
            '$.scope.audioAssetIds'
          ),
          -1
        ) <> NEW.target_count
      )
    THEN RAISE(ABORT, 'editorial assignment envelope columns do not match')
  END;
  SELECT CASE
    WHEN NEW.event_type IN ('assigned', 'reassigned')
      AND EXISTS (
        SELECT 1
        FROM editorial_assignment_events active_assignment
        WHERE active_assignment.stream_id = NEW.stream_id
          AND active_assignment.event_type IN ('assigned', 'reassigned')
          AND active_assignment.role = NEW.role
          AND (
            NEW.previous_assignment_id IS NULL
            OR active_assignment.assignment_id <>
              NEW.previous_assignment_id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM editorial_assignment_events terminal
            WHERE terminal.stream_id = active_assignment.stream_id
              AND terminal.previous_assignment_id =
                active_assignment.assignment_id
              AND terminal.previous_assignment_sha256 =
                active_assignment.assignment_sha256
              AND terminal.event_type IN ('reassigned', 'cancelled')
          )
          AND (
            EXISTS (
              SELECT 1
              FROM json_each(
                active_assignment.envelope_json,
                '$.scope.itemKeys'
              ) active_target
              INNER JOIN json_each(
                NEW.envelope_json,
                '$.scope.itemKeys'
              ) new_target
                ON new_target.value = active_target.value
            )
            OR EXISTS (
              SELECT 1
              FROM json_each(
                active_assignment.envelope_json,
                '$.scope.audioAssetIds'
              ) active_target
              INNER JOIN json_each(
                NEW.envelope_json,
                '$.scope.audioAssetIds'
              ) new_target
                ON new_target.value = active_target.value
            )
          )
      )
    THEN RAISE(ABORT, 'editorial assignment role target is already active')
  END;
END;
