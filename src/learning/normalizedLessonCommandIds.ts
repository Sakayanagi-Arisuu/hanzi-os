import { sha256Hex } from "../sync/canonicalHash";
export const NORMALIZED_LESSON_COMMAND_ID_SCHEMA_VERSION = 1 as const;
export const MAX_NORMALIZED_LESSON_ACTIVITIES = 10;
const boundedString = (value: unknown, maximum: number): value is string => typeof value === "string" && value.length > 0 && value.length <= maximum;
export type StableNormalizedLessonCommandIds = {
  schemaVersion: 1;
  sessionAlias: string;
  commandSeed: string;
  attemptCommandIds: string[];
  submitCommandId: string;
  abandonCommandId: string;
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
