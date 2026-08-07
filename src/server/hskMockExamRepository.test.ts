import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/contentIdentity";
import { AssessmentRepository } from "./assessmentRepository";
import { getHskMockExamDefinition } from "./hskMockExamBank";
import {
  HskMockExamRepository,
  hskMockExamRepositoryOptions,
} from "./hskMockExamRepository";

const migrations = readdirSync(new URL("../../drizzle/", import.meta.url))
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(`../../drizzle/${file}`, import.meta.url), "utf8"))
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
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
}

class SQLiteD1 implements D1Database {
  readonly sqlite = new DatabaseSync(":memory:");
  constructor() { this.sqlite.exec("PRAGMA foreign_keys = ON"); this.sqlite.exec(migrations); }
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

const now = Date.parse("2026-08-07T08:00:00.000Z");

const seed = (database: SQLiteD1) => {
  database.sqlite.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES ('learner', 'active', ?, ?)",
  ).run(now, now);
  database.sqlite.prepare(
    "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES ('learner', 'Learner', 'hsk', 20, 'simplified', 'zero', 1, 1, ?, ?)",
  ).run(now, now);
  database.sqlite.prepare(
    "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, 'beta', 'approved', ?)",
  ).run(CONTENT_VERSION, CURRENT_CONTENT_MANIFEST_SHA256, now);
  database.sqlite.prepare(
    "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES ('enrollment', 'learner', ?, 'hsk', 'active', 1, ?, ?)",
  ).run(CONTENT_VERSION, now, now);
};

describe("HSK Mock Exam assessment integration", () => {
  it("opens answer-free, resumes, scores, recommends real lessons and keeps history", async () => {
    const database = new SQLiteD1();
    seed(database);
    const definition = getHskMockExamDefinition("hsk1", "a")!;
    const assessment = new AssessmentRepository(database, {
      ...hskMockExamRepositoryOptions(definition),
      publicationPolicy: {
        manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
        audience: "closed-alpha",
        lifecycle: "published",
        closedAlphaEligible: true,
        productionEligible: false,
        promotionChannel: "closed-alpha",
        promotionManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      },
      randomSource: () => 0.5,
      now: () => now,
    });
    const opened = await assessment.openSession("learner", {
      protocolVersion: 1,
      idempotencyKey: "mock:hsk1:a:open",
      installationId: "installation",
      deviceId: "device",
      deviceSequence: 1,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      enrollmentId: "enrollment",
    });
    expect(JSON.stringify(opened.form)).not.toMatch(
      /correctAnswer|answerKey|explanationVi|sourceLessonId/iu,
    );
    const answerByVersion = new Map(
      definition.bank.map((item) => [item.itemVersion, item.correctAnswer]),
    );
    for (const item of opened.form.items.slice(0, 3)) {
      const correct = answerByVersion.get(item.itemVersion)!;
      const answer = item.position === 0
        ? item.options.find((option) => option !== correct)!
        : correct;
      await assessment.recordAttempt("learner", {
        protocolVersion: 1,
        idempotencyKey: `mock:attempt:${item.position}`,
        installationId: "installation",
        deviceId: "device",
        deviceSequence: item.position + 2,
        resetEpoch: 0,
        contentVersion: CONTENT_VERSION,
        sessionId: opened.sessionId,
        formHash: opened.formHash,
        itemId: item.itemId,
        itemVersion: item.itemVersion,
        occurredAt: opened.startedAt,
        response: { kind: "selection", answer },
      });
    }
    const historyRepository = new HskMockExamRepository(database);
    const resumed = await historyRepository.resume("learner", definition, now);
    expect(resumed).toMatchObject({
      expired: false,
      recorded: [{ position: 0 }, { position: 1 }, { position: 2 }],
    });
    expect(JSON.stringify(resumed)).not.toMatch(/outcome|correctAnswer|explanationVi/iu);

    for (const item of opened.form.items.slice(3)) {
      await assessment.recordAttempt("learner", {
        protocolVersion: 1,
        idempotencyKey: `mock:attempt:${item.position}`,
        installationId: "installation",
        deviceId: "device",
        deviceSequence: item.position + 2,
        resetEpoch: 0,
        contentVersion: CONTENT_VERSION,
        sessionId: opened.sessionId,
        formHash: opened.formHash,
        itemId: item.itemId,
        itemVersion: item.itemVersion,
        occurredAt: opened.startedAt,
        response: { kind: "selection", answer: answerByVersion.get(item.itemVersion)! },
      });
    }
    const command = {
      protocolVersion: 1 as const,
      idempotencyKey: "mock:hsk1:a:submit",
      installationId: "installation",
      deviceId: "device",
      deviceSequence: 100,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: opened.sessionId,
      formHash: opened.formHash,
    };
    const submitted = await assessment.submitSession("learner", command);
    expect(submitted).toMatchObject({ status: "submitted", masteryEligible: false });
    await expect(assessment.submitSession("learner", command)).resolves.toMatchObject({
      duplicate: true,
      sessionId: opened.sessionId,
    });
    const result = await historyRepository.result("learner", opened.sessionId);
    expect(result).toMatchObject({
      score: { correct: 11, answered: 12, total: 12, percent: 92 },
      masteryEligible: false,
      prerequisiteUnlockEligible: false,
      certificationEligible: false,
    });
    expect(result?.review).toHaveLength(12);
    expect(result?.recommendations[0]).toMatchObject({ wrongCount: 1 });
    expect(result?.recommendations[0]?.href).toMatch(/^\/lesson\//u);
    expect(await historyRepository.history("learner")).toEqual([result]);
    expect(database.sqlite.prepare("SELECT COUNT(*) AS count FROM learning_evidence").get())
      .toEqual({ count: 0 });
  });
});
