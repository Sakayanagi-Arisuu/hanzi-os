import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { HanziPremiumConflict, HanziPremiumRepository } from "./hanziPremiumRepository";
import { HanziWalletRepository } from "./hanziWalletRepository";
import { premiumAccess } from "../commerce/policy";
import { asCommerceOrder } from "./hanziPremiumRepository";

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

describe("Premium bằng Ví Hanzi", () => {
  it("does not debit when an admin changes the price after the checkout read", async () => {
    const { db } = database();
    const premium = new HanziPremiumRepository(db, Date.UTC(2026, 8, 26));
    const wallet = new HanziWalletRepository(db, Date.UTC(2026, 8, 26));
    await premium.setPrice("hsk4-month", 80, "admin", "session", "price-race-000001");
    await wallet.adjustByAdmin("owner-a", 100, "admin", "session", "credit-race-00001");
    const readPrices = premium.prices.bind(premium);
    vi.spyOn(premium, "prices").mockImplementationOnce(async () => {
      const oldPrices = await readPrices();
      await db.prepare("UPDATE hanzi_plan_prices SET amount=90 WHERE plan_id='hsk4-month'").run();
      return oldPrices;
    });
    await expect(premium.purchase("owner-a", "hsk4-month", "purchase-race-0001", 80))
      .rejects.toThrow("Giá Hanzi đã thay đổi");
    expect((await wallet.forOwner("owner-a")).balance).toBe(100);
    expect(await premium.orders("owner-a")).toHaveLength(0);
    expect((await wallet.forOwner("owner-a")).entries.map(entry => entry.kind)).toEqual(["admin_credit"]);
    await premium.purchase("owner-a", "hsk4-month", "purchase-race-0002", 90);
    expect((await wallet.forOwner("owner-a")).balance).toBe(10);
  });
  it("requires admin price and sufficient balance, then pays once and grants only the owner", async () => {
    const { db } = database();
    const premium = new HanziPremiumRepository(db, Date.UTC(2026, 8, 26));
    const wallet = new HanziWalletRepository(db, Date.UTC(2026, 8, 26));
    await expect(premium.purchase("owner-a", "hsk4-month", "purchase-00000001", 80))
      .rejects.toBeInstanceOf(HanziPremiumConflict);
    await premium.setPrice("hsk4-month", 80, "admin", "session", "price-00000001");
    await expect(premium.purchase("owner-a", "hsk4-month", "purchase-00000001", 79))
      .rejects.toThrow("Giá Hanzi đã thay đổi");
    await expect(premium.purchase("owner-a", "hsk4-month", "purchase-00000001", 80))
      .rejects.toBeInstanceOf(HanziPremiumConflict);
    await wallet.adjustByAdmin("owner-a", 100, "admin", "session", "credit-000000001");
    const first = await premium.purchase("owner-a", "hsk4-month", "purchase-00000001", 80);
    expect((await premium.purchase("owner-a", "hsk4-month", "purchase-00000001", 80)).id).toBe(first.id);
    expect((await wallet.forOwner("owner-a")).balance).toBe(20);
    expect((await wallet.forOwner("owner-a")).entries.map(entry => entry.delta).sort((a, b) => a - b)).toEqual([-80, 100]);
    expect((await premium.orders("owner-b"))).toHaveLength(0);
    expect(premiumAccess((await premium.orders("owner-a")).map(asCommerceOrder), Date.UTC(2026, 8, 26)).active).toBe(true);
    await expect(premium.purchase("owner-a", "hsk4-year", "purchase-00000001", 80))
      .rejects.toBeInstanceOf(HanziPremiumConflict);
  });
  it("refunds into the wallet once and revokes the refunded entitlement", async () => {
    const { db, sqlite } = database();
    const now = Date.UTC(2026, 8, 26);
    const premium = new HanziPremiumRepository(db, now);
    const wallet = new HanziWalletRepository(db, now);
    await premium.setPrice("hsk4-month", 50, "admin", "session", "price-00000002");
    await wallet.adjustByAdmin("owner-a", 80, "admin", "session", "credit-000000002");
    const order = await premium.purchase("owner-a", "hsk4-month", "purchase-00000002", 50);
    await premium.requestRefund("owner-a", order.id, "Không còn nhu cầu học", "refund-request-0002");
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action='hanzi_premium_refund_requested'").get()).toMatchObject({ count: 1 });
    await expect(premium.requestRefund("owner-b", order.id, "Không còn nhu cầu học", "refund-request-0003"))
      .rejects.toBeInstanceOf(HanziPremiumConflict);
    await premium.refundWithAudit(order.id, "admin", "session", "refund-00000002");
    expect((await wallet.forOwner("owner-a")).balance).toBe(80);
    expect((await wallet.forOwner("owner-a")).entries.map(entry => entry.kind).sort()).toEqual(["admin_credit", "purchase", "refund"]);
    expect(premiumAccess((await premium.orders("owner-a")).map(asCommerceOrder), now).active).toBe(false);
    await expect(premium.refundWithAudit(order.id, "admin", "session", "refund-00000003"))
      .rejects.toBeInstanceOf(HanziPremiumConflict);
  });
  it("rolls back debit and order if audit cannot be written", async () => {
    const { db, sqlite } = database();
    const premium = new HanziPremiumRepository(db, 10);
    const wallet = new HanziWalletRepository(db, 10);
    await premium.setPrice("hsk4-month", 40, "admin", null, "price-00000003");
    await wallet.adjustByAdmin("owner-a", 50, "admin", null, "credit-000000003");
    sqlite.exec("CREATE TRIGGER reject_purchase_audit BEFORE INSERT ON audit_events WHEN NEW.action='hanzi_premium_purchase' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
    await expect(premium.purchase("owner-a", "hsk4-month", "purchase-00000003", 40))
      .rejects.toThrow("audit unavailable");
    expect((await wallet.forOwner("owner-a")).balance).toBe(50);
    expect((await premium.orders("owner-a"))).toHaveLength(0);
  });
  it("keeps a refund request out of the queue if its audit entry fails", async () => {
    const { db, sqlite } = database();
    const premium = new HanziPremiumRepository(db, 10);
    const wallet = new HanziWalletRepository(db, 10);
    await premium.setPrice("hsk4-month", 40, "admin", null, "price-refund-0001");
    await wallet.adjustByAdmin("owner-a", 50, "admin", null, "credit-refund-001");
    const order = await premium.purchase("owner-a", "hsk4-month", "purchase-refund-01", 40);
    sqlite.exec(`CREATE TRIGGER reject_refund_request_audit BEFORE INSERT ON audit_events
      WHEN NEW.action='hanzi_premium_refund_requested' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END`);
    await expect(premium.requestRefund("owner-a", order.id, "Không còn nhu cầu học", "refund-request-0004"))
      .rejects.toThrow("audit unavailable");
    expect((await premium.get("owner-a", order.id))?.refundRequestedAt).toBeNull();
    expect(await premium.pendingRefunds()).toHaveLength(0);
    expect((await wallet.forOwner("owner-a")).balance).toBe(10);
  });
  it("rejects one refund request with an audit trail while preserving Hanzi and Premium", async () => {
    const { db, sqlite } = database();
    const now = Date.UTC(2026, 8, 27);
    const premium = new HanziPremiumRepository(db, now);
    const wallet = new HanziWalletRepository(db, now);
    await premium.setPrice("hsk4-month", 40, "admin", "session", "price-reject-001");
    await wallet.adjustByAdmin("owner-a", 50, "admin", "session", "credit-reject-001");
    const order = await premium.purchase("owner-a", "hsk4-month", "purchase-reject-01", 40);
    await premium.requestRefund("owner-a", order.id, "Không còn nhu cầu học", "request-reject-001");
    expect(await premium.pendingRefunds()).toHaveLength(1);
    const rejected = await premium.rejectRefundWithAudit(order.id, "admin", "session", "Bài học vẫn hoạt động theo thời hạn gói.", "reject-refund-001");
    expect(rejected).toMatchObject({ status: "paid", refundRejectedBy: "admin", refundRejectionReason: "Bài học vẫn hoạt động theo thời hạn gói." });
    expect(await premium.pendingRefunds()).toHaveLength(0);
    expect((await wallet.forOwner("owner-a")).balance).toBe(10);
    expect(premiumAccess((await premium.orders("owner-a")).map(asCommerceOrder), now).active).toBe(true);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action='hanzi_premium_refund_rejected'").get()).toMatchObject({ count: 1 });
    await expect(premium.refundWithAudit(order.id, "admin", "session", "refund-after-reject"))
      .rejects.toBeInstanceOf(HanziPremiumConflict);
    await expect(premium.rejectRefundWithAudit(order.id, "admin", "session", "Lý do lần hai đủ dài", "reject-again-001"))
      .rejects.toBeInstanceOf(HanziPremiumConflict);
    await expect(premium.requestRefund("owner-a", order.id, "Một yêu cầu khác", "request-again-001"))
      .rejects.toBeInstanceOf(HanziPremiumConflict);
  });
  it("rolls back rejection when its audit entry fails", async () => {
    const { db, sqlite } = database();
    const premium = new HanziPremiumRepository(db, 10);
    const wallet = new HanziWalletRepository(db, 10);
    await premium.setPrice("hsk4-month", 40, "admin", null, "price-reject-002");
    await wallet.adjustByAdmin("owner-a", 50, "admin", null, "credit-reject-002");
    const order = await premium.purchase("owner-a", "hsk4-month", "purchase-reject-02", 40);
    await premium.requestRefund("owner-a", order.id, "Không còn nhu cầu học", "request-reject-002");
    sqlite.exec(`CREATE TRIGGER reject_refund_rejection_audit BEFORE INSERT ON audit_events
      WHEN NEW.action='hanzi_premium_refund_rejected' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END`);
    await expect(premium.rejectRefundWithAudit(order.id, "admin", null, "Đơn vẫn còn hiệu lực học tập", "reject-refund-002"))
      .rejects.toThrow("audit unavailable");
    expect((await premium.get("owner-a", order.id))?.refundRejectedAt).toBeNull();
    expect(await premium.pendingRefunds()).toHaveLength(1);
    expect((await wallet.forOwner("owner-a")).balance).toBe(10);
  });
});
