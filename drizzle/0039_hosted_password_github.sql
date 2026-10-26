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
        'github_signin', 'github_link', 'github_unlink',
        'email_signin', 'email_link', 'email_unlink',
        'passkey_register', 'passkey_signin', 'passkey_unlink'
      )),
	CONSTRAINT "auth_challenges_provider_check" CHECK("__new_auth_challenges"."provider" IN ('google', 'github', 'facebook', 'hanzi', 'email_otp', 'passkey')),
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
	CONSTRAINT "auth_sessions_method_check" CHECK("__new_auth_sessions"."auth_method" IN ('google', 'github', 'facebook', 'hanzi', 'email_otp', 'passkey')),
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
--> statement-breakpoint
CREATE UNIQUE INDEX auth_identities_owner_id_uidx ON auth_identities(user_id,id);
--> statement-breakpoint
CREATE TABLE hosted_hanzi_aliases (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 identity_id TEXT NOT NULL UNIQUE,
 project_id TEXT NOT NULL,
 firebase_uid TEXT NOT NULL,
 normalized_username TEXT NOT NULL,
 normalized_email TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 FOREIGN KEY(user_id,identity_id) REFERENCES auth_identities(user_id,id) ON DELETE CASCADE,
 UNIQUE(project_id,firebase_uid), UNIQUE(project_id,normalized_username), UNIQUE(project_id,normalized_email),
 CHECK(length(normalized_username) BETWEEN 3 AND 32 AND normalized_username NOT GLOB '*[^a-z0-9._-]*' AND substr(normalized_username,1,1) GLOB '[a-z0-9]'),
 CHECK(length(normalized_email) BETWEEN 3 AND 254 AND instr(normalized_email,'@')>1),
 CHECK(created_at<=updated_at)
);
--> statement-breakpoint
CREATE TABLE auth_login_rate_limits (
 key_hash TEXT PRIMARY KEY NOT NULL,
 window_start INTEGER NOT NULL,
 request_count INTEGER NOT NULL CHECK(request_count BETWEEN 1 AND 100),
 updated_at INTEGER NOT NULL
);
