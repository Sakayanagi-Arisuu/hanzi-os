import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
  WORD_BY_ID,
} from "../data/curriculum";
import type { LearningAttemptCommandV1 } from "../learning/attemptProtocol";
import { canonicalLessonSessionForm } from "../learning/lessonSessionProtocol";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import {
  AttemptDeviceSequenceConflictError,
  AttemptEnrollmentUnavailableError,
  AttemptIdempotencyConflictError,
  AttemptRepository,
  AttemptSessionUnavailableError,
} from "./attemptRepository";
import { scoreObjectiveAttempt } from "./attemptScoring";
import { CourseVersionBindingError } from "./courseVersionRepository";
import type { LessonSessionPublicationPolicy } from "./lessonSessionRepository";
import { LearningResetEpochConflictError } from "./learningResetEpoch";

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
const word = WORD_BY_ID.get(lesson.wordIds[0])!;
const sessionForm = {
  schemaVersion: 1 as const,
  script: "simplified" as const,
  activities: [{
    position: 0,
    activityId: `${lesson.id}:${word.id}-meaning`,
    activityVersion: `${lesson.contentVersion}:${lesson.id}:1`,
    method: "meaning-selection" as const,
    skill: "vocabulary" as const,
    requiredForPass: false,
  }],
};
const sessionFormJson = canonicalLessonSessionForm(sessionForm);
const sessionFormHash = `sha256:${createHash("sha256")
  .update(sessionFormJson)
  .digest("hex")}`;

const promotedPolicy: LessonSessionPublicationPolicy = {
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: "closed-alpha",
  lifecycle: "published",
  closedAlphaEligible: true,
  productionEligible: false,
  promotionChannel: "closed-alpha",
  promotionManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
};

const repositoryFor = (database: SQLiteD1) =>
  new AttemptRepository(database, promotedPolicy);

const command = (
  overrides: Partial<LearningAttemptCommandV1> = {},
): LearningAttemptCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "attempt:repository:1",
  installationId: "installation-test",
  deviceId: "device-test",
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  activityId: `${lesson.id}:${word.id}-meaning`,
  activityVersion: `${lesson.contentVersion}:${lesson.id}:1`,
  source: "lesson",
  method: "meaning-selection",
  sessionId: "user-a-session",
  occurredAt: "2026-07-22T06:00:00.000Z",
  response: {
    kind: "answer",
    answer: word.meaning,
    usedHint: false,
    durationMs: 900,
  },
  ...overrides,
});

const seedUser = (database: SQLiteD1, userId: string, withProfile = true) => {
  const timestamp = Date.parse("2026-07-22T05:00:00.000Z");
  database.database.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
  ).run(userId, timestamp, timestamp);
  if (withProfile) {
    database.database.prepare(
      "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES (?, 'Learner', 'conversation', 20, 'simplified', 'zero', 1, 1, ?, ?)",
    ).run(userId, timestamp, timestamp);
    database.database.prepare(
      "INSERT OR IGNORE INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, 'review', 'pending', ?)",
    ).run(CONTENT_VERSION, CURRENT_CONTENT_MANIFEST_SHA256, timestamp);
    database.database.prepare(
      "UPDATE course_versions SET release_state = 'beta', linguistic_review_status = 'approved', published_at = ? WHERE id = ?",
    ).run(timestamp, CONTENT_VERSION);
    const enrollmentId = `${userId}-enrollment`;
    const sessionIdempotencyId = `${userId}-session-idempotency`;
    database.database.prepare(
      "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES (?, ?, ?, 'conversation', 'active', 1, ?, ?)",
    ).run(enrollmentId, userId, CONTENT_VERSION, timestamp, timestamp);
    database.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES (?, ?, 0, 'lesson-session-v1', ?, 'fixture', 'completed', 201, '{}', ?, ?, ?)",
    ).run(
      sessionIdempotencyId,
      userId,
      `${userId}-session-key`,
      timestamp,
      timestamp,
      timestamp,
    );
    database.database.prepare(
      "INSERT INTO lesson_sessions (id, user_id, enrollment_id, device_id, idempotency_record_id, schema_version, content_version, lesson_id, lesson_version, expected_evidence_count, form_schema_version, form_script, form_manifest_json, form_manifest_hash, status, started_at, created_at) VALUES (?, ?, ?, NULL, ?, 1, ?, ?, ?, 1, 1, 'simplified', ?, ?, 'started', ?, ?)",
    ).run(
      `${userId}-session`,
      userId,
      enrollmentId,
      sessionIdempotencyId,
      CONTENT_VERSION,
      lesson.id,
      `${lesson.contentVersion}:${lesson.id}:1`,
      sessionFormJson,
      sessionFormHash,
      timestamp,
      timestamp,
    );
  }
};

const seedAdditionalSession = (
  database: SQLiteD1,
  userId: string,
  sessionId: string,
) => {
  const timestamp = Date.parse("2026-07-22T05:30:00.000Z");
  const idempotencyRecordId = `${sessionId}-idempotency`;
  database.database.prepare(
    "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES (?, ?, 0, 'lesson-session-v1', ?, 'fixture', 'completed', 201, '{}', ?, ?, ?)",
  ).run(
    idempotencyRecordId,
    userId,
    `${sessionId}-key`,
    timestamp,
    timestamp,
    timestamp,
  );
  database.database.prepare(
    "INSERT INTO lesson_sessions (id, user_id, enrollment_id, device_id, idempotency_record_id, schema_version, content_version, lesson_id, lesson_version, expected_evidence_count, form_schema_version, form_script, form_manifest_json, form_manifest_hash, status, started_at, created_at) VALUES (?, ?, ?, NULL, ?, 1, ?, ?, ?, 1, 1, 'simplified', ?, ?, 'started', ?, ?)",
  ).run(
    sessionId,
    userId,
    `${userId}-enrollment`,
    idempotencyRecordId,
    CONTENT_VERSION,
    lesson.id,
    `${lesson.contentVersion}:${lesson.id}:1`,
    sessionFormJson,
    sessionFormHash,
    timestamp,
    timestamp,
  );
};

describe("normalized objective attempt repository", () => {
  it("atomically writes idempotency, attempt, evidence, and outbox rows", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const repository = repositoryFor(database);
    const input = command();
    const receipt = await repository.commitObjectiveAttempt(
      "user-a",
      input,
      scoreObjectiveAttempt(input),
    );

    expect(receipt).toMatchObject({
      duplicate: false,
      outcome: "correct",
      score: 100,
      verification: "server-objective",
    });
    const counts = database.database.prepare(
      "SELECT (SELECT COUNT(*) FROM idempotency_records) AS idempotencyCount, (SELECT COUNT(*) FROM learning_attempts) AS attemptCount, (SELECT COUNT(*) FROM learning_evidence) AS evidenceCount, (SELECT COUNT(*) FROM outbox_events) AS outboxCount, (SELECT COUNT(*) FROM sync_changes) AS changeCount",
    ).get() as Record<string, number>;
    expect(counts).toEqual({
      idempotencyCount: 2,
      attemptCount: 1,
      evidenceCount: 1,
      outboxCount: 1,
      changeCount: 1,
    });

    const attempt = database.database.prepare(
      "SELECT response_json AS responseJson, prior_exposure AS priorExposure FROM learning_attempts WHERE user_id = ?",
    ).get("user-a") as { responseJson: string; priorExposure: number };
    expect(JSON.parse(attempt.responseJson)).toEqual(input.response);
    expect(attempt.responseJson).not.toContain("correctAnswer");
    expect(attempt.priorExposure).toBe(0);

    const evidence = database.database.prepare(
      "SELECT verified, mastery_eligible AS masteryEligible, metadata_json AS metadataJson FROM learning_evidence WHERE user_id = ?",
    ).get("user-a") as {
      verified: number;
      masteryEligible: number;
      metadataJson: string;
    };
    expect(evidence).toMatchObject({ verified: 1, masteryEligible: 1 });
    expect(evidence.metadataJson).not.toContain(word.meaning);
    expect(database.database.prepare(
      "SELECT manifest_hash AS manifestHash FROM course_versions WHERE id = ?",
    ).get(CONTENT_VERSION)).toEqual({
      manifestHash: CURRENT_CONTENT_MANIFEST_SHA256,
    });
    expect(database.database.prepare(
      "SELECT reset_epoch AS resetEpoch, entity_type AS entityType, entity_id AS entityId, revision, operation_id AS operationId, payload_json AS payloadJson FROM sync_changes",
    ).get()).toEqual({
      resetEpoch: 0,
      entityType: "learning_attempt",
      entityId: receipt.attemptId,
      revision: 1,
      operationId: `normalized:learning-attempt:${input.idempotencyKey}`,
      payloadJson: null,
    });
  });

  it("records remediation as verified, non-mastery evidence only after a real mistake", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const repository = repositoryFor(database);
    const origin = command({
      response: {
        kind: "answer",
        answer: "sai",
        usedHint: false,
        durationMs: 700,
      },
    });
    await repository.commitObjectiveAttempt(
      "user-a",
      origin,
      scoreObjectiveAttempt(origin),
    );

    const remediation = command({
      idempotencyKey: "attempt:repository:remediation:1",
      deviceSequence: 2,
      source: "mistake",
      sessionId: undefined,
      occurredAt: "2026-07-22T06:05:00.000Z",
    });
    const receipt = await repository.commitObjectiveAttempt(
      "user-a",
      remediation,
      scoreObjectiveAttempt(remediation),
    );

    expect(receipt).toMatchObject({
      source: "mistake",
      method: "remediation-recall",
      outcome: "correct",
      score: 100,
    });
    expect(database.database.prepare(
      "SELECT source, method, session_id AS sessionId FROM learning_attempts WHERE id = ?",
    ).get(receipt.attemptId)).toEqual({
      source: "mistake",
      method: "remediation-recall",
      sessionId: null,
    });
    expect(database.database.prepare(
      "SELECT source, method, verified, mastery_eligible AS masteryEligible FROM learning_evidence WHERE id = ?",
    ).get(receipt.evidenceId)).toEqual({
      source: "mistake",
      method: "remediation-recall",
      verified: 1,
      masteryEligible: 0,
    });
  });

  it("rejects a fabricated remediation item with no verified incorrect origin", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const repository = repositoryFor(database);
    const remediation = command({
      source: "mistake",
      sessionId: undefined,
    });

    await expect(repository.commitObjectiveAttempt(
      "user-a",
      remediation,
      scoreObjectiveAttempt(remediation),
    )).rejects.toBeInstanceOf(AttemptSessionUnavailableError);
  });

  it("returns one duplicate receipt without duplicating normalized rows", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const repository = repositoryFor(database);
    const input = command();
    const score = scoreObjectiveAttempt(input);
    const first = await repository.commitObjectiveAttempt("user-a", input, score);
    const duplicate = await repository.commitObjectiveAttempt("user-a", input, score);

    expect(duplicate).toEqual({ ...first, duplicate: true });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_attempts",
    ).get()).toEqual({ count: 1 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM sync_changes",
    ).get()).toEqual({ count: 1 });
  });

  it("rejects key reuse and device-sequence reuse with a different payload", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const repository = repositoryFor(database);
    const first = command();
    await repository.commitObjectiveAttempt(
      "user-a",
      first,
      scoreObjectiveAttempt(first),
    );

    const changed = command({
      response: { ...first.response, answer: "sai" },
    });
    await expect(repository.commitObjectiveAttempt(
      "user-a",
      changed,
      scoreObjectiveAttempt(changed),
    )).rejects.toBeInstanceOf(AttemptIdempotencyConflictError);

    const sequenceReuse = command({
      idempotencyKey: "attempt:repository:another",
    });
    await expect(repository.commitObjectiveAttempt(
      "user-a",
      sequenceReuse,
      scoreObjectiveAttempt(sequenceReuse),
    )).rejects.toBeInstanceOf(AttemptDeviceSequenceConflictError);
  });

  it("marks a repeated activity as prior exposure and ineligible", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const repository = repositoryFor(database);
    const first = command();
    await repository.commitObjectiveAttempt(
      "user-a",
      first,
      scoreObjectiveAttempt(first),
    );
    seedAdditionalSession(database, "user-a", "user-a-session-repeat");
    const repeat = command({
      idempotencyKey: "attempt:repository:repeat",
      deviceSequence: 2,
      sessionId: "user-a-session-repeat",
      occurredAt: "2026-07-22T06:05:00.000Z",
    });
    await repository.commitObjectiveAttempt(
      "user-a",
      repeat,
      scoreObjectiveAttempt(repeat),
    );

    const rows = database.database.prepare(
      "SELECT a.prior_exposure AS priorExposure, e.mastery_eligible AS masteryEligible FROM learning_attempts a JOIN learning_evidence e ON e.attempt_id = a.id WHERE a.user_id = ? ORDER BY a.received_at, a.id",
    ).all("user-a") as Array<{ priorExposure: number; masteryEligible: number }>;
    expect(rows.map((row) => row.priorExposure).sort()).toEqual([0, 1]);
    expect(rows.map((row) => row.masteryEligible).sort()).toEqual([0, 1]);
  });

  it("rejects a second attempt for the same frozen activity in one session", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const repository = repositoryFor(database);
    const first = command();
    await repository.commitObjectiveAttempt(
      "user-a",
      first,
      scoreObjectiveAttempt(first),
    );
    const duplicateActivity = command({
      idempotencyKey: "attempt:repository:same-session-repeat",
      deviceSequence: 2,
      occurredAt: "2026-07-22T06:05:00.000Z",
    });

    await expect(repository.commitObjectiveAttempt(
      "user-a",
      duplicateActivity,
      scoreObjectiveAttempt(duplicateActivity),
    )).rejects.toBeInstanceOf(AttemptSessionUnavailableError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_attempts WHERE session_id = ?",
    ).get("user-a-session")).toEqual({ count: 1 });
  });

  it("does not insert after the session is submitted between preflight and batch", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    database.beforeNextBatch = () => {
      database.database.prepare(
        "UPDATE lesson_sessions SET status = 'submitted', raw_score = 100, gate_score = 100, required_evidence_count = 0, required_correct_count = 0, passed = 1, submitted_at = ? WHERE id = ?",
      ).run(Date.parse("2026-07-22T06:01:00.000Z"), "user-a-session");
    };
    const repository = repositoryFor(database);
    const input = command();

    await expect(repository.commitObjectiveAttempt(
      "user-a",
      input,
      scoreObjectiveAttempt(input),
    )).rejects.toBeInstanceOf(AttemptSessionUnavailableError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_attempts",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM idempotency_records WHERE scope = 'learning-attempt-v1'",
    ).get()).toEqual({ count: 0 });
  });

  it("rejects a leased command from an epoch that a durable reset superseded", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    database.database.prepare(
      "INSERT INTO learning_documents (user_id, revision, document_json, schema_version, content_version, updated_at) VALUES ('user-a', 1, ?, 1, ?, 1)",
    ).run(JSON.stringify({ reset: { epoch: 1 } }), CONTENT_VERSION);
    const input = command({ resetEpoch: 0 });

    await expect(repositoryFor(database).commitObjectiveAttempt(
      "user-a",
      input,
      scoreObjectiveAttempt(input),
    )).rejects.toBeInstanceOf(LearningResetEpochConflictError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_attempts",
    ).get()).toEqual({ count: 0 });
  });

  it("isolates identical command identifiers between users", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    seedUser(database, "user-b");
    const repository = repositoryFor(database);
    const input = command();
    await repository.commitObjectiveAttempt("user-a", input, scoreObjectiveAttempt(input));
    const userBInput = command({ sessionId: "user-b-session" });
    await repository.commitObjectiveAttempt(
      "user-b",
      userBInput,
      scoreObjectiveAttempt(userBInput),
    );

    expect(database.database.prepare(
      "SELECT user_id AS userId, COUNT(*) AS count FROM learning_attempts GROUP BY user_id ORDER BY user_id",
    ).all()).toEqual([
      { userId: "user-a", count: 1 },
      { userId: "user-b", count: 1 },
    ]);
  });

  it("fails closed when the authenticated user has no synced profile", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a", false);
    const repository = repositoryFor(database);
    const input = command();
    await expect(repository.commitObjectiveAttempt(
      "user-a",
      input,
      scoreObjectiveAttempt(input),
    )).rejects.toBeInstanceOf(AttemptEnrollmentUnavailableError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_attempts",
    ).get()).toEqual({ count: 0 });
  });

  it("rejects a session whose lesson version does not match the activity", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    database.database.prepare(
      "UPDATE lesson_sessions SET lesson_version = 'invented' WHERE user_id = ?",
    ).run("user-a");
    const repository = repositoryFor(database);
    const input = command();
    await expect(repository.commitObjectiveAttempt(
      "user-a",
      input,
      scoreObjectiveAttempt(input),
    )).rejects.toBeInstanceOf(AttemptSessionUnavailableError);
  });

  it("rejects out-of-form activities and legacy sessions without a form", async () => {
    const outOfForm = new SQLiteD1();
    seedUser(outOfForm, "user-a");
    const alternateWord = WORD_BY_ID.get(lesson.wordIds[1])!;
    const alternateForm = {
      ...sessionForm,
      activities: [{
        ...sessionForm.activities[0],
        activityId: `${lesson.id}:${alternateWord.id}-meaning`,
      }],
    };
    const alternateJson = canonicalLessonSessionForm(alternateForm);
    const alternateHash = `sha256:${createHash("sha256")
      .update(alternateJson)
      .digest("hex")}`;
    outOfForm.database.prepare(
      "UPDATE lesson_sessions SET form_manifest_json = ?, form_manifest_hash = ? WHERE user_id = ?",
    ).run(alternateJson, alternateHash, "user-a");
    const input = command();
    await expect(repositoryFor(outOfForm).commitObjectiveAttempt(
      "user-a",
      input,
      scoreObjectiveAttempt(input),
    )).rejects.toBeInstanceOf(AttemptSessionUnavailableError);
    expect(outOfForm.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_attempts",
    ).get()).toEqual({ count: 0 });

    const legacy = new SQLiteD1();
    seedUser(legacy, "user-a");
    legacy.database.prepare(
      "UPDATE lesson_sessions SET form_schema_version = NULL, form_script = NULL, form_manifest_json = NULL, form_manifest_hash = NULL WHERE user_id = ?",
    ).run("user-a");
    await expect(repositoryFor(legacy).commitObjectiveAttempt(
      "user-a",
      input,
      scoreObjectiveAttempt(input),
    )).rejects.toBeInstanceOf(AttemptSessionUnavailableError);
    expect(legacy.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_attempts",
    ).get()).toEqual({ count: 0 });
  });

  it("fails closed when a reused content version points at another manifest", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    database.database.prepare(
      "UPDATE course_versions SET manifest_hash = 'sha256:stale-package' WHERE id = ?",
    ).run(CONTENT_VERSION);
    const repository = repositoryFor(database);
    const input = command();

    await expect(repository.commitObjectiveAttempt(
      "user-a",
      input,
      scoreObjectiveAttempt(input),
    )).rejects.toBeInstanceOf(CourseVersionBindingError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_attempts",
    ).get()).toEqual({ count: 0 });
  });
});
