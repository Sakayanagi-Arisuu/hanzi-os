ALTER TABLE `assessment_sessions` ADD `terminal_reason` text;--> statement-breakpoint
UPDATE `assessment_sessions`
SET `terminal_reason` = 'user-abandoned'
WHERE `status` = 'abandoned';--> statement-breakpoint
UPDATE `assessment_sessions`
SET
  `status` = 'abandoned',
  `terminal_at` = MAX(
    `started_at`,
    COALESCE((
      SELECT document.`updated_at`
      FROM `learning_documents` document
      WHERE document.`user_id` = `assessment_sessions`.`user_id`
      LIMIT 1
    ), `started_at`)
  ),
  `terminal_reason` = 'reset-invalidated'
WHERE `status` = 'started'
  AND EXISTS (
    SELECT 1
    FROM `learning_documents` document
    WHERE document.`user_id` = `assessment_sessions`.`user_id`
      AND json_valid(document.`document_json`) = 1
      AND json_type(document.`document_json`, '$.reset.epoch') = 'integer'
      AND json_extract(document.`document_json`, '$.reset.epoch')
        BETWEEN 1 AND 2147483647
      AND json_extract(document.`document_json`, '$.reset.epoch')
        > `assessment_sessions`.`reset_epoch`
  );--> statement-breakpoint
UPDATE `outbox_events`
SET `payload_json` = json_set(
  `payload_json`,
  '$.contentVersion', (
    SELECT attempt.`content_version`
    FROM `learning_attempts` attempt
    WHERE attempt.`id` = `outbox_events`.`aggregate_id`
      AND attempt.`user_id` = `outbox_events`.`user_id`
      AND attempt.`reset_epoch` = `outbox_events`.`reset_epoch`
    LIMIT 1
  ),
  '$.contentManifestSha256', (
    SELECT course.`manifest_hash`
    FROM `learning_attempts` attempt
    INNER JOIN `course_versions` course
      ON course.`id` = attempt.`content_version`
    WHERE attempt.`id` = `outbox_events`.`aggregate_id`
      AND attempt.`user_id` = `outbox_events`.`user_id`
      AND attempt.`reset_epoch` = `outbox_events`.`reset_epoch`
    LIMIT 1
  ),
  '$.skill', (
    SELECT attempt.`skill`
    FROM `learning_attempts` attempt
    WHERE attempt.`id` = `outbox_events`.`aggregate_id`
      AND attempt.`user_id` = `outbox_events`.`user_id`
      AND attempt.`reset_epoch` = `outbox_events`.`reset_epoch`
    LIMIT 1
  ),
  '$.outcome', (
    SELECT attempt.`outcome`
    FROM `learning_attempts` attempt
    WHERE attempt.`id` = `outbox_events`.`aggregate_id`
      AND attempt.`user_id` = `outbox_events`.`user_id`
      AND attempt.`reset_epoch` = `outbox_events`.`reset_epoch`
    LIMIT 1
  ),
  '$.score', (
    SELECT attempt.`score`
    FROM `learning_attempts` attempt
    WHERE attempt.`id` = `outbox_events`.`aggregate_id`
      AND attempt.`user_id` = `outbox_events`.`user_id`
      AND attempt.`reset_epoch` = `outbox_events`.`reset_epoch`
    LIMIT 1
  ),
  '$.verification', 'server-objective',
  '$.masteryEligible', json('false')
)
WHERE `event_type` = 'learning.attempt.recorded'
  AND `aggregate_type` = 'learning_attempt'
  AND json_valid(`payload_json`) = 1
  AND json_type(`payload_json`) = 'object'
  AND EXISTS (
    SELECT 1
    FROM `learning_attempts` attempt
    INNER JOIN `course_versions` course
      ON course.`id` = attempt.`content_version`
    WHERE attempt.`id` = `outbox_events`.`aggregate_id`
      AND attempt.`user_id` = `outbox_events`.`user_id`
      AND attempt.`reset_epoch` = `outbox_events`.`reset_epoch`
  );--> statement-breakpoint
CREATE TRIGGER `assessment_sessions_terminal_reason_insert`
BEFORE INSERT ON `assessment_sessions`
WHEN (
  NEW.`status` = 'abandoned'
  AND (
    NEW.`terminal_reason` IS NULL
    OR NEW.`terminal_reason` NOT IN ('user-abandoned', 'reset-invalidated')
  )
) OR (
  NEW.`status` <> 'abandoned'
  AND NEW.`terminal_reason` IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'assessment session terminal reason is invalid');
END;--> statement-breakpoint
CREATE TRIGGER `assessment_sessions_terminal_reason_update`
BEFORE UPDATE OF `status`, `terminal_reason` ON `assessment_sessions`
WHEN (
  NEW.`status` = 'abandoned'
  AND (
    NEW.`terminal_reason` IS NULL
    OR NEW.`terminal_reason` NOT IN ('user-abandoned', 'reset-invalidated')
  )
) OR (
  NEW.`status` <> 'abandoned'
  AND NEW.`terminal_reason` IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'assessment session terminal reason is invalid');
END;
