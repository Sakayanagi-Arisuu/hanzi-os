import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  private transactionTail: Promise<void> = Promise.resolve();
  constructor() {
    this.sqlite.exec("PRAGMA foreign_keys = ON");
    this.sqlite.exec(migration);
  }
  prepare(sql: string) { return new Statement(this.sqlite.prepare(sql), sql); }
  async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]) {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>(resolve => { release = resolve; });
    // D1 serializes atomic batches. Queue the in-memory SQLite adapter likewise.
    await previous;
    this.sqlite.exec("BEGIN");
    try {
      const results: Array<D1RunResult<T>> = [];
      for (const statement of statements) results.push(await statement.run<T>());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    } finally { release(); }
  }
}

import { LevelRewardRepository } from "./levelRewardRepository";
import { HanziPremiumRepository } from "./hanziPremiumRepository";
const now = Date.parse("2026-10-06T12:00:00Z");
function setup(totalXp = 1500, resetEpoch = 0) {
  const database = new Database();
  database.sqlite.exec("INSERT INTO users (id,status,created_at,updated_at) VALUES ('user-a','active',1,1),('user-b','active',1,1)");
  const spy = vi.spyOn(InteractionXpRepository.prototype, "read").mockResolvedValue({
    protocolVersion: 2, resetEpoch, totalXp, dailyXp: 0, rewardedLessonCount: 0,
    rewardedReviewCount: 0, pronunciationRewardCount: 0, lessonRewards: [],
  });
  return { database, spy, repo: new LevelRewardRepository(database, now) };
}
afterEach(() => vi.restoreAllMocks());
describe("level rewards into the existing wallet", () => {
  it("grants completed levels once, including historical levels, with owner isolation", async () => {
    const { database, repo } = setup();
    expect(await repo.read("user-a")).toMatchObject({ level: 4, pendingCoins: 300, balance: 0 });
    expect(await repo.claim("user-a")).toMatchObject({ pendingCoins: 0, balance: 300 });
    expect(await repo.claim("user-a")).toMatchObject({ pendingCoins: 0, balance: 300 });
    expect(await repo.read("user-b")).toMatchObject({ balance: 0, pendingCoins: 300 });
    expect(database.sqlite.prepare("SELECT count(*) AS n FROM hanzi_wallet_entries").get()).toEqual({ n: 3 });
  });
  it("does not reward level one or an incomplete threshold", async () => {
    const { repo } = setup(499);
    expect(await repo.claim("user-a")).toMatchObject({ level: 1, pendingCoins: 0, balance: 0, xpToNext: 1 });
  });
  it("deduplicates overlapping claim requests", async () => {
    const { repo } = setup(1000);
    await Promise.all([repo.claim("user-a"), repo.claim("user-a")]);
    expect(await repo.read("user-a")).toMatchObject({ balance: 200, pendingCoins: 0 });
  });
  it("does not replay paid levels after XP falls and is earned again", async () => {
    const { repo, spy } = setup(1000);
    await repo.claim("user-a");
    const base = await spy.mock.results[0].value;
    spy.mockResolvedValue({ ...base, totalXp: 0 });
    expect(await repo.read("user-a")).toMatchObject({ balance: 200, pendingCoins: 0 });
    spy.mockResolvedValue({ ...base, totalXp: 1000 });
    expect(await repo.claim("user-a")).toMatchObject({ balance: 200, pendingCoins: 0 });
  });
  it("fences a stale reset and never credits a wallet without a ledger entry", async () => {
    const { database, repo } = setup(500, 1);
    // Canonical document absent means epoch zero, so the stale projection cannot pay.
    await repo.claim("user-a");
    expect(database.sqlite.prepare("SELECT balance FROM hanzi_wallets WHERE user_id='user-a'").get()).toEqual({ balance: 0 });
    expect(database.sqlite.prepare("SELECT count(*) AS n FROM hanzi_wallet_entries").get()).toEqual({ n: 0 });
  });
  it("rolls back the balance if writing its reward history fails", async () => {
    const { database, repo } = setup(500);
    database.sqlite.exec("CREATE TRIGGER reject_reward BEFORE INSERT ON hanzi_wallet_entries BEGIN SELECT RAISE(ABORT, 'fixture'); END");
    await expect(repo.claim("user-a")).rejects.toThrow();
    expect(database.sqlite.prepare("SELECT balance FROM hanzi_wallets WHERE user_id='user-a'").get()).toBeUndefined();
  });
  it("spends earned coins on a full monthly Premium plan and replays safely", async () => {
    const { database, repo } = setup(1500);
    await repo.claim("user-a");
    database.sqlite.exec("UPDATE hanzi_plan_prices SET amount=200 WHERE plan_id='hsk4-month'");
    const premium = new HanziPremiumRepository(database, now);
    const order = await premium.purchase("user-a", "hsk4-month", "monthly-reward-test-001", 200);
    expect(order.status).toBe("paid");
    expect((await premium.purchase("user-a", "hsk4-month", "monthly-reward-test-001", 200)).id).toBe(order.id);
    expect(await repo.read("user-a")).toMatchObject({ balance: 100, pendingCoins: 0 });
  });
  it("preserves all old ledger rows and the uniqueness fence during migration", () => {
    const sqlite = new DatabaseSync(":memory:");
    const files = readdirSync(migrationDirectory).filter(file => /^\d+.*\.sql$/.test(file)).sort();
    for (const file of files.filter(file => !file.startsWith("0033_"))) sqlite.exec(readFileSync(new URL(file,migrationDirectory),"utf8"));
    sqlite.exec("INSERT INTO users (id,status,created_at,updated_at) VALUES ('keep','active',1,1); INSERT INTO hanzi_wallets VALUES ('keep',75,1); INSERT INTO hanzi_wallet_entries VALUES ('old','keep',75,'admin_credit','old-reference','keep',1)");
    const before = sqlite.prepare("SELECT * FROM hanzi_wallet_entries").all();
    sqlite.exec("INSERT INTO hanzi_plan_prices VALUES ('hsk4-month',777,'keep',1)");
    sqlite.exec(readFileSync(new URL("0033_level_reward_coins.sql",migrationDirectory),"utf8"));
    expect(sqlite.prepare("SELECT * FROM hanzi_wallet_entries").all()).toEqual(before);
    expect(sqlite.prepare("SELECT balance FROM hanzi_wallets").get()).toEqual({ balance: 75 });
    expect(() => sqlite.exec("INSERT INTO hanzi_wallet_entries VALUES ('duplicate','keep',75,'level_reward','old-reference',NULL,1)")).toThrow();
    expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(sqlite.prepare("SELECT amount FROM hanzi_plan_prices WHERE plan_id='hsk4-month'").get()).toEqual({ amount: 777 });
  });
});
