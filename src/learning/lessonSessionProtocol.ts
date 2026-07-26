import { CONTENT_VERSION } from "../data/curriculum";
import { canonicalStringify, sha256Hex } from "../sync/document";
import type { Skill } from "../types";
import type { ObjectiveAttemptMethod } from "./attemptProtocol";
import { isValidLearningResetEpoch } from "./resetEpoch";

export const LESSON_SESSION_PROTOCOL_VERSION = 1 as const;
export const LESSON_SESSION_IDEMPOTENCY_SCOPE = "lesson-session-v1";
export const LESSON_SESSION_FORM_SCHEMA_VERSION = 1 as const;

export type LessonSessionFormActivityV1 = {
  position: number;
  activityId: string;
  activityVersion: string;
  method: ObjectiveAttemptMethod;
  skill: Skill;
  requiredForPass: boolean;
};

export type LessonSessionFormV1 = {
  schemaVersion: 1;
  script: "simplified" | "traditional";
  activities: LessonSessionFormActivityV1[];
};

export type LessonSessionFormHash = `sha256:${string}`;

/**
 * Untrusted request to open a session. The lesson version, evidence count,
 * release eligibility, prerequisite result, and session identifier are all
 * deliberately server-owned.
 */
export type OpenLessonSessionCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  enrollmentId: string;
  lessonId: string;
};

/**
 * Server-owned facts required to address one immutable active lesson form.
 * This deliberately excludes open-command delivery metadata so an active
 * session learned from a projection never has to masquerade as an open receipt.
 */
export type LessonSessionAuthorityBindingV1 = {
  sessionId: string;
  enrollmentId: string;
  contentVersion: string;
  resetEpoch: number;
  lessonId: string;
  lessonVersion: string;
  expectedEvidenceCount: number;
  form: LessonSessionFormV1;
  formHash: LessonSessionFormHash;
  status: "started";
  startedAt: string;
};

export type OpenLessonSessionReceiptV1 = LessonSessionAuthorityBindingV1 & {
  protocolVersion: 1;
  idempotencyKey: string;
  duplicate: boolean;
};

export type LessonSessionCommandParseResult =
  | { ok: true; command: OpenLessonSessionCommandV1 }
  | { ok: false; reason: string };

const ROOT_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "installationId",
  "deviceId",
  "deviceSequence",
  "resetEpoch",
  "contentVersion",
  "enrollmentId",
  "lessonId",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const safePositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 1;

export const parseOpenLessonSessionCommand = (
  input: unknown,
): LessonSessionCommandParseResult => {
  if (
    !isRecord(input)
    || !Object.keys(input).every((key) => ROOT_KEYS.has(key))
  ) {
    return {
      ok: false,
      reason: "Lesson-session command contains unknown or invalid fields.",
    };
  }
  if (input.protocolVersion !== LESSON_SESSION_PROTOCOL_VERSION) {
    return {
      ok: false,
      reason: "Lesson-session protocol version is unsupported.",
    };
  }
  if (
    !boundedString(input.idempotencyKey, 200)
    || !boundedString(input.installationId, 160)
    || !boundedString(input.deviceId, 160)
    || !safePositiveInteger(input.deviceSequence)
    || !isValidLearningResetEpoch(input.resetEpoch)
    || !boundedString(input.enrollmentId, 160)
    || !boundedString(input.lessonId, 160)
  ) {
    return {
      ok: false,
      reason: "Lesson-session identifiers exceed protocol bounds.",
    };
  }
  if (input.contentVersion !== CONTENT_VERSION) {
    return {
      ok: false,
      reason: "Lesson-session content version is unsupported.",
    };
  }

  return {
    ok: true,
    command: {
      protocolVersion: LESSON_SESSION_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      enrollmentId: input.enrollmentId,
      lessonId: input.lessonId,
    },
  };
};

export const hashOpenLessonSessionCommand = (
  command: OpenLessonSessionCommandV1,
) => sha256Hex(canonicalStringify(command));

export const canonicalLessonSessionForm = (form: LessonSessionFormV1) =>
  canonicalStringify(form);

export const hashLessonSessionForm = async (
  form: LessonSessionFormV1,
): Promise<LessonSessionFormHash> =>
  `sha256:${await sha256Hex(canonicalLessonSessionForm(form))}`;
