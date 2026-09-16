CREATE TABLE `lesson_media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`content_sha256` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_length` integer NOT NULL,
	`metadata_json` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "lesson_media_metadata_valid" CHECK(json_valid("lesson_media_assets"."metadata_json")),
	CONSTRAINT "lesson_media_size_valid" CHECK("lesson_media_assets"."byte_length" BETWEEN 1 AND 8388608)
);
--> statement-breakpoint
CREATE TABLE `lesson_media_chunks` (
	`asset_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`data_base64` text NOT NULL,
	PRIMARY KEY(`asset_id`, `sequence`),
	FOREIGN KEY (`asset_id`) REFERENCES `lesson_media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
