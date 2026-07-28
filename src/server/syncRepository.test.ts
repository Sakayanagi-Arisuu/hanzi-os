import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { ChatGPTUser } from "../../app/chatgpt-auth";
import { CONTENT_VERSION } from "../data/curriculum";
import { createInitialSyncDocument, evolveSyncDocument } from "../sync/document";
import {
  hashSyncPushOperation,
  SYNC_PROTOCOL_VERSION,
  type SyncPushOperationV1,
} from "../sync/protocol";
import type { LearningState } from "../types";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import { ACCOUNT_EXPORT_TABLES, SyncRepository } from "./syncRepository";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migration = readdirSync(migrationDirectory)
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n");

const TENANT_RELATIONS = [
  ["enrollments", ["user_id", "supersedes_enrollment_id"], "enrollments", ["user_id", "id"]],
  ["idempotency_records", ["user_id", "device_id"], "devices", ["user_id", "id"]],
  ["lesson_sessions", ["user_id", "enrollment_id"], "enrollments", ["user_id", "id"]],
  ["lesson_sessions", ["user_id", "device_id"], "devices", ["user_id", "id"]],
  ["lesson_sessions", ["user_id", "idempotency_record_id", "reset_epoch"], "idempotency_records", ["user_id", "id", "reset_epoch"]],
  ["reader_sessions", ["user_id", "enrollment_id"], "enrollments", ["user_id", "id"]],
  ["reader_sessions", ["user_id", "device_id"], "devices", ["user_id", "id"]],
  ["reader_sessions", ["user_id", "idempotency_record_id", "reset_epoch"], "idempotency_records", ["user_id", "id", "reset_epoch"]],
  ["reader_item_exposures", ["user_id", "session_id", "reset_epoch"], "reader_sessions", ["user_id", "id", "reset_epoch"]],
  ["assessment_sessions", ["user_id", "enrollment_id"], "enrollments", ["user_id", "id"]],
  ["assessment_sessions", ["user_id", "device_id"], "devices", ["user_id", "id"]],
  ["assessment_sessions", ["user_id", "idempotency_record_id", "reset_epoch"], "idempotency_records", ["user_id", "id", "reset_epoch"]],
  ["assessment_item_exposures", ["user_id", "session_id", "reset_epoch"], "assessment_sessions", ["user_id", "id", "reset_epoch"]],
  ["assessment_attempts", ["user_id", "session_id", "reset_epoch"], "assessment_sessions", ["user_id", "id", "reset_epoch"]],
  ["assessment_attempts", ["user_id", "device_id"], "devices", ["user_id", "id"]],
  ["assessment_attempts", ["user_id", "idempotency_record_id", "reset_epoch"], "idempotency_records", ["user_id", "id", "reset_epoch"]],
  ["assessment_skill_results", ["user_id", "session_id", "reset_epoch"], "assessment_sessions", ["user_id", "id", "reset_epoch"]],
  ["learning_attempts", ["user_id", "enrollment_id"], "enrollments", ["user_id", "id"]],
  ["learning_attempts", ["user_id", "session_id", "reset_epoch"], "lesson_sessions", ["user_id", "id", "reset_epoch"]],
  ["learning_attempts", ["user_id", "device_id"], "devices", ["user_id", "id"]],
  ["learning_attempts", ["user_id", "idempotency_record_id", "reset_epoch"], "idempotency_records", ["user_id", "id", "reset_epoch"]],
  ["reader_session_attempts", ["user_id", "session_id", "reset_epoch"], "reader_sessions", ["user_id", "id", "reset_epoch"]],
  ["reader_session_attempts", ["user_id", "attempt_id", "reset_epoch"], "learning_attempts", ["user_id", "id", "reset_epoch"]],
  ["learning_evidence", ["user_id", "enrollment_id"], "enrollments", ["user_id", "id"]],
  ["learning_evidence", ["user_id", "attempt_id", "reset_epoch"], "learning_attempts", ["user_id", "id", "reset_epoch"]],
  ["learning_evidence", ["user_id", "session_id", "reset_epoch"], "lesson_sessions", ["user_id", "id", "reset_epoch"]],
  ["fsrs_cards", ["user_id", "enrollment_id"], "enrollments", ["user_id", "id"]],
  ["fsrs_cards", ["user_id", "activation_session_id", "reset_epoch"], "lesson_sessions", ["user_id", "id", "reset_epoch"]],
  ["review_logs", ["user_id", "card_id", "reset_epoch"], "fsrs_cards", ["user_id", "id", "reset_epoch"]],
  ["review_logs", ["user_id", "attempt_id", "reset_epoch"], "learning_attempts", ["user_id", "id", "reset_epoch"]],
  ["review_logs", ["user_id", "idempotency_record_id", "reset_epoch"], "idempotency_records", ["user_id", "id", "reset_epoch"]],
  ["xp_ledger", ["user_id", "enrollment_id"], "enrollments", ["user_id", "id"]],
  ["xp_ledger", ["user_id", "idempotency_record_id", "reset_epoch"], "idempotency_records", ["user_id", "id", "reset_epoch"]],
  ["local_import_receipts", ["user_id", "idempotency_record_id"], "idempotency_records", ["user_id", "id"]],
] as const;

const assessmentGraphIds = (prefix: string) => ({
  assessmentAttempt: `${prefix}_assessment_attempt`,
  assessmentAttemptIdempotency: `${prefix}_assessment_attempt_idempotency`,
  assessmentExposure: `${prefix}_assessment_exposure`,
  assessmentResult: `${prefix}_assessment_result`,
  assessmentSession: `${prefix}_assessment_session`,
  assessmentSessionIdempotency: `${prefix}_assessment_session_idempotency`,
});

type AssessmentGraph = ReturnType<typeof assessmentGraphIds>;

const readerGraphIds = (prefix: string) => ({
  readerAttempt: `${prefix}_reader_attempt`,
  readerAttemptIdempotency: `${prefix}_reader_attempt_idempotency`,
  readerEvidence: `${prefix}_reader_evidence`,
  readerExposure: `${prefix}_reader_exposure`,
  readerSession: `${prefix}_reader_session`,
  readerSessionIdempotency: `${prefix}_reader_session_idempotency`,
});

type ReaderGraph = ReturnType<typeof readerGraphIds>;

type TenantGraph = AssessmentGraph & ReaderGraph & {
  attempt: string;
  card: string;
  device: string;
  enrollment: string;
  enrollmentOld: string;
  evidenceAttempt: string;
  evidenceSession: string;
  idempotency: string;
  idempotencySpare: string;
  importReceipt: string;
  review: string;
  session: string;
  xp: string;
};

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
    const row = this.statement.get(...this.sqliteParameters()) as Record<string, unknown> | undefined;
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
    if (/^\s*SELECT\b/i.test(this.query)) {
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

const learningState = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Học viên",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "zero",
    onboarded: true,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: {
    pronunciation: 0,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    vocabulary: 0,
    grammar: 0,
  },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: {
    completed: false,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt: null,
  },
  evidence: [],
});

const user = (email: string): ChatGPTUser => ({
  displayName: email.split("@")[0],
  email,
  fullName: null,
});

async function syncOperation(
  ownerKey: string,
  operationId = "sync:test-operation",
  sequence = 1,
  startingLevel: LearningState["profile"]["startingLevel"] = "zero",
): Promise<SyncPushOperationV1> {
  const occurredAt = "2026-07-20T00:00:00.000Z";
  const state = learningState();
  state.profile.startingLevel = startingLevel;
  const withoutHash: Omit<SyncPushOperationV1, "requestHash"> = {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    operationId,
    idempotencyKey: operationId,
    ownerKey,
    installationId: "installation_test",
    deviceId: "device_test",
    deviceSequence: sequence,
    baseRevision: 0,
    kind: "local-import",
    contentVersion: CONTENT_VERSION,
    occurredAt,
    document: createInitialSyncDocument(
      state,
      occurredAt,
      operationId,
    ),
  };
  return {
    ...withoutHash,
    requestHash: await hashSyncPushOperation(withoutHash),
  };
}

function seedAssessmentGraph(
  database: DatabaseSync,
  userId: string,
  prefix: string,
  enrollmentId: string,
  deviceId: string,
): AssessmentGraph {
  const graph = assessmentGraphIds(prefix);
  const formManifest = {
    schemaVersion: 1,
    blueprintId: `${prefix}_blueprint`,
    formVersion: `${prefix}_form_v1`,
    scoringPolicyVersion: `${prefix}_scoring_v1`,
    items: [{
      position: 0,
      itemId: `${prefix}_item`,
      itemVersion: `${prefix}_item_v1`,
      skill: "vocabulary",
      construct: `${prefix}_construct`,
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "Answer-free assessment prompt",
      meta: "Assessment export fixture",
      options: ["learner-response", "alternative"],
    }],
  };
  database.prepare(
    "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES (?, ?, ?, 101, 0, 'assessment-session-open-v1', ?, ?, 'completed', 2, 2)",
  ).run(
    graph.assessmentSessionIdempotency,
    userId,
    deviceId,
    `${prefix}_assessment_open`,
    `${prefix}_assessment_open_hash`,
  );
  database.prepare(
    "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES (?, ?, ?, 102, 0, 'assessment-attempt-v1', ?, ?, 'completed', 2, 2)",
  ).run(
    graph.assessmentAttemptIdempotency,
    userId,
    deviceId,
    `${prefix}_assessment_attempt`,
    `${prefix}_assessment_attempt_hash`,
  );
  database.prepare(
    `INSERT INTO assessment_sessions (
      id, user_id, enrollment_id, device_id, idempotency_record_id,
      schema_version, reset_epoch, content_version, blueprint_id, form_version,
      scoring_policy_version, expected_item_count, form_schema_version,
      form_manifest_json, form_manifest_hash, status,
      measurement_evidence_count, measurement_correct_count, observed_accuracy,
      confidence_lower, confidence_upper, started_at, terminal_at, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, 1, 1, ?, ?, 'submitted',
      1, 1, 100, 21, 100, 2, 3, 2
    )`,
  ).run(
    graph.assessmentSession,
    userId,
    enrollmentId,
    deviceId,
    graph.assessmentSessionIdempotency,
    CONTENT_VERSION,
    formManifest.blueprintId,
    formManifest.formVersion,
    formManifest.scoringPolicyVersion,
    JSON.stringify(formManifest),
    `sha256:${"b".repeat(64)}`,
  );
  database.prepare(
    `INSERT INTO assessment_item_exposures (
      id, user_id, session_id, reset_epoch, content_version, item_id,
      item_version, exposure_group_id, equivalent_group_id, form_family_id,
      exposed_at
    ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 2)`,
  ).run(
    graph.assessmentExposure,
    userId,
    graph.assessmentSession,
    CONTENT_VERSION,
    formManifest.items[0].itemId,
    formManifest.items[0].itemVersion,
    `${prefix}_exposure_group`,
    `${prefix}_equivalent_group`,
    `${prefix}_form_family`,
  );
  database.prepare(
    `INSERT INTO assessment_attempts (
      id, user_id, session_id, device_id, device_sequence,
      idempotency_record_id, schema_version, reset_epoch, content_version,
      position, item_id, item_version, skill, construct, modality,
      measurement_eligible, response_json, outcome, score, occurred_at,
      received_at
    ) VALUES (
      ?, ?, ?, ?, 102, ?, 1, 0, ?, 0, ?, ?, 'vocabulary', ?,
      'visual-selection', 1, ?, 'correct', 100, 2, 2
    )`,
  ).run(
    graph.assessmentAttempt,
    userId,
    graph.assessmentSession,
    deviceId,
    graph.assessmentAttemptIdempotency,
    CONTENT_VERSION,
    formManifest.items[0].itemId,
    formManifest.items[0].itemVersion,
    formManifest.items[0].construct,
    JSON.stringify({ kind: "selection", answer: "learner-response" }),
  );
  database.prepare(
    `INSERT INTO assessment_skill_results (
      id, user_id, session_id, reset_epoch, content_version, skill, status,
      correct_count, evidence_count, observed_accuracy, confidence_lower,
      confidence_upper, mastery_eligible, scoring_policy_version, created_at
    ) VALUES (?, ?, ?, 0, ?, 'vocabulary', 'observed', 1, 1, 100, 21, 100, 0, ?, 3)`,
  ).run(
    graph.assessmentResult,
    userId,
    graph.assessmentSession,
    CONTENT_VERSION,
    formManifest.scoringPolicyVersion,
  );
  return graph;
}

function seedReaderGraph(
  database: DatabaseSync,
  userId: string,
  prefix: string,
  enrollmentId: string,
  deviceId: string,
): ReaderGraph {
  const graph = readerGraphIds(prefix);
  const formManifest = {
    formSchemaVersion: 1,
    storyId: `${prefix}_reader_story`,
    storyVersion: `${prefix}_reader_story_v1`,
    formVersion: `${prefix}_reader_form_v1`,
    script: "simplified",
    supportMode: "unassisted",
    supportPolicyVersion: `${prefix}_reader_support_v1`,
    items: [{
      position: 0,
      itemId: `${prefix}_reader_item`,
      itemVersion: `${prefix}_reader_item_v1`,
      method: "reading-comprehension",
      skill: "reading",
      chineseStimulus: "你好。",
      prompt: "Reader export fixture",
      options: ["learner-response", "alternative"],
      answerExposure: "server-confidential",
      priorExposure: false,
      masteryEligible: true,
    }],
  };
  const formManifestHash = `sha256:${"c".repeat(64)}`;
  database.prepare(
    "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES (?, ?, ?, 201, 0, 'reader-session-open-v1', ?, ?, 'completed', 2, 2)",
  ).run(
    graph.readerSessionIdempotency,
    userId,
    deviceId,
    `${prefix}_reader_open`,
    `${prefix}_reader_open_hash`,
  );
  database.prepare(
    "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES (?, ?, ?, 202, 0, 'reader-attempt-v1', ?, ?, 'completed', 2, 2)",
  ).run(
    graph.readerAttemptIdempotency,
    userId,
    deviceId,
    `${prefix}_reader_attempt`,
    `${prefix}_reader_attempt_hash`,
  );
  database.prepare(
    `INSERT INTO reader_sessions (
      id, user_id, enrollment_id, device_id, idempotency_record_id,
      schema_version, reset_epoch, content_version, story_id, story_version,
      form_version, form_schema_version, form_manifest_json,
      form_manifest_hash, script, support_mode, support_policy_version,
      expected_item_count, status, correct_count, started_at, terminal_at,
      terminal_reason, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, 1, ?, ?, 'simplified',
      'unassisted', ?, 1, 'submitted', 1, 2, 3, 'completed', 2
    )`,
  ).run(
    graph.readerSession,
    userId,
    enrollmentId,
    deviceId,
    graph.readerSessionIdempotency,
    CONTENT_VERSION,
    formManifest.storyId,
    formManifest.storyVersion,
    formManifest.formVersion,
    JSON.stringify(formManifest),
    formManifestHash,
    formManifest.supportPolicyVersion,
  );
  database.prepare(
    `INSERT INTO reader_item_exposures (
      id, user_id, session_id, reset_epoch, content_version, story_id,
      item_id, item_version, exposure_group_id, equivalent_group_id,
      exposed_at
    ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 2)`,
  ).run(
    graph.readerExposure,
    userId,
    graph.readerSession,
    CONTENT_VERSION,
    formManifest.storyId,
    formManifest.items[0].itemId,
    formManifest.items[0].itemVersion,
    `${prefix}_reader_exposure_group`,
    `${prefix}_reader_equivalent_group`,
  );
  database.prepare(
    `INSERT INTO learning_attempts (
      id, user_id, enrollment_id, session_id, device_id, device_sequence,
      idempotency_record_id, schema_version, reset_epoch, content_version,
      activity_id, activity_version, source, method, skill, response_json,
      outcome, score, used_hint, prior_exposure, required_for_pass,
      scoring_version, occurred_at, received_at
    ) VALUES (
      ?, ?, ?, NULL, ?, 202, ?, 1, 0, ?, ?, ?, 'reader',
      'reading-comprehension', 'reading', ?, 'correct', 100, 0, 0, 0,
      ?, 2, 2
    )`,
  ).run(
    graph.readerAttempt,
    userId,
    enrollmentId,
    deviceId,
    graph.readerAttemptIdempotency,
    CONTENT_VERSION,
    `${formManifest.storyId}:${formManifest.items[0].itemId}`,
    formManifest.items[0].itemVersion,
    JSON.stringify({ kind: "selection", answer: "learner-response" }),
    `${prefix}_reader_scoring_v1`,
  );
  database.prepare(
    `INSERT INTO learning_evidence (
      id, user_id, enrollment_id, attempt_id, session_id, schema_version,
      reset_epoch, policy_version, content_version, activity_id,
      activity_version, source, method, skill, outcome, score, verified,
      mastery_eligible, metadata_json, occurred_at, recorded_at
    ) VALUES (
      ?, ?, ?, ?, NULL, 1, 0, ?, ?, ?, ?, 'reader',
      'reading-comprehension', 'reading', 'correct', 100, 1, 1, '{}', 2, 2
    )`,
  ).run(
    graph.readerEvidence,
    userId,
    enrollmentId,
    graph.readerAttempt,
    `${prefix}_reader_scoring_v1`,
    CONTENT_VERSION,
    `${formManifest.storyId}:${formManifest.items[0].itemId}`,
    formManifest.items[0].itemVersion,
  );
  database.prepare(
    `INSERT INTO reader_session_attempts (
      user_id, session_id, attempt_id, reset_epoch, position, item_id,
      item_version, form_manifest_hash, created_at
    ) VALUES (?, ?, ?, 0, 0, ?, ?, ?, 2)`,
  ).run(
    userId,
    graph.readerSession,
    graph.readerAttempt,
    formManifest.items[0].itemId,
    formManifest.items[0].itemVersion,
    formManifestHash,
  );
  return graph;
}

function seedTenantGraph(
  database: DatabaseSync,
  userId: string,
  prefix: string,
): TenantGraph {
  const graph: TenantGraph = {
    ...assessmentGraphIds(prefix),
    ...readerGraphIds(prefix),
    attempt: `${prefix}_attempt`,
    card: `${prefix}_card`,
    device: `${prefix}_device`,
    enrollment: `${prefix}_enrollment`,
    enrollmentOld: `${prefix}_enrollment_old`,
    evidenceAttempt: `${prefix}_evidence_attempt`,
    evidenceSession: `${prefix}_evidence_session`,
    idempotency: `${prefix}_idempotency`,
    idempotencySpare: `${prefix}_idempotency_spare`,
    importReceipt: `${prefix}_import_receipt`,
    review: `${prefix}_review`,
    session: `${prefix}_session`,
    xp: `${prefix}_xp`,
  };

  database.prepare(
    "INSERT INTO devices (id, user_id, installation_id, last_acked_cursor, created_at, last_seen_at) VALUES (?, ?, ?, 0, 1, 1)",
  ).run(graph.device, userId, `${prefix}_installation`);
  database.prepare(
    "INSERT INTO mutation_rate_limits (user_id, scope, policy_version, window_start, request_count, updated_at) VALUES (?, 'fixture.write', 'fixture-v1', 0, 2, 1)",
  ).run(userId);
  database.prepare(
    "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES (?, ?, ?, 1, 0, 'sync.push', ?, ?, 'completed', 1, 1)",
  ).run(
    graph.idempotency,
    userId,
    graph.device,
    `${prefix}_key`,
    `${prefix}_hash`,
  );
  database.prepare(
    "INSERT INTO idempotency_records (id, user_id, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES (?, ?, 'sync.push', ?, ?, 'completed', 1, 1)",
  ).run(
    graph.idempotencySpare,
    userId,
    `${prefix}_spare_key`,
    `${prefix}_spare_hash`,
  );
  database.prepare(
    "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES (?, ?, 'tenant-course-old', 'conversation', 'archived', 1, 1, 1)",
  ).run(graph.enrollmentOld, userId);
  database.prepare(
    "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, supersedes_enrollment_id, revision, started_at, last_activity_at) VALUES (?, ?, ?, 'conversation', 'active', ?, 1, 2, 2)",
  ).run(graph.enrollment, userId, CONTENT_VERSION, graph.enrollmentOld);
  database.prepare(
    "INSERT INTO lesson_sessions (id, user_id, enrollment_id, device_id, idempotency_record_id, schema_version, content_version, lesson_id, lesson_version, expected_evidence_count, form_schema_version, form_script, form_manifest_json, form_manifest_hash, status, started_at, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, 'boot-1', 'v1', 2, 1, 'simplified', ?, ?, 'started', 2, 2)",
  ).run(
    graph.session,
    userId,
    graph.enrollment,
    graph.device,
    graph.idempotency,
    CONTENT_VERSION,
    JSON.stringify({
      schemaVersion: 1,
      script: "simplified",
      activities: [
        { position: 0, activityId: "boot-1:q1" },
        { position: 1, activityId: "boot-1:q2" },
      ],
    }),
    `sha256:${"a".repeat(64)}`,
  );
  seedAssessmentGraph(
    database,
    userId,
    prefix,
    graph.enrollment,
    graph.device,
  );
  seedReaderGraph(
    database,
    userId,
    prefix,
    graph.enrollment,
    graph.device,
  );
  database.prepare(
    "INSERT INTO learning_attempts (id, user_id, enrollment_id, session_id, device_id, idempotency_record_id, schema_version, content_version, activity_id, activity_version, source, method, skill, response_json, outcome, used_hint, prior_exposure, required_for_pass, scoring_version, occurred_at, received_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'boot-1:q1', 'v1', 'lesson', 'multiple-choice', 'vocabulary', '{}', 'correct', 0, 1, 0, 'v1', 2, 2)",
  ).run(
    graph.attempt,
    userId,
    graph.enrollment,
    graph.session,
    graph.device,
    graph.idempotency,
    CONTENT_VERSION,
  );
  database.prepare(
    "INSERT INTO learning_evidence (id, user_id, enrollment_id, attempt_id, schema_version, policy_version, content_version, activity_id, activity_version, source, method, skill, outcome, verified, mastery_eligible, metadata_json, occurred_at, recorded_at) VALUES (?, ?, ?, ?, 1, ?, ?, 'boot-1:q1', 'v1', 'lesson', 'multiple-choice', 'vocabulary', 'correct', 1, 1, '{}', 2, 2)",
  ).run(
    graph.evidenceAttempt,
    userId,
    graph.enrollment,
    graph.attempt,
    `${prefix}_attempt_policy`,
    CONTENT_VERSION,
  );
  database.prepare(
    "INSERT INTO learning_evidence (id, user_id, enrollment_id, session_id, schema_version, policy_version, content_version, activity_id, activity_version, source, method, skill, outcome, verified, mastery_eligible, metadata_json, occurred_at, recorded_at) VALUES (?, ?, ?, ?, 1, ?, ?, 'boot-1', 'v1', 'lesson', 'lesson-completion', 'grammar', 'completed', 1, 0, '{}', 2, 2)",
  ).run(
    graph.evidenceSession,
    userId,
    graph.enrollment,
    graph.session,
    `${prefix}_session_policy`,
    CONTENT_VERSION,
  );
  database.prepare(
    "INSERT INTO fsrs_cards (id, user_id, enrollment_id, content_version, knowledge_item_type, knowledge_item_id, knowledge_item_version, modality, scheduler_version, due_at, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, revision, created_at, updated_at) VALUES (?, ?, ?, ?, 'word', ?, 'v1', 'recognition', 'fsrs-v1', 2, 1, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2)",
  ).run(
    graph.card,
    userId,
    graph.enrollment,
    CONTENT_VERSION,
    `${prefix}_word`,
  );
  database.prepare(
    "INSERT INTO review_logs (id, user_id, card_id, attempt_id, idempotency_record_id, rating, scheduler_version, scheduled_at, reviewed_at, received_at, pre_card_json, post_card_json) VALUES (?, ?, ?, ?, ?, 3, 'fsrs-v1', 2, 2, 2, '{}', '{}')",
  ).run(
    graph.review,
    userId,
    graph.card,
    graph.attempt,
    graph.idempotency,
  );
  database.prepare(
    "INSERT INTO xp_ledger (id, user_id, enrollment_id, idempotency_record_id, source_type, source_id, rule_version, amount, metadata_json, occurred_at, created_at) VALUES (?, ?, ?, ?, 'lesson', ?, 'v1', 5, '{}', 2, 2)",
  ).run(
    graph.xp,
    userId,
    graph.enrollment,
    graph.idempotency,
    graph.session,
  );
  database.prepare(
    "INSERT INTO local_import_receipts (id, user_id, idempotency_record_id, installation_id, source_schema_version, source_content_version, snapshot_hash, status, imported_counts_json, warnings_json, created_at, completed_at) VALUES (?, ?, ?, ?, 2, ?, ?, 'completed', '{}', '[]', 2, 2)",
  ).run(
    graph.importReceipt,
    userId,
    graph.idempotency,
    `${prefix}_installation`,
    CONTENT_VERSION,
    `${prefix}_snapshot`,
  );

  return graph;
}

function tenantForeignKeySignatures(database: DatabaseSync) {
  const childTables = [...new Set(TENANT_RELATIONS.map(([child]) => child))];
  const parentTables = new Set<string>(
    TENANT_RELATIONS.map(([, , parent]) => parent),
  );
  return childTables.flatMap((child) => {
    const rows = database
      .prepare(`PRAGMA foreign_key_list("${child}")`)
      .all() as Array<{
        id: number;
        seq: number;
        table: string;
        from: string;
        to: string;
      }>;
    const byId = new Map<number, typeof rows>();
    for (const row of rows) {
      const group = byId.get(row.id) ?? [];
      group.push(row);
      byId.set(row.id, group);
    }
    return [...byId.values()]
      .map((group) => group.sort((left, right) => left.seq - right.seq))
      .filter((group) => parentTables.has(group[0]!.table))
      .map((group) => [
        child,
        group.map((row) => row.from),
        group[0]!.table,
        group.map((row) => row.to),
      ] as const);
  });
}

describe("D1 sync repository", () => {
  it("persists the expanded HSK3-4 starting-level contract", async () => {
    const d1 = new SQLiteD1();
    const repository = new SyncRepository(d1);
    const userId = await repository.resolveUser(user("hsk4@example.com"));
    const operation = await syncOperation(
      "siwc_hsk4",
      "sync:hsk4-profile",
      1,
      "hsk4",
    );

    await repository.updateProfileProjection(userId, operation.document, 1);

    expect(d1.database.prepare(
      "SELECT starting_level AS startingLevel FROM profiles WHERE user_id = ?",
    ).get(userId)).toEqual({ startingLevel: "hsk4" });
  });

  it("persists a retry-safe document and isolates it by server identity", async () => {
    const d1 = new SQLiteD1();
    const repository = new SyncRepository(d1);
    const userId = await repository.resolveUser(user("one@example.com"));
    const otherUserId = await repository.resolveUser(user("two@example.com"));
    expect(userId).not.toBe(otherUserId);

    const operation = await syncOperation("siwc_test");
    const deviceRecordId = await repository.upsertDevice(userId, operation, 0);
    const claim = await repository.claimIdempotency(
      userId,
      operation,
      deviceRecordId,
    );
    expect(claim.kind).toBe("claimed");
    if (claim.kind !== "claimed") throw new Error("Expected a new claim");

    const committed = await repository.compareAndSwapDocumentAndAppendChange(
      userId,
      0,
      operation.document,
      operation,
    );
    expect(committed).toMatchObject({ revision: 1 });
    if (!committed) throw new Error("Expected a committed document");
    const { revision, cursor } = committed;
    await repository.updateProfileProjection(userId, operation.document, revision);
    await repository.upsertDevice(userId, operation, cursor);
    await repository.recordLocalImport(userId, claim.recordId, operation);
    const response = JSON.stringify({ revision, cursor });
    await repository.completeIdempotency(claim.recordId, claim.leaseToken, response);

    expect((await repository.getLearningDocument(userId))?.revision).toBe(1);
    expect(await repository.getLearningDocument(otherUserId)).toBeNull();
    expect(await repository.getLatestCursor(userId)).toBe(cursor);

    const replayedCommit = await repository.compareAndSwapDocumentAndAppendChange(
      userId,
      revision,
      operation.document,
      operation,
    );
    expect(replayedCommit).toEqual(committed);
    expect((await repository.getLearningDocument(userId))?.revision).toBe(1);
    expect(d1.database.prepare(
      "SELECT COUNT(*) AS count FROM sync_changes WHERE user_id = ? AND operation_id = ?",
    ).get(userId, operation.operationId)).toMatchObject({ count: 1 });

    const duplicate = await repository.claimIdempotency(
      userId,
      operation,
      deviceRecordId,
    );
    expect(duplicate).toMatchObject({
      kind: "duplicate",
      responseJson: response,
    });

    const repeatedDraft = await syncOperation("siwc_test", "sync:repeat-import", 2);
    const { requestHash: _discardedHash, ...repeatedWithoutHash } = {
      ...repeatedDraft,
      document: operation.document,
    };
    const repeatedImport: SyncPushOperationV1 = {
      ...repeatedWithoutHash,
      requestHash: await hashSyncPushOperation(repeatedWithoutHash),
    };
    const repeatedClaim = await repository.claimIdempotency(
      userId,
      repeatedImport,
      deviceRecordId,
    );
    expect(repeatedClaim.kind).toBe("claimed");
    if (repeatedClaim.kind !== "claimed") throw new Error("Expected a repeated-import claim");
    await repository.recordLocalImport(
      userId,
      repeatedClaim.recordId,
      repeatedImport,
    );
    expect(d1.database.prepare(
      "SELECT COUNT(*) AS count FROM local_import_receipts WHERE user_id = ?",
    ).get(userId)).toMatchObject({ count: 1 });

    d1.database.prepare(
      "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, payload_json, status, attempts, available_at, created_at, last_error, lease_token, lease_expires_at) VALUES (?, ?, 'learning_document', ?, 'sync.completed', 1, ?, 'processing', 1, 0, 0, ?, 'private-lease-token', 999999)",
    ).run(
      "outbox_test",
      userId,
      userId,
      JSON.stringify({ operationId: operation.operationId }),
      "internal stack detail",
    );
    d1.database.prepare(
      "INSERT INTO mutation_rate_limits (user_id, scope, policy_version, window_start, request_count, updated_at) VALUES (?, 'fixture.write', 'fixture-v1', 0, 2, 1)",
    ).run(userId);
    d1.database.prepare(
      "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES ('export-enrollment', ?, ?, 'conversation', 'active', 1, 1, 1)",
    ).run(userId, CONTENT_VERSION);
    d1.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('export-session-idempotency', ?, 0, 'lesson-session-v1', 'export-session', 'export-session-hash', 'completed', 1, 1)",
    ).run(userId);
    d1.database.prepare(
      "INSERT INTO lesson_sessions (id, user_id, enrollment_id, idempotency_record_id, schema_version, content_version, lesson_id, lesson_version, expected_evidence_count, form_schema_version, form_script, form_manifest_json, form_manifest_hash, status, raw_score, gate_score, required_evidence_count, required_correct_count, passed, started_at, submitted_at, created_at) VALUES ('export-session', ?, ?, 'export-session-idempotency', 1, ?, 'boot-1', 'v1', 1, 1, 'simplified', ?, ?, 'submitted', 100, 100, 1, 1, 1, 1, 2, 1)",
    ).run(
      userId,
      "export-enrollment",
      CONTENT_VERSION,
      JSON.stringify({
        schemaVersion: 1,
        script: "simplified",
        activities: [{ position: 0, activityId: "boot-1:q1" }],
      }),
      `sha256:${"a".repeat(64)}`,
    );
    d1.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES ('export-review-idempotency', ?, ?, 99, 0, 'learning-review-v1', 'export-review', 'review-hash', 'completed', 201, '{\"private\":\"receipt\"}', 2, 2, 2)",
    ).run(userId, deviceRecordId);
    d1.database.prepare(
      "INSERT INTO fsrs_cards (id, user_id, enrollment_id, activation_session_id, reset_epoch, content_version, knowledge_item_type, knowledge_item_id, knowledge_item_version, modality, scheduler_version, due_at, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, revision, created_at, updated_at) VALUES ('export-review-card', ?, 'export-enrollment', 'export-session', 0, ?, 'vocabulary', 'ni', 'word-v1', 'hanzi-reading-meaning-recall', 'scheduler-v1', 1, 1, 1, 0, 0, 0, 1, 0, 1, 2, 1, 2)",
    ).run(userId, CONTENT_VERSION);
    d1.database.prepare(
      "INSERT INTO learning_attempts (id, user_id, enrollment_id, session_id, device_id, device_sequence, idempotency_record_id, schema_version, reset_epoch, content_version, activity_id, activity_version, source, method, skill, response_json, outcome, score, used_hint, prior_exposure, required_for_pass, scoring_version, occurred_at, received_at) VALUES ('export-review-attempt', ?, 'export-enrollment', NULL, ?, 99, 'export-review-idempotency', 1, 0, ?, 'review:ni', 'word-v1', 'review', 'fsrs-rating', 'vocabulary', '{\"rating\":3}', 'unverified', NULL, 0, 1, 0, 'scheduler-v1', 2, 2)",
    ).run(userId, deviceRecordId, CONTENT_VERSION);
    d1.database.prepare(
      "INSERT INTO learning_evidence (id, user_id, enrollment_id, attempt_id, session_id, schema_version, reset_epoch, policy_version, content_version, activity_id, activity_version, source, method, skill, outcome, score, verified, mastery_eligible, metadata_json, occurred_at, recorded_at) VALUES ('export-review-evidence', ?, 'export-enrollment', 'export-review-attempt', NULL, 1, 0, 'scheduler-v1', ?, 'review:ni', 'word-v1', 'review', 'fsrs-rating', 'vocabulary', 'unverified', NULL, 0, 0, '{\"masteryEligible\":false}', 2, 2)",
    ).run(userId, CONTENT_VERSION);
    d1.database.prepare(
      "INSERT INTO review_logs (id, user_id, card_id, attempt_id, idempotency_record_id, reset_epoch, rating, scheduler_version, scheduled_at, reviewed_at, received_at, pre_card_json, post_card_json) VALUES ('export-review-log', ?, 'export-review-card', 'export-review-attempt', 'export-review-idempotency', 0, 3, 'scheduler-v1', 1, 2, 2, '{\"revision\":1}', '{\"revision\":2}')",
    ).run(userId);
    const assessmentGraph = seedAssessmentGraph(
      d1.database,
      userId,
      "export",
      "export-enrollment",
      deviceRecordId,
    );
    const readerGraph = seedReaderGraph(
      d1.database,
      userId,
      "export",
      "export-enrollment",
      deviceRecordId,
    );
    const exported = await repository.exportAccountData(userId);
    expect(Object.keys(exported.tables)).toEqual([...ACCOUNT_EXPORT_TABLES]);
    expect(exported.rowCount).toBe(
      Object.values(exported.tables).reduce((total, rows) => total + rows.length, 0),
    );
    expect(exported.tables.learning_documents).toHaveLength(1);
    expect(exported.tables.mutation_rate_limits).toEqual([
      expect.objectContaining({
        user_id: userId,
        scope: "fixture.write",
        policy_version: "fixture-v1",
        request_count: 2,
      }),
    ]);
    expect(exported.tables.learning_documents[0]?.document_json).toMatchObject({
      schemaVersion: 1,
      state: { contentVersion: CONTENT_VERSION },
    });
    expect(exported.tables.lesson_sessions[0]?.form_manifest_json).toMatchObject({
      schemaVersion: 1,
      script: "simplified",
      activities: expect.any(Array),
    });
    expect(exported.tables.assessment_sessions).toEqual([
      expect.objectContaining({
        id: assessmentGraph.assessmentSession,
        form_manifest_json: expect.objectContaining({
          schemaVersion: 1,
          items: expect.any(Array),
        }),
        measurement_evidence_count: 1,
        measurement_correct_count: 1,
      }),
    ]);
    expect(exported.tables.assessment_item_exposures).toHaveLength(1);
    expect(exported.tables.assessment_attempts).toEqual([
      expect.objectContaining({
        id: assessmentGraph.assessmentAttempt,
        response_json: {
          kind: "selection",
          answer: "learner-response",
        },
      }),
    ]);
    expect(exported.tables.assessment_attempts[0]).not.toHaveProperty("outcome");
    expect(exported.tables.assessment_attempts[0]).not.toHaveProperty("score");
    expect(exported.tables.assessment_skill_results).toEqual([
      expect.objectContaining({
        id: assessmentGraph.assessmentResult,
        status: "observed",
        observed_accuracy: 100,
        mastery_eligible: 0,
      }),
    ]);
    expect(exported.tables.reader_sessions).toEqual([
      expect.objectContaining({
        id: readerGraph.readerSession,
        form_manifest_json: expect.objectContaining({
          formSchemaVersion: 1,
          storyId: "export_reader_story",
          items: expect.any(Array),
        }),
        status: "submitted",
        correct_count: 1,
      }),
    ]);
    expect(exported.tables.reader_item_exposures).toEqual([
      expect.objectContaining({
        id: readerGraph.readerExposure,
        session_id: readerGraph.readerSession,
        item_version: "export_reader_item_v1",
      }),
    ]);
    expect(exported.tables.reader_session_attempts).toEqual([
      expect.objectContaining({
        user_id: userId,
        session_id: readerGraph.readerSession,
        attempt_id: readerGraph.readerAttempt,
        position: 0,
      }),
    ]);
    expect(exported.tables.learning_attempts).toContainEqual(
      expect.objectContaining({
        id: readerGraph.readerAttempt,
        source: "reader",
        skill: "reading",
        response_json: {
          kind: "selection",
          answer: "learner-response",
        },
      }),
    );
    expect(exported.tables.fsrs_cards).toEqual([
      expect.objectContaining({
        id: "export-review-card",
        activation_session_id: "export-session",
        reset_epoch: 0,
        revision: 2,
      }),
    ]);
    expect(exported.tables.learning_attempts).toContainEqual(
      expect.objectContaining({
        id: "export-review-attempt",
        source: "review",
        method: "fsrs-rating",
        outcome: "unverified",
        score: null,
        response_json: { rating: 3 },
      }),
    );
    expect(exported.tables.learning_evidence).toContainEqual(
      expect.objectContaining({
        id: "export-review-evidence",
        verified: 0,
        mastery_eligible: 0,
      }),
    );
    expect(exported.tables.review_logs).toEqual([
      expect.objectContaining({
        id: "export-review-log",
        rating: 3,
        pre_card_json: { revision: 1 },
        post_card_json: { revision: 2 },
      }),
    ]);
    expect(JSON.stringify({
      sessions: exported.tables.assessment_sessions,
      attempts: exported.tables.assessment_attempts,
      results: exported.tables.assessment_skill_results,
      readerSessions: exported.tables.reader_sessions,
    })).not.toMatch(/correctAnswer|answerKey|explanation/u);
    expect(exported.tables.idempotency_records[0]).not.toHaveProperty("request_hash");
    expect(exported.tables.idempotency_records[0]).not.toHaveProperty("lease_token");
    expect(exported.tables.idempotency_records[0]).not.toHaveProperty("lease_expires_at");
    expect(exported.tables.idempotency_records[0]).not.toHaveProperty("response_json");
    expect(exported.tables.auth_identities[0]).not.toHaveProperty("provider_subject");
    expect(exported.tables.outbox_events[0]).not.toHaveProperty("last_error");
    expect(exported.tables.outbox_events[0]).not.toHaveProperty("lease_token");
    expect(exported.tables.outbox_events[0]).not.toHaveProperty("lease_expires_at");
    expect(exported.tables.outbox_events[0]?.payload_json).toEqual({
      operationId: operation.operationId,
    });
    expect(Object.values(exported.tables).flat().some(
      (row) => row.user_id === otherUserId,
    )).toBe(false);
  });

  it("atomically invalidates active sessions and pending events when reset wins", async () => {
    const d1 = new SQLiteD1();
    const repository = new SyncRepository(d1);
    const userId = await repository.resolveUser(user("reset@example.com"));
    const initial = await syncOperation("siwc_reset", "sync:initial", 1);
    const committed = await repository.compareAndSwapDocumentAndAppendChange(
      userId,
      0,
      initial.document,
      initial,
    );
    expect(committed).toMatchObject({ revision: 1 });

    d1.database.prepare(
      "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES ('reset-enrollment', ?, ?, 'conversation', 'active', 1, 1, 1)",
    ).run(userId, CONTENT_VERSION);
    d1.database.prepare(
      "INSERT INTO devices (id, user_id, installation_id, last_acked_cursor, created_at, last_seen_at) VALUES ('reset-device', ?, 'reset-installation', 0, 1, 1)",
    ).run(userId);
    d1.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('reset-session-idempotency', ?, 0, 'lesson-session-v1', 'reset-session-open', 'fixture', 'completed', 1, 1)",
    ).run(userId);
    d1.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('reset-reader-idempotency', ?, 'reset-device', 1, 0, 'reader-session-open-v1', 'reset-reader-open', 'fixture', 'completed', 1, 1)",
    ).run(userId);
    d1.database.prepare(
      "INSERT INTO lesson_sessions (id, user_id, enrollment_id, idempotency_record_id, schema_version, reset_epoch, content_version, lesson_id, lesson_version, expected_evidence_count, status, started_at, created_at) VALUES ('reset-session', ?, 'reset-enrollment', 'reset-session-idempotency', 1, 0, ?, 'boot-1', 'v1', 1, 'started', 1, 1)",
    ).run(userId, CONTENT_VERSION);
    d1.database.prepare(
      "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at, lease_token, lease_expires_at) VALUES ('reset-event', ?, 'lesson_session', 'reset-session', 'lesson.started', 1, 0, '{}', 'processing', 1, 1, 1, 'reset-lease', 999999)",
    ).run(userId);
    d1.database.prepare(
      `INSERT INTO reader_sessions (
        id, user_id, enrollment_id, device_id, idempotency_record_id,
        schema_version, reset_epoch, content_version, story_id, story_version,
        form_version, form_schema_version, form_manifest_json,
        form_manifest_hash, script, support_mode, support_policy_version,
        expected_item_count, status, started_at, created_at
      ) VALUES (
        'reset-reader-session', ?, 'reset-enrollment', 'reset-device',
        'reset-reader-idempotency', 1, 0, ?, 'reset-story',
        'reset-story-v1', 'reset-form-v1', 1, ?, ?, 'simplified',
        'unassisted', 'reset-support-v1', 1, 'started', 1, 1
      )`,
    ).run(
      userId,
      CONTENT_VERSION,
      JSON.stringify({
        formSchemaVersion: 1,
        storyId: "reset-story",
        storyVersion: "reset-story-v1",
        formVersion: "reset-form-v1",
        script: "simplified",
        supportMode: "unassisted",
        supportPolicyVersion: "reset-support-v1",
        items: [{ position: 0, itemId: "reset-reader-item" }],
      }),
      `sha256:${"d".repeat(64)}`,
    );
    d1.database.prepare(
      "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at) VALUES ('reset-reader-event', ?, 'reader_session', 'reset-reader-session', 'reader.started', 1, 0, '{}', 'pending', 0, 1, 1)",
    ).run(userId);

    const resetDocument = evolveSyncDocument(
      initial.document,
      learningState(),
      learningState(),
      "2026-07-20T00:01:00.000Z",
      "sync:reset",
      "reset",
    );
    const withoutHash: Omit<SyncPushOperationV1, "requestHash"> = {
      ...initial,
      operationId: "sync:reset",
      idempotencyKey: "sync:reset",
      deviceSequence: 2,
      baseRevision: 1,
      kind: "reset",
      occurredAt: "2026-07-20T00:01:00.000Z",
      document: resetDocument,
    };
    const resetOperation: SyncPushOperationV1 = {
      ...withoutHash,
      requestHash: await hashSyncPushOperation(withoutHash),
    };
    await expect(repository.compareAndSwapDocumentAndAppendChange(
      userId,
      1,
      resetDocument,
      resetOperation,
    )).resolves.toMatchObject({ revision: 2 });
    expect(d1.database.prepare(
      "SELECT status FROM lesson_sessions WHERE id = 'reset-session'",
    ).get()).toEqual({ status: "invalidated" });
    expect(d1.database.prepare(
      "SELECT status, terminal_reason AS terminalReason, terminal_at AS terminalAt FROM reader_sessions WHERE id = 'reset-reader-session'",
    ).get()).toEqual({
      status: "abandoned",
      terminalReason: "reset-invalidated",
      terminalAt: expect.any(Number),
    });
    expect(d1.database.prepare(
      "SELECT status, last_error AS lastError, lease_token AS leaseToken, lease_expires_at AS leaseExpiresAt FROM outbox_events WHERE id = 'reset-event'",
    ).get()).toEqual({
      status: "dead",
      lastError: "invalidated-by-learning-reset",
      leaseToken: null,
      leaseExpiresAt: null,
    });
    expect(d1.database.prepare(
      "SELECT status, last_error AS lastError FROM outbox_events WHERE id = 'reset-reader-event'",
    ).get()).toEqual({
      status: "dead",
      lastError: "invalidated-by-learning-reset",
    });
  });

  it("rejects request-hash reuse and device-sequence reuse", async () => {
    const repository = new SyncRepository(new SQLiteD1());
    const userId = await repository.resolveUser(user("one@example.com"));
    const original = await syncOperation("siwc_test");
    const deviceRecordId = await repository.upsertDevice(userId, original, 0);
    expect((await repository.claimIdempotency(
      userId,
      original,
      deviceRecordId,
    )).kind).toBe("claimed");

    expect((await repository.claimIdempotency(
      userId,
      { ...original, requestHash: "different" },
      deviceRecordId,
    )).kind).toBe("hash-conflict");

    const reusedSequence = await syncOperation("siwc_test", "sync:second", 1);
    expect((await repository.claimIdempotency(
      userId,
      reusedSequence,
      deviceRecordId,
    )).kind).toBe("sequence-conflict");
  });

  it("leases processing records so only one retry can resume them", async () => {
    const d1 = new SQLiteD1();
    const repository = new SyncRepository(d1);
    const userId = await repository.resolveUser(user("lease@example.com"));
    const operation = await syncOperation("siwc_test");
    const deviceRecordId = await repository.upsertDevice(userId, operation, 0);
    const first = await repository.claimIdempotency(
      userId,
      operation,
      deviceRecordId,
    );
    expect(first.kind).toBe("claimed");

    expect((await repository.claimIdempotency(
      userId,
      operation,
      deviceRecordId,
    )).kind).toBe("in-flight");

    d1.database.prepare(
      "UPDATE idempotency_records SET lease_expires_at = 0 WHERE user_id = ? AND idempotency_key = ?",
    ).run(userId, operation.operationId);
    const resumed = await repository.claimIdempotency(
      userId,
      operation,
      deviceRecordId,
    );
    expect(resumed).toMatchObject({ kind: "resume" });
    if (first.kind === "claimed" && resumed.kind === "resume") {
      expect(resumed.leaseToken).not.toBe(first.leaseToken);
    }
  });

  it("refuses to persist client-invented curriculum versions", async () => {
    const d1 = new SQLiteD1();
    const repository = new SyncRepository(d1);
    const userId = await repository.resolveUser(user("version@example.com"));
    const operation = await syncOperation("siwc_test");
    const unsupported: SyncPushOperationV1 = {
      ...operation,
      contentVersion: "client-invented-version",
      document: {
        ...operation.document,
        state: {
          ...operation.document.state,
          contentVersion: "client-invented-version",
        },
      },
    };
    await expect(repository.compareAndSwapDocumentAndAppendChange(
      userId,
      0,
      unsupported.document,
      unsupported,
    )).rejects.toThrow("Unsupported content version");
    expect(d1.database.prepare(
      "SELECT COUNT(*) AS count FROM course_versions",
    ).get()).toMatchObject({ count: 0 });
  });

  it("uses composite tenant keys for every relation to a user-owned parent", () => {
    const d1 = new SQLiteD1();
    const actual = tenantForeignKeySignatures(d1.database)
      .map((relation) => JSON.stringify(relation))
      .sort();
    const expected = TENANT_RELATIONS
      .map((relation) => JSON.stringify(relation))
      .sort();
    expect(actual).toEqual(expected);

    const parentTables = new Set(TENANT_RELATIONS.map(([, , parent]) => parent));
    for (const table of parentTables) {
      const indexes = d1.database
        .prepare(`PRAGMA index_list("${table}")`)
        .all() as Array<{ name: string; unique: number }>;
      const uniqueColumnSets = indexes
        .filter((index) => index.unique === 1)
        .map((index) => d1.database
          .prepare(`PRAGMA index_info("${index.name}")`)
          .all() as Array<{ name: string; seqno: number }>)
        .map((columns) => columns
          .sort((left, right) => left.seqno - right.seqno)
          .map((column) => column.name));
      expect(uniqueColumnSets).toContainEqual(["user_id", "id"]);
    }
  });

  it("enforces reset-epoch, session-state, and duplicate-activity invariants in SQLite", async () => {
    const d1 = new SQLiteD1();
    const repository = new SyncRepository(d1);
    const userId = await repository.resolveUser(user("epoch-invariants@example.com"));
    await repository.ensureCourseVersion();
    d1.database.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES ('tenant-course-old', 'hanzi-os-core', 1, 'tenant-old-hash', 'retired', 'approved', 1)",
    ).run();
    const graph = seedTenantGraph(d1.database, userId, "epoch_invariants");

    d1.database.prepare(
      "UPDATE assessment_attempts SET occurred_at = received_at + 300000 WHERE id = ?",
    ).run(graph.assessmentAttempt);
    expect(() => d1.database.prepare(
      "UPDATE assessment_attempts SET occurred_at = received_at + 300001 WHERE id = ?",
    ).run(graph.assessmentAttempt)).toThrow(/assessment_attempts_time_check/u);
    expect(() => d1.database.prepare(
      "UPDATE learning_attempts SET reset_epoch = 1 WHERE id = ?",
    ).run(graph.attempt)).toThrow(/FOREIGN KEY constraint failed/u);
    expect(() => d1.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('epoch-too-large', ?, 2147483648, 'fixture', 'epoch-too-large', 'fixture', 'completed', 1, 1)",
    ).run(userId)).toThrow(/idempotency_records_reset_epoch_check/u);
    d1.database.prepare(
      "INSERT INTO sync_changes (user_id, entity_type, entity_id, revision, operation_id, operation, occurred_at) VALUES (?, 'learning_document', ?, 1, 'legacy-null-epoch-change', 'upsert', 1)",
    ).run(userId, userId);
    expect(d1.database.prepare(
      "SELECT reset_epoch AS resetEpoch FROM sync_changes WHERE operation_id = 'legacy-null-epoch-change'",
    ).get()).toEqual({ resetEpoch: null });
    for (const [operationId, resetEpoch] of [
      ["negative-epoch-change", -1],
      ["overflow-epoch-change", 2_147_483_648],
    ] as const) {
      expect(() => d1.database.prepare(
        "INSERT INTO sync_changes (user_id, entity_type, entity_id, revision, reset_epoch, operation_id, operation, occurred_at) VALUES (?, 'learning_attempt', 'invalid-epoch', 1, ?, ?, 'upsert', 1)",
      ).run(userId, resetEpoch, operationId)).toThrow(
        /sync_changes_reset_epoch_check/u,
      );
    }
    expect(d1.database.prepare(
      "PRAGMA index_info('sync_changes_user_reset_epoch_seq_idx')",
    ).all().map((column) => column.name)).toEqual([
      "user_id",
      "reset_epoch",
      "seq",
    ]);
    expect(() => d1.database.prepare(
      "UPDATE lesson_sessions SET status = 'submitted' WHERE id = ?",
    ).run(graph.session)).toThrow(/lesson_sessions_state_coherence_check/u);
    expect(() => d1.database.prepare(
      "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at) VALUES ('wrong-epoch-event', ?, 'lesson_session', ?, 'lesson.started', 1, 1, '{}', 'pending', 0, 1, 1)",
    ).run(userId, graph.session)).toThrow(
      "outbox event reset epoch does not match its aggregate",
    );
    expect(() => d1.database.prepare(
      "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at) VALUES ('wrong-reader-epoch-event', ?, 'reader_session', ?, 'reader.submitted', 1, 1, '{}', 'pending', 0, 1, 1)",
    ).run(userId, graph.readerSession)).toThrow(
      "reader outbox event reset epoch does not match its aggregate",
    );

    d1.database.prepare(
      "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES ('duplicate-activity-idempotency', ?, 0, 'learning-attempt-v1', 'duplicate-activity', 'fixture', 'completed', 1, 1)",
    ).run(userId);
    d1.database.prepare(
      "INSERT INTO learning_attempts (id, user_id, enrollment_id, session_id, idempotency_record_id, schema_version, reset_epoch, content_version, activity_id, activity_version, source, method, skill, response_json, outcome, used_hint, prior_exposure, required_for_pass, scoring_version, occurred_at, received_at) VALUES ('duplicate-activity-attempt', ?, ?, ?, 'duplicate-activity-idempotency', 1, 0, ?, 'boot-1:q2', 'v1', 'lesson', 'meaning-selection', 'vocabulary', '{}', 'incorrect', 0, 0, 0, 'v1', 3, 3)",
    ).run(userId, graph.enrollment, graph.session, CONTENT_VERSION);
    expect(() => d1.database.prepare(
      "UPDATE learning_attempts SET activity_id = 'boot-1:q1' WHERE id = 'duplicate-activity-attempt'",
    ).run()).toThrow(/UNIQUE constraint failed/u);

    d1.database.prepare(
      "UPDATE lesson_sessions SET status = 'abandoned' WHERE id = ?",
    ).run(graph.session);
    expect(() => d1.database.prepare(
      "UPDATE lesson_sessions SET status = 'started' WHERE id = ?",
    ).run(graph.session)).toThrow("lesson session status transition is invalid");
    expect(() => d1.database.prepare(
      "UPDATE reader_sessions SET status = 'started' WHERE id = ?",
    ).run(graph.readerSession)).toThrow(
      "reader session status transition is invalid",
    );
  });

  it("rejects every cross-user child link and cascades only the deleted tenant", async () => {
    const d1 = new SQLiteD1();
    const repository = new SyncRepository(d1);
    const userA = await repository.resolveUser(user("tenant-a@example.com"));
    const userB = await repository.resolveUser(user("tenant-b@example.com"));
    await repository.ensureCourseVersion();
    d1.database.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES ('tenant-course-old', 'hanzi-os-core', 1, 'tenant-old-hash', 'retired', 'approved', 1)",
    ).run();

    const graphA = seedTenantGraph(d1.database, userA, "tenant_a");
    const graphB = seedTenantGraph(d1.database, userB, "tenant_b");
    const crossTenantUpdates = [
      ["enrollments", "supersedes_enrollment_id", graphA.enrollment, graphB.enrollmentOld],
      ["idempotency_records", "device_id", graphA.idempotency, graphB.device],
      ["lesson_sessions", "enrollment_id", graphA.session, graphB.enrollment],
      ["lesson_sessions", "device_id", graphA.session, graphB.device],
      ["lesson_sessions", "idempotency_record_id", graphA.session, graphB.idempotencySpare],
      ["reader_sessions", "enrollment_id", graphA.readerSession, graphB.enrollment],
      ["reader_sessions", "device_id", graphA.readerSession, graphB.device],
      ["reader_sessions", "idempotency_record_id", graphA.readerSession, graphB.idempotencySpare],
      ["reader_item_exposures", "session_id", graphA.readerExposure, graphB.readerSession],
      ["assessment_sessions", "enrollment_id", graphA.assessmentSession, graphB.enrollment],
      ["assessment_sessions", "device_id", graphA.assessmentSession, graphB.device],
      ["assessment_sessions", "idempotency_record_id", graphA.assessmentSession, graphB.idempotencySpare],
      ["assessment_item_exposures", "session_id", graphA.assessmentExposure, graphB.assessmentSession],
      ["assessment_attempts", "session_id", graphA.assessmentAttempt, graphB.assessmentSession],
      ["assessment_attempts", "device_id", graphA.assessmentAttempt, graphB.device],
      ["assessment_attempts", "idempotency_record_id", graphA.assessmentAttempt, graphB.idempotencySpare],
      ["assessment_skill_results", "session_id", graphA.assessmentResult, graphB.assessmentSession],
      ["learning_attempts", "enrollment_id", graphA.attempt, graphB.enrollment],
      ["learning_attempts", "session_id", graphA.attempt, graphB.session],
      ["learning_attempts", "device_id", graphA.attempt, graphB.device],
      ["learning_attempts", "idempotency_record_id", graphA.attempt, graphB.idempotencySpare],
      ["learning_evidence", "enrollment_id", graphA.evidenceAttempt, graphB.enrollment],
      ["learning_evidence", "attempt_id", graphA.evidenceAttempt, graphB.attempt],
      ["learning_evidence", "session_id", graphA.evidenceSession, graphB.session],
      ["fsrs_cards", "enrollment_id", graphA.card, graphB.enrollment],
      ["review_logs", "card_id", graphA.review, graphB.card],
      ["review_logs", "attempt_id", graphA.review, graphB.attempt],
      ["review_logs", "idempotency_record_id", graphA.review, graphB.idempotencySpare],
      ["xp_ledger", "enrollment_id", graphA.xp, graphB.enrollment],
      ["xp_ledger", "idempotency_record_id", graphA.xp, graphB.idempotencySpare],
      ["local_import_receipts", "idempotency_record_id", graphA.importReceipt, graphB.idempotencySpare],
    ] as const;

    for (const [table, column, childId, crossTenantParentId] of crossTenantUpdates) {
      expect(() => d1.database
        .prepare(`UPDATE "${table}" SET "${column}" = ? WHERE id = ?`)
        .run(crossTenantParentId, childId))
        .toThrow(/FOREIGN KEY constraint failed/u);
    }
    expect(() => d1.database.prepare(
      "UPDATE reader_session_attempts SET attempt_id = ? WHERE user_id = ? AND session_id = ?",
    ).run(
      graphB.readerAttempt,
      userA,
      graphA.readerSession,
    )).toThrow(/FOREIGN KEY constraint failed/u);
    expect(() => d1.database.prepare(
      "UPDATE reader_session_attempts SET session_id = ? WHERE user_id = ? AND session_id = ?",
    ).run(
      graphB.readerSession,
      userA,
      graphA.readerSession,
    )).toThrow(/FOREIGN KEY constraint failed/u);

    const tenantTables = ACCOUNT_EXPORT_TABLES.filter((table) => table !== "users");
    const countRows = (table: typeof tenantTables[number], userId: string) =>
      Number((d1.database
        .prepare(`SELECT COUNT(*) AS count FROM "${table}" WHERE user_id = ?`)
        .get(userId) as { count: number }).count);
    const userABeforeDelete = Object.fromEntries(
      tenantTables.map((table) => [table, countRows(table, userA)]),
    );
    for (const table of [
      "assessment_sessions",
      "assessment_item_exposures",
      "assessment_attempts",
      "assessment_skill_results",
      "reader_sessions",
      "reader_item_exposures",
      "reader_session_attempts",
    ] as const) {
      expect(countRows(table, userB), `${table} fixture was not seeded`).toBe(1);
    }

    await expect(repository.deleteAccount(userB)).resolves.toBe(true);
    for (const table of tenantTables) {
      expect(countRows(table, userB), `${table} retained deleted-tenant rows`).toBe(0);
      expect(countRows(table, userA), `${table} changed for the other tenant`)
        .toBe(userABeforeDelete[table]);
    }
    expect(d1.database.prepare(
      "SELECT id FROM users ORDER BY id",
    ).all()).toEqual([{ id: userA }]);
  });
});
