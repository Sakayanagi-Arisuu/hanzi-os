import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  parseAbandonReaderSessionCommand,
  parseAbandonReaderSessionReceipt,
  type AbandonReaderSessionCommandV1,
  type AbandonReaderSessionReceiptV1,
  type ReaderAbandonmentReason,
} from "./readerAbandonmentProtocol";
import {
  parseRecordReaderAttemptCommand,
  parseRecordReaderAttemptReceipt,
  readerAttemptBindsToForm,
  type RecordReaderAttemptCommandV1,
  type RecordReaderAttemptReceiptV1,
} from "./readerAttemptProtocol";
import {
  hashReaderSessionForm,
  type ReaderSessionFormV1,
} from "./readerSessionProtocol";
import {
  parseSubmitReaderSessionCommand,
  parseSubmitReaderSessionReceipt,
  readerSubmissionBindsToForm,
  type SubmitReaderSessionCommandV1,
  type SubmitReaderSessionReceiptV1,
} from "./readerSubmissionProtocol";

const form = (): ReaderSessionFormV1 => ({
  formSchemaVersion: 1,
  storyId: "reader-story-1",
  storyVersion: `${CONTENT_VERSION}:reader-story-1:1`,
  formVersion: `${CONTENT_VERSION}:reader-story-1:form:1`,
  script: "simplified",
  supportMode: "unassisted",
  supportPolicyVersion: "reader-support:1",
  items: [
    {
      position: 0,
      itemId: "reader-story-1:q1",
      itemVersion: `${CONTENT_VERSION}:reader-story-1:q1:1`,
      method: "reading-comprehension",
      skill: "reading",
      chineseStimulus: "小王是学生。",
      prompt: "小王是谁？",
      options: ["学生", "老师"],
      answerExposure: "server-confidential",
      priorExposure: false,
      masteryEligible: true,
    },
    {
      position: 1,
      itemId: "reader-story-1:q2",
      itemVersion: `${CONTENT_VERSION}:reader-story-1:q2:1`,
      method: "reading-comprehension",
      skill: "reading",
      chineseStimulus: "李老师很好。",
      prompt: "李老师怎么样？",
      options: ["很好", "不好"],
      answerExposure: "public-client",
      priorExposure: false,
      masteryEligible: false,
    },
  ],
});

const hash = () => hashReaderSessionForm(form());

const attemptCommand = async (): Promise<RecordReaderAttemptCommandV1> => {
  const issuedForm = form();
  const item = issuedForm.items[0];
  return {
    protocolVersion: 1,
    idempotencyKey: "reader-attempt:test:1",
    installationId: "installation-test",
    deviceId: "device-test",
    deviceSequence: 2,
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    sessionId: "reader-session-1",
    formHash: await hashReaderSessionForm(issuedForm),
    itemId: item.itemId,
    itemVersion: item.itemVersion,
    position: item.position,
    selectedOption: item.options[0],
    occurredAt: "2026-07-26T05:01:00.000Z",
    durationMs: 1_200,
  };
};

const attemptReceipt = async (): Promise<RecordReaderAttemptReceiptV1> => ({
  protocolVersion: 1,
  idempotencyKey: "reader-attempt:test:1",
  duplicate: false,
  attemptId: "reader-attempt-1",
  evidenceId: "reader-evidence-1",
  sessionId: "reader-session-1",
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  formHash: await hash(),
  position: 0,
  itemId: "reader-story-1:q1",
  itemVersion: `${CONTENT_VERSION}:reader-story-1:q1:1`,
  method: "reading-comprehension",
  skill: "reading",
  script: "simplified",
  supportMode: "unassisted",
  supportPolicyVersion: "reader-support:1",
  answerExposure: "server-confidential",
  priorExposure: false,
  masteryEligible: true,
  outcome: "correct",
  score: 100,
  verification: "server-objective",
  status: "recorded",
  recordedAt: "2026-07-26T05:01:01.000Z",
});

const submissionCommand =
  async (): Promise<SubmitReaderSessionCommandV1> => ({
    protocolVersion: 1,
    idempotencyKey: "reader-submit:test:1",
    installationId: "installation-test",
    deviceId: "device-test",
    deviceSequence: 4,
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    sessionId: "reader-session-1",
    formHash: await hash(),
    expectedItemCount: 2,
  });

const submissionReceipt =
  async (): Promise<SubmitReaderSessionReceiptV1> => ({
    protocolVersion: 1,
    idempotencyKey: "reader-submit:test:1",
    duplicate: false,
    sessionId: "reader-session-1",
    enrollmentId: "enrollment-test",
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    storyId: "reader-story-1",
    storyVersion: `${CONTENT_VERSION}:reader-story-1:1`,
    formVersion: `${CONTENT_VERSION}:reader-story-1:form:1`,
    formHash: await hash(),
    expectedItemCount: 2,
    attemptCount: 2,
    correctCount: 1,
    score: 50,
    method: "reading-comprehension",
    skill: "reading",
    script: "simplified",
    supportMode: "unassisted",
    supportPolicyVersion: "reader-support:1",
    results: [
      {
        position: 0,
        itemId: "reader-story-1:q1",
        itemVersion: `${CONTENT_VERSION}:reader-story-1:q1:1`,
        correct: true,
        answerExposure: "server-confidential",
        priorExposure: false,
        masteryEligible: true,
      },
      {
        position: 1,
        itemId: "reader-story-1:q2",
        itemVersion: `${CONTENT_VERSION}:reader-story-1:q2:1`,
        correct: false,
        answerExposure: "public-client",
        priorExposure: false,
        masteryEligible: false,
      },
    ],
    status: "submitted",
    submittedAt: "2026-07-26T05:03:00.000Z",
  });

const abandonmentCommand = async (
  reason: ReaderAbandonmentReason = "user-exit",
): Promise<AbandonReaderSessionCommandV1> => ({
  protocolVersion: 1,
  idempotencyKey: `reader-abandon:${reason}:1`,
  installationId: "installation-test",
  deviceId: "device-test",
  deviceSequence: 3,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  sessionId: "reader-session-1",
  formHash: await hash(),
  reason,
});

const abandonmentReceipt =
  async (): Promise<AbandonReaderSessionReceiptV1> => ({
    protocolVersion: 1,
    idempotencyKey: "reader-abandon:user-exit:1",
    duplicate: false,
    sessionId: "reader-session-1",
    enrollmentId: "enrollment-test",
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    storyId: "reader-story-1",
    storyVersion: `${CONTENT_VERSION}:reader-story-1:1`,
    formVersion: `${CONTENT_VERSION}:reader-story-1:form:1`,
    formHash: await hash(),
    script: "simplified",
    supportMode: "unassisted",
    supportPolicyVersion: "reader-support:1",
    reason: "user-exit",
    status: "abandoned",
    abandonedAt: "2026-07-26T05:02:00.000Z",
  });

describe("Reader Attempt V1", () => {
  it("accepts the exact selected-option command and rejects all client-authored outcome fields", async () => {
    const command = await attemptCommand();
    expect(parseRecordReaderAttemptCommand(command)).toEqual({
      ok: true,
      command,
    });

    for (const forbidden of [
      "score",
      "correctness",
      "outcome",
      "skill",
      "masteryEligible",
      "priorExposure",
      "supportUsed",
      "usedSupport",
      "usedHint",
    ]) {
      expect(parseRecordReaderAttemptCommand({
        ...command,
        [forbidden]: false,
      })).toMatchObject({ ok: false });
    }
  });

  it("bounds item bindings, timestamps and duration", async () => {
    const command = await attemptCommand();
    expect(parseRecordReaderAttemptCommand({
      ...command,
      position: -1,
    })).toMatchObject({ ok: false });
    expect(parseRecordReaderAttemptCommand({
      ...command,
      durationMs: 600_001,
    })).toMatchObject({ ok: false });
    expect(parseRecordReaderAttemptCommand({
      ...command,
      occurredAt: "not-a-timestamp",
    })).toMatchObject({ ok: false });
    expect(parseRecordReaderAttemptCommand({
      ...command,
      formHash: "sha256:not-a-hash",
    })).toMatchObject({ ok: false });
    expect(parseRecordReaderAttemptCommand({
      ...command,
      contentVersion: "stale-reader-content",
    })).toMatchObject({ ok: false });
  });

  it("binds position, item identity/version, selected option and canonical form hash", async () => {
    const command = await attemptCommand();
    expect(await readerAttemptBindsToForm(command, form())).toBe(true);
    expect(await readerAttemptBindsToForm({
      ...command,
      position: 1,
    }, form())).toBe(false);
    expect(await readerAttemptBindsToForm({
      ...command,
      itemId: "reader-story-1:q2",
    }, form())).toBe(false);
    expect(await readerAttemptBindsToForm({
      ...command,
      itemVersion: "substituted-version",
    }, form())).toBe(false);
    expect(await readerAttemptBindsToForm({
      ...command,
      selectedOption: "答案不在表单里",
    }, form())).toBe(false);
    expect(await readerAttemptBindsToForm({
      ...command,
      formHash: `sha256:${"f".repeat(64)}`,
    }, form())).toBe(false);

    const tamperedForm = form() as ReaderSessionFormV1 & {
      answerKey?: string;
    };
    tamperedForm.answerKey = "server-only";
    expect(await readerAttemptBindsToForm(
      command,
      tamperedForm,
    )).toBe(false);
  });

  it("accepts only server-objective receipts with bound outcome and score", async () => {
    const candidate = await attemptReceipt();
    expect(parseRecordReaderAttemptReceipt(candidate)).toEqual({
      ok: true,
      receipt: candidate,
    });
    expect(parseRecordReaderAttemptReceipt({
      ...candidate,
      score: 0,
    })).toMatchObject({ ok: false });
    expect(parseRecordReaderAttemptReceipt({
      ...candidate,
      outcome: "incorrect",
      score: 100,
    })).toMatchObject({ ok: false });
    expect(parseRecordReaderAttemptReceipt({
      ...candidate,
      verification: "client-claimed",
    })).toMatchObject({ ok: false });
    expect(parseRecordReaderAttemptReceipt({
      ...candidate,
      skill: "vocabulary",
    })).toMatchObject({ ok: false });
    expect(parseRecordReaderAttemptReceipt({
      ...candidate,
      priorExposure: true,
    })).toMatchObject({ ok: false });
    expect(parseRecordReaderAttemptReceipt({
      ...candidate,
      explanation: "unknown",
    })).toMatchObject({ ok: false });
  });
});

describe("Reader Submission V1", () => {
  it("binds submission to the exact form hash and expected item count", async () => {
    const command = await submissionCommand();
    expect(parseSubmitReaderSessionCommand(command)).toEqual({
      ok: true,
      command,
    });
    expect(await readerSubmissionBindsToForm(command, form())).toBe(true);
    expect(await readerSubmissionBindsToForm({
      ...command,
      expectedItemCount: 1,
    }, form())).toBe(false);
    expect(await readerSubmissionBindsToForm({
      ...command,
      formHash: `sha256:${"0".repeat(64)}`,
    }, form())).toBe(false);
  });

  it("rejects client-authored scoring/mastery fields and invalid expected counts", async () => {
    const command = await submissionCommand();
    for (const forbidden of [
      "correctCount",
      "score",
      "skill",
      "masteryEligible",
      "priorExposure",
      "supportUsed",
    ]) {
      expect(parseSubmitReaderSessionCommand({
        ...command,
        [forbidden]: 1,
      })).toMatchObject({ ok: false });
    }
    expect(parseSubmitReaderSessionCommand({
      ...command,
      expectedItemCount: 0,
    })).toMatchObject({ ok: false });
  });

  it("validates dense per-item results, policy, counts and score", async () => {
    const candidate = await submissionReceipt();
    expect(parseSubmitReaderSessionReceipt(candidate)).toEqual({
      ok: true,
      receipt: candidate,
    });

    expect(parseSubmitReaderSessionReceipt({
      ...candidate,
      correctCount: 2,
    })).toMatchObject({ ok: false });
    expect(parseSubmitReaderSessionReceipt({
      ...candidate,
      score: 51,
    })).toMatchObject({ ok: false });
    expect(parseSubmitReaderSessionReceipt({
      ...candidate,
      results: candidate.results.map((result, index) =>
        index === 1
          ? { ...result, masteryEligible: true }
          : result
      ),
    })).toMatchObject({ ok: false });
    expect(parseSubmitReaderSessionReceipt({
      ...candidate,
      results: candidate.results.map((result, index) =>
        index === 1 ? { ...result, position: 3 } : result
      ),
    })).toMatchObject({ ok: false });
    expect(parseSubmitReaderSessionReceipt({
      ...candidate,
      answerKey: "forbidden",
    })).toMatchObject({ ok: false });
  });
});

describe("Reader Abandonment V1", () => {
  it.each([
    "user-exit",
    "support-requested",
    "superseded",
  ] as const)("accepts the bounded %s reason", async (reason) => {
    const command = await abandonmentCommand(reason);
    expect(parseAbandonReaderSessionCommand(command)).toEqual({
      ok: true,
      command,
    });
  });

  it("rejects unsupported reasons and server-owned fields", async () => {
    const command = await abandonmentCommand();
    expect(parseAbandonReaderSessionCommand({
      ...command,
      reason: "reset-invalidated",
    })).toMatchObject({ ok: false });
    expect(parseAbandonReaderSessionCommand({
      ...command,
      masteryEligible: false,
    })).toMatchObject({ ok: false });
  });

  it("parses only the exact terminal receipt", async () => {
    const candidate = await abandonmentReceipt();
    expect(parseAbandonReaderSessionReceipt(candidate)).toEqual({
      ok: true,
      receipt: candidate,
    });
    expect(parseAbandonReaderSessionReceipt({
      ...candidate,
      reason: "reset-invalidated",
    })).toMatchObject({ ok: false });
    expect(parseAbandonReaderSessionReceipt({
      ...candidate,
      status: "submitted",
    })).toMatchObject({ ok: false });
    expect(parseAbandonReaderSessionReceipt({
      ...candidate,
      abandonedAt: "invalid",
    })).toMatchObject({ ok: false });
  });
});
