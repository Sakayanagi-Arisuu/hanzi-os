import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import type { LearningAttemptCommandV1 } from "../learning/attemptProtocol";
import type { AbandonLessonSessionCommandV1 } from "../learning/lessonSessionAbandonmentProtocol";
import {
  hashLessonSessionForm,
  type OpenLessonSessionCommandV1,
} from "../learning/lessonSessionProtocol";
import type { SubmitLessonSessionCommandV1 } from "../learning/lessonSessionSubmissionProtocol";
import {
  createSameOriginLearningCommandTransport,
  flushLearningCommandOutbox,
  type LearningCommandTransport,
  type LearningCommandTransportResponse,
} from "./learningCommandCoordinator";
import {
  enqueueLessonSessionCommand,
  enqueueLessonSessionAbandonmentCommand,
  enqueueLessonSessionSubmissionCommand,
  enqueueObjectiveAttemptCommand,
  listLearningCommandRecords,
  listQuarantinedLearningCommands,
  type LearningCommandOutboxRecord,
} from "./learningCommandOutbox";
import {
  LEARNING_COMMAND_OUTBOX_STORE,
  openSyncDatabase,
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  type OwnerGeneration,
} from "./indexedDb";

const DATABASE_NAME = "hanzi-os-sync-v1";
const NOW = new Date("2026-07-22T01:00:00.000Z");

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
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
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed")),
      { once: true },
    );
  });

/**
 * Models bytes written by the previous application release and then opened by
 * the current bundle. No historical item bank is invented: only the immutable
 * version marker on the already-queued command is changed.
 */
const markQueuedCommandsAsPreviousRelease = async (
  records: readonly LearningCommandOutboxRecord[],
  previousContentVersion: string,
) => {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    LEARNING_COMMAND_OUTBOX_STORE,
    "readwrite",
  );
  const done = transactionDone(transaction);
  const store = transaction.objectStore(LEARNING_COMMAND_OUTBOX_STORE);
  for (const record of records) {
    const stored = await requestResult(
      store.get(record.recordKey) as IDBRequest<
        LearningCommandOutboxRecord | undefined
      >,
    );
    if (!stored) throw new Error("Queued learning command disappeared.");
    store.put({
      ...stored,
      command: {
        ...stored.command,
        contentVersion: previousContentVersion,
      },
    });
  }
  await done;
};

const sessionInput = (ownerGeneration: OwnerGeneration) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias: "local-session:boot-1",
  enqueuedAt: NOW.toISOString(),
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: "lesson-session:boot-1",
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
    enrollmentId: "enrollment:a",
    lessonId: "boot-1",
  },
});

const lessonAttemptInput = (ownerGeneration: OwnerGeneration) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias: "local-session:boot-1",
  enqueuedAt: NOW.toISOString(),
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: "attempt:boot-1:one",
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
    activityId: "boot-1:meaning-ni",
    activityVersion: `${CONTENT_VERSION}:boot-1:meaning-ni:1`,
    source: "lesson" as const,
    method: "meaning-selection" as const,
    occurredAt: NOW.toISOString(),
    response: {
      kind: "answer" as const,
      answer: "bạn",
      usedHint: false,
      durationMs: 1_250,
    },
  },
});

const readerAttemptInput = (ownerGeneration: OwnerGeneration) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  enqueuedAt: NOW.toISOString(),
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: "attempt:reader:one",
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
    activityId: "reader:story-1:q-1",
    activityVersion: `${CONTENT_VERSION}:reader:story-1:q-1:1`,
    source: "reader" as const,
    method: "reading-comprehension" as const,
    occurredAt: NOW.toISOString(),
    response: {
      kind: "answer" as const,
      answer: "A",
      usedHint: false,
      durationMs: 2_000,
    },
  },
});

const submissionInput = (ownerGeneration: OwnerGeneration) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias: "local-session:boot-1",
  attemptCommandIds: ["attempt:boot-1:one"],
  enqueuedAt: NOW.toISOString(),
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: "lesson-session-submit:boot-1",
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
  },
});

const abandonmentInput = (ownerGeneration: OwnerGeneration) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias: "local-session:boot-1",
  dependencyCommandId: "lesson-session:boot-1",
  enqueuedAt: NOW.toISOString(),
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: "lesson-session-abandon:boot-1",
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
  },
});

const sessionReceipt = async (command: OpenLessonSessionCommandV1) => {
  const form = {
    schemaVersion: 1 as const,
    script: "simplified" as const,
    activities: [{
      position: 0,
      activityId: "boot-1:meaning-ni",
      activityVersion: `${CONTENT_VERSION}:boot-1:meaning-ni:1`,
      method: "meaning-selection" as const,
      skill: "vocabulary" as const,
      requiredForPass: true,
    }],
  };
  return {
    protocolVersion: 1 as const,
    idempotencyKey: command.idempotencyKey,
    duplicate: false,
    sessionId: "server-session:boot-1",
    enrollmentId: command.enrollmentId,
    contentVersion: command.contentVersion,
    resetEpoch: command.resetEpoch,
    lessonId: command.lessonId,
    lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
    expectedEvidenceCount: form.activities.length,
    form,
    formHash: await hashLessonSessionForm(form),
    status: "started" as const,
    startedAt: NOW.toISOString(),
  };
};

const attemptReceipt = (command: LearningAttemptCommandV1) => ({
  protocolVersion: 1 as const,
  idempotencyKey: command.idempotencyKey,
  duplicate: false,
  attemptId: `server-${command.idempotencyKey}`,
  evidenceId: `evidence-${command.idempotencyKey}`,
  resetEpoch: command.resetEpoch,
  source: command.source,
  method: command.method,
  activityId: command.activityId,
  activityVersion: command.activityVersion,
  skill: command.source === "reader" ? "reading" as const : "vocabulary" as const,
  outcome: "correct" as const,
  score: 100 as const,
  verification: "server-objective" as const,
});

const submissionReceipt = (command: SubmitLessonSessionCommandV1) => ({
  protocolVersion: 1 as const,
  idempotencyKey: command.idempotencyKey,
  duplicate: false,
  sessionId: command.sessionId,
  contentVersion: command.contentVersion,
  resetEpoch: command.resetEpoch,
  lessonId: "boot-1",
  lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
  formHash: command.formHash,
  status: "submitted" as const,
  evidenceCount: 1,
  rawScore: 100,
  gateScore: 100,
  requiredEvidenceCount: 1,
  requiredCorrectCount: 1,
  passed: true,
  completionEvidenceId: "completion-evidence:boot-1",
  submittedAt: NOW.toISOString(),
});

const abandonmentReceipt = (command: AbandonLessonSessionCommandV1) => ({
  protocolVersion: 1 as const,
  idempotencyKey: command.idempotencyKey,
  duplicate: false,
  sessionId: command.sessionId,
  enrollmentId: "enrollment:a",
  contentVersion: command.contentVersion,
  resetEpoch: command.resetEpoch,
  lessonId: "boot-1",
  lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
  status: "abandoned" as const,
  abandonedAt: NOW.toISOString(),
});

const response = (
  status: number,
  body: unknown,
  retryAfterMs = 0,
): LearningCommandTransportResponse => ({ status, body, retryAfterMs });

const assessmentTransportStubs = (): Pick<
  LearningCommandTransport,
  | "sendOpenAssessmentSession"
  | "sendRecordAssessmentAttempt"
  | "sendSubmitAssessmentSession"
  | "sendAbandonAssessmentSession"
  | "sendReviewGrade"
  | "sendOpenReaderSession"
  | "sendRecordReaderAttempt"
  | "sendSubmitReaderSession"
  | "sendAbandonReaderSession"
> => ({
  sendOpenAssessmentSession: vi.fn(),
  sendRecordAssessmentAttempt: vi.fn(),
  sendSubmitAssessmentSession: vi.fn(),
  sendAbandonAssessmentSession: vi.fn(),
  sendReviewGrade: vi.fn(),
  sendOpenReaderSession: vi.fn(),
  sendRecordReaderAttempt: vi.fn(),
  sendSubmitReaderSession: vi.fn(),
  sendAbandonReaderSession: vi.fn(),
});

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
  vi.restoreAllMocks();
});

describe("normalized learning command coordinator", () => {
  it("archives a previous-release lesson command graph without sending or rewriting it", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const session = await enqueueLessonSessionCommand(
      sessionInput(ownerGeneration),
    );
    const attempt = await enqueueObjectiveAttemptCommand(
      lessonAttemptInput(ownerGeneration),
    );
    const submission = await enqueueLessonSessionSubmissionCommand(
      submissionInput(ownerGeneration),
    );
    const previousContentVersion = "previous-release-fixture";
    await markQueuedCommandsAsPreviousRelease(
      [session, attempt, submission],
      previousContentVersion,
    );
    await resetSyncDatabaseForTests();

    const transport: LearningCommandTransport = {
      ...assessmentTransportStubs(),
      sendLessonSession: vi.fn(),
      sendObjectiveAttempt: vi.fn(),
      sendLessonSessionSubmission: vi.fn(),
      sendLessonSessionAbandonment: vi.fn(),
    };
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toEqual({
      acknowledged: 0,
      quarantined: 3,
      retried: 0,
      blocked: 0,
    });
    expect(transport.sendLessonSession).not.toHaveBeenCalled();
    expect(transport.sendObjectiveAttempt).not.toHaveBeenCalled();
    expect(transport.sendLessonSessionSubmission).not.toHaveBeenCalled();

    const quarantined = await listQuarantinedLearningCommands(ownerGeneration);
    expect(quarantined).toHaveLength(3);
    expect(quarantined.map((record) => record.command.contentVersion))
      .toEqual([
        previousContentVersion,
        previousContentVersion,
        previousContentVersion,
      ]);
    expect(quarantined.map((record) => record.quarantineReason)).toEqual([
      "Lesson-session content version is unsupported.",
      "Lesson-session dependency was quarantined.",
      "Lesson-session dependency was quarantined.",
    ]);
  });

  it("archives a previous-release reader attempt locally before transport", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const attempt = await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration),
    );
    const previousContentVersion = "previous-reader-release-fixture";
    await markQueuedCommandsAsPreviousRelease(
      [attempt],
      previousContentVersion,
    );

    const attemptSender = vi.fn();
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(),
        sendObjectiveAttempt: attemptSender,
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(),
      },
      now: () => new Date(NOW),
    })).resolves.toEqual({
      acknowledged: 0,
      quarantined: 1,
      retried: 0,
      blocked: 0,
    });
    expect(attemptSender).not.toHaveBeenCalled();
    await expect(listQuarantinedLearningCommands(ownerGeneration))
      .resolves.toEqual([
        expect.objectContaining({
          status: "quarantined",
          quarantineReason: "Attempt content version is unsupported.",
          command: expect.objectContaining({
            contentVersion: previousContentVersion,
          }),
        }),
      ]);
  });

  it("maps a durable session receipt before sending its dependent attempt", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(ownerGeneration));
    await enqueueObjectiveAttemptCommand(lessonAttemptInput(ownerGeneration));
    const calls: string[] = [];
    const transport: LearningCommandTransport = {
      ...assessmentTransportStubs(),
      sendLessonSession: vi.fn(async (command) => {
        calls.push(`session:${command.idempotencyKey}`);
        return response(201, await sessionReceipt(command));
      }),
      sendObjectiveAttempt: vi.fn(async (command) => {
        calls.push(`attempt:${command.idempotencyKey}:${command.sessionId}`);
        return response(201, attemptReceipt(command));
      }),
      sendLessonSessionSubmission: vi.fn(),
      sendLessonSessionAbandonment: vi.fn(),
    };

    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toEqual({
      acknowledged: 2,
      quarantined: 0,
      retried: 0,
      blocked: 0,
    });
    expect(calls).toEqual([
      "session:lesson-session:boot-1",
      "attempt:attempt:boot-1:one:server-session:boot-1",
    ]);
    const records = await listLearningCommandRecords(ownerGeneration);
    expect(records.map((record) => record.status)).toEqual([
      "acknowledged",
      "acknowledged",
    ]);
    expect(records[0]?.kind === "lesson-session-open"
      ? records[0].receipt?.sessionId
      : null).toBe("server-session:boot-1");
  });

  it("retries a session response whose immutable form hash does not match", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(ownerGeneration));
    await enqueueObjectiveAttemptCommand(lessonAttemptInput(ownerGeneration));
    const attemptSender = vi.fn();
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(async (command) => response(201, {
          ...await sessionReceipt(command),
          formHash: `sha256:${"0".repeat(64)}`,
        })),
        sendObjectiveAttempt: attemptSender,
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(),
      },
      now: () => new Date(NOW),
    });
    expect(result).toMatchObject({ retried: 1, acknowledged: 0 });
    expect(attemptSender).not.toHaveBeenCalled();
    expect((await listLearningCommandRecords(ownerGeneration)).map(
      (record) => record.status,
    )).toEqual(["pending", "pending"]);
  });

  it("quarantines an attempt outside the server-issued lesson form", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(ownerGeneration));
    await enqueueObjectiveAttemptCommand({
      ...lessonAttemptInput(ownerGeneration),
      command: {
        ...lessonAttemptInput(ownerGeneration).command,
        activityId: "boot-1:meaning-hao",
        activityVersion: `${CONTENT_VERSION}:boot-1:meaning-hao:1`,
      },
    });
    const attemptSender = vi.fn();
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(async (command) =>
          response(201, await sessionReceipt(command))),
        sendObjectiveAttempt: attemptSender,
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(),
      },
      now: () => new Date(NOW),
    });
    expect(result).toEqual({
      acknowledged: 1,
      quarantined: 1,
      retried: 0,
      blocked: 0,
    });
    expect(attemptSender).not.toHaveBeenCalled();
  });

  it("reloads and submits only after the exact form attempt set is acknowledged", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(ownerGeneration));
    await enqueueObjectiveAttemptCommand(lessonAttemptInput(ownerGeneration));
    await enqueueLessonSessionSubmissionCommand(submissionInput(ownerGeneration));
    const calls: string[] = [];
    const transport: LearningCommandTransport = {
      ...assessmentTransportStubs(),
      sendLessonSession: vi.fn(async (command) => {
        calls.push("open");
        return response(201, await sessionReceipt(command));
      }),
      sendObjectiveAttempt: vi.fn(async (command) => {
        calls.push("attempt");
        return response(201, attemptReceipt(command));
      }),
      sendLessonSessionSubmission: vi.fn(async (command) => {
        calls.push(`submit:${command.sessionId}:${command.formHash}`);
        return response(201, submissionReceipt(command));
      }),
      sendLessonSessionAbandonment: vi.fn(),
    };

    const firstFlush = await flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
      maximumCommands: 2,
    });
    expect(firstFlush).toEqual({
      acknowledged: 2,
      quarantined: 0,
      retried: 0,
      blocked: 0,
    });
    expect(calls).toEqual(["open", "attempt"]);

    await resetSyncDatabaseForTests();
    const secondFlush = await flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    });
    expect(secondFlush).toEqual({
      acknowledged: 1,
      quarantined: 0,
      retried: 0,
      blocked: 0,
    });
    expect(calls[2]).toMatch(
      /^submit:server-session:boot-1:sha256:[a-f0-9]{64}$/u,
    );
    expect((await listLearningCommandRecords(ownerGeneration)).map(
      (record) => record.status,
    )).toEqual(["acknowledged", "acknowledged", "acknowledged"]);
  });

  it("maps the server session id before abandoning and strictly acknowledges its receipt", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(ownerGeneration));
    await enqueueLessonSessionAbandonmentCommand(
      abandonmentInput(ownerGeneration),
    );
    const abandonmentSender = vi.fn(async (
      command: AbandonLessonSessionCommandV1,
    ) => response(200, abandonmentReceipt(command)));
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(async (command) =>
          response(201, await sessionReceipt(command))),
        sendObjectiveAttempt: vi.fn(),
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: abandonmentSender,
      },
      now: () => new Date(NOW),
    });

    expect(result).toEqual({
      acknowledged: 2,
      quarantined: 0,
      retried: 0,
      blocked: 0,
    });
    expect(abandonmentSender).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "lesson-session-abandon:boot-1",
      sessionId: "server-session:boot-1",
      contentVersion: CONTENT_VERSION,
      resetEpoch: 0,
    }));
    expect((await listLearningCommandRecords(ownerGeneration))[1])
      .toMatchObject({
        kind: "lesson-session-abandon",
        status: "acknowledged",
        receipt: {
          status: "abandoned",
          lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
        },
      });
  });

  it("retries malformed abandonment receipts and quarantines permanent rejection", async () => {
    const malformedOwner = (
      await readOrInitializeOwnerGeneration("account:malformed-abandon")
    ).ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(malformedOwner));
    await enqueueLessonSessionAbandonmentCommand(abandonmentInput(malformedOwner));
    const malformed = await flushLearningCommandOutbox({
      ownerGeneration: malformedOwner,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(async (command) =>
          response(201, await sessionReceipt(command))),
        sendObjectiveAttempt: vi.fn(),
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(async (command) => response(200, {
          ...abandonmentReceipt(command),
          unexpectedAuthority: "client-must-not-accept",
        })),
      },
      now: () => new Date(NOW),
    });
    expect(malformed).toEqual({
      acknowledged: 1,
      quarantined: 0,
      retried: 1,
      blocked: 0,
    });
    expect((await listLearningCommandRecords(malformedOwner))[1])
      .toMatchObject({ status: "pending", attemptCount: 1 });

    await resetSyncDatabaseForTests();
    await deleteDatabase();
    const rejectedOwner = (
      await readOrInitializeOwnerGeneration("account:rejected-abandon")
    ).ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(rejectedOwner));
    await enqueueLessonSessionAbandonmentCommand(abandonmentInput(rejectedOwner));
    const rejected = await flushLearningCommandOutbox({
      ownerGeneration: rejectedOwner,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(async (command) =>
          response(201, await sessionReceipt(command))),
        sendObjectiveAttempt: vi.fn(),
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(async () => response(422, {
          error: "session is already terminal",
        })),
      },
      now: () => new Date(NOW),
    });
    expect(rejected).toEqual({
      acknowledged: 1,
      quarantined: 1,
      retried: 0,
      blocked: 0,
    });
    expect((await listQuarantinedLearningCommands(rejectedOwner))[0])
      .toMatchObject({ kind: "lesson-session-abandon" });
  });

  it("quarantines submission after a permanent attempt dependency failure", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(ownerGeneration));
    await enqueueObjectiveAttemptCommand(lessonAttemptInput(ownerGeneration));
    await enqueueLessonSessionSubmissionCommand(submissionInput(ownerGeneration));
    const submissionSender = vi.fn();
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(async (command) =>
          response(201, await sessionReceipt(command))),
        sendObjectiveAttempt: vi.fn(async () => response(422, {
          error: "invalid attempt",
        })),
        sendLessonSessionSubmission: submissionSender,
        sendLessonSessionAbandonment: vi.fn(),
      },
      now: () => new Date(NOW),
    });
    expect(result).toEqual({
      acknowledged: 1,
      quarantined: 2,
      retried: 0,
      blocked: 0,
    });
    expect(submissionSender).not.toHaveBeenCalled();
  });

  it("retries a malformed submission receipt and preserves the command", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(ownerGeneration));
    await enqueueObjectiveAttemptCommand(lessonAttemptInput(ownerGeneration));
    await enqueueLessonSessionSubmissionCommand(submissionInput(ownerGeneration));
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(async (command) =>
          response(201, await sessionReceipt(command))),
        sendObjectiveAttempt: vi.fn(async (command) =>
          response(201, attemptReceipt(command))),
        sendLessonSessionSubmission: vi.fn(async (command) => response(200, {
          ...submissionReceipt(command),
          formHash: `sha256:${"f".repeat(64)}`,
        })),
        sendLessonSessionAbandonment: vi.fn(),
      },
      now: () => new Date(NOW),
    });
    expect(result).toEqual({
      acknowledged: 2,
      quarantined: 0,
      retried: 1,
      blocked: 0,
    });
    expect((await listLearningCommandRecords(ownerGeneration))[2])
      .toMatchObject({ status: "pending", attemptCount: 1 });
  });

  it("keeps strict FIFO when a session is retrying and survives reload", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(ownerGeneration));
    await enqueueObjectiveAttemptCommand(lessonAttemptInput(ownerGeneration));
    const attemptSender = vi.fn(async (command: LearningAttemptCommandV1) =>
      response(201, attemptReceipt(command)));
    const firstTransport: LearningCommandTransport = {
      ...assessmentTransportStubs(),
      sendLessonSession: vi.fn(async () => {
        throw new TypeError("offline");
      }),
      sendObjectiveAttempt: attemptSender,
      sendLessonSessionSubmission: vi.fn(),
      sendLessonSessionAbandonment: vi.fn(),
    };
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport: firstTransport,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({ retried: 1 });
    expect(attemptSender).not.toHaveBeenCalled();

    await resetSyncDatabaseForTests();
    const beforeBackoff = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: firstTransport,
      now: () => new Date(NOW.getTime() + 999),
    });
    expect(beforeBackoff).toMatchObject({ blocked: 1 });
    expect(firstTransport.sendLessonSession).toHaveBeenCalledTimes(1);

    const recoveredTransport: LearningCommandTransport = {
      ...assessmentTransportStubs(),
      sendLessonSession: vi.fn(async (command) =>
        response(200, await sessionReceipt(command))),
      sendObjectiveAttempt: attemptSender,
      sendLessonSessionSubmission: vi.fn(),
      sendLessonSessionAbandonment: vi.fn(),
    };
    const recovered = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: recoveredTransport,
      now: () => new Date(NOW.getTime() + 1_000),
    });
    expect(recovered).toEqual({
      acknowledged: 2,
      quarantined: 0,
      retried: 0,
      blocked: 0,
    });
    expect(attemptSender).toHaveBeenCalledTimes(1);
  });

  it.each([400, 403, 409, 422])(
    "quarantines permanent HTTP %i responses",
    async (status) => {
      const ownerGeneration = (
        await readOrInitializeOwnerGeneration("account:a")
      ).ownerGeneration;
      await enqueueObjectiveAttemptCommand(readerAttemptInput(ownerGeneration));
      const transport: LearningCommandTransport = {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(),
        sendObjectiveAttempt: vi.fn(async () => response(status, {
          error: "permanent",
        })),
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(),
      };
      const result = await flushLearningCommandOutbox({
        ownerGeneration,
        transport,
        now: () => new Date(NOW),
      });
      expect(result).toMatchObject({ quarantined: 1, retried: 0 });
      expect((await listLearningCommandRecords(ownerGeneration))[0])
        .toMatchObject({
          status: "quarantined",
          attemptCount: 1,
          quarantineReason: `HTTP ${status} permanently rejected this command.`,
        });
    },
  );

  it("permanently archives a command rejected by a newer content release", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueObjectiveAttemptCommand(readerAttemptInput(ownerGeneration));
    const attemptSender = vi.fn(async () => response(409, {
      error: {
        code: "CONTENT_VERSION_UNSUPPORTED",
        message: "The command belongs to an unavailable content release.",
        retryable: false,
      },
    }));

    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(),
        sendObjectiveAttempt: attemptSender,
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(),
      },
      now: () => new Date(NOW),
    })).resolves.toEqual({
      acknowledged: 0,
      quarantined: 1,
      retried: 0,
      blocked: 0,
    });
    expect(attemptSender).toHaveBeenCalledTimes(1);
    await expect(listQuarantinedLearningCommands(ownerGeneration))
      .resolves.toEqual([
        expect.objectContaining({
          status: "quarantined",
          attemptCount: 1,
          quarantineReason: "HTTP 409 permanently rejected this command.",
        }),
      ]);
  });

  it.each([401, 408, 425, 429, 500, 503])(
    "retains retryable HTTP %i responses in the outbox",
    async (status) => {
      const ownerGeneration = (
        await readOrInitializeOwnerGeneration("account:a")
      ).ownerGeneration;
      await enqueueObjectiveAttemptCommand(readerAttemptInput(ownerGeneration));
      const transport: LearningCommandTransport = {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(),
        sendObjectiveAttempt: vi.fn(async () => response(
          status,
          { error: "retry" },
          status === 429 ? 4_000 : 0,
        )),
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(),
      };
      const result = await flushLearningCommandOutbox({
        ownerGeneration,
        transport,
        now: () => new Date(NOW),
      });
      expect(result).toMatchObject({ retried: 1, quarantined: 0 });
      const record = (await listLearningCommandRecords(ownerGeneration))[0];
      expect(record).toMatchObject({ status: "pending", attemptCount: 1 });
      expect(record?.nextAttemptAt).toBe(new Date(
        NOW.getTime() + (status === 429 ? 4_000 : 1_000),
      ).toISOString());
    },
  );

  it("retains structured retryable client errors", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueObjectiveAttemptCommand(readerAttemptInput(ownerGeneration));
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(),
        sendObjectiveAttempt: vi.fn(async () => response(403, {
          error: { code: "identity-refresh", retryable: true },
        })),
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(),
      },
      now: () => new Date(NOW),
    });
    expect(result).toMatchObject({ retried: 1, quarantined: 0 });
    expect((await listLearningCommandRecords(ownerGeneration))[0]?.status)
      .toBe("pending");
  });

  it("retries a malformed success receipt instead of acknowledging it", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueObjectiveAttemptCommand(readerAttemptInput(ownerGeneration));
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(),
        sendObjectiveAttempt: vi.fn(async () => response(200, {
          protocolVersion: 1,
          idempotencyKey: "wrong-command",
        })),
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(),
      },
      now: () => new Date(NOW),
    });
    expect(result).toMatchObject({ retried: 1, acknowledged: 0 });
    expect((await listLearningCommandRecords(ownerGeneration))[0]?.status)
      .toBe("pending");
  });

  it("quarantines dependent attempts when the session command is permanent", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(sessionInput(ownerGeneration));
    await enqueueObjectiveAttemptCommand(lessonAttemptInput(ownerGeneration));
    const attemptSender = vi.fn();
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...assessmentTransportStubs(),
        sendLessonSession: vi.fn(async () => response(409, {
          error: "content package is not promoted",
        })),
        sendObjectiveAttempt: attemptSender,
        sendLessonSessionSubmission: vi.fn(),
        sendLessonSessionAbandonment: vi.fn(),
      },
      now: () => new Date(NOW),
    });
    expect(result).toEqual({
      acknowledged: 0,
      quarantined: 2,
      retried: 0,
      blocked: 0,
    });
    expect(attemptSender).not.toHaveBeenCalled();
  });

  it("uses only fixed same-origin endpoints and rejects redirects", async () => {
    const paths: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      paths.push(String(input));
      expect(init).toMatchObject({
        method: "POST",
        credentials: "same-origin",
        redirect: "error",
      });
      return new Response(JSON.stringify({ error: "not promoted" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    });
    const transport = createSameOriginLearningCommandTransport({
      fetch: fetchMock as typeof fetch,
      origin: "https://hanzi.example",
    });
    const command = {
      ...sessionInput({ ownerKey: "account:a", generation: 1 }).command,
      deviceSequence: 1,
      resetEpoch: 0,
    };
    await expect(transport.sendLessonSession(command)).resolves.toMatchObject({
      status: 409,
    });
    await expect(transport.sendLessonSessionSubmission({
      protocolVersion: 1,
      idempotencyKey: "lesson-session-submit:transport",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: 2,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: "server-session:transport",
      formHash: `sha256:${"a".repeat(64)}`,
    })).resolves.toMatchObject({ status: 409 });
    await expect(transport.sendLessonSessionAbandonment({
      protocolVersion: 1,
      idempotencyKey: "lesson-session-abandon:transport",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: 3,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: "server-session:transport",
    })).resolves.toMatchObject({ status: 409 });
    await expect(transport.sendOpenAssessmentSession({
      protocolVersion: 1,
      idempotencyKey: "assessment-open:transport",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: 4,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      enrollmentId: "enrollment:a",
    })).resolves.toMatchObject({ status: 409 });
    await expect(transport.sendRecordAssessmentAttempt({
      protocolVersion: 1,
      idempotencyKey: "assessment-attempt:transport",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: 5,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: "assessment-session:transport",
      formHash: `sha256:${"b".repeat(64)}`,
      itemId: "assessment-item:transport",
      itemVersion: `${CONTENT_VERSION}:assessment-item:transport:1`,
      occurredAt: NOW.toISOString(),
      response: { kind: "selection", answer: "A" },
    })).resolves.toMatchObject({ status: 409 });
    await expect(transport.sendSubmitAssessmentSession({
      protocolVersion: 1,
      idempotencyKey: "assessment-submit:transport",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: 6,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: "assessment-session:transport",
      formHash: `sha256:${"b".repeat(64)}`,
    })).resolves.toMatchObject({ status: 409 });
    await expect(transport.sendAbandonAssessmentSession({
      protocolVersion: 1,
      idempotencyKey: "assessment-abandon:transport",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: 7,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: "assessment-session:transport",
      formHash: `sha256:${"b".repeat(64)}`,
    })).resolves.toMatchObject({ status: 409 });
    await expect(transport.sendOpenReaderSession({
      protocolVersion: 1,
      idempotencyKey: "reader-open:transport",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: 8,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      enrollmentId: "enrollment:a",
      storyId: "reader-story:transport",
      script: "simplified",
      supportMode: "unassisted",
    })).resolves.toMatchObject({ status: 409 });
    await expect(transport.sendRecordReaderAttempt({
      protocolVersion: 1,
      idempotencyKey: "reader-attempt:transport",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: 9,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: "reader-session:transport",
      formHash: `sha256:${"c".repeat(64)}`,
      itemId: "reader-item:transport",
      itemVersion: `${CONTENT_VERSION}:reader-item:transport:1`,
      position: 0,
      selectedOption: "A",
      occurredAt: NOW.toISOString(),
    })).resolves.toMatchObject({ status: 409 });
    await expect(transport.sendSubmitReaderSession({
      protocolVersion: 1,
      idempotencyKey: "reader-submit:transport",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: 10,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: "reader-session:transport",
      formHash: `sha256:${"c".repeat(64)}`,
      expectedItemCount: 1,
    })).resolves.toMatchObject({ status: 409 });
    await expect(transport.sendAbandonReaderSession({
      protocolVersion: 1,
      idempotencyKey: "reader-abandon:transport",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: 11,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: "reader-session:transport",
      formHash: `sha256:${"c".repeat(64)}`,
      reason: "user-exit",
    })).resolves.toMatchObject({ status: 409 });
    expect(paths).toEqual([
      "/api/learning/lesson-sessions",
      "/api/learning/lesson-sessions/submit",
      "/api/learning/lesson-sessions/abandon",
      "/api/assessment/sessions",
      "/api/assessment/attempts",
      "/api/assessment/sessions/submit",
      "/api/assessment/sessions/abandon",
      "/api/learning/reader-sessions",
      "/api/learning/reader-attempts",
      "/api/learning/reader-sessions/submit",
      "/api/learning/reader-sessions/abandon",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });
});
