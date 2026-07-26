import type { ActiveAssessmentAttemptProjectionV2 } from "../learning/projectionProtocol";
import type {
  LearningCommandStatus,
  QueuedAssessmentAttemptCommand,
} from "../sync/learningCommandOutbox";
import type {
  StableNormalizedAssessmentCommandIds,
} from "./normalizedAssessmentCommands";
import type {
  AssessmentSessionAuthorityBindingV1,
} from "./assessmentSessionProtocol";
import type {
  NormalizedAssessmentRuntimeV1,
} from "./normalizedAssessmentRuntime";
import {
  assessmentAttemptReceiptMatchesSessionBinding,
  assessmentRuntimeMatchesSessionBinding,
} from "./normalizedAssessmentUiAuthority";

export type AssessmentCoverageLocalAttempt = Pick<
  QueuedAssessmentAttemptCommand,
  "commandId" | "sessionAlias" | "status" | "command" | "receipt"
> & {
  status: LearningCommandStatus;
};

export type ExactAssessmentCoverage =
  | {
      ok: true;
      complete: boolean;
      coveredPositions: number[];
      localAcknowledgedPositions: number[];
      pendingPositions: number[];
    }
  | {
      ok: false;
      reason:
        | "runtime-binding-mismatch"
        | "command-identity-mismatch"
        | "projected-attempt-mismatch"
        | "local-attempt-mismatch"
        | "overlapping-attempt-authority"
        | "quarantined-local-attempt";
    };

const exactTimestamp = (value: string) => {
  const parsed = new Date(value);
  return value.length > 0
    && value.length <= 40
    && !Number.isNaN(parsed.getTime())
    && parsed.toISOString() === value;
};

/**
 * Recomputes assessment coverage from answer-free projection evidence and
 * exact local receipts. No position may be owned by both sources, and pending
 * local commands never count as recorded coverage.
 */
export function deriveExactAssessmentCoverage(input: {
  runtime: NormalizedAssessmentRuntimeV1;
  binding: AssessmentSessionAuthorityBindingV1;
  commandIds: StableNormalizedAssessmentCommandIds;
  sessionAlias: string;
  projectedAttempts: readonly ActiveAssessmentAttemptProjectionV2[];
  localAttempts: readonly AssessmentCoverageLocalAttempt[];
}): ExactAssessmentCoverage {
  const {
    runtime,
    binding,
    commandIds,
    sessionAlias,
    projectedAttempts,
    localAttempts,
  } = input;
  if (!assessmentRuntimeMatchesSessionBinding(runtime, binding)) {
    return { ok: false, reason: "runtime-binding-mismatch" };
  }
  if (
    commandIds.commandSeed !== runtime.commandSeed
    || commandIds.sessionAlias !== sessionAlias
    || commandIds.attemptCommandIds.length !== runtime.items.length
    || new Set(commandIds.attemptCommandIds).size
      !== commandIds.attemptCommandIds.length
  ) {
    return { ok: false, reason: "command-identity-mismatch" };
  }

  const covered = new Set<number>();
  const projectedAttemptIds = new Set<string>();
  for (const attempt of projectedAttempts) {
    const item = runtime.items[attempt.position];
    if (
      !Number.isSafeInteger(attempt.position)
      || !item
      || item.position !== attempt.position
      || attempt.attemptId.length < 1
      || attempt.attemptId.length > 160
      || projectedAttemptIds.has(attempt.attemptId)
      || covered.has(attempt.position)
      || attempt.itemId !== item.itemId
      || attempt.itemVersion !== item.itemVersion
      || attempt.skill !== item.skill
      || attempt.measurementEligible !== item.measurementEligible
      || attempt.masteryEligible !== false
      || attempt.status !== "recorded"
      || !exactTimestamp(attempt.recordedAt)
    ) {
      return { ok: false, reason: "projected-attempt-mismatch" };
    }
    projectedAttemptIds.add(attempt.attemptId);
    covered.add(attempt.position);
  }

  const localAcknowledgedPositions: number[] = [];
  const pendingPositions: number[] = [];
  const localPositions = new Set<number>();
  for (const attempt of localAttempts) {
    const position = commandIds.attemptCommandIds.indexOf(attempt.commandId);
    const item = runtime.items[position];
    if (
      position < 0
      || !item
      || localPositions.has(position)
      || attempt.sessionAlias !== sessionAlias
      || attempt.command.idempotencyKey !== attempt.commandId
      || attempt.command.resetEpoch !== runtime.resetEpoch
      || attempt.command.contentVersion !== runtime.contentVersion
      || attempt.command.itemId !== item.itemId
      || attempt.command.itemVersion !== item.itemVersion
    ) {
      return { ok: false, reason: "local-attempt-mismatch" };
    }
    if (covered.has(position)) {
      return { ok: false, reason: "overlapping-attempt-authority" };
    }
    if (attempt.status === "quarantined") {
      return { ok: false, reason: "quarantined-local-attempt" };
    }
    if (attempt.status === "acknowledged") {
      if (!assessmentAttemptReceiptMatchesSessionBinding(
        attempt.receipt,
        binding,
        attempt.commandId,
        position,
      )) {
        return { ok: false, reason: "local-attempt-mismatch" };
      }
      covered.add(position);
      localAcknowledgedPositions.push(position);
    } else if (attempt.status === "pending") {
      if (attempt.receipt !== null) {
        return { ok: false, reason: "local-attempt-mismatch" };
      }
      pendingPositions.push(position);
    } else {
      return { ok: false, reason: "local-attempt-mismatch" };
    }
    localPositions.add(position);
  }

  const coveredPositions = [...covered].sort((left, right) => left - right);
  localAcknowledgedPositions.sort((left, right) => left - right);
  pendingPositions.sort((left, right) => left - right);
  return {
    ok: true,
    complete:
      pendingPositions.length === 0
      && coveredPositions.length === runtime.items.length
      && runtime.items.every((_item, position) => covered.has(position)),
    coveredPositions,
    localAcknowledgedPositions,
    pendingPositions,
  };
}
