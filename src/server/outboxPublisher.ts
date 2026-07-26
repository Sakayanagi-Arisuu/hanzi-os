import {
  decodeOutboxEvent,
  MAX_OUTBOX_EVENT_PAYLOAD_BYTES,
  type OutboxDecodeFailureCode,
  type OutboxEventEnvelopeV1,
} from "./outboxEventContract";
import type { ClaimedOutboxEvent } from "./outboxEventRepository";

export const OUTBOX_SINK_FAILURE_CODES = [
  "OUTBOX_SINK_RATE_LIMITED",
  "OUTBOX_SINK_UNAVAILABLE",
  "OUTBOX_SINK_REJECTED",
] as const;

export type OutboxSinkFailureCode =
  typeof OUTBOX_SINK_FAILURE_CODES[number];
export type OutboxFailureCode =
  | OutboxDecodeFailureCode
  | OutboxSinkFailureCode;

export type { ClaimedOutboxEvent } from "./outboxEventRepository";

export type OutboxSinkResult =
  | { ok: true }
  | {
    ok: false;
    retryable: boolean;
    failureCode: OutboxSinkFailureCode;
  };

export interface OutboxEventSink {
  /**
   * Consumers must deduplicate by envelope.eventId. Delivery is at least once:
   * a successful publish can be repeated if the repository acknowledgement
   * fails afterwards.
   *
   * Dedupe is not sufficient for production enablement. A real adapter must
   * also prevent an event from becoming visible after its account is deleted
   * or its reset epoch is superseded. That requires an authoritative
   * account/reset-epoch fence at the downstream commit/read boundary; a
   * preflight D1 lease check cannot make a cross-system commit atomic. The
   * repository deliberately ships no runtime adapter until that capability is
   * implemented and reviewed.
   */
  publish(envelope: OutboxEventEnvelopeV1): Promise<OutboxSinkResult>;
}

export interface OutboxDeliveryRepository {
  claimNext(): Promise<ClaimedOutboxEvent | null>;

  leaseIsCurrent(input: {
    eventId: string;
    userId: string;
    leaseToken: string;
  }): Promise<boolean>;

  acknowledgePublished(input: {
    eventId: string;
    userId: string;
    leaseToken: string;
  }): Promise<boolean>;

  scheduleRetry(input: {
    eventId: string;
    userId: string;
    leaseToken: string;
    retryAt: number;
    failureCode: string;
  }): Promise<boolean>;

  markDead(input: {
    eventId: string;
    userId: string;
    leaseToken: string;
    failureCode: string;
  }): Promise<boolean>;
}

export interface OutboxClock {
  now(): number;
}

export type OutboxPublishPolicy = {
  batchSize: number;
  maximumAttempts: number;
  initialRetryDelayMs: number;
  maximumRetryDelayMs: number;
  maximumPayloadBytes: number;
};

export const DEFAULT_OUTBOX_PUBLISH_POLICY: Readonly<OutboxPublishPolicy> = {
  batchSize: 50,
  maximumAttempts: 8,
  initialRetryDelayMs: 1_000,
  maximumRetryDelayMs: 15 * 60_000,
  maximumPayloadBytes: MAX_OUTBOX_EVENT_PAYLOAD_BYTES,
};

export type OutboxDrainSummary = {
  claimed: number;
  published: number;
  retried: number;
  deadLettered: number;
  decodeFailures: number;
  sinkFailures: number;
  deliveredButUnacknowledged: number;
  repositoryFailures: number;
  staleLeaseTransitions: number;
};

export type OutboxDrainLog = OutboxDrainSummary & {
  event: "outbox_drain_completed";
  status: "completed" | "repository-failure";
};

export interface OutboxDrainLogger {
  write(summary: OutboxDrainLog): void;
}

export type OutboxPublisherDependencies = {
  repository: OutboxDeliveryRepository;
  sink: OutboxEventSink;
  clock: OutboxClock;
  policy?: Readonly<OutboxPublishPolicy>;
  logger?: OutboxDrainLogger;
};

const NOOP_LOGGER: OutboxDrainLogger = { write: () => undefined };

const assertPositiveSafeInteger = (value: number, field: string) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`Invalid outbox publish policy field: ${field}.`);
  }
};

const validatePolicy = (
  policy: Readonly<OutboxPublishPolicy>,
): Readonly<OutboxPublishPolicy> => {
  assertPositiveSafeInteger(policy.batchSize, "batchSize");
  assertPositiveSafeInteger(policy.maximumAttempts, "maximumAttempts");
  assertPositiveSafeInteger(
    policy.initialRetryDelayMs,
    "initialRetryDelayMs",
  );
  assertPositiveSafeInteger(
    policy.maximumRetryDelayMs,
    "maximumRetryDelayMs",
  );
  assertPositiveSafeInteger(policy.maximumPayloadBytes, "maximumPayloadBytes");
  if (policy.maximumRetryDelayMs < policy.initialRetryDelayMs) {
    throw new TypeError(
      "Invalid outbox publish policy: maximumRetryDelayMs is too small.",
    );
  }
  return policy;
};

const calculateRetryDelay = (
  attemptNumber: number,
  policy: Readonly<OutboxPublishPolicy>,
) => {
  const exponent = Math.min(attemptNumber - 1, 52);
  return Math.min(
    policy.maximumRetryDelayMs,
    policy.initialRetryDelayMs * 2 ** exponent,
  );
};

const isSinkFailureCode = (value: unknown): value is OutboxSinkFailureCode =>
  typeof value === "string"
  && (OUTBOX_SINK_FAILURE_CODES as readonly string[]).includes(value);

const normalizeSinkFailure = (
  value: unknown,
): { retryable: boolean; failureCode: OutboxSinkFailureCode } => {
  if (
    value !== null
    && typeof value === "object"
    && (value as { ok?: unknown }).ok === false
  ) {
    const retryable = (value as { retryable?: unknown }).retryable === true;
    const requestedCode = (value as { failureCode?: unknown }).failureCode;
    if (isSinkFailureCode(requestedCode)) {
      return { retryable, failureCode: requestedCode };
    }
    return {
      retryable,
      failureCode: retryable
        ? "OUTBOX_SINK_UNAVAILABLE"
        : "OUTBOX_SINK_REJECTED",
    };
  }
  return {
    retryable: false,
    failureCode: "OUTBOX_SINK_REJECTED",
  };
};

const emptySummary = (): OutboxDrainSummary => ({
  claimed: 0,
  published: 0,
  retried: 0,
  deadLettered: 0,
  decodeFailures: 0,
  sinkFailures: 0,
  deliveredButUnacknowledged: 0,
  repositoryFailures: 0,
  staleLeaseTransitions: 0,
});

const safeAttemptNumber = (event: ClaimedOutboxEvent) =>
  Number.isSafeInteger(event.attempts) && event.attempts >= 1
    ? event.attempts
    : 1;

export class OutboxPublisher {
  private readonly policy: Readonly<OutboxPublishPolicy>;
  private readonly logger: OutboxDrainLogger;

  constructor(private readonly dependencies: OutboxPublisherDependencies) {
    this.policy = validatePolicy(
      dependencies.policy ?? DEFAULT_OUTBOX_PUBLISH_POLICY,
    );
    this.logger = dependencies.logger ?? NOOP_LOGGER;
  }

  async drain(): Promise<OutboxDrainSummary> {
    const summary = emptySummary();

    for (let index = 0; index < this.policy.batchSize; index += 1) {
      let event: ClaimedOutboxEvent | null;
      try {
        event = await this.dependencies.repository.claimNext();
      } catch {
        summary.repositoryFailures += 1;
        break;
      }
      if (!event) break;

      summary.claimed += 1;
      const attemptNumber = safeAttemptNumber(event);
      const decoded = decodeOutboxEvent(
        event,
        this.policy.maximumPayloadBytes,
      );
      if (!decoded.ok) {
        summary.decodeFailures += 1;
        try {
          const transitioned = await this.dependencies.repository.markDead({
            eventId: event.id,
            userId: event.userId,
            leaseToken: event.leaseToken,
            failureCode: decoded.failureCode,
          });
          if (transitioned) summary.deadLettered += 1;
          else summary.staleLeaseTransitions += 1;
        } catch {
          summary.repositoryFailures += 1;
        }
        continue;
      }

      try {
        const leaseIsCurrent =
          await this.dependencies.repository.leaseIsCurrent({
            eventId: event.id,
            userId: event.userId,
            leaseToken: event.leaseToken,
          });
        if (!leaseIsCurrent) {
          summary.staleLeaseTransitions += 1;
          continue;
        }
      } catch {
        summary.repositoryFailures += 1;
        break;
      }

      let sinkResult: unknown;
      try {
        sinkResult = await this.dependencies.sink.publish(decoded.envelope);
      } catch {
        sinkResult = {
          ok: false,
          retryable: true,
          failureCode: "OUTBOX_SINK_UNAVAILABLE",
        };
      }

      if (
        sinkResult !== null
        && typeof sinkResult === "object"
        && (sinkResult as { ok?: unknown }).ok === true
      ) {
        try {
          const transitioned =
            await this.dependencies.repository.acknowledgePublished({
            eventId: event.id,
            userId: event.userId,
            leaseToken: event.leaseToken,
          });
          if (transitioned) {
            summary.published += 1;
          } else {
            summary.deliveredButUnacknowledged += 1;
            summary.staleLeaseTransitions += 1;
          }
        } catch {
          // The sink may have accepted the event. Leaving the lease unacked
          // deliberately permits a later duplicate rather than data loss.
          summary.deliveredButUnacknowledged += 1;
          summary.repositoryFailures += 1;
        }
        continue;
      }

      summary.sinkFailures += 1;
      const failure = normalizeSinkFailure(sinkResult);
      const exhausted = attemptNumber >= this.policy.maximumAttempts;
      if (!failure.retryable || exhausted) {
        try {
          const transitioned = await this.dependencies.repository.markDead({
            eventId: event.id,
            userId: event.userId,
            leaseToken: event.leaseToken,
            failureCode: failure.failureCode,
          });
          if (transitioned) summary.deadLettered += 1;
          else summary.staleLeaseTransitions += 1;
        } catch {
          summary.repositoryFailures += 1;
        }
        continue;
      }

      const retryAt = this.dependencies.clock.now()
        + calculateRetryDelay(attemptNumber, this.policy);
      try {
        const transitioned = await this.dependencies.repository.scheduleRetry({
          eventId: event.id,
          userId: event.userId,
          leaseToken: event.leaseToken,
          retryAt,
          failureCode: failure.failureCode,
        });
        if (transitioned) summary.retried += 1;
        else summary.staleLeaseTransitions += 1;
      } catch {
        summary.repositoryFailures += 1;
      }
    }

    try {
      this.logger.write({
        event: "outbox_drain_completed",
        status: summary.repositoryFailures > 0
          ? "repository-failure"
          : "completed",
        ...summary,
      });
    } catch {
      // Observability must not change delivery state or surface logger errors.
    }
    return summary;
  }
}
