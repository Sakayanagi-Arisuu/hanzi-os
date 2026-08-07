import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const workspace = process.cwd();
const temporaryDirectory = await mkdtemp(join(tmpdir(), "hanzi-os-d1-restore-"));
const sourcePath = join(temporaryDirectory, "source.sqlite");
const backupPath = join(temporaryDirectory, "backup.sqlite");
let source = null;
let restored = null;

const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const canonicalValue = (value, seen = new WeakSet(), arrayPosition = false) => {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : "null";
  }
  if (
    typeof value === "undefined"
    || typeof value === "function"
    || typeof value === "symbol"
  ) {
    return arrayPosition ? "null" : undefined;
  }
  if (typeof value === "bigint") {
    throw new TypeError("BigInt cannot be represented as canonical JSON");
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (seen.has(value)) throw new TypeError("Cannot canonicalize cyclic data");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) =>
        canonicalValue(item, seen, true) ?? "null"
      ).join(",")}]`;
    }
    return `{${Object.keys(value).sort().flatMap((key) => {
      const encoded = canonicalValue(value[key], seen);
      return encoded === undefined
        ? []
        : [`${JSON.stringify(key)}:${encoded}`];
    }).join(",")}}`;
  } finally {
    seen.delete(value);
  }
};
const canonicalStringify = (value) =>
  canonicalValue(value) ?? "null";
const canonicalDigest = (value) =>
  `sha256:${digest(canonicalStringify(value))}`;
const expectCheckConstraint = (action, constraintName) => {
  try {
    action();
  } catch (error) {
    if (String(error).includes(constraintName)) return;
    throw error;
  }
  throw new Error(`${constraintName} did not reject an invalid row`);
};

const expectedReaderGraph = {
  sessions: 1,
  exposures: 1,
  sessionAttempts: 1,
  attempts: 1,
  evidence: 1,
  outboxEvents: 1,
  joined: 1,
  verifiedEvidence: 1,
  masteryEligibleEvidence: 1,
  exactReadingEvidence: 1,
};

const expectedReaderTriggers = [
  "outbox_events_reader_epoch_insert",
  "outbox_events_reader_epoch_update",
  "reader_sessions_reset_invalidation",
  "reader_sessions_status_transition_update",
];

const expectedEditorialAssignmentTriggers = [
  "editorial_assignment_events_immutable_delete",
  "editorial_assignment_events_immutable_update",
  "editorial_assignment_events_predecessor_insert",
  "editorial_assignment_events_stream_size_insert",
  "editorial_assignment_events_transition_insert",
];

const readEditorialAssignmentTriggers = (database) => database.prepare(
  `SELECT name FROM sqlite_master
   WHERE type = 'trigger'
     AND name LIKE 'editorial_assignment_events_%'
   ORDER BY name`,
).all().map((row) => row.name);

const readEditorialAssignmentChain = (database, streamId) => database.prepare(
  `SELECT
    event_id AS eventId,
    sequence,
    event_type AS eventType,
    assignment_id AS assignmentId,
    previous_assignment_id AS previousAssignmentId,
    previous_event_id AS previousEventId,
    event_sha256 AS eventSha256
   FROM editorial_assignment_events
   WHERE stream_id = ?
   ORDER BY sequence`,
).all(streamId);

const readEditorialAssignmentCanonicalRows = (database, streamId) =>
  database.prepare(
    `SELECT
      event_id AS eventId,
      envelope_json AS envelopeJson,
      assignment_sha256 AS assignmentSha256,
      request_sha256 AS requestSha256,
      event_json AS eventJson,
      event_sha256 AS eventSha256
     FROM editorial_assignment_events
     WHERE stream_id = ?
     ORDER BY sequence`,
  ).all(streamId);

const readReaderFixture = (database) => ({
  session: database.prepare(
    `SELECT
      form_manifest_json AS formManifestJson,
      form_manifest_hash AS formManifestHash,
      status,
      correct_count AS correctCount
    FROM reader_sessions
    WHERE user_id = ? AND id = 'restore-reader-session'`,
  ).get("restore-user"),
  attempt: database.prepare(
    `SELECT response_json AS responseJson, outcome, score
     FROM learning_attempts
     WHERE user_id = ?
       AND id = 'restore-reader-attempt'
       AND source = 'reader'`,
  ).get("restore-user"),
  graph: database.prepare(
    `SELECT
      (SELECT COUNT(*) FROM reader_sessions WHERE user_id = ?) AS sessions,
      (SELECT COUNT(*) FROM reader_item_exposures WHERE user_id = ?)
        AS exposures,
      (SELECT COUNT(*) FROM reader_session_attempts WHERE user_id = ?)
        AS sessionAttempts,
      (SELECT COUNT(*) FROM learning_attempts
        WHERE user_id = ? AND source = 'reader') AS attempts,
      (SELECT COUNT(*) FROM learning_evidence
        WHERE user_id = ? AND source = 'reader') AS evidence,
      (SELECT COUNT(*) FROM outbox_events
        WHERE user_id = ? AND aggregate_type = 'reader_session')
        AS outboxEvents,
      COUNT(*) AS joined,
      MIN(evidence.verified) AS verifiedEvidence,
      MIN(evidence.mastery_eligible) AS masteryEligibleEvidence,
      MIN(CASE
        WHEN evidence.source = 'reader'
          AND evidence.method = 'reading-comprehension'
          AND evidence.skill = 'reading'
          AND evidence.outcome = 'correct'
          AND evidence.score = 100
        THEN 1
        ELSE 0
      END) AS exactReadingEvidence
    FROM reader_sessions session
    INNER JOIN reader_item_exposures exposure
      ON exposure.user_id = session.user_id
      AND exposure.session_id = session.id
      AND exposure.reset_epoch = session.reset_epoch
    INNER JOIN reader_session_attempts session_attempt
      ON session_attempt.user_id = session.user_id
      AND session_attempt.session_id = session.id
      AND session_attempt.reset_epoch = session.reset_epoch
      AND session_attempt.item_version = exposure.item_version
      AND session_attempt.form_manifest_hash = session.form_manifest_hash
    INNER JOIN learning_attempts attempt
      ON attempt.user_id = session_attempt.user_id
      AND attempt.id = session_attempt.attempt_id
      AND attempt.reset_epoch = session_attempt.reset_epoch
      AND attempt.session_id IS NULL
      AND attempt.source = 'reader'
    INNER JOIN learning_evidence evidence
      ON evidence.user_id = attempt.user_id
      AND evidence.attempt_id = attempt.id
      AND evidence.reset_epoch = attempt.reset_epoch
      AND evidence.session_id IS NULL
    WHERE session.user_id = ?
      AND session.id = 'restore-reader-session'`,
  ).get(
    "restore-user",
    "restore-user",
    "restore-user",
    "restore-user",
    "restore-user",
    "restore-user",
    "restore-user",
  ),
});

const assertReaderFixture = ({
  session,
  attempt,
  graph,
}, {
  stage,
  formJson,
  formHash,
  responseJson,
}) => {
  if (
    session?.formManifestHash !== formHash
    || digest(session?.formManifestJson ?? "") !== digest(formJson)
    || session?.status !== "submitted"
    || session?.correctCount !== 1
  ) {
    throw new Error(
      `${stage} Reader session or form manifest does not match its source`,
    );
  }
  if (
    digest(attempt?.responseJson ?? "") !== digest(responseJson)
    || attempt?.outcome !== "correct"
    || attempt?.score !== 100
  ) {
    throw new Error(
      `${stage} Reader attempt response or score does not match its source`,
    );
  }
  if (JSON.stringify(graph) !== JSON.stringify(expectedReaderGraph)) {
    throw new Error(
      `${stage} Reader graph does not preserve every tenant-owned relation`,
    );
  }
};

const readReaderTriggers = (database) => database.prepare(
  `SELECT name FROM sqlite_master
   WHERE type = 'trigger'
     AND name IN (
       'outbox_events_reader_epoch_insert',
       'outbox_events_reader_epoch_update',
       'reader_sessions_reset_invalidation',
       'reader_sessions_status_transition_update'
     )
   ORDER BY name`,
).all().map((row) => row.name);

try {
  const migrationDirectory = join(workspace, "drizzle");
  const migrations = (await readdir(migrationDirectory))
    .filter((file) => /^\d+.*\.sql$/u.test(file))
    .sort();
  if (!migrations.length) throw new Error("No D1 migration was found");
  if (
    migrations.length !== 19
    || !migrations[18]?.startsWith("0018_")
  ) {
    throw new Error(
      `Restore rehearsal requires 19 migrations through 0018; found ${
        migrations.length
      }`,
    );
  }

  source = new DatabaseSync(sourcePath);
  source.exec("PRAGMA foreign_keys = ON");
  const formMigrationIndex = migrations.findIndex((migration) =>
    migration.startsWith("0002_")
  );
  if (formMigrationIndex < 1) {
    throw new Error("The immutable lesson-form migration was not found");
  }
  for (const migration of migrations.slice(0, formMigrationIndex)) {
    source.exec(await readFile(join(migrationDirectory, migration), "utf8"));
    if (source.prepare("PRAGMA foreign_keys").get()?.foreign_keys !== 1) {
      throw new Error(`${migration} left foreign-key enforcement disabled`);
    }
  }

  // Seed a legacy session and both child-FK paths before the table-rebuild
  // migration. The upgrade must preserve these rows with null form columns;
  // the application then fails closed when asked to submit that legacy row.
  source.exec("BEGIN IMMEDIATE");
  try {
    source.prepare(
      "INSERT INTO users (id, status, created_at, updated_at) VALUES ('migration-legacy-user', 'active', 1, 1)",
    ).run();
    source.prepare(
      "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES ('migration-legacy-user', 'Legacy learner', 'hsk', 20, 'simplified', 'hsk2', 1, 1, 1, 1)",
    ).run();
    source.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES ('migration-legacy-content', 'migration-course', 1, 'migration-hash', 'beta', 'pending', 1)",
    ).run();
    source.prepare(
      "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES ('migration-legacy-enrollment', 'migration-legacy-user', 'migration-legacy-content', 'conversation', 'active', 1, 1, 1)",
    ).run();
    source.prepare(
      "INSERT INTO idempotency_records (id, user_id, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('migration-open-idempotency', 'migration-legacy-user', 'lesson-session-v1', 'migration-open', 'migration-open-hash', 'completed', 1, 1)",
    ).run();
    source.prepare(
      "INSERT INTO idempotency_records (id, user_id, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('migration-attempt-idempotency', 'migration-legacy-user', 'learning-attempt-v1', 'migration-attempt', 'migration-attempt-hash', 'completed', 1, 1)",
    ).run();
    source.prepare(
      "INSERT INTO lesson_sessions (id, user_id, enrollment_id, idempotency_record_id, schema_version, content_version, lesson_id, lesson_version, expected_evidence_count, status, started_at, created_at) VALUES ('migration-legacy-session', 'migration-legacy-user', 'migration-legacy-enrollment', 'migration-open-idempotency', 1, 'migration-legacy-content', 'legacy-lesson', 'legacy-v1', 1, 'started', 1, 1)",
    ).run();
    source.prepare(
      "INSERT INTO learning_documents (user_id, revision, document_json, schema_version, content_version, updated_at) VALUES ('migration-legacy-user', 1, ?, 1, 'migration-legacy-content', 1)",
    ).run(JSON.stringify({ reset: { epoch: 1 } }));
    source.prepare(
      "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, payload_json, status, attempts, available_at, created_at) VALUES ('migration-legacy-event', 'migration-legacy-user', 'lesson_session', 'migration-legacy-session', 'lesson.started', 1, '{}', 'pending', 0, 1, 1)",
    ).run();
    source.prepare(
      "INSERT INTO sync_changes (user_id, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at) VALUES ('migration-legacy-user', 'learning_document', 'migration-legacy-user', 1, 'migration-legacy-change', 'upsert', '{}', 1)",
    ).run();
    source.prepare(
      "INSERT INTO learning_attempts (id, user_id, enrollment_id, session_id, idempotency_record_id, schema_version, content_version, activity_id, activity_version, source, method, skill, response_json, outcome, used_hint, prior_exposure, required_for_pass, scoring_version, occurred_at, received_at) VALUES ('migration-legacy-attempt', 'migration-legacy-user', 'migration-legacy-enrollment', 'migration-legacy-session', 'migration-attempt-idempotency', 1, 'migration-legacy-content', 'legacy-lesson:q1', 'legacy-v1', 'lesson', 'meaning-selection', 'vocabulary', '{}', 'correct', 0, 0, 0, 'legacy-policy', 1, 1)",
    ).run();
    source.prepare(
      "INSERT INTO learning_evidence (id, user_id, enrollment_id, attempt_id, session_id, schema_version, policy_version, content_version, activity_id, activity_version, source, method, skill, outcome, score, verified, mastery_eligible, metadata_json, occurred_at, recorded_at) VALUES ('migration-legacy-evidence', 'migration-legacy-user', 'migration-legacy-enrollment', NULL, 'migration-legacy-session', 1, 'legacy-completion', 'migration-legacy-content', 'legacy-lesson:completion', 'legacy-v1', 'lesson', 'lesson-completion', 'vocabulary', 'completed', 100, 1, 0, '{}', 1, 1)",
    ).run();
    source.exec("COMMIT");
  } catch (error) {
    source.exec("ROLLBACK");
    throw error;
  }
  for (const migration of migrations.slice(formMigrationIndex)) {
    if (migration.startsWith("0007_")) {
      source.prepare(
        "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at) VALUES ('migration-processing-event', 'migration-legacy-user', 'lesson_session', 'migration-legacy-session', 'lesson.started', 1, 0, '{}', 'processing', 1, 1, 1)",
      ).run();
    }
    if (migration.startsWith("0008_")) {
      source.prepare(
        "INSERT INTO devices (id, user_id, installation_id, last_acked_cursor, created_at, last_seen_at) VALUES ('migration-assessment-device', 'migration-legacy-user', 'migration-assessment-installation', 0, 1, 1)",
      ).run();
      for (const [id, key, sequence] of [
        [
          "migration-assessment-started-idempotency",
          "migration-assessment-started",
          700,
        ],
        [
          "migration-assessment-abandoned-idempotency",
          "migration-assessment-abandoned",
          701,
        ],
      ]) {
        source.prepare(
          "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES (?, 'migration-legacy-user', 'migration-assessment-device', ?, 0, 'assessment-session-open-v1', ?, 'migration-assessment-hash', 'completed', 201, '{}', 1, 1, 1)",
        ).run(id, sequence, key);
      }
      const insertAssessment = source.prepare(
        `INSERT INTO assessment_sessions (
          id, user_id, enrollment_id, device_id, idempotency_record_id,
          schema_version, reset_epoch, content_version, blueprint_id,
          form_version, scoring_policy_version, expected_item_count,
          form_schema_version, form_manifest_json, form_manifest_hash, status,
          started_at, terminal_at, created_at
        ) VALUES (
          ?, 'migration-legacy-user', 'migration-legacy-enrollment',
          'migration-assessment-device', ?, 1, 0,
          'migration-legacy-content', 'migration-blueprint',
          'migration-form-v1', 'migration-scoring-v1', 1, 1, '{}',
          'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          ?, 2, ?, 1
        )`,
      );
      insertAssessment.run(
        "migration-reset-invalidated-assessment",
        "migration-assessment-started-idempotency",
        "started",
        null,
      );
      insertAssessment.run(
        "migration-user-abandoned-assessment",
        "migration-assessment-abandoned-idempotency",
        "abandoned",
        3,
      );
    }
    if (migration.startsWith("0009_")) {
      source.prepare(
        "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('migration-review-idempotency', 'migration-legacy-user', 0, 'learning-review-v1', 'migration-review', 'migration-review-hash', 'completed', 201, '{}', 4, 4, 4)",
      ).run();
      source.prepare(
        `INSERT INTO fsrs_cards (
          id, user_id, enrollment_id, reset_epoch, content_version,
          knowledge_item_type, knowledge_item_id, knowledge_item_version,
          modality, scheduler_version, due_at, stability, difficulty,
          elapsed_days, scheduled_days, learning_steps, reps, lapses, state,
          last_review_at, revision, created_at, updated_at
        ) VALUES (
          'migration-review-card', 'migration-legacy-user',
          'migration-legacy-enrollment', 0, 'migration-legacy-content',
          'vocabulary', 'migration-word', 'migration-word-v1',
          'hanzi-reading-meaning-recall', 'legacy-scheduler', 4, 1, 1, 0, 1,
          0, 1, 0, 2, 4, 1, 4, 4
        )`,
      ).run();
      source.prepare(
        `INSERT INTO review_logs (
          id, user_id, card_id, attempt_id, idempotency_record_id,
          reset_epoch, rating, scheduler_version, scheduled_at, reviewed_at,
          received_at, duration_ms, pre_card_json, post_card_json
        ) VALUES (
          'migration-review-log', 'migration-legacy-user',
          'migration-review-card', NULL, 'migration-review-idempotency', 0, 3,
          'legacy-scheduler', 4, 4, 4, 1000, '{}', '{}'
        )`,
      ).run();
    }
    source.exec(await readFile(join(migrationDirectory, migration), "utf8"));
    if (source.prepare("PRAGMA foreign_keys").get()?.foreign_keys !== 1) {
      throw new Error(`${migration} left foreign-key enforcement disabled`);
    }
  }
  const postUpgradeForeignKeys = source.prepare("PRAGMA foreign_key_check").all();
  const migratedLegacyProfile = source.prepare(
    "SELECT starting_level AS startingLevel, revision FROM profiles WHERE user_id = 'migration-legacy-user'",
  ).get();
  source.prepare(
    "UPDATE profiles SET starting_level = 'hsk4', revision = revision + 1 WHERE user_id = 'migration-legacy-user'",
  ).run();
  const migratedExpandedProfile = source.prepare(
    "SELECT starting_level AS startingLevel, revision FROM profiles WHERE user_id = 'migration-legacy-user'",
  ).get();
  expectCheckConstraint(() => source.prepare(
    "UPDATE profiles SET starting_level = 'hsk5' WHERE user_id = 'migration-legacy-user'",
  ).run(), "profiles_starting_level_check");
  const migratedLegacySession = source.prepare(
    "SELECT form_manifest_json AS formManifestJson, status FROM lesson_sessions WHERE id = 'migration-legacy-session'",
  ).get();
  const migratedLegacyEvent = source.prepare(
    "SELECT status, last_error AS lastError FROM outbox_events WHERE id = 'migration-legacy-event'",
  ).get();
  const migratedLegacyChange = source.prepare(
    "SELECT reset_epoch AS resetEpoch FROM sync_changes WHERE operation_id = 'migration-legacy-change'",
  ).get();
  const migratedProcessingEvent = source.prepare(
    "SELECT status, last_error AS lastError, lease_token AS leaseToken, lease_expires_at AS leaseExpiresAt FROM outbox_events WHERE id = 'migration-processing-event'",
  ).get();
  const migratedResetInvalidatedAssessment = source.prepare(
    "SELECT status, terminal_at AS terminalAt, terminal_reason AS terminalReason FROM assessment_sessions WHERE id = 'migration-reset-invalidated-assessment'",
  ).get();
  const migratedUserAbandonedAssessment = source.prepare(
    "SELECT status, terminal_at AS terminalAt, terminal_reason AS terminalReason FROM assessment_sessions WHERE id = 'migration-user-abandoned-assessment'",
  ).get();
  const assessmentTerminalTriggers = source.prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'trigger'
       AND name IN (
         'assessment_sessions_terminal_reason_insert',
         'assessment_sessions_terminal_reason_update'
       )
     ORDER BY name`,
  ).all().map((row) => row.name);
  const migratedReviewCard = source.prepare(
    "SELECT activation_session_id AS activationSessionId FROM fsrs_cards WHERE id = 'migration-review-card'",
  ).get();
  const migratedReviewLog = source.prepare(
    "SELECT card_id AS cardId, reset_epoch AS resetEpoch FROM review_logs WHERE id = 'migration-review-log'",
  ).get();
  const fsrsItemIndex = source.prepare(
    "PRAGMA index_info('fsrs_cards_user_item_modality_uidx')",
  ).all().map((column) => column.name);
  const fsrsItemIndexSql = source.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'fsrs_cards_user_item_modality_uidx'",
  ).get()?.sql;
  const fsrsDueIndex = source.prepare(
    "PRAGMA index_info('fsrs_cards_user_due_idx')",
  ).all().map((column) => column.name);
  const reviewOutboxEpochTriggers = source.prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'trigger'
       AND name IN (
         'outbox_events_review_epoch_insert',
         'outbox_events_review_epoch_update'
       )
     ORDER BY name`,
  ).all().map((row) => row.name);
  const syncChangeEpochIndex = source.prepare(
    "PRAGMA index_info('sync_changes_user_reset_epoch_seq_idx')",
  ).all().map((column) => column.name);
  if (
    postUpgradeForeignKeys.length
    || JSON.stringify(migratedLegacyProfile)
      !== JSON.stringify({ startingLevel: "hsk2", revision: 1 })
    || JSON.stringify(migratedExpandedProfile)
      !== JSON.stringify({ startingLevel: "hsk4", revision: 2 })
    || migratedLegacySession?.formManifestJson !== null
    || migratedLegacySession?.status !== "invalidated"
    || migratedLegacyEvent?.status !== "dead"
    || migratedLegacyEvent?.lastError !== "invalidated-by-learning-reset-migration"
    || migratedLegacyChange?.resetEpoch !== null
    || migratedProcessingEvent?.status !== "pending"
    || migratedProcessingEvent?.lastError !== "recovered-by-outbox-lease-v1"
    || migratedProcessingEvent?.leaseToken !== null
    || migratedProcessingEvent?.leaseExpiresAt !== null
    || JSON.stringify(migratedResetInvalidatedAssessment)
      !== JSON.stringify({
        status: "abandoned",
        terminalAt: 2,
        terminalReason: "reset-invalidated",
      })
    || JSON.stringify(migratedUserAbandonedAssessment)
      !== JSON.stringify({
        status: "abandoned",
        terminalAt: 3,
        terminalReason: "user-abandoned",
      })
    || assessmentTerminalTriggers.length !== 2
    || migratedReviewCard?.activationSessionId !== null
    || JSON.stringify(migratedReviewLog)
      !== JSON.stringify({
        cardId: "migration-review-card",
        resetEpoch: 0,
      })
    || JSON.stringify(fsrsItemIndex) !== JSON.stringify([
      "user_id",
      "enrollment_id",
      "reset_epoch",
      "knowledge_item_type",
      "knowledge_item_id",
      "knowledge_item_version",
      "modality",
      "scheduler_version",
    ])
    || typeof fsrsItemIndexSql !== "string"
    || !fsrsItemIndexSql.includes(
      'WHERE "fsrs_cards"."activation_session_id" IS NOT NULL',
    )
    || JSON.stringify(fsrsDueIndex) !== JSON.stringify([
      "user_id",
      "reset_epoch",
      "due_at",
    ])
    || reviewOutboxEpochTriggers.length !== 2
    || JSON.stringify(syncChangeEpochIndex) !== JSON.stringify([
      "user_id",
      "reset_epoch",
      "seq",
    ])
  ) {
    throw new Error(
      "Reset-aware migrations did not preserve legacy rows, indexes, or stale-work invalidation",
    );
  }

  for (const [operationId, resetEpoch] of [
    ["migration-negative-epoch-change", -1],
    ["migration-overflow-epoch-change", 2_147_483_648],
  ]) {
    expectCheckConstraint(() => source.prepare(
      "INSERT INTO sync_changes (user_id, entity_type, entity_id, revision, reset_epoch, operation_id, operation, occurred_at) VALUES ('migration-legacy-user', 'learning_attempt', 'invalid-epoch', 1, ?, ?, 'upsert', 1)",
    ).run(resetEpoch, operationId), "sync_changes_reset_epoch_check");
  }
  source.prepare(
    "INSERT INTO sync_changes (user_id, entity_type, entity_id, revision, reset_epoch, operation_id, operation, occurred_at) VALUES ('migration-legacy-user', 'learning_attempt', 'max-epoch', 1, 2147483647, 'migration-max-epoch-change', 'upsert', 1)",
  ).run();

  const now = Date.now();
  const documentJson = JSON.stringify({
    schemaVersion: 1,
    reset: { epoch: 0 },
    rehearsal: true,
    createdAt: new Date(now).toISOString(),
  });
  const lessonFormJson = JSON.stringify({
    schemaVersion: 1,
    script: "simplified",
    activities: [{
      position: 0,
      activityId: "restore-lesson:restore-activity",
      activityVersion: "restore-content-v1:restore-lesson:1",
      method: "meaning-selection",
      skill: "vocabulary",
      requiredForPass: false,
    }],
  });
  const lessonFormHash = `sha256:${digest(lessonFormJson)}`;
  const assessmentFormJson = JSON.stringify({
    schemaVersion: 1,
    blueprintId: "restore-assessment-blueprint",
    formVersion: "restore-assessment-form-v1",
    scoringPolicyVersion: "restore-assessment-scoring-v1",
    items: [{
      position: 0,
      itemId: "restore-assessment-item",
      itemVersion: "restore-assessment-item-v1",
      skill: "vocabulary",
      construct: "restore-assessment-construct",
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "Restore assessment prompt",
      meta: "Restore assessment fixture",
      options: ["restore-response", "alternative"],
    }],
  });
  const assessmentFormHash = `sha256:${digest(assessmentFormJson)}`;
  const assessmentResponseJson = JSON.stringify({
    kind: "selection",
    answer: "restore-response",
  });
  const readerFormJson = JSON.stringify({
    formSchemaVersion: 1,
    storyId: "restore-reader-story",
    storyVersion: "restore-reader-story-v1",
    formVersion: "restore-reader-form-v1",
    script: "simplified",
    supportMode: "unassisted",
    supportPolicyVersion: "restore-reader-support-v1",
    items: [{
      position: 0,
      itemId: "restore-reader-item",
      itemVersion: "restore-reader-item-v1",
      method: "reading-comprehension",
      skill: "reading",
      chineseStimulus: "你好。",
      prompt: "Restore reader prompt",
      options: ["restore-reader-response", "alternative"],
      answerExposure: "server-confidential",
      priorExposure: false,
      masteryEligible: true,
    }],
  });
  const readerFormHash = `sha256:${digest(readerFormJson)}`;
  const readerResponseJson = JSON.stringify({
    kind: "selection",
    answer: "restore-reader-response",
  });
  const editorialManifestHash = `sha256:${digest("restore-package-manifest")}`;
  const editorialCatalogHash = `sha256:${digest("restore-item-catalog")}`;
  const editorialStream = {
    contentVersion: "restore-content-v1",
    packageManifestSha256: editorialManifestHash,
    itemCatalogSha256: editorialCatalogHash,
  };
  const editorialStreamId = canonicalDigest(editorialStream);
  const editorialActor = {
    operatorId: "restore-editorial-operator",
    credentialId: "restore-editorial-credential",
  };
  const editorialAssignedAt = new Date(now).toISOString();
  const editorialReassignedAt = new Date(now + 1).toISOString();
  const editorialEnvelopeOneValue = {
    schemaVersion: 1,
    assignmentId: "restore-editorial-assignment-1",
    ...editorialStream,
    role: "native-linguistic",
    assignedByOperatorId: "restore-editorial-operator",
    assigneeOperatorId: "restore-editorial-reviewer-1",
    assignedAt: editorialAssignedAt,
    scope: {
      itemKeys: ["character:你"],
      audioAssetIds: [],
    },
  };
  const editorialEnvelopeTwoValue = {
    schemaVersion: 1,
    assignmentId: "restore-editorial-assignment-2",
    ...editorialStream,
    role: "native-linguistic",
    assignedByOperatorId: "restore-editorial-operator",
    assigneeOperatorId: "restore-editorial-reviewer-2",
    assignedAt: editorialReassignedAt,
    scope: {
      itemKeys: ["character:你"],
      audioAssetIds: [],
    },
  };
  const editorialEnvelopeOne = canonicalStringify(
    editorialEnvelopeOneValue,
  );
  const editorialEnvelopeTwo = canonicalStringify(
    editorialEnvelopeTwoValue,
  );
  const editorialAssignmentOneHash = canonicalDigest(
    editorialEnvelopeOneValue,
  );
  const editorialAssignmentTwoHash = canonicalDigest(
    editorialEnvelopeTwoValue,
  );
  const editorialAssignmentIntent = (envelope) => envelope === null
    ? null
    : {
        assignmentId: envelope.assignmentId,
        role: envelope.role,
        assigneeOperatorId: envelope.assigneeOperatorId,
        scope: envelope.scope,
      };
  const makeEditorialEvent = ({
    eventId,
    sequence,
    eventType,
    assignment,
    assignmentSha256,
    previousAssignment,
    previousEvent,
    idempotencyKey,
    occurredAt,
  }) => {
    const requestSha256 = canonicalDigest({
      schemaVersion: 1,
      eventType,
      actorOperatorId: editorialActor.operatorId,
      idempotencyKey,
      expectedHead: previousEvent,
      stream: editorialStream,
      previousAssignment,
      assignment: editorialAssignmentIntent(assignment),
    });
    const eventValue = {
      schemaVersion: 1,
      eventId,
      streamId: editorialStreamId,
      sequence,
      eventType,
      stream: editorialStream,
      assignment,
      assignmentSha256,
      previousAssignment,
      actor: editorialActor,
      idempotencyKey,
      requestSha256,
      previousEvent,
      targetCount: assignment === null
        ? 0
        : assignment.scope.itemKeys.length
          + assignment.scope.audioAssetIds.length,
      occurredAt: new Date(occurredAt).toISOString(),
    };
    const eventJson = canonicalStringify(eventValue);
    return {
      ...eventValue,
      eventJson,
      eventSha256: `sha256:${digest(eventJson)}`,
      occurredAtEpoch: occurredAt,
    };
  };
  const editorialEventOne = makeEditorialEvent({
    eventId: "restore-editorial-event-1",
    sequence: 1,
    eventType: "assigned",
    assignment: editorialEnvelopeOneValue,
    assignmentSha256: editorialAssignmentOneHash,
    previousAssignment: null,
    previousEvent: null,
    idempotencyKey: "restore-editorial-idempotency-1",
    occurredAt: now,
  });
  const editorialEventTwo = makeEditorialEvent({
    eventId: "restore-editorial-event-2",
    sequence: 2,
    eventType: "reassigned",
    assignment: editorialEnvelopeTwoValue,
    assignmentSha256: editorialAssignmentTwoHash,
    previousAssignment: {
      assignmentId: editorialEnvelopeOneValue.assignmentId,
      assignmentSha256: editorialAssignmentOneHash,
    },
    previousEvent: {
      eventId: editorialEventOne.eventId,
      eventSha256: editorialEventOne.eventSha256,
      sequence: editorialEventOne.sequence,
    },
    idempotencyKey: "restore-editorial-idempotency-2",
    occurredAt: now + 1,
  });
  const editorialEventThree = makeEditorialEvent({
    eventId: "restore-editorial-event-3",
    sequence: 3,
    eventType: "cancelled",
    assignment: null,
    assignmentSha256: null,
    previousAssignment: {
      assignmentId: editorialEnvelopeTwoValue.assignmentId,
      assignmentSha256: editorialAssignmentTwoHash,
    },
    previousEvent: {
      eventId: editorialEventTwo.eventId,
      eventSha256: editorialEventTwo.eventSha256,
      sequence: editorialEventTwo.sequence,
    },
    idempotencyKey: "restore-editorial-idempotency-3",
    occurredAt: now + 2,
  });
  const editorialEventOneHash = editorialEventOne.eventSha256;
  const editorialEventTwoHash = editorialEventTwo.eventSha256;
  const editorialEventThreeHash = editorialEventThree.eventSha256;
  const expectedEditorialCanonicalRows = [
    {
      eventId: editorialEventOne.eventId,
      envelopeJson: editorialEnvelopeOne,
      assignmentSha256: editorialAssignmentOneHash,
      requestSha256: editorialEventOne.requestSha256,
      eventJson: editorialEventOne.eventJson,
      eventSha256: editorialEventOne.eventSha256,
    },
    {
      eventId: editorialEventTwo.eventId,
      envelopeJson: editorialEnvelopeTwo,
      assignmentSha256: editorialAssignmentTwoHash,
      requestSha256: editorialEventTwo.requestSha256,
      eventJson: editorialEventTwo.eventJson,
      eventSha256: editorialEventTwo.eventSha256,
    },
    {
      eventId: editorialEventThree.eventId,
      envelopeJson: null,
      assignmentSha256: null,
      requestSha256: editorialEventThree.requestSha256,
      eventJson: editorialEventThree.eventJson,
      eventSha256: editorialEventThree.eventSha256,
    },
  ];
  const expectedEditorialAssignmentChain = [
    {
      eventId: "restore-editorial-event-1",
      sequence: 1,
      eventType: "assigned",
      assignmentId: "restore-editorial-assignment-1",
      previousAssignmentId: null,
      previousEventId: null,
      eventSha256: editorialEventOneHash,
    },
    {
      eventId: "restore-editorial-event-2",
      sequence: 2,
      eventType: "reassigned",
      assignmentId: "restore-editorial-assignment-2",
      previousAssignmentId: "restore-editorial-assignment-1",
      previousEventId: "restore-editorial-event-1",
      eventSha256: editorialEventTwoHash,
    },
    {
      eventId: "restore-editorial-event-3",
      sequence: 3,
      eventType: "cancelled",
      assignmentId: null,
      previousAssignmentId: "restore-editorial-assignment-2",
      previousEventId: "restore-editorial-event-2",
      eventSha256: editorialEventThreeHash,
    },
  ];
  const editorialAssignmentInsertSql =
    `INSERT INTO editorial_assignment_events (
      event_id, stream_id, sequence, schema_version, event_type,
      content_version, package_manifest_sha256, item_catalog_sha256,
      assignment_id, assignment_sha256, previous_assignment_id,
      previous_assignment_sha256, role, assignee_operator_id, envelope_json,
      target_count, actor_operator_id, actor_credential_id, idempotency_key,
      request_sha256, previous_event_id, previous_event_sha256, event_json,
      event_sha256, occurred_at
    ) VALUES (
      ?, ?, ?, 1, ?, 'restore-content-v1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      'restore-editorial-operator', 'restore-editorial-credential', ?, ?, ?,
      ?, ?, ?, ?
    )`;
  const insertEditorialAssignmentEvent = source.prepare(
    editorialAssignmentInsertSql,
  );
  source.exec("BEGIN IMMEDIATE");
  try {
    source.prepare(
      "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
    ).run("restore-user", now, now);
    source.prepare(
      "INSERT INTO auth_identities (id, user_id, provider, provider_subject, normalized_email, email_verified, created_at, updated_at) VALUES (?, ?, 'rehearsal', ?, ?, 1, ?, ?)",
    ).run("restore-identity", "restore-user", "restore@example.invalid", "restore@example.invalid", now, now);
    source.prepare(
      "INSERT INTO user_roles (user_id, role, granted_by_user_id, granted_at, updated_at) VALUES (?, 'learner', ?, ?, ?), (?, 'admin', ?, ?, ?)",
    ).run("restore-user", "restore-user", now, now, "restore-user", "restore-user", now, now);
    source.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'restore-course', 1, 'restore-hash', 'beta', 'pending', ?)",
    ).run("restore-content-v1", now);
    source.prepare(
      "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES (?, 'Restore learner', 'conversation', 20, 'simplified', 'zero', 1, 1, ?, ?)",
    ).run("restore-user", now, now);
    source.prepare(
      "INSERT INTO devices (id, user_id, installation_id, label, last_acked_cursor, created_at, last_seen_at) VALUES ('restore-device', ?, 'restore-installation', 'restore-device', 0, ?, ?)",
    ).run("restore-user", now, now);
    source.prepare(
      "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES ('restore-enrollment', ?, 'restore-content-v1', 'conversation', 'active', 1, ?, ?)",
    ).run("restore-user", now, now);
    source.prepare(
      "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('restore-session-idempotency', ?, 0, 'lesson-session-v1', 'restore-session-open', 'restore-request-hash', 'completed', 201, '{}', ?, ?, ?)",
    ).run("restore-user", now, now, now);
    source.prepare(
      "INSERT INTO lesson_sessions (id, user_id, enrollment_id, idempotency_record_id, schema_version, content_version, lesson_id, lesson_version, expected_evidence_count, form_schema_version, form_script, form_manifest_json, form_manifest_hash, status, started_at, created_at) VALUES ('restore-session', ?, 'restore-enrollment', 'restore-session-idempotency', 1, 'restore-content-v1', 'restore-lesson', 'restore-content-v1:restore-lesson:1', 1, 1, 'simplified', ?, ?, 'started', ?, ?)",
    ).run("restore-user", lessonFormJson, lessonFormHash, now, now);
    source.prepare(
      "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('restore-assessment-session-idempotency', ?, 'restore-device', 1, 0, 'assessment-session-open-v1', 'restore-assessment-open', 'restore-assessment-open-hash', 'completed', ?, ?)",
    ).run("restore-user", now, now);
    source.prepare(
      "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('restore-assessment-attempt-idempotency', ?, 'restore-device', 2, 0, 'assessment-attempt-v1', 'restore-assessment-attempt', 'restore-assessment-attempt-hash', 'completed', ?, ?)",
    ).run("restore-user", now, now);
    source.prepare(
      `INSERT INTO assessment_sessions (
        id, user_id, enrollment_id, device_id, idempotency_record_id,
        schema_version, reset_epoch, content_version, blueprint_id, form_version,
        scoring_policy_version, expected_item_count, form_schema_version,
        form_manifest_json, form_manifest_hash, status,
        measurement_evidence_count, measurement_correct_count, observed_accuracy,
        confidence_lower, confidence_upper, started_at, terminal_at, created_at
      ) VALUES (
        'restore-assessment-session', ?, 'restore-enrollment', 'restore-device',
        'restore-assessment-session-idempotency', 1, 0, 'restore-content-v1',
        'restore-assessment-blueprint', 'restore-assessment-form-v1',
        'restore-assessment-scoring-v1', 1, 1, ?, ?, 'submitted',
        1, 1, 100, 21, 100, ?, ?, ?
      )`,
    ).run(
      "restore-user",
      assessmentFormJson,
      assessmentFormHash,
      now,
      now,
      now,
    );
    source.prepare(
      `INSERT INTO assessment_item_exposures (
        id, user_id, session_id, reset_epoch, content_version, item_id,
        item_version, exposure_group_id, equivalent_group_id, form_family_id,
        exposed_at
      ) VALUES (
        'restore-assessment-exposure', ?, 'restore-assessment-session', 0,
        'restore-content-v1', 'restore-assessment-item',
        'restore-assessment-item-v1', 'restore-assessment-exposure-group',
        'restore-assessment-equivalent-group', 'restore-assessment-family', ?
      )`,
    ).run("restore-user", now);
    source.prepare(
      `INSERT INTO assessment_attempts (
        id, user_id, session_id, device_id, device_sequence,
        idempotency_record_id, schema_version, reset_epoch, content_version,
        position, item_id, item_version, skill, construct, modality,
        measurement_eligible, response_json, outcome, score, occurred_at,
        received_at
      ) VALUES (
        'restore-assessment-attempt', ?, 'restore-assessment-session',
        'restore-device', 2, 'restore-assessment-attempt-idempotency', 1, 0,
        'restore-content-v1', 0, 'restore-assessment-item',
        'restore-assessment-item-v1', 'vocabulary',
        'restore-assessment-construct', 'visual-selection', 1, ?,
        'correct', 100, ?, ?
      )`,
    ).run("restore-user", assessmentResponseJson, now, now);
    source.prepare(
      `INSERT INTO assessment_skill_results (
        id, user_id, session_id, reset_epoch, content_version, skill, status,
        correct_count, evidence_count, observed_accuracy, confidence_lower,
        confidence_upper, mastery_eligible, scoring_policy_version, created_at
      ) VALUES (
        'restore-assessment-result', ?, 'restore-assessment-session', 0,
        'restore-content-v1', 'vocabulary', 'observed', 1, 1, 100, 21, 100,
        0, 'restore-assessment-scoring-v1', ?
      )`,
    ).run("restore-user", now);
    source.prepare(
      "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('restore-reader-session-idempotency', ?, 'restore-device', 3, 0, 'reader-session-open-v1', 'restore-reader-open', 'restore-reader-open-hash', 'completed', 201, '{}', ?, ?, ?)",
    ).run("restore-user", now, now, now);
    source.prepare(
      "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('restore-reader-attempt-idempotency', ?, 'restore-device', 4, 0, 'reader-attempt-v1', 'restore-reader-attempt', 'restore-reader-attempt-hash', 'completed', 201, '{}', ?, ?, ?)",
    ).run("restore-user", now, now, now);
    source.prepare(
      `INSERT INTO reader_sessions (
        id, user_id, enrollment_id, device_id, idempotency_record_id,
        schema_version, reset_epoch, content_version, story_id, story_version,
        form_version, form_schema_version, form_manifest_json,
        form_manifest_hash, script, support_mode, support_policy_version,
        expected_item_count, status, correct_count, started_at, terminal_at,
        terminal_reason, created_at
      ) VALUES (
        'restore-reader-session', ?, 'restore-enrollment', 'restore-device',
        'restore-reader-session-idempotency', 1, 0, 'restore-content-v1',
        'restore-reader-story', 'restore-reader-story-v1',
        'restore-reader-form-v1', 1, ?, ?, 'simplified', 'unassisted',
        'restore-reader-support-v1', 1, 'submitted', 1, ?, ?, 'completed', ?
      )`,
    ).run(
      "restore-user",
      readerFormJson,
      readerFormHash,
      now,
      now,
      now,
    );
    source.prepare(
      `INSERT INTO reader_item_exposures (
        id, user_id, session_id, reset_epoch, content_version, story_id,
        item_id, item_version, exposure_group_id, equivalent_group_id,
        exposed_at
      ) VALUES (
        'restore-reader-exposure', ?, 'restore-reader-session', 0,
        'restore-content-v1', 'restore-reader-story', 'restore-reader-item',
        'restore-reader-item-v1', 'restore-reader-exposure-group',
        'restore-reader-equivalent-group', ?
      )`,
    ).run("restore-user", now);
    source.prepare(
      `INSERT INTO learning_attempts (
        id, user_id, enrollment_id, session_id, device_id, device_sequence,
        idempotency_record_id, schema_version, reset_epoch, content_version,
        activity_id, activity_version, source, method, skill, response_json,
        outcome, score, used_hint, prior_exposure, required_for_pass,
        scoring_version, occurred_at, received_at
      ) VALUES (
        'restore-reader-attempt', ?, 'restore-enrollment', NULL,
        'restore-device', 4, 'restore-reader-attempt-idempotency', 1, 0,
        'restore-content-v1', 'restore-reader-story:restore-reader-item',
        'restore-reader-item-v1', 'reader', 'reading-comprehension', 'reading',
        ?, 'correct', 100, 0, 0, 0, 'restore-reader-scoring-v1', ?, ?
      )`,
    ).run("restore-user", readerResponseJson, now, now);
    source.prepare(
      `INSERT INTO learning_evidence (
        id, user_id, enrollment_id, attempt_id, session_id, schema_version,
        reset_epoch, policy_version, content_version, activity_id,
        activity_version, source, method, skill, outcome, score, verified,
        mastery_eligible, metadata_json, occurred_at, recorded_at
      ) VALUES (
        'restore-reader-evidence', ?, 'restore-enrollment',
        'restore-reader-attempt', NULL, 1, 0, 'restore-reader-scoring-v1',
        'restore-content-v1', 'restore-reader-story:restore-reader-item',
        'restore-reader-item-v1', 'reader', 'reading-comprehension', 'reading',
        'correct', 100, 1, 1, '{}', ?, ?
      )`,
    ).run("restore-user", now, now);
    source.prepare(
      `INSERT INTO reader_session_attempts (
        user_id, session_id, attempt_id, reset_epoch, position, item_id,
        item_version, form_manifest_hash, created_at
      ) VALUES (
        ?, 'restore-reader-session', 'restore-reader-attempt', 0, 0,
        'restore-reader-item', 'restore-reader-item-v1', ?, ?
      )`,
    ).run("restore-user", readerFormHash, now);
    source.prepare(
      `INSERT INTO outbox_events (
        id, user_id, aggregate_type, aggregate_id, event_type, schema_version,
        reset_epoch, payload_json, status, attempts, available_at, created_at
      ) VALUES (
        'restore-reader-outbox-event', ?, 'reader_session',
        'restore-reader-session', 'reader.submitted', 1, 0, '{}', 'pending',
        0, ?, ?
      )`,
    ).run("restore-user", now, now);
    source.prepare(
      `INSERT INTO outbox_events (
        id, user_id, aggregate_type, aggregate_id, event_type, schema_version,
        reset_epoch, payload_json, status, attempts, available_at, created_at,
        lease_token, lease_expires_at
      ) VALUES (
        'restore-outbox-event', ?, 'assessment_session',
        'restore-assessment-session', 'assessment.submitted', 1, 0, '{}',
        'processing', 2, ?, ?, 'restore-lease-token', ?
      )`,
    ).run("restore-user", now, now, now + 30_000);
    source.prepare(
      "INSERT INTO learning_documents (user_id, revision, document_json, schema_version, content_version, updated_at) VALUES (?, 7, ?, 1, ?, ?)",
    ).run("restore-user", documentJson, "restore-content-v1", now);
    insertEditorialAssignmentEvent.run(
      "restore-editorial-event-1",
      editorialStreamId,
      1,
      "assigned",
      editorialManifestHash,
      editorialCatalogHash,
      "restore-editorial-assignment-1",
      editorialAssignmentOneHash,
      null,
      null,
      "native-linguistic",
      "restore-editorial-reviewer-1",
      editorialEnvelopeOne,
      1,
      "restore-editorial-idempotency-1",
      editorialEventOne.requestSha256,
      null,
      null,
      editorialEventOne.eventJson,
      editorialEventOneHash,
      now,
    );
    insertEditorialAssignmentEvent.run(
      "restore-editorial-event-2",
      editorialStreamId,
      2,
      "reassigned",
      editorialManifestHash,
      editorialCatalogHash,
      "restore-editorial-assignment-2",
      editorialAssignmentTwoHash,
      "restore-editorial-assignment-1",
      editorialAssignmentOneHash,
      "native-linguistic",
      "restore-editorial-reviewer-2",
      editorialEnvelopeTwo,
      1,
      "restore-editorial-idempotency-2",
      editorialEventTwo.requestSha256,
      "restore-editorial-event-1",
      editorialEventOneHash,
      editorialEventTwo.eventJson,
      editorialEventTwoHash,
      now + 1,
    );
    insertEditorialAssignmentEvent.run(
      "restore-editorial-event-3",
      editorialStreamId,
      3,
      "cancelled",
      editorialManifestHash,
      editorialCatalogHash,
      null,
      null,
      "restore-editorial-assignment-2",
      editorialAssignmentTwoHash,
      null,
      null,
      null,
      0,
      "restore-editorial-idempotency-3",
      editorialEventThree.requestSha256,
      "restore-editorial-event-2",
      editorialEventTwoHash,
      editorialEventThree.eventJson,
      editorialEventThreeHash,
      now + 2,
    );
    source.exec("COMMIT");
  } catch (error) {
    source.exec("ROLLBACK");
    throw error;
  }
  const sourceReaderFixture = readReaderFixture(source);
  assertReaderFixture(sourceReaderFixture, {
    stage: "Source",
    formJson: readerFormJson,
    formHash: readerFormHash,
    responseJson: readerResponseJson,
  });
  const sourceReaderTriggers = readReaderTriggers(source);
  if (
    JSON.stringify(sourceReaderTriggers)
      !== JSON.stringify(expectedReaderTriggers)
  ) {
    throw new Error(
      "Source Reader outbox, transition, or reset trigger is missing",
    );
  }
  const sourceEditorialAssignmentChain = readEditorialAssignmentChain(
    source,
    editorialStreamId,
  );
  const sourceEditorialAssignmentTriggers =
    readEditorialAssignmentTriggers(source);
  const sourceEditorialCanonicalRows =
    readEditorialAssignmentCanonicalRows(source, editorialStreamId);
  if (
    JSON.stringify(sourceEditorialAssignmentChain)
      !== JSON.stringify(expectedEditorialAssignmentChain)
    || JSON.stringify(sourceEditorialCanonicalRows)
      !== JSON.stringify(expectedEditorialCanonicalRows)
    || JSON.stringify(sourceEditorialAssignmentTriggers)
      !== JSON.stringify(expectedEditorialAssignmentTriggers)
  ) {
    throw new Error(
      "Source editorial assignment chain or authority triggers do not match",
    );
  }
  source.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  source.exec(`VACUUM INTO ${sqlString(backupPath)}`);
  source.close();
  source = null;

  restored = new DatabaseSync(backupPath);
  restored.exec("PRAGMA foreign_keys = ON");
  const integrity = restored.prepare("PRAGMA integrity_check").get();
  if (integrity?.integrity_check !== "ok") {
    throw new Error(`Restore integrity check failed: ${JSON.stringify(integrity)}`);
  }
  const foreignKeyFailures = restored.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyFailures.length) {
    throw new Error(`Restore foreign-key check failed: ${JSON.stringify(foreignKeyFailures)}`);
  }
  const tables = restored.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).all();
  const tableNames = new Set(tables.map((table) => table.name));
  const requiredIdentityTables = [
    "audit_events",
    "auth_challenges",
    "auth_sessions",
    "passkey_credentials",
    "system_settings",
  ];
  if (
    tables.length !== 35
    || requiredIdentityTables.some((table) => !tableNames.has(table))
  ) {
    throw new Error(
      `Restore rehearsal requires 35 application tables including identity, audited controls, and governed content revisions; found ${
        tables.length
      }`,
    );
  }
  const controlTriggers = new Set(restored.prepare(
    `SELECT name FROM sqlite_master
      WHERE type = 'trigger'
        AND name IN (
          'audit_events_no_update',
          'audit_events_no_delete',
          'user_roles_protect_last_admin_delete',
          'users_protect_last_admin_status',
          'users_protect_last_admin_delete'
        )`,
  ).all().map((trigger) => trigger.name));
  if (controlTriggers.size !== 5) {
    throw new Error("Restore rehearsal is missing append-only audit or last-admin triggers");
  }
  const restoredDocument = restored.prepare(
    "SELECT revision, document_json AS documentJson FROM learning_documents WHERE user_id = ?",
  ).get("restore-user");
  const restoredRoles = restored.prepare(
    "SELECT role, granted_by_user_id AS grantedByUserId FROM user_roles WHERE user_id = ? ORDER BY role",
  ).all("restore-user");
  const restoredSession = restored.prepare(
    "SELECT form_manifest_json AS formManifestJson, form_manifest_hash AS formManifestHash FROM lesson_sessions WHERE user_id = ? AND id = 'restore-session'",
  ).get("restore-user");
  const restoredAssessmentSession = restored.prepare(
    "SELECT form_manifest_json AS formManifestJson, form_manifest_hash AS formManifestHash, measurement_evidence_count AS evidenceCount, measurement_correct_count AS correctCount FROM assessment_sessions WHERE user_id = ? AND id = 'restore-assessment-session'",
  ).get("restore-user");
  const restoredAssessmentAttempt = restored.prepare(
    "SELECT response_json AS responseJson FROM assessment_attempts WHERE user_id = ? AND id = 'restore-assessment-attempt'",
  ).get("restore-user");
  const restoredAssessmentGraph = restored.prepare(
    `SELECT
      (SELECT COUNT(*) FROM assessment_sessions WHERE user_id = ?) AS sessions,
      (SELECT COUNT(*) FROM assessment_item_exposures WHERE user_id = ?) AS exposures,
      (SELECT COUNT(*) FROM assessment_attempts WHERE user_id = ?) AS attempts,
      (SELECT COUNT(*) FROM assessment_skill_results WHERE user_id = ?) AS results,
      COUNT(*) AS joined
    FROM assessment_sessions session
    INNER JOIN assessment_item_exposures exposure
      ON exposure.user_id = session.user_id
      AND exposure.session_id = session.id
      AND exposure.reset_epoch = session.reset_epoch
    INNER JOIN assessment_attempts attempt
      ON attempt.user_id = session.user_id
      AND attempt.session_id = session.id
      AND attempt.reset_epoch = session.reset_epoch
    INNER JOIN assessment_skill_results result
      ON result.user_id = session.user_id
      AND result.session_id = session.id
      AND result.reset_epoch = session.reset_epoch
    WHERE session.user_id = ? AND session.id = 'restore-assessment-session'`,
  ).get(
    "restore-user",
    "restore-user",
    "restore-user",
    "restore-user",
    "restore-user",
  );
  const restoredReaderFixture = readReaderFixture(restored);
  const restoredSyncChanges = restored.prepare(
    "SELECT operation_id AS operationId, reset_epoch AS resetEpoch FROM sync_changes WHERE operation_id IN ('migration-legacy-change', 'migration-max-epoch-change') ORDER BY operation_id",
  ).all();
  const restoredOutboxLease = restored.prepare(
    "SELECT status, attempts, lease_token AS leaseToken, lease_expires_at AS leaseExpiresAt FROM outbox_events WHERE id = 'restore-outbox-event'",
  ).get();
  const restoredOutboxLeaseColumns = restored.prepare(
    "PRAGMA table_info('outbox_events')",
  ).all().map((column) => column.name);
  const restoredOutboxLeaseIndex = restored.prepare(
    "PRAGMA index_info('outbox_events_status_lease_expiry_idx')",
  ).all().map((column) => column.name);
  const restoredOutboxEpochTriggers = restored.prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'trigger'
       AND name IN (
         'outbox_events_learning_epoch_insert',
         'outbox_events_learning_epoch_update',
         'outbox_events_assessment_epoch_insert',
         'outbox_events_assessment_epoch_update'
       )
     ORDER BY name`,
  ).all().map((row) => row.name);
  const restoredOutboxLeaseTriggers = restored.prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'trigger'
       AND name IN (
         'outbox_events_lease_state_insert',
         'outbox_events_lease_state_update'
       )
     ORDER BY name`,
  ).all().map((row) => row.name);
  const restoredAssessmentTerminalTriggers = restored.prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'trigger'
       AND name IN (
         'assessment_sessions_terminal_reason_insert',
         'assessment_sessions_terminal_reason_update'
       )
     ORDER BY name`,
  ).all().map((row) => row.name);
  const restoredReviewOutboxEpochTriggers = restored.prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'trigger'
       AND name IN (
         'outbox_events_review_epoch_insert',
         'outbox_events_review_epoch_update'
       )
     ORDER BY name`,
  ).all().map((row) => row.name);
  const restoredReaderTriggers = readReaderTriggers(restored);
  const restoredEditorialAssignmentChain = readEditorialAssignmentChain(
    restored,
    editorialStreamId,
  );
  const restoredEditorialAssignmentTriggers =
    readEditorialAssignmentTriggers(restored);
  const restoredEditorialCanonicalRows =
    readEditorialAssignmentCanonicalRows(restored, editorialStreamId);
  if (
    restoredDocument?.revision !== 7
    || digest(restoredDocument.documentJson) !== digest(documentJson)
  ) {
    throw new Error("Restored learning document does not match its source checksum");
  }
  if (JSON.stringify(restoredRoles) !== JSON.stringify([
    { role: "admin", grantedByUserId: "restore-user" },
    { role: "learner", grantedByUserId: "restore-user" },
  ])) {
    throw new Error("Restored account roles do not match their source graph");
  }
  if (
    restoredSession?.formManifestHash !== lessonFormHash
    || digest(restoredSession.formManifestJson) !== digest(lessonFormJson)
  ) {
    throw new Error("Restored lesson form manifest does not match its source checksum");
  }
  if (
    restoredAssessmentSession?.formManifestHash !== assessmentFormHash
    || digest(restoredAssessmentSession.formManifestJson)
      !== digest(assessmentFormJson)
    || restoredAssessmentSession?.evidenceCount !== 1
    || restoredAssessmentSession?.correctCount !== 1
  ) {
    throw new Error(
      "Restored assessment form or aggregate does not match its source checksum",
    );
  }
  if (
    digest(restoredAssessmentAttempt?.responseJson ?? "")
      !== digest(assessmentResponseJson)
  ) {
    throw new Error(
      "Restored assessment response does not match its source checksum",
    );
  }
  if (JSON.stringify(restoredAssessmentGraph) !== JSON.stringify({
    sessions: 1,
    exposures: 1,
    attempts: 1,
    results: 1,
    joined: 1,
  })) {
    throw new Error(
      "Restored assessment graph does not preserve every tenant-owned relation",
    );
  }
  assertReaderFixture(restoredReaderFixture, {
    stage: "Restored",
    formJson: readerFormJson,
    formHash: readerFormHash,
    responseJson: readerResponseJson,
  });
  if (JSON.stringify(restoredSyncChanges) !== JSON.stringify([
    { operationId: "migration-legacy-change", resetEpoch: null },
    { operationId: "migration-max-epoch-change", resetEpoch: 2_147_483_647 },
  ])) {
    throw new Error("Restored reset-aware change-feed rows do not match the source");
  }
  if (
    restoredOutboxLease?.status !== "processing"
    || restoredOutboxLease?.attempts !== 2
    || restoredOutboxLease?.leaseToken !== "restore-lease-token"
    || restoredOutboxLease?.leaseExpiresAt !== now + 30_000
    || !restoredOutboxLeaseColumns.includes("lease_token")
    || !restoredOutboxLeaseColumns.includes("lease_expires_at")
    || JSON.stringify(restoredOutboxLeaseIndex)
      !== JSON.stringify(["status", "lease_expires_at"])
    || restoredOutboxEpochTriggers.length !== 4
    || restoredOutboxLeaseTriggers.length !== 2
    || restoredAssessmentTerminalTriggers.length !== 2
    || restoredReviewOutboxEpochTriggers.length !== 2
    || JSON.stringify(restoredReaderTriggers)
      !== JSON.stringify(expectedReaderTriggers)
    || JSON.stringify(restoredEditorialAssignmentChain)
      !== JSON.stringify(expectedEditorialAssignmentChain)
    || JSON.stringify(restoredEditorialCanonicalRows)
      !== JSON.stringify(expectedEditorialCanonicalRows)
    || JSON.stringify(restoredEditorialAssignmentTriggers)
      !== JSON.stringify(expectedEditorialAssignmentTriggers)
  ) {
    throw new Error(
      "Restored state, event chains, indexes, or authority triggers do not match the source",
    );
  }
  const insertRestoredEditorialAssignmentEvent = restored.prepare(
    editorialAssignmentInsertSql,
  );
  const makeEditorialEnvelope = ({
    assignmentId,
    assigneeOperatorId,
    role = "native-linguistic",
  }) => JSON.stringify({
    schemaVersion: 1,
    assignmentId,
    contentVersion: "restore-content-v1",
    packageManifestSha256: editorialManifestHash,
    itemCatalogSha256: editorialCatalogHash,
    role,
    assignedByOperatorId: "restore-editorial-operator",
    assigneeOperatorId,
    assignedAt: editorialAssignedAt,
    scope: {
      itemKeys: ["character:你"],
      audioAssetIds: [],
    },
  });
  expectCheckConstraint(() => insertRestoredEditorialAssignmentEvent.run(
    "restore-editorial-stale-fork",
    editorialStreamId,
    4,
    "assigned",
    editorialManifestHash,
    editorialCatalogHash,
    "restore-editorial-assignment-stale",
    `sha256:${digest("restore-editorial-assignment-stale")}`,
    null,
    null,
    "native-linguistic",
    "restore-editorial-reviewer-stale",
    makeEditorialEnvelope({
      assignmentId: "restore-editorial-assignment-stale",
      assigneeOperatorId: "restore-editorial-reviewer-stale",
    }),
    1,
    "restore-editorial-idempotency-stale",
    `sha256:${digest("restore-editorial-request-stale")}`,
    "restore-editorial-event-1",
    editorialEventOneHash,
    JSON.stringify({ schemaVersion: 1, eventType: "assigned" }),
    `sha256:${digest("restore-editorial-event-stale")}`,
    now + 3,
  ), "editorial assignment predecessor is not the exact head");
  expectCheckConstraint(() => restored.prepare(
    "UPDATE editorial_assignment_events SET occurred_at = occurred_at + 1 WHERE event_id = 'restore-editorial-event-1'",
  ).run(), "editorial assignment events are immutable");
  expectCheckConstraint(() => restored.prepare(
    "DELETE FROM editorial_assignment_events WHERE event_id = 'restore-editorial-event-3'",
  ).run(), "editorial assignment events are append-only");
  expectCheckConstraint(() => insertRestoredEditorialAssignmentEvent.run(
    "restore-editorial-inactive-transition",
    editorialStreamId,
    4,
    "reassigned",
    editorialManifestHash,
    editorialCatalogHash,
    "restore-editorial-assignment-inactive",
    `sha256:${digest("restore-editorial-assignment-inactive")}`,
    "restore-editorial-assignment-2",
    editorialAssignmentTwoHash,
    "native-linguistic",
    "restore-editorial-reviewer-inactive",
    makeEditorialEnvelope({
      assignmentId: "restore-editorial-assignment-inactive",
      assigneeOperatorId: "restore-editorial-reviewer-inactive",
    }),
    1,
    "restore-editorial-idempotency-inactive",
    `sha256:${digest("restore-editorial-request-inactive")}`,
    "restore-editorial-event-3",
    editorialEventThreeHash,
    JSON.stringify({ schemaVersion: 1, eventType: "reassigned" }),
    `sha256:${digest("restore-editorial-event-inactive")}`,
    now + 4,
  ), "editorial assignment transition is not active");
  expectCheckConstraint(() => insertRestoredEditorialAssignmentEvent.run(
    "restore-editorial-envelope-tamper",
    editorialStreamId,
    4,
    "assigned",
    editorialManifestHash,
    editorialCatalogHash,
    "restore-editorial-assignment-tamper",
    `sha256:${digest("restore-editorial-assignment-tamper")}`,
    null,
    null,
    "source-license",
    "restore-editorial-reviewer-tamper",
    makeEditorialEnvelope({
      assignmentId: "restore-editorial-assignment-tamper",
      assigneeOperatorId: "restore-editorial-reviewer-tamper",
    }),
    1,
    "restore-editorial-idempotency-tamper",
    `sha256:${digest("restore-editorial-request-tamper")}`,
    "restore-editorial-event-3",
    editorialEventThreeHash,
    JSON.stringify({ schemaVersion: 1, eventType: "assigned" }),
    `sha256:${digest("restore-editorial-event-tamper")}`,
    now + 5,
  ), "editorial assignment envelope columns do not match");
  if (
    JSON.stringify(readEditorialAssignmentChain(restored, editorialStreamId))
      !== JSON.stringify(expectedEditorialAssignmentChain)
  ) {
    throw new Error(
      "Rejected editorial assignment mutations changed the restored stream",
    );
  }
  const postRestoreEnvelopeValue = {
    ...editorialEnvelopeOneValue,
    assignmentId: "restore-editorial-assignment-4",
    assigneeOperatorId: "restore-editorial-reviewer-4",
    assignedAt: new Date(now + 6).toISOString(),
  };
  const postRestoreEnvelopeJson = canonicalStringify(
    postRestoreEnvelopeValue,
  );
  const postRestoreAssignmentHash = canonicalDigest(
    postRestoreEnvelopeValue,
  );
  const postRestoreEditorialEvent = makeEditorialEvent({
    eventId: "restore-editorial-event-4",
    sequence: 4,
    eventType: "assigned",
    assignment: postRestoreEnvelopeValue,
    assignmentSha256: postRestoreAssignmentHash,
    previousAssignment: null,
    previousEvent: {
      eventId: editorialEventThree.eventId,
      eventSha256: editorialEventThree.eventSha256,
      sequence: editorialEventThree.sequence,
    },
    idempotencyKey: "restore-editorial-idempotency-4",
    occurredAt: now + 6,
  });
  insertRestoredEditorialAssignmentEvent.run(
    postRestoreEditorialEvent.eventId,
    editorialStreamId,
    postRestoreEditorialEvent.sequence,
    postRestoreEditorialEvent.eventType,
    editorialManifestHash,
    editorialCatalogHash,
    postRestoreEnvelopeValue.assignmentId,
    postRestoreAssignmentHash,
    null,
    null,
    postRestoreEnvelopeValue.role,
    postRestoreEnvelopeValue.assigneeOperatorId,
    postRestoreEnvelopeJson,
    postRestoreEditorialEvent.targetCount,
    postRestoreEditorialEvent.idempotencyKey,
    postRestoreEditorialEvent.requestSha256,
    editorialEventThree.eventId,
    editorialEventThree.eventSha256,
    postRestoreEditorialEvent.eventJson,
    postRestoreEditorialEvent.eventSha256,
    postRestoreEditorialEvent.occurredAtEpoch,
  );
  const postRestoreEditorialAssignmentChain = readEditorialAssignmentChain(
    restored,
    editorialStreamId,
  );
  if (
    postRestoreEditorialAssignmentChain.length !== 4
    || postRestoreEditorialAssignmentChain[3]?.eventId
      !== postRestoreEditorialEvent.eventId
    || postRestoreEditorialAssignmentChain[3]?.eventSha256
      !== postRestoreEditorialEvent.eventSha256
  ) {
    throw new Error(
      "Restored editorial assignment stream rejected a canonical append",
    );
  }
  expectCheckConstraint(() => restored.prepare(
    "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at) VALUES ('restore-wrong-lesson-epoch', 'restore-user', 'lesson_session', 'restore-session', 'lesson.started', 1, 1, '{}', 'pending', 0, 1, 1)",
  ).run(), "outbox event reset epoch does not match its aggregate");
  expectCheckConstraint(() => restored.prepare(
    "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at) VALUES ('restore-wrong-assessment-epoch', 'restore-user', 'assessment_session', 'restore-assessment-session', 'assessment.started', 1, 1, '{}', 'pending', 0, 1, 1)",
  ).run(), "assessment outbox event reset epoch does not match its aggregate");
  expectCheckConstraint(() => restored.prepare(
    "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at) VALUES ('restore-wrong-review-epoch', 'migration-legacy-user', 'review_log', 'migration-review-log', 'review.graded', 1, 1, '{}', 'pending', 0, 1, 1)",
  ).run(), "review outbox event reset epoch does not match its aggregate");
  expectCheckConstraint(() => restored.prepare(
    "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at) VALUES ('restore-wrong-reader-epoch', 'restore-user', 'reader_session', 'restore-reader-session', 'reader.submitted', 1, 1, '{}', 'pending', 0, 1, 1)",
  ).run(), "reader outbox event reset epoch does not match its aggregate");
  expectCheckConstraint(() => restored.prepare(
    "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at) VALUES ('restore-invalid-processing-lease', 'restore-user', 'learning_document', 'restore-user', 'unsupported.fixture', 1, 0, '{}', 'processing', 1, 1, 1)",
  ).run(), "outbox event lease state is invalid");
  expectCheckConstraint(() => restored.prepare(
    "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at, lease_token, lease_expires_at) VALUES ('restore-invalid-pending-lease', 'restore-user', 'learning_document', 'restore-user', 'unsupported.fixture', 1, 0, '{}', 'pending', 1, 1, 1, 'unexpected-lease', 10)",
  ).run(), "outbox event lease state is invalid");
  expectCheckConstraint(() => restored.prepare(
    "UPDATE assessment_sessions SET terminal_reason = NULL WHERE id = 'migration-user-abandoned-assessment'",
  ).run(), "assessment session terminal reason is invalid");
  expectCheckConstraint(() => restored.prepare(
    "UPDATE reader_sessions SET status = 'started' WHERE id = 'restore-reader-session'",
  ).run(), "reader session status transition is invalid");
  restored.prepare(
    "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('restore-invalid-terminal-idempotency', 'restore-user', 'restore-device', 90, 0, 'assessment-session-open-v1', 'restore-invalid-terminal', 'restore-invalid-terminal-hash', 'completed', 201, '{}', ?, ?, ?)",
  ).run(now, now, now);
  expectCheckConstraint(() => restored.prepare(
    `INSERT INTO assessment_sessions (
      id, user_id, enrollment_id, device_id, idempotency_record_id,
      schema_version, reset_epoch, content_version, blueprint_id, form_version,
      scoring_policy_version, expected_item_count, form_schema_version,
      form_manifest_json, form_manifest_hash, status, started_at, terminal_at,
      created_at
    ) VALUES (
      'restore-invalid-terminal-session', 'restore-user',
      'restore-enrollment', 'restore-device',
      'restore-invalid-terminal-idempotency', 1, 0, 'restore-content-v1',
      'restore-blueprint', 'restore-form-v1', 'restore-scoring-v1', 1, 1,
      '{}',
      'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'abandoned', ?, ?, ?
    )`,
  ).run(now, now, now), "assessment session terminal reason is invalid");
  const postRestoreChange = restored.prepare(
    "INSERT INTO sync_changes (user_id, entity_type, entity_id, revision, operation_id, operation, occurred_at) VALUES (?, 'learning_document', ?, 7, 'restore-rehearsal', 'upsert', ?) RETURNING reset_epoch AS resetEpoch",
  ).get("restore-user", "restore-user", Date.now());
  if (postRestoreChange?.resetEpoch !== null) {
    throw new Error("Legacy change-feed writes must retain a null reset epoch");
  }
  const readerResetAt = now + 60_000;
  restored.prepare(
    "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('restore-reader-reset-idempotency', 'restore-user', 'restore-device', 91, 0, 'reader-session-open-v1', 'restore-reader-reset-open', 'restore-reader-reset-open-hash', 'completed', 201, '{}', ?, ?, ?)",
  ).run(readerResetAt, readerResetAt, readerResetAt);
  restored.prepare(
    `INSERT INTO reader_sessions (
      id, user_id, enrollment_id, device_id, idempotency_record_id,
      schema_version, reset_epoch, content_version, story_id, story_version,
      form_version, form_schema_version, form_manifest_json,
      form_manifest_hash, script, support_mode, support_policy_version,
      expected_item_count, status, started_at, created_at
    ) VALUES (
      'restore-reader-reset-session', 'restore-user', 'restore-enrollment',
      'restore-device', 'restore-reader-reset-idempotency', 1, 0,
      'restore-content-v1', 'restore-reader-story',
      'restore-reader-story-v1', 'restore-reader-form-v1', 1, ?, ?,
      'simplified', 'unassisted', 'restore-reader-support-v1', 1, 'started',
      ?, ?
    )`,
  ).run(
    readerFormJson,
    readerFormHash,
    readerResetAt,
    readerResetAt,
  );
  const resetDocumentJson = JSON.stringify({
    schemaVersion: 1,
    reset: { epoch: 1 },
    rehearsal: true,
    resetAt: new Date(readerResetAt).toISOString(),
  });
  restored.prepare(
    "UPDATE learning_documents SET revision = 8, document_json = ?, updated_at = ? WHERE user_id = 'restore-user'",
  ).run(resetDocumentJson, readerResetAt);
  const postRestoreReaderReset = restored.prepare(
    `SELECT
      status,
      terminal_at AS terminalAt,
      terminal_reason AS terminalReason,
      form_manifest_hash AS formManifestHash
    FROM reader_sessions
    WHERE user_id = 'restore-user'
      AND id = 'restore-reader-reset-session'`,
  ).get();
  if (JSON.stringify(postRestoreReaderReset) !== JSON.stringify({
    status: "abandoned",
    terminalAt: readerResetAt,
    terminalReason: "reset-invalidated",
    formManifestHash: readerFormHash,
  })) {
    throw new Error(
      "Restored started Reader session was not reset-invalidated atomically",
    );
  }
  const postRestoreForeignKeyFailures = restored.prepare(
    "PRAGMA foreign_key_check",
  ).all();
  if (postRestoreForeignKeyFailures.length) {
    throw new Error(
      `Post-restore Reader reset failed foreign-key validation: ${
        JSON.stringify(postRestoreForeignKeyFailures)
      }`,
    );
  }
  restored.close();
  restored = null;

  console.log(JSON.stringify({
    migrations: migrations.length,
    restoredTables: tables.length,
    restoredRoles: restoredRoles.map((row) => row.role),
    revision: restoredDocument.revision,
    documentSha256: digest(documentJson),
    lessonFormSha256: digest(lessonFormJson),
    assessmentFormSha256: digest(assessmentFormJson),
    assessmentResponseSha256: digest(assessmentResponseJson),
    assessmentGraph: restoredAssessmentGraph,
    readerFormSha256: digest(readerFormJson),
    readerResponseSha256: digest(readerResponseJson),
    readerGraph: restoredReaderFixture.graph,
    outboxLeaseMigration: "ok",
    outboxEpochTriggers: restoredOutboxEpochTriggers.length,
    outboxLeaseTriggers: restoredOutboxLeaseTriggers.length,
    assessmentTerminalTriggers: restoredAssessmentTerminalTriggers.length,
    reviewOutboxEpochTriggers: restoredReviewOutboxEpochTriggers.length,
    readerOutboxEpochTriggers: restoredReaderTriggers.filter((trigger) =>
      trigger.startsWith("outbox_events_reader_epoch_")
    ).length,
    readerStatusTransitionTriggers: restoredReaderTriggers.filter((trigger) =>
      trigger === "reader_sessions_status_transition_update"
    ).length,
    readerResetInvalidationTriggers: restoredReaderTriggers.filter((trigger) =>
      trigger === "reader_sessions_reset_invalidation"
    ).length,
    editorialAssignmentEvents: postRestoreEditorialAssignmentChain.length,
    editorialAssignmentTriggers:
      restoredEditorialAssignmentTriggers.length,
    editorialAssignmentMutationGuards: "ok",
    startingLevelMigration: "hsk2-preserved-hsk4-accepted-hsk5-rejected",
    postRestoreReaderReset,
    integrity: "ok",
    foreignKeys: "ok",
    postRestoreWrite: "ok",
  }));
} finally {
  try {
    source?.close();
  } catch {
    // Preserve the primary rehearsal failure while still attempting cleanup.
  }
  try {
    restored?.close();
  } catch {
    // Preserve the primary rehearsal failure while still attempting cleanup.
  }
  await rm(temporaryDirectory, { recursive: true, force: true });
}
