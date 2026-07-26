import { CONTENT_VERSION } from "../data/curriculum";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import { canonicalStringify, sha256Hex } from "../sync/document";
import type { Skill } from "../types";
import type { AssessmentFormHash } from "./assessmentSessionProtocol";
import {
  boundedString,
  hasExactKeys,
  isRecord,
  isSha256,
  safePositiveInteger,
} from "./protocolSupport";

export const ASSESSMENT_SUBMISSION_PROTOCOL_VERSION = 1 as const;
export const ASSESSMENT_SUBMISSION_IDEMPOTENCY_SCOPE =
  "assessment-session-submit-v1";
export const ASSESSMENT_OBSERVED_CONFIDENCE_LEVEL = 0.95 as const;

export type AssessmentObservedAccuracyV1 = {
  status: "unassessed" | "insufficient" | "observed";
  correct: number;
  n: number;
  observedAccuracy: number | null;
  confidence95: {
    lower: number;
    upper: number;
  } | null;
};

export type AssessmentObservedResultV1 = AssessmentObservedAccuracyV1 & {
  masteryEligible: false;
};

export type AssessmentSkillResultV1 = AssessmentObservedResultV1 & {
  skill: Skill;
};

export type SubmitAssessmentSessionCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  sessionId: string;
  formHash: AssessmentFormHash;
};

export type SubmitAssessmentSessionReceiptV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  duplicate: boolean;
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  blueprintId: string;
  formVersion: string;
  scoringPolicyVersion: string;
  formHash: AssessmentFormHash;
  status: "submitted";
  calibrationStatus: "uncalibrated";
  confidenceLevel: typeof ASSESSMENT_OBSERVED_CONFIDENCE_LEVEL;
  masteryEligible: false;
  overall: AssessmentObservedResultV1;
  skills: AssessmentSkillResultV1[];
  submittedAt: string;
};

export type AssessmentSubmissionCommandParseResult =
  | { ok: true; command: SubmitAssessmentSessionCommandV1 }
  | { ok: false; reason: string };

const ROOT_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "installationId",
  "deviceId",
  "deviceSequence",
  "resetEpoch",
  "contentVersion",
  "sessionId",
  "formHash",
]);

export const parseSubmitAssessmentSessionCommand = (
  input: unknown,
): AssessmentSubmissionCommandParseResult => {
  if (!isRecord(input) || !hasExactKeys(input, ROOT_KEYS)) {
    return { ok: false, reason: "Assessment submission must contain exactly the supported fields." };
  }
  if (input.protocolVersion !== ASSESSMENT_SUBMISSION_PROTOCOL_VERSION) {
    return { ok: false, reason: "Assessment-submission protocol version is unsupported." };
  }
  if (
    !boundedString(input.idempotencyKey, 200)
    || !boundedString(input.installationId, 160)
    || !boundedString(input.deviceId, 160)
    || !safePositiveInteger(input.deviceSequence)
    || !isValidLearningResetEpoch(input.resetEpoch)
    || !boundedString(input.sessionId, 160)
    || !isSha256(input.formHash)
  ) {
    return { ok: false, reason: "Assessment-submission identifiers exceed protocol bounds." };
  }
  if (input.contentVersion !== CONTENT_VERSION) {
    return { ok: false, reason: "Assessment-submission content version is unsupported." };
  }
  return {
    ok: true,
    command: {
      protocolVersion: ASSESSMENT_SUBMISSION_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      sessionId: input.sessionId,
      formHash: input.formHash,
    },
  };
};

export const hashSubmitAssessmentSessionCommand = (
  command: SubmitAssessmentSessionCommandV1,
) => sha256Hex(canonicalStringify(command));
