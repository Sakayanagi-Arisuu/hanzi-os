import { sha256Hex } from "../sync/canonicalHash";
import { MAX_ASSESSMENT_FORM_ITEMS as MAX_NORMALIZED_ASSESSMENT_ITEMS } from "./assessmentSessionProtocol";
export const NORMALIZED_ASSESSMENT_COMMAND_ID_SCHEMA_VERSION = 1 as const;
const boundedString = (value: unknown, maximum: number): value is string => typeof value === "string" && value.length > 0 && value.length <= maximum;
export type StableNormalizedAssessmentCommandIds = {
  schemaVersion: 1;
  sessionAlias: string;
  commandSeed: string;
  attemptCommandIds: string[];
  submitCommandId: string;
  abandonCommandId: string;
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
