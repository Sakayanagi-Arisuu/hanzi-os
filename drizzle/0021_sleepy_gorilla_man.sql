PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`stable_key` text NOT NULL,
	`item_type` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_items_type_check" CHECK("__new_content_items"."item_type" IN (
        'vocabulary', 'character', 'grammar', 'pronunciation',
        'communicative_function', 'graded_text', 'lesson', 'exam_item', 'exam_form'
      )),
	CONSTRAINT "content_items_stable_key_check" CHECK(length("__new_content_items"."stable_key") BETWEEN 3 AND 160
        AND "__new_content_items"."stable_key" NOT GLOB '*[^a-z0-9._:-]*')
);
--> statement-breakpoint
INSERT INTO `__new_content_items`("id", "stable_key", "item_type", "created_by_user_id", "created_at", "updated_at") SELECT "id", "stable_key", "item_type", "created_by_user_id", "created_at", "updated_at" FROM `content_items`;--> statement-breakpoint
DROP TABLE `content_items`;--> statement-breakpoint
ALTER TABLE `__new_content_items` RENAME TO `content_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `content_items_stable_key_uidx` ON `content_items` (`stable_key`);--> statement-breakpoint
CREATE INDEX `content_items_type_updated_idx` ON `content_items` (`item_type`,`updated_at`);