CREATE TABLE `hanzi_password_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`identity_id` text NOT NULL,
	`normalized_username` text NOT NULL,
	`normalized_email` text NOT NULL,
	`password_algorithm` text DEFAULT 'PBKDF2-SHA256' NOT NULL,
	`password_iterations` integer NOT NULL,
	`password_salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`identity_id`) REFERENCES `auth_identities`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hanzi_password_credentials_username_check" CHECK(length("hanzi_password_credentials"."normalized_username") BETWEEN 3 AND 32
        AND "hanzi_password_credentials"."normalized_username" NOT GLOB '*[^a-z0-9._-]*'
        AND substr("hanzi_password_credentials"."normalized_username", 1, 1) GLOB '[a-z0-9]'),
	CONSTRAINT "hanzi_password_credentials_email_check" CHECK(length("hanzi_password_credentials"."normalized_email") BETWEEN 3 AND 254
        AND instr("hanzi_password_credentials"."normalized_email", '@') BETWEEN 2 AND length("hanzi_password_credentials"."normalized_email") - 1),
	CONSTRAINT "hanzi_password_credentials_algorithm_check" CHECK("hanzi_password_credentials"."password_algorithm" = 'PBKDF2-SHA256'
        AND "hanzi_password_credentials"."password_iterations" BETWEEN 100000 AND 1000000),
	CONSTRAINT "hanzi_password_credentials_digest_check" CHECK(length("hanzi_password_credentials"."password_salt") = 22
        AND "hanzi_password_credentials"."password_salt" NOT GLOB '*[^A-Za-z0-9_-]*'
        AND length("hanzi_password_credentials"."password_hash") = 43
        AND "hanzi_password_credentials"."password_hash" NOT GLOB '*[^A-Za-z0-9_-]*'),
	CONSTRAINT "hanzi_password_credentials_attempt_check" CHECK("hanzi_password_credentials"."failed_attempts" BETWEEN 0 AND 1000
        AND ("hanzi_password_credentials"."locked_until" IS NULL OR "hanzi_password_credentials"."locked_until" BETWEEN 0 AND 8640000000000000)),
	CONSTRAINT "hanzi_password_credentials_time_check" CHECK("hanzi_password_credentials"."created_at" <= "hanzi_password_credentials"."updated_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hanzi_password_credentials_user_uidx` ON `hanzi_password_credentials` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `hanzi_password_credentials_identity_uidx` ON `hanzi_password_credentials` (`identity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `hanzi_password_credentials_username_uidx` ON `hanzi_password_credentials` (`normalized_username`);--> statement-breakpoint
CREATE UNIQUE INDEX `hanzi_password_credentials_email_uidx` ON `hanzi_password_credentials` (`normalized_email`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_auth_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`provider` text NOT NULL,
	`user_id` text,
	`challenge_hash` text NOT NULL,
	`secret_hash` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "auth_challenges_kind_check" CHECK("__new_auth_challenges"."kind" IN (
        'google_signin', 'google_link', 'google_unlink',
        'facebook_signin', 'facebook_link', 'facebook_unlink',
        'email_signin', 'email_link', 'email_unlink',
        'passkey_register', 'passkey_signin', 'passkey_unlink'
      )),
	CONSTRAINT "auth_challenges_provider_check" CHECK("__new_auth_challenges"."provider" IN ('google', 'facebook', 'hanzi', 'email_otp', 'passkey')),
	CONSTRAINT "auth_challenges_attempts_check" CHECK("__new_auth_challenges"."attempts" BETWEEN 0 AND 5),
	CONSTRAINT "auth_challenges_json_check" CHECK(json_valid("__new_auth_challenges"."payload_json")),
	CONSTRAINT "auth_challenges_time_check" CHECK("__new_auth_challenges"."created_at" < "__new_auth_challenges"."expires_at"
        AND ("__new_auth_challenges"."consumed_at" IS NULL OR "__new_auth_challenges"."consumed_at" >= "__new_auth_challenges"."created_at"))
);
--> statement-breakpoint
INSERT INTO `__new_auth_challenges`("id", "kind", "provider", "user_id", "challenge_hash", "secret_hash", "payload_json", "attempts", "created_at", "expires_at", "consumed_at") SELECT "id", "kind", "provider", "user_id", "challenge_hash", "secret_hash", "payload_json", "attempts", "created_at", "expires_at", "consumed_at" FROM `auth_challenges`;--> statement-breakpoint
DROP TABLE `auth_challenges`;--> statement-breakpoint
ALTER TABLE `__new_auth_challenges` RENAME TO `auth_challenges`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_challenges_challenge_hash_uidx` ON `auth_challenges` (`challenge_hash`);--> statement-breakpoint
CREATE INDEX `auth_challenges_expiry_idx` ON `auth_challenges` (`expires_at`);--> statement-breakpoint
CREATE INDEX `auth_challenges_user_idx` ON `auth_challenges` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`identity_id` text,
	`token_hash` text NOT NULL,
	`auth_method` text NOT NULL,
	`device_label` text,
	`user_agent_hash` text,
	`authenticated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`identity_id`) REFERENCES `auth_identities`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "auth_sessions_method_check" CHECK("__new_auth_sessions"."auth_method" IN ('google', 'facebook', 'hanzi', 'email_otp', 'passkey')),
	CONSTRAINT "auth_sessions_time_check" CHECK("__new_auth_sessions"."authenticated_at" <= "__new_auth_sessions"."created_at"
        AND "__new_auth_sessions"."created_at" <= "__new_auth_sessions"."last_seen_at"
        AND "__new_auth_sessions"."last_seen_at" <= "__new_auth_sessions"."expires_at"
        AND ("__new_auth_sessions"."revoked_at" IS NULL OR "__new_auth_sessions"."revoked_at" >= "__new_auth_sessions"."created_at"))
);
--> statement-breakpoint
INSERT INTO `__new_auth_sessions`("id", "user_id", "identity_id", "token_hash", "auth_method", "device_label", "user_agent_hash", "authenticated_at", "created_at", "last_seen_at", "expires_at", "revoked_at") SELECT "id", "user_id", "identity_id", "token_hash", "auth_method", "device_label", "user_agent_hash", "authenticated_at", "created_at", "last_seen_at", "expires_at", "revoked_at" FROM `auth_sessions`;--> statement-breakpoint
DROP TABLE `auth_sessions`;--> statement-breakpoint
ALTER TABLE `__new_auth_sessions` RENAME TO `auth_sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_hash_uidx` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_user_id_uidx` ON `auth_sessions` (`user_id`,`id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_last_seen_idx` ON `auth_sessions` (`user_id`,`last_seen_at`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expires_at`);