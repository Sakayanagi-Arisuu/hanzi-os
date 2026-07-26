import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import { canonicalStringify, sha256Hex } from "../sync/document";
import type { AssessmentFormHash } from "./assessmentSessionProtocol";
import {
  boundedString,
  hasExactKeys,
  isRecord,
  isSha256,
  safePositiveInteger,
} from "./protocolSupport";

export const ASSESSMENT_ABANDONMENT_PROTOCOL_VERSION = 1 as const;
export const ASSESSMENT_ABANDONMENT_IDEMPOTENCY_SCOPE =
  "assessment-session-abandon-v1";

export type AbandonAssessmentSessionCommandV1 = {
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

export type AbandonAssessmentSessionReceiptV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  duplicate: boolean;
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  blueprintId: string;
  formVersion: string;
  formHash: AssessmentFormHash;
  status: "abandoned";
  masteryEligible: false;
  abandonedAt: string;
};

export type AssessmentAbandonmentCommandParseResult =
  | { ok: true; command: AbandonAssessmentSessionCommandV1 }
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

export const parseAbandonAssessmentSessionCommand = (
  input: unknown,
): AssessmentAbandonmentCommandParseResult => {
  if (!isRecord(input) || !hasExactKeys(input, ROOT_KEYS)) {
    return { ok: false, reason: "Assessment abandonment must contain exactly the supported fields." };
  }
  if (input.protocolVersion !== ASSESSMENT_ABANDONMENT_PROTOCOL_VERSION) {
    return { ok: false, reason: "Assessment-abandonment protocol version is unsupported." };
  }
  if (
    !boundedString(input.idempotencyKey, 200)
    || !boundedString(input.installationId, 160)
    || !boundedString(input.deviceId, 160)
    || !safePositiveInteger(input.deviceSequence)
    || !isValidLearningResetEpoch(input.resetEpoch)
    || !boundedString(input.contentVersion, 200)
    || !boundedString(input.sessionId, 160)
    || !isSha256(input.formHash)
  ) {
    return { ok: false, reason: "Assessment-abandonment identifiers exceed protocol bounds." };
  }
  return {
    ok: true,
    command: {
      protocolVersion: ASSESSMENT_ABANDONMENT_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: input.contentVersion,
      sessionId: input.sessionId,
      formHash: input.formHash,
    },
  };
};

export const hashAbandonAssessmentSessionCommand = (
  command: AbandonAssessmentSessionCommandV1,
) => sha256Hex(canonicalStringify(command));
