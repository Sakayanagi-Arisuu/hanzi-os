import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import type {
  AbandonReaderSessionCommandV1,
} from "../reader/readerAbandonmentProtocol";
import type {
  RecordReaderAttemptCommandV1,
} from "../reader/readerAttemptProtocol";
import type {
  OpenReaderSessionCommandV1,
  OpenReaderSessionReceiptV1,
} from "../reader/readerSessionProtocol";
import type {
  SubmitReaderSessionCommandV1,
} from "../reader/readerSubmissionProtocol";
import {
  CURRENT_AUTHORITATIVE_READER_STORIES,
  READER_SUPPORT_POLICY_VERSION,
  selectAuthoritativeReaderForm,
  type AuthoritativeReaderStory,
} from "./authoritativeReaderItemBank";
import type { ContentReleasePolicy } from "./contentReleasePolicy";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import { LearningResetEpochConflictError } from "./learningResetEpoch";
import {
  ReaderAttemptConflictError,
  ReaderContentUnavailableError,
  ReaderDeviceSequenceConflictError,
  ReaderFormUnavailableError,
  ReaderIdempotencyConflictError,
  ReaderRepository,
  ReaderSessionUnavailableError,
  ReaderSubmissionIncompleteError,
} from "./readerRepository";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migrations = readdirSync(migrationDirectory)
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n");

class SQLiteStatement implements D1PreparedStatement {
  private parameters: unknown[] = [];

  constructor(
    private readonly statement: StatementSync,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]) {
    this.parameters = values;
    return this;
  }

  private sqliteParameters() {
    return this.parameters as Array<
      string | number | bigint | Uint8Array | null
    >;
  }

  async first<T = Record<string, unknown>>(
    columnName?: string,
  ): Promise<T | null> {
    const row = this.statement.get(...this.sqliteParameters()) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    return {
      success: true,
      results: this.statement.all(...this.sqliteParameters()) as T[],
    };
  }

  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    if (/^\s*SELECT\b/iu.test(this.query)) {
      return {
        success: true,
        results: this.statement.all(...this.sqliteParameters()) as T[],
      };
    }
    const result = this.statement.run(...this.sqliteParameters());
    return {
      success: true,
      meta: {
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }
}

class SQLiteD1 implements D1Database {
  readonly database = new DatabaseSync(":memory:");
  beforeNextBatch: (() => void | Promise<void>) | null = null;

  constructor() {
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec(migrations);
  }

  prepare(query: string) {
    return new SQLiteStatement(this.database.prepare(query), query);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
    const beforeBatch = this.beforeNextBatch;
    this.beforeNextBatch = null;
    await beforeBatch?.();
    this.database.exec("BEGIN");
    try {
      const results: Array<D1RunResult<T>> = [];
      for (const statement of statements) {
        results.push(await statement.run<T>());
      }
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const NOW = Date.parse("2026-07-26T05:00:00.000Z");
const promotedPolicy: ContentReleasePolicy = {
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: "closed-alpha",
  lifecycle: "published",
  closedAlphaEligible: true,
  productionEligible: false,
  promotionChannel: "closed-alpha",
  promotionManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
};
const unpromotedPolicy: ContentReleasePolicy = {
  ...promotedPolicy,
  lifecycle: "candidate",
  closedAlphaEligible: false,
  promotionChannel: null,
  promotionManifestSha256: null,
};

const approvedBank = (): readonly AuthoritativeReaderStory[] => [{
  id: "fixture-story",
  storyVersion: `${CONTENT_VERSION}:reader-story:fixture:1`,
  formVersion: `${CONTENT_VERSION}:reader-form:fixture:1`,
  contentVersion: CONTENT_VERSION,
  releaseState: "beta",
  reviewStatus: "approved",
  script: "simplified",
  supportPolicyVersion: READER_SUPPORT_POLICY_VERSION,
  items: [
    {
      id: "fixture-main-idea",
      itemVersion: `${CONTENT_VERSION}:reader-item:fixture-main-idea:1`,
      contentVersion: CONTENT_VERSION,
      exposureGroupId: "reader-fixture-exposure:main",
      equivalentGroupId: "reader-fixture-equivalent:main",
      reviewStatus: "approved",
      answerExposure: "server-confidential",
      chineseStimulus: "小明今天第一次去中文课。",
      prompt: "Hom nay Tieu Minh di dau?",
      options: ["Lop tieng Trung", "Nha ga", "Thu vien"],
      correctAnswer: "Lop tieng Trung",
    },
    {
      id: "fixture-detail",
      itemVersion: `${CONTENT_VERSION}:reader-item:fixture-detail:1`,
      contentVersion: CONTENT_VERSION,
      exposureGroupId: "reader-fixture-exposure:detail",
      equivalentGroupId: "reader-fixture-equivalent:detail",
      reviewStatus: "approved",
      answerExposure: "server-confidential",
      chineseStimulus: "老师给小明一本书，小明说谢谢。",
      prompt: "Giao vien dua cho Tieu Minh vat gi?",
      options: ["Mot quyen sach", "Mot coc tra", "Mot chiec but"],
      correctAnswer: "Mot quyen sach",
    },
  ],
}];

const seedUser = (
  database: SQLiteD1,
  userId: string,
  script: "simplified" | "traditional" = "simplified",
) => {
  database.database.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
  ).run(userId, NOW, NOW);
  database.database.prepare(
    "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES (?, 'Reader', 'conversation', 20, ?, 'zero', 1, 1, ?, ?)",
  ).run(userId, script, NOW, NOW);
  database.database.prepare(
    "INSERT OR IGNORE INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, 'beta', 'approved', ?)",
  ).run(CONTENT_VERSION, CURRENT_CONTENT_MANIFEST_SHA256, NOW);
  database.database.prepare(
    "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES (?, ?, ?, 'conversation', 'active', 1, ?, ?)",
  ).run(
    `${userId}-enrollment`,
    userId,
    CONTENT_VERSION,
    NOW,
    NOW,
  );
};

const repository = (
  database: SQLiteD1,
  options: {
    bank?: readonly AuthoritativeReaderStory[];
    publicationPolicy?: ContentReleasePolicy;
  } = {},
) => new ReaderRepository(database, {
  bank: options.bank ?? approvedBank(),
  publicationPolicy: options.publicationPolicy ?? promotedPolicy,
  now: () => NOW,
});

const openCommand = (
  userId = "user-a",
  overrides: Partial<OpenReaderSessionCommandV1> = {},
): OpenReaderSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: `${userId}:reader-open:1`,
  installationId: `${userId}-installation`,
  deviceId: `${userId}-device`,
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  enrollmentId: `${userId}-enrollment`,
  storyId: "fixture-story",
  script: "simplified",
  supportMode: "unassisted",
  ...overrides,
});

const answerFor = (
  itemVersion: string,
  bank = approvedBank(),
) => bank.flatMap((story) => story.items)
  .find((item) => item.itemVersion === itemVersion)!.correctAnswer;

const attemptCommand = (
  opened: OpenReaderSessionReceiptV1,
  position: number,
  overrides: Partial<RecordReaderAttemptCommandV1> = {},
): RecordReaderAttemptCommandV1 => {
  const item = opened.form.items[position]!;
  return {
    protocolVersion: 1,
    idempotencyKey: `reader-attempt:${position}`,
    installationId: "user-a-installation",
    deviceId: "user-a-device",
    deviceSequence: position + 2,
    resetEpoch: opened.resetEpoch,
    contentVersion: CONTENT_VERSION,
    sessionId: opened.sessionId,
    formHash: opened.formHash,
    itemId: item.itemId,
    itemVersion: item.itemVersion,
    position,
    selectedOption: answerFor(item.itemVersion),
    occurredAt: opened.startedAt,
    ...overrides,
  };
};

const submitCommand = (
  opened: OpenReaderSessionReceiptV1,
  overrides: Partial<SubmitReaderSessionCommandV1> = {},
): SubmitReaderSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "reader-submit:1",
  installationId: "user-a-installation",
  deviceId: "user-a-device",
  deviceSequence: 20,
  resetEpoch: opened.resetEpoch,
  contentVersion: CONTENT_VERSION,
  sessionId: opened.sessionId,
  formHash: opened.formHash,
  expectedItemCount: opened.expectedItemCount,
  ...overrides,
});

const abandonCommand = (
  opened: OpenReaderSessionReceiptV1,
  overrides: Partial<AbandonReaderSessionCommandV1> = {},
): AbandonReaderSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "reader-abandon:1",
  installationId: "user-a-installation",
  deviceId: "user-a-device",
  deviceSequence: 20,
  resetEpoch: opened.resetEpoch,
  contentVersion: CONTENT_VERSION,
  sessionId: opened.sessionId,
  formHash: opened.formHash,
  reason: "user-exit",
  ...overrides,
});

const graphCounts = (database: SQLiteD1) => ({
  sessions: database.database.prepare(
    "SELECT COUNT(*) AS count FROM reader_sessions",
  ).get() as { count: number },
  exposures: database.database.prepare(
    "SELECT COUNT(*) AS count FROM reader_item_exposures",
  ).get() as { count: number },
  attempts: database.database.prepare(
    "SELECT COUNT(*) AS count FROM learning_attempts WHERE source = 'reader'",
  ).get() as { count: number },
  evidence: database.database.prepare(
    "SELECT COUNT(*) AS count FROM learning_evidence WHERE source = 'reader'",
  ).get() as { count: number },
  joins: database.database.prepare(
    "SELECT COUNT(*) AS count FROM reader_session_attempts",
  ).get() as { count: number },
  xp: database.database.prepare(
    "SELECT COUNT(*) AS count FROM xp_ledger",
  ).get() as { count: number },
});

describe("server-authoritative Reader bank", () => {
  it("keeps every current candidate pending/public-client and unissuable", () => {
    expect(CURRENT_AUTHORITATIVE_READER_STORIES.every(
      (story) => story.reviewStatus === "pending",
    )).toBe(true);
    expect(CURRENT_AUTHORITATIVE_READER_STORIES.flatMap(
      (story) => story.items,
    ).every((item) =>
      item.reviewStatus === "pending"
      && item.answerExposure === "public-client"
    )).toBe(true);
    expect(selectAuthoritativeReaderForm({
      bank: CURRENT_AUTHORITATIVE_READER_STORIES,
      storyId: "first-day",
      script: "simplified",
      supportMode: "unassisted",
      exposedGroups: new Set(),
      exposedEquivalentGroups: new Set(),
    })).toMatchObject({
      kind: "unavailable",
      reason: "story-not-issuable",
    });
  });
});

describe("authenticated Reader repository", () => {
  it("fails closed for an unpromoted package and for the current pending bank", async () => {
    const unpromoted = new SQLiteD1();
    seedUser(unpromoted, "user-a");
    await expect(repository(unpromoted, {
      publicationPolicy: unpromotedPolicy,
    }).openSession("user-a", openCommand()))
      .rejects.toBeInstanceOf(ReaderContentUnavailableError);

    const pending = new SQLiteD1();
    seedUser(pending, "user-a");
    await expect(repository(pending, {
      bank: CURRENT_AUTHORITATIVE_READER_STORIES,
    }).openSession("user-a", openCommand("user-a", {
      storyId: "first-day",
    }))).rejects.toBeInstanceOf(ReaderFormUnavailableError);

    expect(graphCounts(unpromoted)).toMatchObject({
      sessions: { count: 0 },
      exposures: { count: 0 },
      attempts: { count: 0 },
      evidence: { count: 0 },
      joins: { count: 0 },
      xp: { count: 0 },
    });
    expect(graphCounts(pending).sessions.count).toBe(0);
  });

  it("opens one answer-free immutable form, claims exposure, and replays exactly", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const readers = repository(database);
    const command = openCommand();
    const opened = await readers.openSession("user-a", command);

    expect(opened).toMatchObject({
      duplicate: false,
      storyId: "fixture-story",
      script: "simplified",
      supportMode: "unassisted",
      expectedItemCount: 2,
      status: "started",
    });
    expect(opened.form.items.map((item) => item.position)).toEqual([0, 1]);
    expect(opened.form.items.every((item) =>
      item.answerExposure === "server-confidential"
      && item.priorExposure === false
      && item.masteryEligible
    )).toBe(true);
    expect(JSON.stringify(opened.form)).not.toMatch(
      /correctAnswer|answerKey|explanation/iu,
    );
    expect(graphCounts(database)).toMatchObject({
      sessions: { count: 1 },
      exposures: { count: 2 },
      attempts: { count: 0 },
      evidence: { count: 0 },
      joins: { count: 0 },
      xp: { count: 0 },
    });
    const startedEvent = database.database.prepare(
      "SELECT aggregate_id AS aggregateId, payload_json AS payloadJson FROM outbox_events WHERE event_type = 'reader.started'",
    ).get() as { aggregateId: string; payloadJson: string };
    expect(startedEvent.aggregateId).toBe(opened.sessionId);
    expect(startedEvent.payloadJson).not.toMatch(
      /correctAnswer|answerKey|selectedOption|options|chineseStimulus/iu,
    );
    expect(database.database.prepare(
      "SELECT entity_type AS entityType, entity_id AS entityId, revision FROM sync_changes",
    ).get()).toEqual({
      entityType: "reader_session",
      entityId: opened.sessionId,
      revision: 1,
    });

    await expect(readers.openSession("user-a", command)).resolves.toMatchObject({
      ...opened,
      duplicate: true,
    });
    await expect(readers.openSession("user-a", {
      ...command,
      supportMode: "assisted",
    })).rejects.toBeInstanceOf(ReaderIdempotencyConflictError);
  });

  it("scores one exact first response into reading-only evidence without XP", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const readers = repository(database);
    const opened = await readers.openSession("user-a", openCommand());
    const command = attemptCommand(opened, 0);
    const recorded = await readers.recordAttempt("user-a", command);

    expect(recorded).toMatchObject({
      duplicate: false,
      sessionId: opened.sessionId,
      position: 0,
      method: "reading-comprehension",
      skill: "reading",
      answerExposure: "server-confidential",
      priorExposure: false,
      masteryEligible: true,
      outcome: "correct",
      score: 100,
      verification: "server-objective",
    });
    expect(database.database.prepare(
      `SELECT attempt.session_id AS lessonSessionId, attempt.source,
              attempt.method, attempt.skill, attempt.outcome, attempt.score,
              evidence.session_id AS evidenceLessonSessionId,
              evidence.verified, evidence.mastery_eligible AS masteryEligible
       FROM learning_attempts attempt
       INNER JOIN learning_evidence evidence
         ON evidence.attempt_id = attempt.id
       WHERE attempt.id = ?`,
    ).get(recorded.attemptId)).toEqual({
      lessonSessionId: null,
      source: "reader",
      method: "reading-comprehension",
      skill: "reading",
      outcome: "correct",
      score: 100,
      evidenceLessonSessionId: null,
      verified: 1,
      masteryEligible: 1,
    });
    expect(graphCounts(database)).toMatchObject({
      attempts: { count: 1 },
      evidence: { count: 1 },
      joins: { count: 1 },
      xp: { count: 0 },
    });
    const attemptEvent = database.database.prepare(
      "SELECT payload_json AS payloadJson FROM outbox_events WHERE event_type = 'reader.attempt.recorded'",
    ).get() as { payloadJson: string };
    expect(attemptEvent.payloadJson).not.toContain(command.selectedOption);
    expect(attemptEvent.payloadJson).not.toMatch(
      /correctAnswer|answerKey|selectedOption/iu,
    );
    await expect(readers.recordAttempt("user-a", command)).resolves
      .toMatchObject({ ...recorded, duplicate: true });
    await expect(readers.recordAttempt("user-a", {
      ...command,
      idempotencyKey: "reader-attempt:second-write",
      deviceSequence: 9,
    })).rejects.toBeInstanceOf(ReaderAttemptConflictError);
    expect(graphCounts(database).attempts.count).toBe(1);
  });

  it("keeps assisted objective evidence mastery-ineligible", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const readers = repository(database);
    const opened = await readers.openSession(
      "user-a",
      openCommand("user-a", { supportMode: "assisted" }),
    );
    expect(opened.form.items.every((item) => !item.masteryEligible)).toBe(true);

    const recorded = await readers.recordAttempt(
      "user-a",
      attemptCommand(opened, 0),
    );
    expect(recorded).toMatchObject({
      supportMode: "assisted",
      outcome: "correct",
      masteryEligible: false,
    });
    expect(database.database.prepare(
      "SELECT mastery_eligible AS masteryEligible FROM learning_evidence WHERE id = ?",
    ).get(recorded.evidenceId)).toEqual({ masteryEligible: 0 });
  });

  it("requires every dense item once and terminalizes with re-scored results", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const readers = repository(database);
    const opened = await readers.openSession("user-a", openCommand());
    await readers.recordAttempt(
      "user-a",
      attemptCommand(opened, 0),
    );
    await expect(readers.submitSession("user-a", submitCommand(opened)))
      .rejects.toBeInstanceOf(ReaderSubmissionIncompleteError);

    const incorrectOption = opened.form.items[1]!.options.find((option) =>
      option !== answerFor(opened.form.items[1]!.itemVersion)
    )!;
    await readers.recordAttempt(
      "user-a",
      attemptCommand(opened, 1, {
        selectedOption: incorrectOption,
      }),
    );
    const submitted = await readers.submitSession(
      "user-a",
      submitCommand(opened),
    );
    expect(submitted).toMatchObject({
      duplicate: false,
      attemptCount: 2,
      correctCount: 1,
      score: 50,
      method: "reading-comprehension",
      skill: "reading",
      status: "submitted",
    });
    expect(submitted.results).toEqual([
      expect.objectContaining({ position: 0, correct: true }),
      expect.objectContaining({ position: 1, correct: false }),
    ]);
    expect(database.database.prepare(
      "SELECT status, correct_count AS correctCount, terminal_reason AS terminalReason FROM reader_sessions WHERE id = ?",
    ).get(opened.sessionId)).toEqual({
      status: "submitted",
      correctCount: 1,
      terminalReason: "completed",
    });
    await expect(readers.submitSession(
      "user-a",
      submitCommand(opened),
    )).resolves.toMatchObject({ ...submitted, duplicate: true });
    await expect(readers.recordAttempt("user-a", {
      ...attemptCommand(opened, 1),
      idempotencyKey: "reader-attempt:after-submit",
      deviceSequence: 30,
    })).rejects.toBeInstanceOf(ReaderSessionUnavailableError);
    expect(graphCounts(database).xp.count).toBe(0);
  });

  it("abandons only the exact tenant/session/form/reason and downgrades support without fresh exposure", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    seedUser(database, "user-b");
    const readers = repository(database);
    const opened = await readers.openSession("user-a", openCommand());

    await expect(readers.recordAttempt("user-b", {
      ...attemptCommand(opened, 0),
      idempotencyKey: "user-b:reader-attempt",
      installationId: "user-b-installation",
      deviceId: "user-b-device",
      deviceSequence: 1,
    })).rejects.toBeInstanceOf(ReaderSessionUnavailableError);
    const command = abandonCommand(opened, {
      reason: "support-requested",
    });
    const abandoned = await readers.abandonSession("user-a", command);
    expect(abandoned).toMatchObject({
      duplicate: false,
      reason: "support-requested",
      status: "abandoned",
    });
    expect(database.database.prepare(
      "SELECT status, terminal_reason AS terminalReason FROM reader_sessions WHERE id = ?",
    ).get(opened.sessionId)).toEqual({
      status: "abandoned",
      terminalReason: "support-requested",
    });
    await expect(readers.abandonSession("user-a", command)).resolves
      .toMatchObject({ ...abandoned, duplicate: true });
    await expect(readers.abandonSession("user-a", {
      ...command,
      reason: "superseded",
    })).rejects.toBeInstanceOf(ReaderIdempotencyConflictError);
    await expect(readers.openSession("user-a", openCommand("user-a", {
      idempotencyKey: "reader-open:unassisted-after-exposure",
      deviceSequence: 40,
    }))).rejects.toBeInstanceOf(ReaderFormUnavailableError);
    const assisted = await readers.openSession("user-a", openCommand(
      "user-a",
      {
        idempotencyKey: "reader-open:assisted-after-support",
        deviceSequence: 41,
        supportMode: "assisted",
      },
    ));
    expect(assisted).toMatchObject({
      duplicate: false,
      storyId: opened.storyId,
      supportMode: "assisted",
      status: "started",
    });
    expect(assisted.form.items.every((item) =>
      item.priorExposure && !item.masteryEligible
    )).toBe(true);
    const assistedAttempt = await readers.recordAttempt(
      "user-a",
      attemptCommand(assisted, 0, {
        idempotencyKey: "reader-attempt:assisted-after-support",
        deviceSequence: 42,
      }),
    );
    expect(assistedAttempt).toMatchObject({
      supportMode: "assisted",
      priorExposure: true,
      masteryEligible: false,
    });
    expect(graphCounts(database)).toMatchObject({
      sessions: { count: 2 },
      exposures: { count: 2 },
      attempts: { count: 1 },
      evidence: { count: 1 },
      joins: { count: 1 },
      xp: { count: 0 },
    });
  });

  it("rejects a tampered stored form even when its row metadata is unchanged", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const readers = repository(database);
    const opened = await readers.openSession("user-a", openCommand());
    const tampered = {
      ...opened.form,
      items: opened.form.items.map((item, position) => position === 0
        ? { ...item, correctAnswer: answerFor(item.itemVersion) }
        : item),
    };
    database.database.prepare(
      "UPDATE reader_sessions SET form_manifest_json = ? WHERE id = ?",
    ).run(JSON.stringify(tampered), opened.sessionId);

    await expect(readers.recordAttempt(
      "user-a",
      attemptCommand(opened, 0),
    )).rejects.toBeInstanceOf(ReaderSessionUnavailableError);
    expect(graphCounts(database).attempts.count).toBe(0);
  });

  it("classifies reset before sequence and sequence before context", async () => {
    const stale = new SQLiteD1();
    seedUser(stale, "user-a");
    const staleReaders = repository(stale);
    const opened = await staleReaders.openSession("user-a", openCommand());
    stale.database.prepare(
      "INSERT INTO learning_documents (user_id, revision, document_json, schema_version, content_version, updated_at) VALUES (?, 1, ?, 1, ?, ?)",
    ).run(
      "user-a",
      JSON.stringify({ reset: { epoch: 1 } }),
      CONTENT_VERSION,
      NOW,
    );
    await expect(staleReaders.recordAttempt("user-a", {
      ...attemptCommand(opened, 0),
      sessionId: "missing-session",
      deviceSequence: 1,
    })).rejects.toBeInstanceOf(LearningResetEpochConflictError);

    const sequence = new SQLiteD1();
    seedUser(sequence, "user-a");
    const sequenceReaders = repository(sequence);
    const sequenceOpened = await sequenceReaders.openSession(
      "user-a",
      openCommand(),
    );
    await expect(sequenceReaders.recordAttempt("user-a", {
      ...attemptCommand(sequenceOpened, 0),
      idempotencyKey: "reader-attempt:sequence-before-context",
      sessionId: "missing-session",
      deviceSequence: 1,
    })).rejects.toBeInstanceOf(ReaderDeviceSequenceConflictError);
    expect(graphCounts(sequence).attempts.count).toBe(0);
  });

  it("rolls back a mid-batch reset and allows only one concurrent open winner", async () => {
    const resetRace = new SQLiteD1();
    seedUser(resetRace, "user-a");
    resetRace.beforeNextBatch = () => {
      resetRace.database.prepare(
        "INSERT INTO learning_documents (user_id, revision, document_json, schema_version, content_version, updated_at) VALUES (?, 1, ?, 1, ?, ?)",
      ).run(
        "user-a",
        JSON.stringify({ reset: { epoch: 1 } }),
        CONTENT_VERSION,
        NOW,
      );
    };
    await expect(repository(resetRace).openSession(
      "user-a",
      openCommand(),
    )).rejects.toBeInstanceOf(LearningResetEpochConflictError);
    expect(graphCounts(resetRace)).toMatchObject({
      sessions: { count: 0 },
      exposures: { count: 0 },
      attempts: { count: 0 },
      evidence: { count: 0 },
      joins: { count: 0 },
      xp: { count: 0 },
    });

    const concurrent = new SQLiteD1();
    seedUser(concurrent, "user-a");
    const readers = repository(concurrent);
    let winner: OpenReaderSessionReceiptV1 | undefined;
    concurrent.beforeNextBatch = async () => {
      winner = await readers.openSession("user-a", openCommand("user-a", {
        idempotencyKey: "reader-open:winner",
        installationId: "user-a-winner-installation",
        deviceId: "user-a-winner-device",
        deviceSequence: 2,
      }));
    };
    await expect(readers.openSession("user-a", openCommand("user-a", {
      idempotencyKey: "reader-open:loser",
    }))).rejects.toBeInstanceOf(ReaderFormUnavailableError);
    expect(winner).toMatchObject({ duplicate: false, status: "started" });
    expect(graphCounts(concurrent)).toMatchObject({
      sessions: { count: 1 },
      exposures: { count: 2 },
      attempts: { count: 0 },
      evidence: { count: 0 },
      joins: { count: 0 },
      xp: { count: 0 },
    });
  });
});
