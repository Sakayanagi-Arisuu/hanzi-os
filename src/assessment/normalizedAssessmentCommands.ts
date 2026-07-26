import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  CURRENT_AUTHORITATIVE_COURSE_ID,
  type AuthoritativeReleasedLessonProgressV1,
} from "../learning/authoritativeProgress";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import { sha256Hex } from "../sync/document";
import type { OwnerGeneration } from "../sync/indexedDb";
import type {
  EnqueueAssessmentAttemptInput,
  EnqueueAssessmentSessionAbandonmentInput,
  EnqueueAssessmentSessionInput,
  EnqueueAssessmentSessionSubmissionInput,
} from "../sync/learningCommandOutbox";
import { ASSESSMENT_ABANDONMENT_PROTOCOL_VERSION } from "./assessmentAbandonmentProtocol";
import { ASSESSMENT_ATTEMPT_PROTOCOL_VERSION } from "./assessmentAttemptProtocol";
import { ASSESSMENT_SESSION_PROTOCOL_VERSION } from "./assessmentSessionProtocol";
import { ASSESSMENT_SUBMISSION_PROTOCOL_VERSION } from "./assessmentSubmissionProtocol";
import {
  isExactNormalizedAssessmentRuntime,
  MAX_NORMALIZED_ASSESSMENT_ITEMS,
  type NormalizedAssessmentRuntimeV1,
} from "./normalizedAssessmentRuntime";

export const NORMALIZED_ASSESSMENT_COMMAND_ID_SCHEMA_VERSION = 1 as const;

export type NormalizedAssessmentQueueEnvironment = {
  ownerGeneration: OwnerGeneration;
  resetEpoch: number;
  installationId: string;
  deviceId: string;
};

export type StableNormalizedAssessmentCommandIds = {
  schemaVersion: 1;
  sessionAlias: string;
  commandSeed: string;
  attemptCommandIds: string[];
  submitCommandId: string;
  abandonCommandId: string;
};

export type BuildNormalizedAssessmentOpenQueueInput = {
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  environment: NormalizedAssessmentQueueEnvironment;
  openCommandId: string;
  enqueuedAt?: string;
};

export type NormalizedAssessmentAttemptResponseInput = {
  position: number;
  selectedAnswer: string;
  durationMs?: number;
  occurredAt: string;
};

const ATTEMPT_INPUT_KEYS = new Set([
  "position",
  "selectedAnswer",
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

const validEnvironment = (environment: NormalizedAssessmentQueueEnvironment) =>
  boundedString(environment.ownerGeneration.ownerKey, 240)
  && Number.isSafeInteger(environment.ownerGeneration.generation)
  && environment.ownerGeneration.generation >= 1
  && isValidLearningResetEpoch(environment.resetEpoch)
  && boundedString(environment.installationId, 160)
  && boundedString(environment.deviceId, 160);

const exactProgress = (
  progress: AuthoritativeReleasedLessonProgressV1,
  environment: NormalizedAssessmentQueueEnvironment,
) => progress.schemaVersion === 1
  && progress.courseId === CURRENT_AUTHORITATIVE_COURSE_ID
  && progress.contentVersion === CONTENT_VERSION
  && progress.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
  && progress.resetEpoch === environment.resetEpoch
  && boundedString(progress.enrollmentId, 160);

const assertQueueScope = async (
  runtime: NormalizedAssessmentRuntimeV1,
  environment: NormalizedAssessmentQueueEnvironment,
) => {
  if (!validEnvironment(environment)) {
    throw new Error("Normalized assessment queue environment is invalid.");
  }
  if (
    !await isExactNormalizedAssessmentRuntime(runtime)
    || runtime.resetEpoch !== environment.resetEpoch
  ) {
    throw new Error("Normalized assessment runtime is stale or invalid.");
  }
};

const stableSessionDigest = async (commandSeed: string) => {
  if (!boundedString(commandSeed, 200)) {
    throw new Error("Normalized assessment command seed is invalid.");
  }
  return sha256Hex({
    schemaVersion: NORMALIZED_ASSESSMENT_COMMAND_ID_SCHEMA_VERSION,
    scope: "normalized-assessment-session",
    commandSeed,
  });
};

export async function deriveStableNormalizedAssessmentCommandIds(
  commandSeed: string,
  itemCount: number,
): Promise<StableNormalizedAssessmentCommandIds> {
  if (
    !Number.isSafeInteger(itemCount)
    || itemCount < 1
    || itemCount > MAX_NORMALIZED_ASSESSMENT_ITEMS
  ) {
    throw new Error("Normalized assessment item count is invalid.");
  }
  const digest = await stableSessionDigest(commandSeed);
  return {
    schemaVersion: NORMALIZED_ASSESSMENT_COMMAND_ID_SCHEMA_VERSION,
    sessionAlias: `assessment:${digest}`,
    commandSeed,
    attemptCommandIds: Array.from(
      { length: itemCount },
      (_value, position) => `assessment-attempt:${digest}:${position}`,
    ),
    submitCommandId: `assessment-submit:${digest}`,
    abandonCommandId: `assessment-abandon:${digest}`,
  };
}

export async function buildNormalizedAssessmentOpenQueueInput(
  input: BuildNormalizedAssessmentOpenQueueInput,
): Promise<EnqueueAssessmentSessionInput> {
  if (
    !validEnvironment(input.environment)
    || !exactProgress(input.authoritativeProgress, input.environment)
  ) {
    throw new Error("Exact current enrollment authority is required before screening.");
  }
  const ids = await deriveStableNormalizedAssessmentCommandIds(
    input.openCommandId,
    1,
  );
  const enqueuedAt = input.enqueuedAt === undefined
    ? undefined
    : normalizedTimestamp(input.enqueuedAt);
  if (input.enqueuedAt !== undefined && !enqueuedAt) {
    throw new Error("Assessment open queue timestamp is invalid.");
  }
  return {
    ownerGeneration: input.environment.ownerGeneration,
    expectedResetEpoch: input.environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    command: {
      protocolVersion: ASSESSMENT_SESSION_PROTOCOL_VERSION,
      idempotencyKey: ids.commandSeed,
      installationId: input.environment.installationId,
      deviceId: input.environment.deviceId,
      contentVersion: CONTENT_VERSION,
      enrollmentId: input.authoritativeProgress.enrollmentId,
    },
    ...(typeof enqueuedAt === "string" ? { enqueuedAt } : {}),
  };
}

export async function buildNormalizedAssessmentAttemptQueueInput(
  runtime: NormalizedAssessmentRuntimeV1,
  environment: NormalizedAssessmentQueueEnvironment,
  response: NormalizedAssessmentAttemptResponseInput,
): Promise<EnqueueAssessmentAttemptInput> {
  await assertQueueScope(runtime, environment);
  if (
    !isRecord(response)
    || !Object.keys(response).every((key) => ATTEMPT_INPUT_KEYS.has(key))
    || !Number.isSafeInteger(response.position)
    || response.position < 0
    || response.position >= runtime.items.length
    || !boundedString(response.selectedAnswer, 2_000)
    || !response.selectedAnswer.trim()
    || (
      response.durationMs !== undefined
      && (
        !Number.isSafeInteger(response.durationMs)
        || response.durationMs < 0
        || response.durationMs > 600_000
      )
    )
  ) {
    throw new Error("Normalized assessment response is invalid.");
  }
  const occurredAt = normalizedTimestamp(response.occurredAt);
  if (!occurredAt) {
    throw new Error("Normalized assessment response timestamp is invalid.");
  }
  const item = runtime.items[response.position];
  if (!item.options.includes(response.selectedAnswer)) {
    throw new Error("Assessment selection is not in the server-issued form.");
  }
  const ids = await deriveStableNormalizedAssessmentCommandIds(
    runtime.commandSeed,
    runtime.items.length,
  );
  return {
    ownerGeneration: environment.ownerGeneration,
    expectedResetEpoch: environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    command: {
      protocolVersion: ASSESSMENT_ATTEMPT_PROTOCOL_VERSION,
      idempotencyKey: ids.attemptCommandIds[response.position],
      installationId: environment.installationId,
      deviceId: environment.deviceId,
      contentVersion: CONTENT_VERSION,
      itemId: item.itemId,
      itemVersion: item.itemVersion,
      occurredAt,
      response: {
        kind: "selection",
        answer: response.selectedAnswer,
        ...(response.durationMs === undefined
          ? {}
          : { durationMs: response.durationMs }),
      },
    },
    enqueuedAt: occurredAt,
  };
}

export async function buildNormalizedAssessmentSubmissionQueueInput(
  runtime: NormalizedAssessmentRuntimeV1,
  environment: NormalizedAssessmentQueueEnvironment,
  enqueuedAt: string,
  localAttemptPositions?: readonly number[],
): Promise<EnqueueAssessmentSessionSubmissionInput> {
  await assertQueueScope(runtime, environment);
  const normalizedEnqueuedAt = normalizedTimestamp(enqueuedAt);
  if (!normalizedEnqueuedAt) {
    throw new Error("Assessment submission queue timestamp is invalid.");
  }
  const ids = await deriveStableNormalizedAssessmentCommandIds(
    runtime.commandSeed,
    runtime.items.length,
  );
  const positions = localAttemptPositions === undefined
    ? runtime.items.map((_item, position) => position)
    : [...localAttemptPositions];
  if (
    new Set(positions).size !== positions.length
    || positions.some((position) =>
      !Number.isSafeInteger(position)
      || position < 0
      || position >= runtime.items.length
    )
  ) {
    throw new Error(
      "Assessment submission local attempt positions are invalid.",
    );
  }
  return {
    ownerGeneration: environment.ownerGeneration,
    expectedResetEpoch: environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    attemptCommandIds: positions.map((position) =>
      ids.attemptCommandIds[position]
    ),
    command: {
      protocolVersion: ASSESSMENT_SUBMISSION_PROTOCOL_VERSION,
      idempotencyKey: ids.submitCommandId,
      installationId: environment.installationId,
      deviceId: environment.deviceId,
      contentVersion: CONTENT_VERSION,
    },
    enqueuedAt: normalizedEnqueuedAt,
  };
}

export async function buildNormalizedAssessmentAbandonQueueInput(
  runtime: NormalizedAssessmentRuntimeV1,
  environment: NormalizedAssessmentQueueEnvironment,
  enqueuedAt: string,
): Promise<EnqueueAssessmentSessionAbandonmentInput> {
  await assertQueueScope(runtime, environment);
  const normalizedEnqueuedAt = normalizedTimestamp(enqueuedAt);
  if (!normalizedEnqueuedAt) {
    throw new Error("Assessment abandonment queue timestamp is invalid.");
  }
  const ids = await deriveStableNormalizedAssessmentCommandIds(
    runtime.commandSeed,
    runtime.items.length,
  );
  return {
    ownerGeneration: environment.ownerGeneration,
    expectedResetEpoch: environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    dependencyCommandId: ids.commandSeed,
    command: {
      protocolVersion: ASSESSMENT_ABANDONMENT_PROTOCOL_VERSION,
      idempotencyKey: ids.abandonCommandId,
      installationId: environment.installationId,
      deviceId: environment.deviceId,
      contentVersion: CONTENT_VERSION,
    },
    enqueuedAt: normalizedEnqueuedAt,
  };
}
