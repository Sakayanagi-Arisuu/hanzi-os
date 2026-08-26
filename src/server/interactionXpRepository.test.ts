import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION, LESSON_BY_ID } from "../data/curriculum";
import { LESSON_REWARD_CLAIM_STARTED_AT } from "../learning/interactionXp";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import {
  InteractionXpRepository,
} from "./interactionXpRepository";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migration = readdirSync(migrationDirectory)
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n");

class Statement implements D1PreparedStatement {
  private values: unknown[] = [];
  constructor(private readonly statement: StatementSync, private readonly sql: string) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  private parameters() {
    return this.values as Array<string | number | bigint | Uint8Array | null>;
  }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = this.statement.get(...this.parameters()) as Record<string, unknown> | undefined;
    return row ? (column ? row[column] : row) as T : null;
  }
  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    return { success: true, results: this.statement.all(...this.parameters()) as T[] };
  }
  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    if (/^\s*SELECT\b/iu.test(this.sql)) return this.all<T>();
    const result = this.statement.run(...this.parameters());
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class Database implements D1Database {
  readonly sqlite = new DatabaseSync(":memory:");
  constructor() {
    this.sqlite.exec("PRAGMA foreign_keys = ON");
    this.sqlite.exec(migration);
  }
  prepare(sql: string) { return new Statement(this.sqlite.prepare(sql), sql); }
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

const seed = (database: Database) => {
  const timestamp = Date.parse("2026-08-19T02:00:00.000Z");
  database.sqlite.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES ('user-a', 'active', ?, ?)",
  ).run(timestamp, timestamp);
  database.sqlite.prepare(
    "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, 'beta', 'approved', ?)",
  ).run(CONTENT_VERSION, CURRENT_CONTENT_MANIFEST_SHA256, timestamp);
  database.sqlite.prepare(
    "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES ('enrollment-a', 'user-a', ?, 'conversation', 'active', 1, ?, ?)",
  ).run(CONTENT_VERSION, timestamp, timestamp);

  for (const [index, lessonId] of ["boot-1", "boot-2", "boot-3"].entries()) {
    const idempotencyId = `open-${lessonId}`;
    database.sqlite.prepare(
      "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES (?, 'user-a', 0, 'lesson-session-v1', ?, 'fixture', 'completed', 201, '{}', ?, ?, ?)",
    ).run(idempotencyId, idempotencyId, timestamp, timestamp, timestamp);
    database.sqlite.prepare(
      `INSERT INTO lesson_sessions (
        id, user_id, enrollment_id, idempotency_record_id, schema_version,
        reset_epoch, content_version, lesson_id, lesson_version,
        expected_evidence_count, form_schema_version, form_script,
        form_manifest_json, form_manifest_hash, status, raw_score, gate_score,
        required_evidence_count, required_correct_count, passed, started_at,
        submitted_at, created_at
      ) VALUES (?, 'user-a', 'enrollment-a', ?, 1, 0, ?, ?, ?, 1, 1,
        'simplified', '{"script":"simplified","schemaVersion":1,"activities":[]}',
        ?, 'submitted', 100, 100, 0, 0, 1, ?, ?, ?)`,
    ).run(
      `session-${lessonId}`,
      idempotencyId,
      CONTENT_VERSION,
      lessonId,
      `${CONTENT_VERSION}:${lessonId}:1`,
      `sha256:${"a".repeat(64)}`,
      timestamp + index * 1_000,
      timestamp + index * 1_000,
      timestamp + index * 1_000,
    );
  }
};

describe("InteractionXpRepository", () => {
  it("reconstructs first-clear EXP and records a pronunciation daily reward once", async () => {
    const database = new Database();
    seed(database);
    const now = LESSON_REWARD_CLAIM_STARTED_AT + 60 * 60 * 1_000;
    const repository = new InteractionXpRepository(database, () => now);
    const dayStart = Date.parse("2026-08-19T00:00:00.000Z");
    const dayEnd = Date.parse("2026-08-20T00:00:00.000Z");
    const lessonXp = ["boot-1", "boot-2", "boot-3"]
      .reduce((sum, id) => sum + LESSON_BY_ID.get(id)!.xp, 0);

    await expect(repository.read("user-a", dayStart, dayEnd)).resolves.toMatchObject({
      totalXp: lessonXp,
      dailyXp: lessonXp,
      rewardedLessonCount: 3,
      pronunciationRewardCount: 0,
      lessonRewards: expect.arrayContaining([
        expect.objectContaining({ lessonId: "boot-1", status: "claimed" }),
      ]),
    });

    const rewardKey = `pronunciation-daily:${CONTENT_VERSION}:2026-08-19`;
    await expect(repository.claimPronunciationReward("user-a", rewardKey, 0))
      .resolves.toMatchObject({ awarded: true, amount: 10 });
    await expect(repository.claimPronunciationReward("user-a", rewardKey, 0))
      .resolves.toMatchObject({ awarded: false, amount: 0 });
    await expect(repository.read("user-a", dayStart, dayEnd)).resolves.toMatchObject({
      totalXp: lessonXp + 10,
      dailyXp: lessonXp + 10,
      pronunciationRewardCount: 1,
    });
  });

  it("keeps a new first clear pending until its chest is opened, then claims once", async () => {
    const database = new Database();
    seed(database);
    const lesson = LESSON_BY_ID.get("boot-4")!;
    const passedAt = LESSON_REWARD_CLAIM_STARTED_AT + 1_000;
    database.sqlite.prepare(
      "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('open-boot-4', 'user-a', 0, 'lesson-session-v1', 'open-boot-4', 'fixture', 'completed', 201, '{}', ?, ?, ?)",
    ).run(passedAt, passedAt, passedAt);
    database.sqlite.prepare(
      `INSERT INTO lesson_sessions (
        id, user_id, enrollment_id, idempotency_record_id, schema_version,
        reset_epoch, content_version, lesson_id, lesson_version,
        expected_evidence_count, form_schema_version, form_script,
        form_manifest_json, form_manifest_hash, status, raw_score, gate_score,
        required_evidence_count, required_correct_count, passed, started_at,
        submitted_at, created_at
      ) VALUES ('session-boot-4', 'user-a', 'enrollment-a', 'open-boot-4', 1,
        0, ?, 'boot-4', ?, 1, 1, 'simplified',
        '{"script":"simplified","schemaVersion":1,"activities":[]}', ?,
        'submitted', 80, 80, 1, 0, 1, ?, ?, ?)`,
    ).run(
      CONTENT_VERSION,
      `${CONTENT_VERSION}:boot-4:1`,
      `sha256:${"b".repeat(64)}`,
      passedAt - 500,
      passedAt,
      passedAt - 500,
    );
    const repository = new InteractionXpRepository(
      database,
      () => LESSON_REWARD_CLAIM_STARTED_AT + 2_000,
    );
    const dayStart = Date.parse("2026-08-19T00:00:00.000Z");
    const dayEnd = Date.parse("2026-08-20T00:00:00.000Z");
    const legacyXp = ["boot-1", "boot-2", "boot-3"]
      .reduce((sum, id) => sum + LESSON_BY_ID.get(id)!.xp, 0);

    await expect(repository.read("user-a", dayStart, dayEnd)).resolves.toMatchObject({
      totalXp: legacyXp,
      rewardedLessonCount: 3,
      lessonRewards: expect.arrayContaining([
        { lessonId: "boot-4", amount: lesson.xp, status: "pending" },
      ]),
    });
    await expect(repository.claimLessonReward("user-a", "boot-4", 0))
      .resolves.toMatchObject({ awarded: true, amount: lesson.xp, status: "claimed" });
    await expect(repository.claimLessonReward("user-a", "boot-4", 0))
      .resolves.toMatchObject({ awarded: false, amount: 0, status: "claimed" });
    expect(database.sqlite.prepare(
      "SELECT source_type AS sourceType, source_id AS sourceId, rule_version AS ruleVersion FROM xp_ledger WHERE source_type = 'lesson-reward'",
    ).all()).toEqual([{
      sourceType: "lesson-reward",
      sourceId: `lesson-reward:0:${CONTENT_VERSION}:boot-4`,
      ruleVersion: "lesson-chest-v1",
    }]);
    await expect(repository.read("user-a", dayStart, dayEnd)).resolves.toMatchObject({
      totalXp: legacyXp + lesson.xp,
      rewardedLessonCount: 4,
      lessonRewards: expect.arrayContaining([
        { lessonId: "boot-4", amount: lesson.xp, status: "claimed" },
      ]),
    });
  });
});
