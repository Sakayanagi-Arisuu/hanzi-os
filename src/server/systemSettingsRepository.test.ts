import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import {
  SettingConcurrencyError,
  SystemSettingsRepository,
} from "./systemSettingsRepository";

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
    if (/^\s*SELECT\b/iu.test(this.query)) return this.all<T>();
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

describe("allowlisted system settings", () => {
  it("stores only a validated key, rejects stale writes, and emits audit", async () => {
    const database = new SQLiteD1();
    const timestamp = Date.now();
    database.sqlite.prepare(
      "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
    ).run("admin", timestamp, timestamp);
    const settings = new SystemSettingsRepository(database);

    await expect(settings.list()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "maintenance_banner", value: "", revision: 0 }),
    ]));
    await expect(settings.update({
      actorUserId: "admin",
      actorSessionId: "session-admin",
      key: "maintenance_banner",
      value: "Bảo trì cục bộ lúc 22:00",
      expectedRevision: 0,
      requestId: "request-setting-1",
    })).resolves.toMatchObject({
      key: "maintenance_banner",
      value: "Bảo trì cục bộ lúc 22:00",
      revision: 1,
    });
    await expect(settings.update({
      actorUserId: "admin",
      actorSessionId: "session-admin",
      key: "maintenance_banner",
      value: "Ghi đè cũ",
      expectedRevision: 0,
      requestId: "request-setting-stale",
    })).rejects.toBeInstanceOf(SettingConcurrencyError);
    expect(database.sqlite.prepare(
      "SELECT COUNT(*) AS count FROM audit_events WHERE category = 'config'",
    ).get()).toEqual({ count: 1 });
  });

  it("rejects secret-shaped or unknown keys at the database boundary", () => {
    const database = new SQLiteD1();
    expect(() => database.sqlite.prepare(
      "INSERT INTO system_settings (key, value_json, revision, created_at, updated_at) VALUES (?, ?, 1, 1, 1)",
    ).run("oauth_client_secret", JSON.stringify("never"))).toThrow(/CHECK constraint/u);
  });
});
