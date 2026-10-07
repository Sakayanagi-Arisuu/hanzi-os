CREATE TABLE `commerce_sandbox_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`paid_at` integer,
	`updated_at` integer NOT NULL,
	`refund_requested_at` integer,
	`refund_reason` text,
	`refunded_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "commerce_sandbox_plan" CHECK("commerce_sandbox_orders"."plan_id" IN ('hsk4-month','hsk4-year')),
	CONSTRAINT "commerce_sandbox_status" CHECK("commerce_sandbox_orders"."status" IN ('pending','paid','failed','cancelled','refunded')),
	CONSTRAINT "commerce_sandbox_paid" CHECK(("commerce_sandbox_orders"."status" IN ('paid','refunded') AND "commerce_sandbox_orders"."paid_at" IS NOT NULL) OR ("commerce_sandbox_orders"."status" IN ('pending','failed','cancelled') AND "commerce_sandbox_orders"."paid_at" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commerce_sandbox_owner_key` ON `commerce_sandbox_orders` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `commerce_sandbox_owner_status` ON `commerce_sandbox_orders` (`user_id`,`status`);