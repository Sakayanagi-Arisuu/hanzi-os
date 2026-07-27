import { parseNumberedPinyin } from "../lib/pinyin";
import type { Lesson, Story, VocabularyItem } from "../types";
import type {
  ContentCatalogItem,
  GradedTextCatalogItem,
  ItemCatalogArtifact,
  LessonCatalogItemV1,
  LessonCatalogItemV2,
  LexemeCatalogItem,
} from "./types";

type LessonCatalogItem = LessonCatalogItemV1 | LessonCatalogItemV2;

const assertUniqueCoreIds = (
  items: ContentCatalogItem[],
  itemType: "lexeme" | "lesson" | "graded-text",
) => {
  const ids = new Set<string>();
  for (const item of items.filter((candidate) => candidate.itemType === itemType)) {
    if (ids.has(item.itemId)) {
      throw new Error(`Authoring catalog contains duplicate ${itemType} ID ${item.itemId}`);
    }
    ids.add(item.itemId);
  }
};

/**
 * Rehydrates the complete authoring inventory from an immutable governance
 * catalog. Runtime data is intentionally unsuitable here because its
 * sanitized projection excludes draft and review content.
 */
export const extractAuthoringContent = (
  catalog: ItemCatalogArtifact,
): {
  vocabulary: VocabularyItem[];
  lessons: Lesson[];
  stories: Story[];
} => {
  const items = catalog.items as ContentCatalogItem[];
  assertUniqueCoreIds(items, "lexeme");
  assertUniqueCoreIds(items, "lesson");
  assertUniqueCoreIds(items, "graded-text");

  const vocabulary = items
    .filter((item): item is LexemeCatalogItem => item.itemType === "lexeme")
    .map((item) => ({
      ...structuredClone(item.payload),
      id: item.itemId,
      syllables: parseNumberedPinyin(item.payload.pinyinNumbered),
    }));
  const lessons = items
    .filter(
      (item): item is LessonCatalogItem => item.itemType === "lesson",
    )
    .map((item) => ({
      ...structuredClone(item.payload),
      id: item.itemId,
      prerequisiteIds: (item.prerequisites ?? [])
        .filter((reference) => reference.itemType === "lesson")
        .map((reference) => reference.itemId),
      releaseState: item.releaseState,
      contentVersion: catalog.contentVersion,
    }));
  const stories = items
    .filter(
      (item): item is GradedTextCatalogItem =>
        item.itemType === "graded-text",
    )
    .map((item) => ({
      ...structuredClone(item.payload),
      id: item.itemId,
      releaseState: item.releaseState,
      contentVersion: catalog.contentVersion,
    }));

  return { vocabulary, lessons, stories };
};
