import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { ContentStudioRepository } from "./contentStudioRepository";
import {
  contentReleaseEventInsertStatement,
  ContentReleaseRetryableError,
  ContentReleaseWorker,
  ContentReleaseWorkerRepository,
} from "./contentReleaseWorker";
import {
  decodeContentReleaseEvent,
  encodeContentReleaseEvent,
} from "./contentReleaseEventContract";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migrations = readdirSync(migrationDirectory)
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n")
  .replaceAll("--> statement-breakpoint", "");

class SQLiteStatement implements D1PreparedStatement {
  private parameters: unknown[] = [];
  constructor(private readonly statement: StatementSync, private readonly query: string) {}
  bind(...values: unknown[]) { this.parameters = values; return this; }
  private values() { return this.parameters as Array<string | number | bigint | Uint8Array | null>; }
  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const row = this.statement.get(...this.values()) as Record<string, unknown> | undefined;
    return row ? (columnName ? row[columnName] : row) as T : null;
  }
  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    return { success: true, results: this.statement.all(...this.values()) as T[] };
  }
  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    if (/^\s*(?:SELECT|WITH)\b/iu.test(this.query)) return this.all<T>();
    const result = this.statement.run(...this.values());
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class SQLiteD1 implements D1Database {
  readonly sqlite = new DatabaseSync(":memory:");
  constructor() {
    this.sqlite.exec("PRAGMA foreign_keys = ON");
    this.sqlite.exec(migrations);
  }
  prepare(query: string) { return new SQLiteStatement(this.sqlite.prepare(query), query); }
  async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]) {
    this.sqlite.exec("BEGIN");
    try {
      const results: Array<D1RunResult<T>> = [];
      for (const statement of statements) results.push(await statement.run<T>());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

const reviewedLesson = (objectiveVi = "Giới thiệu bản thân bằng câu ngắn.") => ({
  objectiveVi,
  prerequisites: [],
  vocabulary: ["你好", "我", "是"],
  dialogue: [
    { hanzi: "你好！", pinyin: "Nǐ hǎo!", meaningVi: "Xin chào!" },
    { hanzi: "你好，我是安。", pinyin: "Nǐ hǎo, wǒ shì Ān.", meaningVi: "Xin chào, tôi là An." },
  ],
  grammar: [{ pattern: "A 是 B", explanationVi: "Dùng để giới thiệu danh tính." }],
  exercises: [{
    promptVi: "Chọn câu giới thiệu đúng.",
    distractors: ["我很好吗？", "你是学生吗？"],
    answer: "我是学生。",
    explanationVi: "我是学生 dùng 是 để giới thiệu danh tính.",
  }],
  review: {
    humanReviewed: false,
    aiSelfReview: {
      accuracy: true,
      levelFit: true,
      pedagogy: true,
      answerIntegrity: true,
      originality: true,
    },
  },
});

const addUsers = (database: SQLiteD1) => {
  const now = Date.now();
  for (const userId of ["editor", "admin"]) {
    database.sqlite.prepare(
      "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
    ).run(userId, now, now);
  }
};

const approveFixture = async (database: SQLiteD1, suffix = "01") => {
  const studio = new ContentStudioRepository(database);
  const draft = await studio.createDraft({
    actorUserId: "editor",
    actorSessionId: "editor-session",
    itemType: "lesson",
    stableKey: `hsk1.lesson.release-${suffix}`,
    title: `Release fixture ${suffix}`,
    level: "hsk1",
    content: reviewedLesson(),
    idempotencyKey: `create:release-${suffix}`,
  });
  const validated = await studio.validateRevision({
    actorUserId: "editor",
    actorSessionId: "editor-session",
    revisionId: draft.id,
    expectedRowVersion: draft.rowVersion,
    idempotencyKey: `validate:release-${suffix}`,
    requestId: `request:validate-${suffix}`,
  });
  const submitted = await studio.transition({
    actorUserId: "editor", actorSessionId: "editor-session",
    revisionId: draft.id, expectedRowVersion: validated.rowVersion,
    toState: "submitted", idempotencyKey: `submit:release-${suffix}`,
    requestId: `request:submit-${suffix}`,
  });
  const approved = await studio.transition({
    actorUserId: "admin", actorSessionId: "admin-session",
    revisionId: draft.id, expectedRowVersion: submitted.rowVersion,
    toState: "approved", idempotencyKey: `approve:release-${suffix}`,
    requestId: `request:approve-${suffix}`,
  });
  return { studio, draft, approved };
};

const publishFixture = async (database: SQLiteD1, suffix = "01") => {
  const { studio, draft, approved } = await approveFixture(database, suffix);
  const published = await studio.transition({
    actorUserId: "admin", actorSessionId: "admin-session",
    revisionId: draft.id, expectedRowVersion: approved.rowVersion,
    toState: "published", idempotencyKey: `publish:release-${suffix}`,
    requestId: `request:publish-${suffix}`,
  });
  return { studio, published };
};

const workerAt = (database: SQLiteD1, now: () => number, beforeRelease?: () => Promise<void>) => {
  const repository = new ContentReleaseWorkerRepository(database, { now });
  return { repository, worker: new ContentReleaseWorker(repository, {
    policy: {
      batchSize: 16,
      maximumAttempts: 3,
      initialRetryDelayMs: 100,
      maximumRetryDelayMs: 1_000,
    },
    beforeRelease,
  }) };
};

describe("resilient Content Release Worker", () => {
  it("rolls back the publication when its release request cannot enter the outbox", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const { studio, draft, approved } = await approveFixture(database, "atomic");
    database.sqlite.exec(`CREATE TRIGGER inject_release_outbox_failure
      BEFORE INSERT ON content_release_outbox_events
      WHEN NEW.event_type = 'content.release.requested'
      BEGIN
        SELECT RAISE(ABORT, 'injected release outbox failure');
      END`);

    await expect(studio.transition({
      actorUserId: "admin",
      actorSessionId: "admin-session",
      revisionId: draft.id,
      expectedRowVersion: approved.rowVersion,
      toState: "published",
      idempotencyKey: "publish:release-atomic",
      requestId: "request:publish-atomic",
    })).rejects.toThrow(/injected release outbox failure/u);

    expect(database.sqlite.prepare(
      "SELECT workflow_state AS workflowState, row_version AS rowVersion FROM content_revisions WHERE id = ?",
    ).get(draft.id)).toEqual({
      workflowState: "approved",
      rowVersion: approved.rowVersion,
    });
    expect(database.sqlite.prepare(
      "SELECT COUNT(*) AS count FROM content_release_outbox_events WHERE event_type = 'content.release.requested'",
    ).get()).toEqual({ count: 0 });
  });

  it("keeps publish invisible until one immutable package completes", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const { studio, published } = await publishFixture(database);
    await expect(studio.publishedRuntime()).resolves.toMatchObject({ items: [] });
    let now = Date.now() + 1_000;
    const { worker } = workerAt(database, () => now);
    await expect(worker.drain()).resolves.toMatchObject({
      claimed: 2,
      validated: 1,
      completed: 1,
      deadLettered: 0,
    });
    await expect(studio.publishedRuntime()).resolves.toMatchObject({
      releaseBoundary: "content-release-worker-v1",
      items: [expect.objectContaining({
        revisionId: published.id,
        stableKey: "hsk1.lesson.release-01",
      })],
      packages: [expect.objectContaining({
        packageSha256: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        manifestSha256: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
      })],
    });
    expect(database.sqlite.prepare("SELECT COUNT(*) AS count FROM content_release_packages").get()).toEqual({ count: 1 });
    expect(database.sqlite.prepare("SELECT COUNT(*) AS count FROM content_release_heads").get()).toEqual({ count: 1 });
    expect(() => database.sqlite.prepare(
      "UPDATE content_release_packages SET correlation_id = 'tampered-correlation'",
    ).run()).toThrow(/immutable/u);
    expect(() => database.sqlite.prepare("DELETE FROM content_release_packages").run()).toThrow(/immutable/u);
    now += 1;
  });

  it("recovers a crashed lease and deduplicates a repeated delivery", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    await publishFixture(database, "crash");
    let now = Date.now() + 1_000;
    const { repository, worker } = workerAt(database, () => now);
    const validation = await repository.claimNext();
    expect(validation?.eventType).toBe("content.validation.requested");
    expect(await repository.acknowledgeValidation(validation!)).toBe(true);
    const crashed = await repository.claimNext();
    expect(crashed?.eventType).toBe("content.release.requested");
    now += 31_000;
    await expect(worker.drain()).resolves.toMatchObject({ completed: 1 });
    expect(database.sqlite.prepare(
      "SELECT attempts FROM content_release_outbox_events WHERE id = ?",
    ).get(crashed!.id)).toEqual({ attempts: 2 });

    const decoded = await decodeContentReleaseEvent(crashed!);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok || decoded.envelope.eventType !== "content.release.requested") return;
    const duplicate = await encodeContentReleaseEvent({
      id: crypto.randomUUID(),
      eventType: "content.release.requested",
      itemId: crashed!.itemId,
      revisionId: crashed!.revisionId,
      correlationId: crashed!.correlationId,
      causationId: crashed!.id,
      actorUserId: "admin",
      actorSessionId: "admin-session",
      createdAt: now + 1,
      payload: { ...decoded.envelope.payload, requestedAt: now + 1 },
    });
    await contentReleaseEventInsertStatement(database, duplicate).run();
    now += 2;
    await expect(worker.drain()).resolves.toMatchObject({
      completed: 1,
      duplicateOutcomes: 1,
    });
    expect(database.sqlite.prepare("SELECT COUNT(*) AS count FROM content_release_packages").get()).toEqual({ count: 1 });
  });

  it("backs off a transient failure and dead-letters a poison contract", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const { published } = await publishFixture(database, "retry");
    let now = Date.now() + 1_000;
    let failOnce = true;
    const { worker } = workerAt(database, () => now, async () => {
      if (failOnce) {
        failOnce = false;
        throw new ContentReleaseRetryableError(
          "CONTENT_RELEASE_STORAGE_BUSY",
          "Injected transient failure.",
        );
      }
    });
    await expect(worker.drain()).resolves.toMatchObject({ validated: 1, retried: 1 });
    now += 200;
    await expect(worker.drain()).resolves.toMatchObject({ completed: 1 });

    const poisonPayload = JSON.stringify({ action: "publish" });
    database.sqlite.prepare(
      `INSERT INTO content_release_outbox_events (
        id, event_type, schema_version, item_id, revision_id, correlation_id,
        actor_user_id, actor_session_id, payload_json, payload_sha256,
        status, attempts, available_at, created_at
      ) VALUES (?, 'content.release.requested', 1,
        (SELECT item_id FROM content_revisions WHERE id = ?), ?, ?,
        'admin', 'admin-session', ?, ?, 'pending', 0, ?, ?)`,
    ).run(
      "poison-release-event",
      published.id,
      published.id,
      "request:poison-release",
      poisonPayload,
      `sha256:${"0".repeat(64)}`,
      now,
      now,
    );
    await expect(worker.drain()).resolves.toMatchObject({ deadLettered: 1 });
    expect(database.sqlite.prepare(
      "SELECT status, last_error_code AS lastErrorCode FROM content_release_outbox_events WHERE id = 'poison-release-event'",
    ).get()).toEqual({
      status: "dead",
      lastErrorCode: "CONTENT_RELEASE_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(database.sqlite.prepare(
      "SELECT COUNT(*) AS count FROM content_release_outbox_events WHERE event_type = 'content.release.failed'",
    ).get()).toEqual({ count: 2 });
  });

  it("replays an authorized dead request without duplicating its release outcome", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const { published } = await publishFixture(database, "replay");
    let now = Date.now() + 1_000;
    const { repository, worker } = workerAt(database, () => now, async () => {
      throw new ContentReleaseRetryableError(
        "CONTENT_RELEASE_STORAGE_BUSY",
        "Injected persistent failure.",
      );
    });
    await expect(worker.drain()).resolves.toMatchObject({ validated: 1, retried: 1 });
    now += 200;
    await expect(worker.drain()).resolves.toMatchObject({ retried: 1 });
    now += 300;
    await expect(worker.drain()).resolves.toMatchObject({ deadLettered: 1 });

    const source = database.sqlite.prepare(
      `SELECT id FROM content_release_outbox_events
        WHERE revision_id = ? AND event_type = 'content.release.requested'
          AND status = 'dead'`,
    ).get(published.id) as { id: string };
    const replayEventId = await repository.replayDeadRelease({
      eventId: source.id,
      actorUserId: "admin",
      actorSessionId: "admin-session",
      correlationId: "request:replay-release",
    });
    await expect(repository.replayDeadRelease({
      eventId: source.id,
      actorUserId: "admin",
      actorSessionId: "admin-session",
      correlationId: "request:replay-release-again",
    })).resolves.toBe(replayEventId);
    expect(database.sqlite.prepare(
      "SELECT causation_id AS causationId, status FROM content_release_outbox_events WHERE id = ?",
    ).get(replayEventId)).toEqual({ causationId: source.id, status: "pending" });
    expect(database.sqlite.prepare(
      "SELECT COUNT(*) AS count FROM content_release_outbox_events WHERE causation_id = ? AND event_type = 'content.release.requested'",
    ).get(source.id)).toEqual({ count: 1 });

    now += 1;
    const replayWorker = new ContentReleaseWorker(repository, {
      policy: {
        batchSize: 16,
        maximumAttempts: 3,
        initialRetryDelayMs: 100,
        maximumRetryDelayMs: 1_000,
      },
    });
    await expect(replayWorker.drain()).resolves.toMatchObject({ completed: 1 });
    expect(database.sqlite.prepare(
      "SELECT COUNT(*) AS count FROM content_release_packages WHERE revision_id = ?",
    ).get(published.id)).toEqual({ count: 1 });
    expect(database.sqlite.prepare(
      "SELECT COUNT(*) AS count FROM audit_events WHERE action = 'content.release.replayed' AND actor_user_id = 'admin'",
    ).get()).toEqual({ count: 1 });
  });

  it("fences a stale publish, preserves delete protection and completes archive", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const { studio, published } = await publishFixture(database, "stale");
    const archived = await studio.transition({
      actorUserId: "admin", actorSessionId: "admin-session",
      revisionId: published.id, expectedRowVersion: published.rowVersion,
      toState: "archived", idempotencyKey: "archive:release-stale",
      requestId: "request:archive-stale",
    });
    expect(archived.workflowState).toBe("archived");
    const requests = database.sqlite.prepare(
      `SELECT id, json_extract(payload_json, '$.action') AS action
         FROM content_release_outbox_events
        WHERE event_type = 'content.release.requested' ORDER BY created_at, id`,
    ).all() as Array<{ id: string; action: string }>;
    const publishEvent = requests.find((event) => event.action === "publish")!;
    const archiveEvent = requests.find((event) => event.action === "archive")!;
    const base = Date.now() + 1_000;
    database.sqlite.prepare("UPDATE content_release_outbox_events SET available_at = ? WHERE id = ?").run(base, publishEvent.id);
    database.sqlite.prepare("UPDATE content_release_outbox_events SET available_at = ? WHERE id = ?").run(base + 1, archiveEvent.id);
    let now = base + 2;
    const { worker } = workerAt(database, () => now);
    await expect(worker.drain()).resolves.toMatchObject({
      completed: 1,
      deadLettered: 1,
    });
    await expect(studio.publishedRuntime()).resolves.toMatchObject({ items: [] });
    expect(() => database.sqlite.prepare(
      "DELETE FROM content_revisions WHERE id = ?",
    ).run(published.id)).toThrow(/immutable/u);
    now += 1;
  });

  it("keeps the old runtime head until a replacement package completes", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const { studio, published } = await publishFixture(database, "replace");
    let now = Date.now() + 1_000;
    const { worker } = workerAt(database, () => now);
    await worker.drain();
    const fork = await studio.forkRevision({
      actorUserId: "editor", actorSessionId: "editor-session",
      sourceRevisionId: published.id, idempotencyKey: "fork:release-replace",
    });
    const edited = await studio.updateDraft({
      actorUserId: "editor", actorSessionId: "editor-session",
      revisionId: fork.id, expectedRowVersion: fork.rowVersion,
      title: "Replacement fixture", level: "hsk1",
      content: reviewedLesson("Giới thiệu bản thân rõ hơn."),
      idempotencyKey: "update:release-replace",
    });
    const validated = await studio.validateRevision({
      actorUserId: "editor", actorSessionId: "editor-session",
      revisionId: fork.id, expectedRowVersion: edited.rowVersion,
      idempotencyKey: "validate:release-replace-v2",
      requestId: "request:validate-replace",
    });
    const submitted = await studio.transition({
      actorUserId: "editor", actorSessionId: "editor-session",
      revisionId: fork.id, expectedRowVersion: validated.rowVersion,
      toState: "submitted", idempotencyKey: "submit:release-replace-v2",
      requestId: "request:submit-replace",
    });
    const approved = await studio.transition({
      actorUserId: "admin", actorSessionId: "admin-session",
      revisionId: fork.id, expectedRowVersion: submitted.rowVersion,
      toState: "approved", idempotencyKey: "approve:release-replace-v2",
      requestId: "request:approve-replace",
    });
    const replacement = await studio.transition({
      actorUserId: "admin", actorSessionId: "admin-session",
      revisionId: fork.id, expectedRowVersion: approved.rowVersion,
      toState: "published", idempotencyKey: "publish:release-replace-v2",
      requestId: "request:publish-replace",
    });
    await expect(studio.publishedRuntime()).resolves.toMatchObject({
      items: [expect.objectContaining({ revision: 1 })],
    });
    now += 2_000;
    await worker.drain();
    await expect(studio.publishedRuntime()).resolves.toMatchObject({
      items: [expect.objectContaining({ revision: 2, revisionId: replacement.id })],
    });
    expect(database.sqlite.prepare("SELECT COUNT(*) AS count FROM content_release_packages").get()).toEqual({ count: 2 });
  });
});
