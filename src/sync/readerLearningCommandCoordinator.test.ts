import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CURRENT_CONTENT_MANIFEST_SHA256,
  CURRENT_CONTENT_VERSION as CONTENT_VERSION,
} from "../content/currentContentIdentity";
import type {
  AbandonReaderSessionCommandV1,
  AbandonReaderSessionReceiptV1,
} from "../reader/readerAbandonmentProtocol";
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
import type {
  SubmitReaderSessionCommandV1,
  SubmitReaderSessionReceiptV1,
} from "../reader/readerSubmissionProtocol";
import {
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  type OwnerGeneration,
} from "./indexedDb";
import {
  flushLearningCommandOutbox,
  type LearningCommandTransport,
  type LearningCommandTransportResponse,
} from "./learningCommandCoordinator";
import {
  enqueueReaderAttemptCommand,
  enqueueReaderSessionAbandonmentCommand,
  enqueueReaderSessionCommand,
  enqueueReaderSessionSubmissionCommand,
  listLearningCommandRecords,
  persistProjectedReaderSessionAnchor,
} from "./learningCommandOutbox";

const DATABASE_NAME = "hanzi-os-sync-v1";
const NOW = "2026-07-26T07:00:00.000Z";

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), {
    once: true,
  });
});

const response = (
  status: number,
  body: unknown,
  retryAfterMs = 0,
): LearningCommandTransportResponse => ({ status, body, retryAfterMs });

const form = (
  supportMode: "assisted" | "unassisted" = "unassisted",
): ReaderSessionFormV1 => ({
  formSchemaVersion: 1,
  storyId: "reader-story:coordinator",
  storyVersion: `${CONTENT_VERSION}:reader-story:coordinator:1`,
  formVersion: `${CONTENT_VERSION}:reader-form:coordinator:1`,
  script: "simplified",
  supportMode,
  supportPolicyVersion: "reader-support:coordinator",
  items: [{
    position: 0,
    itemId: "reader-item:coordinator",
    itemVersion: `${CONTENT_VERSION}:reader-item:coordinator:1`,
    method: "reading-comprehension",
    skill: "reading",
    chineseStimulus: "\u4f60\u597d\u3002",
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
    supportDependency?: string;
  } = {},
) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias: options.alias ?? "reader:coordinator",
  enqueuedAt: NOW,
  ...(options.supportDependency
    ? {
        supportDowngradeDependencyCommandId:
          options.supportDependency,
      }
    : {}),
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: options.commandId ?? "reader-open:coordinator",
    installationId: "installation:coordinator",
    deviceId: "device:coordinator",
    contentVersion: CONTENT_VERSION,
    enrollmentId: "enrollment:coordinator",
    storyId: "reader-story:coordinator",
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
    sessionId: `server-${command.idempotencyKey}`,
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
  sessionAlias = "reader:coordinator",
  commandId = "reader-attempt:coordinator",
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
      installationId: "installation:coordinator",
      deviceId: "device:coordinator",
      contentVersion: CONTENT_VERSION,
      itemId: item.itemId,
      itemVersion: item.itemVersion,
      position: item.position,
      selectedOption: item.options[0]!,
      occurredAt: NOW,
    },
  };
};

const attemptReceipt = (
  command: RecordReaderAttemptCommandV1,
): RecordReaderAttemptReceiptV1 => {
  const issuedForm = form();
  const item = issuedForm.items[command.position]!;
  return {
    protocolVersion: 1,
    idempotencyKey: command.idempotencyKey,
    duplicate: false,
    attemptId: `server-${command.idempotencyKey}`,
    evidenceId: `evidence-${command.idempotencyKey}`,
    sessionId: command.sessionId,
    resetEpoch: command.resetEpoch,
    contentVersion: command.contentVersion,
    formHash: command.formHash,
    position: command.position,
    itemId: command.itemId,
    itemVersion: command.itemVersion,
    method: item.method,
    skill: item.skill,
    script: issuedForm.script,
    supportMode: issuedForm.supportMode,
    supportPolicyVersion: issuedForm.supportPolicyVersion,
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

const submissionReceipt = (
  command: SubmitReaderSessionCommandV1,
): SubmitReaderSessionReceiptV1 => {
  const issuedForm = form();
  const item = issuedForm.items[0]!;
  return {
    protocolVersion: 1,
    idempotencyKey: command.idempotencyKey,
    duplicate: false,
    sessionId: command.sessionId,
    enrollmentId: "enrollment:coordinator",
    resetEpoch: command.resetEpoch,
    contentVersion: command.contentVersion,
    storyId: issuedForm.storyId,
    storyVersion: issuedForm.storyVersion,
    formVersion: issuedForm.formVersion,
    formHash: command.formHash,
    expectedItemCount: command.expectedItemCount,
    attemptCount: 1,
    correctCount: 1,
    score: 100,
    method: item.method,
    skill: item.skill,
    script: issuedForm.script,
    supportMode: issuedForm.supportMode,
    supportPolicyVersion: issuedForm.supportPolicyVersion,
    results: [{
      position: item.position,
      itemId: item.itemId,
      itemVersion: item.itemVersion,
      correct: true,
      answerExposure: item.answerExposure,
      priorExposure: item.priorExposure,
      masteryEligible: item.masteryEligible,
    }],
    status: "submitted",
    submittedAt: NOW,
  };
};

const abandonmentReceipt = (
  command: AbandonReaderSessionCommandV1,
  session: OpenReaderSessionReceiptV1,
): AbandonReaderSessionReceiptV1 => ({
  protocolVersion: 1,
  idempotencyKey: command.idempotencyKey,
  duplicate: false,
  sessionId: command.sessionId,
  enrollmentId: session.enrollmentId,
  resetEpoch: command.resetEpoch,
  contentVersion: command.contentVersion,
  storyId: session.storyId,
  storyVersion: session.storyVersion,
  formVersion: session.formVersion,
  formHash: command.formHash,
  script: session.script,
  supportMode: session.supportMode,
  supportPolicyVersion: session.supportPolicyVersion,
  reason: command.reason,
  status: "abandoned",
  abandonedAt: NOW,
});

const nonReaderTransportStubs = (): Pick<
  LearningCommandTransport,
  | "sendLessonSession"
  | "sendObjectiveAttempt"
  | "sendLessonSessionSubmission"
  | "sendLessonSessionAbandonment"
  | "sendOpenAssessmentSession"
  | "sendRecordAssessmentAttempt"
  | "sendSubmitAssessmentSession"
  | "sendAbandonAssessmentSession"
  | "sendReviewGrade"
> => ({
  sendLessonSession: vi.fn(),
  sendObjectiveAttempt: vi.fn(),
  sendLessonSessionSubmission: vi.fn(),
  sendLessonSessionAbandonment: vi.fn(),
  sendOpenAssessmentSession: vi.fn(),
  sendRecordAssessmentAttempt: vi.fn(),
  sendSubmitAssessmentSession: vi.fn(),
  sendAbandonAssessmentSession: vi.fn(),
  sendReviewGrade: vi.fn(),
});

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
  vi.restoreAllMocks();
});

describe("Reader learning-command coordinator", () => {
  it("terminally quarantines a redundant open after projected authority wins", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader-authority-race")
    ).ownerGeneration;
    const session = await enqueueReaderSessionCommand(
      sessionInput(ownerGeneration),
    );
    const sendOpenReaderSession = vi.fn(async (
      command: OpenReaderSessionCommandV1,
    ) => {
      const receipt = await openReceipt(command);
      const {
        protocolVersion: _protocolVersion,
        idempotencyKey: _idempotencyKey,
        duplicate: _duplicate,
        ...binding
      } = receipt;
      await persistProjectedReaderSessionAnchor({
        ownerGeneration,
        installationId: command.installationId,
        deviceId: command.deviceId,
        resetEpoch: command.resetEpoch,
        manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
        projectionCursor: 1,
        binding,
        projectedAttempts: [],
        adoptedAt: NOW,
      });
      return response(201, receipt);
    });
    const transport: LearningCommandTransport = {
      ...nonReaderTransportStubs(),
      sendOpenReaderSession,
      sendRecordReaderAttempt: vi.fn(),
      sendSubmitReaderSession: vi.fn(),
      sendAbandonReaderSession: vi.fn(),
    };

    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({
      acknowledged: 0,
      quarantined: 1,
      retried: 0,
    });
    expect((await listLearningCommandRecords(ownerGeneration)).find(
      (record) => record.recordKey === session.recordKey,
    )).toMatchObject({
      status: "quarantined",
      attemptCount: 1,
      receipt: null,
      quarantineReason: expect.stringMatching(/projected authority/iu),
    });

    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date("2026-07-26T08:00:00.000Z"),
    })).resolves.toEqual({
      acknowledged: 0,
      quarantined: 0,
      retried: 0,
      blocked: 0,
    });
    expect(sendOpenReaderSession).toHaveBeenCalledTimes(1);
  });

  it("delivers open, exact attempt, and submission through dedicated methods", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader-coordinator")
    ).ownerGeneration;
    const session = await enqueueReaderSessionCommand(
      sessionInput(ownerGeneration),
    );
    const calls: string[] = [];
    const transport: LearningCommandTransport = {
      ...nonReaderTransportStubs(),
      sendOpenReaderSession: vi.fn(async (command) => {
        calls.push("open");
        return response(201, await openReceipt(command));
      }),
      sendRecordReaderAttempt: vi.fn(async (command) => {
        calls.push("attempt");
        return response(201, attemptReceipt(command));
      }),
      sendSubmitReaderSession: vi.fn(async (command) => {
        calls.push("submit");
        return response(200, submissionReceipt(command));
      }),
      sendAbandonReaderSession: vi.fn(),
    };

    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({ acknowledged: 1 });
    const attempt = await enqueueReaderAttemptCommand(
      attemptInput(ownerGeneration, session.sessionAlias),
    );
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({ acknowledged: 1 });
    await enqueueReaderSessionSubmissionCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: session.sessionAlias,
      attemptCommandIds: [attempt.commandId],
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "reader-submit:coordinator",
        installationId: "installation:coordinator",
        deviceId: "device:coordinator",
        contentVersion: CONTENT_VERSION,
        expectedItemCount: 1,
      },
    });
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({ acknowledged: 1, retried: 0 });

    expect(calls).toEqual(["open", "attempt", "submit"]);
    expect((await listLearningCommandRecords(ownerGeneration)).every(
      (record) => record.status === "acknowledged",
    )).toBe(true);
  });

  it("retries a successful attempt response with any extra result field", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader-receipt")
    ).ownerGeneration;
    const session = await enqueueReaderSessionCommand(
      sessionInput(ownerGeneration),
    );
    const openTransport: LearningCommandTransport = {
      ...nonReaderTransportStubs(),
      sendOpenReaderSession: vi.fn(async (command) =>
        response(201, await openReceipt(command))),
      sendRecordReaderAttempt: vi.fn(),
      sendSubmitReaderSession: vi.fn(),
      sendAbandonReaderSession: vi.fn(),
    };
    await flushLearningCommandOutbox({
      ownerGeneration,
      transport: openTransport,
      now: () => new Date(NOW),
    });
    const attempt = await enqueueReaderAttemptCommand(
      attemptInput(ownerGeneration, session.sessionAlias),
    );
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...openTransport,
        sendRecordReaderAttempt: vi.fn(async (command) => response(201, {
          ...attemptReceipt(command),
          correctAnswer: "Hello",
        })),
      },
      now: () => new Date(NOW),
    });

    expect(result).toMatchObject({ acknowledged: 0, retried: 1 });
    expect((await listLearningCommandRecords(ownerGeneration)).find(
      (record) => record.recordKey === attempt.recordKey,
    )).toMatchObject({ status: "pending", attemptCount: 1, receipt: null });
  });

  it("delivers support-request abandonment before an assisted reopen", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:reader-support")
    ).ownerGeneration;
    const session = await enqueueReaderSessionCommand(
      sessionInput(ownerGeneration),
    );
    let initialReceipt: OpenReaderSessionReceiptV1 | null = null;
    const calls: string[] = [];
    const transport: LearningCommandTransport = {
      ...nonReaderTransportStubs(),
      sendOpenReaderSession: vi.fn(async (command) => {
        calls.push(`open:${command.supportMode}`);
        const receipt = await openReceipt(command);
        if (command.supportMode === "unassisted") initialReceipt = receipt;
        return response(201, receipt);
      }),
      sendRecordReaderAttempt: vi.fn(),
      sendSubmitReaderSession: vi.fn(),
      sendAbandonReaderSession: vi.fn(async (command) => {
        calls.push(`abandon:${command.reason}`);
        if (!initialReceipt) throw new Error("Missing initial Reader receipt.");
        return response(
          200,
          abandonmentReceipt(command, initialReceipt),
        );
      }),
    };
    await flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    });
    const abandonment = await enqueueReaderSessionAbandonmentCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: session.sessionAlias,
      dependencyCommandId: session.commandId,
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "reader-abandon:support",
        installationId: "installation:coordinator",
        deviceId: "device:coordinator",
        contentVersion: CONTENT_VERSION,
        reason: "support-requested",
      },
    });
    await enqueueReaderSessionCommand(sessionInput(ownerGeneration, {
      alias: "reader:coordinator:assisted",
      commandId: "reader-open:coordinator:assisted",
      supportMode: "assisted",
      supportDependency: abandonment.commandId,
    }));
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({ acknowledged: 2, retried: 0 });

    expect(calls).toEqual([
      "open:unassisted",
      "abandon:support-requested",
      "open:assisted",
    ]);
    const records = await listLearningCommandRecords(ownerGeneration);
    const assisted = records.find(
      (record) => record.commandId === "reader-open:coordinator:assisted",
    );
    expect(assisted).toMatchObject({
      status: "acknowledged",
      receipt: {
        supportMode: "assisted",
        form: {
          items: [{
            priorExposure: true,
            masteryEligible: false,
          }],
        },
      },
    });
  });
});
