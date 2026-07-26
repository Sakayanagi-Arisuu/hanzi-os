import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import {
  canonicalAssessmentForm,
  hashAssessmentForm,
} from "../assessment/assessmentSessionProtocol";
import type { OpenLessonSessionCommandV1 } from "../learning/lessonSessionProtocol";
import { parseNormalizedLearningProjectionV3 } from "../learning/projectionProtocol";
import type {
  RecordReaderAttemptCommandV1,
} from "../reader/readerAttemptProtocol";
import type {
  OpenReaderSessionCommandV1,
  OpenReaderSessionReceiptV1,
} from "../reader/readerSessionProtocol";
import { isPolicyMasteryEligible } from "../lib/evidencePolicy";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import type { ContentReleasePolicy } from "./contentReleasePolicy";
import { CurrentEnrollmentRepository } from "./currentEnrollmentRepository";
import {
  LearningProjectionIntegrityError,
  LearningProjectionRepository,
  LearningProjectionResetRaceError,
} from "./learningProjectionRepository";
import { LessonSessionRepository } from "./lessonSessionRepository";
import {
  CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS,
  FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
  selectAuthoritativeAssessmentForm,
} from "./authoritativeAssessmentItemBank";
import {
  ASSESSMENT_RESULT_SKILLS,
  assessmentObservedResult,
} from "./assessmentScoring";
import {
  READER_SUPPORT_POLICY_VERSION,
  type AuthoritativeReaderStory,
} from "./authoritativeReaderItemBank";
import { ReaderRepository } from "./readerRepository";

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

class AssessmentQueryFailingD1 implements D1Database {
  constructor(private readonly database: D1Database) {}

  prepare(query: string) {
    if (/\b(?:FROM|JOIN)\s+assessment_/iu.test(query)) {
      throw new Error("assessment query unavailable");
    }
    return this.database.prepare(query);
  }

  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
    return this.database.batch<T>(statements);
  }
}

class ReaderQueryFailingD1 implements D1Database {
  constructor(private readonly database: D1Database) {}

  prepare(query: string) {
    if (
      /\b(?:FROM|JOIN)\s+(?:reader_sessions|reader_item_exposures|reader_session_attempts)\b/iu
        .test(query)
    ) {
      throw new Error("Reader query unavailable");
    }
    return this.database.prepare(query);
  }

  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
    return this.database.batch<T>(statements);
  }
}

const lesson = RELEASED_LESSONS[0];
const promotedPolicy: ContentReleasePolicy = {
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: "closed-alpha",
  lifecycle: "published",
  closedAlphaEligible: true,
  productionEligible: false,
  promotionChannel: "closed-alpha",
  promotionManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
};

const seedUser = (
  database: SQLiteD1,
  userId: string,
  releaseState: "review" | "beta" = "beta",
) => {
  const now = Date.parse("2026-07-22T06:00:00.000Z");
  database.database.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
  ).run(userId, now, now);
  database.database.prepare(
    "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES (?, 'Learner', 'conversation', 20, 'simplified', 'zero', 1, 1, ?, ?)",
  ).run(userId, now, now);
  database.database.prepare(
    "INSERT OR IGNORE INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, ?, 'approved', ?)",
  ).run(CONTENT_VERSION, CURRENT_CONTENT_MANIFEST_SHA256, releaseState, now);
  database.database.prepare(
    "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES (?, ?, ?, 'conversation', 'active', 1, ?, ?)",
  ).run(`${userId}-enrollment`, userId, CONTENT_VERSION, now, now);
};

const command = (
  userId: string,
  sequence: number,
): OpenLessonSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: `${userId}:open:${sequence}`,
  installationId: `${userId}-installation`,
  deviceId: `${userId}-device`,
  deviceSequence: sequence,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  enrollmentId: `${userId}-enrollment`,
  lessonId: lesson.id,
});

const sessionRepository = (database: SQLiteD1) =>
  new LessonSessionRepository(database, promotedPolicy, () => 0.5);

const approvedAssessmentItems = CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS.map(
  (item) => ({
    ...item,
    reviewStatus: "approved" as const,
    answerExposure: "server-confidential" as const,
  }),
);

const assessmentProjectionRepository = (database: SQLiteD1) =>
  new LearningProjectionRepository(
    database,
    promotedPolicy,
    async () => 0,
    approvedAssessmentItems,
    FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
  );

const READER_NOW = Date.parse("2026-07-22T07:00:00.000Z");
const readerStory = (
  storyId = "projection-reader",
  suffix = "a",
): AuthoritativeReaderStory => ({
  id: storyId,
  storyVersion: `${CONTENT_VERSION}:reader-story:${suffix}:1`,
  formVersion: `${CONTENT_VERSION}:reader-form:${suffix}:1`,
  contentVersion: CONTENT_VERSION,
  releaseState: "beta",
  reviewStatus: "approved",
  script: "simplified",
  supportPolicyVersion: READER_SUPPORT_POLICY_VERSION,
  items: [
    {
      id: `projection-main-${suffix}`,
      itemVersion: `${CONTENT_VERSION}:reader-item:projection-main-${suffix}:1`,
      contentVersion: CONTENT_VERSION,
      exposureGroupId: `reader-projection-exposure:${suffix}:main`,
      equivalentGroupId: `reader-projection-equivalent:${suffix}:main`,
      reviewStatus: "approved",
      answerExposure: "server-confidential",
      chineseStimulus: "小林今天去中文课。",
      prompt: `Projection prompt ${suffix}`,
      options: [`projection-${suffix}-correct`, `projection-${suffix}-wrong`],
      correctAnswer: `projection-${suffix}-correct`,
    },
    {
      id: `projection-detail-${suffix}`,
      itemVersion: `${CONTENT_VERSION}:reader-item:projection-detail-${suffix}:1`,
      contentVersion: CONTENT_VERSION,
      exposureGroupId: `reader-projection-exposure:${suffix}:detail`,
      equivalentGroupId: `reader-projection-equivalent:${suffix}:detail`,
      reviewStatus: "approved",
      answerExposure: "server-confidential",
      chineseStimulus: "老师给小林一本书。",
      prompt: `Projection detail ${suffix}`,
      options: [`projection-${suffix}-book`, `projection-${suffix}-tea`],
      correctAnswer: `projection-${suffix}-book`,
    },
  ],
});
const approvedReaderStories = (): readonly AuthoritativeReaderStory[] => [
  readerStory(),
];

const readerAuthorityRepository = (
  database: SQLiteD1,
  bank: readonly AuthoritativeReaderStory[] = approvedReaderStories(),
) => new ReaderRepository(database, {
  bank,
  publicationPolicy: promotedPolicy,
  now: () => READER_NOW,
});

const readerProjectionRepository = (
  database: D1Database,
  bank: readonly AuthoritativeReaderStory[] = approvedReaderStories(),
  resetReader = async () => 0,
) => new LearningProjectionRepository(
  database,
  promotedPolicy,
  resetReader,
  approvedAssessmentItems,
  FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
  bank,
);

const openReaderCommand = (
  userId = "user-a",
  overrides: Partial<OpenReaderSessionCommandV1> = {},
): OpenReaderSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: `${userId}:reader-open:projection`,
  installationId: `${userId}-reader-installation`,
  deviceId: `${userId}-reader-device`,
  deviceSequence: 30,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  enrollmentId: `${userId}-enrollment`,
  storyId: "projection-reader",
  script: "simplified",
  supportMode: "unassisted",
  ...overrides,
});

const readerAnswer = (
  itemVersion: string,
  bank: readonly AuthoritativeReaderStory[] = approvedReaderStories(),
) => bank.flatMap((story) => story.items)
  .find((item) => item.itemVersion === itemVersion)!.correctAnswer;

const recordReaderAttemptCommand = (
  opened: OpenReaderSessionReceiptV1,
  userId = "user-a",
  position = 0,
  overrides: Partial<RecordReaderAttemptCommandV1> = {},
): RecordReaderAttemptCommandV1 => {
  const item = opened.form.items[position]!;
  return {
    protocolVersion: 1,
    idempotencyKey: `${userId}:reader-attempt:projection:${position}`,
    installationId: `${userId}-reader-installation`,
    deviceId: `${userId}-reader-device`,
    deviceSequence: 31 + position,
    resetEpoch: opened.resetEpoch,
    contentVersion: CONTENT_VERSION,
    sessionId: opened.sessionId,
    formHash: opened.formHash,
    position,
    itemId: item.itemId,
    itemVersion: item.itemVersion,
    selectedOption: readerAnswer(item.itemVersion),
    occurredAt: opened.startedAt,
    ...overrides,
  };
};

const seedActiveReader = async (
  database: SQLiteD1,
  userId = "user-a",
  bank: readonly AuthoritativeReaderStory[] = approvedReaderStories(),
) => {
  const readers = readerAuthorityRepository(database, bank);
  const opened = await readers.openSession(
    userId,
    openReaderCommand(userId),
  );
  const attempt = await readers.recordAttempt(
    userId,
    recordReaderAttemptCommand(opened, userId),
  );
  return { readers, opened, attempt };
};

const insertActiveAttempt = (
  database: SQLiteD1,
  input: {
    userId: string;
    sessionId: string;
    activity: Awaited<ReturnType<LessonSessionRepository["open"]>>["form"]["activities"][number];
    sequence: number;
  },
) => {
  const now = Date.parse("2026-07-22T06:10:00.000Z");
  const idempotencyId = `${input.userId}-attempt-idempotency`;
  const attemptId = `${input.userId}-attempt`;
  const evidenceId = `${input.userId}-evidence`;
  const deviceId = database.database.prepare(
    "SELECT device_id AS deviceId FROM lesson_sessions WHERE id = ?",
  ).get(input.sessionId) as { deviceId: string };
  database.database.prepare(
    `INSERT INTO idempotency_records
       (id, user_id, device_id, device_sequence, reset_epoch, scope,
        idempotency_key, request_hash, status, response_status, response_json,
        created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, 0, 'learning-attempt-v1', ?, 'fixture', 'completed',
             201, '{}', ?, ?, ?)`,
  ).run(
    idempotencyId,
    input.userId,
    deviceId.deviceId,
    input.sequence,
    `${input.userId}:attempt`,
    now,
    now,
    now,
  );
  database.database.prepare(
    `INSERT INTO learning_attempts
       (id, user_id, enrollment_id, session_id, device_id, device_sequence,
        idempotency_record_id, schema_version, reset_epoch, content_version,
        activity_id, activity_version, source, method, skill, response_json,
        outcome, score, used_hint, prior_exposure, required_for_pass,
        scoring_version, occurred_at, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, 'lesson', ?, ?, '{}',
             'correct', 100, 0, 0, ?, 'objective-policy-v1', ?, ?)`,
  ).run(
    attemptId,
    input.userId,
    `${input.userId}-enrollment`,
    input.sessionId,
    deviceId.deviceId,
    input.sequence,
    idempotencyId,
    CONTENT_VERSION,
    input.activity.activityId,
    input.activity.activityVersion,
    input.activity.method,
    input.activity.skill,
    input.activity.requiredForPass ? 1 : 0,
    now,
    now,
  );
  const masteryEligible = isPolicyMasteryEligible(
    input.activity.method,
    input.activity.skill,
  );
  database.database.prepare(
    `INSERT INTO learning_evidence
       (id, user_id, enrollment_id, attempt_id, session_id, schema_version,
        reset_epoch, policy_version, content_version, activity_id,
        activity_version, source, method, skill, outcome, score, verified,
        mastery_eligible, metadata_json, occurred_at, recorded_at)
     VALUES (?, ?, ?, ?, NULL, 1, 0, 'objective-policy-v1', ?, ?, ?,
             'lesson', ?, ?, 'correct', 100, 1, ?, '{}', ?, ?)`,
  ).run(
    evidenceId,
    input.userId,
    `${input.userId}-enrollment`,
    attemptId,
    CONTENT_VERSION,
    input.activity.activityId,
    input.activity.activityVersion,
    input.activity.method,
    input.activity.skill,
    masteryEligible ? 1 : 0,
    now,
    now,
  );
};

const seedAssessmentProjection = async (
  database: SQLiteD1,
  userId: string,
) => {
  const selection = selectAuthoritativeAssessmentForm({
    bank: approvedAssessmentItems,
    blueprint: FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
    exposedGroups: new Set(),
    random: () => 0.5,
  });
  if (selection.kind !== "selected") {
    throw new Error(
      `Approved assessment fixture cannot satisfy its blueprint: ${JSON.stringify(selection)}`,
    );
  }
  const form = selection.form;
  const formJson = canonicalAssessmentForm(form);
  const formHash = await hashAssessmentForm(form);
  const startedAt = Date.parse("2026-07-22T07:00:00.000Z");
  const submittedAt = startedAt + 60_000;
  const deviceId = `${userId}-assessment-device`;
  database.database.prepare(
    "INSERT INTO devices (id, user_id, installation_id, last_acked_cursor, created_at, last_seen_at) VALUES (?, ?, ?, 0, ?, ?)",
  ).run(deviceId, userId, `${userId}-assessment-installation`, startedAt, startedAt);

  const insertIdempotency = (
    id: string,
    scope: string,
    key: string,
    sequence: number,
  ) => database.database.prepare(
    `INSERT INTO idempotency_records
       (id, user_id, device_id, device_sequence, reset_epoch, scope,
        idempotency_key, request_hash, status, response_status, response_json,
        created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, 'fixture', 'completed', 201, '{}', ?, ?, ?)`,
  ).run(
    id,
    userId,
    deviceId,
    sequence,
    scope,
    key,
    startedAt,
    startedAt,
    startedAt,
  );

  const insertSession = (
    sessionId: string,
    idempotencyId: string,
    status: "started" | "submitted",
  ) => {
    const overall = assessmentObservedResult(
      form.items.filter((item) => item.measurementEligible).length,
      form.items.filter((item) => item.measurementEligible).length,
    );
    database.database.prepare(
      `INSERT INTO assessment_sessions
         (id, user_id, enrollment_id, device_id, idempotency_record_id,
          schema_version, reset_epoch, content_version, blueprint_id,
          form_version, scoring_policy_version, expected_item_count,
          form_schema_version, form_manifest_json, form_manifest_hash, status,
          measurement_evidence_count, measurement_correct_count,
          observed_accuracy, confidence_lower, confidence_upper, started_at,
          terminal_at, created_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      sessionId,
      userId,
      `${userId}-enrollment`,
      deviceId,
      idempotencyId,
      CONTENT_VERSION,
      form.blueprintId,
      form.formVersion,
      form.scoringPolicyVersion,
      form.items.length,
      formJson,
      formHash,
      status,
      status === "submitted" ? overall.n : null,
      status === "submitted" ? overall.correct : null,
      status === "submitted" ? overall.observedAccuracy : null,
      status === "submitted" ? overall.confidence95?.lower ?? null : null,
      status === "submitted" ? overall.confidence95?.upper ?? null : null,
      startedAt,
      status === "submitted" ? submittedAt : null,
      startedAt,
    );
  };

  insertIdempotency(
    `${userId}-assessment-active-idempotency`,
    "assessment-session-open-v1",
    `${userId}:assessment-active`,
    1,
  );
  insertSession(
    `${userId}-assessment-active`,
    `${userId}-assessment-active-idempotency`,
    "started",
  );
  insertIdempotency(
    `${userId}-assessment-submitted-idempotency`,
    "assessment-session-open-v1",
    `${userId}:assessment-submitted`,
    2,
  );
  insertSession(
    `${userId}-assessment-submitted`,
    `${userId}-assessment-submitted-idempotency`,
    "submitted",
  );
  insertIdempotency(
    `${userId}-assessment-attempt-idempotency`,
    "assessment-attempt-v1",
    `${userId}:assessment-attempt`,
    3,
  );
  const activeItem = form.items[0]!;
  database.database.prepare(
    `INSERT INTO assessment_attempts
       (id, user_id, session_id, device_id, device_sequence,
        idempotency_record_id, schema_version, reset_epoch, content_version,
        position, item_id, item_version, skill, construct, modality,
        measurement_eligible, response_json, outcome, score, duration_ms,
        occurred_at, received_at)
     VALUES (?, ?, ?, ?, 3, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?,
             '{"kind":"selection","answer":"server-private-response"}',
             'correct', 100, 500, ?, ?)`,
  ).run(
    `${userId}-assessment-attempt`,
    userId,
    `${userId}-assessment-active`,
    deviceId,
    `${userId}-assessment-attempt-idempotency`,
    CONTENT_VERSION,
    activeItem.position,
    activeItem.itemId,
    activeItem.itemVersion,
    activeItem.skill,
    activeItem.construct,
    activeItem.modality,
    activeItem.measurementEligible ? 1 : 0,
    startedAt + 1_000,
    startedAt + 1_100,
  );

  for (const skill of ASSESSMENT_RESULT_SKILLS) {
    const count = form.items.filter((item) =>
      item.measurementEligible && item.skill === skill
    ).length;
    const observed = assessmentObservedResult(count, count);
    database.database.prepare(
      `INSERT INTO assessment_skill_results
         (id, user_id, session_id, reset_epoch, content_version, skill, status,
          correct_count, evidence_count, observed_accuracy, confidence_lower,
          confidence_upper, mastery_eligible, scoring_policy_version, created_at)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    ).run(
      `${userId}-assessment-result-${skill}`,
      userId,
      `${userId}-assessment-submitted`,
      CONTENT_VERSION,
      skill,
      observed.status,
      observed.correct,
      observed.n,
      observed.observedAccuracy,
      observed.confidence95?.lower ?? null,
      observed.confidence95?.upper ?? null,
      form.scoringPolicyVersion,
      submittedAt,
    );
  }
  database.database.prepare(
    `INSERT INTO sync_changes
       (user_id, entity_type, entity_id, revision, reset_epoch, operation_id,
        operation, payload_json, occurred_at)
     VALUES (?, 'assessment_session', ?, 1, 0, ?, 'upsert', '{}', ?),
            (?, 'assessment_attempt', ?, 1, 0, ?, 'upsert', '{}', ?)`,
  ).run(
    userId,
    `${userId}-assessment-active`,
    `normalized:assessment-session-open:${userId}`,
    startedAt,
    userId,
    `${userId}-assessment-attempt`,
    `normalized:assessment-attempt:${userId}`,
    startedAt + 1_100,
  );
  return {
    form,
    formHash,
    activeSessionId: `${userId}-assessment-active`,
    submittedSessionId: `${userId}-assessment-submitted`,
  };
};

describe("normalized learning projection repository", () => {
  it("keeps legacy V1 available when assessment queries are unavailable", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const failingDatabase = new AssessmentQueryFailingD1(database);
    const repository = new LearningProjectionRepository(
      failingDatabase,
      promotedPolicy,
    );

    await expect(repository.read("user-a")).resolves.toMatchObject({
      protocolVersion: 1,
      resetEpoch: 0,
      enrollment: { enrollmentId: "user-a-enrollment" },
    });
    await expect(repository.readV2("user-a")).rejects.toThrow(
      "assessment query unavailable",
    );
  });

  it("keeps V1/V2 available when Reader-table queries are unavailable", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const failingDatabase = new ReaderQueryFailingD1(database);
    const repository = readerProjectionRepository(failingDatabase);

    await expect(repository.read("user-a")).resolves.toMatchObject({
      protocolVersion: 1,
      enrollment: { enrollmentId: "user-a-enrollment" },
    });
    await expect(repository.readV2("user-a")).resolves.toMatchObject({
      protocolVersion: 2,
      activeAssessmentSession: null,
    });
    await expect(repository.readV3("user-a")).rejects.toThrow(
      "Reader query unavailable",
    );
  });

  it("projects one answer-free active Reader graph for the current tenant only", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    seedUser(database, "user-b");
    const fixture = await seedActiveReader(database, "user-a");
    await seedActiveReader(database, "user-b");

    const projection = await readerProjectionRepository(database).readV3(
      "user-a",
    );

    expect(projection).toMatchObject({
      protocolVersion: 3,
      enrollment: { enrollmentId: "user-a-enrollment" },
      activeReaderSession: {
        sessionId: fixture.opened.sessionId,
        resetEpoch: 0,
        contentVersion: CONTENT_VERSION,
        storyId: "projection-reader",
        formHash: fixture.opened.formHash,
        supportMode: "unassisted",
        expectedItemCount: 2,
        status: "started",
        attempts: [{
          attemptId: fixture.attempt.attemptId,
          evidenceId: fixture.attempt.evidenceId,
          position: 0,
          outcome: "correct",
          score: 100,
          masteryEligible: true,
          verification: "server-objective",
        }],
      },
    });
    const serialized = JSON.stringify(projection.activeReaderSession);
    expect(serialized).not.toMatch(
      /"(?:selectedOption|response|responseJson|correctAnswer|answerKey)"/iu,
    );
    expect(serialized).not.toContain("user-b");
    expect(parseNormalizedLearningProjectionV3(projection)).toMatchObject({
      ok: true,
    });

    const v2 = await readerProjectionRepository(database).readV2("user-a");
    expect(v2.protocolVersion).toBe(2);
    expect(v2).not.toHaveProperty("activeReaderSession");
    const v1 = await readerProjectionRepository(database).read("user-a");
    expect(v1.protocolVersion).toBe(1);
    expect(v1).not.toHaveProperty("activeReaderSession");
  });

  it("projects answer-free active assessment state and the latest uncalibrated result", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const fixture = await seedAssessmentProjection(database, "user-a");

    const projection = await assessmentProjectionRepository(database).readV2(
      "user-a",
    );

    expect(projection.protocolVersion).toBe(2);
    expect(projection.activeAssessmentSession).toMatchObject({
      sessionId: fixture.activeSessionId,
      formHash: fixture.formHash,
      attempts: [{
        itemId: fixture.form.items[0]!.itemId,
        status: "recorded",
        masteryEligible: false,
      }],
    });
    expect(projection.latestAssessmentResult).toMatchObject({
      sessionId: fixture.submittedSessionId,
      status: "submitted",
      calibrationStatus: "uncalibrated",
      masteryEligible: false,
      skills: expect.arrayContaining([
        expect.objectContaining({ skill: "speaking", status: "unassessed" }),
        expect.objectContaining({ skill: "writing", status: "unassessed" }),
      ]),
    });
    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain("server-private-response");
    expect(serialized).not.toContain("response_json");
    expect(serialized).not.toContain("correctAnswer");
    expect(Object.values(projection.objectiveEvidence).every(
      (summary) => summary.attemptCount === 0,
    )).toBe(true);
    expect(projection.submittedLessons).toEqual([]);
    expect(projection.cursor).toBeGreaterThan(0);

    const legacy = await assessmentProjectionRepository(database).read("user-a");
    expect(legacy.protocolVersion).toBe(1);
    expect(legacy.cursor).toBe(projection.cursor);
    expect(legacy).not.toHaveProperty("activeAssessmentSession");
    expect(legacy).not.toHaveProperty("latestAssessmentResult");
  });

  it("fails closed when submitted assessment counts do not match the immutable form", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const fixture = await seedAssessmentProjection(database, "user-a");
    const inconsistent = assessmentObservedResult(8, 8);
    database.database.prepare(
      `UPDATE assessment_sessions
       SET measurement_evidence_count = 8,
           measurement_correct_count = 8,
           observed_accuracy = ?, confidence_lower = ?, confidence_upper = ?
       WHERE id = ?`,
    ).run(
      inconsistent.observedAccuracy,
      inconsistent.confidence95!.lower,
      inconsistent.confidence95!.upper,
      fixture.submittedSessionId,
    );

    const repository = assessmentProjectionRepository(database);
    await expect(repository.read("user-a")).resolves.toMatchObject({
      protocolVersion: 1,
      enrollment: { enrollmentId: "user-a-enrollment" },
    });
    await expect(repository.readV2("user-a"))
      .rejects.toThrow(/does not match the submitted form/u);
  });

  it("returns only current-tenant released facts and answer-free active forms", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    seedUser(database, "user-b");

    const submitted = await sessionRepository(database).open(
      "user-a",
      command("user-a", 1),
    );
    const active = await sessionRepository(database).open(
      "user-a",
      command("user-a", 2),
    );
    await sessionRepository(database).open("user-b", command("user-b", 1));

    const submittedAt = Number((database.database.prepare(
      "SELECT started_at AS startedAt FROM lesson_sessions WHERE id = ?",
    ).get(submitted.sessionId) as { startedAt: number }).startedAt) + 1_000;
    const requiredCount = submitted.form.activities.filter(
      (activity) => activity.requiredForPass,
    ).length;
    database.database.prepare(
      `UPDATE lesson_sessions
       SET status = 'submitted', raw_score = 90, gate_score = 80,
           required_evidence_count = ?, required_correct_count = ?,
           passed = 1, submitted_at = ?
       WHERE id = ?`,
    ).run(requiredCount, requiredCount, submittedAt, submitted.sessionId);
    database.database.prepare(
      `INSERT INTO learning_evidence
       (id, user_id, enrollment_id, attempt_id, session_id, schema_version,
        reset_epoch, policy_version, content_version, activity_id,
        activity_version, source, method, skill, outcome, score, verified,
        mastery_eligible, metadata_json, occurred_at, recorded_at)
       VALUES ('aggregate-completion', 'user-a', 'user-a-enrollment', NULL, ?,
               1, 0, 'lesson-completion-policy-v1', ?, ?, ?, 'lesson',
               'lesson-completion', 'grammar', 'completed', 80, 1, 0,
               '{"aggregateOnly":true}', ?, ?)`,
    ).run(
      submitted.sessionId,
      CONTENT_VERSION,
      `${lesson.id}:completion`,
      submitted.lessonVersion,
      submittedAt,
      submittedAt,
    );

    const activity = active.form.activities.find((candidate) =>
      isPolicyMasteryEligible(candidate.method, candidate.skill)
    ) ?? active.form.activities[0];
    insertActiveAttempt(database, {
      userId: "user-a",
      sessionId: active.sessionId,
      activity,
      sequence: 3,
    });

    const projection = await new LearningProjectionRepository(
      database,
      promotedPolicy,
    ).read("user-a");

    expect(projection.enrollment).toMatchObject({
      enrollmentId: "user-a-enrollment",
      contentVersion: CONTENT_VERSION,
      releaseState: "beta",
    });
    expect(projection.activeLessonSessions).toHaveLength(1);
    expect(projection.activeLessonSessions[0]).toMatchObject({
      sessionId: active.sessionId,
      formHash: active.formHash,
      attempts: [{ activityId: activity.activityId, outcome: "correct" }],
    });
    const serializedActive = JSON.stringify(projection.activeLessonSessions);
    expect(serializedActive).not.toContain("response_json");
    expect(serializedActive).not.toContain("selectedAnswer");
    expect(serializedActive).not.toContain("correctAnswer");
    expect(projection.submittedLessons).toEqual([
      expect.objectContaining({
        lessonId: lesson.id,
        submittedSessionCount: 1,
        passedSessionCount: 1,
        passed: true,
        bestRawScore: 90,
        bestGateScore: 80,
      }),
    ]);
    const objectiveCount = Object.values(projection.objectiveEvidence)
      .reduce((sum, summary) => sum + summary.attemptCount, 0);
    expect(objectiveCount).toBe(1);
    expect(projection.objectiveEvidence[activity.skill]).toMatchObject({
      attemptCount: 1,
      correctCount: 1,
      masteryEligibleCount: isPolicyMasteryEligible(activity.method, activity.skill)
        ? 1
        : 0,
    });
    expect(projection.cursor).toBeGreaterThan(0);
    expect(serializedActive).not.toContain("user-b");
  });

  it("returns no enrollment or normalized facts when the exact course is not released", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a", "review");

    const projection = await new LearningProjectionRepository(
      database,
      promotedPolicy,
    ).read("user-a");

    expect(projection.enrollment).toBeNull();
    expect(projection.activeLessonSessions).toEqual([]);
    expect(projection.submittedLessons).toEqual([]);
    expect(Object.values(projection.objectiveEvidence).every(
      (summary) => summary.attemptCount === 0,
    )).toBe(true);
  });

  it("fails V3 closed for answer-bearing forms and corrupt Reader evidence policy", async () => {
    const formDatabase = new SQLiteD1();
    seedUser(formDatabase, "user-a");
    const formFixture = await seedActiveReader(formDatabase);
    formDatabase.database.prepare(
      `UPDATE reader_sessions
       SET form_manifest_json = json_set(
         form_manifest_json,
         '$.items[0].correctAnswer',
         'server-answer-leak'
       )
       WHERE id = ?`,
    ).run(formFixture.opened.sessionId);

    await expect(readerProjectionRepository(formDatabase).readV2("user-a"))
      .resolves.toMatchObject({ protocolVersion: 2 });
    await expect(readerProjectionRepository(formDatabase).readV3("user-a"))
      .rejects.toBeInstanceOf(LearningProjectionIntegrityError);

    const evidenceDatabase = new SQLiteD1();
    seedUser(evidenceDatabase, "user-a");
    const evidenceFixture = await seedActiveReader(evidenceDatabase);
    evidenceDatabase.database.prepare(
      "UPDATE learning_evidence SET mastery_eligible = 0 WHERE id = ?",
    ).run(evidenceFixture.attempt.evidenceId);
    await expect(readerProjectionRepository(evidenceDatabase).readV3("user-a"))
      .rejects.toThrow(/objective evidence pair/u);
  });

  it("does not let an unrelated exposure claim authorize an active form", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const fixture = await seedActiveReader(database);
    database.database.prepare(
      "DELETE FROM reader_item_exposures WHERE user_id = 'user-a'",
    ).run();
    database.database.prepare(
      `INSERT INTO reader_item_exposures
       (id, user_id, session_id, reset_epoch, content_version, story_id,
        item_id, item_version, exposure_group_id, equivalent_group_id,
        exposed_at)
       VALUES ('unrelated-reader-exposure', 'user-a', ?, 0, ?, ?,
               'unrelated-item', 'unrelated-version',
               'unrelated-exposure-group', 'unrelated-equivalent-group', ?)`,
    ).run(
      fixture.opened.sessionId,
      CONTENT_VERSION,
      fixture.opened.storyId,
      READER_NOW,
    );

    await expect(readerProjectionRepository(database).readV3("user-a"))
      .rejects.toThrow(/exposure-history claim/u);
  });

  it("projects assisted re-open history as prior and mastery-ineligible", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const bank = approvedReaderStories();
    const readers = readerAuthorityRepository(database, bank);
    const first = await readers.openSession("user-a", openReaderCommand());
    await readers.abandonSession("user-a", {
      protocolVersion: 1,
      idempotencyKey: "reader-abandon:projection",
      installationId: "user-a-reader-installation",
      deviceId: "user-a-reader-device",
      deviceSequence: 40,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: first.sessionId,
      formHash: first.formHash,
      reason: "support-requested",
    });
    const assisted = await readers.openSession("user-a", openReaderCommand(
      "user-a",
      {
        idempotencyKey: "reader-open:projection:assisted",
        deviceSequence: 41,
        supportMode: "assisted",
      },
    ));
    const attempt = await readers.recordAttempt(
      "user-a",
      recordReaderAttemptCommand(assisted, "user-a", 0, {
        idempotencyKey: "reader-attempt:projection:assisted",
        deviceSequence: 42,
      }),
    );

    const projection = await readerProjectionRepository(
      database,
      bank,
    ).readV3("user-a");
    expect(projection.activeReaderSession).toMatchObject({
      sessionId: assisted.sessionId,
      supportMode: "assisted",
      form: {
        items: [
          expect.objectContaining({
            priorExposure: true,
            masteryEligible: false,
          }),
          expect.objectContaining({
            priorExposure: true,
            masteryEligible: false,
          }),
        ],
      },
      attempts: [{
        attemptId: attempt.attemptId,
        priorExposure: true,
        masteryEligible: false,
      }],
    });
  });

  it("fails closed when more than one Reader session is active", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const bank = [
      readerStory("projection-reader", "a"),
      readerStory("projection-reader-two", "b"),
    ];
    const readers = readerAuthorityRepository(database, bank);
    await readers.openSession("user-a", openReaderCommand());
    await readers.openSession("user-a", openReaderCommand("user-a", {
      idempotencyKey: "reader-open:projection:two",
      deviceSequence: 50,
      storyId: "projection-reader-two",
    }));

    await expect(readerProjectionRepository(database, bank).readV3("user-a"))
      .rejects.toThrow(/More than one active Reader session/u);
  });

  it("advances the cursor once when a released enrollment is activated", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    database.database.prepare(
      "DELETE FROM enrollments WHERE user_id = 'user-a'",
    ).run();
    const projectionRepository = new LearningProjectionRepository(
      database,
      promotedPolicy,
    );
    const before = await projectionRepository.read("user-a");
    expect(before).toMatchObject({ cursor: 0, enrollment: null });

    const enrollmentRepository = new CurrentEnrollmentRepository(
      database,
      promotedPolicy,
    );
    const activated = await enrollmentRepository.activate("user-a");
    const after = await projectionRepository.read("user-a");
    expect(after.enrollment?.enrollmentId).toBe(activated.enrollmentId);
    expect(after.cursor).toBeGreaterThan(before.cursor);

    await enrollmentRepository.activate("user-a");
    const retried = await projectionRepository.read("user-a");
    expect(retried.cursor).toBe(after.cursor);
  });

  it("filters old normalized rows and advances to the current reset marker", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const oldSession = await sessionRepository(database).open(
      "user-a",
      command("user-a", 1),
    );
    const now = Date.parse("2026-07-22T06:30:00.000Z");
    database.database.prepare(
      `INSERT INTO learning_documents
       (user_id, revision, document_json, schema_version, content_version, updated_at)
       VALUES ('user-a', 1, '{"reset":{"epoch":1}}', 1, ?, ?)`,
    ).run(CONTENT_VERSION, now);
    database.database.prepare(
      `INSERT INTO sync_changes
       (user_id, entity_type, entity_id, revision, reset_epoch, operation_id,
        operation, payload_json, occurred_at)
       VALUES ('user-a', 'learning_document', 'user-a', 1, NULL, 'reset:1',
               'upsert', '{"kind":"reset"}', ?)`,
    ).run(now);

    const projection = await new LearningProjectionRepository(
      database,
      promotedPolicy,
    ).read("user-a");

    expect(projection.resetEpoch).toBe(1);
    expect(projection.activeLessonSessions).toEqual([]);
    expect(projection.cursor).toBeGreaterThan(0);
    expect(JSON.stringify(projection)).not.toContain(oldSession.sessionId);
  });

  it("retries an epoch change once and fails if the epoch never stabilizes", async () => {
    const stableDatabase = new SQLiteD1();
    seedUser(stableDatabase, "user-a");
    const stableEpochs = [0, 1, 1, 1];
    const stableProjection = await new LearningProjectionRepository(
      stableDatabase,
      promotedPolicy,
      async () => stableEpochs.shift() ?? 1,
    ).read("user-a");
    expect(stableProjection.resetEpoch).toBe(1);

    const racingDatabase = new SQLiteD1();
    seedUser(racingDatabase, "user-a");
    const racingEpochs = [0, 1, 1, 2];
    await expect(new LearningProjectionRepository(
      racingDatabase,
      promotedPolicy,
      async () => racingEpochs.shift() ?? 3,
    ).read("user-a")).rejects.toBeInstanceOf(
      LearningProjectionResetRaceError,
    );

    const readerRacingDatabase = new SQLiteD1();
    seedUser(readerRacingDatabase, "user-a");
    const readerRacingEpochs = [0, 1, 1, 2];
    await expect(readerProjectionRepository(
      readerRacingDatabase,
      approvedReaderStories(),
      async () => readerRacingEpochs.shift() ?? 3,
    ).readV3("user-a")).rejects.toBeInstanceOf(
      LearningProjectionResetRaceError,
    );
  });
});
