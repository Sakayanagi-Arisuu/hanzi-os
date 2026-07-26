import { describe, expect, it } from "vitest";
import type { ActiveAssessmentAttemptProjectionV2 } from "../learning/projectionProtocol";
import type { StableNormalizedAssessmentCommandIds } from "./normalizedAssessmentCommands";
import type {
  AssessmentFormV1,
  AssessmentSessionAuthorityBindingV1,
} from "./assessmentSessionProtocol";
import type { NormalizedAssessmentRuntimeV1 } from "./normalizedAssessmentRuntime";
import {
  deriveExactAssessmentCoverage,
  type AssessmentCoverageLocalAttempt,
} from "./normalizedAssessmentUiCoverage";

const NOW = "2026-07-25T08:00:00.000Z";
const FORM_HASH = `sha256:${"a".repeat(64)}` as const;

const form: AssessmentFormV1 = {
  schemaVersion: 1,
  blueprintId: "assessment-blueprint:coverage",
  formVersion: "content:test:assessment-form:coverage",
  scoringPolicyVersion: "observed-wilson:test",
  items: [
    {
      position: 0,
      itemId: "assessment-item:coverage:0",
      itemVersion: "assessment-item:coverage:0:1",
      skill: "vocabulary",
      construct: "word-meaning-recognition",
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "Item zero",
      meta: "Vocabulary",
      options: ["one", "two"],
    },
    {
      position: 1,
      itemId: "assessment-item:coverage:1",
      itemVersion: "assessment-item:coverage:1:1",
      skill: "reading",
      construct: "character-recognition",
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "Item one",
      meta: "Reading",
      options: ["three", "four"],
    },
  ],
};

const binding: AssessmentSessionAuthorityBindingV1 = {
  sessionId: "assessment-session:coverage",
  enrollmentId: "enrollment:coverage",
  resetEpoch: 0,
  contentVersion: "content:test",
  blueprintId: form.blueprintId,
  formVersion: form.formVersion,
  scoringPolicyVersion: form.scoringPolicyVersion,
  expectedItemCount: form.items.length,
  form,
  formHash: FORM_HASH,
  status: "started",
  startedAt: NOW,
};

const runtime: NormalizedAssessmentRuntimeV1 = {
  schemaVersion: 1,
  contentVersion: binding.contentVersion,
  manifestSha256: `sha256:${"b".repeat(64)}`,
  resetEpoch: binding.resetEpoch,
  enrollmentId: binding.enrollmentId,
  commandSeed: "assessment-command-seed:coverage",
  sessionId: binding.sessionId,
  blueprintId: binding.blueprintId,
  formVersion: binding.formVersion,
  scoringPolicyVersion: binding.scoringPolicyVersion,
  formHash: binding.formHash,
  startedAt: binding.startedAt,
  items: form.items,
};

const commandIds: StableNormalizedAssessmentCommandIds = {
  schemaVersion: 1,
  sessionAlias: "assessment:coverage",
  commandSeed: runtime.commandSeed,
  attemptCommandIds: [
    "assessment-attempt:coverage:0",
    "assessment-attempt:coverage:1",
  ],
  submitCommandId: "assessment-submit:coverage",
  abandonCommandId: "assessment-abandon:coverage",
};

const projectedAttempt = (
  position: number,
): ActiveAssessmentAttemptProjectionV2 => {
  const item = form.items[position]!;
  return {
    attemptId: `server-attempt:coverage:${position}`,
    position,
    itemId: item.itemId,
    itemVersion: item.itemVersion,
    skill: item.skill,
    measurementEligible: item.measurementEligible,
    masteryEligible: false,
    status: "recorded",
    recordedAt: NOW,
  };
};

const localAttempt = (
  position: number,
  status: AssessmentCoverageLocalAttempt["status"] = "acknowledged",
): AssessmentCoverageLocalAttempt => {
  const item = form.items[position]!;
  const commandId = commandIds.attemptCommandIds[position]!;
  return {
    commandId,
    sessionAlias: commandIds.sessionAlias,
    status,
    command: {
      protocolVersion: 1,
      idempotencyKey: commandId,
      installationId: "installation:coverage",
      deviceId: "device:coverage",
      deviceSequence: position + 1,
      resetEpoch: binding.resetEpoch,
      contentVersion: binding.contentVersion,
      itemId: item.itemId,
      itemVersion: item.itemVersion,
      occurredAt: NOW,
      response: {
        kind: "selection",
        answer: item.options[0]!,
      },
    },
    receipt: status === "acknowledged"
      ? {
          protocolVersion: 1,
          idempotencyKey: commandId,
          duplicate: false,
          attemptId: `local-attempt:coverage:${position}`,
          sessionId: binding.sessionId,
          resetEpoch: binding.resetEpoch,
          contentVersion: binding.contentVersion,
          formHash: binding.formHash,
          position,
          itemId: item.itemId,
          itemVersion: item.itemVersion,
          skill: item.skill,
          measurementEligible: item.measurementEligible,
          masteryEligible: false,
          status: "recorded",
          recordedAt: NOW,
        }
      : null,
  };
};

const coverage = (
  projectedAttempts: ActiveAssessmentAttemptProjectionV2[],
  localAttempts: AssessmentCoverageLocalAttempt[],
) => deriveExactAssessmentCoverage({
  runtime,
  binding,
  commandIds,
  sessionAlias: commandIds.sessionAlias,
  projectedAttempts,
  localAttempts,
});

describe("normalized assessment UI coverage", () => {
  it("requires an exact union of projected attempts and local receipts", () => {
    expect(coverage(
      [projectedAttempt(0)],
      [localAttempt(1)],
    )).toEqual({
      ok: true,
      complete: true,
      coveredPositions: [0, 1],
      localAcknowledgedPositions: [1],
      pendingPositions: [],
    });
  });

  it("does not count a pending local attempt as recorded coverage", () => {
    expect(coverage(
      [projectedAttempt(0)],
      [localAttempt(1, "pending")],
    )).toEqual({
      ok: true,
      complete: false,
      coveredPositions: [0],
      localAcknowledgedPositions: [],
      pendingPositions: [1],
    });
  });

  it("rejects projected and local authority for the same form position", () => {
    expect(coverage(
      [projectedAttempt(0)],
      [localAttempt(0)],
    )).toEqual({
      ok: false,
      reason: "overlapping-attempt-authority",
    });
  });

  it("rejects a local receipt whose immutable item binding drifted", () => {
    const attempt = localAttempt(1);
    attempt.receipt = {
      ...attempt.receipt!,
      itemVersion: "assessment-item:coverage:1:changed",
    };
    expect(coverage([projectedAttempt(0)], [attempt])).toEqual({
      ok: false,
      reason: "local-attempt-mismatch",
    });
  });
});
