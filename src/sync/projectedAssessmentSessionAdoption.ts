import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import { hashAssessmentForm } from "../assessment/assessmentSessionProtocol";
import type {
  ActiveAssessmentAttemptProjectionV2,
  ActiveAssessmentSessionProjectionV2,
} from "../learning/projectionProtocol";
import { readValidCachedNormalizedLearningProjectionV2 } from "./learningProjectionClient";
import {
  listLearningCommandRecords,
  persistProjectedAssessmentSessionAnchor,
  type LearningCommandOutboxRecord,
  type QueuedProjectedAssessmentSessionAnchor,
} from "./learningCommandOutbox";
import type { OwnerGeneration } from "./indexedDb";

export type AdoptActiveAssessmentSessionFromCachedProjectionInput = {
  ownerGeneration: OwnerGeneration;
  resetEpoch: number;
  sessionId: string;
  installationId: string;
  deviceId: string;
  adoptedAt?: string;
};

export type AdoptedProjectedAssessmentSession = {
  anchor: QueuedProjectedAssessmentSessionAnchor;
  /** Stable non-open seed consumed by normalized assessment command builders. */
  commandSeed: string;
  sessionAlias: string;
};

export class ProjectedAssessmentSessionAdoptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectedAssessmentSessionAdoptionError";
  }
}

const boundedIdentifier = (value: string) =>
  value.length > 0 && value.length <= 160;

const projectedAttemptsEqual = (
  left: ActiveAssessmentAttemptProjectionV2,
  right: ActiveAssessmentAttemptProjectionV2,
) =>
  left.attemptId === right.attemptId
  && left.position === right.position
  && left.itemId === right.itemId
  && left.itemVersion === right.itemVersion
  && left.skill === right.skill
  && left.measurementEligible === right.measurementEligible
  && left.masteryEligible === right.masteryEligible
  && left.status === right.status
  && left.recordedAt === right.recordedAt;

const localAttemptPositions = (
  anchor: QueuedProjectedAssessmentSessionAnchor,
  records: readonly LearningCommandOutboxRecord[],
) => {
  const positions = new Set<number>();
  for (const record of records) {
    if (
      record.kind !== "assessment-attempt"
      || record.dependencyRecordKey !== anchor.recordKey
    ) continue;
    const position = anchor.binding.form.items.findIndex((item) =>
      item.itemId === record.command.itemId
      && item.itemVersion === record.command.itemVersion
    );
    if (position >= 0) positions.add(position);
  }
  return positions;
};

const remoteProjectionAttempts = (
  anchor: QueuedProjectedAssessmentSessionAnchor | null,
  session: ActiveAssessmentSessionProjectionV2,
  records: readonly LearningCommandOutboxRecord[],
) => {
  if (!anchor) return session.attempts;
  const localPositions = localAttemptPositions(anchor, records);
  return session.attempts.filter((attempt) =>
    !localPositions.has(attempt.position)
  );
};

export type ProjectedAssessmentAnchorRefreshDecision =
  | "current"
  | "refresh"
  | "conflict";

/**
 * Compares the cached V2 authority with one local-only anchor. Attempts that
 * already have a child command on this device remain local receipt authority
 * and are not duplicated into projected coverage when the cursor advances.
 */
export function projectedAssessmentAnchorRefreshDecision(input: {
  anchor: QueuedProjectedAssessmentSessionAnchor;
  projectionCursor: number;
  session: ActiveAssessmentSessionProjectionV2;
  records: readonly LearningCommandOutboxRecord[];
}): ProjectedAssessmentAnchorRefreshDecision {
  const {
    anchor,
    projectionCursor,
    session,
    records,
  } = input;
  if (
    !Number.isSafeInteger(projectionCursor)
    || projectionCursor < anchor.command.projectionCursor
    || session.sessionId !== anchor.binding.sessionId
    || session.enrollmentId !== anchor.binding.enrollmentId
    || session.resetEpoch !== anchor.binding.resetEpoch
    || session.contentVersion !== anchor.binding.contentVersion
    || session.blueprintId !== anchor.binding.blueprintId
    || session.formVersion !== anchor.binding.formVersion
    || session.scoringPolicyVersion !== anchor.binding.scoringPolicyVersion
    || session.expectedItemCount !== anchor.binding.expectedItemCount
    || session.formHash !== anchor.binding.formHash
    || session.status !== anchor.binding.status
    || session.startedAt !== anchor.binding.startedAt
  ) return "conflict";

  const nextAttempts = remoteProjectionAttempts(anchor, session, records);
  const nextByAttemptId = new Map(
    nextAttempts.map((attempt) => [attempt.attemptId, attempt]),
  );
  if (
    nextByAttemptId.size !== nextAttempts.length
    || !anchor.projectedAttempts.every((attempt) => {
      const next = nextByAttemptId.get(attempt.attemptId);
      return next !== undefined && projectedAttemptsEqual(attempt, next);
    })
  ) return "conflict";

  const attemptsUnchanged =
    anchor.projectedAttempts.length === nextAttempts.length;
  if (projectionCursor === anchor.command.projectionCursor) {
    return attemptsUnchanged ? "current" : "conflict";
  }
  return "refresh";
}

/**
 * Adopts only answer-free assessment authority already persisted by the
 * strict, owner-scoped V2 projection client. Caller-provided projections and
 * synthetic open receipts cannot cross this boundary.
 */
export async function adoptActiveAssessmentSessionFromCachedProjection(
  input: AdoptActiveAssessmentSessionFromCachedProjectionInput,
): Promise<AdoptedProjectedAssessmentSession> {
  if (
    !boundedIdentifier(input.sessionId)
    || !boundedIdentifier(input.installationId)
    || !boundedIdentifier(input.deviceId)
  ) {
    throw new ProjectedAssessmentSessionAdoptionError(
      "Projected assessment-session adoption identifiers are invalid.",
    );
  }

  const cached = await readValidCachedNormalizedLearningProjectionV2(
    input.ownerGeneration,
    input.resetEpoch,
  );
  if (!cached) {
    throw new ProjectedAssessmentSessionAdoptionError(
      "An exact owner-scoped V2 learning projection is unavailable.",
    );
  }

  const projection = cached.value;
  const enrollment = projection.enrollment;
  if (
    cached.ownerKey !== input.ownerGeneration.ownerKey
    || cached.resetEpoch !== input.resetEpoch
    || projection.resetEpoch !== input.resetEpoch
    || projection.contentVersion !== CONTENT_VERSION
    || projection.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || enrollment === null
    || enrollment.contentVersion !== CONTENT_VERSION
    || enrollment.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || (
      enrollment.releaseState !== "beta"
      && enrollment.releaseState !== "published"
    )
  ) {
    throw new ProjectedAssessmentSessionAdoptionError(
      "Projected assessment-session adoption scope is not authoritative.",
    );
  }

  const session = projection.activeAssessmentSession;
  if (!session || session.sessionId !== input.sessionId) {
    throw new ProjectedAssessmentSessionAdoptionError(
      "The requested active assessment session is unavailable.",
    );
  }
  const {
    attempts,
    ...binding
  } = session;
  if (
    binding.status !== "started"
    || binding.enrollmentId !== enrollment.enrollmentId
    || binding.resetEpoch !== projection.resetEpoch
    || binding.contentVersion !== CONTENT_VERSION
    || binding.expectedItemCount !== binding.form.items.length
    || attempts.length > binding.expectedItemCount
    || await hashAssessmentForm(binding.form) !== binding.formHash
  ) {
    throw new ProjectedAssessmentSessionAdoptionError(
      "The projected assessment-session form failed its current release fence.",
    );
  }

  try {
    const records = await listLearningCommandRecords(input.ownerGeneration);
    const existingAnchors = records.filter(
      (record): record is QueuedProjectedAssessmentSessionAnchor =>
        record.kind === "projected-assessment-session-anchor"
        && record.binding.sessionId === binding.sessionId,
    );
    if (existingAnchors.length > 1) {
      throw new ProjectedAssessmentSessionAdoptionError(
        "The projected assessment session has ambiguous local authority.",
      );
    }
    const projectedAttempts = remoteProjectionAttempts(
      existingAnchors[0] ?? null,
      session,
      records,
    );
    const anchor = await persistProjectedAssessmentSessionAnchor({
      ownerGeneration: input.ownerGeneration,
      installationId: input.installationId,
      deviceId: input.deviceId,
      resetEpoch: input.resetEpoch,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      projectionCursor: projection.cursor,
      binding,
      projectedAttempts,
      adoptedAt: input.adoptedAt,
    });
    return {
      anchor,
      commandSeed: anchor.command.adoptionKey,
      sessionAlias: anchor.sessionAlias,
    };
  } catch (error) {
    if (
      error instanceof Error
      && error.name !== "ProjectedAssessmentSessionAdoptionError"
    ) {
      throw error;
    }
    throw new ProjectedAssessmentSessionAdoptionError(
      "The projected assessment session could not be adopted safely.",
    );
  }
}
