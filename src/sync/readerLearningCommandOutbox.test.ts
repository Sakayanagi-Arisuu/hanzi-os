import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import type {
  RecordReaderAttemptCommandV1,
  RecordReaderAttemptReceiptV1,
} from "../reader/readerAttemptProtocol";
import {
  hashReaderSessionForm,
  type OpenReaderSessionCommandV1,
  type OpenReaderSessionReceiptV1,
  type ReaderSessionFormV1,
} from "../reader/readerSessionProtocol";
import {
  LEARNING_COMMAND_OUTBOX_STORE,
  openSyncDatabase,
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  StaleOwnerGenerationError,
  type OwnerGeneration,
} from "./indexedDb";
import {
  acknowledgeLearningCommand,
  enqueueReaderAttemptCommand,
  enqueueReaderSessionAbandonmentCommand,
  enqueueReaderSessionCommand,
  enqueueReaderSessionSubmissionCommand,
  findReaderSessionByAlias,
  LearningCommandConflictError,
  LearningCommandReceiptConflictError,
  listLearningCommandRecords,
  persistProjectedReaderSessionAnchor,
  prepareLearningCommand,
  type LearningCommandOutboxRecord,
} from "./learningCommandOutbox";

const DATABASE_NAME = "hanzi-os-sync-v1";
const NOW = "2026-07-26T06:00:00.000Z";
const SESSION_ALIAS = "reader:local:test";

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
  if (!record) throw new Error("Queued Reader command disappeared.");
  store.put(mutate(record));
  await done;
};

const form = (
  supportMode: "assisted" | "unassisted" = "unassisted",
): ReaderSessionFormV1 => ({
  formSchemaVersion: 1,
  storyId: "reader-story:test",
  storyVersion: `${CONTENT_VERSION}:reader-story:test:1`,
  formVersion: `${CONTENT_VERSION}:reader-form:test:1`,
  script: "simplified",
  supportMode,
  supportPolicyVersion: "reader-support:test",
  items: [{
    position: 0,
    itemId: "reader-item:test",
    itemVersion: `${CONTENT_VERSION}:reader-item:test:1`,
    method: "reading-comprehension",
    skill: "reading",
    chineseStimulus: "你好。",
    prompt: "Choose the meaning.",
    options: ["Hello", "Goodbye"],
    answerExposure: "server-confidential",
    priorExposure: supportMode === "assisted",
    masteryEligible: supportMode === "unassisted",
  }],
});

const sessionInput = (
  ownerGeneration: OwnerGeneration,
  options: {
    alias?: string;
    commandId?: string;
    supportMode?: "assisted" | "unassisted";
    resetEpoch?: number;
    supportDependency?: string;
  } = {},
) => ({
  ownerGeneration,
  expectedResetEpoch: options.resetEpoch ?? 0,
  sessionAlias: options.alias ?? SESSION_ALIAS,
  enqueuedAt: NOW,
  ...(options.supportDependency
    ? {
        supportDowngradeDependencyCommandId:
          options.supportDependency,
      }
    : {}),
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: options.commandId ?? "reader-open:test",
    installationId: "installation:test",
    deviceId: "device:test",
    contentVersion: CONTENT_VERSION,
    enrollmentId: "enrollment:test",
    storyId: "reader-story:test",
    script: "simplified" as const,
    supportMode: options.supportMode ?? "unassisted",
  },
});

const openReceipt = async (
  command: OpenReaderSessionCommandV1,
): Promise<OpenReaderSessionReceiptV1> => {
  const issuedForm = form(command.supportMode);
  return {
    protocolVersion: 1,
    idempotencyKey: command.idempotencyKey,
    duplicate: false,
    sessionId: `server:${command.idempotencyKey}`,
    enrollmentId: command.enrollmentId,
    resetEpoch: command.resetEpoch,
    contentVersion: command.contentVersion,
    storyId: issuedForm.storyId,
    storyVersion: issuedForm.storyVersion,
    formVersion: issuedForm.formVersion,
    formSchemaVersion: 1,
    script: issuedForm.script,
    supportMode: issuedForm.supportMode,
    supportPolicyVersion: issuedForm.supportPolicyVersion,
    expectedItemCount: issuedForm.items.length,
    form: issuedForm,
    formHash: await hashReaderSessionForm(issuedForm),
    status: "started",
    startedAt: NOW,
  };
};

const attemptInput = (
  ownerGeneration: OwnerGeneration,
  sessionAlias = SESSION_ALIAS,
  commandId = "reader-attempt:test",
) => {
  const item = form().items[0]!;
  return {
    ownerGeneration,
    expectedResetEpoch: 0,
    sessionAlias,
    enqueuedAt: NOW,
    command: {
      protocolVersion: 1 as const,
      idempotencyKey: commandId,
      installationId: "installation:test",
      deviceId: "device:test",
      contentVersion: CONTENT_VERSION,
      itemId: item.itemId,
      itemVersion: item.itemVersion,
      position: item.position,
      selectedOption: item.options[0]!,
      occurredAt: NOW,
      durationMs: 500,
    },
  };
};

const attemptReceipt = (
  command: RecordReaderAttemptCommandV1,
  supportMode: "assisted" | "unassisted" = "unassisted",
): RecordReaderAttemptReceiptV1 => {
  const item = form(supportMode).items[command.position]!;
  return {
    protocolVersion: 1,
    idempotencyKey: command.idempotencyKey,
    duplicate: false,
    attemptId: `server:${command.idempotencyKey}`,
    evidenceId: `evidence:${command.idempotencyKey}`,
    sessionId: command.sessionId,
    resetEpoch: command.resetEpoch,
    contentVersion: command.contentVersion,
    formHash: command.formHash,
    position: command.position,
    itemId: command.itemId,
    itemVersion: command.itemVersion,
    method: item.method,
    skill: item.skill,
    script: "simplified",
    supportMode,
    supportPolicyVersion: "reader-support:test",
    answerExposure: item.answerExposure,
    priorExposure: item.priorExposure,
    masteryEligible: item.masteryEligible,
    outcome: "correct",
    score: 100,
    verification: "server-objective",
    status: "recorded",
    recordedAt: NOW,
  };
};

const acknowledgeOpen = async (ownerGeneration: OwnerGeneration) => {
  const session = await enqueueReaderSessionCommand(
    sessionInput(ownerGeneration),
  );
  const receipt = await openReceipt(session.command);
  await acknowledgeLearningCommand(
    session.recordKey,
    ownerGeneration,
    receipt,
    new Date(NOW),
  );
  return { session, receipt };
};

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
});

describe("Reader learning-command outbox", () => {
  it("rejects a valid-looking mutation of a queued Reader open command", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    const session = await enqueueReaderSessionCommand(
      sessionInput(ownerGeneration),
    );
    await overwriteRecord(session.recordKey, (record) => {
      if (record.kind !== "reader-session-open") {
        throw new Error("Expected a Reader open command.");
      }
      return {
        ...record,
        command: {
          ...record.command,
          storyId: "reader-story:tampered",
        },
      };
    });

    await expect(prepareLearningCommand(
      session.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "invalid",
      reason: expect.stringMatching(/command envelope/iu),
    });
  });

  it("rejects Reader envelope metadata drift even when the payload hash is unchanged", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    const session = await enqueueReaderSessionCommand(
      sessionInput(ownerGeneration),
    );
    await overwriteRecord(session.recordKey, (record) => {
      if (record.kind !== "reader-session-open") {
        throw new Error("Expected a Reader open command.");
      }
      return {
        ...record,
        sessionAliasLookupKey: "reader:tampered:index",
      };
    });

    await expect(prepareLearningCommand(
      session.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "invalid",
      reason: expect.stringMatching(/command envelope/iu),
    });
  });

  it("hashes the normalized Reader attempt timestamp without false quarantine", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    await acknowledgeOpen(ownerGeneration);
    const input = attemptInput(ownerGeneration);
    input.command.occurredAt = "2026-07-26T13:00:00+07:00";
    const attempt = await enqueueReaderAttemptCommand(input);

    expect(attempt.command.occurredAt).toBe(NOW);
    await expect(prepareLearningCommand(
      attempt.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "ready",
      prepared: {
        kind: "reader-attempt",
        command: { occurredAt: NOW },
      },
    });
  });

  it("rejects a valid option mutation under the original Reader attempt hash", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    await acknowledgeOpen(ownerGeneration);
    const attempt = await enqueueReaderAttemptCommand(
      attemptInput(ownerGeneration),
    );
    await overwriteRecord(attempt.recordKey, (record) => {
      if (record.kind !== "reader-attempt") {
        throw new Error("Expected a Reader attempt command.");
      }
      return {
        ...record,
        command: {
          ...record.command,
          selectedOption: "Goodbye",
        },
      };
    });

    await expect(prepareLearningCommand(
      attempt.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "invalid",
      reason: expect.stringMatching(/command envelope/iu),
    });
  });

  it("rejects a valid-looking Reader submission mutation under its old hash", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    await acknowledgeOpen(ownerGeneration);
    const attempt = await enqueueReaderAttemptCommand(
      attemptInput(ownerGeneration),
    );
    const preparedAttempt = await prepareLearningCommand(
      attempt.recordKey,
      ownerGeneration,
    );
    if (
      preparedAttempt.state !== "ready"
      || preparedAttempt.prepared.kind !== "reader-attempt"
    ) throw new Error("Reader attempt was not ready.");
    await acknowledgeLearningCommand(
      attempt.recordKey,
      ownerGeneration,
      attemptReceipt(preparedAttempt.prepared.command),
      new Date(NOW),
    );
    const submission = await enqueueReaderSessionSubmissionCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: SESSION_ALIAS,
      attemptCommandIds: [attempt.commandId],
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "reader-submit:tamper",
        installationId: "installation:test",
        deviceId: "device:test",
        contentVersion: CONTENT_VERSION,
        expectedItemCount: 1,
      },
    });
    await overwriteRecord(submission.recordKey, (record) => {
      if (record.kind !== "reader-session-submit") {
        throw new Error("Expected a Reader submission command.");
      }
      return {
        ...record,
        command: {
          ...record.command,
          expectedItemCount: 2,
        },
      };
    });

    await expect(prepareLearningCommand(
      submission.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "invalid",
      reason: expect.stringMatching(/command envelope/iu),
    });
  });

  it("rejects a valid Reader abandonment reason mutation under its old hash", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    const { session } = await acknowledgeOpen(ownerGeneration);
    const abandonment = await enqueueReaderSessionAbandonmentCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: session.sessionAlias,
      dependencyCommandId: session.commandId,
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "reader-abandon:tamper",
        installationId: "installation:test",
        deviceId: "device:test",
        contentVersion: CONTENT_VERSION,
        reason: "user-exit",
      },
    });
    await overwriteRecord(abandonment.recordKey, (record) => {
      if (record.kind !== "reader-session-abandon") {
        throw new Error("Expected a Reader abandonment command.");
      }
      return {
        ...record,
        command: {
          ...record.command,
          reason: "superseded",
        },
      };
    });

    await expect(prepareLearningCommand(
      abandonment.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "invalid",
      reason: expect.stringMatching(/command envelope/iu),
    });
  });

  it("keeps one Reader authority when a projected anchor wins before open acknowledgement", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    const session = await enqueueReaderSessionCommand(
      sessionInput(ownerGeneration),
    );
    const receipt = await openReceipt(session.command);
    const {
      protocolVersion: _protocolVersion,
      idempotencyKey: _idempotencyKey,
      duplicate: _duplicate,
      ...binding
    } = receipt;
    await persistProjectedReaderSessionAnchor({
      ownerGeneration,
      installationId: "installation:test",
      deviceId: "device:test",
      resetEpoch: 0,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      projectionCursor: 12,
      binding,
      projectedAttempts: [],
      adoptedAt: NOW,
    });

    await expect(acknowledgeLearningCommand(
      session.recordKey,
      ownerGeneration,
      receipt,
      new Date(NOW),
    )).resolves.toMatchObject({
      status: "quarantined",
      receipt: null,
      quarantineReason: expect.stringMatching(/projected authority/iu),
    });

    const records = await listLearningCommandRecords(ownerGeneration);
    expect(records.find(
      (record) => record.recordKey === session.recordKey,
    )).toMatchObject({
      kind: "reader-session-open",
      status: "quarantined",
      receipt: null,
    });
    expect(records.filter((record) =>
      (
        record.kind === "projected-reader-session-anchor"
        && record.binding.sessionId === receipt.sessionId
      )
      || (
        record.kind === "reader-session-open"
        && record.receipt?.sessionId === receipt.sessionId
      )
    )).toHaveLength(1);
  });

  it("enforces reset CAS, replay identity, and immutable form coverage", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    await expect(enqueueReaderSessionCommand(sessionInput(
      ownerGeneration,
      { resetEpoch: 1 },
    ))).rejects.toBeInstanceOf(StaleOwnerGenerationError);

    const first = await enqueueReaderSessionCommand(
      sessionInput(ownerGeneration),
    );
    const replay = await enqueueReaderSessionCommand(
      sessionInput(ownerGeneration),
    );
    expect(replay).toEqual(first);
    const receipt = await openReceipt(first.command);
    await acknowledgeLearningCommand(
      first.recordKey,
      ownerGeneration,
      receipt,
      new Date(NOW),
    );
    await expect(acknowledgeLearningCommand(
      first.recordKey,
      ownerGeneration,
      { ...receipt, duplicate: true },
      new Date(NOW),
    )).resolves.toMatchObject({ status: "acknowledged" });
    await expect(acknowledgeLearningCommand(
      first.recordKey,
      ownerGeneration,
      { ...receipt, sessionId: "different-server-session" },
      new Date(NOW),
    )).rejects.toBeInstanceOf(LearningCommandReceiptConflictError);

    const attempt = await enqueueReaderAttemptCommand(
      attemptInput(ownerGeneration),
    );
    expect("sessionId" in attempt.command).toBe(false);
    expect("formHash" in attempt.command).toBe(false);
    expect(JSON.stringify(attempt.command)).not.toMatch(
      /answerKey|correct|outcome|score|masteryEligible/u,
    );
    await expect(enqueueReaderAttemptCommand(attemptInput(
      ownerGeneration,
      SESSION_ALIAS,
      "reader-attempt:duplicate",
    ))).rejects.toBeInstanceOf(LearningCommandConflictError);
    const prepared = await prepareLearningCommand(
      attempt.recordKey,
      ownerGeneration,
    );
    expect(prepared).toMatchObject({
      state: "ready",
      prepared: {
        kind: "reader-attempt",
        command: {
          sessionId: receipt.sessionId,
          formHash: receipt.formHash,
        },
      },
    });
  });

  it("fails closed when stored session authority no longer binds its form", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    const session = await enqueueReaderSessionCommand(
      sessionInput(ownerGeneration),
    );
    const receipt = await openReceipt(session.command);
    await acknowledgeLearningCommand(
      session.recordKey,
      ownerGeneration,
      {
        ...receipt,
        formHash: `sha256:${"0".repeat(64)}`,
      },
      new Date(NOW),
    );
    await expect(enqueueReaderAttemptCommand(
      attemptInput(ownerGeneration),
    )).rejects.toBeInstanceOf(LearningCommandConflictError);
  });

  it("serializes terminal races and blocks later attempts", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    const { session } = await acknowledgeOpen(ownerGeneration);
    const attempt = await enqueueReaderAttemptCommand(
      attemptInput(ownerGeneration),
    );
    const terminalResults = await Promise.allSettled([
      enqueueReaderSessionSubmissionCommand({
        ownerGeneration,
        expectedResetEpoch: 0,
        sessionAlias: session.sessionAlias,
        attemptCommandIds: [attempt.commandId],
        enqueuedAt: NOW,
        command: {
          protocolVersion: 1,
          idempotencyKey: "reader-submit:race",
          installationId: "installation:test",
          deviceId: "device:test",
          contentVersion: CONTENT_VERSION,
          expectedItemCount: 1,
        },
      }),
      enqueueReaderSessionAbandonmentCommand({
        ownerGeneration,
        expectedResetEpoch: 0,
        sessionAlias: session.sessionAlias,
        dependencyCommandId: session.commandId,
        enqueuedAt: NOW,
        command: {
          protocolVersion: 1,
          idempotencyKey: "reader-abandon:race",
          installationId: "installation:test",
          deviceId: "device:test",
          contentVersion: CONTENT_VERSION,
          reason: "user-exit",
        },
      }),
    ]);
    expect(terminalResults.filter(
      (result) => result.status === "fulfilled",
    )).toHaveLength(1);
    expect(terminalResults.filter(
      (result) => result.status === "rejected",
    )).toHaveLength(1);
    await expect(enqueueReaderAttemptCommand(attemptInput(
      ownerGeneration,
      SESSION_ALIAS,
      "reader-attempt:after-terminal",
    ))).rejects.toBeInstanceOf(LearningCommandConflictError);
  });

  it("blocks an assisted reopen until support-request abandonment is acknowledged", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    const { session, receipt } = await acknowledgeOpen(ownerGeneration);
    const abandonment = await enqueueReaderSessionAbandonmentCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: session.sessionAlias,
      dependencyCommandId: session.commandId,
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "reader-abandon:support",
        installationId: "installation:test",
        deviceId: "device:test",
        contentVersion: CONTENT_VERSION,
        reason: "support-requested",
      },
    });
    const assisted = await enqueueReaderSessionCommand(sessionInput(
      ownerGeneration,
      {
        alias: "reader:assisted:test",
        commandId: "reader-open:assisted",
        supportMode: "assisted",
        supportDependency: abandonment.commandId,
      },
    ));
    await expect(prepareLearningCommand(
      assisted.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({ state: "blocked" });
    await acknowledgeLearningCommand(
      abandonment.recordKey,
      ownerGeneration,
      {
        protocolVersion: 1,
        idempotencyKey: abandonment.commandId,
        duplicate: false,
        sessionId: receipt.sessionId,
        enrollmentId: receipt.enrollmentId,
        resetEpoch: 0,
        contentVersion: CONTENT_VERSION,
        storyId: receipt.storyId,
        storyVersion: receipt.storyVersion,
        formVersion: receipt.formVersion,
        formHash: receipt.formHash,
        script: receipt.script,
        supportMode: receipt.supportMode,
        supportPolicyVersion: receipt.supportPolicyVersion,
        reason: "support-requested",
        status: "abandoned",
        abandonedAt: NOW,
      },
      new Date(NOW),
    );
    await expect(prepareLearningCommand(
      assisted.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "ready",
      prepared: {
        kind: "reader-session-open",
        command: { supportMode: "assisted" },
      },
    });
  });

  it("adopts projected answer-free authority and submits full projected coverage", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader")
    ).ownerGeneration;
    const issued = await openReceipt({
      ...sessionInput(ownerGeneration).command,
      deviceSequence: 1,
      resetEpoch: 0,
    });
    const {
      protocolVersion: _protocolVersion,
      idempotencyKey: _idempotencyKey,
      duplicate: _duplicate,
      ...binding
    } = issued;
    const projected = attemptReceipt({
      protocolVersion: 1,
      idempotencyKey: "projected-reader-attempt",
      installationId: "installation:test",
      deviceId: "device:test",
      deviceSequence: 2,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      sessionId: binding.sessionId,
      formHash: binding.formHash,
      itemId: binding.form.items[0]!.itemId,
      itemVersion: binding.form.items[0]!.itemVersion,
      position: 0,
      selectedOption: binding.form.items[0]!.options[0]!,
      occurredAt: NOW,
    });
    const {
      protocolVersion: _attemptProtocol,
      idempotencyKey: _attemptKey,
      duplicate: _attemptDuplicate,
      ...projectedAttempt
    } = projected;
    const anchor = await persistProjectedReaderSessionAnchor({
      ownerGeneration,
      installationId: "installation:test",
      deviceId: "device:test",
      resetEpoch: 0,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      projectionCursor: 12,
      binding,
      projectedAttempts: [projectedAttempt],
      adoptedAt: NOW,
    });
    await expect(findReaderSessionByAlias(
      ownerGeneration,
      anchor.sessionAlias,
    )).resolves.toMatchObject({
      kind: "projected-reader-session-anchor",
      receipt: null,
    });
    const submission = await enqueueReaderSessionSubmissionCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: anchor.sessionAlias,
      attemptCommandIds: [],
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "reader-submit:projected",
        installationId: "installation:test",
        deviceId: "device:test",
        contentVersion: CONTENT_VERSION,
        expectedItemCount: 1,
      },
    });
    await expect(prepareLearningCommand(
      submission.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "ready",
      prepared: {
        kind: "reader-session-submit",
        attemptReceipts: [],
        projectedAttempts: [{ position: 0 }],
      },
    });
  });
});
