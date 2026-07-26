import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import {
  REVIEW_PROTOCOL_VERSION,
  REVIEW_SCHEDULER_VERSION,
  reviewWordVersion,
  type GradeReviewCommandV1,
  type GradeReviewReceiptV1,
} from "../learning/reviewProtocol";
import {
  createSameOriginLearningCommandTransport,
  flushLearningCommandOutbox,
  REVIEW_GRADE_COMMAND_ENDPOINT,
  type LearningCommandTransport,
  type LearningCommandTransportResponse,
} from "./learningCommandCoordinator";
import {
  enqueueReviewGradeCommand,
  LearningCommandConflictError,
  listLearningCommandRecords,
  prepareLearningCommand,
  type LearningCommandOutboxRecord,
  type ReviewGradeQueueCommandV1,
} from "./learningCommandOutbox";
import {
  ACTIVE_OWNER_GENERATION_KEY,
  LEARNING_COMMAND_OUTBOX_STORE,
  openSyncDatabase,
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  StaleOwnerGenerationError,
  writeSyncMeta,
  type OwnerGeneration,
} from "./indexedDb";

const DATABASE_NAME = "hanzi-os-sync-v1";
const NOW = new Date("2026-07-26T04:00:00.000Z");
const wordId = RELEASED_LESSONS[0]!.wordIds[0]!;

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), {
    once: true,
  });
});

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener("error", () => reject(request.error), {
      once: true,
    });
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(
        transaction.error ?? new Error("IndexedDB transaction aborted"),
      ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(
        transaction.error ?? new Error("IndexedDB transaction failed"),
      ),
      { once: true },
    );
  });

const command = (
  idempotencyKey = "review-grade:outbox:one",
): ReviewGradeQueueCommandV1 => ({
  protocolVersion: REVIEW_PROTOCOL_VERSION,
  idempotencyKey,
  installationId: "installation:review",
  deviceId: "device:review",
  contentVersion: CONTENT_VERSION,
  schedulerVersion: REVIEW_SCHEDULER_VERSION,
  cardId: "review-card:one",
  wordId,
  wordVersion: reviewWordVersion(wordId),
  expectedCardRevision: 3,
  rating: 3,
  durationMs: 2_500,
});

const input = (
  ownerGeneration: OwnerGeneration,
  queuedCommand = command(),
  expectedResetEpoch = 0,
) => ({
  ownerGeneration,
  expectedResetEpoch,
  enqueuedAt: NOW.toISOString(),
  command: queuedCommand,
});

const receipt = (
  sent: GradeReviewCommandV1,
  duplicate = false,
): GradeReviewReceiptV1 => ({
  protocolVersion: REVIEW_PROTOCOL_VERSION,
  idempotencyKey: sent.idempotencyKey,
  duplicate,
  reviewLogId: "review-log:outbox:one",
  cardId: sent.cardId,
  wordId: sent.wordId,
  wordVersion: sent.wordVersion,
  previousCardRevision: sent.expectedCardRevision,
  cardRevision: sent.expectedCardRevision + 1,
  resetEpoch: sent.resetEpoch,
  contentVersion: sent.contentVersion,
  schedulerVersion: sent.schedulerVersion,
  rating: sent.rating,
  scheduledAt: "2026-07-26T03:00:00.000Z",
  reviewedAt: "2026-07-26T04:00:00.000Z",
  nextDueAt: "2026-07-29T04:00:00.000Z",
  verification: "server-scheduled-self-rating",
  masteryEligible: false,
});

const response = (
  status: number,
  body: unknown,
  retryAfterMs = 0,
): LearningCommandTransportResponse => ({ status, body, retryAfterMs });

const unsupportedSend = async (): Promise<LearningCommandTransportResponse> => {
  throw new Error("Only review-grade transport is expected in this test.");
};

const transport = (
  sendReviewGrade: LearningCommandTransport["sendReviewGrade"],
): LearningCommandTransport => ({
  sendLessonSession: unsupportedSend,
  sendObjectiveAttempt: unsupportedSend,
  sendLessonSessionSubmission: unsupportedSend,
  sendLessonSessionAbandonment: unsupportedSend,
  sendOpenAssessmentSession: unsupportedSend,
  sendRecordAssessmentAttempt: unsupportedSend,
  sendSubmitAssessmentSession: unsupportedSend,
  sendAbandonAssessmentSession: unsupportedSend,
  sendOpenReaderSession: unsupportedSend,
  sendRecordReaderAttempt: unsupportedSend,
  sendSubmitReaderSession: unsupportedSend,
  sendAbandonReaderSession: unsupportedSend,
  sendReviewGrade,
});

const overwriteRecord = async (
  recordKey: string,
  mutate: (record: LearningCommandOutboxRecord) => LearningCommandOutboxRecord,
) => {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    LEARNING_COMMAND_OUTBOX_STORE,
    "readwrite",
  );
  const done = transactionDone(transaction);
  const store = transaction.objectStore(LEARNING_COMMAND_OUTBOX_STORE);
  const record = await requestResult(
    store.get(recordKey) as IDBRequest<
      LearningCommandOutboxRecord | undefined
    >,
  );
  if (!record) throw new Error("Queued review command disappeared.");
  store.put(mutate(record));
  await done;
};

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
  vi.restoreAllMocks();
});

describe("durable review-grade learning command", () => {
  it("allocates authority fields and treats an exact retry as one owner-scoped record", async () => {
    const ownerA = (
      await readOrInitializeOwnerGeneration("account:review-a")
    ).ownerGeneration;
    const first = await enqueueReviewGradeCommand(input(ownerA));
    const exactRetry = await enqueueReviewGradeCommand({
      ...input(ownerA),
      enqueuedAt: "2026-07-26T04:01:00.000Z",
    });

    expect(first).toMatchObject({
      kind: "review-grade",
      ownerKey: ownerA.ownerKey,
      resetEpoch: 0,
      sessionAlias: null,
      dependencyRecordKey: null,
      status: "pending",
      receipt: null,
      command: {
        ...command(),
        resetEpoch: 0,
      },
    });
    expect(first.command.deviceSequence).toBe(first.deviceSequence);
    expect(first.deviceSequence).toBeGreaterThan(0);
    expect(first.requestHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(exactRetry).toEqual(first);

    await expect(enqueueReviewGradeCommand(input(ownerA, {
      ...command(),
      rating: 4,
    }))).rejects.toBeInstanceOf(LearningCommandConflictError);

    const ownerB = {
      ownerKey: "account:review-b",
      generation: ownerA.generation + 1,
    };
    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, ownerB);
    const otherOwner = await enqueueReviewGradeCommand(input(ownerB));
    expect(otherOwner.requestHash).not.toBe(first.requestHash);
    expect(otherOwner.ownerKey).toBe(ownerB.ownerKey);
  });

  it("enforces owner-generation and reset-epoch fences before persistence", async () => {
    const staleOwner = (
      await readOrInitializeOwnerGeneration("account:review-stale")
    ).ownerGeneration;
    const currentOwner = {
      ownerKey: "account:review-current",
      generation: staleOwner.generation + 1,
    };
    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, currentOwner);

    await expect(
      enqueueReviewGradeCommand(input(staleOwner)),
    ).rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(
      enqueueReviewGradeCommand(input(currentOwner, command(), 1)),
    ).rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(listLearningCommandRecords(currentOwner)).resolves.toEqual([]);
  });

  it("prevents two live idempotency keys from grading the same card revision", async () => {
    const owner = (
      await readOrInitializeOwnerGeneration("account:review-conflict")
    ).ownerGeneration;
    await enqueueReviewGradeCommand(input(owner));

    await expect(enqueueReviewGradeCommand(input(owner, command(
      "review-grade:outbox:two",
    )))).rejects.toThrow(
      "Review card revision is already bound to another grade command.",
    );
  });

  it("fails preparation when the owner-scoped request hash is corrupted", async () => {
    const owner = (
      await readOrInitializeOwnerGeneration("account:review-prepare")
    ).ownerGeneration;
    const queued = await enqueueReviewGradeCommand(input(owner));
    await expect(
      prepareLearningCommand(queued.recordKey, owner),
    ).resolves.toMatchObject({
      state: "ready",
      prepared: {
        kind: "review-grade",
        command: queued.command,
      },
    });

    await overwriteRecord(queued.recordKey, (record) => ({
      ...record,
      requestHash: "0".repeat(64),
    }));
    await expect(
      prepareLearningCommand(queued.recordKey, owner),
    ).resolves.toEqual({
      state: "invalid",
      reason: "Review-grade command envelope is invalid.",
    });
  });

  it("fails closed for a legacy queued grade without an exact word binding", async () => {
    const owner = (
      await readOrInitializeOwnerGeneration("account:review-legacy")
    ).ownerGeneration;
    const queued = await enqueueReviewGradeCommand(input(owner));
    await overwriteRecord(queued.recordKey, (record) => {
      if (record.kind !== "review-grade") {
        throw new Error("Expected a queued review-grade command.");
      }
      const invalidCommand = {
        ...record.command,
      } as Partial<GradeReviewCommandV1>;
      delete invalidCommand.wordId;
      return {
        ...record,
        command: invalidCommand as GradeReviewCommandV1,
      };
    });

    await expect(
      prepareLearningCommand(queued.recordKey, owner),
    ).resolves.toEqual({
      state: "invalid",
      reason: "Review command contains unknown or missing fields.",
    });
  });

  it("uses only the fixed same-origin review-grade endpoint", async () => {
    const sent = {
      ...command(),
      deviceSequence: 9,
      resetEpoch: 0,
    } satisfies GradeReviewCommandV1;
    const fetchMock = vi.fn(async (
      requestInfo: RequestInfo | URL,
      requestInit?: RequestInit,
    ) => {
      expect(String(requestInfo)).toBe(REVIEW_GRADE_COMMAND_ENDPOINT);
      expect(requestInit).toMatchObject({
        method: "POST",
        credentials: "same-origin",
        redirect: "error",
        cache: "no-store",
        body: JSON.stringify(sent),
      });
      return new Response(JSON.stringify(receipt(sent)), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    });
    const sameOriginTransport = createSameOriginLearningCommandTransport({
      fetch: fetchMock as typeof fetch,
      origin: "https://hanzi.example",
    });

    await expect(
      sameOriginTransport.sendReviewGrade(sent),
    ).resolves.toMatchObject({
      status: 201,
      body: receipt(sent),
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("acknowledges an exact receipt and keeps the card revision single-writer", async () => {
    const owner = (
      await readOrInitializeOwnerGeneration("account:review-ack")
    ).ownerGeneration;
    const queued = await enqueueReviewGradeCommand(input(owner));
    const sender = vi.fn(async (sent: GradeReviewCommandV1) =>
      response(201, receipt(sent))
    );

    await expect(flushLearningCommandOutbox({
      ownerGeneration: owner,
      transport: transport(sender),
      now: () => new Date(NOW),
    })).resolves.toEqual({
      acknowledged: 1,
      quarantined: 0,
      retried: 0,
      blocked: 0,
    });
    expect(sender).toHaveBeenCalledWith(queued.command);
    await expect(listLearningCommandRecords(owner)).resolves.toEqual([
      expect.objectContaining({
        kind: "review-grade",
        status: "acknowledged",
        receipt: receipt(queued.command),
      }),
    ]);
    await expect(enqueueReviewGradeCommand(input(owner, command(
      "review-grade:outbox:after-ack",
    )))).rejects.toBeInstanceOf(LearningCommandConflictError);
  });

  it.each([
    {
      label: "wrong card",
      corrupt: (valid: GradeReviewReceiptV1) => ({
        ...valid,
        cardId: "review-card:other",
      }),
    },
    {
      label: "wrong word",
      corrupt: (valid: GradeReviewReceiptV1) => ({
        ...valid,
        wordId: "other-word",
      }),
    },
    {
      label: "wrong word version",
      corrupt: (valid: GradeReviewReceiptV1) => ({
        ...valid,
        wordVersion: `${valid.wordVersion}:tampered`,
      }),
    },
    {
      label: "wrong revision",
      corrupt: (valid: GradeReviewReceiptV1) => ({
        ...valid,
        cardRevision: valid.cardRevision + 1,
      }),
    },
    {
      label: "non-canonical timestamp",
      corrupt: (valid: GradeReviewReceiptV1) => ({
        ...valid,
        reviewedAt: "2026-07-26T04:00:00+00:00",
      }),
    },
    {
      label: "reversed schedule timeline",
      corrupt: (valid: GradeReviewReceiptV1) => ({
        ...valid,
        scheduledAt: "2026-07-27T04:00:00.000Z",
      }),
    },
    {
      label: "string rating",
      corrupt: (valid: GradeReviewReceiptV1) => ({
        ...valid,
        rating: String(valid.rating),
      }),
    },
    {
      label: "unknown authority field",
      corrupt: (valid: GradeReviewReceiptV1) => ({
        ...valid,
        masteryScore: 100,
      }),
    },
  ])("retries a successful response with $label", async ({ corrupt }) => {
    const owner = (
      await readOrInitializeOwnerGeneration("account:review-malformed")
    ).ownerGeneration;
    const queued = await enqueueReviewGradeCommand(input(owner));

    await expect(flushLearningCommandOutbox({
      ownerGeneration: owner,
      transport: transport(async (sent) =>
        response(201, corrupt(receipt(sent)))
      ),
      now: () => new Date(NOW),
    })).resolves.toEqual({
      acknowledged: 0,
      quarantined: 0,
      retried: 1,
      blocked: 0,
    });
    await expect(listLearningCommandRecords(owner)).resolves.toEqual([
      expect.objectContaining({
        recordKey: queued.recordKey,
        status: "pending",
        attemptCount: 1,
        receipt: null,
        leaseUntil: null,
        nextAttemptAt: "2026-07-26T04:00:01.000Z",
      }),
    ]);
  });

  it("quarantines a stale card-revision 409 instead of retrying it", async () => {
    const owner = (
      await readOrInitializeOwnerGeneration("account:review-stale-card")
    ).ownerGeneration;
    await enqueueReviewGradeCommand(input(owner));

    await expect(flushLearningCommandOutbox({
      ownerGeneration: owner,
      transport: transport(async () => response(409, {
        error: {
          code: "REVIEW_CARD_REVISION_CONFLICT",
          retryable: false,
        },
      })),
      now: () => new Date(NOW),
    })).resolves.toEqual({
      acknowledged: 0,
      quarantined: 1,
      retried: 0,
      blocked: 0,
    });
    await expect(listLearningCommandRecords(owner)).resolves.toEqual([
      expect.objectContaining({
        status: "quarantined",
        quarantineReason: "HTTP 409 permanently rejected this command.",
        receipt: null,
      }),
    ]);
  });

  it("keeps the command pending after a network failure", async () => {
    const owner = (
      await readOrInitializeOwnerGeneration("account:review-network")
    ).ownerGeneration;
    await enqueueReviewGradeCommand(input(owner));

    await expect(flushLearningCommandOutbox({
      ownerGeneration: owner,
      transport: transport(async () => {
        throw new TypeError("network unavailable");
      }),
      now: () => new Date(NOW),
    })).resolves.toEqual({
      acknowledged: 0,
      quarantined: 0,
      retried: 1,
      blocked: 0,
    });
    await expect(listLearningCommandRecords(owner)).resolves.toEqual([
      expect.objectContaining({
        status: "pending",
        attemptCount: 1,
        nextAttemptAt: "2026-07-26T04:00:01.000Z",
        receipt: null,
      }),
    ]);
  });
});
