import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import { buildExercises, type Exercise } from "../lib/exerciseGeneration";
import {
  canonicalLessonSessionForm,
  type LessonSessionFormV1,
} from "../learning/lessonSessionProtocol";
import type { SubmitLessonSessionCommandV1 } from "../learning/lessonSessionSubmissionProtocol";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import {
  LESSON_COMPLETION_POLICY_VERSION,
  LessonSessionSubmissionDeviceSequenceConflictError,
  LessonSessionSubmissionEvidenceConflictError,
  LessonSessionSubmissionIdempotencyConflictError,
  LessonSessionSubmissionIncompleteError,
  LessonSessionSubmissionRepository,
  LessonSessionSubmissionUnavailableError,
} from "./lessonSessionSubmissionRepository";
import type { LessonSessionPublicationPolicy } from "./lessonSessionRepository";
import {
  REVIEW_MODALITY,
  REVIEW_SCHEDULER_VERSION,
  reviewWordVersion,
} from "../learning/reviewProtocol";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migration = readdirSync(migrationDirectory)
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n");

class SQLiteStatement implements D1PreparedStatement {
  private parameters: unknown[] = [];

  constructor(
    private readonly statement: StatementSync,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]) {
    this.parameters = values;
    return this;
  }

  private sqliteParameters() {
    return this.parameters as Array<
      string | number | bigint | Uint8Array | null
    >;
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const row = this.statement.get(...this.sqliteParameters()) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    return {
      success: true,
      results: this.statement.all(...this.sqliteParameters()) as T[],
    };
  }

  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    if (/^\s*SELECT\b/iu.test(this.query)) {
      return {
        success: true,
        results: this.statement.all(...this.sqliteParameters()) as T[],
      };
    }
    const result = this.statement.run(...this.sqliteParameters());
    return {
      success: true,
      meta: {
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }
}

class SQLiteD1 implements D1Database {
  readonly database = new DatabaseSync(":memory:");
  beforeNextBatch: (() => void) | null = null;

  constructor() {
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec(migration);
  }

  prepare(query: string) {
    return new SQLiteStatement(this.database.prepare(query), query);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
    const beforeBatch = this.beforeNextBatch;
    this.beforeNextBatch = null;
    beforeBatch?.();
    this.database.exec("BEGIN");
    try {
      const results: Array<D1RunResult<T>> = [];
      for (const statement of statements) results.push(await statement.run<T>());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const lesson = RELEASED_LESSONS[0];
const sessionId = "user-a-session";
const promotedPolicy: LessonSessionPublicationPolicy = {
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: "closed-alpha",
  lifecycle: "published",
  closedAlphaEligible: true,
  productionEligible: false,
  promotionChannel: "closed-alpha",
  promotionManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
};

const methodFor = (exercise: Exercise) => {
  switch (exercise.kind) {
    case "meaning": return "meaning-selection";
    case "pinyin":
    case "tone":
    case "tone-pair": return "phonology-recognition";
    case "listening": return "listening-selection";
    case "recall": return "typed-character-recall";
    case "sentence": return "reading-comprehension";
  }
};

const issuedExercises = buildExercises(lesson, "simplified", () => 0.5);
const issuedForm: LessonSessionFormV1 = {
  schemaVersion: 1,
  script: "simplified",
  activities: issuedExercises.map((exercise, position) => ({
    position,
    activityId: `${lesson.id}:${exercise.id}`,
    activityVersion: exercise.activityVersion,
    method: methodFor(exercise),
    skill: exercise.skill,
    requiredForPass: exercise.requiredForPass === true,
  })),
};
const issuedFormJson = canonicalLessonSessionForm(issuedForm);
const digestForm = (form: LessonSessionFormV1) =>
  `sha256:${createHash("sha256")
    .update(canonicalLessonSessionForm(form))
    .digest("hex")}` as const;
const issuedFormHash = digestForm(issuedForm);

const command = (
  overrides: Partial<SubmitLessonSessionCommandV1> = {},
): SubmitLessonSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "lesson-session-submit:repository:1",
  installationId: "user-a-installation",
  deviceId: "user-a-device",
  deviceSequence: 20,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  sessionId,
  formHash: issuedFormHash,
  ...overrides,
});

const seedUserSession = (
  database: SQLiteD1,
  userId = "user-a",
  state: "review" | "beta" | "published" = "beta",
) => {
  const timestamp = Date.parse("2026-07-22T05:00:00.000Z");
  database.database.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
  ).run(userId, timestamp, timestamp);
  database.database.prepare(
    "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES (?, 'Learner', 'conversation', 20, 'simplified', 'zero', 1, 1, ?, ?)",
  ).run(userId, timestamp, timestamp);
  database.database.prepare(
    "INSERT OR IGNORE INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, ?, 'approved', ?)",
  ).run(CONTENT_VERSION, CURRENT_CONTENT_MANIFEST_SHA256, state, timestamp);
  const enrollmentId = `${userId}-enrollment`;
  database.database.prepare(
    "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES (?, ?, ?, 'conversation', 'active', 1, ?, ?)",
  ).run(enrollmentId, userId, CONTENT_VERSION, timestamp, timestamp);
  const openIdempotencyId = `${userId}-open-idempotency`;
  database.database.prepare(
    "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES (?, ?, 0, 'lesson-session-v1', ?, 'fixture', 'completed', 201, '{}', ?, ?, ?)",
  ).run(
    openIdempotencyId,
    userId,
    `${userId}-open-key`,
    timestamp,
    timestamp,
    timestamp,
  );
  database.database.prepare(
    "INSERT INTO lesson_sessions (id, user_id, enrollment_id, device_id, idempotency_record_id, schema_version, content_version, lesson_id, lesson_version, expected_evidence_count, form_schema_version, form_script, form_manifest_json, form_manifest_hash, status, started_at, created_at) VALUES (?, ?, ?, NULL, ?, 1, ?, ?, ?, 10, 1, 'simplified', ?, ?, 'started', ?, ?)",
  ).run(
    `${userId}-session`,
    userId,
    enrollmentId,
    openIdempotencyId,
    CONTENT_VERSION,
    lesson.id,
    `${CONTENT_VERSION}:${lesson.id}:1`,
    issuedFormJson,
    issuedFormHash,
    timestamp,
    timestamp,
  );
};

const seedPassedActivationSession = (
  database: SQLiteD1,
  activationSessionId = "user-a-prior-passed-session",
  contentVersion = CONTENT_VERSION as string,
) => {
  const timestamp = Date.parse("2026-07-22T04:00:00.000Z");
  const idempotencyId = `${activationSessionId}:idempotency`;
  database.database.prepare(
    "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES (?, 'user-a', 0, 'lesson-session-v1', ?, 'fixture', 'completed', 201, '{}', ?, ?, ?)",
  ).run(
    idempotencyId,
    `${activationSessionId}:open`,
    timestamp,
    timestamp,
    timestamp,
  );
  const requiredCount = issuedForm.activities.filter(
    (activity) => activity.requiredForPass,
  ).length;
  database.database.prepare(
    `INSERT INTO lesson_sessions (
       id, user_id, enrollment_id, device_id, idempotency_record_id,
       schema_version, reset_epoch, content_version, lesson_id,
       lesson_version, expected_evidence_count, form_schema_version,
       form_script, form_manifest_json, form_manifest_hash, status, raw_score,
       gate_score, required_evidence_count, required_correct_count, passed,
       started_at, submitted_at, created_at
     ) VALUES (
       ?, 'user-a', 'user-a-enrollment', NULL, ?, 1, 0, ?, ?, ?, ?, 1,
       'simplified', ?, ?, 'submitted', 100, 100, ?, ?, 1, ?, ?, ?
     )`,
  ).run(
    activationSessionId,
    idempotencyId,
    contentVersion,
    lesson.id,
    `${contentVersion}:${lesson.id}:1`,
    issuedForm.activities.length,
    issuedFormJson,
    issuedFormHash,
    requiredCount,
    requiredCount,
    timestamp,
    timestamp + 1,
    timestamp,
  );
  return activationSessionId;
};

const seedReviewCard = (
  database: SQLiteD1,
  {
    id = "seeded-review-card",
    wordId = lesson.wordIds[0]!,
    activationSessionId = null,
    contentVersion = CONTENT_VERSION as string,
    schedulerVersion = REVIEW_SCHEDULER_VERSION as string,
    dueAt = Date.parse("2026-08-01T00:00:00.000Z"),
    reps = 5,
    revision = 7,
  }: {
    id?: string;
    wordId?: string;
    activationSessionId?: string | null;
    contentVersion?: string;
    schedulerVersion?: string;
    dueAt?: number;
    reps?: number;
    revision?: number;
  } = {},
) => {
  const timestamp = Date.parse("2026-07-22T04:30:00.000Z");
  database.database.prepare(
    `INSERT INTO fsrs_cards (
       id, user_id, enrollment_id, activation_session_id, reset_epoch,
       content_version, knowledge_item_type, knowledge_item_id,
       knowledge_item_version, modality, scheduler_version, due_at, stability,
       difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses,
       state, last_review_at, revision, created_at, updated_at
     ) VALUES (
       ?, 'user-a', 'user-a-enrollment', ?, 0, ?, 'vocabulary', ?, ?, ?, ?,
       ?, 2.5, 4.5, 2, 3, 0, ?, 1, 2, ?, ?, ?, ?
     )`,
  ).run(
    id,
    activationSessionId,
    contentVersion,
    wordId,
    reviewWordVersion(wordId),
    REVIEW_MODALITY,
    schedulerVersion,
    dueAt,
    reps,
    timestamp,
    revision,
    timestamp,
    timestamp,
  );
  return { id, wordId, dueAt, reps, revision };
};

type AttemptSeedOptions = {
  exercises?: Exercise[];
  lessonFixture?: (typeof RELEASED_LESSONS)[number];
  incorrectIndexes?: Set<number>;
  hintIndexes?: Set<number>;
  priorIndexes?: Set<number>;
};

const seedAttempts = (
  database: SQLiteD1,
  options: AttemptSeedOptions = {},
) => {
  const exercises = options.exercises ?? issuedExercises;
  const activeLesson = options.lessonFixture ?? lesson;
  const timestamp = Date.parse("2026-07-22T05:10:00.000Z");
  exercises.forEach((exercise, index) => {
    const attemptId = `attempt-${index}`;
    const idempotencyId = `attempt-idempotency-${index}`;
    const outcome = options.incorrectIndexes?.has(index) ? "incorrect" : "correct";
    const score = outcome === "correct" ? 100 : 0;
    const method = methodFor(exercise);
    database.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES (?, 'user-a', 0, 'learning-attempt-v1', ?, 'fixture', 'completed', 201, '{}', ?, ?, ?)",
    ).run(
      idempotencyId,
      `attempt-key-${index}`,
      timestamp,
      timestamp,
      timestamp,
    );
    database.database.prepare(
      "INSERT INTO learning_attempts (id, user_id, enrollment_id, session_id, device_id, device_sequence, idempotency_record_id, schema_version, content_version, activity_id, activity_version, source, method, skill, response_json, outcome, score, used_hint, prior_exposure, required_for_pass, scoring_version, occurred_at, received_at) VALUES (?, 'user-a', 'user-a-enrollment', ?, NULL, NULL, ?, 1, ?, ?, ?, 'lesson', ?, ?, '{}', ?, ?, ?, ?, ?, 'objective-policy-v1', ?, ?)",
    ).run(
      attemptId,
      sessionId,
      idempotencyId,
      CONTENT_VERSION,
      `${activeLesson.id}:${exercise.id}`,
      exercise.activityVersion,
      method,
      exercise.skill,
      outcome,
      score,
      options.hintIndexes?.has(index) ? 1 : 0,
      options.priorIndexes?.has(index) ? 1 : 0,
      exercise.requiredForPass ? 1 : 0,
      timestamp + index,
      timestamp + index,
    );
    database.database.prepare(
      "INSERT INTO learning_evidence (id, user_id, enrollment_id, attempt_id, session_id, schema_version, policy_version, content_version, activity_id, activity_version, source, method, skill, outcome, score, verified, mastery_eligible, metadata_json, occurred_at, recorded_at) VALUES (?, 'user-a', 'user-a-enrollment', ?, NULL, 1, 'objective-policy-v1', ?, ?, ?, 'lesson', ?, ?, ?, ?, 1, 0, '{}', ?, ?)",
    ).run(
      `evidence-${index}`,
      attemptId,
      CONTENT_VERSION,
      `${activeLesson.id}:${exercise.id}`,
      exercise.activityVersion,
      method,
      exercise.skill,
      outcome,
      score,
      timestamp + index,
      timestamp + index,
    );
  });
};

const repository = (database: SQLiteD1) =>
  new LessonSessionSubmissionRepository(database, promotedPolicy);

describe("server-owned lesson-session submission repository", () => {
  it("derives scores, finalizes atomically, and emits non-mastery completion evidence", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    seedAttempts(database);

    const receipt = await repository(database).submit("user-a", command());

    expect(receipt).toMatchObject({
      duplicate: false,
      sessionId,
      formHash: issuedFormHash,
      status: "submitted",
      evidenceCount: 10,
      rawScore: 100,
      gateScore: 100,
      requiredCorrectCount: receipt.requiredEvidenceCount,
      passed: true,
    });
    expect(database.database.prepare(
      "SELECT status, raw_score AS rawScore, gate_score AS gateScore, passed FROM lesson_sessions WHERE id = ?",
    ).get(sessionId)).toEqual({
      status: "submitted",
      rawScore: 100,
      gateScore: 100,
      passed: 1,
    });
    expect(database.database.prepare(
      "SELECT policy_version AS policyVersion, method, outcome, verified, mastery_eligible AS masteryEligible FROM learning_evidence WHERE id = ?",
    ).get(receipt.completionEvidenceId)).toEqual({
      policyVersion: LESSON_COMPLETION_POLICY_VERSION,
      method: "lesson-completion",
      outcome: "completed",
      verified: 1,
      masteryEligible: 0,
    });
    expect(database.database.prepare(
      "SELECT event_type AS eventType FROM outbox_events",
    ).get()).toEqual({ eventType: "lesson.completed" });
    expect(database.database.prepare(
      "SELECT reset_epoch AS resetEpoch, entity_type AS entityType, entity_id AS entityId, revision, operation_id AS operationId, payload_json AS payloadJson FROM sync_changes",
    ).get()).toEqual({
      resetEpoch: 0,
      entityType: "lesson_session",
      entityId: sessionId,
      revision: 2,
      operationId:
        `normalized:lesson-session-submit:${command().idempotencyKey}`,
      payloadJson: null,
    });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM xp_ledger",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      `SELECT knowledge_item_id AS wordId,
              knowledge_item_version AS wordVersion,
              activation_session_id AS activationSessionId,
              reset_epoch AS resetEpoch, modality, scheduler_version AS schedulerVersion,
              revision, reps, due_at AS dueAt
       FROM fsrs_cards
       ORDER BY knowledge_item_id`,
    ).all()).toEqual(
      [...lesson.wordIds].sort().map((wordId) => ({
        wordId,
        wordVersion: reviewWordVersion(wordId),
        activationSessionId: sessionId,
        resetEpoch: 0,
        modality: REVIEW_MODALITY,
        schedulerVersion: REVIEW_SCHEDULER_VERSION,
        revision: 1,
        reps: 0,
        dueAt: Date.parse(receipt.submittedAt),
      })),
    );
  });

  it("submits a frozen lesson form with no required gate activities", async () => {
    const database = new SQLiteD1();
    const zeroGateLesson = RELEASED_LESSONS.find(
      (candidate) => candidate.id === "boot-2",
    );
    expect(zeroGateLesson).toBeDefined();
    const zeroGateExercises = buildExercises(
      zeroGateLesson!,
      "simplified",
      () => 0.5,
    );
    expect(zeroGateExercises).toHaveLength(10);
    expect(zeroGateExercises.every(
      (exercise) => exercise.requiredForPass !== true,
    )).toBe(true);
    const zeroGateForm: LessonSessionFormV1 = {
      schemaVersion: 1,
      script: "simplified",
      activities: zeroGateExercises.map((exercise, position) => ({
        position,
        activityId: `${zeroGateLesson!.id}:${exercise.id}`,
        activityVersion: exercise.activityVersion,
        method: methodFor(exercise),
        skill: exercise.skill,
        requiredForPass: false,
      })),
    };
    const zeroGateFormJson = canonicalLessonSessionForm(zeroGateForm);
    const zeroGateFormHash = digestForm(zeroGateForm);

    seedUserSession(database);
    database.database.prepare(
      `UPDATE lesson_sessions
       SET lesson_id = ?, lesson_version = ?, expected_evidence_count = ?,
           form_manifest_json = ?, form_manifest_hash = ?
       WHERE id = ?`,
    ).run(
      zeroGateLesson!.id,
      `${CONTENT_VERSION}:${zeroGateLesson!.id}:1`,
      zeroGateExercises.length,
      zeroGateFormJson,
      zeroGateFormHash,
      sessionId,
    );
    seedAttempts(database, {
      exercises: zeroGateExercises,
      lessonFixture: zeroGateLesson!,
    });

    const receipt = await repository(database).submit("user-a", command({
      formHash: zeroGateFormHash,
    }));

    expect(receipt).toMatchObject({
      status: "submitted",
      evidenceCount: 10,
      requiredEvidenceCount: 0,
      requiredCorrectCount: 0,
      passed: true,
    });
    expect(database.database.prepare(
      `SELECT status, required_evidence_count AS requiredEvidenceCount,
              required_correct_count AS requiredCorrectCount, passed
       FROM lesson_sessions WHERE id = ?`,
    ).get(sessionId)).toEqual({
      status: "submitted",
      requiredEvidenceCount: 0,
      requiredCorrectCount: 0,
      passed: 1,
    });
    const storedEvent = database.database.prepare(
      "SELECT payload_json AS payloadJson FROM outbox_events WHERE event_type = 'lesson.completed'",
    ).get() as { payloadJson: string };
    expect(JSON.parse(storedEvent.payloadJson)).toMatchObject({
      requiredEvidenceCount: 0,
      requiredCorrectCount: 0,
      passed: true,
    });
  });

  it("returns the canonical receipt on an exact retry", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    seedAttempts(database);
    const submissions = repository(database);
    const first = await submissions.submit("user-a", command());
    const retry = await submissions.submit("user-a", command());
    expect(retry).toEqual({ ...first, duplicate: true });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_evidence WHERE method = 'lesson-completion'",
    ).get()).toEqual({ count: 1 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM sync_changes",
    ).get()).toEqual({ count: 1 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM fsrs_cards",
    ).get()).toEqual({ count: lesson.wordIds.length });
  });

  it("preserves legacy cards without letting them block an authoritative activation", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    seedAttempts(database);
    const legacy = seedReviewCard(database, {
      id: "legacy-null-activation",
      activationSessionId: null,
    });

    await expect(repository(database).submit("user-a", command()))
      .resolves.toMatchObject({ passed: true });

    expect(database.database.prepare(
      `SELECT id, activation_session_id AS activationSessionId
       FROM fsrs_cards
       WHERE user_id = 'user-a' AND knowledge_item_id = ?
       ORDER BY activation_session_id IS NOT NULL`,
    ).all(legacy.wordId)).toEqual([
      { id: "legacy-null-activation", activationSessionId: null },
      expect.objectContaining({ activationSessionId: sessionId }),
    ]);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM fsrs_cards",
    ).get()).toEqual({ count: lesson.wordIds.length + 1 });
  });

  it("keeps an older scheduler card while activating the current scheduler", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    seedAttempts(database);
    const activationSessionId = seedPassedActivationSession(database);
    const legacy = seedReviewCard(database, {
      id: "legacy-scheduler-card",
      activationSessionId,
      schedulerVersion: "legacy-fsrs:no-fuzz:v0",
    });

    await expect(repository(database).submit("user-a", command()))
      .resolves.toMatchObject({ passed: true });

    expect(database.database.prepare(
      `SELECT id, activation_session_id AS activationSessionId,
              scheduler_version AS schedulerVersion
       FROM fsrs_cards
       WHERE user_id = 'user-a' AND knowledge_item_id = ?
       ORDER BY scheduler_version`,
    ).all(legacy.wordId)).toEqual([
      {
        id: "legacy-scheduler-card",
        activationSessionId,
        schedulerVersion: "legacy-fsrs:no-fuzz:v0",
      },
      expect.objectContaining({
        activationSessionId: sessionId,
        schedulerVersion: REVIEW_SCHEDULER_VERSION,
      }),
    ]);
  });

  it("retains the exact schedule of an existing valid authoritative card", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    seedAttempts(database);
    const activationSessionId = seedPassedActivationSession(database);
    const existing = seedReviewCard(database, { activationSessionId });

    await expect(repository(database).submit("user-a", command()))
      .resolves.toMatchObject({ passed: true });

    expect(database.database.prepare(
      `SELECT id, activation_session_id AS activationSessionId,
              due_at AS dueAt, reps, revision
       FROM fsrs_cards WHERE id = ?`,
    ).get(existing.id)).toEqual({
      id: existing.id,
      activationSessionId,
      dueAt: existing.dueAt,
      reps: existing.reps,
      revision: existing.revision,
    });
    expect(database.database.prepare(
      `SELECT COUNT(*) AS count
       FROM fsrs_cards
       WHERE user_id = 'user-a' AND knowledge_item_id = ?`,
    ).get(existing.wordId)).toEqual({ count: 1 });
  });

  it("rejects a conflicting authoritative card with an invalid activation before commit", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    seedAttempts(database);
    const corrupt = seedReviewCard(database, {
      activationSessionId: sessionId,
    });

    await expect(repository(database).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionUnavailableError);

    expect(database.database.prepare(
      "SELECT status, submitted_at AS submittedAt FROM lesson_sessions WHERE id = ?",
    ).get(sessionId)).toEqual({ status: "started", submittedAt: null });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_evidence WHERE method = 'lesson-completion'",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM idempotency_records WHERE scope = 'lesson-session-submission-v1'",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM outbox_events",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT id FROM fsrs_cards WHERE id = ?",
    ).get(corrupt.id)).toEqual({ id: corrupt.id });
  });

  it("fails closed when an authoritative card conflict key belongs to another content version", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    seedAttempts(database);
    const historicalContentVersion = "foundation-historical-card";
    database.database.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, 'historical-card-manifest', 'retired', 'approved', 1)",
    ).run(historicalContentVersion);
    const activationSessionId = seedPassedActivationSession(
      database,
      "user-a-historical-passed-session",
      historicalContentVersion,
    );
    const conflict = seedReviewCard(database, {
      id: "historical-content-authoritative-card",
      activationSessionId,
      contentVersion: historicalContentVersion,
    });

    await expect(repository(database).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionUnavailableError);

    expect(database.database.prepare(
      "SELECT status, submitted_at AS submittedAt FROM lesson_sessions WHERE id = ?",
    ).get(sessionId)).toEqual({ status: "started", submittedAt: null });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_evidence WHERE method = 'lesson-completion'",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM idempotency_records WHERE scope = 'lesson-session-submission-v1'",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM outbox_events",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM sync_changes",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      `SELECT id, activation_session_id AS activationSessionId,
              content_version AS contentVersion
       FROM fsrs_cards`,
    ).all()).toEqual([{
      id: conflict.id,
      activationSessionId,
      contentVersion: historicalContentVersion,
    }]);
  });

  it("rejects reused idempotency keys and device sequences", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    seedAttempts(database);
    const submissions = repository(database);
    await submissions.submit("user-a", command());
    await expect(submissions.submit("user-a", command({
      sessionId: "another-session",
    }))).rejects.toBeInstanceOf(
      LessonSessionSubmissionIdempotencyConflictError,
    );

    const secondDatabase = new SQLiteD1();
    seedUserSession(secondDatabase);
    seedAttempts(secondDatabase);
    secondDatabase.database.prepare(
      "INSERT INTO devices (id, user_id, installation_id, label, last_acked_cursor, created_at, last_seen_at) VALUES ('existing-device', 'user-a', 'user-a-installation', 'device', 0, 1, 1)",
    ).run();
    secondDatabase.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('sequence-owner', 'user-a', 'existing-device', 20, 'other', 'other-key', 'fixture', 'completed', 1, 1)",
    ).run();
    await expect(repository(secondDatabase).submit(
      "user-a",
      command({ idempotencyKey: "new-key" }),
    )).rejects.toBeInstanceOf(
      LessonSessionSubmissionDeviceSequenceConflictError,
    );
  });

  it("fails closed for wrong tenants, unpromoted packages, and stale course state", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    seedAttempts(database);
    await expect(repository(database).submit("foreign-user", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionUnavailableError);
    await expect(new LessonSessionSubmissionRepository(database).submit(
      "user-a",
      command(),
    )).rejects.toBeInstanceOf(LessonSessionSubmissionUnavailableError);

    const reviewDatabase = new SQLiteD1();
    seedUserSession(reviewDatabase, "user-a", "review");
    seedAttempts(reviewDatabase);
    await expect(repository(reviewDatabase).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionUnavailableError);

    const wrongVersion = new SQLiteD1();
    seedUserSession(wrongVersion);
    seedAttempts(wrongVersion);
    wrongVersion.database.prepare(
      "UPDATE lesson_sessions SET lesson_version = 'invented' WHERE id = ?",
    ).run(sessionId);
    await expect(repository(wrongVersion).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionUnavailableError);
  });

  it("rejects incomplete, duplicate, substituted, and version-mismatched evidence", async () => {
    const incomplete = new SQLiteD1();
    seedUserSession(incomplete);
    seedAttempts(incomplete, {
      exercises: issuedExercises.slice(0, 9),
    });
    await expect(repository(incomplete).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionIncompleteError);

    const duplicate = new SQLiteD1();
    seedUserSession(duplicate);
    const duplicateExercises = [...issuedExercises];
    duplicateExercises[9] = duplicateExercises[8];
    expect(() => seedAttempts(duplicate, { exercises: duplicateExercises }))
      .toThrow(/UNIQUE constraint failed: learning_attempts\.user_id/u);

    const substituted = new SQLiteD1();
    seedUserSession(substituted);
    const cherryPickedForm = [...issuedExercises];
    const missingIndex = cherryPickedForm.findIndex((exercise) => exercise.requiredForPass);
    const existingIds = new Set(cherryPickedForm.map((exercise) => exercise.id));
    const foreignLesson = RELEASED_LESSONS.find(
      (candidate) => candidate.id !== lesson.id,
    );
    expect(foreignLesson).toBeDefined();
    const replacement = buildExercises(
      foreignLesson!,
      "simplified",
      () => 0.5,
    )
      .find((exercise) =>
        !existingIds.has(exercise.id)
      );
    expect(replacement).toBeDefined();
    cherryPickedForm[missingIndex] = replacement!;
    seedAttempts(substituted, { exercises: cherryPickedForm });
    await expect(repository(substituted).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionEvidenceConflictError);

    const stale = new SQLiteD1();
    seedUserSession(stale);
    seedAttempts(stale);
    stale.database.prepare(
      "UPDATE learning_attempts SET activity_version = 'invented' WHERE id = 'attempt-0'",
    ).run();
    await expect(repository(stale).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionEvidenceConflictError);
  });

  it("does not finalize from a stale preflight when another attempt wins the race", async () => {
    const raced = new SQLiteD1();
    seedUserSession(raced);
    seedAttempts(raced);
    raced.beforeNextBatch = () => {
      const timestamp = Date.parse("2026-07-22T06:30:00.000Z");
      raced.database.prepare(
        "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('race-idempotency', 'user-a', 0, 'learning-attempt-v1', 'race-attempt-key', 'race-hash', 'completed', 201, '{}', ?, ?, ?)",
      ).run(timestamp, timestamp, timestamp);
      raced.database.prepare(
        "INSERT INTO learning_attempts (id, user_id, enrollment_id, session_id, idempotency_record_id, schema_version, content_version, activity_id, activity_version, source, method, skill, response_json, outcome, score, used_hint, prior_exposure, required_for_pass, scoring_version, occurred_at, received_at) VALUES ('race-attempt', 'user-a', 'user-a-enrollment', ?, 'race-idempotency', 1, ?, 'outside-form:activity', 'outside-form:v1', 'lesson', 'meaning-selection', 'vocabulary', '{}', 'incorrect', 0, 0, 0, 0, 'objective-policy-v1', ?, ?)",
      ).run(sessionId, CONTENT_VERSION, timestamp, timestamp);
    };

    await expect(repository(raced).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionUnavailableError);
    expect(raced.database.prepare(
      "SELECT status, submitted_at AS submittedAt FROM lesson_sessions WHERE id = ?",
    ).get(sessionId)).toEqual({ status: "started", submittedAt: null });
    expect(raced.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_evidence WHERE method = 'lesson-completion'",
    ).get()).toEqual({ count: 0 });
    expect(raced.database.prepare(
      "SELECT COUNT(*) AS count FROM idempotency_records WHERE scope = 'lesson-session-submission-v1'",
    ).get()).toEqual({ count: 0 });
  });

  it("rejects legacy, reordered, modified, and client-mismatched form manifests", async () => {
    const legacy = new SQLiteD1();
    seedUserSession(legacy);
    seedAttempts(legacy);
    legacy.database.prepare(
      "UPDATE lesson_sessions SET form_schema_version = NULL, form_script = NULL, form_manifest_json = NULL, form_manifest_hash = NULL WHERE id = ?",
    ).run(sessionId);
    await expect(repository(legacy).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionUnavailableError);

    const reordered = new SQLiteD1();
    seedUserSession(reordered);
    seedAttempts(reordered);
    const reorderedForm = {
      ...issuedForm,
      activities: [
        issuedForm.activities[1],
        issuedForm.activities[0],
        ...issuedForm.activities.slice(2),
      ],
    };
    reordered.database.prepare(
      "UPDATE lesson_sessions SET form_manifest_json = ? WHERE id = ?",
    ).run(JSON.stringify(reorderedForm), sessionId);
    await expect(repository(reordered).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionUnavailableError);

    const modified = new SQLiteD1();
    seedUserSession(modified);
    seedAttempts(modified);
    const modifiedForm = structuredClone(issuedForm);
    modifiedForm.activities[0].requiredForPass =
      !modifiedForm.activities[0].requiredForPass;
    modified.database.prepare(
      "UPDATE lesson_sessions SET form_manifest_json = ? WHERE id = ?",
    ).run(JSON.stringify(modifiedForm), sessionId);
    await expect(repository(modified).submit("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionSubmissionEvidenceConflictError);

    const rehashedModification = new SQLiteD1();
    seedUserSession(rehashedModification);
    seedAttempts(rehashedModification);
    const inventedVersionForm = structuredClone(issuedForm);
    inventedVersionForm.activities[0].activityVersion = "invented";
    const inventedHash = digestForm(inventedVersionForm);
    rehashedModification.database.prepare(
      "UPDATE lesson_sessions SET form_manifest_json = ?, form_manifest_hash = ? WHERE id = ?",
    ).run(
      canonicalLessonSessionForm(inventedVersionForm),
      inventedHash,
      sessionId,
    );
    await expect(repository(rehashedModification).submit("user-a", command({
      formHash: inventedHash,
    }))).rejects.toBeInstanceOf(LessonSessionSubmissionEvidenceConflictError);

    const wrongClientHash = new SQLiteD1();
    seedUserSession(wrongClientHash);
    seedAttempts(wrongClientHash);
    await expect(repository(wrongClientHash).submit("user-a", command({
      formHash: `sha256:${"f".repeat(64)}`,
    }))).rejects.toBeInstanceOf(LessonSessionSubmissionEvidenceConflictError);
  });

  it("rejects hinted answers but lets an unassisted retry pass without trusting client scores", async () => {
    const hinted = new SQLiteD1();
    seedUserSession(hinted);
    seedAttempts(hinted, { hintIndexes: new Set([0, 1, 2, 3]) });
    await expect(repository(hinted).submit("user-a", command())).resolves.toMatchObject({
      rawScore: 100,
      gateScore: 60,
      passed: false,
    });
    expect(hinted.database.prepare(
      "SELECT COUNT(*) AS count FROM fsrs_cards",
    ).get()).toEqual({ count: 0 });

    const repeated = new SQLiteD1();
    seedUserSession(repeated);
    seedAttempts(repeated, {
      priorIndexes: new Set(Array.from({ length: 10 }, (_, index) => index)),
    });
    await expect(repository(repeated).submit("user-a", command())).resolves.toMatchObject({
      rawScore: 100,
      gateScore: 100,
      passed: true,
    });
    expect(repeated.database.prepare(
      "SELECT COUNT(*) AS count FROM fsrs_cards",
    ).get()).toEqual({ count: 4 });
  });
});
