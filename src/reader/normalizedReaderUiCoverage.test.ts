import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import type {
  ActiveReaderAttemptProjectionV3,
} from "../learning/projectionProtocol";
import type {
  ReaderCoverageLocalAttempt,
} from "./normalizedReaderUiCoverage";
import {
  deriveExactReaderCoverage,
} from "./normalizedReaderUiCoverage";
import {
  readerAbandonmentReceiptMatchesSessionBinding,
  readerAttemptReceiptMatchesSessionBinding,
  readerProjectionMatchesSessionBinding,
  readerSessionAuthorityBindingIsExact,
  readerSubmissionReceiptMatchesSessionBinding,
} from "./normalizedReaderUiAuthority";
import {
  hashReaderSessionForm,
  type ReaderSessionAuthorityBindingV1,
  type ReaderSessionFormV1,
} from "./readerSessionProtocol";

const issuedForm = (): ReaderSessionFormV1 => ({
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
      answerExposure: "server-confidential",
      priorExposure: false,
      masteryEligible: true,
    },
  ],
});

const binding = async (): Promise<ReaderSessionAuthorityBindingV1> => {
  const form = issuedForm();
  return {
    sessionId: "reader-session-1",
    enrollmentId: "enrollment-1",
    resetEpoch: 3,
    contentVersion: CONTENT_VERSION,
    storyId: form.storyId,
    storyVersion: form.storyVersion,
    formVersion: form.formVersion,
    formSchemaVersion: form.formSchemaVersion,
    script: form.script,
    supportMode: form.supportMode,
    supportPolicyVersion: form.supportPolicyVersion,
    expectedItemCount: form.items.length,
    form,
    formHash: await hashReaderSessionForm(form),
    status: "started",
    startedAt: "2026-07-26T05:00:00.000Z",
  };
};

const projectedAttempt = (
  authority: ReaderSessionAuthorityBindingV1,
  position = 0,
): ActiveReaderAttemptProjectionV3 => {
  const item = authority.form.items[position]!;
  return {
    attemptId: `attempt-${position}`,
    evidenceId: `evidence-${position}`,
    sessionId: authority.sessionId,
    resetEpoch: authority.resetEpoch,
    contentVersion: authority.contentVersion,
    formHash: authority.formHash,
    position,
    itemId: item.itemId,
    itemVersion: item.itemVersion,
    method: item.method,
    skill: item.skill,
    script: authority.script,
    supportMode: authority.supportMode,
    supportPolicyVersion: authority.supportPolicyVersion,
    answerExposure: item.answerExposure,
    priorExposure: item.priorExposure,
    masteryEligible: item.masteryEligible,
    outcome: position === 0 ? "correct" : "incorrect",
    score: position === 0 ? 100 : 0,
    verification: "server-objective",
    status: "recorded",
    recordedAt: `2026-07-26T05:01:0${position}.000Z`,
  };
};

const localAttempt = (
  authority: ReaderSessionAuthorityBindingV1,
  position: number,
  status: "pending" | "acknowledged" | "quarantined" = "acknowledged",
): ReaderCoverageLocalAttempt => {
  const item = authority.form.items[position]!;
  const commandId = `reader-attempt:seed:${position}`;
  return {
    commandId,
    sessionAlias: "reader:seed",
    status,
    command: {
      protocolVersion: 1,
      idempotencyKey: commandId,
      installationId: "installation-1",
      deviceId: "device-1",
      deviceSequence: position + 1,
      resetEpoch: authority.resetEpoch,
      contentVersion: authority.contentVersion,
      itemId: item.itemId,
      itemVersion: item.itemVersion,
      position,
      selectedOption: item.options[0]!,
      occurredAt: "2026-07-26T05:01:00.000Z",
    },
    receipt: status === "acknowledged"
      ? {
          protocolVersion: 1,
          idempotencyKey: commandId,
          duplicate: false,
          ...projectedAttempt(authority, position),
        }
      : null,
  };
};

describe("Reader UI authority", () => {
  it("accepts only exact answer-free binding and projection authority", async () => {
    const authority = await binding();
    const session = {
      ...authority,
      attempts: [projectedAttempt(authority)],
    };
    expect(await readerSessionAuthorityBindingIsExact(authority)).toBe(true);
    expect(readerProjectionMatchesSessionBinding(session, authority)).toBe(true);
    expect(readerProjectionMatchesSessionBinding({
      ...session,
      form: {
        ...session.form,
        items: session.form.items.map((item, position) =>
          position === 0 ? { ...item, prompt: "Tampered prompt" } : item
        ),
      },
    }, authority)).toBe(false);
  });

  it("binds attempt, submission and abandonment receipts to one session", async () => {
    const authority = await binding();
    const attempt = localAttempt(authority, 0);
    expect(readerAttemptReceiptMatchesSessionBinding(
      attempt.receipt,
      authority,
      attempt.commandId,
      0,
    )).toBe(true);
    expect(readerAttemptReceiptMatchesSessionBinding(
      { ...attempt.receipt, supportMode: "assisted" },
      authority,
      attempt.commandId,
      0,
    )).toBe(false);

    const submission = {
      protocolVersion: 1,
      idempotencyKey: "reader-submit:seed",
      duplicate: false,
      sessionId: authority.sessionId,
      enrollmentId: authority.enrollmentId,
      resetEpoch: authority.resetEpoch,
      contentVersion: authority.contentVersion,
      storyId: authority.storyId,
      storyVersion: authority.storyVersion,
      formVersion: authority.formVersion,
      formHash: authority.formHash,
      expectedItemCount: 2,
      attemptCount: 2,
      correctCount: 1,
      score: 50,
      method: "reading-comprehension",
      skill: "reading",
      script: authority.script,
      supportMode: authority.supportMode,
      supportPolicyVersion: authority.supportPolicyVersion,
      results: authority.form.items.map((item, position) => ({
        position,
        itemId: item.itemId,
        itemVersion: item.itemVersion,
        correct: position === 0,
        answerExposure: item.answerExposure,
        priorExposure: item.priorExposure,
        masteryEligible: item.masteryEligible,
      })),
      status: "submitted",
      submittedAt: "2026-07-26T05:03:00.000Z",
    };
    expect(readerSubmissionReceiptMatchesSessionBinding(
      submission,
      authority,
      submission.idempotencyKey,
    )).toBe(true);
    expect(readerSubmissionReceiptMatchesSessionBinding(
      {
        ...submission,
        results: submission.results.map((result, position) =>
          position === 0
            ? { ...result, masteryEligible: false }
            : result
        ),
      },
      authority,
      submission.idempotencyKey,
    )).toBe(false);

    const abandonment = {
      protocolVersion: 1,
      idempotencyKey: "reader-abandon:seed",
      duplicate: false,
      sessionId: authority.sessionId,
      enrollmentId: authority.enrollmentId,
      resetEpoch: authority.resetEpoch,
      contentVersion: authority.contentVersion,
      storyId: authority.storyId,
      storyVersion: authority.storyVersion,
      formVersion: authority.formVersion,
      formHash: authority.formHash,
      script: authority.script,
      supportMode: authority.supportMode,
      supportPolicyVersion: authority.supportPolicyVersion,
      reason: "support-requested",
      status: "abandoned",
      abandonedAt: "2026-07-26T05:02:00.000Z",
    };
    expect(readerAbandonmentReceiptMatchesSessionBinding(
      abandonment,
      authority,
      abandonment.idempotencyKey,
      "support-requested",
    )).toBe(true);
    expect(readerAbandonmentReceiptMatchesSessionBinding(
      abandonment,
      authority,
      abandonment.idempotencyKey,
      "user-exit",
    )).toBe(false);
  });
});

describe("Reader UI coverage", () => {
  it("combines projected and acknowledged local positions exactly once", async () => {
    const authority = await binding();
    const coverage = deriveExactReaderCoverage({
      binding: authority,
      commandSeed: "seed",
      commandIds: {
        commandSeed: "seed",
        sessionAlias: "reader:seed",
        attemptCommandIds: [
          "reader-attempt:seed:0",
          "reader-attempt:seed:1",
        ],
      },
      sessionAlias: "reader:seed",
      projectedAttempts: [projectedAttempt(authority, 0)],
      localAttempts: [localAttempt(authority, 1)],
    });
    expect(coverage).toEqual({
      ok: true,
      complete: true,
      coveredPositions: [0, 1],
      localAcknowledgedPositions: [1],
      pendingPositions: [],
      outcomes: [
        { position: 0, outcome: "correct" },
        { position: 1, outcome: "incorrect" },
      ],
    });
  });

  it("does not count pending attempts and rejects overlap or quarantine", async () => {
    const authority = await binding();
    const base = {
      binding: authority,
      commandSeed: "seed",
      commandIds: {
        commandSeed: "seed",
        sessionAlias: "reader:seed",
        attemptCommandIds: [
          "reader-attempt:seed:0",
          "reader-attempt:seed:1",
        ],
      },
      sessionAlias: "reader:seed",
    };
    expect(deriveExactReaderCoverage({
      ...base,
      projectedAttempts: [],
      localAttempts: [localAttempt(authority, 0, "pending")],
    })).toMatchObject({
      ok: true,
      complete: false,
      coveredPositions: [],
      pendingPositions: [0],
    });
    expect(deriveExactReaderCoverage({
      ...base,
      projectedAttempts: [projectedAttempt(authority, 0)],
      localAttempts: [localAttempt(authority, 0)],
    })).toEqual({
      ok: false,
      reason: "overlapping-attempt-authority",
    });
    expect(deriveExactReaderCoverage({
      ...base,
      projectedAttempts: [],
      localAttempts: [localAttempt(authority, 0, "quarantined")],
    })).toEqual({
      ok: false,
      reason: "quarantined-local-attempt",
    });
  });
});
