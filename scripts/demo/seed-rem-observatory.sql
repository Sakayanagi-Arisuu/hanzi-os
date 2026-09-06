-- Review-only fixture for the learner.demo Nghịch Cảnh Lục walkthrough.
-- Every signal references a released activity/version. Evidence is verified so
-- the real queue can read it, but mastery_eligible stays false by design.

BEGIN TRANSACTION;

WITH RECURSIVE
  sequence(n) AS (VALUES(1) UNION ALL SELECT n + 1 FROM sequence WHERE n < 4),
  groups(key, quantity, day_offset, activity_id, activity_version, source, method, skill, answer, policy, prior_exposure) AS (
    VALUES
      ('grammar', 4, 0, 'daily-1:hsk-vocab-00046-sentence', 'foundation-2026.08.7:daily-1:1', 'lesson', 'reading-comprehension', 'grammar', 'Không có ai ở đây.', 'objective-policy-v1', 0),
      ('listening', 4, 1, 'boot-1:yi-listening', 'foundation-2026.08.7:boot-1:1', 'lesson', 'listening-selection', 'listening', 'hai', 'objective-policy-v1', 0),
      ('reader', 4, 2, 'first-day:first-day-main-idea', 'foundation-2026.08.7:reader-item:first-day-main-idea:1', 'reader', 'reading-comprehension', 'reading', 'Hỏi đường đến trường rồi mua một quyển sách.', 'reader-support-exposure-v1:reader-objective-scoring-v1', 1),
      ('pronunciation', 3, 0, 'boot-1:er-pinyin', 'foundation-2026.08.7:boot-1:1', 'lesson', 'phonology-recognition', 'pronunciation', 'ér', 'objective-policy-v1', 0),
      ('vocabulary', 3, 3, 'boot-1:er-meaning', 'foundation-2026.08.7:boot-1:1', 'lesson', 'meaning-selection', 'vocabulary', 'một', 'objective-policy-v1', 0)
  ),
  fixture AS (
    SELECT
      'rem-review-20260905-' || key || '-' || printf('%02d', n) AS base_id,
      groups.*,
      (unixepoch('now') * 1000) - (day_offset * 86400000 + (quantity - n) * 3600000) AS event_time
    FROM groups JOIN sequence ON sequence.n <= groups.quantity
  )
INSERT OR IGNORE INTO idempotency_records (
  id, user_id, device_id, device_sequence, reset_epoch, scope,
  idempotency_key, request_hash, status, lease_token, lease_expires_at,
  response_status, response_json, created_at, updated_at, completed_at
)
SELECT
  base_id || '-idem', 'local-demo-user-1', NULL, NULL, 0,
  'learning-attempt-v1', base_id, 'review-fixture-' || key,
  'completed', NULL, NULL, 201,
  json_object('fixture', 'rem-observatory-review'),
  event_time, event_time, event_time
FROM fixture;

WITH RECURSIVE
  sequence(n) AS (VALUES(1) UNION ALL SELECT n + 1 FROM sequence WHERE n < 4),
  groups(key, quantity, day_offset, activity_id, activity_version, source, method, skill, answer, policy, prior_exposure) AS (
    VALUES
      ('grammar', 4, 0, 'daily-1:hsk-vocab-00046-sentence', 'foundation-2026.08.7:daily-1:1', 'lesson', 'reading-comprehension', 'grammar', 'Không có ai ở đây.', 'objective-policy-v1', 0),
      ('listening', 4, 1, 'boot-1:yi-listening', 'foundation-2026.08.7:boot-1:1', 'lesson', 'listening-selection', 'listening', 'hai', 'objective-policy-v1', 0),
      ('reader', 4, 2, 'first-day:first-day-main-idea', 'foundation-2026.08.7:reader-item:first-day-main-idea:1', 'reader', 'reading-comprehension', 'reading', 'Hỏi đường đến trường rồi mua một quyển sách.', 'reader-support-exposure-v1:reader-objective-scoring-v1', 1),
      ('pronunciation', 3, 0, 'boot-1:er-pinyin', 'foundation-2026.08.7:boot-1:1', 'lesson', 'phonology-recognition', 'pronunciation', 'ér', 'objective-policy-v1', 0),
      ('vocabulary', 3, 3, 'boot-1:er-meaning', 'foundation-2026.08.7:boot-1:1', 'lesson', 'meaning-selection', 'vocabulary', 'một', 'objective-policy-v1', 0)
  ),
  fixture AS (
    SELECT
      'rem-review-20260905-' || key || '-' || printf('%02d', n) AS base_id,
      groups.*,
      (unixepoch('now') * 1000) - (day_offset * 86400000 + (quantity - n) * 3600000) AS event_time
    FROM groups JOIN sequence ON sequence.n <= groups.quantity
  )
INSERT OR IGNORE INTO learning_attempts (
  id, user_id, enrollment_id, session_id, device_id, device_sequence,
  idempotency_record_id, schema_version, reset_epoch, content_version,
  activity_id, activity_version, source, method, skill, response_json,
  outcome, score, used_hint, prior_exposure, required_for_pass,
  scoring_version, occurred_at, received_at
)
SELECT
  base_id || '-attempt', 'local-demo-user-1',
  '0af598c5-bf07-4afb-ba69-81186487fc9c', NULL, NULL, NULL,
  base_id || '-idem', 1, 0, 'foundation-2026.08.7',
  activity_id, activity_version, source, method, skill,
  json_object('kind', 'answer', 'answer', answer, 'usedHint', json('false'), 'durationMs', 12000),
  'incorrect', 0, 0, prior_exposure, 0, policy, event_time, event_time + 100
FROM fixture;

WITH RECURSIVE
  sequence(n) AS (VALUES(1) UNION ALL SELECT n + 1 FROM sequence WHERE n < 4),
  groups(key, quantity, day_offset, activity_id, activity_version, source, method, skill, answer, policy, prior_exposure) AS (
    VALUES
      ('grammar', 4, 0, 'daily-1:hsk-vocab-00046-sentence', 'foundation-2026.08.7:daily-1:1', 'lesson', 'reading-comprehension', 'grammar', 'Không có ai ở đây.', 'objective-policy-v1', 0),
      ('listening', 4, 1, 'boot-1:yi-listening', 'foundation-2026.08.7:boot-1:1', 'lesson', 'listening-selection', 'listening', 'hai', 'objective-policy-v1', 0),
      ('reader', 4, 2, 'first-day:first-day-main-idea', 'foundation-2026.08.7:reader-item:first-day-main-idea:1', 'reader', 'reading-comprehension', 'reading', 'Hỏi đường đến trường rồi mua một quyển sách.', 'reader-support-exposure-v1:reader-objective-scoring-v1', 1),
      ('pronunciation', 3, 0, 'boot-1:er-pinyin', 'foundation-2026.08.7:boot-1:1', 'lesson', 'phonology-recognition', 'pronunciation', 'ér', 'objective-policy-v1', 0),
      ('vocabulary', 3, 3, 'boot-1:er-meaning', 'foundation-2026.08.7:boot-1:1', 'lesson', 'meaning-selection', 'vocabulary', 'một', 'objective-policy-v1', 0)
  ),
  fixture AS (
    SELECT
      'rem-review-20260905-' || key || '-' || printf('%02d', n) AS base_id,
      groups.*,
      (unixepoch('now') * 1000) - (day_offset * 86400000 + (quantity - n) * 3600000) AS event_time
    FROM groups JOIN sequence ON sequence.n <= groups.quantity
  )
INSERT OR IGNORE INTO learning_evidence (
  id, user_id, enrollment_id, attempt_id, session_id, schema_version,
  reset_epoch, policy_version, content_version, activity_id,
  activity_version, source, method, skill, outcome, score, verified,
  mastery_eligible, metadata_json, occurred_at, recorded_at
)
SELECT
  base_id || '-evidence', 'local-demo-user-1',
  '0af598c5-bf07-4afb-ba69-81186487fc9c', base_id || '-attempt', NULL,
  1, 0, policy, 'foundation-2026.08.7', activity_id, activity_version,
  source, method, skill, 'incorrect', 0, 1, 0,
  json_object('fixture', 'rem-observatory-review', 'reviewOnly', json('true')),
  event_time, event_time + 100
FROM fixture;

COMMIT;

SELECT
  COUNT(*) AS seeded_attempts,
  COUNT(DISTINCT activity_id || ':' || activity_version) AS seeded_signals,
  SUM(CASE WHEN source = 'reader' THEN 1 ELSE 0 END) AS reader_attempts
FROM learning_attempts
WHERE id LIKE 'rem-review-20260905-%-attempt';
