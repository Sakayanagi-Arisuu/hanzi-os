import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION, RELEASED_STORIES } from "../data/curriculum";
import type { EnqueueObjectiveAttemptInput } from "../sync/learningCommandOutbox";
import { canonicalStringify } from "../sync/document";
import type { Story } from "../types";
import {
  CURRENT_AUTHORITATIVE_COURSE_ID,
  type AuthoritativeReleasedLessonProgressV1,
} from "./authoritativeProgress";
import { ATTEMPT_PROTOCOL_VERSION } from "./attemptProtocol";
import type { NormalizedLessonQueueEnvironment } from "./normalizedLessonCommands";

export type BuildNormalizedReaderAttemptInput = {
  story: Story;
  questionId: string;
  selectedAnswer: string;
  usedSupport: boolean;
  idempotencyKey: string;
  occurredAt: string;
  durationMs?: number;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  environment: NormalizedLessonQueueEnvironment;
};

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const normalizedTimestamp = (value: string) => {
  if (!boundedString(value, 40)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const exactReleasedStory = (story: Story) => {
  const current = RELEASED_STORIES.find((candidate) => candidate.id === story.id);
  return Boolean(
    current
    && current.contentVersion === CONTENT_VERSION
    && (current.releaseState === "beta" || current.releaseState === "published")
    && canonicalStringify(current) === canonicalStringify(story),
  );
};

/**
 * Builds an untrusted reader answer command. Correctness, explanation, score,
 * skill authority and the local answer key are intentionally not copied.
 */
export function buildNormalizedReaderAttemptQueueInput(
  input: BuildNormalizedReaderAttemptInput,
): EnqueueObjectiveAttemptInput {
  const occurredAt = normalizedTimestamp(input.occurredAt);
  const question = input.story.comprehension.find(
    (candidate) => candidate.id === input.questionId,
  );
  if (
    !exactReleasedStory(input.story)
    || !question
    || !boundedString(input.idempotencyKey, 200)
    || !boundedString(input.selectedAnswer, 2_000)
    || !input.selectedAnswer.trim()
    || !question.options.includes(input.selectedAnswer)
    || typeof input.usedSupport !== "boolean"
    || !occurredAt
    || (
      input.durationMs !== undefined
      && (
        !Number.isSafeInteger(input.durationMs)
        || input.durationMs < 0
        || input.durationMs > 600_000
      )
    )
    || input.authoritativeProgress.schemaVersion !== 1
    || input.authoritativeProgress.contentVersion !== CONTENT_VERSION
    || input.authoritativeProgress.courseId !== CURRENT_AUTHORITATIVE_COURSE_ID
    || !boundedString(input.authoritativeProgress.enrollmentId, 160)
    || input.authoritativeProgress.manifestSha256
      !== CURRENT_CONTENT_MANIFEST_SHA256
    || input.authoritativeProgress.resetEpoch !== input.environment.resetEpoch
    || !Number.isSafeInteger(input.environment.resetEpoch)
    || input.environment.resetEpoch < 0
    || input.environment.ownerGeneration.ownerKey.length < 1
    || input.environment.ownerGeneration.ownerKey.length > 240
    || !Number.isSafeInteger(input.environment.ownerGeneration.generation)
    || input.environment.ownerGeneration.generation < 1
    || !boundedString(input.environment.installationId, 160)
    || !boundedString(input.environment.deviceId, 160)
  ) {
    throw new Error("Exact released reader authority is required.");
  }

  return {
    ownerGeneration: input.environment.ownerGeneration,
    expectedResetEpoch: input.environment.resetEpoch,
    command: {
      protocolVersion: ATTEMPT_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.environment.installationId,
      deviceId: input.environment.deviceId,
      contentVersion: CONTENT_VERSION,
      activityId: `${input.story.id}:${question.id}`,
      activityVersion: `${input.story.contentVersion}:${question.id}:1`,
      source: "reader",
      method: "reading-comprehension",
      occurredAt,
      response: {
        kind: "answer",
        answer: input.selectedAnswer,
        usedHint: input.usedSupport,
        ...(input.durationMs === undefined
          ? {}
          : { durationMs: input.durationMs }),
      },
    },
    enqueuedAt: occurredAt,
  };
}
