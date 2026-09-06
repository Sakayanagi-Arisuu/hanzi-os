import {
  canonicalStudioJson,
  studioSha256,
  type StudioItemType,
  type StudioLevel,
} from "../content/studioContent";
import type { D1Database, D1PreparedStatement } from "./d1";
import {
  decodeContentReleaseEvent,
  encodeContentReleaseEvent,
  type ContentReleaseAction,
  type ContentReleaseDecodeFailureCode,
  type ContentReleaseEventEnvelope,
  type ContentReleaseEventType,
  type EncodedContentReleaseEvent,
  type StoredContentReleaseEvent,
} from "./contentReleaseEventContract";

export const CONTENT_RELEASE_LEASE_MS = 30_000;

export type ContentReleaseWorkerPolicy = {
  batchSize: number;
  maximumAttempts: number;
  initialRetryDelayMs: number;
  maximumRetryDelayMs: number;
};

export const DEFAULT_CONTENT_RELEASE_WORKER_POLICY: Readonly<ContentReleaseWorkerPolicy> = {
  batchSize: 16,
  maximumAttempts: 5,
  initialRetryDelayMs: 1_000,
  maximumRetryDelayMs: 5 * 60_000,
};

export class ContentReleaseFenceError extends Error {
  readonly retryable = false;
  constructor(readonly failureCode: string, message: string) { super(message); }
}

export class ContentReleaseRetryableError extends Error {
  readonly retryable = true;
  constructor(readonly failureCode: string, message: string) { super(message); }
}

export type ClaimedContentReleaseEvent = StoredContentReleaseEvent & {
  status: "processing";
  availableAt: number;
  leaseToken: string;
  leaseExpiresAt: number;
};

export type ContentReleaseDrainSummary = {
  claimed: number;
  validated: number;
  completed: number;
  retried: number;
  deadLettered: number;
  duplicateOutcomes: number;
};

type ReleaseRevisionRow = {
  id: string;
  itemId: string;
  stableKey: string;
  itemType: StudioItemType;
  revision: number;
  workflowState: string;
  title: string;
  level: StudioLevel;
  contentJson: string;
  contentSha256: string;
  validationJson: string | null;
  validationSha256: string | null;
  publishedAt: number | null;
};

type StoredPackageRow = {
  id: string;
  itemId: string;
  revisionId: string;
  correlationId: string;
  packageJson: string;
  packageSha256: string;
  manifestJson: string;
  manifestSha256: string;
  releasedAt: number;
};

const REQUEST_EVENT_TYPES = [
  "content.validation.requested",
  "content.release.requested",
] as const;

const REQUEST_EVENT_SQL = REQUEST_EVENT_TYPES.map(() => "?").join(", ");
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const FAILURE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_]{2,79}$/u;

const clampPolicy = (
  policy: Readonly<ContentReleaseWorkerPolicy>,
): Readonly<ContentReleaseWorkerPolicy> => {
  for (const value of Object.values(policy)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError("Content release worker policy must use positive integers.");
    }
  }
  if (policy.maximumRetryDelayMs < policy.initialRetryDelayMs) {
    throw new TypeError("Content release retry ceiling is below the initial delay.");
  }
  return policy;
};

const retryDelay = (attempt: number, policy: Readonly<ContentReleaseWorkerPolicy>) =>
  Math.min(
    policy.maximumRetryDelayMs,
    policy.initialRetryDelayMs * 2 ** Math.min(30, Math.max(0, attempt - 1)),
  );

const requestedAction = (event: ClaimedContentReleaseEvent): ContentReleaseAction => {
  try {
    const payload = JSON.parse(event.payloadJson) as { action?: unknown };
    return payload.action === "archive" ? "archive" : "publish";
  } catch {
    return "publish";
  }
};

const sanitizeRuntimeContent = (
  itemType: StudioItemType,
  content: Record<string, unknown>,
) => {
  const { review: _review, ...withoutReview } = content;
  if (itemType !== "exam_item") return withoutReview;
  const {
    answerIndex: _answerIndex,
    answer: _answer,
    explanationVi: _explanation,
    ...safe
  } = withoutReview;
  return safe;
};

export const contentReleaseEventInsertStatement = <T extends ContentReleaseEventType>(
  database: D1Database,
  event: EncodedContentReleaseEvent<T>,
  input: {
    status?: "pending" | "published";
    requiredWorkflowState?: string;
    requiredRowVersion?: number;
    requiredLease?: {
      eventId: string;
      leaseToken: string;
      now: number;
    };
  } = {},
): D1PreparedStatement => {
  const status = input.status ?? "pending";
  const publishedAt = status === "published" ? event.createdAt : null;
  const fenceConditions: string[] = [];
  const fenceBindings: unknown[] = [];
  if (input.requiredWorkflowState) {
    fenceConditions.push(`EXISTS (
        SELECT 1 FROM content_revisions
         WHERE id = ? AND workflow_state = ? AND row_version = ?
      )`);
    fenceBindings.push(
      event.revisionId,
      input.requiredWorkflowState,
      input.requiredRowVersion,
    );
  }
  if (input.requiredLease) {
    fenceConditions.push(`EXISTS (
        SELECT 1 FROM content_release_outbox_events request
         WHERE request.id = ? AND request.status = 'processing'
           AND request.lease_token = ? AND request.lease_expires_at > ?
      )`);
    fenceBindings.push(
      input.requiredLease.eventId,
      input.requiredLease.leaseToken,
      input.requiredLease.now,
    );
  }
  const fence = fenceConditions.length > 0
    ? `WHERE ${fenceConditions.join(" AND ")}`
    : "";
  return database.prepare(
    `INSERT INTO content_release_outbox_events (
      id, event_type, schema_version, item_id, revision_id, correlation_id,
      causation_id, actor_user_id, actor_session_id, payload_json,
      payload_sha256, status, attempts, available_at, created_at, published_at
    ) SELECT ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ? ${fence}`,
  ).bind(
    event.id,
    event.eventType,
    event.itemId,
    event.revisionId,
    event.correlationId,
    event.causationId,
    event.actorUserId,
    event.actorSessionId,
    event.payloadJson,
    event.payloadSha256,
    status,
    event.createdAt,
    event.createdAt,
    publishedAt,
    ...fenceBindings,
  );
};

const claimedSelect = `SELECT id,
       event_type AS eventType,
       schema_version AS schemaVersion,
       item_id AS itemId,
       revision_id AS revisionId,
       correlation_id AS correlationId,
       causation_id AS causationId,
       actor_user_id AS actorUserId,
       actor_session_id AS actorSessionId,
       payload_json AS payloadJson,
       payload_sha256 AS payloadSha256,
       attempts,
       status,
       available_at AS availableAt,
       created_at AS createdAt,
       lease_token AS leaseToken,
       lease_expires_at AS leaseExpiresAt`;

export class ContentReleaseWorkerRepository {
  private readonly now: () => number;
  private readonly createId: () => string;
  private readonly leaseDurationMs: number;

  constructor(
    private readonly database: D1Database,
    dependencies: {
      now?: () => number;
      createId?: () => string;
      leaseDurationMs?: number;
    } = {},
  ) {
    this.now = dependencies.now ?? Date.now;
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.leaseDurationMs = dependencies.leaseDurationMs ?? CONTENT_RELEASE_LEASE_MS;
  }

  async recoverExpiredLeases(): Promise<number> {
    const timestamp = this.readNow();
    const result = await this.database.prepare(
      `UPDATE content_release_outbox_events
          SET status = 'pending', lease_token = NULL, lease_expires_at = NULL,
              available_at = ?, last_error_code = 'CONTENT_RELEASE_LEASE_EXPIRED'
        WHERE status = 'processing' AND lease_expires_at <= ?`,
    ).bind(timestamp, timestamp).run();
    return result.meta?.changes ?? 0;
  }

  async enqueueOrphanedPublished(limit = 16): Promise<number> {
    const rows = await this.database.prepare(
      `SELECT r.id, r.item_id AS itemId, i.stable_key AS stableKey,
              i.item_type AS itemType, r.revision,
              r.content_sha256 AS contentSha256,
              r.validation_sha256 AS validationSha256,
              r.author_user_id AS actorUserId, r.published_at AS publishedAt
         FROM content_revisions r
         INNER JOIN content_items i ON i.id = r.item_id
        WHERE r.workflow_state = 'published'
          AND r.validation_sha256 IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM content_release_packages package
             WHERE package.revision_id = r.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM content_release_outbox_events event
             WHERE event.revision_id = r.id
               AND event.event_type = 'content.release.requested'
               AND json_extract(event.payload_json, '$.action') = 'publish'
          )
        ORDER BY r.published_at, r.id LIMIT ?`,
    ).bind(Math.max(1, Math.min(100, Math.trunc(limit)))).all<{
      id: string;
      itemId: string;
      stableKey: string;
      itemType: StudioItemType;
      revision: number;
      contentSha256: string;
      validationSha256: string;
      actorUserId: string;
      publishedAt: number;
    }>();
    if (!rows.success) throw new Error("Unable to inspect pre-worker publications.");
    let inserted = 0;
    for (const row of rows.results ?? []) {
      const timestamp = row.publishedAt ?? this.readNow();
      const event = await encodeContentReleaseEvent({
        id: `content-release-backfill:${row.id}`,
        eventType: "content.release.requested",
        itemId: row.itemId,
        revisionId: row.id,
        correlationId: `backfill:${row.id}`.slice(0, 160),
        causationId: null,
        actorUserId: row.actorUserId,
        actorSessionId: null,
        createdAt: timestamp,
        payload: {
          revisionId: row.id,
          itemId: row.itemId,
          stableKey: row.stableKey,
          itemType: row.itemType,
          contentSha256: row.contentSha256,
          validationSha256: row.validationSha256,
          requestedAt: timestamp,
          action: "publish",
          revision: row.revision,
        },
      });
      const result = await contentReleaseEventInsertStatement(this.database, event).run();
      inserted += result.meta?.changes ?? 0;
    }
    return inserted;
  }

  async claimNext(): Promise<ClaimedContentReleaseEvent | null> {
    const timestamp = this.readNow();
    await this.recoverExpiredLeases();
    const leaseToken = this.createId();
    if (!UUID_PATTERN.test(leaseToken)) throw new Error("Worker lease token is invalid.");
    const row = await this.database.prepare(
      `UPDATE content_release_outbox_events
          SET status = 'processing', attempts = attempts + 1,
              lease_token = ?, lease_expires_at = ?, last_error_code = NULL
        WHERE id = (
          SELECT id FROM content_release_outbox_events
           WHERE status = 'pending' AND available_at <= ?
             AND event_type IN (${REQUEST_EVENT_SQL})
           ORDER BY available_at, created_at, id LIMIT 1
        )
      RETURNING id, event_type AS eventType, schema_version AS schemaVersion,
                item_id AS itemId, revision_id AS revisionId,
                correlation_id AS correlationId, causation_id AS causationId,
                actor_user_id AS actorUserId, actor_session_id AS actorSessionId,
                payload_json AS payloadJson, payload_sha256 AS payloadSha256,
                attempts, status, available_at AS availableAt,
                created_at AS createdAt, lease_token AS leaseToken,
                lease_expires_at AS leaseExpiresAt`,
    ).bind(
      leaseToken,
      timestamp + this.leaseDurationMs,
      timestamp,
      ...REQUEST_EVENT_TYPES,
    ).first<ClaimedContentReleaseEvent>();
    return row ?? null;
  }

  async acknowledgeValidation(event: ClaimedContentReleaseEvent): Promise<boolean> {
    const timestamp = this.readNow();
    const result = await this.database.prepare(
      `UPDATE content_release_outbox_events
          SET status = 'published', published_at = ?, lease_token = NULL,
              lease_expires_at = NULL, last_error_code = NULL
        WHERE id = ? AND status = 'processing' AND lease_token = ?
          AND lease_expires_at > ?`,
    ).bind(timestamp, event.id, event.leaseToken, timestamp).run();
    return (result.meta?.changes ?? 0) === 1;
  }

  async loadRevision(revisionId: string): Promise<ReleaseRevisionRow | null> {
    return this.database.prepare(
      `SELECT r.id, r.item_id AS itemId, i.stable_key AS stableKey,
              i.item_type AS itemType, r.revision,
              r.workflow_state AS workflowState, r.title, r.level,
              r.content_json AS contentJson, r.content_sha256 AS contentSha256,
              r.validation_json AS validationJson,
              r.validation_sha256 AS validationSha256,
              r.published_at AS publishedAt
         FROM content_revisions r
         INNER JOIN content_items i ON i.id = r.item_id
        WHERE r.id = ? LIMIT 1`,
    ).bind(revisionId).first<ReleaseRevisionRow>();
  }

  async loadPackage(revisionId: string): Promise<StoredPackageRow | null> {
    return this.database.prepare(
      `SELECT id, item_id AS itemId, revision_id AS revisionId,
              correlation_id AS correlationId, package_json AS packageJson,
              package_sha256 AS packageSha256, manifest_json AS manifestJson,
              manifest_sha256 AS manifestSha256, released_at AS releasedAt
         FROM content_release_packages WHERE revision_id = ? LIMIT 1`,
    ).bind(revisionId).first<StoredPackageRow>();
  }

  async completePublish(input: {
    event: ClaimedContentReleaseEvent;
    revision: ReleaseRevisionRow;
    packageId: string;
    packageJson: string;
    packageSha256: string;
    manifestJson: string;
    manifestSha256: string;
  }): Promise<{ completed: boolean; duplicateOutcome: boolean }> {
    const timestamp = this.readNow();
    const completedEvent = await encodeContentReleaseEvent({
      id: this.createId(),
      eventType: "content.release.completed",
      itemId: input.event.itemId,
      revisionId: input.event.revisionId,
      correlationId: input.event.correlationId,
      causationId: input.event.id,
      actorUserId: input.event.actorUserId,
      actorSessionId: input.event.actorSessionId,
      createdAt: timestamp,
      payload: {
        revisionId: input.event.revisionId,
        itemId: input.event.itemId,
        action: "publish",
        packageId: input.packageId,
        packageSha256: input.packageSha256,
        manifestSha256: input.manifestSha256,
        completedAt: timestamp,
      },
    });
    const fence = `EXISTS (
      SELECT 1 FROM content_release_outbox_events request
       WHERE request.id = ? AND request.status = 'processing'
         AND request.lease_token = ? AND request.lease_expires_at > ?
    )`;
    const results = await this.database.batch([
      this.database.prepare(
        `INSERT OR IGNORE INTO content_release_packages (
          id, item_id, revision_id, correlation_id, package_json,
          package_sha256, manifest_json, manifest_sha256, released_at
        ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${fence}`,
      ).bind(
        input.packageId, input.event.itemId, input.event.revisionId,
        input.event.correlationId, input.packageJson, input.packageSha256,
        input.manifestJson, input.manifestSha256, input.revision.publishedAt,
        input.event.id, input.event.leaseToken, timestamp,
      ),
      this.database.prepare(
        `INSERT INTO content_release_heads (
          item_id, package_id, revision_id, row_version, updated_at
        ) SELECT ?, ?, ?, 1, ? WHERE ${fence}
        ON CONFLICT(item_id) DO UPDATE SET
          package_id = excluded.package_id,
          revision_id = excluded.revision_id,
          row_version = content_release_heads.row_version + 1,
          updated_at = excluded.updated_at
        WHERE content_release_heads.package_id <> excluded.package_id`,
      ).bind(
        input.event.itemId, input.packageId, input.event.revisionId, timestamp,
        input.event.id, input.event.leaseToken, timestamp,
      ),
      contentReleaseEventInsertStatement(this.database, completedEvent, {
        status: "published",
        requiredLease: {
          eventId: input.event.id,
          leaseToken: input.event.leaseToken,
          now: timestamp,
        },
      }),
      this.auditStatement({
        id: `audit:${completedEvent.id}`,
        action: "content.release.completed",
        outcome: "success",
        event: input.event,
        metadata: {
          packageId: input.packageId,
          packageSha256: input.packageSha256,
          manifestSha256: input.manifestSha256,
        },
        timestamp,
        requiredLease: {
          eventId: input.event.id,
          leaseToken: input.event.leaseToken,
          now: timestamp,
        },
      }),
      this.database.prepare(
        `UPDATE content_release_outbox_events
            SET status = 'published', published_at = ?, lease_token = NULL,
                lease_expires_at = NULL, last_error_code = NULL
          WHERE id = ? AND status = 'processing' AND lease_token = ?
            AND lease_expires_at > ?`,
      ).bind(timestamp, input.event.id, input.event.leaseToken, timestamp),
    ]);
    return {
      completed: (results[4]?.meta?.changes ?? 0) === 1,
      duplicateOutcome: (results[0]?.meta?.changes ?? 0) === 0,
    };
  }

  async completeArchive(event: ClaimedContentReleaseEvent): Promise<boolean> {
    const timestamp = this.readNow();
    const completedEvent = await encodeContentReleaseEvent({
      id: this.createId(),
      eventType: "content.release.completed",
      itemId: event.itemId,
      revisionId: event.revisionId,
      correlationId: event.correlationId,
      causationId: event.id,
      actorUserId: event.actorUserId,
      actorSessionId: event.actorSessionId,
      createdAt: timestamp,
      payload: {
        revisionId: event.revisionId,
        itemId: event.itemId,
        action: "archive",
        packageId: null,
        packageSha256: null,
        manifestSha256: null,
        completedAt: timestamp,
      },
    });
    const results = await this.database.batch([
      this.database.prepare(
        `DELETE FROM content_release_heads
          WHERE item_id = ?
            AND (
              revision_id = ?
              OR NOT EXISTS (
                SELECT 1 FROM content_revisions current
                 WHERE current.item_id = ? AND current.workflow_state = 'published'
              )
            )
            AND EXISTS (
              SELECT 1 FROM content_release_outbox_events request
               WHERE request.id = ? AND request.status = 'processing'
                 AND request.lease_token = ? AND request.lease_expires_at > ?
            )`,
      ).bind(
        event.itemId,
        event.revisionId,
        event.itemId,
        event.id,
        event.leaseToken,
        timestamp,
      ),
      contentReleaseEventInsertStatement(this.database, completedEvent, {
        status: "published",
        requiredLease: {
          eventId: event.id,
          leaseToken: event.leaseToken,
          now: timestamp,
        },
      }),
      this.auditStatement({
        id: `audit:${completedEvent.id}`,
        action: "content.release.completed",
        outcome: "success",
        event,
        metadata: { action: "archive" },
        timestamp,
        requiredLease: {
          eventId: event.id,
          leaseToken: event.leaseToken,
          now: timestamp,
        },
      }),
      this.database.prepare(
        `UPDATE content_release_outbox_events
            SET status = 'published', published_at = ?, lease_token = NULL,
                lease_expires_at = NULL, last_error_code = NULL
          WHERE id = ? AND status = 'processing' AND lease_token = ?
            AND lease_expires_at > ?`,
      ).bind(timestamp, event.id, event.leaseToken, timestamp),
    ]);
    return (results[3]?.meta?.changes ?? 0) === 1;
  }

  async recordFailure(input: {
    event: ClaimedContentReleaseEvent;
    failureCode: string;
    retryable: boolean;
    retryDelayMs?: number;
  }): Promise<"retried" | "dead" | "stale"> {
    if (!FAILURE_CODE_PATTERN.test(input.failureCode)) {
      throw new TypeError("Content release failure code is invalid.");
    }
    const timestamp = this.readNow();
    const terminal = !input.retryable;
    const action = requestedAction(input.event);
    const failedEvent = input.event.eventType === "content.release.requested"
      ? await encodeContentReleaseEvent({
          id: this.createId(),
          eventType: "content.release.failed",
          itemId: input.event.itemId,
          revisionId: input.event.revisionId,
          correlationId: input.event.correlationId,
          causationId: input.event.id,
          actorUserId: input.event.actorUserId,
          actorSessionId: input.event.actorSessionId,
          createdAt: timestamp,
          payload: {
            revisionId: input.event.revisionId,
            itemId: input.event.itemId,
            action,
            attempt: input.event.attempts,
            retryable: !terminal,
            failureCode: input.failureCode,
            failedAt: timestamp,
          },
        })
      : null;
    const statements: D1PreparedStatement[] = [];
    if (failedEvent) {
      statements.push(
        contentReleaseEventInsertStatement(this.database, failedEvent, {
          status: "published",
          requiredLease: {
            eventId: input.event.id,
            leaseToken: input.event.leaseToken,
            now: timestamp,
          },
        }),
        this.auditStatement({
          id: `audit:${failedEvent.id}`,
          action: "content.release.failed",
          outcome: "failed",
          event: input.event,
          metadata: {
            action,
            attempt: input.event.attempts,
            retryable: !terminal,
            failureCode: input.failureCode,
          },
          timestamp,
          requiredLease: {
            eventId: input.event.id,
            leaseToken: input.event.leaseToken,
            now: timestamp,
          },
        }),
      );
    }
    statements.push(
      terminal
        ? this.database.prepare(
            `UPDATE content_release_outbox_events
                SET status = 'dead', dead_at = ?, lease_token = NULL,
                    lease_expires_at = NULL, last_error_code = ?
              WHERE id = ? AND status = 'processing' AND lease_token = ?
                AND lease_expires_at > ?`,
          ).bind(
            timestamp, input.failureCode, input.event.id,
            input.event.leaseToken, timestamp,
          )
        : this.database.prepare(
            `UPDATE content_release_outbox_events
                SET status = 'pending', available_at = ?, lease_token = NULL,
                    lease_expires_at = NULL, last_error_code = ?
              WHERE id = ? AND status = 'processing' AND lease_token = ?
                AND lease_expires_at > ?`,
          ).bind(
            timestamp + (input.retryDelayMs ?? 0), input.failureCode, input.event.id,
            input.event.leaseToken, timestamp,
          ),
    );
    const results = await this.database.batch(statements);
    const changed = results.at(-1)?.meta?.changes ?? 0;
    return changed !== 1 ? "stale" : terminal ? "dead" : "retried";
  }

  async replayDeadRelease(input: {
    eventId: string;
    actorUserId: string;
    actorSessionId: string | null;
    correlationId: string;
  }): Promise<string> {
    const source = await this.database.prepare(
      `${claimedSelect}, dead_at AS deadAt
         FROM content_release_outbox_events
        WHERE id = ? AND event_type = 'content.release.requested'
          AND status = 'dead' LIMIT 1`,
    ).bind(input.eventId).first<ClaimedContentReleaseEvent & { deadAt: number }>();
    if (!source) throw new ContentReleaseFenceError(
      "CONTENT_RELEASE_REPLAY_REJECTED",
      "Only a dead release request can be replayed.",
    );
    const decoded = await decodeContentReleaseEvent(source);
    if (!decoded.ok || decoded.envelope.eventType !== "content.release.requested") {
      throw new ContentReleaseFenceError(
        "CONTENT_RELEASE_REPLAY_REJECTED",
        "A poisoned release request cannot be replayed without a corrected revision.",
      );
    }
    const timestamp = this.readNow();
    const sourceDigest = await studioSha256(source.id);
    const replayId = `content-release-replay:${sourceDigest.slice("sha256:".length)}`;
    const existingReplay = await this.database.prepare(
      `SELECT id FROM content_release_outbox_events
        WHERE id = ? AND event_type = 'content.release.requested'
          AND causation_id = ? LIMIT 1`,
    ).bind(replayId, source.id).first<{ id: string }>();
    if (existingReplay) return existingReplay.id;
    const replay = await encodeContentReleaseEvent({
      id: replayId,
      eventType: "content.release.requested",
      itemId: source.itemId,
      revisionId: source.revisionId,
      correlationId: input.correlationId,
      causationId: source.id,
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
      createdAt: timestamp,
      payload: {
        ...decoded.envelope.payload,
        requestedAt: timestamp,
      },
    });
    try {
      await this.database.batch([
        contentReleaseEventInsertStatement(this.database, replay),
        this.auditStatement({
          id: `audit:${replayId}`,
          action: "content.release.replayed",
          outcome: "success",
          event: {
            ...source,
            id: replayId,
            correlationId: input.correlationId,
            actorUserId: input.actorUserId,
            actorSessionId: input.actorSessionId,
          },
          metadata: { replayOfEventId: source.id },
          timestamp,
        }),
      ]);
    } catch (error) {
      const concurrentReplay = await this.database.prepare(
        `SELECT id FROM content_release_outbox_events
          WHERE id = ? AND event_type = 'content.release.requested'
            AND causation_id = ? LIMIT 1`,
      ).bind(replayId, source.id).first<{ id: string }>();
      if (concurrentReplay) return concurrentReplay.id;
      throw error;
    }
    return replayId;
  }

  private auditStatement(input: {
    id: string;
    action: string;
    outcome: "success" | "failed";
    event: Pick<ClaimedContentReleaseEvent,
      "id" | "revisionId" | "correlationId" | "actorUserId" | "actorSessionId">;
    metadata: Record<string, unknown>;
    timestamp: number;
    requiredLease?: {
      eventId: string;
      leaseToken: string;
      now: number;
    };
  }) {
    const fence = input.requiredLease
      ? `WHERE EXISTS (
          SELECT 1 FROM content_release_outbox_events request
           WHERE request.id = ? AND request.status = 'processing'
             AND request.lease_token = ? AND request.lease_expires_at > ?
        )`
      : "";
    return this.database.prepare(
      `INSERT OR IGNORE INTO audit_events (
        id, category, action, outcome, actor_user_id, actor_session_id,
        target_type, target_id, request_id, metadata_json, created_at
      ) SELECT ?, 'publication', ?, ?, ?, ?, 'content_revision', ?, ?, ?, ? ${fence}`,
    ).bind(
      input.id,
      input.action,
      input.outcome,
      input.event.actorUserId,
      input.event.actorSessionId,
      input.event.revisionId,
      `${input.event.correlationId}:${input.event.id}`.slice(0, 512),
      canonicalStudioJson(input.metadata),
      input.timestamp,
      ...(input.requiredLease
        ? [
            input.requiredLease.eventId,
            input.requiredLease.leaseToken,
            input.requiredLease.now,
          ]
        : []),
    );
  }

  private readNow() {
    const timestamp = this.now();
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
      throw new TypeError("Content release worker clock is invalid.");
    }
    return timestamp;
  }
}

export class ContentReleaseWorker {
  private readonly policy: Readonly<ContentReleaseWorkerPolicy>;

  constructor(
    private readonly repository: ContentReleaseWorkerRepository,
    dependencies: {
      policy?: Readonly<ContentReleaseWorkerPolicy>;
      beforeRelease?: (event: ContentReleaseEventEnvelope<"content.release.requested">) => Promise<void>;
    } = {},
  ) {
    this.policy = clampPolicy(dependencies.policy ?? DEFAULT_CONTENT_RELEASE_WORKER_POLICY);
    this.beforeRelease = dependencies.beforeRelease;
  }

  private readonly beforeRelease?: (
    event: ContentReleaseEventEnvelope<"content.release.requested">,
  ) => Promise<void>;

  async drain(): Promise<ContentReleaseDrainSummary> {
    const summary: ContentReleaseDrainSummary = {
      claimed: 0,
      validated: 0,
      completed: 0,
      retried: 0,
      deadLettered: 0,
      duplicateOutcomes: 0,
    };
    await this.repository.enqueueOrphanedPublished(this.policy.batchSize);
    for (let index = 0; index < this.policy.batchSize; index += 1) {
      const claimed = await this.repository.claimNext();
      if (!claimed) break;
      summary.claimed += 1;
      const decoded = await decodeContentReleaseEvent(claimed);
      if (!decoded.ok) {
        await this.fail(claimed, decoded.failureCode, false, summary);
        continue;
      }
      if (decoded.envelope.eventType === "content.validation.requested") {
        const revision = await this.repository.loadRevision(claimed.revisionId);
        const payload = decoded.envelope.payload;
        if (
          !revision
          || revision.itemId !== payload.itemId
          || revision.contentSha256 !== payload.contentSha256
          || revision.validationSha256 !== payload.validationSha256
        ) {
          await this.fail(
            claimed,
            "CONTENT_VALIDATION_STALE",
            false,
            summary,
          );
          continue;
        }
        if (await this.repository.acknowledgeValidation(claimed)) summary.validated += 1;
        continue;
      }
      if (decoded.envelope.eventType !== "content.release.requested") {
        await this.fail(claimed, "CONTENT_RELEASE_UNEXPECTED_EVENT", false, summary);
        continue;
      }
      try {
        await this.beforeRelease?.(decoded.envelope);
        const result = await this.processRelease(claimed, decoded.envelope);
        if (result.completed) summary.completed += 1;
        if (result.duplicateOutcome) summary.duplicateOutcomes += 1;
      } catch (error) {
        const failure = this.normalizeFailure(error, claimed.attempts);
        await this.fail(
          claimed,
          failure.failureCode,
          failure.retryable,
          summary,
        );
      }
    }
    return summary;
  }

  private async processRelease(
    claimed: ClaimedContentReleaseEvent,
    envelope: ContentReleaseEventEnvelope<"content.release.requested">,
  ) {
    const revision = await this.repository.loadRevision(claimed.revisionId);
    if (!revision) {
      throw new ContentReleaseFenceError(
        "CONTENT_RELEASE_REVISION_MISSING",
        "Release revision no longer exists.",
      );
    }
    const payload = envelope.payload;
    if (
      revision.itemId !== payload.itemId
      || revision.stableKey !== payload.stableKey
      || revision.itemType !== payload.itemType
      || revision.revision !== payload.revision
      || revision.contentSha256 !== payload.contentSha256
      || revision.validationSha256 !== payload.validationSha256
    ) {
      throw new ContentReleaseFenceError(
        "CONTENT_RELEASE_STALE",
        "Release request no longer matches the governed revision.",
      );
    }
    if (payload.action === "archive") {
      if (revision.workflowState !== "archived") {
        throw new ContentReleaseFenceError(
          "CONTENT_RELEASE_STALE",
          "Archive request no longer matches revision state.",
        );
      }
      return {
        completed: await this.repository.completeArchive(claimed),
        duplicateOutcome: false,
      };
    }
    if (revision.workflowState !== "published" || revision.publishedAt === null) {
      throw new ContentReleaseFenceError(
        "CONTENT_RELEASE_STALE",
        "Publish request no longer matches revision state.",
      );
    }
    if (!revision.validationJson || !revision.validationSha256) {
      throw new ContentReleaseFenceError(
        "CONTENT_RELEASE_VALIDATION_MISSING",
        "A release requires the immutable validation artifact.",
      );
    }
    const packageId = `content-package:${revision.id}`;
    const packageValue = {
      schemaVersion: 1 as const,
      stableKey: revision.stableKey,
      itemType: revision.itemType,
      level: revision.level,
      title: revision.title,
      revision: revision.revision,
      revisionId: revision.id,
      contentSha256: revision.contentSha256,
      publishedAt: revision.publishedAt,
      content: sanitizeRuntimeContent(
        revision.itemType,
        JSON.parse(revision.contentJson) as Record<string, unknown>,
      ),
    };
    const packageJson = canonicalStudioJson(packageValue);
    const packageSha256 = await studioSha256(packageJson);
    const manifestValue = {
      schemaVersion: 1 as const,
      packageId,
      revisionId: revision.id,
      itemId: revision.itemId,
      stableKey: revision.stableKey,
      itemType: revision.itemType,
      revision: revision.revision,
      contentSha256: revision.contentSha256,
      validationSha256: revision.validationSha256,
      packageSha256,
      publishedAt: revision.publishedAt,
    };
    const manifestJson = canonicalStudioJson(manifestValue);
    const manifestSha256 = await studioSha256(manifestJson);
    const existing = await this.repository.loadPackage(revision.id);
    if (existing && (
      existing.id !== packageId
      || existing.packageJson !== packageJson
      || existing.packageSha256 !== packageSha256
      || existing.manifestJson !== manifestJson
      || existing.manifestSha256 !== manifestSha256
    )) {
      throw new ContentReleaseFenceError(
        "CONTENT_RELEASE_PACKAGE_CONFLICT",
        "Immutable package already exists with a different digest.",
      );
    }
    return this.repository.completePublish({
      event: claimed,
      revision,
      packageId,
      packageJson,
      packageSha256,
      manifestJson,
      manifestSha256,
    });
  }

  private normalizeFailure(error: unknown, attempts: number) {
    if (error instanceof ContentReleaseFenceError) {
      return { retryable: false, failureCode: error.failureCode };
    }
    if (error instanceof ContentReleaseRetryableError) {
      return {
        retryable: attempts < this.policy.maximumAttempts,
        failureCode: error.failureCode,
      };
    }
    return {
      retryable: attempts < this.policy.maximumAttempts,
      failureCode: attempts < this.policy.maximumAttempts
        ? "CONTENT_RELEASE_TRANSIENT_FAILURE"
        : "CONTENT_RELEASE_RETRY_EXHAUSTED",
    };
  }

  private async fail(
    event: ClaimedContentReleaseEvent,
    code: ContentReleaseDecodeFailureCode | string,
    retryable: boolean,
    summary: ContentReleaseDrainSummary,
  ) {
    const result = await this.repository.recordFailure({
      event,
      failureCode: code,
      retryable,
      retryDelayMs: retryDelay(event.attempts, this.policy),
    });
    if (result === "retried") summary.retried += 1;
    if (result === "dead") summary.deadLettered += 1;
  }
}

export const processContentReleaseBatch = async (
  database: D1Database,
  dependencies: ConstructorParameters<typeof ContentReleaseWorkerRepository>[1]
    & ConstructorParameters<typeof ContentReleaseWorker>[1] = {},
) => {
  const repository = new ContentReleaseWorkerRepository(database, dependencies);
  return new ContentReleaseWorker(repository, dependencies).drain();
};
