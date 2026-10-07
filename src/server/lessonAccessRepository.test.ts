import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { LESSON_BY_ID } from "../data/curriculum";
import { getHskLessonPathId } from "../data/hskCurriculumGraph";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { LessonAccessConflict, LessonAccessRepository } from "./lessonAccessRepository";

class Statement implements D1PreparedStatement {
  private values: (string | number | null)[] = [];
  constructor(private statement: StatementSync) {}
  bind(...values: unknown[]) { this.values = values as (string | number | null)[]; return this; }
  async first<T = Record<string, unknown>>(): Promise<T | null> { return (this.statement.get(...this.values) as T | undefined) ?? null; }
  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> { return { success: true, results: this.statement.all(...this.values) as T[] }; }
  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> { const result = this.statement.run(...this.values); return { success: true, meta: { changes: Number(result.changes) } }; }
}
function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`CREATE TABLE lesson_access_rules (lesson_id TEXT PRIMARY KEY,tier TEXT NOT NULL CHECK(tier IN ('free','premium')),updated_by TEXT NOT NULL,updated_at INTEGER NOT NULL);
    CREATE TABLE audit_events (id TEXT PRIMARY KEY,category TEXT NOT NULL,action TEXT NOT NULL,outcome TEXT NOT NULL,actor_user_id TEXT,actor_session_id TEXT,target_type TEXT NOT NULL,target_id TEXT,request_id TEXT NOT NULL,metadata_json TEXT NOT NULL,created_at INTEGER NOT NULL);`);
  const db: D1Database = {
    prepare(query) { return new Statement(sqlite.prepare(query)); },
    async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]) {
      sqlite.exec("BEGIN");
      try { const results = []; for (const statement of statements) results.push(await statement.run<T>()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  return { db, sqlite };
}
const hsk4 = [...LESSON_BY_ID.keys()].find(id => getHskLessonPathId(id) === "hsk4")!;
const hsk3 = [...LESSON_BY_ID.keys()].find(id => getHskLessonPathId(id) === "hsk3")!;

describe("quyền bài Thiên Lộ", () => {
  it("keeps HSK0–3 free and HSK4 premium by default, with audited HSK4 override", async () => {
    const { db } = database();
    const repo = new LessonAccessRepository(db, 10);
    expect(await repo.tierFor(hsk3)).toBe("free");
    expect(await repo.tierFor(hsk4)).toBe("premium");
    await expect(repo.setTier(hsk3, "premium", "admin", null, "request-1")).rejects.toBeInstanceOf(LessonAccessConflict);
    await repo.setTier(hsk4, "free", "admin", "session", "request-2");
    expect(await repo.tierFor(hsk4)).toBe("free");
    expect(await repo.freeHsk4LessonIds()).toEqual([hsk4]);
    await repo.setTier(hsk4, "premium", "admin", "session", "request-3");
    expect(await repo.tierFor(hsk4)).toBe("premium");
    expect((await db.prepare("SELECT id FROM audit_events").all()).results).toHaveLength(2);
  });
  it("rolls back the access change when audit fails", async () => {
    const { db, sqlite } = database();
    const repo = new LessonAccessRepository(db, 10);
    sqlite.exec("CREATE TRIGGER reject_access_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
    await expect(repo.setTier(hsk4, "free", "admin", null, "request-4")).rejects.toThrow("audit unavailable");
    expect(await repo.tierFor(hsk4)).toBe("premium");
  });
});
