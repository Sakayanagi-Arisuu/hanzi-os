DROP INDEX `fsrs_cards_user_item_modality_uidx`;--> statement-breakpoint
CREATE UNIQUE INDEX `fsrs_cards_user_item_modality_uidx` ON `fsrs_cards` (`user_id`,`enrollment_id`,`reset_epoch`,`knowledge_item_type`,`knowledge_item_id`,`knowledge_item_version`,`modality`,`scheduler_version`) WHERE "fsrs_cards"."activation_session_id" IS NOT NULL;--> statement-breakpoint
CREATE TRIGGER `outbox_events_review_epoch_insert`
BEFORE INSERT ON `outbox_events`
WHEN NEW.`aggregate_type` = 'review_log'
  AND NOT EXISTS (
    SELECT 1 FROM `review_logs` parent
    WHERE parent.`user_id` = NEW.`user_id`
      AND parent.`id` = NEW.`aggregate_id`
      AND parent.`reset_epoch` = NEW.`reset_epoch`
  )
BEGIN
  SELECT RAISE(ABORT, 'review outbox event reset epoch does not match its aggregate');
END;--> statement-breakpoint
CREATE TRIGGER `outbox_events_review_epoch_update`
BEFORE UPDATE OF `user_id`, `aggregate_type`, `aggregate_id`, `reset_epoch`
ON `outbox_events`
WHEN NEW.`aggregate_type` = 'review_log'
  AND NOT EXISTS (
    SELECT 1 FROM `review_logs` parent
    WHERE parent.`user_id` = NEW.`user_id`
      AND parent.`id` = NEW.`aggregate_id`
      AND parent.`reset_epoch` = NEW.`reset_epoch`
  )
BEGIN
  SELECT RAISE(ABORT, 'review outbox event reset epoch does not match its aggregate');
END;
