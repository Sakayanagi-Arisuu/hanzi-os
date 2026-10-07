import { DatabaseSync, type StatementSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { PremiumVndPriceRepository } from "./premiumVndPriceRepository";
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
    CREATE TABLE hanzi_wallets (user_id TEXT PRIMARY KEY REFERENCES users(id), balance INTEGER NOT NULL DEFAULT 0 CHECK(balance BETWEEN 0 AND 1000000000), updated_at INTEGER NOT NULL);
    CREATE TABLE hanzi_wallet_entries (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), delta INTEGER NOT NULL, kind TEXT NOT NULL, reference_id TEXT NOT NULL, actor_user_id TEXT, created_at INTEGER NOT NULL, UNIQUE(user_id,reference_id));
    CREATE TABLE hanzi_plan_prices (plan_id TEXT PRIMARY KEY,amount INTEGER NOT NULL,updated_by TEXT NOT NULL,updated_at INTEGER NOT NULL);
    CREATE TABLE hanzi_premium_orders (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),plan_id TEXT NOT NULL,amount INTEGER NOT NULL,idempotency_key TEXT NOT NULL,status TEXT NOT NULL,paid_at INTEGER NOT NULL,refund_requested_at INTEGER,refund_reason TEXT,refunded_by TEXT,refund_rejected_at INTEGER,refund_rejected_by TEXT,refund_rejection_reason TEXT,UNIQUE(user_id,idempotency_key));
    CREATE TABLE audit_events (id TEXT PRIMARY KEY,category TEXT NOT NULL,action TEXT NOT NULL,outcome TEXT NOT NULL,actor_user_id TEXT,actor_session_id TEXT,target_type TEXT NOT NULL,target_id TEXT,request_id TEXT NOT NULL,metadata_json TEXT NOT NULL,created_at INTEGER NOT NULL);`);
  sqlite.exec(readFileSync("drizzle/0034_premium_vnd_prices.sql", "utf8"));
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


describe("VNĐ display catalog", () => {
  it("seeds both periods and persists audited edits independently of Hanzi", async () => {
    const { db, sqlite } = database();
    const prices = new PremiumVndPriceRepository(db, 123);
    expect(await prices.prices()).toEqual([{ planId: "hsk4-month", amount: 79000 }, { planId: "hsk4-year", amount: 699000 }]);
    sqlite.exec("INSERT INTO hanzi_plan_prices VALUES ('hsk4-month',1000,'admin',1); INSERT INTO hanzi_wallets VALUES ('owner-a',1400,1)");
    await prices.setPrice("hsk4-month", 89000, "admin", "session", "request");
    expect((await new PremiumVndPriceRepository(db).prices())[0].amount).toBe(89000);
    expect(sqlite.prepare("SELECT amount FROM hanzi_plan_prices").get()).toMatchObject({ amount: 1000 });
    expect(sqlite.prepare("SELECT balance FROM hanzi_wallets").get()).toMatchObject({ balance: 1400 });
    expect(sqlite.prepare("SELECT action,metadata_json FROM audit_events").get()).toMatchObject({ action: "premium_vnd_price", metadata_json: '{"amount":89000}' });
    sqlite.close();
  });
  it("rejects invalid amounts and rolls price back when audit persistence fails", async () => {
    const { db, sqlite } = database();
    const prices = new PremiumVndPriceRepository(db);
    for (const amount of [0, -1, 1.5, NaN, 100000001]) await expect(prices.setPrice("hsk4-year", amount, "admin", null, "bad")).rejects.toThrow();
    sqlite.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'audit unavailable'); END;");
    await expect(prices.setPrice("hsk4-year", 800000, "admin", null, "bad")).rejects.toThrow();
    expect((await prices.prices())[1].amount).toBe(699000);
    sqlite.close();
  });
});
