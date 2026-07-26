import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AbandonAssessmentSessionCommandV1 } from "../assessment/assessmentAbandonmentProtocol";
import type {
  RecordAssessmentAttemptCommandV1,
  RecordAssessmentAttemptReceiptV1,
} from "../assessment/assessmentAttemptProtocol";
import {
  hashAssessmentForm,
  type AssessmentFormV1,
  type OpenAssessmentSessionCommandV1,
  type OpenAssessmentSessionReceiptV1,
} from "../assessment/assessmentSessionProtocol";
import type {
  AssessmentObservedResultV1,
  SubmitAssessmentSessionCommandV1,
} from "../assessment/assessmentSubmissionProtocol";
import { CONTENT_VERSION } from "../data/curriculum";
import type { Skill } from "../types";
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
  enqueueAssessmentAttemptCommand,
  enqueueAssessmentSessionAbandonmentCommand,
  enqueueAssessmentSessionCommand,
  enqueueAssessmentSessionSubmissionCommand,
  listLearningCommandRecords,
} from "./learningCommandOutbox";

const DATABASE_NAME = "hanzi-os-sync-v1";
const NOW = "2026-07-22T10:00:00.000Z";
const SKILLS: readonly Skill[] = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
];

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const response = (
  status: number,
  body: unknown,
  retryAfterMs = 0,
): LearningCommandTransportResponse => ({ status, body, retryAfterMs });

const form = (): AssessmentFormV1 => ({
  schemaVersion: 1,
  blueprintId: "assessment-blueprint:coordinator",
  formVersion: `${CONTENT_VERSION}:assessment-form:coordinator`,
  scoringPolicyVersion: "observed-wilson:coordinator",
  items: [
    {
      position: 0,
      itemId: "assessment-item:coordinator:vocabulary",
      itemVersion: `${CONTENT_VERSION}:assessment-item:coordinator:vocabulary:1`,
      skill: "vocabulary",
      construct: "word-meaning-recognition",
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "ni",
      meta: "Choose the meaning",
      options: ["you", "me"],
    },
    {
      position: 1,
      itemId: "assessment-item:coordinator:listening",
      itemVersion: `${CONTENT_VERSION}:assessment-item:coordinator:listening:1`,
      skill: "listening",
      construct: "phrase-identification",
      modality: "synthetic-tts-selection",
      measurementEligible: false,
      prompt: "Listen and choose",
      meta: "Synthetic TTS practice",
      options: ["hello", "thanks"],
      stimulusText: "xiexie",
    },
  ],
});

const sessionInput = (
  ownerGeneration: OwnerGeneration,
  suffix = "submit",
) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias: `assessment:coordinator:${suffix}`,
  enqueuedAt: NOW,
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: `assessment-open:coordinator:${suffix}`,
    installationId: "installation:coordinator",
    deviceId: "device:coordinator",
    contentVersion: CONTENT_VERSION,
    enrollmentId: "enrollment:coordinator",
  },
});

const openReceipt = async (
  command: OpenAssessmentSessionCommandV1,
): Promise<OpenAssessmentSessionReceiptV1> => {
  const issuedForm = form();
  return {
    protocolVersion: 1,
    idempotencyKey: command.idempotencyKey,
    duplicate: false,
    sessionId: `server-${command.idempotencyKey}`,
    enrollmentId: command.enrollmentId,
    resetEpoch: command.resetEpoch,
    contentVersion: command.contentVersion,
    blueprintId: issuedForm.blueprintId,
    formVersion: issuedForm.formVersion,
    scoringPolicyVersion: issuedForm.scoringPolicyVersion,
    expectedItemCount: issuedForm.items.length,
    form: issuedForm,
    formHash: await hashAssessmentForm(issuedForm),
    status: "started",
    startedAt: NOW,
  };
};

const attemptInput = (
  ownerGeneration: OwnerGeneration,
  sessionAlias: string,
  position: number,
) => {
  const item = form().items[position]!;
  return {
    ownerGeneration,
    expectedResetEpoch: 0,
    sessionAlias,
    enqueuedAt: NOW,
    command: {
      protocolVersion: 1 as const,
      idempotencyKey: `assessment-attempt:coordinator:${position}`,
      installationId: "installation:coordinator",
      deviceId: "device:coordinator",
      contentVersion: CONTENT_VERSION,
      itemId: item.itemId,
      itemVersion: item.itemVersion,
      occurredAt: NOW,
      response: {
        kind: "selection" as const,
        answer: item.options[0]!,
      },
    },
  };
};

const attemptReceipt = (
  command: RecordAssessmentAttemptCommandV1,
): RecordAssessmentAttemptReceiptV1 => {
  const item = form().items.find((candidate) =>
    candidate.itemId === command.itemId
  )!;
  return {
    protocolVersion: 1,
    idempotencyKey: command.idempotencyKey,
    duplicate: false,
    attemptId: `server-${command.idempotencyKey}`,
    sessionId: command.sessionId,
    resetEpoch: command.resetEpoch,
    contentVersion: command.contentVersion,
    formHash: command.formHash,
    position: item.position,
    itemId: item.itemId,
    itemVersion: item.itemVersion,
    skill: item.skill,
    measurementEligible: item.measurementEligible,
    masteryEligible: false,
    status: "recorded",
    recordedAt: NOW,
  };
};

const observed = (correct: number, n: number): AssessmentObservedResultV1 => {
  if (n === 0) {
    return {
      status: "unassessed",
      correct: 0,
      n: 0,
      observedAccuracy: null,
      confidence95: null,
      masteryEligible: false,
    };
  }
  const z = 1.959963984540054;
  const proportion = correct / n;
  const zSquared = z * z;
  const denominator = 1 + zSquared / n;
  const center = (proportion + zSquared / (2 * n)) / denominator;
  const margin = z * Math.sqrt(
    (proportion * (1 - proportion) + zSquared / (4 * n)) / n,
  ) / denominator;
  return {
    status: n < 2 ? "insufficient" : "observed",
    correct,
    n,
    observedAccuracy: Math.round(proportion * 100),
    confidence95: {
      lower: Math.round(Math.max(0, center - margin) * 100),
      upper: Math.round(Math.min(1, center + margin) * 100),
    },
    masteryEligible: false,
  };
};

const submissionReceipt = (command: SubmitAssessmentSessionCommandV1) => ({
  protocolVersion: 1 as const,
  idempotencyKey: command.idempotencyKey,
  duplicate: false,
  sessionId: command.sessionId,
  enrollmentId: "enrollment:coordinator",
  resetEpoch: command.resetEpoch,
  contentVersion: command.contentVersion,
  blueprintId: form().blueprintId,
  formVersion: form().formVersion,
  scoringPolicyVersion: form().scoringPolicyVersion,
  formHash: command.formHash,
  status: "submitted" as const,
  calibrationStatus: "uncalibrated" as const,
  confidenceLevel: 0.95 as const,
  masteryEligible: false as const,
  overall: observed(1, 1),
  skills: SKILLS.map((skill) => ({
    skill,
    ...observed(skill === "vocabulary" ? 1 : 0, skill === "vocabulary" ? 1 : 0),
  })),
  submittedAt: NOW,
});

const lessonTransportStubs = (): Pick<
  LearningCommandTransport,
  | "sendLessonSession"
  | "sendObjectiveAttempt"
  | "sendLessonSessionSubmission"
  | "sendLessonSessionAbandonment"
  | "sendReviewGrade"
  | "sendOpenReaderSession"
  | "sendRecordReaderAttempt"
  | "sendSubmitReaderSession"
  | "sendAbandonReaderSession"
> => ({
  sendLessonSession: vi.fn(),
  sendObjectiveAttempt: vi.fn(),
  sendLessonSessionSubmission: vi.fn(),
  sendLessonSessionAbandonment: vi.fn(),
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

describe("assessment learning-command coordinator", () => {
  it("delivers open, exact attempts, and submission through dedicated methods", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:assessment-coordinator")
    ).ownerGeneration;
    const session = await enqueueAssessmentSessionCommand(
      sessionInput(ownerGeneration),
    );
    const calls: string[] = [];
    const transport: LearningCommandTransport = {
      ...lessonTransportStubs(),
      sendOpenAssessmentSession: vi.fn(async (command) => {
        calls.push("open");
        return response(201, await openReceipt(command));
      }),
      sendRecordAssessmentAttempt: vi.fn(async (command) => {
        calls.push(`attempt:${command.itemId}`);
        return response(201, attemptReceipt(command));
      }),
      sendSubmitAssessmentSession: vi.fn(async (command) => {
        calls.push("submit");
        return response(200, submissionReceipt(command));
      }),
      sendAbandonAssessmentSession: vi.fn(),
    };
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({ acknowledged: 1 });

    const attempts = await Promise.all([0, 1].map((position) =>
      enqueueAssessmentAttemptCommand(
        attemptInput(ownerGeneration, session.sessionAlias, position),
      )
    ));
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({ acknowledged: 2 });

    await enqueueAssessmentSessionSubmissionCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: session.sessionAlias,
      attemptCommandIds: attempts.map((attempt) => attempt.commandId),
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "assessment-submit:coordinator",
        installationId: "installation:coordinator",
        deviceId: "device:coordinator",
        contentVersion: CONTENT_VERSION,
      },
    });
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({ acknowledged: 1, retried: 0 });
    expect(calls).toEqual([
      "open",
      `attempt:${form().items[0]!.itemId}`,
      `attempt:${form().items[1]!.itemId}`,
      "submit",
    ]);
    expect((await listLearningCommandRecords(ownerGeneration)).every(
      (record) => record.status === "acknowledged",
    )).toBe(true);
  });

  it("retries a successful response that leaks item-level outcome data", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:assessment-coordinator")
    ).ownerGeneration;
    const session = await enqueueAssessmentSessionCommand(
      sessionInput(ownerGeneration),
    );
    const openTransport: LearningCommandTransport = {
      ...lessonTransportStubs(),
      sendOpenAssessmentSession: vi.fn(async (command) =>
        response(201, await openReceipt(command))),
      sendRecordAssessmentAttempt: vi.fn(),
      sendSubmitAssessmentSession: vi.fn(),
      sendAbandonAssessmentSession: vi.fn(),
    };
    await flushLearningCommandOutbox({
      ownerGeneration,
      transport: openTransport,
      now: () => new Date(NOW),
    });
    const attempt = await enqueueAssessmentAttemptCommand(
      attemptInput(ownerGeneration, session.sessionAlias, 0),
    );
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...openTransport,
        sendRecordAssessmentAttempt: vi.fn(async (command) => response(201, {
          ...attemptReceipt(command),
          outcome: "correct",
        })),
      },
      now: () => new Date(NOW),
    });
    expect(result).toMatchObject({ acknowledged: 0, retried: 1 });
    expect((await listLearningCommandRecords(ownerGeneration)).find(
      (record) => record.recordKey === attempt.recordKey,
    )).toMatchObject({ status: "pending", attemptCount: 1 });
  });

  it("does not persist a successful open response with a non-strict form", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:assessment-coordinator")
    ).ownerGeneration;
    const session = await enqueueAssessmentSessionCommand(
      sessionInput(ownerGeneration, "invalid-form"),
    );
    const result = await flushLearningCommandOutbox({
      ownerGeneration,
      transport: {
        ...lessonTransportStubs(),
        sendOpenAssessmentSession: vi.fn(async (command) => {
          const receipt = await openReceipt(command);
          receipt.form.items[0]!.options = ["é", " e\u0301 "];
          receipt.formHash = await hashAssessmentForm(receipt.form);
          return response(201, receipt);
        }),
        sendRecordAssessmentAttempt: vi.fn(),
        sendSubmitAssessmentSession: vi.fn(),
        sendAbandonAssessmentSession: vi.fn(),
      },
      now: () => new Date(NOW),
    });
    expect(result).toMatchObject({ acknowledged: 0, retried: 1 });
    expect((await listLearningCommandRecords(ownerGeneration)).find(
      (record) => record.recordKey === session.recordKey,
    )).toMatchObject({ status: "pending", attemptCount: 1, receipt: null });
  });

  it("delivers abandonment without falling through to lesson transport", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:assessment-coordinator")
    ).ownerGeneration;
    const session = await enqueueAssessmentSessionCommand(
      sessionInput(ownerGeneration, "abandon"),
    );
    const abandonmentSender = vi.fn(async (
      command: AbandonAssessmentSessionCommandV1,
    ) => response(200, {
      protocolVersion: 1,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      sessionId: command.sessionId,
      enrollmentId: "enrollment:coordinator",
      resetEpoch: command.resetEpoch,
      contentVersion: command.contentVersion,
      blueprintId: form().blueprintId,
      formVersion: form().formVersion,
      formHash: command.formHash,
      status: "abandoned",
      masteryEligible: false,
      abandonedAt: NOW,
    }));
    const transport: LearningCommandTransport = {
      ...lessonTransportStubs(),
      sendOpenAssessmentSession: vi.fn(async (command) =>
        response(201, await openReceipt(command))),
      sendRecordAssessmentAttempt: vi.fn(),
      sendSubmitAssessmentSession: vi.fn(),
      sendAbandonAssessmentSession: abandonmentSender,
    };
    await flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    });
    await enqueueAssessmentSessionAbandonmentCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: session.sessionAlias,
      dependencyCommandId: session.commandId,
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "assessment-abandon:coordinator",
        installationId: "installation:coordinator",
        deviceId: "device:coordinator",
        contentVersion: CONTENT_VERSION,
      },
    });
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({ acknowledged: 1 });
    expect(abandonmentSender).toHaveBeenCalledOnce();
    expect(transport.sendLessonSessionAbandonment).not.toHaveBeenCalled();
  });
});
