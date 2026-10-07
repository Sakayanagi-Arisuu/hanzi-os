import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { CommerceCustomerRepository } from "./commerceCustomerRepository";

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

function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  const now = Date.UTC(2026, 8, 27);
  sqlite.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY,status TEXT NOT NULL);
    CREATE TABLE profiles (user_id TEXT PRIMARY KEY,display_name TEXT NOT NULL);
    CREATE TABLE hanzi_password_credentials (user_id TEXT PRIMARY KEY,normalized_username TEXT UNIQUE NOT NULL);
    CREATE TABLE commerce_sandbox_orders (id TEXT PRIMARY KEY,user_id TEXT,plan_id TEXT,idempotency_key TEXT,status TEXT,created_at INTEGER,paid_at INTEGER,updated_at INTEGER,refund_requested_at INTEGER,refund_reason TEXT,refunded_by TEXT);
    CREATE TABLE hanzi_premium_orders (id TEXT PRIMARY KEY,user_id TEXT,plan_id TEXT,amount INTEGER,idempotency_key TEXT,status TEXT,paid_at INTEGER,refund_requested_at INTEGER,refund_reason TEXT,refunded_by TEXT,refund_rejected_at INTEGER,refund_rejected_by TEXT,refund_rejection_reason TEXT);
    CREATE TABLE hanzi_wallets (user_id TEXT PRIMARY KEY,balance INTEGER,updated_at INTEGER);
    CREATE TABLE hanzi_wallet_entries (id TEXT PRIMARY KEY,user_id TEXT,delta INTEGER,kind TEXT,reference_id TEXT,actor_user_id TEXT,created_at INTEGER);
    CREATE TABLE premium_support_tickets (id TEXT PRIMARY KEY,user_id TEXT,category TEXT,subject TEXT,message TEXT,status TEXT,response TEXT,responded_by TEXT,created_at INTEGER,updated_at INTEGER);
    INSERT INTO users VALUES ('alice-id','active'),('bob-id','active');
    INSERT INTO profiles VALUES ('alice-id','An'),('bob-id','Bình');
    INSERT INTO hanzi_password_credentials VALUES ('alice-id','alice.demo'),('bob-id','bob.demo');
    INSERT INTO hanzi_wallets VALUES ('alice-id',20,1),('bob-id',400,1);
    INSERT INTO hanzi_wallet_entries VALUES ('entry-a','alice-id',-80,'purchase','purchase:wallet-a',NULL,1),('entry-b','bob-id',400,'admin_credit','credit:bob','admin',1);
    INSERT INTO premium_support_tickets VALUES ('ticket-a','alice-id','billing','Hỏi về gói','Mô tả','open',NULL,NULL,1,1),('ticket-b','bob-id','technical','Lỗi','Mô tả','open',NULL,NULL,1,1);
  `);
  sqlite.prepare(`INSERT INTO commerce_sandbox_orders VALUES ('sandbox-a','alice-id','hsk4-month','sandbox-key','refunded',?,?,?,NULL,NULL,'admin')`)
    .run(now - 1000, now - 1000, now - 1000);
  sqlite.prepare(`INSERT INTO hanzi_premium_orders (id,user_id,plan_id,amount,idempotency_key,status,paid_at) VALUES ('wallet-a','alice-id','hsk4-month',80,'wallet-key','paid',?)`)
    .run(now);
  const database: D1Database = {
    prepare(query) { return new Statement(sqlite.prepare(query)); },
    async batch() { throw new Error("Read-only fixture"); },
  };
  return { database, now };
}

describe("commerce customer dossier", () => {
  it("finds an exact username or ID and combines only that owner's lifecycle", async () => {
    const { database, now } = fixture();
    const repository = new CommerceCustomerRepository(database, now);
    const alice = await repository.find("ALICE.DEMO");
    expect(alice).toMatchObject({ userId: "alice-id", username: "alice.demo", displayName: "An", status: "active" });
    expect(alice?.access.active).toBe(true);
    expect(alice?.orders.map(order => order.id)).toEqual(["hanzi:wallet-a", "sandbox-a"]);
    expect(alice?.wallet.balance).toBe(20);
    expect(alice?.wallet.entries.map(entry => entry.id)).toEqual(["entry-a"]);
    expect(alice?.tickets.map(ticket => ticket.id)).toEqual(["ticket-a"]);
    const bob = await repository.find("bob-id");
    expect(bob?.orders).toHaveLength(0);
    expect(bob?.wallet.balance).toBe(400);
    expect(bob?.tickets.map(ticket => ticket.id)).toEqual(["ticket-b"]);
    expect(await repository.find("alice")).toBeNull();
  });
});
