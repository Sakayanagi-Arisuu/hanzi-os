import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import type { LearningGoal } from "../types";

export const CURRENT_ENROLLMENT_PROTOCOL_VERSION = 1 as const;
export const CURRENT_ENROLLMENT_COURSE_ID = "hanzi-os-core" as const;

export type ActivateCurrentEnrollmentCommandV1 = {
  protocolVersion: 1;
};

export type CurrentEnrollmentReceiptV1 = {
  protocolVersion: 1;
  enrollmentId: string;
  courseId: typeof CURRENT_ENROLLMENT_COURSE_ID;
  contentVersion: string;
  manifestSha256: string;
  releaseState: "beta" | "published";
  goal: LearningGoal;
};

const COMMAND_KEYS = new Set(["protocolVersion"]);
const RECEIPT_KEYS = new Set([
  "protocolVersion",
  "enrollmentId",
  "courseId",
  "contentVersion",
  "manifestSha256",
  "releaseState",
  "goal",
]);

const GOALS = new Set<LearningGoal>([
  "conversation",
  "hsk",
  "career",
  "travel",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>) =>
  Object.keys(value).length === keys.size
  && Object.keys(value).every((key) => keys.has(key));

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

export const parseActivateCurrentEnrollmentCommand = (value: unknown) => {
  if (
    !isRecord(value)
    || !exactKeys(value, COMMAND_KEYS)
    || value.protocolVersion !== CURRENT_ENROLLMENT_PROTOCOL_VERSION
  ) {
    return {
      ok: false as const,
      reason: "Current-enrollment command is invalid or unsupported.",
    };
  }
  return {
    ok: true as const,
    command: value as ActivateCurrentEnrollmentCommandV1,
  };
};

export const parseCurrentEnrollmentReceipt = (
  value: unknown,
): CurrentEnrollmentReceiptV1 | null => {
  if (
    !isRecord(value)
    || !exactKeys(value, RECEIPT_KEYS)
    || value.protocolVersion !== CURRENT_ENROLLMENT_PROTOCOL_VERSION
    || !boundedString(value.enrollmentId, 160)
    || value.courseId !== CURRENT_ENROLLMENT_COURSE_ID
    || value.contentVersion !== CONTENT_VERSION
    || value.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || (value.releaseState !== "beta" && value.releaseState !== "published")
    || !GOALS.has(value.goal as LearningGoal)
  ) return null;
  return value as CurrentEnrollmentReceiptV1;
};
