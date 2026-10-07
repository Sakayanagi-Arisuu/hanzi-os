CREATE TABLE `hanzi_plan_prices` (
	`plan_id` text PRIMARY KEY NOT NULL,
	`amount` integer NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "hanzi_plan_price_id" CHECK("hanzi_plan_prices"."plan_id" IN ('hsk4-month','hsk4-year')),
	CONSTRAINT "hanzi_plan_price_amount" CHECK("hanzi_plan_prices"."amount" BETWEEN 1 AND 1000000)
);
--> statement-breakpoint
CREATE TABLE `hanzi_premium_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`amount` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`paid_at` integer NOT NULL,
	`refund_requested_at` integer,
	`refund_reason` text,
	`refunded_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hanzi_premium_plan" CHECK("hanzi_premium_orders"."plan_id" IN ('hsk4-month','hsk4-year')),
	CONSTRAINT "hanzi_premium_amount" CHECK("hanzi_premium_orders"."amount" BETWEEN 1 AND 1000000),
	CONSTRAINT "hanzi_premium_status" CHECK("hanzi_premium_orders"."status" IN ('paid','refunded'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hanzi_premium_owner_key` ON `hanzi_premium_orders` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `hanzi_premium_owner_paid` ON `hanzi_premium_orders` (`user_id`,`paid_at`);