import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  CURRENT_AUTHORITATIVE_COURSE_ID,
  type AuthoritativeReleasedLessonProgressV1,
} from "../learning/authoritativeProgress";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import { canonicalStringify } from "../sync/document";
import {
  ASSESSMENT_SESSION_FORM_SCHEMA_VERSION,
  ASSESSMENT_SESSION_PROTOCOL_VERSION,
  hashAssessmentForm,
  isExactAssessmentFormV1,
  MAX_ASSESSMENT_FORM_ITEMS,
  type AssessmentSessionAuthorityBindingV1,
  type AssessmentFormHash,
  type AssessmentFormItemV1,
  type AssessmentFormV1,
  type OpenAssessmentSessionReceiptV1,
} from "./assessmentSessionProtocol";

export const NORMALIZED_ASSESSMENT_RUNTIME_SCHEMA_VERSION = 1 as const;
export const MAX_NORMALIZED_ASSESSMENT_ITEMS = MAX_ASSESSMENT_FORM_ITEMS;

export type NormalizedAssessmentRuntimeV1 = {
  schemaVersion: 1;
  contentVersion: string;
  manifestSha256: string;
  resetEpoch: number;
  enrollmentId: string;
  commandSeed: string;
  sessionId: string;
  blueprintId: string;
  formVersion: string;
  scoringPolicyVersion: string;
  formHash: AssessmentFormHash;
  startedAt: string;
  items: AssessmentFormItemV1[];
};

export type MaterializeNormalizedAssessmentRuntimeInput = {
  receipt: unknown;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  expectedOpenCommandId: string;
};

export type MaterializeNormalizedAssessmentRuntimeFromAuthorityBindingInput = {
  binding: unknown;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  commandSeed: string;
};

export type MaterializeNormalizedAssessmentRuntimeResult =
  | { ok: true; runtime: NormalizedAssessmentRuntimeV1 }
  | {
      ok: false;
      code:
        | "progress-unavailable"
        | "receipt-invalid"
        | "receipt-binding-mismatch"
        | "authority-binding-invalid"
        | "authority-binding-mismatch"
        | "form-hash-mismatch";
      reason: string;
    };

const RECEIPT_KEYS = [
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "sessionId",
  "enrollmentId",
  "resetEpoch",
  "contentVersion",
  "blueprintId",
  "formVersion",
  "scoringPolicyVersion",
  "expectedItemCount",
  "form",
  "formHash",
  "status",
  "startedAt",
] as const;
const AUTHORITY_BINDING_KEYS = [
  "sessionId",
  "enrollmentId",
  "resetEpoch",
  "contentVersion",
  "blueprintId",
  "formVersion",
  "scoringPolicyVersion",
  "expectedItemCount",
  "form",
  "formHash",
  "status",
  "startedAt",
] as const;
const RUNTIME_KEYS = [
  "schemaVersion",
  "contentVersion",
  "manifestSha256",
  "resetEpoch",
  "enrollmentId",
  "commandSeed",
  "sessionId",
  "blueprintId",
  "formVersion",
  "scoringPolicyVersion",
  "formHash",
  "startedAt",
  "items",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;
const exactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
) => {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
};
const exactTimestamp = (value: unknown): value is string => {
  if (!boundedString(value, 40)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};
const validAuthorityBindingFields = (
  value: Record<string, unknown>,
) => Boolean(
  boundedString(value.sessionId, 160)
  && boundedString(value.enrollmentId, 160)
  && isValidLearningResetEpoch(value.resetEpoch)
  && value.contentVersion === CONTENT_VERSION
  && boundedString(value.blueprintId, 160)
  && boundedString(value.formVersion, 200)
  && boundedString(value.scoringPolicyVersion, 160)
  && Number.isSafeInteger(value.expectedItemCount)
  && Number(value.expectedItemCount) >= 1
  && Number(value.expectedItemCount) <= MAX_NORMALIZED_ASSESSMENT_ITEMS
  && isExactAssessmentFormV1(
    value.form,
    Number(value.expectedItemCount),
  )
  && value.form.blueprintId === value.blueprintId
  && value.form.formVersion === value.formVersion
  && value.form.scoringPolicyVersion === value.scoringPolicyVersion
  && typeof value.formHash === "string"
  && /^sha256:[a-f0-9]{64}$/u.test(value.formHash)
  && value.status === "started"
  && exactTimestamp(value.startedAt)
);

const parseStrictReceipt = (
  value: unknown,
): OpenAssessmentSessionReceiptV1 | null => {
  if (
    !isRecord(value)
    || !exactKeys(value, RECEIPT_KEYS)
    || value.protocolVersion !== ASSESSMENT_SESSION_PROTOCOL_VERSION
    || !boundedString(value.idempotencyKey, 200)
    || typeof value.duplicate !== "boolean"
    || !validAuthorityBindingFields(value)
  ) return null;
  return value as OpenAssessmentSessionReceiptV1;
};

const parseStrictAuthorityBinding = (
  value: unknown,
): AssessmentSessionAuthorityBindingV1 | null => {
  if (
    !isRecord(value)
    || !exactKeys(value, AUTHORITY_BINDING_KEYS)
    || !validAuthorityBindingFields(value)
  ) return null;
  return value as AssessmentSessionAuthorityBindingV1;
};

const exactProgress = (progress: AuthoritativeReleasedLessonProgressV1) =>
  progress.schemaVersion === 1
  && progress.courseId === CURRENT_AUTHORITATIVE_COURSE_ID
  && progress.contentVersion === CONTENT_VERSION
  && progress.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
  && isValidLearningResetEpoch(progress.resetEpoch)
  && boundedString(progress.enrollmentId, 160);

export async function isExactNormalizedAssessmentRuntime(
  value: unknown,
): Promise<boolean> {
  if (
    !isRecord(value)
    || !exactKeys(value, RUNTIME_KEYS)
    || value.schemaVersion !== NORMALIZED_ASSESSMENT_RUNTIME_SCHEMA_VERSION
    || value.contentVersion !== CONTENT_VERSION
    || value.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || !isValidLearningResetEpoch(value.resetEpoch)
    || !boundedString(value.enrollmentId, 160)
    || !boundedString(value.commandSeed, 200)
    || !boundedString(value.sessionId, 160)
    || !boundedString(value.blueprintId, 160)
    || !boundedString(value.formVersion, 200)
    || !boundedString(value.scoringPolicyVersion, 160)
    || typeof value.formHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(value.formHash)
    || !exactTimestamp(value.startedAt)
    || !Array.isArray(value.items)
    || value.items.length < 1
    || value.items.length > MAX_NORMALIZED_ASSESSMENT_ITEMS
  ) return false;
  const form: AssessmentFormV1 = {
    schemaVersion: ASSESSMENT_SESSION_FORM_SCHEMA_VERSION,
    blueprintId: value.blueprintId as string,
    formVersion: value.formVersion as string,
    scoringPolicyVersion: value.scoringPolicyVersion as string,
    items: value.items as AssessmentFormItemV1[],
  };
  if (!isExactAssessmentFormV1(form, value.items.length)) return false;
  try {
    return await hashAssessmentForm(form) === value.formHash;
  } catch {
    return false;
  }
}

export async function materializeNormalizedAssessmentRuntime(
  input: MaterializeNormalizedAssessmentRuntimeInput,
): Promise<MaterializeNormalizedAssessmentRuntimeResult> {
  if (!exactProgress(input.authoritativeProgress)) {
    return {
      ok: false,
      code: "progress-unavailable",
      reason: "Exact current released enrollment authority is required.",
    };
  }
  const receipt = parseStrictReceipt(input.receipt);
  if (!receipt) {
    return {
      ok: false,
      code: "receipt-invalid",
      reason: "Assessment-session receipt is invalid or contains extra fields.",
    };
  }
  if (
    !boundedString(input.expectedOpenCommandId, 200)
    || receipt.idempotencyKey !== input.expectedOpenCommandId
  ) {
    return {
      ok: false,
      code: "receipt-binding-mismatch",
      reason: "Assessment receipt does not match the active owner scope.",
    };
  }
  return materializeAuthorityBinding({
    binding: receipt,
    authoritativeProgress: input.authoritativeProgress,
    commandSeed: receipt.idempotencyKey,
    mismatchCode: "receipt-binding-mismatch",
  });
}

const materializeAuthorityBinding = async (input: {
  binding: AssessmentSessionAuthorityBindingV1;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  commandSeed: string;
  mismatchCode: "receipt-binding-mismatch" | "authority-binding-mismatch";
}): Promise<MaterializeNormalizedAssessmentRuntimeResult> => {
  if (
    !boundedString(input.commandSeed, 200)
    || input.binding.enrollmentId !== input.authoritativeProgress.enrollmentId
    || input.binding.resetEpoch !== input.authoritativeProgress.resetEpoch
    || input.binding.contentVersion !== input.authoritativeProgress.contentVersion
  ) {
    return {
      ok: false,
      code: input.mismatchCode,
      reason: "Assessment authority binding does not match the active owner scope.",
    };
  }
  let calculatedFormHash: AssessmentFormHash;
  try {
    calculatedFormHash = await hashAssessmentForm(input.binding.form);
  } catch {
    return {
      ok: false,
      code: "form-hash-mismatch",
      reason: "Assessment form could not be hashed canonically.",
    };
  }
  if (calculatedFormHash !== input.binding.formHash) {
    return {
      ok: false,
      code: "form-hash-mismatch",
      reason: "Assessment form hash does not match its immutable presentation.",
    };
  }
  const runtime: NormalizedAssessmentRuntimeV1 = {
    schemaVersion: NORMALIZED_ASSESSMENT_RUNTIME_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    resetEpoch: input.binding.resetEpoch,
    enrollmentId: input.binding.enrollmentId,
    commandSeed: input.commandSeed,
    sessionId: input.binding.sessionId,
    blueprintId: input.binding.blueprintId,
    formVersion: input.binding.formVersion,
    scoringPolicyVersion: input.binding.scoringPolicyVersion,
    formHash: input.binding.formHash,
    startedAt: input.binding.startedAt,
    items: structuredClone(input.binding.form.items),
  };
  if (!await isExactNormalizedAssessmentRuntime(runtime)) {
    return {
      ok: false,
      code: "receipt-invalid",
      reason: "Assessment presentation could not be revalidated.",
    };
  }
  return { ok: true, runtime };
};

/**
 * Materializes a cross-device session only from a strictly validated,
 * answer-free projection binding. It never fabricates open-command metadata.
 */
export async function materializeNormalizedAssessmentRuntimeFromAuthorityBinding(
  input: MaterializeNormalizedAssessmentRuntimeFromAuthorityBindingInput,
): Promise<MaterializeNormalizedAssessmentRuntimeResult> {
  if (!exactProgress(input.authoritativeProgress)) {
    return {
      ok: false,
      code: "progress-unavailable",
      reason: "Exact current released enrollment authority is required.",
    };
  }
  const binding = parseStrictAuthorityBinding(input.binding);
  if (!binding) {
    return {
      ok: false,
      code: "authority-binding-invalid",
      reason: "Projected assessment-session authority binding is invalid.",
    };
  }
  return materializeAuthorityBinding({
    binding,
    authoritativeProgress: input.authoritativeProgress,
    commandSeed: input.commandSeed,
    mismatchCode: "authority-binding-mismatch",
  });
}

export const canonicalNormalizedAssessmentRuntime = (
  runtime: NormalizedAssessmentRuntimeV1,
) => canonicalStringify(runtime);
