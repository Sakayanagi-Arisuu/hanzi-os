ALTER TABLE `hanzi_premium_orders` ADD `refund_rejected_at` integer;
--> statement-breakpoint
ALTER TABLE `hanzi_premium_orders` ADD `refund_rejected_by` text;
--> statement-breakpoint
ALTER TABLE `hanzi_premium_orders` ADD `refund_rejection_reason` text;
