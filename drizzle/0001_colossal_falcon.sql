CREATE TABLE `mutation_rate_limits` (
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`policy_version` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `scope`, `policy_version`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "mutation_rate_limits_window_start_check" CHECK("mutation_rate_limits"."window_start" >= 0),
	CONSTRAINT "mutation_rate_limits_request_count_check" CHECK("mutation_rate_limits"."request_count" >= 1),
	CONSTRAINT "mutation_rate_limits_scope_check" CHECK(length("mutation_rate_limits"."scope") BETWEEN 1 AND 120),
	CONSTRAINT "mutation_rate_limits_policy_version_check" CHECK(length("mutation_rate_limits"."policy_version") BETWEEN 1 AND 80)
);
--> statement-breakpoint
CREATE INDEX `mutation_rate_limits_updated_idx` ON `mutation_rate_limits` (`updated_at`);