CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`action` text NOT NULL,
	`outcome` text NOT NULL,
	`actor_user_id` text,
	`actor_session_id` text,
	`target_type` text NOT NULL,
	`target_id` text,
	`request_id` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "audit_events_category_check" CHECK("audit_events"."category" IN (
        'auth', 'account', 'role', 'config', 'approval', 'publication'
      )),
	CONSTRAINT "audit_events_outcome_check" CHECK("audit_events"."outcome" IN ('success', 'denied', 'failed')),
	CONSTRAINT "audit_events_metadata_json_check" CHECK(json_valid("audit_events"."metadata_json")),
	CONSTRAINT "audit_events_action_check" CHECK(length("audit_events"."action") BETWEEN 3 AND 120),
	CONSTRAINT "audit_events_target_type_check" CHECK(length("audit_events"."target_type") BETWEEN 2 AND 80)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_events_request_action_uidx` ON `audit_events` (`request_id`,`action`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `audit_events_created_idx` ON `audit_events` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `audit_events_actor_idx` ON `audit_events` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_events_target_idx` ON `audit_events` (`target_type`,`target_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_by_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "system_settings_key_check" CHECK("system_settings"."key" IN (
        'account_registration_mode',
        'content_preview_enabled',
        'default_daily_minutes',
        'maintenance_banner'
      )),
	CONSTRAINT "system_settings_value_json_check" CHECK(json_valid("system_settings"."value_json")),
	CONSTRAINT "system_settings_revision_check" CHECK("system_settings"."revision" > 0),
	CONSTRAINT "system_settings_time_check" CHECK("system_settings"."created_at" <= "system_settings"."updated_at")
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_roles` (
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`granted_by_user_id` text,
	`granted_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `role`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "user_roles_role_check" CHECK("__new_user_roles"."role" IN ('learner', 'content_editor', 'admin'))
);
--> statement-breakpoint
INSERT INTO `__new_user_roles`("user_id", "role", "granted_by_user_id", "granted_at", "updated_at") SELECT "user_id", "role", "granted_by_user_id", "granted_at", "updated_at" FROM `user_roles`;--> statement-breakpoint
DROP TABLE `user_roles`;--> statement-breakpoint
ALTER TABLE `__new_user_roles` RENAME TO `user_roles`;--> statement-breakpoint
CREATE INDEX `user_roles_role_idx` ON `user_roles` (`role`);--> statement-breakpoint
CREATE INDEX `user_roles_granted_by_idx` ON `user_roles` (`granted_by_user_id`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`control_revision` integer DEFAULT 1 NOT NULL,
	`locked_at` integer,
	`locked_by_user_id` text,
	`lock_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "users_status_check" CHECK("__new_users"."status" IN ('active', 'locked', 'deletion_pending', 'deleted')),
	CONSTRAINT "users_control_revision_check" CHECK("__new_users"."control_revision" > 0),
	CONSTRAINT "users_lock_state_check" CHECK((
        "__new_users"."status" = 'locked'
        AND "__new_users"."locked_at" IS NOT NULL
        AND "__new_users"."locked_by_user_id" IS NOT NULL
        AND "__new_users"."lock_reason" IS NOT NULL
      ) OR (
        "__new_users"."status" <> 'locked'
        AND "__new_users"."locked_at" IS NULL
        AND "__new_users"."locked_by_user_id" IS NULL
        AND "__new_users"."lock_reason" IS NULL
      ))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "status", "control_revision", "locked_at", "locked_by_user_id", "lock_reason", "created_at", "updated_at", "deleted_at") SELECT "id", "status", 1, NULL, NULL, NULL, "created_at", "updated_at", "deleted_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE TRIGGER `audit_events_no_update`
BEFORE UPDATE ON `audit_events`
BEGIN
  SELECT RAISE(ABORT, 'audit_events is append-only');
END;
--> statement-breakpoint
CREATE TRIGGER `audit_events_no_delete`
BEFORE DELETE ON `audit_events`
BEGIN
  SELECT RAISE(ABORT, 'audit_events is append-only');
END;
--> statement-breakpoint
CREATE TRIGGER `user_roles_protect_last_admin_delete`
BEFORE DELETE ON `user_roles`
WHEN OLD.`role` = 'admin'
  AND (
    SELECT COUNT(*)
      FROM `user_roles` ur
      JOIN `users` u ON u.`id` = ur.`user_id`
     WHERE ur.`role` = 'admin' AND u.`status` = 'active'
  ) <= 1
BEGIN
  SELECT RAISE(ABORT, 'cannot remove the last active administrator');
END;
--> statement-breakpoint
CREATE TRIGGER `users_protect_last_admin_status`
BEFORE UPDATE OF `status` ON `users`
WHEN OLD.`status` = 'active'
  AND NEW.`status` <> 'active'
  AND EXISTS (
    SELECT 1 FROM `user_roles`
     WHERE `user_id` = OLD.`id` AND `role` = 'admin'
  )
  AND (
    SELECT COUNT(*)
      FROM `user_roles` ur
      JOIN `users` u ON u.`id` = ur.`user_id`
     WHERE ur.`role` = 'admin' AND u.`status` = 'active'
  ) <= 1
BEGIN
  SELECT RAISE(ABORT, 'cannot lock or delete the last active administrator');
END;
--> statement-breakpoint
CREATE TRIGGER `users_protect_last_admin_delete`
BEFORE DELETE ON `users`
WHEN EXISTS (
    SELECT 1 FROM `user_roles`
     WHERE `user_id` = OLD.`id` AND `role` = 'admin'
  )
  AND (
    SELECT COUNT(*)
      FROM `user_roles` ur
      JOIN `users` u ON u.`id` = ur.`user_id`
     WHERE ur.`role` = 'admin' AND u.`status` = 'active'
  ) <= 1
BEGIN
  SELECT RAISE(ABORT, 'cannot delete the last active administrator');
END;
