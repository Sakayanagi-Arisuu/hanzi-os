import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { AnalyticsRepository } from "./analyticsRepository";
import type { D1Database } from "./d1";

const databases: DatabaseSync[] = [];
afterEach(() => { for (const db of databases.splice(0)) db.close(); });
function setup() {
  const db = new DatabaseSync(":memory:"); databases.push(db);
  db.exec(`CREATE TABLE learning_documents(user_id TEXT, document_json TEXT);
    CREATE TABLE learning_attempts(user_id TEXT, reset_epoch INTEGER, skill TEXT, activity_id TEXT, outcome TEXT, occurred_at INTEGER);
    CREATE TABLE learner_access_days(user_id TEXT, day TEXT, first_seen_at INTEGER, provenance TEXT, PRIMARY KEY(user_id,day));
    CREATE TABLE lesson_page_attempts(user_id TEXT,reset_epoch INTEGER,activity_id TEXT,outcome TEXT,created_at INTEGER);
    INSERT INTO learning_documents VALUES ('a','{"reset":{"epoch":1}}');
    INSERT INTO learning_attempts VALUES ('a',0,'vocabulary','old','correct',1789059600000),
      ('a',1,'vocabulary','one','correct',1789059600000), ('a',1,'vocabulary','one','incorrect',1789059600000),
      ('b',1,'vocabulary','other-user','correct',1789059600000);`);
  const adapter = { prepare(sql: string) { return { bind(...values: (string | number)[]) {
    return { first: async () => db.prepare(sql).get(...values) ?? null,
      all: async () => ({ success: true, results: db.prepare(sql).all(...values) }),
      run: async () => { db.prepare(sql).run(...values); return { success: true }; } };
  } }; } } as unknown as D1Database;
  return { db, repository: new AnalyticsRepository(adapter) };
}
describe("account analytics", () => {
  it('counts page practice in activity days without inventing skill mastery or including other owners/epochs',async()=>{
    const {repository,db}=setup();
    const insert=db.prepare('INSERT INTO lesson_page_attempts VALUES(?,?,?,?,?)');
    const time=Date.parse('2026-09-14T17:30:00Z');
    insert.run('a',1,'page-a','correct',time);insert.run('a',1,'page-a','incorrect',time);insert.run('a',1,'page-b','self-review',time);
    insert.run('a',0,'old','correct',time);insert.run('b',1,'other','correct',time);
    const result=await repository.read('a');
    expect(result.pagePractice).toEqual({attempts:3,unique:2,correct:1,incorrect:1,selfReview:1});
    expect(result.days.find(d=>d.day==='2026-09-15')?.count).toBe(3);
    expect(result.skills.vocabulary).toEqual({attempts:2,unique:1,correct:1});
    expect(result.skills.writing.attempts).toBe(0);
  });
  it("isolates owner and reset epoch, preserves unique item count across retries", async () => {
    const { repository, db } = setup();
    const result = await repository.read("a");
    expect(result.skills.vocabulary).toEqual({ attempts: 2, unique: 1, correct: 1 });
    expect(result.skills.speaking).toEqual({ attempts: 0, unique: 0, correct: 0 });
    expect(result.days.reduce((sum, day) => sum + day.count, 0)).toBe(2);
    db.prepare("INSERT INTO learning_attempts VALUES (?,?,?,?,?,?)").run("a", 1, "reading", "new-reading", "correct", 1789059600000);
    expect((await repository.read("a")).skills.reading).toEqual({ attempts: 1, unique: 1, correct: 1 });
  });
  it("counts a visit once per Vietnam day across sessions, preserves lifetime access on learning reset", async () => {
    const { repository, db } = setup();
    await repository.recordAccess("a", Date.parse("2026-09-10T16:59:00Z"));
    await repository.recordAccess("a", Date.parse("2026-09-10T16:59:59Z"));
    await repository.recordAccess("a", Date.parse("2026-09-10T17:00:00Z"));
    await repository.recordAccess("b", Date.parse("2026-09-10T17:00:00Z"));
    db.prepare("UPDATE learning_documents SET document_json=? WHERE user_id='a'").run('{"reset":{"epoch":2}}');
    const result = await repository.read("a");
    expect(result.accessDays).toEqual(["2026-09-10", "2026-09-11"]);
    expect(result.skills.vocabulary.attempts).toBe(0);
  });
});
