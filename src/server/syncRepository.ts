import type { ChatGPTUser } from "../../app/chatgpt-auth";
import { CONTENT_VERSION } from "../data/curriculum";
import { canonicalStringify, sha256Hex } from "../sync/document";
import type { CloudSyncDocumentV1 } from "../sync/types";
import type { SyncPushOperationV1 } from "../sync/protocol";
import type { D1Database } from "./d1";
import { ensureCurrentCourseVersion } from "./courseVersionRepository";

const IDENTITY_PROVIDER = "chatgpt";
const IDEMPOTENCY_SCOPE = "learning-sync-v1";
const IDEMPOTENCY_LEASE_MS = 60_000;

export type StoredLearningDocument = {
  revision: number;
  document: CloudSyncDocumentV1;
  contentVersion: string;
  updatedAt: number;
};

export type ExistingIdempotency = {
  id: string;
  requestHash: string;
  status: "processing" | "completed" | "failed";
  leaseExpiresAt: number | null;
  responseJson: string | null;
};

export type IdempotencyClaim =
  | { kind: "claimed"; recordId: string; leaseToken: string }
  | { kind: "resume"; recordId: string; leaseToken: string }
  | { kind: "in-flight"; retryAfterMs: number }
  | { kind: "duplicate"; recordId: string; responseJson: string }
  | { kind: "hash-conflict" }
  | { kind: "sequence-conflict" };

export type AppliedSyncOperation = {
  revision: number;
  cursor: number;
};

export const ACCOUNT_EXPORT_SCHEMA_VERSION = 5 as const;

export const ACCOUNT_EXPORT_TABLES = [
  "users",
  "auth_identities",
  "profiles",
  "devices",
  "mutation_rate_limits",
  "enrollments",
  "idempotency_records",
  "learning_documents",
  "lesson_sessions",
  "reader_sessions",
  "reader_item_exposures",
  "assessment_sessions",
  "assessment_item_exposures",
  "assessment_attempts",
  "assessment_skill_results",
  "learning_attempts",
  "reader_session_attempts",
  "learning_evidence",
  "fsrs_cards",
  "review_logs",
  "xp_ledger",
  "sync_changes",
  "outbox_events",
  "local_import_receipts",
] as const;

export type AccountExportTableName = typeof ACCOUNT_EXPORT_TABLES[number];

export type AccountDataExport = {
  tables: Record<AccountExportTableName, Array<Record<string, unknown>>>;
  rowCount: number;
};

const EXPORT_OMITTED_COLUMNS: Partial<Record<
  AccountExportTableName,
  ReadonlySet<string>
>> = {
  auth_identities: new Set(["provider_subject"]),
  idempotency_records: new Set([
    "request_hash",
    "lease_token",
    "lease_expires_at",
    "response_json",
  ]),
  assessment_attempts: new Set(["outcome", "score"]),
  outbox_events: new Set([
    "last_error",
    "lease_token",
    "lease_expires_at",
  ]),
};

const EXPORT_JSON_COLUMNS: Partial<Record<
  AccountExportTableName,
  ReadonlySet<string>
>> = {
  learning_documents: new Set(["document_json"]),
  lesson_sessions: new Set(["form_manifest_json"]),
  reader_sessions: new Set(["form_manifest_json"]),
  assessment_sessions: new Set(["form_manifest_json"]),
  assessment_attempts: new Set(["response_json"]),
  learning_attempts: new Set(["response_json"]),
  learning_evidence: new Set(["metadata_json"]),
  review_logs: new Set(["pre_card_json", "post_card_json"]),
  xp_ledger: new Set(["metadata_json"]),
  sync_changes: new Set(["payload_json"]),
  outbox_events: new Set(["payload_json"]),
  local_import_receipts: new Set(["imported_counts_json", "warnings_json"]),
};

const parseDocument = (raw: string): CloudSyncDocumentV1 => {
  const document: unknown = JSON.parse(raw);
  if (!document || typeof document !== "object" || (document as { schemaVersion?: unknown }).schemaVersion !== 1) {
    throw new Error("Stored cloud document has an unsupported schema version.");
  }
  return document as CloudSyncDocumentV1;
};

const nowEpoch = () => Date.now();

const decodeExportRow = (
  table: AccountExportTableName,
  row: Record<string, unknown>,
) => {
  const omitted = EXPORT_OMITTED_COLUMNS[table];
  const jsonColumns = EXPORT_JSON_COLUMNS[table];
  const decoded: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row)) {
    if (omitted?.has(column)) continue;
    if (jsonColumns?.has(column) && typeof value === "string") {
      try {
        decoded[column] = JSON.parse(value) as unknown;
        continue;
      } catch {
        // Preserve corrupt legacy data verbatim so an export never hides it.
      }
    }
    decoded[column] = value;
  }
  return decoded;
};

export class SyncRepository {
  constructor(private readonly database: D1Database) {}

  async resolveUser(identity: ChatGPTUser): Promise<string> {
    const providerSubject = identity.email.trim().toLowerCase();
    const existing = await this.database
      .prepare(
        "SELECT user_id AS userId FROM auth_identities WHERE provider = ? AND provider_subject = ? LIMIT 1",
      )
      .bind(IDENTITY_PROVIDER, providerSubject)
      .first<{ userId: string }>();
    if (existing) {
      await this.touchIdentity(existing.userId, identity, providerSubject);
      return existing.userId;
    }

    const userId = crypto.randomUUID();
    const identityId = crypto.randomUUID();
    const timestamp = nowEpoch();
    try {
      await this.database.batch([
        this.database
          .prepare(
            "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
          )
          .bind(userId, timestamp, timestamp),
        this.database
          .prepare(
            "INSERT INTO auth_identities (id, user_id, provider, provider_subject, normalized_email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
          )
          .bind(
            identityId,
            userId,
            IDENTITY_PROVIDER,
            providerSubject,
            providerSubject,
            timestamp,
            timestamp,
          ),
      ]);
      return userId;
    } catch {
      const winner = await this.database
        .prepare(
          "SELECT user_id AS userId FROM auth_identities WHERE provider = ? AND provider_subject = ? LIMIT 1",
        )
        .bind(IDENTITY_PROVIDER, providerSubject)
        .first<{ userId: string }>();
      if (!winner) throw new Error("Unable to establish the authenticated user.");
      await this.touchIdentity(winner.userId, identity, providerSubject);
      return winner.userId;
    }
  }

  async getLearningDocument(userId: string): Promise<StoredLearningDocument | null> {
    const row = await this.database
      .prepare(
        "SELECT revision, document_json AS documentJson, content_version AS contentVersion, updated_at AS updatedAt FROM learning_documents WHERE user_id = ? LIMIT 1",
      )
      .bind(userId)
      .first<{
        revision: number;
        documentJson: string;
        contentVersion: string;
        updatedAt: number;
      }>();
    return row
      ? {
          revision: row.revision,
          document: parseDocument(row.documentJson),
          contentVersion: row.contentVersion,
          updatedAt: row.updatedAt,
        }
      : null;
  }

  async getLatestCursor(userId: string): Promise<number> {
    const row = await this.database
      .prepare("SELECT COALESCE(MAX(seq), 0) AS cursor FROM sync_changes WHERE user_id = ?")
      .bind(userId)
      .first<{ cursor: number }>();
    return row?.cursor ?? 0;
  }

  async claimIdempotency(
    userId: string,
    operation: SyncPushOperationV1,
    deviceRecordId: string,
  ): Promise<IdempotencyClaim> {
    const existing = await this.getIdempotency(userId, operation.operationId);
    if (existing) {
      return this.claimExistingIdempotency(existing, operation.requestHash);
    }

    const sequenceOwner = await this.database
      .prepare(
        "SELECT idempotency_key AS idempotencyKey FROM idempotency_records WHERE user_id = ? AND device_id = ? AND device_sequence = ? LIMIT 1",
      )
      .bind(userId, deviceRecordId, operation.deviceSequence)
      .first<{ idempotencyKey: string }>();
    if (sequenceOwner && sequenceOwner.idempotencyKey !== operation.operationId) {
      return { kind: "sequence-conflict" };
    }

    const recordId = crypto.randomUUID();
    const leaseToken = crypto.randomUUID();
    const timestamp = nowEpoch();
    try {
      await this.database
        .prepare(
          "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, device_id, device_sequence, status, lease_token, lease_expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?, ?)",
        )
        .bind(
          recordId,
          userId,
          operation.document.reset.epoch,
          IDEMPOTENCY_SCOPE,
          operation.operationId,
          operation.requestHash,
          deviceRecordId,
          operation.deviceSequence,
          leaseToken,
          timestamp + IDEMPOTENCY_LEASE_MS,
          timestamp,
          timestamp,
        )
        .run();
      return { kind: "claimed", recordId, leaseToken };
    } catch {
      const winner = await this.getIdempotency(userId, operation.operationId);
      if (winner) {
        return this.claimExistingIdempotency(winner, operation.requestHash);
      }
      return { kind: "sequence-conflict" };
    }
  }

  async getAppliedOperation(
    userId: string,
    operationId: string,
  ): Promise<AppliedSyncOperation | null> {
    return this.database
      .prepare(
        "SELECT revision, seq AS cursor FROM sync_changes WHERE user_id = ? AND operation_id = ? LIMIT 1",
      )
      .bind(userId, operationId)
      .first<AppliedSyncOperation>();
  }

  async ensureCourseVersion() {
    await ensureCurrentCourseVersion(this.database);
  }

  /**
   * Commits the canonical document and its operation cursor in one D1 batch.
   * D1 batches are transactional, so a lost response can resume from the
   * unique operation marker without incrementing the revision a second time.
   */
  async compareAndSwapDocumentAndAppendChange(
    userId: string,
    expectedRevision: number,
    document: CloudSyncDocumentV1,
    operation: SyncPushOperationV1,
  ): Promise<AppliedSyncOperation | null> {
    if (
      operation.contentVersion !== CONTENT_VERSION
      || document.state.contentVersion !== CONTENT_VERSION
      || operation.contentVersion !== document.state.contentVersion
    ) {
      throw new Error("Unsupported content version reached the sync repository.");
    }

    const documentJson = canonicalStringify(document);
    const timestamp = nowEpoch();
    const nextRevision = expectedRevision + 1;
    const changePayload = JSON.stringify({
      kind: operation.kind,
      deviceId: operation.deviceId,
    });
    await this.ensureCourseVersion();

    const documentMutation = expectedRevision === 0
      ? this.database
        .prepare(
          "INSERT INTO learning_documents (user_id, revision, document_json, schema_version, content_version, updated_at) SELECT ?, 1, ?, 1, ?, ? WHERE NOT EXISTS (SELECT 1 FROM sync_changes WHERE user_id = ? AND operation_id = ?) ON CONFLICT(user_id) DO NOTHING",
        )
        .bind(
          userId,
          documentJson,
          CONTENT_VERSION,
          timestamp,
          userId,
          operation.operationId,
        )
      : this.database
        .prepare(
          "UPDATE learning_documents SET revision = revision + 1, document_json = ?, schema_version = 1, content_version = ?, updated_at = ? WHERE user_id = ? AND revision = ? AND NOT EXISTS (SELECT 1 FROM sync_changes WHERE user_id = ? AND operation_id = ?)",
        )
        .bind(
          documentJson,
          CONTENT_VERSION,
          timestamp,
          userId,
          expectedRevision,
          userId,
          operation.operationId,
        );

    const changeMutation = this.database
      .prepare(
        "INSERT INTO sync_changes (user_id, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at) SELECT ?, 'learning_document', ?, ?, ?, 'upsert', ?, ? WHERE EXISTS (SELECT 1 FROM learning_documents WHERE user_id = ? AND revision = ? AND document_json = ?) ON CONFLICT(user_id, operation_id) DO NOTHING",
      )
      .bind(
        userId,
        userId,
        nextRevision,
        operation.operationId,
        changePayload,
        timestamp,
        userId,
        nextRevision,
        documentJson,
      );
    const mutations = [documentMutation, changeMutation];
    if (operation.kind === "reset") {
      const committedResetGuard =
        "EXISTS (SELECT 1 FROM learning_documents WHERE user_id = ? AND revision = ? AND document_json = ?)";
      mutations.push(
        this.database.prepare(
          `UPDATE lesson_sessions
           SET status = 'invalidated'
           WHERE user_id = ? AND status = 'started' AND reset_epoch < ?
             AND ${committedResetGuard}`,
        ).bind(
          userId,
          document.reset.epoch,
          userId,
          nextRevision,
          documentJson,
        ),
        this.database.prepare(
          `UPDATE assessment_sessions
           SET status = 'abandoned',
               terminal_at = ?,
               terminal_reason = 'reset-invalidated'
           WHERE user_id = ? AND status = 'started' AND reset_epoch < ?
             AND ${committedResetGuard}`,
        ).bind(
          timestamp,
          userId,
          document.reset.epoch,
          userId,
          nextRevision,
          documentJson,
        ),
        this.database.prepare(
          `UPDATE reader_sessions
           SET status = 'abandoned',
               terminal_at = ?,
               terminal_reason = 'reset-invalidated'
           WHERE user_id = ? AND status = 'started' AND reset_epoch < ?
             AND ${committedResetGuard}`,
        ).bind(
          timestamp,
          userId,
          document.reset.epoch,
          userId,
          nextRevision,
          documentJson,
        ),
        this.database.prepare(
          `UPDATE outbox_events
           SET status = 'dead',
               last_error = 'invalidated-by-learning-reset',
               lease_token = NULL,
               lease_expires_at = NULL
           WHERE user_id = ? AND reset_epoch < ?
             AND status IN ('pending', 'processing')
             AND ${committedResetGuard}`,
        ).bind(
          userId,
          document.reset.epoch,
          userId,
          nextRevision,
          documentJson,
        ),
      );
    }
    const results = await this.database.batch(mutations);
    if (results.some((result) => !result.success)) {
      throw new Error("Unable to commit the sync document transaction.");
    }
    return this.getAppliedOperation(userId, operation.operationId);
  }

  async updateProfileProjection(
    userId: string,
    document: CloudSyncDocumentV1,
    documentRevision: number,
  ) {
    const profile = document.state.profile;
    const timestamp = nowEpoch();
    await this.database
      .prepare(
        "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET display_name = excluded.display_name, goal = excluded.goal, daily_minutes = excluded.daily_minutes, script = excluded.script, starting_level = excluded.starting_level, onboarded = excluded.onboarded, revision = excluded.revision, updated_at = excluded.updated_at WHERE profiles.revision <= excluded.revision",
      )
      .bind(
        userId,
        profile.name,
        profile.goal,
        profile.dailyMinutes,
        profile.script,
        profile.startingLevel,
        profile.onboarded ? 1 : 0,
        documentRevision,
        timestamp,
        timestamp,
      )
      .run();
  }

  async upsertDevice(
    userId: string,
    operation: SyncPushOperationV1,
    cursor: number,
  ): Promise<string> {
    const timestamp = nowEpoch();
    const id = `${userId}:${operation.deviceId}`;
    await this.database
      .prepare(
        "INSERT INTO devices (id, user_id, installation_id, last_acked_cursor, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, installation_id) DO UPDATE SET last_acked_cursor = MAX(devices.last_acked_cursor, excluded.last_acked_cursor), last_seen_at = excluded.last_seen_at, revoked_at = NULL",
      )
      .bind(
        id,
        userId,
        operation.installationId,
        cursor,
        timestamp,
        timestamp,
      )
      .run();
    const stored = await this.database
      .prepare(
        "SELECT id FROM devices WHERE user_id = ? AND installation_id = ? LIMIT 1",
      )
      .bind(userId, operation.installationId)
      .first<{ id: string }>();
    if (!stored) throw new Error("Unable to register the sync device.");
    return stored.id;
  }

  async recordLocalImport(
    userId: string,
    idempotencyRecordId: string,
    operation: SyncPushOperationV1,
  ) {
    if (operation.kind !== "local-import") return;
    const snapshotHash = await sha256Hex(operation.document);
    await this.database
      .prepare(
        "INSERT OR IGNORE INTO local_import_receipts (id, user_id, idempotency_record_id, installation_id, source_schema_version, source_content_version, snapshot_hash, status, imported_counts_json, warnings_json, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, '[]', ?, ?)",
      )
      .bind(
        crypto.randomUUID(),
        userId,
        idempotencyRecordId,
        operation.installationId,
        operation.document.state.schemaVersion,
        operation.contentVersion,
        snapshotHash,
        JSON.stringify({
          evidence: operation.document.state.evidence.length,
          activities: operation.document.state.activityLog.length,
          savedWords: operation.document.state.savedWords.length,
        }),
        nowEpoch(),
        nowEpoch(),
      )
      .run();
  }

  async completeIdempotency(
    recordId: string,
    leaseToken: string,
    responseJson: string,
  ): Promise<boolean> {
    const timestamp = nowEpoch();
    const result = await this.database
      .prepare(
        "UPDATE idempotency_records SET status = 'completed', lease_token = NULL, lease_expires_at = NULL, response_status = 200, response_json = ?, updated_at = ?, completed_at = ? WHERE id = ? AND status = 'processing' AND lease_token = ?",
      )
      .bind(responseJson, timestamp, timestamp, recordId, leaseToken)
      .run();
    return (result.meta?.changes ?? 0) === 1;
  }

  async failIdempotency(recordId: string, leaseToken: string): Promise<void> {
    const timestamp = nowEpoch();
    await this.database
      .prepare(
        "UPDATE idempotency_records SET status = 'failed', lease_token = NULL, lease_expires_at = NULL, updated_at = ? WHERE id = ? AND status = 'processing' AND lease_token = ?",
      )
      .bind(timestamp, recordId, leaseToken)
      .run();
  }

  async exportAccountData(userId: string): Promise<AccountDataExport> {
    const statements = ACCOUNT_EXPORT_TABLES.map((table) => {
      const ownerColumn = table === "users" ? "id" : "user_id";
      return this.database
        .prepare(`SELECT * FROM ${table} WHERE ${ownerColumn} = ? ORDER BY rowid`)
        .bind(userId);
    });
    const results = await this.database.batch<Record<string, unknown>>(statements);
    const entries = ACCOUNT_EXPORT_TABLES.map((table, index) => {
      const result = results[index];
      if (!result?.success) {
        throw new Error(`Unable to export account table: ${table}.`);
      }
      return [
        table,
        (result.results ?? []).map((row) => decodeExportRow(table, row)),
      ] as const;
    });
    const tables = Object.fromEntries(entries) as AccountDataExport["tables"];
    return {
      tables,
      rowCount: entries.reduce((total, [, rows]) => total + rows.length, 0),
    };
  }

  async deleteAccount(userId: string) {
    // Explicit child-first deletion avoids relying on SQLite cascade ordering
    // when several user-owned rows also have restrictive composite FKs.
    const childTables = [
      "review_logs",
      "learning_evidence",
      "reader_session_attempts",
      "learning_attempts",
      "lesson_sessions",
      "reader_item_exposures",
      "reader_sessions",
      "assessment_skill_results",
      "assessment_attempts",
      "assessment_item_exposures",
      "assessment_sessions",
      "fsrs_cards",
      "xp_ledger",
      "local_import_receipts",
      "idempotency_records",
      "outbox_events",
      "sync_changes",
      "learning_documents",
      "enrollments",
      "mutation_rate_limits",
      "devices",
      "profiles",
      "auth_identities",
    ] as const;
    const statements = childTables.map((table) =>
      this.database.prepare(`DELETE FROM ${table} WHERE user_id = ?`).bind(userId)
    );
    statements.push(
      this.database.prepare("DELETE FROM users WHERE id = ?").bind(userId),
    );
    const results = await this.database.batch(statements);
    if (results.some((result) => !result.success)) {
      throw new Error("Unable to delete the complete tenant-owned account graph.");
    }
    return (results.at(-1)?.meta?.changes ?? 0) > 0;
  }

  private async touchIdentity(
    userId: string,
    identity: ChatGPTUser,
    providerSubject: string,
  ) {
    const timestamp = nowEpoch();
    await this.database.batch([
      this.database
        .prepare("UPDATE users SET status = 'active', updated_at = ?, deleted_at = NULL WHERE id = ?")
        .bind(timestamp, userId),
      this.database
        .prepare(
          "UPDATE auth_identities SET normalized_email = ?, email_verified = 1, updated_at = ? WHERE user_id = ? AND provider = ? AND provider_subject = ?",
        )
        .bind(
          identity.email.trim().toLowerCase(),
          timestamp,
          userId,
          IDENTITY_PROVIDER,
          providerSubject,
        ),
    ]);
  }

  private async getIdempotency(
    userId: string,
    key: string,
  ): Promise<ExistingIdempotency | null> {
    return this.database
      .prepare(
        "SELECT id, request_hash AS requestHash, status, lease_expires_at AS leaseExpiresAt, response_json AS responseJson FROM idempotency_records WHERE user_id = ? AND scope = ? AND idempotency_key = ? LIMIT 1",
      )
      .bind(userId, IDEMPOTENCY_SCOPE, key)
      .first<ExistingIdempotency>();
  }

  private async claimExistingIdempotency(
    existing: ExistingIdempotency,
    requestHash: string,
  ): Promise<IdempotencyClaim> {
    if (existing.requestHash !== requestHash) return { kind: "hash-conflict" };
    if (existing.status === "completed" && existing.responseJson) {
      return {
        kind: "duplicate",
        recordId: existing.id,
        responseJson: existing.responseJson,
      };
    }

    const timestamp = nowEpoch();
    if (
      existing.status === "processing"
      && existing.leaseExpiresAt !== null
      && existing.leaseExpiresAt > timestamp
    ) {
      return {
        kind: "in-flight",
        retryAfterMs: existing.leaseExpiresAt - timestamp,
      };
    }

    const leaseToken = crypto.randomUUID();
    const claimed = await this.database
      .prepare(
        "UPDATE idempotency_records SET status = 'processing', lease_token = ?, lease_expires_at = ?, updated_at = ? WHERE id = ? AND request_hash = ? AND status != 'completed' AND (status = 'failed' OR lease_expires_at IS NULL OR lease_expires_at <= ?) RETURNING id",
      )
      .bind(
        leaseToken,
        timestamp + IDEMPOTENCY_LEASE_MS,
        timestamp,
        existing.id,
        requestHash,
        timestamp,
      )
      .first<{ id: string }>();
    if (claimed) {
      return { kind: "resume", recordId: existing.id, leaseToken };
    }

    const winner = await this.database
      .prepare(
        "SELECT request_hash AS requestHash, status, lease_expires_at AS leaseExpiresAt, response_json AS responseJson FROM idempotency_records WHERE id = ? LIMIT 1",
      )
      .bind(existing.id)
      .first<Omit<ExistingIdempotency, "id">>();
    if (winner?.requestHash !== requestHash) return { kind: "hash-conflict" };
    if (winner.status === "completed" && winner.responseJson) {
      return {
        kind: "duplicate",
        recordId: existing.id,
        responseJson: winner.responseJson,
      };
    }
    return {
      kind: "in-flight",
      retryAfterMs: Math.max(1_000, (winner.leaseExpiresAt ?? timestamp) - timestamp),
    };
  }
}
