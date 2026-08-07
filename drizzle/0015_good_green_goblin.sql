CREATE TABLE `auth_challenges` (
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
	CONSTRAINT "auth_challenges_kind_check" CHECK("auth_challenges"."kind" IN (
        'google_signin', 'google_link', 'google_unlink',
        'email_signin', 'email_link', 'email_unlink',
        'passkey_register', 'passkey_signin', 'passkey_unlink'
      )),
	CONSTRAINT "auth_challenges_provider_check" CHECK("auth_challenges"."provider" IN ('google', 'email_otp', 'passkey')),
	CONSTRAINT "auth_challenges_attempts_check" CHECK("auth_challenges"."attempts" BETWEEN 0 AND 5),
	CONSTRAINT "auth_challenges_json_check" CHECK(json_valid("auth_challenges"."payload_json")),
	CONSTRAINT "auth_challenges_time_check" CHECK("auth_challenges"."created_at" < "auth_challenges"."expires_at"
        AND ("auth_challenges"."consumed_at" IS NULL OR "auth_challenges"."consumed_at" >= "auth_challenges"."created_at"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_challenges_challenge_hash_uidx` ON `auth_challenges` (`challenge_hash`);--> statement-breakpoint
CREATE INDEX `auth_challenges_expiry_idx` ON `auth_challenges` (`expires_at`);--> statement-breakpoint
CREATE INDEX `auth_challenges_user_idx` ON `auth_challenges` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
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
	CONSTRAINT "auth_sessions_method_check" CHECK("auth_sessions"."auth_method" IN ('google', 'email_otp', 'passkey')),
	CONSTRAINT "auth_sessions_time_check" CHECK("auth_sessions"."authenticated_at" <= "auth_sessions"."created_at"
        AND "auth_sessions"."created_at" <= "auth_sessions"."last_seen_at"
        AND "auth_sessions"."last_seen_at" <= "auth_sessions"."expires_at"
        AND ("auth_sessions"."revoked_at" IS NULL OR "auth_sessions"."revoked_at" >= "auth_sessions"."created_at"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_hash_uidx` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_user_id_uidx` ON `auth_sessions` (`user_id`,`id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_last_seen_idx` ON `auth_sessions` (`user_id`,`last_seen_at`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `passkey_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`identity_id` text NOT NULL,
	`public_key_jwk_json` text NOT NULL,
	`algorithm` integer NOT NULL,
	`sign_count` integer DEFAULT 0 NOT NULL,
	`transports_json` text DEFAULT '[]' NOT NULL,
	`label` text,
	`backup_eligible` integer DEFAULT false NOT NULL,
	`backup_state` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`identity_id`) REFERENCES `auth_identities`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "passkey_credentials_algorithm_check" CHECK("passkey_credentials"."algorithm" IN (-7, -257)),
	CONSTRAINT "passkey_credentials_sign_count_check" CHECK("passkey_credentials"."sign_count" BETWEEN 0 AND 4294967295),
	CONSTRAINT "passkey_credentials_json_check" CHECK(json_valid("passkey_credentials"."public_key_jwk_json") AND json_valid("passkey_credentials"."transports_json"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passkey_credentials_identity_uidx` ON `passkey_credentials` (`identity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `passkey_credentials_user_id_uidx` ON `passkey_credentials` (`user_id`,`id`);--> statement-breakpoint
CREATE INDEX `passkey_credentials_user_idx` ON `passkey_credentials` (`user_id`,`created_at`);