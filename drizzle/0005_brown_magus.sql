PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sync_changes` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`revision` integer NOT NULL,
	`reset_epoch` integer,
	`operation_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload_json` text,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sync_changes_revision_check" CHECK("__new_sync_changes"."revision" >= 0),
	CONSTRAINT "sync_changes_reset_epoch_check" CHECK("__new_sync_changes"."reset_epoch" IS NULL OR "__new_sync_changes"."reset_epoch" BETWEEN 0 AND 2147483647),
	CONSTRAINT "sync_changes_operation_check" CHECK("__new_sync_changes"."operation" IN ('upsert', 'delete'))
);
--> statement-breakpoint
INSERT INTO `__new_sync_changes`("seq", "user_id", "entity_type", "entity_id", "revision", "reset_epoch", "operation_id", "operation", "payload_json", "occurred_at") SELECT "seq", "user_id", "entity_type", "entity_id", "revision", NULL, "operation_id", "operation", "payload_json", "occurred_at" FROM `sync_changes`;--> statement-breakpoint
DROP TABLE `sync_changes`;--> statement-breakpoint
ALTER TABLE `__new_sync_changes` RENAME TO `sync_changes`;--> statement-breakpoint
CREATE INDEX `sync_changes_user_seq_idx` ON `sync_changes` (`user_id`,`seq`);--> statement-breakpoint
CREATE INDEX `sync_changes_user_reset_epoch_seq_idx` ON `sync_changes` (`user_id`,`reset_epoch`,`seq`);--> statement-breakpoint
CREATE UNIQUE INDEX `sync_changes_user_operation_uidx` ON `sync_changes` (`user_id`,`operation_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
