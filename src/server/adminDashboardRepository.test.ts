import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { AdminDashboardRepository } from "./adminDashboardRepository";

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
  constructor() { this.sqlite.exec(migrations); }
  prepare(query: string) { return new SQLiteStatement(this.sqlite.prepare(query), query); }
  async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]) {
    const results: Array<D1RunResult<T>> = [];
    for (const statement of statements) results.push(await statement.run<T>());
    return results;
  }
}

describe("administrative dashboard repository", () => {
  it("reports real accounts, usable sessions and seven-day server activity", async () => {
    const database = new SQLiteD1();
    const now = Date.UTC(2026, 7, 31, 3, 0, 0);
    const yesterday = now - 24 * 60 * 60 * 1_000;
    for (const [id, status, createdAt] of [
      ["admin", "active", yesterday],
      ["editor", "active", yesterday],
      ["learner", "active", now],
      ["locked", "locked", yesterday],
    ] as const) {
      database.sqlite.prepare(
        "INSERT INTO users (id, status, created_at, updated_at, locked_at, locked_by_user_id, lock_reason) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(
        id,
        status,
        createdAt,
        createdAt,
        status === "locked" ? createdAt : null,
        status === "locked" ? "admin" : null,
        status === "locked" ? "Kiểm thử" : null,
      );
    }
    database.sqlite.prepare(
      "INSERT INTO user_roles (user_id, role, granted_by_user_id, granted_at, updated_at) VALUES ('admin', 'admin', 'admin', ?, ?), ('editor', 'content_editor', 'admin', ?, ?)",
    ).run(now, now, now, now);
    database.sqlite.prepare(
      `INSERT INTO auth_sessions (
         id, user_id, token_hash, auth_method, authenticated_at, created_at,
         last_seen_at, expires_at, revoked_at
       ) VALUES
         ('active-session', 'admin', 'active-token', 'hanzi', ?, ?, ?, ?, NULL),
         ('expired-session', 'editor', 'expired-token', 'hanzi', ?, ?, ?, ?, NULL)`,
    ).run(now, now, now, now + 60_000, yesterday, yesterday, yesterday, yesterday + 60_000);
    database.sqlite.prepare(
      `INSERT INTO audit_events (
         id, category, action, outcome, actor_user_id, target_type, target_id,
         request_id, metadata_json, created_at
       ) VALUES ('signin', 'auth', 'auth.hanzi.signed_in', 'success', 'admin',
         'user', 'admin', 'request-signin', '{}', ?)`,
    ).run(now);

    // The dashboard reads the authoritative attempt ledger. Foreign-key-heavy
    // learning fixtures are intentionally bypassed here; all row checks remain active.
    database.sqlite.exec("PRAGMA foreign_keys = OFF");
    database.sqlite.prepare(
      `INSERT INTO learning_attempts (
         id, user_id, enrollment_id, idempotency_record_id, schema_version,
         content_version, activity_id, activity_version, source, method, skill,
         response_json, outcome, scoring_version, occurred_at, received_at
       ) VALUES ('attempt-1', 'learner', 'enrollment-1', 'idempotency-1', 1,
         'course-1', 'activity-1', '1', 'lesson', 'recall', 'vocabulary',
         '{}', 'correct', 'score-v1', ?, ?)`,
    ).run(now, now);

    const overview = await new AdminDashboardRepository(database).overview(now, 7);
    expect(overview).toMatchObject({
      accounts: { total: 4, active: 3, locked: 1, editors: 1, admins: 1, createdInRange: 4 },
      activeSessions: 1,
      activeLearners: 1,
      learningActions: 1,
    });
    expect(overview.activity).toHaveLength(7);
    expect(overview.activity.at(-1)).toMatchObject({
      signIns: 1,
      learningActions: 1,
      editorialActions: 0,
    });
  });
});
