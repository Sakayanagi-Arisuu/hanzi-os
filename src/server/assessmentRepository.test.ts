import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type {
  AbandonAssessmentSessionCommandV1,
} from "../assessment/assessmentAbandonmentProtocol";
import type {
  RecordAssessmentAttemptCommandV1,
} from "../assessment/assessmentAttemptProtocol";
import {
  hashAssessmentForm,
  type AssessmentFormV1,
  type OpenAssessmentSessionCommandV1,
  type OpenAssessmentSessionReceiptV1,
} from "../assessment/assessmentSessionProtocol";
import type {
  SubmitAssessmentSessionCommandV1,
} from "../assessment/assessmentSubmissionProtocol";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS,
  type AuthoritativeAssessmentItem,
} from "./authoritativeAssessmentItemBank";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import { LearningResetEpochConflictError } from "./learningResetEpoch";
import {
  AssessmentAttemptConflictError,
  AssessmentContentUnavailableError,
  AssessmentFormUnavailableError,
  AssessmentIdempotencyConflictError,
  AssessmentRepository,
  AssessmentSessionUnavailableError,
  AssessmentSubmissionIncompleteError,
} from "./assessmentRepository";
import type { ContentReleasePolicy } from "./contentReleasePolicy";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migration = readdirSync(migrationDirectory)
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

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
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

  constructor() {
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec(migration);
  }

  prepare(query: string) {
    return new SQLiteStatement(this.database.prepare(query), query);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
    this.database.exec("BEGIN");
    try {
      const results: Array<D1RunResult<T>> = [];
      for (const statement of statements) results.push(await statement.run<T>());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const fixtureTime = Date.parse("2026-07-22T03:00:00.000Z");
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
  promotionChannel: null,
  promotionManifestSha256: null,
  closedAlphaEligible: false,
};

const approvedBank = () => CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS.map(
  (item, index): AuthoritativeAssessmentItem => ({
    ...item,
    id: `server-fixture-${index}`,
    itemVersion: `${CONTENT_VERSION}:server-fixture:${index}:1`,
    equivalentGroupId: `server-fixture-equivalent:${index}`,
    exposureGroupId: `server-fixture-exposure:${index}`,
    reviewStatus: "approved",
    answerExposure: "server-confidential",
    prompt: `Fixture prompt ${index}`,
    meta: `Fixture meta ${index}`,
    options: [`fixture-${index}-a`, `fixture-${index}-b`],
    correctAnswer: `fixture-${index}-a`,
    ...(item.modality === "synthetic-tts-selection"
      ? { stimulusText: `fixture-audio-${index}` }
      : {}),
  }),
);

const repository = (
  database: SQLiteD1,
  bank: readonly AuthoritativeAssessmentItem[] = approvedBank(),
  publicationPolicy = promotedPolicy,
) => new AssessmentRepository(database, {
  bank,
  publicationPolicy,
  randomSource: () => 0.5,
  now: () => fixtureTime,
});

const seedUser = (database: SQLiteD1, userId: string) => {
  database.database.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
  ).run(userId, fixtureTime, fixtureTime);
  database.database.prepare(
    "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES (?, 'Learner', 'conversation', 20, 'simplified', 'zero', 1, 1, ?, ?)",
  ).run(userId, fixtureTime, fixtureTime);
  database.database.prepare(
    "INSERT OR IGNORE INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, 'beta', 'approved', ?)",
  ).run(CONTENT_VERSION, CURRENT_CONTENT_MANIFEST_SHA256, fixtureTime);
  database.database.prepare(
    "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES (?, ?, ?, 'conversation', 'active', 1, ?, ?)",
  ).run(
    `${userId}-enrollment`,
    userId,
    CONTENT_VERSION,
    fixtureTime,
    fixtureTime,
  );
};

const openCommand = (
  userId = "user-a",
  overrides: Partial<OpenAssessmentSessionCommandV1> = {},
): OpenAssessmentSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: `${userId}:assessment-open:1`,
  installationId: `${userId}-installation`,
  deviceId: `${userId}-device`,
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  enrollmentId: `${userId}-enrollment`,
  ...overrides,
});

const attemptCommand = (
  receipt: OpenAssessmentSessionReceiptV1,
  item = receipt.form.items[0]!,
  overrides: Partial<RecordAssessmentAttemptCommandV1> = {},
): RecordAssessmentAttemptCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: `assessment-attempt:${item.position}`,
  installationId: "user-a-installation",
  deviceId: "user-a-device",
  deviceSequence: item.position + 2,
  resetEpoch: receipt.resetEpoch,
  contentVersion: CONTENT_VERSION,
  sessionId: receipt.sessionId,
  formHash: receipt.formHash,
  itemId: item.itemId,
  itemVersion: item.itemVersion,
  occurredAt: receipt.startedAt,
  response: { kind: "selection", answer: item.options[0]! },
  ...overrides,
});

const answerFor = (
  bank: readonly AuthoritativeAssessmentItem[],
  itemVersion: string,
) => bank.find((item) => item.itemVersion === itemVersion)!.correctAnswer;

const completeSession = async (
  database: SQLiteD1,
  bank: readonly AuthoritativeAssessmentItem[],
) => {
  const assessment = repository(database, bank);
  const opened = await assessment.openSession("user-a", openCommand());
  for (const item of opened.form.items) {
    await assessment.recordAttempt(
      "user-a",
      attemptCommand(opened, item, {
        response: {
          kind: "selection",
          answer: answerFor(bank, item.itemVersion),
        },
      }),
    );
  }
  return { assessment, opened };
};

describe("authenticated assessment repository", () => {
  it("fails closed for the unpromoted package and the real pending bank", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    await expect(repository(database, approvedBank(), unpromotedPolicy)
      .openSession("user-a", openCommand()))
      .rejects.toBeInstanceOf(AssessmentContentUnavailableError);
    await expect(repository(database, CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS)
      .openSession("user-a", openCommand("user-a", {
        idempotencyKey: "pending-bank-open",
      })))
      .rejects.toBeInstanceOf(AssessmentFormUnavailableError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM assessment_sessions",
    ).get()).toEqual({ count: 0 });
  });

  it("rejects a malformed answer-free form before any session or exposure commit", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const malformed = approvedBank().map((item, index) => index === 0
      ? { ...item, options: ["é", " e\u0301 "], correctAnswer: "é" }
      : item);
    await expect(repository(database, malformed).openSession(
      "user-a",
      openCommand(),
    )).rejects.toBeInstanceOf(AssessmentFormUnavailableError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM assessment_sessions",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM assessment_item_exposures",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM idempotency_records",
    ).get()).toEqual({ count: 0 });
  });

  it("atomically freezes an answer-free form and durable exposure history", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const bank = approvedBank();
    const assessment = repository(database, bank);
    const opened = await assessment.openSession("user-a", openCommand());
    expect(opened).toMatchObject({
      duplicate: false,
      enrollmentId: "user-a-enrollment",
      expectedItemCount: 10,
      status: "started",
    });
    expect(opened.formHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(JSON.stringify(opened.form)).not.toMatch(/correctAnswer|answerKey/iu);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM assessment_item_exposures WHERE user_id = 'user-a'",
    ).get()).toEqual({ count: 10 });
    const event = database.database.prepare(
      "SELECT event_type AS eventType, payload_json AS payloadJson FROM outbox_events WHERE aggregate_type = 'assessment_session'",
    ).get() as { eventType: string; payloadJson: string };
    expect(event.eventType).toBe("assessment.started");
    expect(event.payloadJson).not.toMatch(/answer|outcome|score/iu);

    const duplicate = await assessment.openSession("user-a", openCommand());
    expect(duplicate).toMatchObject({
      duplicate: true,
      sessionId: opened.sessionId,
      formHash: opened.formHash,
    });
    await expect(assessment.openSession("user-a", openCommand("user-a", {
      enrollmentId: "different-enrollment",
    }))).rejects.toBeInstanceOf(AssessmentIdempotencyConflictError);
  });

  it("does not let a historical started form strand current-version capacity", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    database.database.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES ('foundation-historical-test', 'hanzi-os-core', 1, 'historical-hash', 'retired', 'approved', ?)",
    ).run(fixtureTime);
    database.database.prepare(
      "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES ('historical-enrollment', 'user-a', 'foundation-historical-test', 'conversation', 'paused', 1, ?, ?)",
    ).run(fixtureTime, fixtureTime);
    database.database.prepare(
      "INSERT INTO devices (id, user_id, installation_id, label, last_acked_cursor, created_at, last_seen_at) VALUES ('historical-device', 'user-a', 'historical-installation', 'historical', 0, ?, ?)",
    ).run(fixtureTime, fixtureTime);
    database.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('historical-idempotency', 'user-a', 'historical-device', 99, 0, 'assessment-session-open-v1', 'historical-open', 'historical-hash', 'completed', 201, '{}', ?, ?, ?)",
    ).run(fixtureTime, fixtureTime, fixtureTime);
    database.database.prepare(
      "INSERT INTO assessment_sessions (id, user_id, enrollment_id, device_id, idempotency_record_id, schema_version, reset_epoch, content_version, blueprint_id, form_version, scoring_policy_version, expected_item_count, form_schema_version, form_manifest_json, form_manifest_hash, status, started_at, created_at) VALUES ('historical-session', 'user-a', 'historical-enrollment', 'historical-device', 'historical-idempotency', 1, 0, 'foundation-historical-test', 'historical-blueprint', 'historical-form', 'historical-score', 1, 1, '{}', ?, 'started', ?, ?)",
    ).run(`sha256:${"f".repeat(64)}`, fixtureTime, fixtureTime);

    const opened = await repository(database).openSession(
      "user-a",
      openCommand(),
    );
    expect(opened.contentVersion).toBe(CONTENT_VERSION);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM assessment_sessions WHERE user_id = 'user-a' AND reset_epoch = 0 AND status = 'started'",
    ).get()).toEqual({ count: 2 });
  });

  it("isolates tenants and permits only one immutable first response", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    seedUser(database, "user-b");
    const bank = approvedBank();
    const assessment = repository(database, bank);
    const opened = await assessment.openSession("user-a", openCommand());
    const item = opened.form.items[0]!;
    const command = attemptCommand(opened, item, {
      response: {
        kind: "selection",
        answer: answerFor(bank, item.itemVersion),
      },
    });
    await expect(assessment.recordAttempt("user-b", command))
      .rejects.toBeInstanceOf(AssessmentSessionUnavailableError);
    const receipt = await assessment.recordAttempt("user-a", command);
    expect(receipt).toMatchObject({
      duplicate: false,
      status: "recorded",
      masteryEligible: false,
      itemVersion: item.itemVersion,
    });
    expect(JSON.stringify(receipt)).not.toMatch(/outcome|score|answer/iu);
    const stored = database.database.prepare(
      "SELECT outcome, score, response_json AS responseJson FROM assessment_attempts WHERE id = ?",
    ).get(receipt.attemptId) as Record<string, unknown>;
    expect(stored).toMatchObject({ outcome: "correct", score: 100 });
    expect(stored.responseJson).toContain(answerFor(bank, item.itemVersion));
    expect(await assessment.recordAttempt("user-a", command)).toMatchObject({
      duplicate: true,
      attemptId: receipt.attemptId,
    });
    await expect(assessment.recordAttempt("user-a", {
      ...command,
      response: { kind: "selection", answer: item.options.at(-1)! },
    })).rejects.toBeInstanceOf(AssessmentIdempotencyConflictError);
    await expect(assessment.recordAttempt("user-a", {
      ...command,
      idempotencyKey: "different-key-same-item",
      deviceSequence: 3,
    })).rejects.toBeInstanceOf(AssessmentAttemptConflictError);
  });

  it("bounds future client timestamps while preserving server receipt time", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const bank = approvedBank();
    const assessment = repository(database, bank);
    const opened = await assessment.openSession("user-a", openCommand());
    const withinSkew = opened.form.items[0]!;
    const accepted = await assessment.recordAttempt(
      "user-a",
      attemptCommand(opened, withinSkew, {
        occurredAt: new Date(fixtureTime + 5 * 60 * 1000).toISOString(),
      }),
    );
    expect(database.database.prepare(
      "SELECT occurred_at AS occurredAt, received_at AS receivedAt FROM assessment_attempts WHERE id = ?",
    ).get(accepted.attemptId)).toEqual({
      occurredAt: fixtureTime + 5 * 60 * 1000,
      receivedAt: fixtureTime,
    });

    const beyondSkew = opened.form.items[1]!;
    await expect(assessment.recordAttempt(
      "user-a",
      attemptCommand(opened, beyondSkew, {
        occurredAt: new Date(fixtureTime + 5 * 60 * 1000 + 1).toISOString(),
      }),
    )).rejects.toThrow("too far ahead of server time");
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM assessment_attempts WHERE session_id = ?",
    ).get(opened.sessionId)).toEqual({ count: 1 });
  });

  it("requires completeness and excludes synthetic TTS from Wilson results", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const bank = approvedBank();
    const assessment = repository(database, bank);
    const opened = await assessment.openSession("user-a", openCommand());
    await assessment.recordAttempt(
      "user-a",
      attemptCommand(opened, opened.form.items[0]!, {
        response: {
          kind: "selection",
          answer: answerFor(bank, opened.form.items[0]!.itemVersion),
        },
      }),
    );
    const incomplete: SubmitAssessmentSessionCommandV1 = {
      protocolVersion: 1,
      idempotencyKey: "assessment-submit-incomplete",
      installationId: "user-a-installation",
      deviceId: "user-a-device",
      deviceSequence: 20,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: opened.sessionId,
      formHash: opened.formHash,
    };
    await expect(assessment.submitSession("user-a", incomplete))
      .rejects.toBeInstanceOf(AssessmentSubmissionIncompleteError);
    expect(database.database.prepare(
      "SELECT status FROM assessment_sessions WHERE id = ?",
    ).get(opened.sessionId)).toEqual({ status: "started" });

    for (const item of opened.form.items.slice(1)) {
      await assessment.recordAttempt("user-a", attemptCommand(opened, item, {
        response: {
          kind: "selection",
          answer: answerFor(bank, item.itemVersion),
        },
      }));
    }
    const submitted = await assessment.submitSession("user-a", {
      ...incomplete,
      idempotencyKey: "assessment-submit-complete",
    });
    expect(submitted).toMatchObject({
      status: "submitted",
      calibrationStatus: "uncalibrated",
      confidenceLevel: 0.95,
      masteryEligible: false,
      overall: { correct: 9, n: 9, observedAccuracy: 100 },
    });
    expect(submitted.skills).toHaveLength(7);
    expect(submitted.skills.find((result) => result.skill === "listening"))
      .toMatchObject({ status: "unassessed", correct: 0, n: 0 });
    expect(submitted.skills.find((result) => result.skill === "speaking"))
      .toMatchObject({ status: "unassessed", n: 0 });
    expect(submitted.skills.find((result) => result.skill === "writing"))
      .toMatchObject({ status: "unassessed", n: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM assessment_skill_results WHERE session_id = ?",
    ).get(opened.sessionId)).toEqual({ count: 7 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM learning_evidence",
    ).get()).toEqual({ count: 0 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM xp_ledger",
    ).get()).toEqual({ count: 0 });
    expect(await assessment.submitSession("user-a", {
      ...incomplete,
      idempotencyKey: "assessment-submit-complete",
    })).toMatchObject({ duplicate: true, sessionId: opened.sessionId });
  });

  it("re-scores persisted responses and fails closed on bank or row drift", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const bank = approvedBank();
    const { assessment, opened } = await completeSession(database, bank);
    const first = database.database.prepare(
      "SELECT id FROM assessment_attempts WHERE session_id = ? ORDER BY position LIMIT 1",
    ).get(opened.sessionId) as { id: string };
    database.database.prepare(
      "UPDATE assessment_attempts SET outcome = 'incorrect', score = 0 WHERE id = ?",
    ).run(first.id);
    await expect(assessment.submitSession("user-a", {
      protocolVersion: 1,
      idempotencyKey: "assessment-submit-tampered",
      installationId: "user-a-installation",
      deviceId: "user-a-device",
      deviceSequence: 20,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: opened.sessionId,
      formHash: opened.formHash,
    })).rejects.toBeInstanceOf(AssessmentSessionUnavailableError);

    const bankItem = bank.find(
      (item) => item.itemVersion === opened.form.items[0]!.itemVersion,
    )!;
    bankItem.reviewStatus = "pending";
    await expect(assessment.recordAttempt("user-a", attemptCommand(
      opened,
      opened.form.items[0]!,
      { idempotencyKey: "review-withdrawn", deviceSequence: 30 },
    ))).rejects.toBeInstanceOf(AssessmentContentUnavailableError);
  });

  it("abandons without score or mastery and preserves exposure across reset", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const bank = approvedBank();
    const assessment = repository(database, bank);
    const opened = await assessment.openSession("user-a", openCommand());
    const command: AbandonAssessmentSessionCommandV1 = {
      protocolVersion: 1,
      idempotencyKey: "assessment-abandon:1",
      installationId: "user-a-installation",
      deviceId: "user-a-device",
      deviceSequence: 2,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: opened.sessionId,
      formHash: opened.formHash,
    };
    const abandoned = await assessment.abandonSession("user-a", command);
    expect(abandoned).toMatchObject({
      status: "abandoned",
      masteryEligible: false,
    });
    const session = database.database.prepare(
      "SELECT status, measurement_evidence_count AS evidenceCount FROM assessment_sessions WHERE id = ?",
    ).get(opened.sessionId);
    expect(session).toEqual({ status: "abandoned", evidenceCount: null });
    expect(await assessment.abandonSession("user-a", command)).toMatchObject({
      duplicate: true,
    });

    database.database.prepare(
      "INSERT INTO learning_documents (user_id, revision, document_json, schema_version, content_version, updated_at) VALUES (?, 1, ?, 1, ?, ?)",
    ).run(
      "user-a",
      JSON.stringify({ reset: { epoch: 1 } }),
      CONTENT_VERSION,
      fixtureTime,
    );
    await expect(assessment.openSession("user-a", openCommand("user-a", {
      idempotencyKey: "assessment-open-after-reset",
      deviceSequence: 3,
      resetEpoch: 1,
    }))).rejects.toBeInstanceOf(AssessmentFormUnavailableError);
    await expect(assessment.openSession("user-a", openCommand("user-a", {
      idempotencyKey: "assessment-open-stale-reset",
      deviceSequence: 4,
      resetEpoch: 0,
    }))).rejects.toBeInstanceOf(LearningResetEpochConflictError);
  });

  it("abandons a retired-content session by tenant, current reset, and stored form hash only", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    seedUser(database, "user-b");
    const historicalContentVersion = "foundation-historical-abandon";
    const historicalForm: AssessmentFormV1 = {
      schemaVersion: 1,
      blueprintId: "retired-blueprint",
      formVersion: "retired-form-v1",
      scoringPolicyVersion: "retired-scoring-v1",
      items: [{
        position: 0,
        itemId: "retired-item",
        itemVersion: "retired-item-v1",
        skill: "vocabulary",
        construct: "retired-construct",
        modality: "visual-selection",
        measurementEligible: false,
        prompt: "Retired prompt",
        meta: "Retired metadata",
        options: ["one", "two"],
      }],
    };
    const historicalFormJson = JSON.stringify(historicalForm);
    const historicalFormHash = await hashAssessmentForm(historicalForm);
    database.database.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, 'retired-manifest', 'retired', 'approved', ?)",
    ).run(historicalContentVersion, fixtureTime);
    database.database.prepare(
      "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES ('retired-enrollment', 'user-a', ?, 'conversation', 'paused', 1, ?, ?)",
    ).run(historicalContentVersion, fixtureTime, fixtureTime);
    database.database.prepare(
      "INSERT INTO devices (id, user_id, installation_id, label, last_acked_cursor, created_at, last_seen_at) VALUES ('retired-open-device', 'user-a', 'retired-open-installation', 'retired', 0, ?, ?)",
    ).run(fixtureTime, fixtureTime);
    database.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('retired-open-idempotency', 'user-a', 'retired-open-device', 1, 0, 'assessment-session-open-v1', 'retired-open', 'retired-open-hash', 'completed', 201, '{}', ?, ?, ?)",
    ).run(fixtureTime, fixtureTime, fixtureTime);
    database.database.prepare(
      "INSERT INTO assessment_sessions (id, user_id, enrollment_id, device_id, idempotency_record_id, schema_version, reset_epoch, content_version, blueprint_id, form_version, scoring_policy_version, expected_item_count, form_schema_version, form_manifest_json, form_manifest_hash, status, started_at, created_at) VALUES ('retired-session', 'user-a', 'retired-enrollment', 'retired-open-device', 'retired-open-idempotency', 1, 0, ?, 'retired-blueprint', 'retired-form-v1', 'retired-scoring-v1', 1, 1, ?, ?, 'started', ?, ?)",
    ).run(
      historicalContentVersion,
      historicalFormJson,
      historicalFormHash,
      fixtureTime,
      fixtureTime,
    );
    const command: AbandonAssessmentSessionCommandV1 = {
      protocolVersion: 1,
      idempotencyKey: "retired-abandon",
      installationId: "retired-abandon-installation",
      deviceId: "retired-abandon-device",
      deviceSequence: 1,
      resetEpoch: 0,
      contentVersion: historicalContentVersion,
      sessionId: "retired-session",
      formHash: historicalFormHash,
    };
    const assessment = repository(database, [], unpromotedPolicy);

    await expect(assessment.abandonSession("user-b", command))
      .rejects.toBeInstanceOf(AssessmentSessionUnavailableError);
    database.database.prepare(
      "UPDATE assessment_sessions SET form_manifest_json = '{\"tampered\":true}' WHERE id = 'retired-session'",
    ).run();
    await expect(assessment.abandonSession("user-a", command))
      .rejects.toThrow("Stored assessment form hash is invalid");
    database.database.prepare(
      "UPDATE assessment_sessions SET form_manifest_json = ? WHERE id = 'retired-session'",
    ).run(historicalFormJson);

    await expect(assessment.abandonSession("user-a", command)).resolves.toMatchObject({
      contentVersion: historicalContentVersion,
      status: "abandoned",
      masteryEligible: false,
    });
    await expect(assessment.abandonSession("user-a", command)).resolves.toMatchObject({
      contentVersion: historicalContentVersion,
      duplicate: true,
    });
    expect(database.database.prepare(
      "SELECT status, measurement_evidence_count AS evidenceCount FROM assessment_sessions WHERE id = 'retired-session'",
    ).get()).toEqual({ status: "abandoned", evidenceCount: null });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM assessment_skill_results WHERE session_id = 'retired-session'",
    ).get()).toEqual({ count: 0 });
  });
});
