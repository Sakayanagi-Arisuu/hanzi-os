import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import { hashLessonSessionForm } from "../learning/lessonSessionProtocol";
import type { LearningState } from "../types";
import { createInitialSyncDocument, evolveSyncDocument } from "./document";
import {
  acknowledgeLearningCommand,
  claimLearningCommand,
  enqueueLessonSessionAbandonmentCommand,
  enqueueLessonSessionCommand,
  enqueueLessonSessionSubmissionCommand,
  enqueueObjectiveAttemptCommand,
  LearningCommandConflictError,
  LearningCommandReceiptConflictError,
  listLearningCommandRecords,
  prepareLearningCommand,
  quarantineLearningCommand,
  releaseLearningCommandRetry,
  scheduleLearningCommandRetry,
  summarizeLearningCommandQueue,
} from "./learningCommandOutbox";
import {
  ACTIVE_OWNER_GENERATION_KEY,
  allocateDeviceSequence,
  deleteOwnerData,
  enqueueOwnerAdoptionOperation,
  enqueueSyncOperation,
  openSyncDatabase,
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  StaleOwnerGenerationError,
  writeSyncMeta,
  type OwnerGeneration,
} from "./indexedDb";

const DATABASE_NAME = "hanzi-os-sync-v1";

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const openVersionOneDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, 1);
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    database.createObjectStore("meta", { keyPath: "key" });
    database.createObjectStore("documents", { keyPath: "ownerKey" });
    database.createObjectStore("local-states", { keyPath: "ownerKey" });
    const outbox = database.createObjectStore("outbox", {
      keyPath: "operationId",
    });
    outbox.createIndex("ownerKey", "ownerKey", { unique: false });
  });
  request.addEventListener("success", () => resolve(request.result), {
    once: true,
  });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error),
      { once: true },
    );
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

const lessonSessionInput = (
  ownerGeneration: OwnerGeneration,
  suffix = "one",
) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias: `local-session:${suffix}`,
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: `lesson-session:${suffix}`,
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
    enrollmentId: "enrollment:a",
    lessonId: "boot-1",
  },
});

const lessonAttemptInput = (
  ownerGeneration: OwnerGeneration,
  suffix = "one",
) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias: `local-session:${suffix}`,
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: `attempt:${suffix}`,
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
    activityId: "boot-1:meaning-ni",
    activityVersion: `${CONTENT_VERSION}:boot-1:meaning-ni:1`,
    source: "lesson" as const,
    method: "meaning-selection" as const,
    occurredAt: "2026-07-22T01:00:00.000Z",
    response: {
      kind: "answer" as const,
      answer: "bạn",
      usedHint: false,
      durationMs: 1_500,
    },
  },
});

const readerAttemptInput = (
  ownerGeneration: OwnerGeneration,
  suffix: string,
) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: `attempt:reader:${suffix}`,
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
    activityId: `reader:story-1:${suffix}`,
    activityVersion: `${CONTENT_VERSION}:reader:story-1:${suffix}:1`,
    source: "reader" as const,
    method: "reading-comprehension" as const,
    occurredAt: "2026-07-22T01:00:00.000Z",
    response: {
      kind: "answer" as const,
      answer: `sensitive-answer-${suffix}`,
      usedHint: false,
      durationMs: 1_500,
    },
  },
});

const submissionInput = (ownerGeneration: OwnerGeneration) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias: "local-session:one",
  attemptCommandIds: ["attempt:one"],
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: "lesson-session-submit:one",
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
  },
});

const abandonmentInput = (
  ownerGeneration: OwnerGeneration,
  suffix = "one",
) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias: `local-session:${suffix}`,
  dependencyCommandId: `lesson-session:${suffix}`,
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: `lesson-session-abandon:${suffix}`,
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
  },
});

const openReceipt = async (
  session: Awaited<ReturnType<typeof enqueueLessonSessionCommand>>,
) => {
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
    idempotencyKey: session.command.idempotencyKey,
    duplicate: false,
    sessionId: `server-${session.sessionAlias}`,
    enrollmentId: session.command.enrollmentId,
    contentVersion: session.command.contentVersion,
    resetEpoch: session.command.resetEpoch,
    lessonId: session.command.lessonId,
    lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
    expectedEvidenceCount: form.activities.length,
    form,
    formHash: await hashLessonSessionForm(form),
    status: "started" as const,
    startedAt: "2026-07-22T01:00:00.000Z",
  };
};

const localState = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Offline learner",
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

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
});

describe("normalized learning command IndexedDB journal", () => {
  it("upgrades a version-one database without touching the snapshot outbox", async () => {
    const legacyDatabase = await openVersionOneDatabase();
    const transaction = legacyDatabase.transaction("outbox", "readwrite");
    transaction.objectStore("outbox").put({
      operationId: "snapshot:preserved",
      ownerKey: "account:a",
      deviceSequence: 7,
    });
    await transactionDone(transaction);
    legacyDatabase.close();

    const upgraded = await openSyncDatabase();
    expect(upgraded.version).toBe(3);
    expect([...upgraded.objectStoreNames]).toContain("learning-command-outbox");
    expect([...upgraded.objectStoreNames]).toEqual(expect.arrayContaining([
      "learning-projections",
      "lesson-resumes",
      "assessment-resumes",
    ]));
    const read = upgraded.transaction("outbox", "readonly");
    await expect(requestResult(
      read.objectStore("outbox").get("snapshot:preserved"),
    )).resolves.toMatchObject({
      operationId: "snapshot:preserved",
      ownerKey: "account:a",
      deviceSequence: 7,
    });
    await transactionDone(read);
  });

  it("atomically purges even leased normalized commands when reset is queued", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reset")
    ).ownerGeneration;
    const queued = await enqueueLessonSessionCommand(
      lessonSessionInput(ownerGeneration, "reset"),
    );
    expect(await claimLearningCommand(
      queued.recordKey,
      ownerGeneration,
      new Date("2026-07-22T01:00:00.000Z"),
    )).not.toBeNull();

    const state = localState();
    const initial = createInitialSyncDocument(
      state,
      "2026-07-22T00:59:00.000Z",
      "before-reset",
    );
    const reset = evolveSyncDocument(
      initial,
      state,
      state,
      "2026-07-22T01:01:00.000Z",
      "sync:reset",
      "reset",
    );
    await enqueueSyncOperation({
      protocolVersion: 1,
      operationId: "sync:reset",
      idempotencyKey: "sync:reset",
      ownerKey: ownerGeneration.ownerKey,
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: await allocateDeviceSequence(),
      baseRevision: 0,
      kind: "reset",
      contentVersion: CONTENT_VERSION,
      occurredAt: "2026-07-22T01:01:00.000Z",
      requestHash: "reset-hash",
      document: reset,
    }, state, ownerGeneration);

    expect(await listLearningCommandRecords(ownerGeneration)).toEqual([]);
    const emptyForm = {
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
    await expect(acknowledgeLearningCommand(
      queued.recordKey,
      ownerGeneration,
      {
        protocolVersion: 1,
        idempotencyKey: queued.command.idempotencyKey,
        duplicate: false,
        sessionId: "server-session:stale",
        enrollmentId: queued.command.enrollmentId,
        contentVersion: CONTENT_VERSION,
        resetEpoch: 0,
        lessonId: queued.command.lessonId,
        lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
        expectedEvidenceCount: 1,
        form: emptyForm,
        formHash: await hashLessonSessionForm(emptyForm),
        status: "started",
        startedAt: "2026-07-22T01:00:30.000Z",
      },
    )).resolves.toBeNull();
  });

  it("persists typed FIFO commands across a database reload", async () => {
    const { ownerGeneration } = await readOrInitializeOwnerGeneration(
      "account:a",
    );
    const session = await enqueueLessonSessionCommand(
      lessonSessionInput(ownerGeneration),
    );
    const attempt = await enqueueObjectiveAttemptCommand(
      lessonAttemptInput(ownerGeneration),
    );
    const secondAttempt = await enqueueObjectiveAttemptCommand({
      ...lessonAttemptInput(ownerGeneration),
      command: {
        ...lessonAttemptInput(ownerGeneration).command,
        idempotencyKey: "attempt:two",
        activityId: "boot-1:meaning-hao",
        activityVersion: `${CONTENT_VERSION}:boot-1:meaning-hao:1`,
      },
    });
    expect(attempt.deviceSequence).toBeGreaterThan(session.deviceSequence);
    expect(attempt.dependencyRecordKey).toBe(session.recordKey);
    expect(secondAttempt.dependencyRecordKey).toBe(session.recordKey);

    await resetSyncDatabaseForTests();
    const afterReload = await listLearningCommandRecords(ownerGeneration);
    expect(afterReload.map((record) => record.kind)).toEqual([
      "lesson-session-open",
      "objective-attempt",
      "objective-attempt",
    ]);
    expect(afterReload.map((record) => record.commandId)).toEqual([
      "lesson-session:one",
      "attempt:one",
      "attempt:two",
    ]);
  });

  it("isolates owners and rejects every stale-owner mutation", async () => {
    const ownerA = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const ownerACommand = await enqueueLessonSessionCommand(
      lessonSessionInput(ownerA),
    );

    const ownerB = { ownerKey: "account:b", generation: 2 };
    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, ownerB);
    await expect(enqueueLessonSessionCommand({
      ...lessonSessionInput(ownerA, "stale"),
      ownerGeneration: ownerA,
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(claimLearningCommand(
      ownerACommand.recordKey,
      ownerA,
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);

    await enqueueLessonSessionCommand({
      ...lessonSessionInput(ownerB, "owner-b"),
      command: {
        ...lessonSessionInput(ownerB, "owner-b").command,
        installationId: "installation:b",
        deviceId: "device:b",
        enrollmentId: "enrollment:b",
      },
    });
    expect((await listLearningCommandRecords(ownerB)).map(
      (record) => record.ownerKey,
    )).toEqual(["account:b"]);

    const ownerAReturned = { ownerKey: "account:a", generation: 3 };
    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, ownerAReturned);
    expect((await listLearningCommandRecords(ownerAReturned)).map(
      (record) => record.commandId,
    )).toEqual(["lesson-session:one"]);
    await expect(listLearningCommandRecords(ownerA)).rejects.toBeInstanceOf(
      StaleOwnerGenerationError,
    );
  });

  it("never rebinds an expected reset epoch across any enqueue boundary", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await expect(enqueueLessonSessionCommand({
      ...lessonSessionInput(ownerGeneration, "stale-open"),
      expectedResetEpoch: 1,
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(enqueueObjectiveAttemptCommand({
      ...readerAttemptInput(ownerGeneration, "stale-reader"),
      expectedResetEpoch: 1,
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);

    await enqueueLessonSessionCommand(lessonSessionInput(ownerGeneration));
    const attempt = await enqueueObjectiveAttemptCommand(
      lessonAttemptInput(ownerGeneration),
    );
    await expect(enqueueObjectiveAttemptCommand({
      ...lessonAttemptInput(ownerGeneration),
      expectedResetEpoch: 1,
      command: {
        ...lessonAttemptInput(ownerGeneration).command,
        idempotencyKey: "attempt:stale-reset",
      },
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(enqueueLessonSessionSubmissionCommand({
      ...submissionInput(ownerGeneration),
      expectedResetEpoch: 1,
      attemptCommandIds: [attempt.commandId],
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(enqueueLessonSessionAbandonmentCommand({
      ...abandonmentInput(ownerGeneration),
      expectedResetEpoch: 1,
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);
    expect((await listLearningCommandRecords(ownerGeneration)).map(
      (record) => record.commandId,
    )).toEqual(["lesson-session:one", "attempt:one"]);
  });

  it("summarizes pending leases and quarantine by tenant while ignoring durable acknowledgements", async () => {
    const ownerA = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueObjectiveAttemptCommand(readerAttemptInput(ownerA, "pending"));
    const leased = await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerA, "leased"),
    );
    expect(await claimLearningCommand(
      leased.recordKey,
      ownerA,
      new Date("2026-07-22T01:00:00.000Z"),
    )).toMatchObject({ status: "pending", leaseUntil: expect.any(String) });
    const quarantined = await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerA, "quarantined"),
    );
    await quarantineLearningCommand(
      quarantined.recordKey,
      ownerA,
      "permanent test rejection",
    );
    const acknowledged = await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerA, "acknowledged"),
    );
    await acknowledgeLearningCommand(acknowledged.recordKey, ownerA, {
      protocolVersion: 1,
      idempotencyKey: acknowledged.command.idempotencyKey,
      duplicate: false,
      attemptId: "server-attempt:acknowledged",
      evidenceId: "server-evidence:acknowledged",
      resetEpoch: acknowledged.resetEpoch,
      source: "reader",
      method: "reading-comprehension",
      activityId: acknowledged.command.activityId,
      activityVersion: acknowledged.command.activityVersion,
      skill: "reading",
      outcome: "correct",
      score: 100,
      verification: "server-objective",
    });

    expect(await summarizeLearningCommandQueue(ownerA)).toEqual({
      pendingCount: 2,
      quarantinedCount: 1,
    });

    const ownerB = { ownerKey: "account:b", generation: 2 };
    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, ownerB);
    await enqueueObjectiveAttemptCommand(readerAttemptInput(ownerB, "owner-b"));
    expect(await summarizeLearningCommandQueue(ownerB)).toEqual({
      pendingCount: 1,
      quarantinedCount: 0,
    });

    const ownerAReturned = { ownerKey: "account:a", generation: 3 };
    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, ownerAReturned);
    expect(await summarizeLearningCommandQueue(ownerAReturned)).toEqual({
      pendingCount: 2,
      quarantinedCount: 1,
    });
  });

  it("lets an explicit retry bypass backoff without rewriting command identity", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const queued = await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "manual-retry"),
    );
    const firstAttemptAt = new Date("2026-07-22T01:00:00.000Z");
    const claimed = await claimLearningCommand(
      queued.recordKey,
      ownerGeneration,
      firstAttemptAt,
    );
    expect(claimed).toMatchObject({
      status: "pending",
      attemptCount: 1,
      nextAttemptAt: null,
      leaseUntil: "2026-07-22T01:00:30.000Z",
    });

    const scheduled = await scheduleLearningCommandRetry(
      queued.recordKey,
      ownerGeneration,
      firstAttemptAt,
    );
    expect(scheduled).toMatchObject({
      status: "pending",
      attemptCount: 1,
      nextAttemptAt: "2026-07-22T01:00:01.000Z",
      leaseUntil: null,
    });
    await expect(claimLearningCommand(
      queued.recordKey,
      ownerGeneration,
      new Date("2026-07-22T01:00:00.001Z"),
    )).resolves.toBeNull();

    const released = await releaseLearningCommandRetry(
      queued.recordKey,
      ownerGeneration,
    );
    expect(released).toMatchObject({
      status: "pending",
      attemptCount: 1,
      nextAttemptAt: null,
      leaseUntil: null,
      commandId: queued.commandId,
      requestHash: queued.requestHash,
      deviceSequence: queued.deviceSequence,
    });
    await expect(claimLearningCommand(
      queued.recordKey,
      ownerGeneration,
      new Date("2026-07-22T01:00:00.001Z"),
    )).resolves.toMatchObject({
      status: "pending",
      attemptCount: 2,
      commandId: queued.commandId,
      requestHash: queued.requestHash,
      deviceSequence: queued.deviceSequence,
    });
  });

  it("keeps enqueue and acknowledgement idempotent but rejects payload drift", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const first = await enqueueLessonSessionCommand(
      lessonSessionInput(ownerGeneration),
    );
    const duplicate = await enqueueLessonSessionCommand(
      lessonSessionInput(ownerGeneration),
    );
    expect(duplicate.recordKey).toBe(first.recordKey);
    expect(duplicate.deviceSequence).toBe(first.deviceSequence);

    await expect(enqueueLessonSessionCommand({
      ...lessonSessionInput(ownerGeneration),
      command: {
        ...lessonSessionInput(ownerGeneration).command,
        lessonId: "boot-2",
      },
    })).rejects.toBeInstanceOf(LearningCommandConflictError);

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
    const receipt = {
      protocolVersion: 1 as const,
      idempotencyKey: first.command.idempotencyKey,
      duplicate: false,
      sessionId: "server-session:one",
      enrollmentId: first.command.enrollmentId,
      contentVersion: first.command.contentVersion,
      resetEpoch: first.command.resetEpoch,
      lessonId: first.command.lessonId,
      lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
      expectedEvidenceCount: form.activities.length,
      form,
      formHash: await hashLessonSessionForm(form),
      status: "started" as const,
      startedAt: "2026-07-22T01:00:00.000Z",
    };
    const acknowledged = await acknowledgeLearningCommand(
      first.recordKey,
      ownerGeneration,
      receipt,
    );
    const acknowledgedAgain = await acknowledgeLearningCommand(
      first.recordKey,
      ownerGeneration,
      { ...receipt, duplicate: true },
    );
    expect(acknowledgedAgain).toEqual(acknowledged);
    await expect(acknowledgeLearningCommand(
      first.recordKey,
      ownerGeneration,
      { ...receipt, sessionId: "server-session:other" },
    )).rejects.toBeInstanceOf(LearningCommandReceiptConflictError);
  });

  it("never resolves a lesson dependency through another owner's alias", async () => {
    const ownerA = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(lessonSessionInput(ownerA));
    const ownerB = { ownerKey: "account:b", generation: 2 };
    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, ownerB);

    await expect(enqueueObjectiveAttemptCommand({
      ...lessonAttemptInput(ownerB),
      ownerGeneration: ownerB,
    })).rejects.toBeInstanceOf(LearningCommandConflictError);
  });

  it("freezes the exact attempt dependency set without client server IDs", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(lessonSessionInput(ownerGeneration));
    const attempt = await enqueueObjectiveAttemptCommand(
      lessonAttemptInput(ownerGeneration),
    );
    const submission = await enqueueLessonSessionSubmissionCommand(
      submissionInput(ownerGeneration),
    );
    expect(submission.attemptDependencyRecordKeys).toEqual([attempt.recordKey]);
    expect(submission.command).not.toHaveProperty("sessionId");
    expect(submission.command).not.toHaveProperty("formHash");

    await expect(enqueueObjectiveAttemptCommand({
      ...lessonAttemptInput(ownerGeneration),
      command: {
        ...lessonAttemptInput(ownerGeneration).command,
        idempotencyKey: "attempt:late",
      },
    })).rejects.toBeInstanceOf(LearningCommandConflictError);

    await expect(enqueueLessonSessionSubmissionCommand({
      ...submissionInput(ownerGeneration),
      command: {
        ...submissionInput(ownerGeneration).command,
        idempotencyKey: "lesson-session-submit:forged",
        sessionId: "client-forged",
        formHash: `sha256:${"0".repeat(64)}`,
      } as never,
    })).rejects.toThrow(/cannot provide server session/iu);
  });

  it("materializes abandonment only from the acknowledged immutable open receipt", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const session = await enqueueLessonSessionCommand(
      lessonSessionInput(ownerGeneration),
    );
    const abandonment = await enqueueLessonSessionAbandonmentCommand(
      abandonmentInput(ownerGeneration),
    );
    expect(abandonment.dependencyRecordKey).toBe(session.recordKey);
    expect(abandonment.command).not.toHaveProperty("sessionId");
    expect(abandonment.command).not.toHaveProperty("formHash");
    await expect(prepareLearningCommand(
      abandonment.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "blocked",
      reason: expect.stringMatching(/receipt/iu),
    });

    const receipt = await openReceipt(session);
    await acknowledgeLearningCommand(session.recordKey, ownerGeneration, receipt);
    await expect(prepareLearningCommand(
      abandonment.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "ready",
      prepared: {
        kind: "lesson-session-abandon",
        command: {
          idempotencyKey: abandonment.command.idempotencyKey,
          sessionId: receipt.sessionId,
          resetEpoch: receipt.resetEpoch,
          contentVersion: receipt.contentVersion,
        },
        sessionReceipt: {
          formHash: receipt.formHash,
          lessonVersion: receipt.lessonVersion,
        },
      },
    });
  });

  it("quarantines abandonment preparation behind a drifted open-form fence", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const session = await enqueueLessonSessionCommand(
      lessonSessionInput(ownerGeneration, "form-drift"),
    );
    const abandonment = await enqueueLessonSessionAbandonmentCommand(
      abandonmentInput(ownerGeneration, "form-drift"),
    );
    await acknowledgeLearningCommand(session.recordKey, ownerGeneration, {
      ...await openReceipt(session),
      formHash: `sha256:${"0".repeat(64)}`,
    });
    await expect(prepareLearningCommand(
      abandonment.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "invalid",
      reason: expect.stringMatching(/immutable form fence/iu),
    });
  });

  it("allows exactly one terminal command and rejects attempts after submit or abandon", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(lessonSessionInput(ownerGeneration));
    await enqueueObjectiveAttemptCommand(lessonAttemptInput(ownerGeneration));
    await enqueueLessonSessionAbandonmentCommand(abandonmentInput(ownerGeneration));

    await expect(enqueueObjectiveAttemptCommand({
      ...lessonAttemptInput(ownerGeneration),
      command: {
        ...lessonAttemptInput(ownerGeneration).command,
        idempotencyKey: "attempt:late-after-abandon",
      },
    })).rejects.toBeInstanceOf(LearningCommandConflictError);
    await expect(enqueueLessonSessionSubmissionCommand(
      submissionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(LearningCommandConflictError);
    await expect(enqueueLessonSessionAbandonmentCommand({
      ...abandonmentInput(ownerGeneration),
      command: {
        ...abandonmentInput(ownerGeneration).command,
        idempotencyKey: "lesson-session-abandon:second",
      },
    })).rejects.toBeInstanceOf(LearningCommandConflictError);

    await enqueueLessonSessionCommand(lessonSessionInput(ownerGeneration, "two"));
    await enqueueObjectiveAttemptCommand(lessonAttemptInput(ownerGeneration, "two"));
    await enqueueLessonSessionSubmissionCommand({
      ...submissionInput(ownerGeneration),
      sessionAlias: "local-session:two",
      attemptCommandIds: ["attempt:two"],
      command: {
        ...submissionInput(ownerGeneration).command,
        idempotencyKey: "lesson-session-submit:two",
      },
    });
    await expect(enqueueLessonSessionAbandonmentCommand(
      abandonmentInput(ownerGeneration, "two"),
    )).rejects.toBeInstanceOf(LearningCommandConflictError);
    await expect(enqueueObjectiveAttemptCommand({
      ...lessonAttemptInput(ownerGeneration, "two"),
      command: {
        ...lessonAttemptInput(ownerGeneration, "two").command,
        idempotencyKey: "attempt:late-after-submit",
      },
    })).rejects.toBeInstanceOf(LearningCommandConflictError);
  });

  it("rejects a forged abandonment session id or mismatched open command", async () => {
    const ownerGeneration = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await enqueueLessonSessionCommand(lessonSessionInput(ownerGeneration));
    await expect(enqueueLessonSessionAbandonmentCommand({
      ...abandonmentInput(ownerGeneration),
      dependencyCommandId: "lesson-session:forged",
    })).rejects.toBeInstanceOf(LearningCommandConflictError);
    await expect(enqueueLessonSessionAbandonmentCommand({
      ...abandonmentInput(ownerGeneration),
      command: {
        ...abandonmentInput(ownerGeneration).command,
        sessionId: "client-forged-session",
      } as never,
    })).rejects.toThrow(/cannot provide server session/iu);
  });

  it("deletes owner commands and drops anonymous commands during adoption", async () => {
    const anonymous = (
      await readOrInitializeOwnerGeneration("anonymous:installation-a")
    ).ownerGeneration;
    await enqueueLessonSessionCommand({
      ...lessonSessionInput(anonymous),
      ownerGeneration: anonymous,
    });
    await deleteOwnerData(anonymous.ownerKey);
    expect(await listLearningCommandRecords(anonymous)).toEqual([]);

    await enqueueLessonSessionCommand({
      ...lessonSessionInput(anonymous, "adoption"),
      ownerGeneration: anonymous,
    });
    const state = localState();
    const document = createInitialSyncDocument(
      state,
      "2026-07-22T01:00:00.000Z",
      "adoption",
    );
    const adopted = await enqueueOwnerAdoptionOperation(
      anonymous.ownerKey,
      {
        protocolVersion: 1,
        operationId: "local-import:account-a",
        idempotencyKey: "local-import:account-a",
        ownerKey: "account:a",
        installationId: "installation:a",
        deviceId: "device:a",
        deviceSequence: await allocateDeviceSequence(),
        baseRevision: 0,
        kind: "local-import",
        contentVersion: CONTENT_VERSION,
        occurredAt: "2026-07-22T01:00:00.000Z",
        requestHash: "adoption-hash",
        document,
      },
      state,
      anonymous,
    );
    expect(adopted).toEqual({ ownerKey: "account:a", generation: 2 });
    expect(await listLearningCommandRecords(adopted)).toEqual([]);

    const database = await openSyncDatabase();
    const transaction = database.transaction(
      "learning-command-outbox",
      "readonly",
    );
    const done = transactionDone(transaction);
    const sourceKeys = await requestResult(
      transaction
        .objectStore("learning-command-outbox")
        .index("ownerKey")
        .getAllKeys(IDBKeyRange.only(anonymous.ownerKey)),
    );
    await done;
    expect(sourceKeys).toEqual([]);
  });
});
