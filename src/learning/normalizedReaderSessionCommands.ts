import {
  CURRENT_CONTENT_MANIFEST_SHA256,
  CURRENT_CONTENT_VERSION,
} from "../content/currentContentIdentity";
import {
  READER_ABANDONMENT_PROTOCOL_VERSION,
  type ReaderAbandonmentReason,
} from "../reader/readerAbandonmentProtocol";
import { READER_ATTEMPT_PROTOCOL_VERSION } from "../reader/readerAttemptProtocol";
import {
  hashReaderSessionForm,
  isExactReaderSessionFormV1,
  READER_SESSION_PROTOCOL_VERSION,
  type ReaderSessionAuthorityBindingV1,
} from "../reader/readerSessionProtocol";
import { READER_SUBMISSION_PROTOCOL_VERSION } from "../reader/readerSubmissionProtocol";
import {
  MAX_READER_FORM_ITEMS,
  type ReaderScript,
  type ReaderSupportMode,
} from "../reader/protocolSupport";
import { sha256Hex } from "../sync/canonicalHash";
import type {
  EnqueueReaderAttemptInput,
  EnqueueReaderSessionAbandonmentInput,
  EnqueueReaderSessionInput,
  EnqueueReaderSessionSubmissionInput,
} from "../sync/learningCommandOutbox";
import type { AuthoritativeReleasedLessonProgressV1 } from "./authoritativeProgress";
import type { NormalizedLessonQueueEnvironment } from "./normalizedLessonCommands";
import { isValidLearningResetEpoch } from "./resetEpoch";

export const NORMALIZED_READER_COMMAND_ID_SCHEMA_VERSION = 1 as const;

const CURRENT_NORMALIZED_READER_COURSE_ID = "hanzi-os-core";

export type StableNormalizedReaderCommandIds = {
  schemaVersion: 1;
  sessionAlias: string;
  commandSeed: string;
  attemptCommandIds: string[];
  submitCommandId: string;
  abandonCommandId: string;
};

export type NormalizedReaderSessionQueueContextV1 = {
  schemaVersion: 1;
  commandSeed: string;
  binding: ReaderSessionAuthorityBindingV1;
};

export type BuildNormalizedReaderSessionOpenQueueInput = {
  storyId: string;
  script: ReaderScript;
  supportMode: ReaderSupportMode;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  environment: NormalizedLessonQueueEnvironment;
  openCommandId: string;
  /** A prior same-story support-request abandonment that must finish first. */
  supportDowngradeDependencyCommandId?: string;
  enqueuedAt?: string;
};

export type NormalizedReaderSessionAttemptResponseInput = {
  position: number;
  selectedOption: string;
  occurredAt: string;
  durationMs?: number;
};

const READER_ATTEMPT_INPUT_KEYS = new Set([
  "position",
  "selectedOption",
  "occurredAt",
  "durationMs",
]);

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const normalizedTimestamp = (value: string) => {
  if (!boundedString(value, 40)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const validReaderEnvironment = (
  environment: NormalizedLessonQueueEnvironment,
) =>
  boundedString(environment.ownerGeneration.ownerKey, 240)
  && Number.isSafeInteger(environment.ownerGeneration.generation)
  && environment.ownerGeneration.generation >= 1
  && isValidLearningResetEpoch(environment.resetEpoch)
  && boundedString(environment.installationId, 160)
  && boundedString(environment.deviceId, 160);

const exactReaderProgress = (
  progress: AuthoritativeReleasedLessonProgressV1,
  environment: NormalizedLessonQueueEnvironment,
) =>
  progress.schemaVersion === 1
  && progress.courseId === CURRENT_NORMALIZED_READER_COURSE_ID
  && progress.contentVersion === CURRENT_CONTENT_VERSION
  && progress.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
  && progress.resetEpoch === environment.resetEpoch
  && boundedString(progress.enrollmentId, 160);

const stableReaderSessionDigest = async (commandSeed: string) => {
  if (!boundedString(commandSeed, 200)) {
    throw new Error("Normalized Reader command seed is invalid.");
  }
  return sha256Hex({
    schemaVersion: NORMALIZED_READER_COMMAND_ID_SCHEMA_VERSION,
    scope: "normalized-reader-session",
    commandSeed,
  });
};

export async function deriveStableNormalizedReaderCommandIds(
  commandSeed: string,
  itemCount: number,
): Promise<StableNormalizedReaderCommandIds> {
  if (
    !Number.isSafeInteger(itemCount)
    || itemCount < 1
    || itemCount > MAX_READER_FORM_ITEMS
  ) {
    throw new Error("Normalized Reader item count is invalid.");
  }
  const digest = await stableReaderSessionDigest(commandSeed);
  return {
    schemaVersion: NORMALIZED_READER_COMMAND_ID_SCHEMA_VERSION,
    sessionAlias: `reader:${digest}`,
    commandSeed,
    attemptCommandIds: Array.from(
      { length: itemCount },
      (_value, position) => `reader-attempt:${digest}:${position}`,
    ),
    submitCommandId: `reader-submit:${digest}`,
    abandonCommandId: `reader-abandon:${digest}`,
  };
}

const assertReaderSessionQueueContext = async (
  context: NormalizedReaderSessionQueueContextV1,
  environment: NormalizedLessonQueueEnvironment,
) => {
  const { binding } = context;
  if (
    !validReaderEnvironment(environment)
    || context.schemaVersion !== 1
    || !boundedString(context.commandSeed, 200)
    || !boundedString(binding.sessionId, 160)
    || !boundedString(binding.enrollmentId, 160)
    || binding.resetEpoch !== environment.resetEpoch
    || binding.contentVersion !== CURRENT_CONTENT_VERSION
    || binding.status !== "started"
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
    || binding.formHash !== await hashReaderSessionForm(binding.form)
  ) {
    throw new Error(
      "Exact answer-free Reader session authority is required.",
    );
  }
};

export async function buildNormalizedReaderSessionOpenQueueInput(
  input: BuildNormalizedReaderSessionOpenQueueInput,
): Promise<EnqueueReaderSessionInput> {
  if (
    !validReaderEnvironment(input.environment)
    || !exactReaderProgress(
      input.authoritativeProgress,
      input.environment,
    )
    || !boundedString(input.storyId, 160)
    || (
      input.script !== "simplified"
      && input.script !== "traditional"
    )
    || (
      input.supportMode !== "assisted"
      && input.supportMode !== "unassisted"
    )
    || (
      input.supportDowngradeDependencyCommandId !== undefined
      && (
        input.supportMode !== "assisted"
        || !boundedString(
          input.supportDowngradeDependencyCommandId,
          200,
        )
      )
    )
  ) {
    throw new Error(
      "Exact current enrollment authority is required before Reader open.",
    );
  }
  const ids = await deriveStableNormalizedReaderCommandIds(
    input.openCommandId,
    1,
  );
  const enqueuedAt = input.enqueuedAt === undefined
    ? undefined
    : normalizedTimestamp(input.enqueuedAt);
  if (input.enqueuedAt !== undefined && !enqueuedAt) {
    throw new Error("Reader open queue timestamp is invalid.");
  }
  return {
    ownerGeneration: input.environment.ownerGeneration,
    expectedResetEpoch: input.environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    ...(input.supportDowngradeDependencyCommandId === undefined
      ? {}
      : {
          supportDowngradeDependencyCommandId:
            input.supportDowngradeDependencyCommandId,
        }),
    command: {
      protocolVersion: READER_SESSION_PROTOCOL_VERSION,
      idempotencyKey: ids.commandSeed,
      installationId: input.environment.installationId,
      deviceId: input.environment.deviceId,
      contentVersion: CURRENT_CONTENT_VERSION,
      enrollmentId: input.authoritativeProgress.enrollmentId,
      storyId: input.storyId,
      script: input.script,
      supportMode: input.supportMode,
    },
    ...(typeof enqueuedAt === "string" ? { enqueuedAt } : {}),
  };
}

export async function buildNormalizedReaderSessionAttemptQueueInput(
  context: NormalizedReaderSessionQueueContextV1,
  environment: NormalizedLessonQueueEnvironment,
  response: NormalizedReaderSessionAttemptResponseInput,
): Promise<EnqueueReaderAttemptInput> {
  await assertReaderSessionQueueContext(context, environment);
  if (
    !response
    || typeof response !== "object"
    || Array.isArray(response)
    || !Object.keys(response).every((key) =>
      READER_ATTEMPT_INPUT_KEYS.has(key)
    )
    || !Number.isSafeInteger(response.position)
    || response.position < 0
    || response.position >= context.binding.form.items.length
    || !boundedString(response.selectedOption, 2_000)
    || !response.selectedOption.trim()
    || (
      response.durationMs !== undefined
      && (
        !Number.isSafeInteger(response.durationMs)
        || response.durationMs < 0
        || response.durationMs > 600_000
      )
    )
  ) {
    throw new Error("Normalized Reader response is invalid.");
  }
  const occurredAt = normalizedTimestamp(response.occurredAt);
  if (!occurredAt) {
    throw new Error("Normalized Reader response timestamp is invalid.");
  }
  const item = context.binding.form.items[response.position];
  if (!item.options.includes(response.selectedOption)) {
    throw new Error("Reader selection is not in the server-issued form.");
  }
  const ids = await deriveStableNormalizedReaderCommandIds(
    context.commandSeed,
    context.binding.form.items.length,
  );
  return {
    ownerGeneration: environment.ownerGeneration,
    expectedResetEpoch: environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    command: {
      protocolVersion: READER_ATTEMPT_PROTOCOL_VERSION,
      idempotencyKey: ids.attemptCommandIds[response.position],
      installationId: environment.installationId,
      deviceId: environment.deviceId,
      contentVersion: CURRENT_CONTENT_VERSION,
      itemId: item.itemId,
      itemVersion: item.itemVersion,
      position: item.position,
      selectedOption: response.selectedOption,
      occurredAt,
      ...(response.durationMs === undefined
        ? {}
        : { durationMs: response.durationMs }),
    },
    enqueuedAt: occurredAt,
  };
}

export async function buildNormalizedReaderSessionSubmissionQueueInput(
  context: NormalizedReaderSessionQueueContextV1,
  environment: NormalizedLessonQueueEnvironment,
  enqueuedAt: string,
  localAttemptPositions?: readonly number[],
): Promise<EnqueueReaderSessionSubmissionInput> {
  await assertReaderSessionQueueContext(context, environment);
  const normalizedEnqueuedAt = normalizedTimestamp(enqueuedAt);
  if (!normalizedEnqueuedAt) {
    throw new Error("Reader submission queue timestamp is invalid.");
  }
  const ids = await deriveStableNormalizedReaderCommandIds(
    context.commandSeed,
    context.binding.form.items.length,
  );
  const positions = localAttemptPositions === undefined
    ? context.binding.form.items.map((_item, position) => position)
    : [...localAttemptPositions];
  if (
    new Set(positions).size !== positions.length
    || positions.some((position) =>
      !Number.isSafeInteger(position)
      || position < 0
      || position >= context.binding.form.items.length
    )
  ) {
    throw new Error("Reader submission local attempt positions are invalid.");
  }
  return {
    ownerGeneration: environment.ownerGeneration,
    expectedResetEpoch: environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    attemptCommandIds: positions.map((position) =>
      ids.attemptCommandIds[position]
    ),
    command: {
      protocolVersion: READER_SUBMISSION_PROTOCOL_VERSION,
      idempotencyKey: ids.submitCommandId,
      installationId: environment.installationId,
      deviceId: environment.deviceId,
      contentVersion: CURRENT_CONTENT_VERSION,
      expectedItemCount: context.binding.expectedItemCount,
    },
    enqueuedAt: normalizedEnqueuedAt,
  };
}

export async function buildNormalizedReaderSessionAbandonmentQueueInput(
  context: NormalizedReaderSessionQueueContextV1,
  environment: NormalizedLessonQueueEnvironment,
  reason: ReaderAbandonmentReason,
  enqueuedAt: string,
): Promise<EnqueueReaderSessionAbandonmentInput> {
  await assertReaderSessionQueueContext(context, environment);
  const normalizedEnqueuedAt = normalizedTimestamp(enqueuedAt);
  if (
    !normalizedEnqueuedAt
    || (
      reason !== "user-exit"
      && reason !== "support-requested"
      && reason !== "superseded"
    )
  ) {
    throw new Error("Reader abandonment queue input is invalid.");
  }
  const ids = await deriveStableNormalizedReaderCommandIds(
    context.commandSeed,
    context.binding.form.items.length,
  );
  return {
    ownerGeneration: environment.ownerGeneration,
    expectedResetEpoch: environment.resetEpoch,
    sessionAlias: ids.sessionAlias,
    dependencyCommandId: ids.commandSeed,
    command: {
      protocolVersion: READER_ABANDONMENT_PROTOCOL_VERSION,
      idempotencyKey: ids.abandonCommandId,
      installationId: environment.installationId,
      deviceId: environment.deviceId,
      contentVersion: CURRENT_CONTENT_VERSION,
      reason,
    },
    enqueuedAt: normalizedEnqueuedAt,
  };
}
