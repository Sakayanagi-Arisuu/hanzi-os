import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { studioStarterContent } from "../content/studioContent";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import {
  ContentStudioConcurrencyError,
  ContentStudioRepository,
  ContentStudioTransitionError,
} from "./contentStudioRepository";
import {
  ContentReleaseWorker,
  ContentReleaseWorkerRepository,
} from "./contentReleaseWorker";

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

const reviewedLesson = (objectiveVi = "Giới thiệu bản thân bằng câu ngắn.") => ({
  objectiveVi,
  prerequisites: [],
  vocabulary: ["你好", "我", "是"],
  dialogue: [
    { hanzi: "你好！", pinyin: "Nǐ hǎo!", meaningVi: "Xin chào!" },
    { hanzi: "你好，我是安。", pinyin: "Nǐ hǎo, wǒ shì Ān.", meaningVi: "Xin chào, tôi là An." },
  ],
  grammar: [{ pattern: "A 是 B", explanationVi: "Dùng để giới thiệu danh tính." }],
  exercises: [{
    promptVi: "Chọn câu giới thiệu đúng.",
    distractors: ["我很好吗？", "你是学生吗？"],
    answer: "我是学生。",
    explanationVi: "我是学生 dùng 是 để giới thiệu danh tính.",
  }],
  review: {
    humanReviewed: false,
    aiSelfReview: {
      accuracy: true,
      levelFit: true,
      pedagogy: true,
      answerIntegrity: true,
      originality: true,
    },
  },
});

const addUsers = (database: SQLiteD1) => {
  const now = Date.now();
  for (const userId of ["editor", "admin", "learner"]) {
    database.sqlite.prepare(
      "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
    ).run(userId, now, now);
  }
};

const createDraft = (repository: ContentStudioRepository) => repository.createDraft({
  actorUserId: "editor",
  actorSessionId: "editor-session",
  itemType: "lesson",
  stableKey: "hsk1.lesson.greeting-01",
  title: "Chào hỏi và giới thiệu",
  level: "hsk1",
  content: reviewedLesson(),
  idempotencyKey: "create:greeting-01",
});

const drainReleases = (database: SQLiteD1) => new ContentReleaseWorker(
  new ContentReleaseWorkerRepository(database),
).drain();

describe("governed Content Studio revisions", () => {
  it("persists exam forms through the D1 item-type boundary", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const repository = new ContentStudioRepository(database);
    await expect(repository.createDraft({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      itemType: "exam_form",
      stableKey: "hsk1.mock.form-a",
      title: "HSK1 mock form A",
      level: "hsk1",
      content: studioStarterContent("exam_form"),
      idempotencyKey: "create:hsk1-mock-form-a",
    })).resolves.toMatchObject({
      itemType: "exam_form",
      stableKey: "hsk1.mock.form-a",
      workflowState: "draft",
    });
  });

  it("keeps a failed five-pass or answer check in draft", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const repository = new ContentStudioRepository(database);
    const draft = await repository.createDraft({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      itemType: "exam_item",
      stableKey: "hsk1.exam.invalid-01",
      title: "Câu hỏi chưa hoàn chỉnh",
      level: "hsk1",
      content: {
        skill: "reading",
        promptVi: "Chọn đáp án.",
        hanzi: "你好",
        options: ["Xin chào"],
        answerIndex: 0,
        review: { humanReviewed: false, aiSelfReview: {} },
      },
      idempotencyKey: "create:invalid-exam-01",
    });
    const checked = await repository.validateRevision({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      revisionId: draft.id,
      expectedRowVersion: 1,
      idempotencyKey: "validate:invalid-exam-01",
    });
    expect(checked.workflowState).toBe("draft");
    expect(checked.validation).toMatchObject({ valid: false });
    expect(checked.validation?.errors.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["review.aiSelfReview", "options"]),
    );
    await expect(repository.publishedRuntime()).resolves.toMatchObject({ items: [] });
  });

  it("runs editor -> admin -> learner while drafts remain invisible", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const repository = new ContentStudioRepository(database);
    const draft = await createDraft(repository);

    expect(draft.workflowState).toBe("draft");
    await expect(repository.publishedRuntime()).resolves.toMatchObject({ items: [] });

    const validated = await repository.validateRevision({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      revisionId: draft.id,
      expectedRowVersion: 1,
      idempotencyKey: "validate:greeting-01",
    });
    expect(validated.workflowState).toBe("validated");
    expect(validated.validation).toMatchObject({ valid: true, contentSha256: draft.contentSha256 });
    await expect(repository.validateRevision({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      revisionId: draft.id,
      expectedRowVersion: 1,
      idempotencyKey: "validate:greeting-01",
    })).resolves.toMatchObject({ id: draft.id, workflowState: "validated" });

    const submitted = await repository.transition({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      revisionId: draft.id,
      expectedRowVersion: 2,
      toState: "submitted",
      idempotencyKey: "submit:greeting-01",
      requestId: "request-submit-greeting",
    });
    const approved = await repository.transition({
      actorUserId: "admin",
      actorSessionId: "admin-session",
      revisionId: draft.id,
      expectedRowVersion: submitted.rowVersion,
      toState: "approved",
      idempotencyKey: "approve:greeting-01",
      requestId: "request-approve-greeting",
    });
    await expect(repository.publishedRuntime()).resolves.toMatchObject({ items: [] });
    const published = await repository.transition({
      actorUserId: "admin",
      actorSessionId: "admin-session",
      revisionId: draft.id,
      expectedRowVersion: approved.rowVersion,
      toState: "published",
      idempotencyKey: "publish:greeting-01",
      requestId: "request-publish-greeting",
    });
    expect(published.workflowState).toBe("published");
    await expect(repository.publishedRuntime()).resolves.toMatchObject({ items: [] });
    await drainReleases(database);
    await expect(repository.publishedRuntime()).resolves.toMatchObject({
      policy: "published-only",
      manifestSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      items: [expect.objectContaining({
        stableKey: "hsk1.lesson.greeting-01",
        revision: 1,
        contentSha256: published.contentSha256,
      })],
    });
    expect(database.sqlite.prepare(
      "SELECT category, action FROM audit_events ORDER BY created_at, id",
    ).all()).toEqual(expect.arrayContaining([
      { category: "approval", action: "content.revision.approved" },
      { category: "publication", action: "content.revision.published" },
    ]));
  });

  it("rejects stale edits and invalid workflow jumps", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const repository = new ContentStudioRepository(database);
    const draft = await createDraft(repository);
    const updated = await repository.updateDraft({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      revisionId: draft.id,
      expectedRowVersion: 1,
      title: draft.title,
      level: "hsk1",
      content: reviewedLesson("Chào hỏi và nêu tên rõ ràng."),
      idempotencyKey: "update:greeting-01",
    });
    expect(updated.rowVersion).toBe(2);
    await expect(repository.updateDraft({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      revisionId: draft.id,
      expectedRowVersion: 1,
      title: draft.title,
      level: "hsk1",
      content: reviewedLesson("Ghi đè cũ."),
      idempotencyKey: "update:greeting-stale",
    })).rejects.toBeInstanceOf(ContentStudioConcurrencyError);
    await expect(repository.transition({
      actorUserId: "admin",
      actorSessionId: "admin-session",
      revisionId: draft.id,
      expectedRowVersion: 2,
      toState: "published",
      idempotencyKey: "publish:greeting-invalid",
      requestId: "request-invalid-jump",
    })).rejects.toBeInstanceOf(ContentStudioTransitionError);
  });

  it("keeps published payload immutable and forks edits into a new revision", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const repository = new ContentStudioRepository(database);
    const draft = await createDraft(repository);
    const validated = await repository.validateRevision({
      actorUserId: "editor", actorSessionId: "editor-session", revisionId: draft.id,
      expectedRowVersion: 1, idempotencyKey: "validate:greeting-immutable",
    });
    const submitted = await repository.transition({
      actorUserId: "editor", actorSessionId: "editor-session", revisionId: draft.id,
      expectedRowVersion: validated.rowVersion, toState: "submitted",
      idempotencyKey: "submit:greeting-immutable", requestId: "request-submit-immutable",
    });
    const approved = await repository.transition({
      actorUserId: "admin", actorSessionId: "admin-session", revisionId: draft.id,
      expectedRowVersion: submitted.rowVersion, toState: "approved",
      idempotencyKey: "approve:greeting-immutable", requestId: "request-approve-immutable",
    });
    const published = await repository.transition({
      actorUserId: "admin", actorSessionId: "admin-session", revisionId: draft.id,
      expectedRowVersion: approved.rowVersion, toState: "published",
      idempotencyKey: "publish:greeting-immutable", requestId: "request-publish-immutable",
    });
    await drainReleases(database);

    expect(() => database.sqlite.prepare(
      "UPDATE content_revisions SET title = 'tampered' WHERE id = ?",
    ).run(published.id)).toThrow(/immutable/u);
    expect(() => database.sqlite.prepare(
      "UPDATE content_workflow_events SET metadata_json = '{}' WHERE revision_id = ?",
    ).run(published.id)).toThrow(/append-only/u);

    const manifestBeforeFork = await repository.publishedRuntime();
    const fork = await repository.forkRevision({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      sourceRevisionId: published.id,
      idempotencyKey: "fork:greeting-02",
    });
    expect(fork).toMatchObject({
      revision: 2,
      workflowState: "draft",
      basedOnRevisionId: published.id,
      contentSha256: published.contentSha256,
    });
    const runtime = await repository.publishedRuntime();
    expect(runtime.items).toHaveLength(1);
    expect(runtime.items[0]?.revision).toBe(1);
    expect(runtime.manifestSha256).toBe(manifestBeforeFork.manifestSha256);
  });
});
