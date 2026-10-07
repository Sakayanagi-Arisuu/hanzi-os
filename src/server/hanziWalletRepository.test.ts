import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { HanziWalletConflict, HanziWalletRepository } from "./hanziWalletRepository";

class Statement implements D1PreparedStatement {
  private values: (string | number | null)[] = [];
  constructor(private statement: StatementSync) {}
  bind(...values: unknown[]) { this.values = values as (string | number | null)[]; return this; }
  async first<T = Record<string, unknown>>(): Promise<T | null> { return (this.statement.get(...this.values) as T | undefined) ?? null; }
  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> { return { success: true, results: this.statement.all(...this.values) as T[] }; }
  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    const result = this.statement.run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}
function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE users (id TEXT PRIMARY KEY);
    INSERT INTO users VALUES ('owner-a'),('owner-b');
    CREATE TABLE hanzi_wallets (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, balance INTEGER NOT NULL DEFAULT 0 CHECK(balance BETWEEN 0 AND 1000000000), updated_at INTEGER NOT NULL);
    CREATE TABLE hanzi_wallet_entries (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, delta INTEGER NOT NULL, kind TEXT NOT NULL, reference_id TEXT NOT NULL, actor_user_id TEXT, created_at INTEGER NOT NULL, UNIQUE(user_id,reference_id));
    CREATE TABLE audit_events (id TEXT PRIMARY KEY, category TEXT NOT NULL, action TEXT NOT NULL, outcome TEXT NOT NULL, actor_user_id TEXT, actor_session_id TEXT, target_type TEXT NOT NULL, target_id TEXT, request_id TEXT NOT NULL, metadata_json TEXT NOT NULL, created_at INTEGER NOT NULL);`);
  const db: D1Database = {
    prepare(query) { return new Statement(sqlite.prepare(query)); },
    async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run<T>());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  return { db, sqlite };
}

describe("Ví Hanzi", () => {
  it("records credit, debit, owner isolation and idempotent replay", async () => {
    const { db } = database();
    const wallet = new HanziWalletRepository(db, 10);
    expect((await wallet.forOwner("owner-a")).balance).toBe(0);
    await wallet.adjustByAdmin("owner-a", 100, "admin", "session", "reference-00000001");
    await wallet.adjustByAdmin("owner-a", 100, "admin", "session", "reference-00000001");
    await wallet.adjustByAdmin("owner-a", -40, "admin", "session", "reference-00000002");
    expect((await wallet.forOwner("owner-a")).balance).toBe(60);
    expect((await wallet.forOwner("owner-a")).entries).toHaveLength(2);
    expect((await wallet.forOwner("owner-b")).balance).toBe(0);
    expect((await db.prepare("SELECT id FROM audit_events").all()).results).toHaveLength(2);
    await expect(wallet.adjustByAdmin("owner-a", 200, "admin", "session", "reference-00000001"))
      .rejects.toBeInstanceOf(HanziWalletConflict);
  });
  it("never creates a debit entry when balance is insufficient", async () => {
    const { db } = database();
    const wallet = new HanziWalletRepository(db, 10);
    await expect(wallet.adjustByAdmin("owner-a", -1, "admin", null, "reference-00000003"))
      .rejects.toBeInstanceOf(HanziWalletConflict);
    expect((await wallet.forOwner("owner-a")).entries).toHaveLength(0);
  });
  it("rolls the balance and entry back when audit fails", async () => {
    const { db, sqlite } = database();
    const wallet = new HanziWalletRepository(db, 10);
    sqlite.exec("CREATE TRIGGER reject_wallet_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END");
    await expect(wallet.adjustByAdmin("owner-a", 20, "admin", null, "reference-00000004"))
      .rejects.toThrow("audit unavailable");
    expect((await wallet.forOwner("owner-a")).balance).toBe(0);
    expect((await wallet.forOwner("owner-a")).entries).toHaveLength(0);
  });
});
