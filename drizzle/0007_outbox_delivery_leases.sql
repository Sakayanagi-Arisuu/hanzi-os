ALTER TABLE `outbox_events` ADD `lease_token` text;--> statement-breakpoint
ALTER TABLE `outbox_events` ADD `lease_expires_at` integer;--> statement-breakpoint
UPDATE `outbox_events`
SET
  `status` = 'pending',
  `lease_token` = NULL,
  `lease_expires_at` = NULL,
  `last_error` = 'recovered-by-outbox-lease-v1'
WHERE `status` = 'processing';--> statement-breakpoint
CREATE INDEX `outbox_events_status_lease_expiry_idx` ON `outbox_events` (`status`,`lease_expires_at`);
--> statement-breakpoint
CREATE TRIGGER `outbox_events_lease_state_insert`
BEFORE INSERT ON `outbox_events`
WHEN (
  NEW.`status` = 'processing'
  AND (
    NEW.`lease_token` IS NULL
    OR NEW.`lease_expires_at` IS NULL
    OR NEW.`lease_expires_at` < 0
  )
) OR (
  NEW.`status` <> 'processing'
  AND (
    NEW.`lease_token` IS NOT NULL
    OR NEW.`lease_expires_at` IS NOT NULL
  )
)
BEGIN
  SELECT RAISE(ABORT, 'outbox event lease state is invalid');
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_events_lease_state_update`
BEFORE UPDATE OF `status`, `lease_token`, `lease_expires_at` ON `outbox_events`
WHEN (
  NEW.`status` = 'processing'
  AND (
    NEW.`lease_token` IS NULL
    OR NEW.`lease_expires_at` IS NULL
    OR NEW.`lease_expires_at` < 0
  )
) OR (
  NEW.`status` <> 'processing'
  AND (
    NEW.`lease_token` IS NOT NULL
    OR NEW.`lease_expires_at` IS NOT NULL
  )
)
BEGIN
  SELECT RAISE(ABORT, 'outbox event lease state is invalid');
END;
