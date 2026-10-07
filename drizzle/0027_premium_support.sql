CREATE TABLE `premium_support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`response` text,
	`responded_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "premium_support_category" CHECK("premium_support_tickets"."category" IN ('access','billing','technical')),
	CONSTRAINT "premium_support_status" CHECK("premium_support_tickets"."status" IN ('open','answered','closed'))
);
--> statement-breakpoint
CREATE INDEX `premium_support_owner_created` ON `premium_support_tickets` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `premium_support_status_created` ON `premium_support_tickets` (`status`,`created_at`);