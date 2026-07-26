import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
} from "../data/curriculum";
import { hashLessonSessionForm } from "../learning/lessonSessionProtocol";
import { readValidCachedNormalizedLearningProjection } from "./learningProjectionClient";
import {
  persistProjectedLessonSessionAnchor,
  type QueuedProjectedLessonSessionAnchor,
} from "./learningCommandOutbox";
import type { OwnerGeneration } from "./indexedDb";

export type AdoptActiveLessonSessionFromCachedProjectionInput = {
  ownerGeneration: OwnerGeneration;
  resetEpoch: number;
  sessionId: string;
  installationId: string;
  deviceId: string;
  adoptedAt?: string;
};

export type AdoptedProjectedLessonSession = {
  anchor: QueuedProjectedLessonSessionAnchor;
  /** Stable non-open seed consumed by normalized lesson command builders. */
  commandSeed: string;
  sessionAlias: string;
};

export class ProjectedLessonSessionAdoptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectedLessonSessionAdoptionError";
  }
}

/**
 * Adopts only authority already persisted by the strict, owner-scoped
 * projection client. No caller-provided projection or synthetic open receipt
 * can cross this boundary.
 */
export async function adoptActiveLessonSessionFromCachedProjection(
  input: AdoptActiveLessonSessionFromCachedProjectionInput,
): Promise<AdoptedProjectedLessonSession> {
  if (
    input.sessionId.length < 1
    || input.sessionId.length > 160
    || input.installationId.length < 1
    || input.installationId.length > 160
    || input.deviceId.length < 1
    || input.deviceId.length > 160
  ) {
    throw new ProjectedLessonSessionAdoptionError(
      "Projected lesson-session adoption identifiers are invalid.",
    );
  }
  const cached = await readValidCachedNormalizedLearningProjection(
    input.ownerGeneration,
    input.resetEpoch,
  );
  if (!cached) {
    throw new ProjectedLessonSessionAdoptionError(
      "An exact owner-scoped learning projection is unavailable.",
    );
  }
  const projection = cached.value;
  if (
    cached.ownerKey !== input.ownerGeneration.ownerKey
    || cached.resetEpoch !== input.resetEpoch
    || projection.resetEpoch !== input.resetEpoch
    || projection.contentVersion !== CONTENT_VERSION
    || projection.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || projection.enrollment === null
    || projection.enrollment.contentVersion !== CONTENT_VERSION
    || projection.enrollment.manifestSha256
      !== CURRENT_CONTENT_MANIFEST_SHA256
    || (
      projection.enrollment.releaseState !== "beta"
      && projection.enrollment.releaseState !== "published"
    )
  ) {
    throw new ProjectedLessonSessionAdoptionError(
      "Projected lesson-session adoption scope is not authoritative.",
    );
  }
  const matches = projection.activeLessonSessions.filter(
    (session) => session.sessionId === input.sessionId,
  );
  if (matches.length !== 1) {
    throw new ProjectedLessonSessionAdoptionError(
      "The requested active lesson session is unavailable.",
    );
  }
  const session = matches[0];
  const releasedLesson = RELEASED_LESSONS.find(
    (lesson) => lesson.id === session.lessonId,
  );
  if (
    !releasedLesson
    || session.status !== "started"
    || session.enrollmentId !== projection.enrollment.enrollmentId
    || session.contentVersion !== CONTENT_VERSION
    || session.lessonVersion !== `${CONTENT_VERSION}:${session.lessonId}:1`
    || session.expectedEvidenceCount !== session.form.activities.length
    || await hashLessonSessionForm(session.form) !== session.formHash
  ) {
    throw new ProjectedLessonSessionAdoptionError(
      "The projected lesson-session form failed its current release fence.",
    );
  }
  const anchor = await persistProjectedLessonSessionAnchor({
    ownerGeneration: input.ownerGeneration,
    installationId: input.installationId,
    deviceId: input.deviceId,
    resetEpoch: input.resetEpoch,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    projectionCursor: projection.cursor,
    binding: {
      sessionId: session.sessionId,
      enrollmentId: session.enrollmentId,
      contentVersion: session.contentVersion,
      resetEpoch: projection.resetEpoch,
      lessonId: session.lessonId,
      lessonVersion: session.lessonVersion,
      expectedEvidenceCount: session.expectedEvidenceCount,
      form: session.form,
      formHash: session.formHash,
      status: session.status,
      startedAt: session.startedAt,
    },
    projectedAttempts: session.attempts,
    adoptedAt: input.adoptedAt,
  });
  return {
    anchor,
    commandSeed: anchor.command.adoptionKey,
    sessionAlias: anchor.sessionAlias,
  };
}
