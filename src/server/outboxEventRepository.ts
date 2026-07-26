import type { D1Database } from "./d1";

export const OUTBOX_EVENT_LEASE_MS = 30_000;

export type ClaimedOutboxEvent = Readonly<{
  id: string;
  userId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  schemaVersion: number;
  resetEpoch: number;
  payloadJson: string;
  attempts: number;
  availableAt: number;
  createdAt: number;
  leaseToken: string;
  leaseExpiresAt: number;
}>;

export type OutboxLeaseIdentity = Readonly<{
  eventId: string;
  userId: string;
  leaseToken: string;
}>;

export type OutboxRetryInput = OutboxLeaseIdentity & Readonly<{
  retryAt: number;
  failureCode: string;
}>;

export type OutboxDeadLetterInput = OutboxLeaseIdentity & Readonly<{
  failureCode: string;
}>;

export type OutboxReplayInput = Readonly<{
  eventId: string;
  userId: string;
  expectedAttempts: number;
  availableAt?: number;
}>;

export type OutboxEventRepositoryDependencies = Readonly<{
  now?: () => number;
  createLeaseToken?: () => string;
  leaseDurationMs?: number;
}>;

export class OutboxEventRepositoryError extends Error {
  readonly code = "OUTBOX_EVENT_STORAGE_UNAVAILABLE";

  constructor() {
    super("Transactional outbox storage is unavailable.");
    this.name = "OutboxEventRepositoryError";
  }
}

type ClaimedOutboxEventRow = {
  id: string;
  userId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  schemaVersion: number;
  resetEpoch: number;
  payloadJson: string;
  attempts: number;
  availableAt: number;
  createdAt: number;
  leaseToken: string;
  leaseExpiresAt: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const FAILURE_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/iu;

const CURRENT_RESET_EPOCH_SQL = (eventReference: string) =>
  `COALESCE((
    SELECT CASE
      WHEN json_valid(document_json) = 0 THEN -1
      WHEN json_type(document_json, '$.reset.epoch') IS NULL THEN 0
      WHEN json_type(document_json, '$.reset.epoch') = 'integer'
        AND json_extract(document_json, '$.reset.epoch')
          BETWEEN 0 AND 2147483647
        THEN json_extract(document_json, '$.reset.epoch')
      ELSE -1
    END
    FROM learning_documents
    WHERE user_id = ${eventReference}.user_id
    LIMIT 1
  ), 0) = ${eventReference}.reset_epoch`;

const ACTIVE_USER_SQL = (eventReference: string) =>
  `EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = ${eventReference}.user_id
      AND users.status = 'active'
  )`;

const isSafeEpoch = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0;

const isBoundedIdentifier = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 255
  && !value.includes("\0");

const validateLeaseIdentity = (input: OutboxLeaseIdentity) => {
  if (
    !isBoundedIdentifier(input.eventId)
    || !isBoundedIdentifier(input.userId)
    || !UUID_PATTERN.test(input.leaseToken)
  ) {
    throw new OutboxEventRepositoryError();
  }
};

const validateFailureCode = (failureCode: string) => {
  if (!FAILURE_CODE_PATTERN.test(failureCode)) {
    throw new OutboxEventRepositoryError();
  }
};

const normalizeClaimedEvent = (
  row: ClaimedOutboxEventRow,
  expectedLeaseToken: string,
): ClaimedOutboxEvent => {
  if (
    !isBoundedIdentifier(row.id)
    || !isBoundedIdentifier(row.userId)
    || !isBoundedIdentifier(row.aggregateType)
    || !isBoundedIdentifier(row.aggregateId)
    || !isBoundedIdentifier(row.eventType)
    || typeof row.payloadJson !== "string"
    || !Number.isSafeInteger(row.schemaVersion)
    || row.schemaVersion < 1
    || !isSafeEpoch(row.resetEpoch)
    || !Number.isSafeInteger(row.attempts)
    || row.attempts < 1
    || !isSafeEpoch(row.availableAt)
    || !isSafeEpoch(row.createdAt)
    || row.leaseToken !== expectedLeaseToken
    || !isSafeEpoch(row.leaseExpiresAt)
  ) {
    throw new OutboxEventRepositoryError();
  }
  return Object.freeze({ ...row });
};

/**
 * D1-backed lease lifecycle for the transactional outbox.
 *
 * Claims are globally ordered across tenants. Every terminal lease mutation is
 * additionally scoped by server-resolved user id, the current lease token, an
 * unexpired lease, active account status, and the canonical learning reset
 * epoch. The repository intentionally accepts only bounded failure codes—not
 * Error objects or provider response bodies—for the persisted diagnostic.
 */
export class OutboxEventRepository {
  private readonly now: () => number;
  private readonly createLeaseToken: () => string;
  private readonly leaseDurationMs: number;

  constructor(
    private readonly database: D1Database,
    dependencies: OutboxEventRepositoryDependencies = {},
  ) {
    this.now = dependencies.now ?? Date.now;
    this.createLeaseToken =
      dependencies.createLeaseToken ?? (() => crypto.randomUUID());
    this.leaseDurationMs =
      dependencies.leaseDurationMs ?? OUTBOX_EVENT_LEASE_MS;
    if (
      !Number.isSafeInteger(this.leaseDurationMs)
      || this.leaseDurationMs <= 0
    ) {
      throw new OutboxEventRepositoryError();
    }
  }

  async recoverExpiredLeases(): Promise<number> {
    const timestamp = this.readNow();
    return this.recoverExpiredLeasesAt(timestamp);
  }

  async claimNext(): Promise<ClaimedOutboxEvent | null> {
    const timestamp = this.readNow();
    const leaseExpiresAt = timestamp + this.leaseDurationMs;
    const leaseToken = this.createLeaseToken();
    if (
      !Number.isSafeInteger(leaseExpiresAt)
      || !UUID_PATTERN.test(leaseToken)
    ) {
      throw new OutboxEventRepositoryError();
    }

    try {
      await this.recoverExpiredLeasesAt(timestamp);
      const row = await this.database
        .prepare(
          `UPDATE outbox_events
           SET status = 'processing',
               attempts = attempts + 1,
               lease_token = ?,
               lease_expires_at = ?,
               last_error = NULL
           WHERE id = (
             SELECT candidate.id
             FROM outbox_events candidate
             WHERE candidate.status = 'pending'
               AND candidate.available_at <= ?
               AND ${ACTIVE_USER_SQL("candidate")}
               AND ${CURRENT_RESET_EPOCH_SQL("candidate")}
             ORDER BY candidate.available_at ASC,
                      candidate.created_at ASC,
                      candidate.id ASC
             LIMIT 1
           )
             AND status = 'pending'
             AND available_at <= ?
             AND ${ACTIVE_USER_SQL("outbox_events")}
             AND ${CURRENT_RESET_EPOCH_SQL("outbox_events")}
           RETURNING
             id,
             user_id AS userId,
             aggregate_type AS aggregateType,
             aggregate_id AS aggregateId,
             event_type AS eventType,
             schema_version AS schemaVersion,
             reset_epoch AS resetEpoch,
             payload_json AS payloadJson,
             attempts,
             available_at AS availableAt,
             created_at AS createdAt,
             lease_token AS leaseToken,
             lease_expires_at AS leaseExpiresAt`,
        )
        .bind(leaseToken, leaseExpiresAt, timestamp, timestamp)
        .first<ClaimedOutboxEventRow>();
      return row ? normalizeClaimedEvent(row, leaseToken) : null;
    } catch (error) {
      if (error instanceof OutboxEventRepositoryError) throw error;
      throw new OutboxEventRepositoryError();
    }
  }

  async acknowledgePublished(input: OutboxLeaseIdentity): Promise<boolean> {
    validateLeaseIdentity(input);
    const timestamp = this.readNow();
    return this.completeLease(
      `UPDATE outbox_events
       SET status = 'published',
           published_at = ?,
           last_error = NULL,
           lease_token = NULL,
           lease_expires_at = NULL
       WHERE id = ?
         AND user_id = ?
         AND status = 'processing'
         AND lease_token = ?
         AND lease_expires_at > ?
         AND ${ACTIVE_USER_SQL("outbox_events")}
         AND ${CURRENT_RESET_EPOCH_SQL("outbox_events")}
       RETURNING id`,
      [
        timestamp,
        input.eventId,
        input.userId,
        input.leaseToken,
        timestamp,
      ],
      input.eventId,
    );
  }

  async leaseIsCurrent(input: OutboxLeaseIdentity): Promise<boolean> {
    validateLeaseIdentity(input);
    const timestamp = this.readNow();
    try {
      const row = await this.database
        .prepare(
          `SELECT id
           FROM outbox_events
           WHERE id = ?
             AND user_id = ?
             AND status = 'processing'
             AND lease_token = ?
             AND lease_expires_at > ?
             AND ${ACTIVE_USER_SQL("outbox_events")}
             AND ${CURRENT_RESET_EPOCH_SQL("outbox_events")}
           LIMIT 1`,
        )
        .bind(
          input.eventId,
          input.userId,
          input.leaseToken,
          timestamp,
        )
        .first<{ id: string }>();
      if (!row) return false;
      if (row.id !== input.eventId) {
        throw new OutboxEventRepositoryError();
      }
      return true;
    } catch (error) {
      if (error instanceof OutboxEventRepositoryError) throw error;
      throw new OutboxEventRepositoryError();
    }
  }

  async scheduleRetry(input: OutboxRetryInput): Promise<boolean> {
    validateLeaseIdentity(input);
    validateFailureCode(input.failureCode);
    const timestamp = this.readNow();
    if (!isSafeEpoch(input.retryAt) || input.retryAt < timestamp) {
      throw new OutboxEventRepositoryError();
    }
    return this.completeLease(
      `UPDATE outbox_events
       SET status = 'pending',
           available_at = ?,
           last_error = ?,
           lease_token = NULL,
           lease_expires_at = NULL
       WHERE id = ?
         AND user_id = ?
         AND status = 'processing'
         AND lease_token = ?
         AND lease_expires_at > ?
         AND ${ACTIVE_USER_SQL("outbox_events")}
         AND ${CURRENT_RESET_EPOCH_SQL("outbox_events")}
       RETURNING id`,
      [
        input.retryAt,
        input.failureCode,
        input.eventId,
        input.userId,
        input.leaseToken,
        timestamp,
      ],
      input.eventId,
    );
  }

  async markDead(input: OutboxDeadLetterInput): Promise<boolean> {
    validateLeaseIdentity(input);
    validateFailureCode(input.failureCode);
    const timestamp = this.readNow();
    return this.completeLease(
      `UPDATE outbox_events
       SET status = 'dead',
           last_error = ?,
           lease_token = NULL,
           lease_expires_at = NULL
       WHERE id = ?
         AND user_id = ?
         AND status = 'processing'
         AND lease_token = ?
         AND lease_expires_at > ?
         AND ${ACTIVE_USER_SQL("outbox_events")}
         AND ${CURRENT_RESET_EPOCH_SQL("outbox_events")}
       RETURNING id`,
      [
        input.failureCode,
        input.eventId,
        input.userId,
        input.leaseToken,
        timestamp,
      ],
      input.eventId,
    );
  }

  async requeueDead(input: OutboxReplayInput): Promise<boolean> {
    if (
      !isBoundedIdentifier(input.eventId)
      || !isBoundedIdentifier(input.userId)
      || !isSafeEpoch(input.expectedAttempts)
    ) {
      throw new OutboxEventRepositoryError();
    }
    const timestamp = this.readNow();
    const availableAt = input.availableAt ?? timestamp;
    if (!isSafeEpoch(availableAt) || availableAt < timestamp) {
      throw new OutboxEventRepositoryError();
    }
    return this.completeLease(
      `UPDATE outbox_events
       SET status = 'pending',
           available_at = ?,
           published_at = NULL,
           last_error = NULL,
           lease_token = NULL,
           lease_expires_at = NULL
       WHERE id = ?
         AND user_id = ?
         AND status = 'dead'
         AND attempts = ?
         AND ${ACTIVE_USER_SQL("outbox_events")}
         AND ${CURRENT_RESET_EPOCH_SQL("outbox_events")}
       RETURNING id`,
      [
        availableAt,
        input.eventId,
        input.userId,
        input.expectedAttempts,
      ],
      input.eventId,
    );
  }

  private readNow() {
    const timestamp = this.now();
    if (!isSafeEpoch(timestamp)) throw new OutboxEventRepositoryError();
    return timestamp;
  }

  private async recoverExpiredLeasesAt(timestamp: number): Promise<number> {
    try {
      const result = await this.database
        .prepare(
          `UPDATE outbox_events
           SET status = 'pending',
               lease_token = NULL,
               lease_expires_at = NULL
           WHERE status = 'processing'
             AND lease_expires_at IS NOT NULL
             AND lease_expires_at <= ?
             AND ${ACTIVE_USER_SQL("outbox_events")}
             AND ${CURRENT_RESET_EPOCH_SQL("outbox_events")}`,
        )
        .bind(timestamp)
        .run();
      if (!result.success) throw new OutboxEventRepositoryError();
      const changes = Number(result.meta?.changes ?? 0);
      if (!Number.isSafeInteger(changes) || changes < 0) {
        throw new OutboxEventRepositoryError();
      }
      return changes;
    } catch (error) {
      if (error instanceof OutboxEventRepositoryError) throw error;
      throw new OutboxEventRepositoryError();
    }
  }

  private async completeLease(
    query: string,
    bindings: unknown[],
    expectedEventId: string,
  ): Promise<boolean> {
    try {
      const updated = await this.database
        .prepare(query)
        .bind(...bindings)
        .first<{ id: string }>();
      if (!updated) return false;
      if (updated.id !== expectedEventId) {
        throw new OutboxEventRepositoryError();
      }
      return true;
    } catch (error) {
      if (error instanceof OutboxEventRepositoryError) throw error;
      throw new OutboxEventRepositoryError();
    }
  }
}
