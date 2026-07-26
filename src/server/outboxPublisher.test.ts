import { describe, expect, it, vi } from "vitest";
import {
  type ClaimedOutboxEvent,
  type OutboxDrainLog,
  type OutboxDeliveryRepository,
  OutboxPublisher,
  type OutboxPublishPolicy,
} from "./outboxPublisher";

const MANIFEST_HASH = `sha256:${"a".repeat(64)}`;
const FORM_HASH = `sha256:${"b".repeat(64)}`;

const validEvent = (
  overrides: Partial<ClaimedOutboxEvent> = {},
): ClaimedOutboxEvent => ({
  id: "event-1",
  userId: "opaque-user",
  aggregateType: "lesson_session",
  aggregateId: "lesson-session",
  eventType: "lesson.started",
  schemaVersion: 1,
  resetEpoch: 2,
  payloadJson: JSON.stringify({
    idempotencyKey: "must-not-leave-process",
    sessionId: "lesson-session",
    enrollmentId: "enrollment",
    contentVersion: "foundation-2026.07.3",
    resetEpoch: 2,
    contentManifestSha256: MANIFEST_HASH,
    lessonId: "lesson-1",
    lessonVersion: "lesson-1-v1",
    expectedEvidenceCount: 3,
    formSchemaVersion: 1,
    formHash: FORM_HASH,
    startedAt: "2026-07-25T00:00:00.000Z",
  }),
  attempts: 1,
  availableAt: 0,
  createdAt: 1_753_401_600_000,
  leaseToken: "lease-1",
  leaseExpiresAt: 40_000,
  ...overrides,
});

const policy = (
  overrides: Partial<OutboxPublishPolicy> = {},
): OutboxPublishPolicy => ({
  batchSize: 10,
  maximumAttempts: 3,
  initialRetryDelayMs: 1_000,
  maximumRetryDelayMs: 60_000,
  maximumPayloadBytes: 64 * 1024,
  ...overrides,
});

const repositoryWith = (
  events: Array<ClaimedOutboxEvent | null>,
): OutboxDeliveryRepository & {
  claimNext: ReturnType<typeof vi.fn>;
  leaseIsCurrent: ReturnType<typeof vi.fn>;
  acknowledgePublished: ReturnType<typeof vi.fn>;
  scheduleRetry: ReturnType<typeof vi.fn>;
  markDead: ReturnType<typeof vi.fn>;
} => ({
  claimNext: vi.fn()
    .mockImplementation(() => Promise.resolve(events.shift() ?? null)),
  leaseIsCurrent: vi.fn().mockResolvedValue(true),
  acknowledgePublished: vi.fn().mockResolvedValue(true),
  scheduleRetry: vi.fn().mockResolvedValue(true),
  markDead: vi.fn().mockResolvedValue(true),
});

describe("outbox publisher", () => {
  it("acknowledges only after a successful sink delivery", async () => {
    const repository = repositoryWith([validEvent(), null]);
    const sink = { publish: vi.fn().mockResolvedValue({ ok: true }) };

    const summary = await new OutboxPublisher({
      repository,
      sink,
      clock: { now: () => 10_000 },
      policy: policy(),
    }).drain();

    expect(sink.publish).toHaveBeenCalledWith(expect.objectContaining({
      eventId: "event-1",
      tenantId: "opaque-user",
      payload: expect.not.objectContaining({
        idempotencyKey: expect.anything(),
      }),
    }));
    expect(repository.acknowledgePublished).toHaveBeenCalledWith({
      eventId: "event-1",
      userId: "opaque-user",
      leaseToken: "lease-1",
    });
    expect(summary).toMatchObject({
      claimed: 1,
      published: 1,
      retried: 0,
      deadLettered: 0,
    });
  });

  it("preserves at-least-once delivery when acknowledgement fails", async () => {
    const event = validEvent();
    const repository = repositoryWith([event, null, event, null]);
    repository.acknowledgePublished
      .mockRejectedValueOnce(new Error("database-secret"))
      .mockResolvedValueOnce(true);
    const sink = { publish: vi.fn().mockResolvedValue({ ok: true }) };
    const logger = { write: vi.fn() };
    const publisher = new OutboxPublisher({
      repository,
      sink,
      clock: { now: () => 10_000 },
      policy: policy(),
      logger,
    });

    const first = await publisher.drain();
    const second = await publisher.drain();

    expect(sink.publish).toHaveBeenCalledTimes(2);
    expect(sink.publish.mock.calls.map(([envelope]) => envelope.eventId))
      .toEqual(["event-1", "event-1"]);
    expect(first.deliveredButUnacknowledged).toBe(1);
    expect(first.repositoryFailures).toBe(1);
    expect(second.published).toBe(1);
    expect(JSON.stringify(logger.write.mock.calls)).not.toContain(
      "database-secret",
    );
  });

  it("reports stale lease transitions without claiming a state change", async () => {
    const repository = repositoryWith([validEvent(), null]);
    repository.acknowledgePublished.mockResolvedValue(false);

    const summary = await new OutboxPublisher({
      repository,
      sink: { publish: vi.fn().mockResolvedValue({ ok: true }) },
      clock: { now: () => 10_000 },
      policy: policy(),
    }).drain();

    expect(summary).toMatchObject({
      claimed: 1,
      published: 0,
      deliveredButUnacknowledged: 1,
      staleLeaseTransitions: 1,
      repositoryFailures: 0,
    });
  });

  it("does not call the sink when the preflight lease is already stale", async () => {
    const repository = repositoryWith([validEvent(), null]);
    repository.leaseIsCurrent.mockResolvedValue(false);
    const sink = { publish: vi.fn() };

    const summary = await new OutboxPublisher({
      repository,
      sink,
      clock: { now: () => 10_000 },
      policy: policy(),
    }).drain();

    expect(sink.publish).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      claimed: 1,
      staleLeaseTransitions: 1,
      repositoryFailures: 0,
    });
  });

  it("uses capped exponential retry and persists only allow-listed codes", async () => {
    const repository = repositoryWith([
      validEvent({ attempts: 3 }),
      null,
    ]);
    const sink = {
      publish: vi.fn().mockResolvedValue({
        ok: false,
        retryable: true,
        failureCode: "RAW_PROVIDER_SECRET",
      }),
    };

    const summary = await new OutboxPublisher({
      repository,
      sink: sink as never,
      clock: { now: () => 10_000 },
      policy: policy({ maximumAttempts: 5 }),
    }).drain();

    expect(repository.scheduleRetry).toHaveBeenCalledWith({
      eventId: "event-1",
      userId: "opaque-user",
      leaseToken: "lease-1",
      retryAt: 14_000,
      failureCode: "OUTBOX_SINK_UNAVAILABLE",
    });
    expect(JSON.stringify(repository.scheduleRetry.mock.calls))
      .not.toContain("RAW_PROVIDER_SECRET");
    expect(summary.retried).toBe(1);
  });

  it("dead-letters exhausted and permanent sink failures", async () => {
    const exhaustedRepository = repositoryWith([
      validEvent({ attempts: 3 }),
      null,
    ]);
    const unavailableSink = {
      publish: vi.fn().mockRejectedValue(new Error("provider raw response")),
    };

    await new OutboxPublisher({
      repository: exhaustedRepository,
      sink: unavailableSink,
      clock: { now: () => 10_000 },
      policy: policy(),
    }).drain();

    expect(exhaustedRepository.markDead).toHaveBeenCalledWith({
      eventId: "event-1",
      userId: "opaque-user",
      leaseToken: "lease-1",
      failureCode: "OUTBOX_SINK_UNAVAILABLE",
    });

    const rejectedRepository = repositoryWith([validEvent(), null]);
    await new OutboxPublisher({
      repository: rejectedRepository,
      sink: {
        publish: vi.fn().mockResolvedValue({
          ok: false,
          retryable: false,
          failureCode: "OUTBOX_SINK_REJECTED",
        }),
      },
      clock: { now: () => 10_000 },
      policy: policy(),
    }).drain();
    expect(rejectedRepository.markDead).toHaveBeenCalledWith(
      expect.objectContaining({
        failureCode: "OUTBOX_SINK_REJECTED",
      }),
    );
  });

  it("dead-letters a poison event and continues with the next event", async () => {
    const poison = validEvent({
      id: "poison-event",
      eventType: "unknown.event",
      payloadJson: JSON.stringify({
        email: "learner@example.com",
        answer: "private-answer",
      }),
    });
    const healthy = validEvent({ id: "healthy-event", leaseToken: "lease-2" });
    const repository = repositoryWith([poison, healthy, null]);
    const sink = { publish: vi.fn().mockResolvedValue({ ok: true }) };

    const summary = await new OutboxPublisher({
      repository,
      sink,
      clock: { now: () => 10_000 },
      policy: policy(),
    }).drain();

    expect(repository.markDead).toHaveBeenCalledWith({
      eventId: "poison-event",
      userId: "opaque-user",
      leaseToken: "lease-1",
      failureCode: "OUTBOX_UNSUPPORTED_EVENT_TYPE",
    });
    expect(sink.publish).toHaveBeenCalledTimes(1);
    expect(repository.acknowledgePublished).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "healthy-event" }),
    );
    expect(summary).toMatchObject({
      claimed: 2,
      published: 1,
      deadLettered: 1,
      decodeFailures: 1,
    });
  });

  it("writes aggregate-only summaries and never raw event or error data", async () => {
    const repository = repositoryWith([validEvent({
      payloadJson: JSON.stringify({
        ...JSON.parse(validEvent().payloadJson),
        email: "learner@example.com",
        transcript: "private transcript",
      }),
    }), null]);
    const logs: OutboxDrainLog[] = [];

    await new OutboxPublisher({
      repository,
      sink: {
        publish: vi.fn().mockRejectedValue(
          new Error("provider-token-and-object-key"),
        ),
      },
      clock: { now: () => 10_000 },
      policy: policy(),
      logger: { write: (entry) => logs.push(entry) },
    }).drain();

    expect(logs).toEqual([{
      event: "outbox_drain_completed",
      status: "completed",
      claimed: 1,
      published: 0,
      retried: 1,
      deadLettered: 0,
      decodeFailures: 0,
      sinkFailures: 1,
      deliveredButUnacknowledged: 0,
      repositoryFailures: 0,
      staleLeaseTransitions: 0,
    }]);
    expect(JSON.stringify(logs)).not.toMatch(
      /event-1|opaque-user|learner@example|private transcript|provider-token|object-key/ui,
    );
  });

  it("stops safely on claim failure and validates injected policy", async () => {
    const logger = { write: vi.fn() };
    const repository = repositoryWith([]);
    repository.claimNext.mockRejectedValue(new Error("database detail"));
    const summary = await new OutboxPublisher({
      repository,
      sink: { publish: vi.fn() },
      clock: { now: () => 10_000 },
      policy: policy(),
      logger,
    }).drain();

    expect(summary.repositoryFailures).toBe(1);
    expect(logger.write).toHaveBeenCalledWith(expect.objectContaining({
      status: "repository-failure",
      repositoryFailures: 1,
    }));
    expect(() => new OutboxPublisher({
      repository,
      sink: { publish: vi.fn() },
      clock: { now: () => 10_000 },
      policy: policy({ maximumAttempts: 0 }),
    })).toThrow(/maximumAttempts/u);
  });
});
