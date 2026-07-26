import type {
  ActiveReaderAttemptProjectionV3,
} from "../learning/projectionProtocol";
import type {
  LearningCommandStatus,
  QueuedReaderAttemptCommand,
} from "../sync/learningCommandOutbox";
import type {
  ReaderSessionAuthorityBindingV1,
} from "./readerSessionProtocol";
import {
  readerAttemptReceiptMatchesSessionBinding,
  readerProjectedAttemptMatchesSessionBinding,
} from "./normalizedReaderUiAuthority";

export type ReaderCommandIdentitySet = {
  commandSeed: string;
  sessionAlias: string;
  attemptCommandIds: readonly string[];
};

export type ReaderCoverageLocalAttempt = Pick<
  QueuedReaderAttemptCommand,
  "commandId" | "sessionAlias" | "status" | "command" | "receipt"
> & {
  status: LearningCommandStatus;
};

export type ExactReaderCoverage =
  | {
      ok: true;
      complete: boolean;
      coveredPositions: number[];
      localAcknowledgedPositions: number[];
      pendingPositions: number[];
      outcomes: Array<{
        position: number;
        outcome: "correct" | "incorrect";
      }>;
    }
  | {
      ok: false;
      reason:
        | "command-identity-mismatch"
        | "projected-attempt-mismatch"
        | "local-attempt-mismatch"
        | "overlapping-attempt-authority"
        | "quarantined-local-attempt";
    };

/**
 * Reconstructs progress only from answer-free V3 projection attempts and
 * exact local server receipts. A pending command never counts as coverage,
 * and one position can have only one authority source.
 */
export function deriveExactReaderCoverage(input: {
  binding: ReaderSessionAuthorityBindingV1;
  commandSeed: string;
  commandIds: ReaderCommandIdentitySet;
  sessionAlias: string;
  projectedAttempts: readonly ActiveReaderAttemptProjectionV3[];
  localAttempts: readonly ReaderCoverageLocalAttempt[];
}): ExactReaderCoverage {
  const {
    binding,
    commandSeed,
    commandIds,
    sessionAlias,
    projectedAttempts,
    localAttempts,
  } = input;
  if (
    commandIds.commandSeed !== commandSeed
    || commandIds.sessionAlias !== sessionAlias
    || commandIds.attemptCommandIds.length !== binding.form.items.length
    || new Set(commandIds.attemptCommandIds).size
      !== commandIds.attemptCommandIds.length
  ) {
    return { ok: false, reason: "command-identity-mismatch" };
  }

  const covered = new Set<number>();
  const projectedAttemptIds = new Set<string>();
  const projectedEvidenceIds = new Set<string>();
  const outcomes = new Map<number, "correct" | "incorrect">();
  for (const attempt of projectedAttempts) {
    if (
      projectedAttemptIds.has(attempt.attemptId)
      || projectedEvidenceIds.has(attempt.evidenceId)
      || covered.has(attempt.position)
      || !readerProjectedAttemptMatchesSessionBinding(attempt, binding)
    ) {
      return { ok: false, reason: "projected-attempt-mismatch" };
    }
    projectedAttemptIds.add(attempt.attemptId);
    projectedEvidenceIds.add(attempt.evidenceId);
    covered.add(attempt.position);
    outcomes.set(attempt.position, attempt.outcome);
  }

  const localAcknowledgedPositions: number[] = [];
  const pendingPositions: number[] = [];
  const localPositions = new Set<number>();
  for (const attempt of localAttempts) {
    const position = commandIds.attemptCommandIds.indexOf(attempt.commandId);
    const item = binding.form.items[position];
    if (
      position < 0
      || !item
      || localPositions.has(position)
      || attempt.sessionAlias !== sessionAlias
      || attempt.command.idempotencyKey !== attempt.commandId
      || attempt.command.resetEpoch !== binding.resetEpoch
      || attempt.command.contentVersion !== binding.contentVersion
      || attempt.command.position !== position
      || attempt.command.itemId !== item.itemId
      || attempt.command.itemVersion !== item.itemVersion
      || !item.options.includes(attempt.command.selectedOption)
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
      if (!readerAttemptReceiptMatchesSessionBinding(
        attempt.receipt,
        binding,
        attempt.commandId,
        position,
      )) {
        return { ok: false, reason: "local-attempt-mismatch" };
      }
      covered.add(position);
      localAcknowledgedPositions.push(position);
      outcomes.set(position, attempt.receipt!.outcome);
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
      && coveredPositions.length === binding.form.items.length
      && binding.form.items.every((_item, position) => covered.has(position)),
    coveredPositions,
    localAcknowledgedPositions,
    pendingPositions,
    outcomes: [...outcomes.entries()]
      .sort(([left], [right]) => left - right)
      .map(([position, outcome]) => ({ position, outcome })),
  };
}
