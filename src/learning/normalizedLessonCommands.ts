import { CONTENT_VERSION } from "../data/curriculum";
import { sha256Hex } from "../sync/document";
import type { OwnerGeneration } from "../sync/indexedDb";
import type {
  EnqueueLessonSessionInput,
  EnqueueLessonSessionAbandonmentInput,
  EnqueueLessonSessionSubmissionInput,
  EnqueueObjectiveAttemptInput,
} from "../sync/learningCommandOutbox";
import type { Lesson } from "../types";
import type { AuthoritativeReleasedLessonProgressV1 } from "./authoritativeProgress";
import { ATTEMPT_PROTOCOL_VERSION } from "./attemptProtocol";
import {
  LESSON_SESSION_ABANDONMENT_PROTOCOL_VERSION,
} from "./lessonSessionAbandonmentProtocol";
import { LESSON_SESSION_PROTOCOL_VERSION } from "./lessonSessionProtocol";
import { LESSON_SESSION_SUBMISSION_PROTOCOL_VERSION } from "./lessonSessionSubmissionProtocol";
import {
  isExactNormalizedLessonEligibility,
  isExactNormalizedLessonRuntime,
  MAX_NORMALIZED_LESSON_ACTIVITIES,
  type NormalizedLessonRuntimeV1,
} from "./normalizedLessonRuntime";
import { isValidLearningResetEpoch } from "./resetEpoch";

export const NORMALIZED_LESSON_COMMAND_ID_SCHEMA_VERSION = 1 as const;

export type NormalizedLessonQueueEnvironment = {
  ownerGeneration: OwnerGeneration;
  resetEpoch: number;
  installationId: string;
  deviceId: string;
};

export type StableNormalizedLessonCommandIds = {
  schemaVersion: 1;
  sessionAlias: string;
  commandSeed: string;
  attemptCommandIds: string[];
  submitCommandId: string;
  abandonCommandId: string;
};

export type BuildNormalizedLessonOpenQueueInput = {
  lesson: Lesson;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  environment: NormalizedLessonQueueEnvironment;
  openCommandId: string;
  enqueuedAt?: string;
};

export type NormalizedLessonAttemptResponseInput = {
  position: number;
  selectedAnswer: string;
  usedHint: boolean;
  durationMs?: number;
  occurredAt: string;
};

const ATTEMPT_INPUT_KEYS = new Set([
  "position",
  "selectedAnswer",
  "usedHint",
  "durationMs",
  "occurredAt",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const normalizedTimestamp = (value: unknown) => {
  if (!boundedString(value, 40)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const validEnvironment = (environment: NormalizedLessonQueueEnvironment) =>
  boundedString(environment.ownerGeneration.ownerKey, 240)
  && Number.isSafeInteger(environment.ownerGeneration.generation)
  && environment.ownerGeneration.generation >= 1
  && isValidLearningResetEpoch(environment.resetEpoch)
  && boundedString(environment.installationId, 160)
  && boundedString(environment.deviceId, 160);

const assertQueueScope = async (
  runtime: NormalizedLessonRuntimeV1,
  environment: NormalizedLessonQueueEnvironment,
) => {
  if (!validEnvironment(environment)) {
    throw new Error("Normalized lesson queue environment is invalid.");
  }
  if (
    !await isExactNormalizedLessonRuntime(runtime)
    || runtime.resetEpoch !== environment.resetEpoch
  ) {
    throw new Error("Normalized lesson runtime is stale or invalid.");
  }
};

const stableSessionDigest = async (commandSeed: string) => {
  if (!boundedString(commandSeed, 200)) {
    throw new Error("Normalized lesson command seed is invalid.");
  }
  return sha256Hex({
    schemaVersion: NORMALIZED_LESSON_COMMAND_ID_SCHEMA_VERSION,
    scope: "normalized-lesson-session",
    // Retain the v1 canonical field name so existing local open sessions keep
    // the same derived identifiers after command seeds were generalized.
    openCommandId: commandSeed,
  });
};

/** Stable across reloads for either a real open id or a projected anchor. */
export async function deriveStableNormalizedLessonCommandIds(
  commandSeed: string,
  activityCount: number,
): Promise<StableNormalizedLessonCommandIds> {
  if (
    !Number.isSafeInteger(activityCount)
    || activityCount < 1
    || activityCount > MAX_NORMALIZED_LESSON_ACTIVITIES
  ) {
    throw new Error("Normalized lesson activity count is invalid.");
  }
  const digest = await stableSessionDigest(commandSeed);
  return {
    schemaVersion: NORMALIZED_LESSON_COMMAND_ID_SCHEMA_VERSION,
    sessionAlias: `lesson:${digest}`,
    commandSeed,
    attemptCommandIds: Array.from(
      { length: activityCount },
      (_value, position) => `lesson-attempt:${digest}:${position}`,
    ),
    submitCommandId: `lesson-submit:${digest}`,
    abandonCommandId: `lesson-abandon:${digest}`,
  };
}

export async function buildNormalizedLessonOpenQueueInput(
  input: BuildNormalizedLessonOpenQueueInput,
): Promise<EnqueueLessonSessionInput> {
  if (
    !validEnvironment(input.environment)
    || input.authoritativeProgress.resetEpoch !== input.environment.resetEpoch
    || !isExactNormalizedLessonEligibility(
      input.lesson,
      input.authoritativeProgress,
    )
  ) {
    throw new Error("Exact unlocked lesson progress is required before opening.");
  }
  const ids = await deriveStableNormalizedLessonCommandIds(
    input.openCommandId,
    1,
  );
  const enqueuedAt = input.enqueuedAt === undefined
    ? undefined
    : normalizedTimestamp(input.enqueuedAt);
  if (input.enqueuedAt !== undefined && !enqueuedAt) {
    throw new Error("Lesson open queue timestamp is invalid.");
  }
  return {
    ownerGeneration: input.environment.ownerGeneration,
    expectedResetEpoch: input.environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    command: {
      protocolVersion: LESSON_SESSION_PROTOCOL_VERSION,
      idempotencyKey: ids.commandSeed,
      installationId: input.environment.installationId,
      deviceId: input.environment.deviceId,
      contentVersion: CONTENT_VERSION,
      enrollmentId: input.authoritativeProgress.enrollmentId,
      lessonId: input.lesson.id,
    },
    ...(typeof enqueuedAt === "string" ? { enqueuedAt } : {}),
  };
}

export async function buildNormalizedLessonAttemptQueueInput(
  runtime: NormalizedLessonRuntimeV1,
  environment: NormalizedLessonQueueEnvironment,
  response: NormalizedLessonAttemptResponseInput,
): Promise<EnqueueObjectiveAttemptInput> {
  await assertQueueScope(runtime, environment);
  if (
    !isRecord(response)
    || !Object.keys(response).every((key) => ATTEMPT_INPUT_KEYS.has(key))
    || !Number.isSafeInteger(response.position)
    || response.position < 0
    || response.position >= runtime.activities.length
    || !boundedString(response.selectedAnswer, 2_000)
    || !response.selectedAnswer.trim()
    || typeof response.usedHint !== "boolean"
    || (
      response.durationMs !== undefined
      && (
        !Number.isSafeInteger(response.durationMs)
        || response.durationMs < 0
        || response.durationMs > 600_000
      )
    )
  ) {
    throw new Error("Normalized lesson attempt response is invalid.");
  }
  const occurredAt = normalizedTimestamp(response.occurredAt);
  if (!occurredAt) {
    throw new Error("Normalized lesson attempt timestamp is invalid.");
  }
  const activity = runtime.activities[response.position];
  if (
    activity.options.length > 0
    && !activity.options.includes(response.selectedAnswer)
  ) {
    throw new Error("Normalized lesson selection is not in the server form item.");
  }
  const ids = await deriveStableNormalizedLessonCommandIds(
    runtime.commandSeed,
    runtime.activities.length,
  );
  return {
    ownerGeneration: environment.ownerGeneration,
    expectedResetEpoch: environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    command: {
      protocolVersion: ATTEMPT_PROTOCOL_VERSION,
      idempotencyKey: ids.attemptCommandIds[response.position],
      installationId: environment.installationId,
      deviceId: environment.deviceId,
      contentVersion: CONTENT_VERSION,
      activityId: activity.activityId,
      activityVersion: activity.activityVersion,
      source: "lesson",
      method: activity.method,
      occurredAt,
      response: {
        kind: "answer",
        answer: response.selectedAnswer,
        usedHint: response.usedHint,
        ...(response.durationMs === undefined
          ? {}
          : { durationMs: response.durationMs }),
      },
    },
    enqueuedAt: occurredAt,
  };
}

export async function buildNormalizedLessonSubmissionQueueInput(
  runtime: NormalizedLessonRuntimeV1,
  environment: NormalizedLessonQueueEnvironment,
  enqueuedAt: string,
  localAttemptPositions?: readonly number[],
): Promise<EnqueueLessonSessionSubmissionInput> {
  await assertQueueScope(runtime, environment);
  const normalizedEnqueuedAt = normalizedTimestamp(enqueuedAt);
  if (!normalizedEnqueuedAt) {
    throw new Error("Lesson submission queue timestamp is invalid.");
  }
  const ids = await deriveStableNormalizedLessonCommandIds(
    runtime.commandSeed,
    runtime.activities.length,
  );
  const positions = localAttemptPositions === undefined
    ? runtime.activities.map((_activity, position) => position)
    : [...localAttemptPositions];
  if (
    new Set(positions).size !== positions.length
    || positions.some((position) =>
      !Number.isSafeInteger(position)
      || position < 0
      || position >= runtime.activities.length
    )
  ) {
    throw new Error("Lesson submission local attempt positions are invalid.");
  }
  return {
    ownerGeneration: environment.ownerGeneration,
    expectedResetEpoch: environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    attemptCommandIds: positions.map((position) =>
      ids.attemptCommandIds[position]
    ),
    command: {
      protocolVersion: LESSON_SESSION_SUBMISSION_PROTOCOL_VERSION,
      idempotencyKey: ids.submitCommandId,
      installationId: environment.installationId,
      deviceId: environment.deviceId,
      contentVersion: CONTENT_VERSION,
    },
    enqueuedAt: normalizedEnqueuedAt,
  };
}

/** The outbox resolves the server session id only from the open dependency. */
export async function buildNormalizedLessonAbandonQueueInput(
  runtime: NormalizedLessonRuntimeV1,
  environment: NormalizedLessonQueueEnvironment,
  enqueuedAt: string,
): Promise<EnqueueLessonSessionAbandonmentInput> {
  await assertQueueScope(runtime, environment);
  const normalizedEnqueuedAt = normalizedTimestamp(enqueuedAt);
  if (!normalizedEnqueuedAt) {
    throw new Error("Lesson abandonment queue timestamp is invalid.");
  }
  const ids = await deriveStableNormalizedLessonCommandIds(
    runtime.commandSeed,
    runtime.activities.length,
  );
  return {
    ownerGeneration: environment.ownerGeneration,
    expectedResetEpoch: environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    dependencyCommandId: ids.commandSeed,
    command: {
      protocolVersion: LESSON_SESSION_ABANDONMENT_PROTOCOL_VERSION,
      idempotencyKey: ids.abandonCommandId,
      installationId: environment.installationId,
      deviceId: environment.deviceId,
      contentVersion: CONTENT_VERSION,
    },
    enqueuedAt: normalizedEnqueuedAt,
  };
}
