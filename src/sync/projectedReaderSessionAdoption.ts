import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import { CURRENT_AUTHORITATIVE_COURSE_ID } from "../learning/authoritativeProgress";
import type {
  ActiveReaderAttemptProjectionV3,
  ActiveReaderSessionProjectionV3,
} from "../learning/projectionProtocol";
import {
  hashReaderSessionForm,
  isExactReaderSessionFormV1,
  type ReaderSessionAuthorityBindingV1,
} from "../reader/readerSessionProtocol";
import {
  boundedIdentifier,
  normalizedTimestamp,
} from "../reader/protocolSupport";
import { canonicalStringify } from "./document";
import type { OwnerGeneration } from "./indexedDb";
import {
  listLearningCommandRecords,
  persistProjectedReaderSessionAnchor,
  type LearningCommandOutboxRecord,
  type QueuedProjectedReaderSessionAnchor,
} from "./learningCommandOutbox";
import { readValidCachedNormalizedLearningProjectionV3 } from "./learningProjectionClient";

export type AdoptActiveReaderSessionFromCachedProjectionInput = {
  ownerGeneration: OwnerGeneration;
  resetEpoch: number;
  sessionId: string;
  installationId: string;
  deviceId: string;
  adoptedAt?: string;
};

export type AdoptedProjectedReaderSession = {
  anchor: QueuedProjectedReaderSessionAnchor;
  /** Stable non-open seed consumed by normalized Reader command builders. */
  commandSeed: string;
  sessionAlias: string;
};

export class ProjectedReaderSessionAdoptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectedReaderSessionAdoptionError";
  }
}

const ACTIVE_READER_ATTEMPT_KEYS = new Set([
  "attemptId",
  "evidenceId",
  "sessionId",
  "resetEpoch",
  "contentVersion",
  "formHash",
  "position",
  "itemId",
  "itemVersion",
  "method",
  "skill",
  "script",
  "supportMode",
  "supportPolicyVersion",
  "answerExposure",
  "priorExposure",
  "masteryEligible",
  "outcome",
  "score",
  "verification",
  "status",
  "recordedAt",
]);

const projectedAttemptBindsExactly = (
  attempt: ActiveReaderAttemptProjectionV3,
  session: ReaderSessionAuthorityBindingV1,
) => {
  const item = session.form.items[attempt.position];
  const keys = Object.keys(attempt);
  return keys.length === ACTIVE_READER_ATTEMPT_KEYS.size
    && keys.every((key) => ACTIVE_READER_ATTEMPT_KEYS.has(key))
    && boundedIdentifier(attempt.attemptId, 160)
    && boundedIdentifier(attempt.evidenceId, 160)
    && attempt.sessionId === session.sessionId
    && attempt.resetEpoch === session.resetEpoch
    && attempt.contentVersion === session.contentVersion
    && attempt.formHash === session.formHash
    && Number.isSafeInteger(attempt.position)
    && attempt.position >= 0
    && item !== undefined
    && item.position === attempt.position
    && item.itemId === attempt.itemId
    && item.itemVersion === attempt.itemVersion
    && item.method === attempt.method
    && item.skill === attempt.skill
    && attempt.script === session.script
    && attempt.supportMode === session.supportMode
    && attempt.supportPolicyVersion === session.supportPolicyVersion
    && item.answerExposure === attempt.answerExposure
    && item.priorExposure === attempt.priorExposure
    && item.masteryEligible === attempt.masteryEligible
    && (
      (attempt.outcome === "correct" && attempt.score === 100)
      || (attempt.outcome === "incorrect" && attempt.score === 0)
    )
    && attempt.verification === "server-objective"
    && attempt.status === "recorded"
    && normalizedTimestamp(attempt.recordedAt) === attempt.recordedAt
    && Date.parse(attempt.recordedAt) >= Date.parse(session.startedAt);
};

const projectedAttemptSetBindsExactly = (
  attempts: readonly ActiveReaderAttemptProjectionV3[],
  session: ReaderSessionAuthorityBindingV1,
) => {
  if (
    attempts.length > session.expectedItemCount
    || !attempts.every((attempt) =>
      projectedAttemptBindsExactly(attempt, session)
    )
  ) return false;

  return new Set(attempts.map((attempt) => attempt.attemptId)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.evidenceId)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.position)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.itemId)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.itemVersion)).size
      === attempts.length;
};

const projectedAttemptsEqual = (
  left: ActiveReaderAttemptProjectionV3,
  right: ActiveReaderAttemptProjectionV3,
) => canonicalStringify(left) === canonicalStringify(right);

const readerBindingFromProjection = (
  session: ActiveReaderSessionProjectionV3,
): ReaderSessionAuthorityBindingV1 => {
  const {
    attempts: _attempts,
    ...binding
  } = session;
  return binding;
};

const localAttemptPositions = (
  anchor: QueuedProjectedReaderSessionAnchor,
  records: readonly LearningCommandOutboxRecord[],
) => {
  const positions = new Set<number>();
  for (const record of records) {
    if (
      record.kind !== "reader-attempt"
      || record.dependencyRecordKey !== anchor.recordKey
    ) continue;
    const item = anchor.binding.form.items[record.command.position];
    if (
      item
      && item.itemId === record.command.itemId
      && item.itemVersion === record.command.itemVersion
    ) {
      positions.add(record.command.position);
    }
  }
  return positions;
};

const remoteProjectionAttempts = (
  anchor: QueuedProjectedReaderSessionAnchor | null,
  session: ActiveReaderSessionProjectionV3,
  records: readonly LearningCommandOutboxRecord[],
) => {
  if (!anchor) return session.attempts;
  const localPositions = localAttemptPositions(anchor, records);
  return session.attempts.filter((attempt) =>
    !localPositions.has(attempt.position)
  );
};

export type ProjectedReaderAnchorRefreshDecision =
  | "current"
  | "refresh"
  | "conflict";

/**
 * Compares one cached V3 authority snapshot with its local-only anchor.
 * Attempts already represented by child commands remain under local receipt
 * authority and are not duplicated when a later projection echoes them.
 */
export function projectedReaderAnchorRefreshDecision(input: {
  anchor: QueuedProjectedReaderSessionAnchor;
  projectionCursor: number;
  session: ActiveReaderSessionProjectionV3;
  records: readonly LearningCommandOutboxRecord[];
}): ProjectedReaderAnchorRefreshDecision {
  const {
    anchor,
    projectionCursor,
    session,
    records,
  } = input;
  const nextBinding = readerBindingFromProjection(session);
  if (
    !Number.isSafeInteger(projectionCursor)
    || projectionCursor < anchor.command.projectionCursor
    || canonicalStringify(nextBinding)
      !== canonicalStringify(anchor.binding)
    || !projectedAttemptSetBindsExactly(session.attempts, nextBinding)
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
 * Adopts only answer-free Reader authority already persisted by the strict,
 * owner-scoped V3 projection client. The server projection repository binds
 * this form to the confidential item bank; this client boundary deliberately
 * neither imports that bank nor constructs a synthetic open receipt.
 */
export async function adoptActiveReaderSessionFromCachedProjection(
  input: AdoptActiveReaderSessionFromCachedProjectionInput,
): Promise<AdoptedProjectedReaderSession> {
  if (
    !boundedIdentifier(input.sessionId, 160)
    || !boundedIdentifier(input.installationId, 160)
    || !boundedIdentifier(input.deviceId, 160)
  ) {
    throw new ProjectedReaderSessionAdoptionError(
      "Projected Reader-session adoption identifiers are invalid.",
    );
  }

  const cached = await readValidCachedNormalizedLearningProjectionV3(
    input.ownerGeneration,
    input.resetEpoch,
  );
  if (!cached) {
    throw new ProjectedReaderSessionAdoptionError(
      "An exact owner-scoped V3 learning projection is unavailable.",
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
    || enrollment.courseId !== CURRENT_AUTHORITATIVE_COURSE_ID
    || enrollment.contentVersion !== CONTENT_VERSION
    || enrollment.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || (
      enrollment.releaseState !== "beta"
      && enrollment.releaseState !== "published"
    )
  ) {
    throw new ProjectedReaderSessionAdoptionError(
      "Projected Reader-session adoption scope is not authoritative.",
    );
  }

  const session = projection.activeReaderSession;
  if (!session || session.sessionId !== input.sessionId) {
    throw new ProjectedReaderSessionAdoptionError(
      "The requested active Reader session is unavailable.",
    );
  }
  const binding = readerBindingFromProjection(session);
  if (
    binding.status !== "started"
    || binding.enrollmentId !== enrollment.enrollmentId
    || binding.resetEpoch !== projection.resetEpoch
    || binding.contentVersion !== CONTENT_VERSION
    || binding.expectedItemCount !== binding.form.items.length
    || !isExactReaderSessionFormV1(
      binding.form,
      binding.expectedItemCount,
    )
    || binding.storyId !== binding.form.storyId
    || binding.storyVersion !== binding.form.storyVersion
    || binding.formVersion !== binding.form.formVersion
    || binding.formSchemaVersion !== binding.form.formSchemaVersion
    || binding.script !== binding.form.script
    || binding.supportMode !== binding.form.supportMode
    || binding.supportPolicyVersion !== binding.form.supportPolicyVersion
    || normalizedTimestamp(binding.startedAt) !== binding.startedAt
    || await hashReaderSessionForm(binding.form) !== binding.formHash
    || !projectedAttemptSetBindsExactly(session.attempts, binding)
  ) {
    throw new ProjectedReaderSessionAdoptionError(
      "The projected Reader-session form failed its current release fence.",
    );
  }

  const records = await listLearningCommandRecords(input.ownerGeneration);
  const existingAnchors = records.filter(
    (record): record is QueuedProjectedReaderSessionAnchor =>
      record.kind === "projected-reader-session-anchor"
      && record.binding.sessionId === binding.sessionId,
  );
  if (existingAnchors.length > 1) {
    throw new ProjectedReaderSessionAdoptionError(
      "The projected Reader session has ambiguous local authority.",
    );
  }
  const existingAnchor = existingAnchors[0] ?? null;
  if (
    existingAnchor
    && projectedReaderAnchorRefreshDecision({
      anchor: existingAnchor,
      projectionCursor: projection.cursor,
      session,
      records,
    }) === "conflict"
  ) {
    throw new ProjectedReaderSessionAdoptionError(
      "The projected Reader session changed non-monotonically.",
    );
  }

  const anchor = await persistProjectedReaderSessionAnchor({
    ownerGeneration: input.ownerGeneration,
    installationId: input.installationId,
    deviceId: input.deviceId,
    resetEpoch: input.resetEpoch,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    projectionCursor: projection.cursor,
    binding,
    projectedAttempts: remoteProjectionAttempts(
      existingAnchor,
      session,
      records,
    ),
    adoptedAt: input.adoptedAt,
  });
  return {
    anchor,
    commandSeed: anchor.command.adoptionKey,
    sessionAlias: anchor.sessionAlias,
  };
}
