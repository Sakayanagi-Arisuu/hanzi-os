import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import type { AbandonLessonSessionCommandV1 } from "../learning/lessonSessionAbandonmentProtocol";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import { LearningResetEpochConflictError } from "./learningResetEpoch";
import {
  LessonSessionAbandonmentDeviceSequenceConflictError,
  LessonSessionAbandonmentIdempotencyConflictError,
  LessonSessionAbandonmentRepository,
  LessonSessionAbandonmentUnavailableError,
} from "./lessonSessionAbandonmentRepository";

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
const repository = (database: SQLiteD1) =>
  new LessonSessionAbandonmentRepository(database);

const command = (
  overrides: Partial<AbandonLessonSessionCommandV1> = {},
): AbandonLessonSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "lesson-session-abandon:repository:1",
  installationId: "user-a-installation",
  deviceId: "user-a-device",
  deviceSequence: 21,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  sessionId,
  ...overrides,
});

const seedUserSession = (
  database: SQLiteD1,
  userId = "user-a",
  courseState: "review" | "beta" | "published" = "beta",
) => {
  const timestamp = Date.parse("2026-07-22T05:00:00.000Z");
  database.database.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
  ).run(userId, timestamp, timestamp);
  database.database.prepare(
    "INSERT OR IGNORE INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, ?, 'approved', ?)",
  ).run(
    CONTENT_VERSION,
    CURRENT_CONTENT_MANIFEST_SHA256,
    courseState,
    timestamp,
  );
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
    "INSERT INTO lesson_sessions (id, user_id, enrollment_id, idempotency_record_id, schema_version, reset_epoch, content_version, lesson_id, lesson_version, expected_evidence_count, form_schema_version, form_script, form_manifest_json, form_manifest_hash, status, started_at, created_at) VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?, 1, 1, 'simplified', '{}', ?, 'started', ?, ?)",
  ).run(
    `${userId}-session`,
    userId,
    enrollmentId,
    openIdempotencyId,
    CONTENT_VERSION,
    lesson.id,
    `${CONTENT_VERSION}:${lesson.id}:1`,
    `sha256:${"a".repeat(64)}`,
    timestamp,
    timestamp,
  );
};

describe("server-owned lesson-session abandonment repository", () => {
  it("atomically abandons a started session and emits durable markers", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);

    const receipt = await repository(database).abandon("user-a", command());

    expect(receipt).toMatchObject({
      duplicate: false,
      sessionId,
      enrollmentId: "user-a-enrollment",
      contentVersion: CONTENT_VERSION,
      resetEpoch: 0,
      lessonId: lesson.id,
      lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
      status: "abandoned",
      abandonedAt: expect.any(String),
    });
    expect(database.database.prepare(
      "SELECT status, submitted_at AS submittedAt FROM lesson_sessions WHERE id = ?",
    ).get(sessionId)).toEqual({ status: "abandoned", submittedAt: null });
    const event = database.database.prepare(
      "SELECT reset_epoch AS resetEpoch, aggregate_id AS aggregateId, event_type AS eventType, payload_json AS payloadJson FROM outbox_events",
    ).get() as Record<string, unknown>;
    expect(event).toMatchObject({
      resetEpoch: 0,
      aggregateId: sessionId,
      eventType: "lesson.abandoned",
    });
    const eventPayload = JSON.parse(String(event.payloadJson));
    expect(eventPayload).toMatchObject({
      contentManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      lessonVersion: receipt.lessonVersion,
      abandonedAt: receipt.abandonedAt,
    });
    expect(eventPayload).not.toHaveProperty("idempotencyKey");
    expect(eventPayload).not.toHaveProperty("status");
    expect(database.database.prepare(
      "SELECT reset_epoch AS resetEpoch, entity_type AS entityType, entity_id AS entityId, revision, operation_id AS operationId, payload_json AS payloadJson FROM sync_changes",
    ).get()).toEqual({
      resetEpoch: 0,
      entityType: "lesson_session",
      entityId: sessionId,
      revision: 2,
      operationId:
        `normalized:lesson-session-abandon:${command().idempotencyKey}`,
      payloadJson: null,
    });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM lesson_sessions WHERE status = 'started'",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_evidence",
    ).get()).toEqual({ count: 0 });
  });

  it("returns the canonical receipt for an exact retry only once", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    const abandonments = repository(database);
    const first = await abandonments.abandon("user-a", command());
    const retry = await abandonments.abandon("user-a", command());

    expect(retry).toEqual({ ...first, duplicate: true });
    expect(database.database.prepare(
      "SELECT (SELECT COUNT(*) FROM idempotency_records WHERE scope = 'lesson-session-abandon-v1') AS idempotencyCount, (SELECT COUNT(*) FROM outbox_events) AS outboxCount, (SELECT COUNT(*) FROM sync_changes) AS changeCount",
    ).get()).toEqual({
      idempotencyCount: 1,
      outboxCount: 1,
      changeCount: 1,
    });
  });

  it("rejects idempotency-key and device-sequence reuse", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    const abandonments = repository(database);
    await abandonments.abandon("user-a", command());
    await expect(abandonments.abandon("user-a", command({
      sessionId: "another-session",
    }))).rejects.toBeInstanceOf(
      LessonSessionAbandonmentIdempotencyConflictError,
    );

    const sequenceDatabase = new SQLiteD1();
    seedUserSession(sequenceDatabase);
    sequenceDatabase.database.prepare(
      "INSERT INTO devices (id, user_id, installation_id, label, last_acked_cursor, created_at, last_seen_at) VALUES ('existing-device', 'user-a', 'user-a-installation', 'device', 0, 1, 1)",
    ).run();
    sequenceDatabase.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('sequence-owner', 'user-a', 'existing-device', 21, 0, 'other', 'other-key', 'fixture', 'completed', 1, 1)",
    ).run();
    await expect(repository(sequenceDatabase).abandon(
      "user-a",
      command({ idempotencyKey: "new-key" }),
    )).rejects.toBeInstanceOf(
      LessonSessionAbandonmentDeviceSequenceConflictError,
    );
  });

  it("rejects stale epochs, foreign owners, and terminal sessions", async () => {
    const staleEpoch = new SQLiteD1();
    seedUserSession(staleEpoch);
    await expect(repository(staleEpoch).abandon(
      "user-a",
      command({ resetEpoch: 1 }),
    )).rejects.toBeInstanceOf(LearningResetEpochConflictError);

    const foreign = new SQLiteD1();
    seedUserSession(foreign);
    foreign.database.prepare(
      "INSERT INTO users (id, status, created_at, updated_at) VALUES ('user-b', 'active', 1, 1)",
    ).run();
    await expect(repository(foreign).abandon("user-b", command()))
      .rejects.toBeInstanceOf(LessonSessionAbandonmentUnavailableError);

    const terminal = new SQLiteD1();
    seedUserSession(terminal);
    await repository(terminal).abandon("user-a", command());
    await expect(repository(terminal).abandon("user-a", command({
      idempotencyKey: "terminal-new-key",
      deviceSequence: 22,
    }))).rejects.toBeInstanceOf(LessonSessionAbandonmentUnavailableError);
  });

  it("cleans up a historical retired session without publication authority", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    const timestamp = Date.parse("2026-07-22T04:00:00.000Z");
    const retiredContentVersion = "historical-retired-v1";
    const retiredManifest = `sha256:${"b".repeat(64)}`;
    database.database.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at, retired_at) VALUES (?, 'hanzi-os-core', 1, ?, 'retired', 'approved', ?, ?)",
    ).run(retiredContentVersion, retiredManifest, timestamp, timestamp);
    database.database.prepare(
      "UPDATE enrollments SET course_version_id = ?, status = 'archived' WHERE id = 'user-a-enrollment'",
    ).run(retiredContentVersion);
    database.database.prepare(
      "UPDATE lesson_sessions SET content_version = ?, lesson_id = 'retired-lesson', lesson_version = ? WHERE id = ?",
    ).run(
      retiredContentVersion,
      `${retiredContentVersion}:retired-lesson:7`,
      sessionId,
    );

    const receipt = await repository(database).abandon("user-a", command());

    expect(receipt).toMatchObject({
      duplicate: false,
      contentVersion: retiredContentVersion,
      lessonId: "retired-lesson",
      lessonVersion: `${retiredContentVersion}:retired-lesson:7`,
      status: "abandoned",
    });
    const event = database.database.prepare(
      "SELECT payload_json AS payloadJson FROM outbox_events WHERE event_type = 'lesson.abandoned'",
    ).get() as { payloadJson: string };
    expect(JSON.parse(event.payloadJson)).toMatchObject({
      contentVersion: retiredContentVersion,
      contentManifestSha256: retiredManifest,
      lessonId: "retired-lesson",
      lessonVersion: `${retiredContentVersion}:retired-lesson:7`,
    });
  });

  it("rolls back when submission wins after abandonment preflight", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    database.beforeNextBatch = () => {
      const timestamp = Date.parse("2026-07-22T06:30:00.000Z");
      database.database.prepare(
        "UPDATE lesson_sessions SET status = 'submitted', raw_score = 100, gate_score = 100, required_evidence_count = 0, required_correct_count = 0, passed = 1, submitted_at = ? WHERE id = ?",
      ).run(timestamp, sessionId);
    };

    await expect(repository(database).abandon("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionAbandonmentUnavailableError);
    expect(database.database.prepare(
      "SELECT status FROM lesson_sessions WHERE id = ?",
    ).get(sessionId)).toEqual({ status: "submitted" });
    expect(database.database.prepare(
      "SELECT (SELECT COUNT(*) FROM idempotency_records WHERE scope = 'lesson-session-abandon-v1') AS idempotencyCount, (SELECT COUNT(*) FROM outbox_events) AS outboxCount, (SELECT COUNT(*) FROM sync_changes) AS changeCount",
    ).get()).toEqual({
      idempotencyCount: 0,
      outboxCount: 0,
      changeCount: 0,
    });
  });

  it("rolls back when reset invalidates the session after preflight", async () => {
    const database = new SQLiteD1();
    seedUserSession(database);
    database.beforeNextBatch = () => {
      database.database.prepare(
        "INSERT INTO learning_documents (user_id, revision, document_json, schema_version, content_version, updated_at) VALUES ('user-a', 1, ?, 1, ?, 2)",
      ).run(JSON.stringify({ reset: { epoch: 1 } }), CONTENT_VERSION);
      database.database.prepare(
        "UPDATE lesson_sessions SET status = 'invalidated' WHERE id = ?",
      ).run(sessionId);
    };

    await expect(repository(database).abandon("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionAbandonmentUnavailableError);
    expect(database.database.prepare(
      "SELECT status FROM lesson_sessions WHERE id = ?",
    ).get(sessionId)).toEqual({ status: "invalidated" });
    expect(database.database.prepare(
      "SELECT (SELECT COUNT(*) FROM idempotency_records WHERE scope = 'lesson-session-abandon-v1') AS idempotencyCount, (SELECT COUNT(*) FROM outbox_events) AS outboxCount, (SELECT COUNT(*) FROM sync_changes) AS changeCount",
    ).get()).toEqual({
      idempotencyCount: 0,
      outboxCount: 0,
      changeCount: 0,
    });
  });
});
