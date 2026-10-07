CREATE TABLE `hanzi_wallet_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`delta` integer NOT NULL,
	`kind` text NOT NULL,
	`reference_id` text NOT NULL,
	`actor_user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hanzi_wallet_entry_kind" CHECK("hanzi_wallet_entries"."kind" IN ('admin_credit','admin_debit','purchase','refund','verified_topup')),
	CONSTRAINT "hanzi_wallet_entry_delta" CHECK("hanzi_wallet_entries"."delta" BETWEEN -1000000000 AND 1000000000 AND "hanzi_wallet_entries"."delta" <> 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hanzi_wallet_owner_reference` ON `hanzi_wallet_entries` (`user_id`,`reference_id`);--> statement-breakpoint
CREATE INDEX `hanzi_wallet_owner_created` ON `hanzi_wallet_entries` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `hanzi_wallets` (
	`user_id` text PRIMARY KEY NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hanzi_wallet_balance" CHECK("hanzi_wallets"."balance" BETWEEN 0 AND 1000000000)
);
