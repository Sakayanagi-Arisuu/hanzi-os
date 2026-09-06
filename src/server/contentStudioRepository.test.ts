import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { studioStarterContent } from "../content/studioContent";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import {
  ContentStudioConcurrencyError,
  ContentStudioRepository,
  ContentStudioTransitionError,
  type StudioRevision,
} from "./contentStudioRepository";
import {
  ContentReleaseWorker,
  ContentReleaseWorkerRepository,
} from "./contentReleaseWorker";
import { hskMockExamEditorialSuggestions } from "./hskMockExamBank";
import {
  loadPublishedEditorialHskMockExamDefinitions,
  resolveHskMockExamDefinitionByBlueprint,
} from "./hskMockExamEditorialRepository";

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
  ...studioStarterContent("lesson"),
  objectiveVi,
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
  it("keeps editorial ownership, reviewer and SLA changes append-only and concurrent-safe", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const now = Date.now();
    database.sqlite.prepare(
      "INSERT INTO user_roles (user_id, role, granted_by_user_id, granted_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("editor", "content_editor", "admin", now, now);
    database.sqlite.prepare(
      "INSERT INTO user_roles (user_id, role, granted_by_user_id, granted_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("admin", "admin", "admin", now, now);
    const repository = new ContentStudioRepository(database);
    const draft = await createDraft(repository);
    await expect(repository.assignmentsFor([draft])).resolves.toEqual([
      expect.objectContaining({
        revisionId: draft.id,
        ownerUserId: "editor",
        reviewerUserId: null,
        rowVersion: 0,
        isExplicit: false,
      }),
    ]);

    const assigned = await repository.setAssignment({
      actorUserId: "admin",
      actorSessionId: "admin-session",
      revisionId: draft.id,
      expectedRowVersion: 0,
      ownerUserId: "editor",
      reviewerUserId: "admin",
      priority: "urgent",
      dueAt: now - 60_000,
      note: "Ưu tiên rà độ chính xác trước hạn.",
      idempotencyKey: "assignment:greeting-01",
    });
    expect(assigned).toMatchObject({ rowVersion: 1, priority: "urgent", isExplicit: true });
    await expect(repository.setAssignment({
      actorUserId: "admin",
      actorSessionId: "admin-session",
      revisionId: draft.id,
      expectedRowVersion: 0,
      ownerUserId: "editor",
      reviewerUserId: "admin",
      priority: "urgent",
      dueAt: now - 60_000,
      note: "Ưu tiên rà độ chính xác trước hạn.",
      idempotencyKey: "assignment:greeting-01",
    })).resolves.toEqual(assigned);
    await expect(repository.setAssignment({
      actorUserId: "admin",
      actorSessionId: "admin-session",
      revisionId: draft.id,
      expectedRowVersion: 0,
      ownerUserId: "editor",
      reviewerUserId: "admin",
      priority: "high",
      dueAt: null,
      idempotencyKey: "assignment:stale-write",
    })).rejects.toBeInstanceOf(ContentStudioConcurrencyError);
    expect(() => database.sqlite.prepare(
      "UPDATE content_revision_assignment_events SET priority = 'low' WHERE id = ?",
    ).run(assigned.id)).toThrow(/immutable/u);
    const laterDraft = await repository.createDraft({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      itemType: "lesson",
      stableKey: "hsk1.lesson.later-normal",
      title: "Bản nháp mới hơn nhưng không khẩn",
      level: "hsk1",
      content: reviewedLesson(),
      idempotencyKey: "create:later-normal",
    });
    await expect(repository.coordinationQueue(2)).resolves.toEqual([
      expect.objectContaining({ id: draft.id }),
      expect.objectContaining({ id: laterDraft.id }),
    ]);
    await expect(repository.operationalSummary()).resolves.toMatchObject({
      assignment: { overdue: 1, dueSoon: 0, urgent: 1, withoutReviewer: 0 },
    });
    const validated = await repository.validateRevision({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      revisionId: draft.id,
      expectedRowVersion: draft.rowVersion,
      idempotencyKey: "validate:assigned-review",
    });
    const submitted = await repository.transition({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      revisionId: draft.id,
      expectedRowVersion: validated.rowVersion,
      toState: "submitted",
      idempotencyKey: "submit:assigned-review",
      requestId: "request:assigned-review",
    });
    await expect(repository.transition({
      actorUserId: "learner",
      actorSessionId: "other-admin-session",
      revisionId: draft.id,
      expectedRowVersion: submitted.rowVersion,
      toState: "draft",
      note: "Cần chỉnh sửa thêm ví dụ.",
      idempotencyKey: "changes:wrong-reviewer",
      requestId: "request:wrong-reviewer",
    })).rejects.toThrow("Điều Hành Viên khác");
    await expect(repository.transition({
      actorUserId: "admin",
      actorSessionId: "admin-session",
      revisionId: draft.id,
      expectedRowVersion: submitted.rowVersion,
      toState: "draft",
      note: "Cần chỉnh sửa thêm ví dụ.",
      idempotencyKey: "changes:assigned-reviewer",
      requestId: "request:assigned-reviewer",
    })).resolves.toMatchObject({ workflowState: "draft" });
  });

  it("summarizes the editorial and release queues for admin operations", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const repository = new ContentStudioRepository(database);
    await createDraft(repository);
    await expect(repository.operationalSummary()).resolves.toMatchObject({
      workflow: { draft: 1, validated: 0, submitted: 0, approved: 0, published: 0, archived: 0 },
      release: { pending: 0, processing: 0, published: 0, dead: 0, activePackages: 0 },
      byType: { lesson: { total: 1, published: 0 } },
      readerSeries: { total: 0, published: 0 },
      deadReleaseEvents: [],
    });
    await expect(repository.listReleaseFailurePage()).resolves.toEqual({
      events: [],
      filteredTotal: 0,
    });
  });

  it("searches and paginates a large Studio library without hiding matching revisions", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const repository = new ContentStudioRepository(database);
    for (let index = 1; index <= 5; index += 1) {
      await repository.createDraft({
        actorUserId: "editor",
        actorSessionId: "editor-session",
        itemType: "lesson",
        stableKey: `hsk1.lesson.alpha-${index}`,
        title: `Lộ trình Alpha ${index}`,
        level: "hsk1",
        content: reviewedLesson(`Mục tiêu Alpha ${index}.`),
        idempotencyKey: `create:alpha-${index}`,
      });
    }

    await expect(repository.count({ query: "alpha", level: "hsk1" })).resolves.toBe(5);
    await expect(repository.count({ query: "%" })).resolves.toBe(0);
    const firstPage = await repository.list({ query: "alpha", limit: 2, offset: 0 });
    const secondPage = await repository.list({ query: "alpha", limit: 2, offset: 2 });
    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(2);
    expect(new Set([...firstPage, ...secondPage].map((revision) => revision.id)).size).toBe(4);
    await expect(repository.coordinationQueuePage({ query: "alpha", limit: 2, offset: 2 })).resolves.toMatchObject({
      revisions: [expect.objectContaining({ title: expect.stringContaining("Alpha") }), expect.objectContaining({ title: expect.stringContaining("Alpha") })],
      filteredTotal: 5,
    });
    await expect(repository.coordinationQueuePage({ query: "%" })).resolves.toEqual({
      revisions: [],
      filteredTotal: 0,
    });
  });

  it("prevents self-approval and lets a separate reviewer request actionable changes", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const repository = new ContentStudioRepository(database);
    const draft = await createDraft(repository);
    const validated = await repository.validateRevision({
      actorUserId: "editor", actorSessionId: "editor-session",
      revisionId: draft.id, expectedRowVersion: draft.rowVersion,
      idempotencyKey: "validate:self-approval-fence",
    });
    const submitted = await repository.transition({
      actorUserId: "editor", actorSessionId: "editor-session",
      revisionId: draft.id, expectedRowVersion: validated.rowVersion,
      toState: "submitted", idempotencyKey: "submit:self-approval-fence",
      requestId: "request:self-approval-fence",
    });
    await expect(repository.transition({
      actorUserId: "editor", actorSessionId: "editor-session",
      revisionId: draft.id, expectedRowVersion: submitted.rowVersion,
      toState: "approved", idempotencyKey: "approve:self-approval-fence",
      requestId: "request:self-approval-rejected",
    })).rejects.toThrow("không thể tự phê duyệt");
    const returned = await repository.transition({
      actorUserId: "admin", actorSessionId: "admin-session",
      revisionId: draft.id, expectedRowVersion: submitted.rowVersion,
      toState: "draft", idempotencyKey: "changes:self-approval-fence",
      requestId: "request:changes-self-approval-fence",
      note: "Bổ sung một ví dụ đối chiếu trước khi gửi lại.",
    });
    expect(returned).toMatchObject({ workflowState: "draft", validation: null });
    await expect(repository.history(draft.itemId)).resolves.toMatchObject({
      events: expect.arrayContaining([
        expect.objectContaining({
          toState: "draft",
          metadata: expect.objectContaining({ note: "Bổ sung một ví dụ đối chiếu trước khi gửi lại." }),
        }),
      ]),
    });
  });

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

  it("projects a published Studio door into the learner catalog and immutable resume lookup", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const repository = new ContentStudioRepository(database);
    const content = studioStarterContent("exam_form", "hsk1") as Extract<
      ReturnType<typeof studioStarterContent>,
      { itemStableKeys: string[] }
    >;
    content.itemStableKeys = [...hskMockExamEditorialSuggestions().hsk1.g!];
    content.review.aiSelfReview = {
      accuracy: true,
      levelFit: true,
      pedagogy: true,
      answerIntegrity: true,
      originality: true,
    };
    const draft = await repository.createDraft({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      itemType: "exam_form",
      stableKey: "hsk1.mock.form-g",
      title: "Mô phỏng HSK1 · Cửa G",
      level: "hsk1",
      content,
      idempotencyKey: "create:hsk1-mock-form-g",
    });
    const validated = await repository.validateRevision({
      actorUserId: "editor", actorSessionId: "editor-session",
      revisionId: draft.id, expectedRowVersion: draft.rowVersion,
      idempotencyKey: "validate:hsk1-mock-form-g",
    });
    const submitted = await repository.transition({
      actorUserId: "editor", actorSessionId: "editor-session",
      revisionId: draft.id, expectedRowVersion: validated.rowVersion,
      toState: "submitted", idempotencyKey: "submit:hsk1-mock-form-g",
      requestId: "request-submit-hsk1-mock-form-g",
    });
    const approved = await repository.transition({
      actorUserId: "admin", actorSessionId: "admin-session",
      revisionId: draft.id, expectedRowVersion: submitted.rowVersion,
      toState: "approved", idempotencyKey: "approve:hsk1-mock-form-g",
      requestId: "request-approve-hsk1-mock-form-g",
    });
    await repository.transition({
      actorUserId: "admin", actorSessionId: "admin-session",
      revisionId: draft.id, expectedRowVersion: approved.rowVersion,
      toState: "published", idempotencyKey: "publish:hsk1-mock-form-g",
      requestId: "request-publish-hsk1-mock-form-g",
    });
    await drainReleases(database);

    const [definition] = await loadPublishedEditorialHskMockExamDefinitions(database);
    expect(definition).toMatchObject({
      examLevel: "hsk1",
      formKey: "g",
      blueprint: { itemCount: 40 },
    });
    await expect(resolveHskMockExamDefinitionByBlueprint(
      database,
      definition!.blueprint.id,
    )).resolves.toMatchObject({ formKey: "g", blueprint: { itemCount: 40 } });
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

  it("blocks two different published items from claiming the same Thiên Lộ lesson", async () => {
    const database = new SQLiteD1();
    addUsers(database);
    const repository = new ContentStudioRepository(database);
    const approve = async (revision: StudioRevision, key: string) => {
      const validated = await repository.validateRevision({
        actorUserId: "editor",
        actorSessionId: "editor-session",
        revisionId: revision.id,
        expectedRowVersion: revision.rowVersion,
        idempotencyKey: `validate:${key}`,
      });
      const submitted = await repository.transition({
        actorUserId: "editor",
        actorSessionId: "editor-session",
        revisionId: revision.id,
        expectedRowVersion: validated.rowVersion,
        toState: "submitted",
        idempotencyKey: `submit:${key}`,
        requestId: `request-submit-${key}`,
      });
      return repository.transition({
        actorUserId: "admin",
        actorSessionId: "admin-session",
        revisionId: revision.id,
        expectedRowVersion: submitted.rowVersion,
        toState: "approved",
        idempotencyKey: `approve:${key}`,
        requestId: `request-approve-${key}`,
      });
    };

    const firstApproved = await approve(await createDraft(repository), "lesson-target-a");
    await repository.transition({
      actorUserId: "admin",
      actorSessionId: "admin-session",
      revisionId: firstApproved.id,
      expectedRowVersion: firstApproved.rowVersion,
      toState: "published",
      idempotencyKey: "publish:lesson-target-a",
      requestId: "request-publish-lesson-target-a",
    });

    const second = await repository.createDraft({
      actorUserId: "editor",
      actorSessionId: "editor-session",
      itemType: "lesson",
      stableKey: "hsk1.lesson.greeting-alternate",
      title: "Bản chào hỏi thay thế",
      level: "hsk1",
      content: reviewedLesson("Giới thiệu bản thân bằng một bản biên soạn khác."),
      idempotencyKey: "create:lesson-target-b",
    });
    const secondApproved = await approve(second, "lesson-target-b");
    await expect(repository.transition({
      actorUserId: "admin",
      actorSessionId: "admin-session",
      revisionId: secondApproved.id,
      expectedRowVersion: secondApproved.rowVersion,
      toState: "published",
      idempotencyKey: "publish:lesson-target-b",
      requestId: "request-publish-lesson-target-b",
    })).rejects.toThrow(/đang có một bản phát hành khác/u);
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
