CREATE TABLE `learner_access_days` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`first_seen_at` integer NOT NULL,
	`provenance` text DEFAULT 'visit' NOT NULL,
	PRIMARY KEY(`user_id`, `day`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
