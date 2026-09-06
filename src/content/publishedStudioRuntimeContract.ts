export type PublishedStudioLevel = "hsk0" | "hsk1" | "hsk2" | "hsk3" | "hsk4";
export type PublishedStudioTriple = { hanzi: string; pinyin: string; meaningVi: string };

const levels = new Set<PublishedStudioLevel>(["hsk0", "hsk1", "hsk2", "hsk3", "hsk4"]);

export const runtimeRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const runtimeText = (value: unknown, maximum = 10_000): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= maximum;

export const runtimeTriple = (value: unknown): value is PublishedStudioTriple =>
  runtimeRecord(value)
  && runtimeText(value.hanzi, 600)
  && runtimeText(value.pinyin, 1_200)
  && runtimeText(value.meaningVi, 1_200);

export const runtimeReviewPassed = (value: unknown) => runtimeRecord(value)
  && value.humanReviewed === false
  && runtimeRecord(value.aiSelfReview)
  && ["accuracy", "levelFit", "pedagogy", "answerIntegrity", "originality"]
    .every((key) => (value.aiSelfReview as Record<string, unknown>)[key] === true);

export const publishedRuntimeItems = (value: unknown) => {
  if (
    !runtimeRecord(value)
    || value.schemaVersion !== 1
    || value.policy !== "published-only"
    || value.releaseBoundary !== "content-release-worker-v1"
    || !Array.isArray(value.items)
  ) throw new TypeError("Published Studio runtime manifest is invalid.");
  return value.items;
};

export const publishedRuntimeHeader = (value: unknown, itemType: string) => {
  if (!runtimeRecord(value) || !runtimeRecord(value.content)) return null;
  const level = String(value.level) as PublishedStudioLevel;
  if (
    value.schemaVersion !== 1
    || value.itemType !== itemType
    || !levels.has(level)
    || !runtimeText(value.stableKey, 240)
    || !runtimeText(value.title, 600)
    || !runtimeText(value.revisionId, 240)
    || !runtimeText(value.contentSha256, 160)
    || !Number.isSafeInteger(value.revision)
    || Number(value.revision) < 1
    || !Number.isSafeInteger(value.publishedAt)
    || Number(value.publishedAt) <= 0
  ) return null;
  return { item: value, content: value.content, level };
};
